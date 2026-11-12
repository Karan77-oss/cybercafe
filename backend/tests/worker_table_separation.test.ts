import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/db';
import { localStore } from '../src/catalogData';

const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task 1-5: Worker Table Separation, Hiring, and Admin Visibility', () => {
  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let workerToken: string;
  const testWorkerId = `wrk_sep_${Date.now()}`;
  const testWorkerEmail = `worker_sep_${Date.now()}@cybercafe.test`;
  const testWorkerPassword = 'Password123!';

  beforeAll(async () => {
    // Generate valid Admin JWT
    adminToken = jwt.sign(
      { id: 'admin_test_id', role: 'ADMIN', email: 'admin@cybercafe.test', name: 'System Admin' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Register a real Customer
    const custEmail = `cust_sep_${Date.now()}@example.com`;
    const custRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: custEmail,
        password: 'Password123!',
        name: 'Sep Test Customer',
        phone: '9988776655'
      });
    customerToken = custRes.body.token;
    customerId = custRes.body.user?.id || custRes.body.id;
  });

  afterAll(async () => {
    // Clean up test records
    try {
      if (testWorkerId) {
        await prisma.job.deleteMany({ where: { workerId: testWorkerId } }).catch(() => {});
        await prisma.worker.deleteMany({
          where: { OR: [{ id: testWorkerId }, { email: testWorkerEmail }] }
        }).catch(() => {});
      }
      if (customerId) {
        await prisma.job.deleteMany({ where: { order: { userId: customerId } } }).catch(() => {});
        await prisma.order.deleteMany({ where: { userId: customerId } }).catch(() => {});
        await prisma.user.deleteMany({ where: { id: customerId } }).catch(() => {});
      }
    } catch {}
  });

  it('1. Admin creates worker -> saved strictly in Worker table, NOT in User table', async () => {
    const hireRes = await request(app)
      .post('/api/admin/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        workerId: testWorkerId,
        username: testWorkerId,
        name: 'Separation Test Operator',
        workerName: 'Separation Test Operator',
        email: testWorkerEmail,
        password: testWorkerPassword,
        mobile: '9123456789',
        specialization: 'PAN Card & Certificates'
      });

    expect([200, 201]).toContain(hireRes.status);
    expect(hireRes.body.success).toBe(true);

    const workerRecord = hireRes.body.worker || hireRes.body.data?.worker;
    expect(workerRecord).toBeDefined();

    // Verify in database: MUST exist in prisma.worker
    const dbWorker = await prisma.worker.findUnique({
      where: { email: testWorkerEmail }
    });
    expect(dbWorker).not.toBeNull();
    expect(dbWorker?.email).toBe(testWorkerEmail);

    // Verify in database: MUST NOT exist in prisma.user
    const dbUser = await prisma.user.findUnique({
      where: { email: testWorkerEmail }
    });
    expect(dbUser).toBeNull();
  });

  it('2. Worker logs in using email & password -> authenticates against Worker table', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testWorkerEmail,
        password: testWorkerPassword
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    workerToken = loginRes.body.token;
    expect(loginRes.body.role || loginRes.body.user?.role).toBe('WORKER');

    // Decode token and verify claims
    const decoded: any = jwt.verify(workerToken, JWT_SECRET);
    expect(decoded.role).toBe('WORKER');
    expect(decoded.email).toBe(testWorkerEmail);
  });

  it('3. GET /api/admin/customers returns strictly customers, ZERO workers', async () => {
    const custRes = await request(app)
      .get('/api/admin/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(custRes.status).toBe(200);
    const customers = custRes.body.customers || custRes.body.data?.customers || [];
    expect(Array.isArray(customers)).toBe(true);

    // None of the returned customers should be our worker or have role WORKER
    const workerInCustList = customers.find((c: any) => c.email === testWorkerEmail);
    expect(workerInCustList).toBeUndefined();
  });

  it('4. GET /api/admin/workers returns workers from the standalone Worker table', async () => {
    const wrkRes = await request(app)
      .get('/api/admin/workers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(wrkRes.status).toBe(200);
    const workers = wrkRes.body.workers || wrkRes.body.data?.workers || [];
    expect(Array.isArray(workers)).toBe(true);

    const found = workers.find((w: any) => w.email === testWorkerEmail);
    expect(found).toBeDefined();
    expect(found.email).toBe(testWorkerEmail);
  });

  it('5. Customer places order -> appears in GET /api/admin/orders with hydrated customer details', async () => {
    const service = localStore.services[0];
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId: service.id,
        application_type: 'NEW',
        formData: {
          fullName: 'Sep Customer',
          phone: '9988776655'
        }
      });

    expect([200, 201]).toContain(orderRes.status);
    const orderId = orderRes.body.order?.id || orderRes.body.data?.order?.id;
    expect(orderId).toBeDefined();

    // Admin inspects orders
    const adminOrdersRes = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminOrdersRes.status).toBe(200);
    const orders = adminOrdersRes.body.orders || adminOrdersRes.body.data?.orders || [];
    const createdOrder = orders.find((o: any) => o.id === orderId);
    expect(createdOrder).toBeDefined();
    expect(createdOrder.customer).toBeDefined();
    expect(createdOrder.worker).toBeNull(); // Initially unassigned
  });

  it('6. Worker accepts order -> status becomes IN_PROGRESS and admin sees hydrated worker details', async () => {
    // Create another order for worker to accept
    const service = localStore.services[0];
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId: service.id,
        application_type: 'CORRECTION',
        formData: {
          fullName: 'Sep Customer 2',
          phone: '9988776655'
        }
      });

    expect([200, 201]).toContain(orderRes.status);
    const orderId = orderRes.body.order?.id || orderRes.body.data?.order?.id;

    // Worker accepts order
    const acceptRes = await request(app)
      .post(`/api/worker/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        date: 'Tomorrow',
        timeSlot: '10:00 AM - 12:00 PM'
      });

    expect(acceptRes.status).toBe(200);

    // Admin checks order details via GET /api/admin/orders/:id
    const detailRes = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    const order = detailRes.body.order || detailRes.body.data?.order;
    expect(order).toBeDefined();
    expect(order.worker).toBeDefined();
    expect(order.worker.email).toBe(testWorkerEmail);
    expect(['IN_PROGRESS', 'ASSIGNED']).toContain(order.status);
  });
});

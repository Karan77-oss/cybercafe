import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/db';
import { localStore } from '../src/catalogData';

const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';

jest.setTimeout(60000);

describe('Available Orders Visibility Bug Fix Integration Test', () => {
  let customerToken: string;
  let customerId: string;
  let worker1Token: string;
  let worker2Token: string;
  const worker1Id = `wrk_vis1_${Date.now()}`;
  const worker2Id = `wrk_vis2_${Date.now()}`;
  const worker1Email = `worker1_vis_${Date.now()}@cybercafe.test`;
  const worker2Email = `worker2_vis_${Date.now()}@cybercafe.test`;
  let testOrderId: string;

  beforeAll(async () => {
    // 1. Create real Customer
    const custEmail = `cust_vis_${Date.now()}@example.com`;
    const custRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: custEmail,
        password: 'Password123!',
        name: 'Visibility Test Customer',
        phone: '9888877777'
      });
    customerToken = custRes.body.token;
    customerId = custRes.body.user?.id || custRes.body.id;

    // 2. Create Worker 1 in PostgreSQL
    await prisma.worker.create({
      data: {
        id: worker1Id,
        email: worker1Email,
        name: 'Operator Vis One',
        passwordHash: '$2b$10$dummyHashWorker123',
        status: 'ACTIVE',
        isOnline: true,
        kycStatus: 'VERIFIED'
      }
    });
    worker1Token = jwt.sign(
      { id: worker1Id, userId: worker1Id, workerId: worker1Id, email: worker1Email, name: 'Operator Vis One', role: 'WORKER' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 3. Create Worker 2 in PostgreSQL
    await prisma.worker.create({
      data: {
        id: worker2Id,
        email: worker2Email,
        name: 'Operator Vis Two',
        passwordHash: '$2b$10$dummyHashWorker123',
        status: 'ACTIVE',
        isOnline: true,
        kycStatus: 'VERIFIED'
      }
    });
    worker2Token = jwt.sign(
      { id: worker2Id, userId: worker2Id, workerId: worker2Id, email: worker2Email, name: 'Operator Vis Two', role: 'WORKER' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    try {
      if (testOrderId) {
        await prisma.job.deleteMany({ where: { orderId: testOrderId } }).catch(() => {});
        await prisma.order.deleteMany({ where: { id: testOrderId } }).catch(() => {});
      }
      await prisma.job.deleteMany({ where: { workerId: { in: [worker1Id, worker2Id] } } }).catch(() => {});
      await prisma.worker.deleteMany({ where: { id: { in: [worker1Id, worker2Id] } } }).catch(() => {});
      if (customerId) {
        await prisma.user.deleteMany({ where: { id: customerId } }).catch(() => {});
      }
    } catch {}
  });

  it('1. Newly placed order appears in Available Orders for both workers', async () => {
    const service = localStore.services[0];
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId: service.id,
        application_type: 'NEW',
        formData: {
          fullName: 'Visibility Customer',
          phone: '9888877777'
        }
      });

    expect([200, 201]).toContain(orderRes.status);
    testOrderId = orderRes.body.order?.id || orderRes.body.data?.order?.id;
    expect(testOrderId).toBeDefined();

    // Verify Worker 1 sees it in available orders
    const w1Avail = await request(app)
      .get('/api/worker/requests')
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(w1Avail.status).toBe(200);
    const w1Orders = w1Avail.body.orders || w1Avail.body.data?.orders || [];
    const foundW1 = w1Orders.find((o: any) => o.id === testOrderId);
    expect(foundW1).toBeDefined();

    // Verify Worker 2 sees it in available orders
    const w2Avail = await request(app)
      .get('/api/worker/requests')
      .set('Authorization', `Bearer ${worker2Token}`);

    expect(w2Avail.status).toBe(200);
    const w2Orders = w2Avail.body.orders || w2Avail.body.data?.orders || [];
    const foundW2 = w2Orders.find((o: any) => o.id === testOrderId);
    expect(foundW2).toBeDefined();
  }, 90000);

  it('2. Worker 1 accepts the order -> order is moved to Worker 1 My Jobs with status IN_PROGRESS', async () => {
    const acceptRes = await request(app)
      .post(`/api/worker/orders/${testOrderId}/accept`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({
        date: 'Today',
        timeSlot: '2:00 PM - 4:00 PM'
      });

    expect(acceptRes.status).toBe(200);

    // Verify Worker 1 has it in My Jobs
    const myJobsRes = await request(app)
      .get('/api/worker/jobs')
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(myJobsRes.status).toBe(200);
    const myJobs = myJobsRes.body.jobs || myJobsRes.body.orders || myJobsRes.body.data?.jobs || [];
    const foundInMyJobs = myJobs.find((j: any) => j.id === testOrderId);
    expect(foundInMyJobs).toBeDefined();
    expect(['IN_PROGRESS', 'ASSIGNED']).toContain(foundInMyJobs.status);
  }, 90000);

  it('3. Order is immediately REMOVED from Available Orders for Worker 1', async () => {
    const w1Avail = await request(app)
      .get('/api/worker/requests')
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(w1Avail.status).toBe(200);
    const w1Orders = w1Avail.body.orders || w1Avail.body.data?.orders || [];
    const foundW1 = w1Orders.find((o: any) => o.id === testOrderId);
    expect(foundW1).toBeUndefined(); // MUST NOT BE VISIBLE TO WORKER 1
  });

  it('4. Order is immediately REMOVED from Available Orders for Worker 2', async () => {
    const w2Avail = await request(app)
      .get('/api/worker/requests')
      .set('Authorization', `Bearer ${worker2Token}`);

    expect(w2Avail.status).toBe(200);
    const w2Orders = w2Avail.body.orders || w2Avail.body.data?.orders || [];
    const foundW2 = w2Orders.find((o: any) => o.id === testOrderId);
    expect(foundW2).toBeUndefined(); // MUST NOT BE VISIBLE TO WORKER 2
  });

  it('5. Worker 2 attempting to accept the order gets 409 Conflict', async () => {
    const doubleAcceptRes = await request(app)
      .post(`/api/worker/orders/${testOrderId}/accept`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({
        date: 'Today',
        timeSlot: '2:00 PM - 4:00 PM'
      });

    expect(doubleAcceptRes.status).toBe(409);
    expect(doubleAcceptRes.body.success).toBe(false);
  });

  it('6. Completed order remains excluded from Available Orders for all workers', async () => {
    // Worker 1 completes the order
    const completeRes = await request(app)
      .post(`/api/worker/orders/${testOrderId}/complete`)
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(completeRes.status).toBe(200);

    // Verify still excluded from Worker 1 available orders
    const w1Avail = await request(app)
      .get('/api/worker/requests')
      .set('Authorization', `Bearer ${worker1Token}`);
    const w1Orders = w1Avail.body.orders || w1Avail.body.data?.orders || [];
    expect(w1Orders.find((o: any) => o.id === testOrderId)).toBeUndefined();

    // Verify still excluded from Worker 2 available orders
    const w2Avail = await request(app)
      .get('/api/worker/requests')
      .set('Authorization', `Bearer ${worker2Token}`);
    const w2Orders = w2Avail.body.orders || w2Avail.body.data?.orders || [];
    expect(w2Orders.find((o: any) => o.id === testOrderId)).toBeUndefined();
  });
});

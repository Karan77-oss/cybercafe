import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { localStore } from '../src/catalogData';

const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Worker Order Acceptance and Workspace Flow Integration Test', () => {
  let customerToken: string;
  let worker1Token: string;
  let worker2Token: string;
  const worker1Id = 'wrk_alpha_test';
  const worker2Id = 'wrk_beta_test';

  beforeAll(async () => {
    // Register customer
    const custRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `cust_${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Test Customer'
      });
    customerToken = custRes.body.token;

    // Seed Worker 1 into store and generate valid WORKER JWT
    localStore.workers = localStore.workers.filter(w => w.id !== worker1Id && w.id !== worker2Id);
    localStore.workers.push({
      id: worker1Id,
      workerId: 'WRK-ALPHA',
      name: 'Operator Alpha',
      email: 'alpha@cybercafe.test',
      phone: '9876543210',
      isOnline: true,
      accountStatus: 'ACTIVE',
      status: 'ACTIVE',
      rating: 5.0,
      completedJobs: 10,
      activeJobs: 0,
      pendingEarningsPaise: 0,
      walletBalancePaise: 0,
      totalEarningsPaise: 0
    } as any);
    worker1Token = jwt.sign(
      { id: worker1Id, role: 'WORKER', email: 'alpha@cybercafe.test', name: 'Operator Alpha' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Seed Worker 2 into store and generate valid WORKER JWT
    localStore.workers.push({
      id: worker2Id,
      workerId: 'WRK-BETA',
      name: 'Operator Beta',
      email: 'beta@cybercafe.test',
      phone: '9876543211',
      isOnline: true,
      accountStatus: 'ACTIVE',
      status: 'ACTIVE',
      rating: 4.9,
      completedJobs: 5,
      activeJobs: 0,
      pendingEarningsPaise: 0,
      walletBalancePaise: 0,
      totalEarningsPaise: 0
    } as any);
    worker2Token = jwt.sign(
      { id: worker2Id, role: 'WORKER', email: 'beta@cybercafe.test', name: 'Operator Beta' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  it('correctly creates an unclaimed order with assignedWorkerId: null', async () => {
    const services = localStore.services;
    const testService = services[0];

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId: testService.id,
        application_type: 'Standard Application',
        notes: 'Test order for worker assignment'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const order = createRes.body.order;
    expect(order.assignedWorkerId).toBeNull();
    expect(order.worker).toBeNull();
  });

  it('allows Worker 1 to accept an unclaimed live order and returns 200 OK', async () => {
    const services = localStore.services;
    const testService = services[0];

    const orderId = `test_claim_${Date.now()}`;
    localStore.saveOrder({
      id: orderId,
      orderNumber: orderId,
      customerId: 'cust_sample_123',
      customerName: 'Sample Customer',
      serviceId: testService.id,
      serviceName: testService.name,
      category: testService.category || 'General',
      status: 'AVAILABLE',
      paymentStatus: 'PAID',
      earningStatus: 'PENDING',
      assignedWorkerId: null,
      worker: null,
      job: null,
      pricePaise: 49900,
      workerAmountPaise: 39900,
      adminCommissionPaise: 10000,
      platformFeePaise: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Worker 1 accepts the order
    const acceptRes = await request(app)
      .post(`/api/worker/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send();

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.order).toBeDefined();

    // Verify order is now assigned to worker 1 in store
    const updated = localStore.getOrder(orderId);
    expect(updated.assignedWorkerId).toBe(worker1Id);
    expect(updated.status).toBe('ASSIGNED');
  });

  it('handles re-accept by Worker 1 idempotently without throwing false ORDER_ALREADY_ASSIGNED error', async () => {
    const orderId = `test_idempotent_${Date.now()}`;

    localStore.saveOrder({
      id: orderId,
      orderNumber: orderId,
      customerId: 'cust_sample_123',
      serviceId: localStore.services[0].id,
      serviceName: localStore.services[0].name,
      status: 'ASSIGNED',
      paymentStatus: 'PAID',
      assignedWorkerId: worker1Id,
      worker: { id: worker1Id, name: 'Operator Alpha' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Worker 1 accepts again
    const acceptAgainRes = await request(app)
      .post(`/api/worker/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send();

    expect(acceptAgainRes.status).toBe(200);
    expect(acceptAgainRes.body.success).toBe(true);
    expect(acceptAgainRes.body.order).toBeDefined();
  });

  it('rejects Worker 2 with 409 Conflict when order is assigned to Worker 1', async () => {
    const orderId = `test_conflict_${Date.now()}`;

    localStore.saveOrder({
      id: orderId,
      orderNumber: orderId,
      customerId: 'cust_sample_123',
      serviceId: localStore.services[0].id,
      serviceName: localStore.services[0].name,
      status: 'ASSIGNED',
      paymentStatus: 'PAID',
      assignedWorkerId: worker1Id,
      worker: { id: worker1Id, name: 'Operator Alpha' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Worker 2 attempts to claim
    const worker2ClaimRes = await request(app)
      .post(`/api/worker/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send();

    expect(worker2ClaimRes.status).toBe(409);
    expect(worker2ClaimRes.body.success).toBe(false);
    expect(worker2ClaimRes.body.error.code).toBe('ORDER_ALREADY_ASSIGNED');
  });

  it('loads full job details with job property for JobWorkspace', async () => {
    const orderId = `test_workspace_${Date.now()}`;

    localStore.saveOrder({
      id: orderId,
      orderNumber: orderId,
      customerId: 'cust_sample_123',
      serviceId: localStore.services[0].id,
      serviceName: localStore.services[0].name,
      status: 'ASSIGNED',
      paymentStatus: 'PAID',
      assignedWorkerId: worker1Id,
      worker: { id: worker1Id, name: 'Operator Alpha' },
      documents: [{ id: 'doc_1', name: 'Aadhaar.pdf', url: '/api/documents/doc_1/download' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const jobRes = await request(app)
      .get(`/api/worker/jobs/${orderId}`)
      .set('Authorization', `Bearer ${worker1Token}`);

    expect(jobRes.status).toBe(200);
    expect(jobRes.body.success).toBe(true);
    // Crucial check for JobWorkspace.jsx compatibility
    expect(jobRes.body.job).toBeDefined();
    expect(jobRes.body.job.id).toBe(orderId);
  });
});

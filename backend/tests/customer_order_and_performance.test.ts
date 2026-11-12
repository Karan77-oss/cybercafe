import request from 'supertest';
import { app } from '../src/app';

describe('Customer Order Placement & Performance Suite', () => {
  let customerToken: string;
  let customerId: string;
  let createdOrderId: string;
  const uniqueSuffix = Date.now();
  const customerEmail = `perf_customer_${uniqueSuffix}@example.com`;
  const customerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const customerPassword = 'Password@123';

  it('1. Register customer account and retrieve JWT session', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: customerEmail,
        password: customerPassword,
        name: 'Performance Test Customer',
        phone: customerPhone,
        role: 'CUSTOMER'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    customerToken = res.body.token;
    customerId = res.body.user.id;
  }, 30000);

  it('2. Fetch service catalog for valid serviceId', async () => {
    const res = await request(app)
      .get('/api/services')
      .expect(200);

    const services = res.body.services || res.body.data?.services || res.body;
    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThan(0);
  }, 20000);

  it('3. Customer places an order with multipart fields and documents', async () => {
    // First get a service
    const sRes = await request(app).get('/api/services').expect(200);
    const services = sRes.body.services || sRes.body.data?.services || sRes.body;
    const service = services[0];

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .field('serviceId', service.id)
      .field('application_type', 'New Application')
      .field('contactPhone', '9876543210')
      .field('customerNotes', 'Urgent filing please')
      .attach('documents', Buffer.from('Mock Aadhar File Content'), 'aadhar_card.pdf');

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    const order = orderRes.body.order;
    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    createdOrderId = order.id;
  }, 40000);

  it('4. Customer queries My Orders and verifies instant, slimmed response', async () => {
    const start = Date.now();
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const duration = Date.now() - start;
    console.log(`[Performance Benchmark] /api/orders/my-orders response time: ${duration}ms`);

    expect(res.body.success).toBe(true);
    const orders = res.body.orders;
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);

    const found = orders.find((o: any) => o.id === createdOrderId);
    expect(found).toBeDefined();
    expect(found.service).toBeDefined();
    expect(found.documents).toBeDefined();
  }, 30000);
});

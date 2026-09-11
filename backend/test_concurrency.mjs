import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const SECRET = process.env.AUTH_SECRET || 'secret';
const API_URL = 'http://localhost:3000/api';

async function setup() {
  await prisma.job.deleteMany();
  await prisma.order.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const hashed = await bcrypt.hash('password123', 10);
  
  const worker1 = await prisma.user.create({ data: { email: 'w1@test.com', password: hashed, name: 'W1', role: 'WORKER' } });
  const worker2 = await prisma.user.create({ data: { email: 'w2@test.com', password: hashed, name: 'W2', role: 'WORKER' } });
  const cust = await prisma.user.create({ data: { email: 'c@test.com', password: hashed, name: 'C', role: 'CUSTOMER' } });

  const service = await prisma.service.create({
    data: { name: 'Test', description: 'Test', category: 'Test', pricePaise: 1000, estimatedTime: '1 day', status: 'ACTIVE', approvalStatus: 'APPROVED' }
  });

  const order = await prisma.order.create({
    data: {
      customerId: cust.id,
      serviceId: service.id,
      status: 'AVAILABLE',
      serviceSnapshot: { name: 'Test' },
      pricing: { pricePaise: 1000 }
    }
  });

  const t1 = jwt.sign({ id: worker1.id, role: worker1.role }, SECRET, { expiresIn: '1h' });
  const t2 = jwt.sign({ id: worker2.id, role: worker2.role }, SECRET, { expiresIn: '1h' });

  return { orderId: order.id, t1, t2 };
}

async function run() {
  console.log('Setting up database for concurrency test...');
  const { orderId, t1, t2 } = await setup();
  console.log('Order created:', orderId);

  console.log('Sending simultaneous accept requests from two workers...');
  
  const req1 = fetch(`${API_URL}/jobs/${orderId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${t1}` }
  });
  
  const req2 = fetch(`${API_URL}/jobs/${orderId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${t2}` }
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  
  const data1 = await res1.json();
  const data2 = await res2.json();
  
  console.log('Worker 1 status:', res1.status, data1);
  console.log('Worker 2 status:', res2.status, data2);

  if ((res1.status === 200 && res2.status === 409) || (res1.status === 409 && res2.status === 200)) {
    console.log('SUCCESS: Concurrency handled correctly. One won, one got 409.');
  } else {
    console.log('FAIL: Unexpected statuses.');
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());

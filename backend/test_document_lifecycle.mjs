import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const SECRET = process.env.AUTH_SECRET || 'secret';
const API_URL = 'http://localhost:4000/api';

async function setup() {
  await prisma.payout.deleteMany();
  await prisma.document.deleteMany();
  await prisma.job.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const hashed = await bcrypt.hash('password123', 10);
  const custA = await prisma.user.create({ data: { email: 'ca@test.com', password: hashed, name: 'Customer A', role: 'CUSTOMER' } });
  const custB = await prisma.user.create({ data: { email: 'cb@test.com', password: hashed, name: 'Customer B', role: 'CUSTOMER' } });
  const worker = await prisma.user.create({ data: { email: 'w@test.com', password: hashed, name: 'Worker', role: 'WORKER' } });

  const service = await prisma.service.create({
    data: { name: 'Test Service', description: 'Test', category: 'Test', pricePaise: 1000, estimatedTime: '1 day', status: 'ACTIVE', approvalStatus: 'APPROVED' }
  });

  const tA = jwt.sign({ id: custA.id, role: custA.role }, SECRET, { expiresIn: '1h' });
  const tB = jwt.sign({ id: custB.id, role: custB.role }, SECRET, { expiresIn: '1h' });
  const tW = jwt.sign({ id: worker.id, role: worker.role }, SECRET, { expiresIn: '1h' });

  return { custA, custB, service, tA, tB, tW };
}

async function run() {
  const { custA, custB, service, tA, tB, tW } = await setup();
  console.log('Setup complete.');

  // 1. Customer A uploads document (no order yet)
  console.log('\\n--- 1. Customer A Upload ---');
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const body = `--${boundary}\\r\\nContent-Disposition: form-data; name="file"; filename="test.txt"\\r\\nContent-Type: text/plain\\r\\n\\r\\nHello World\\r\\n--${boundary}--\\r\\n`;
  
  const uploadRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tA}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  });
  const uploadData = await uploadRes.json();
  console.log('Upload Result:', uploadData);
  const docId = uploadData.document?.id;
  
  if (!docId) throw new Error('Upload failed');
  
  const docInDb = await prisma.document.findUnique({ where: { id: docId } });
  console.log('Doc in DB orderId:', docInDb.orderId); // Should be null
  
  // 2. Customer B tries to create an order using Customer A's document
  console.log('\\n--- 2. Customer B Binds Doc ---');
  const orderResB = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceId: service.id,
      details: { foo: 'bar' },
      documentIds: [docId]
    })
  });
  const orderDataB = await orderResB.json();
  console.log('Order B Result:', orderDataB);
  
  // The API uses `await prisma.document.updateMany({ where: { id: { in: documentIds }, customerId }, data: { orderId: order.id } });`
  // so Customer B's updateMany should match 0 rows! Let's verify.
  const docAfterB = await prisma.document.findUnique({ where: { id: docId } });
  console.log('Doc after B orderId:', docAfterB.orderId);
  if (docAfterB.orderId === orderDataB.order?.id) {
    console.log('FAIL: Customer B successfully hijacked Customer A document!');
  } else {
    console.log('PASS: Customer B failed to hijack document.');
  }

  // 3. Customer A creates order using their document
  console.log('\\n--- 3. Customer A Binds Doc ---');
  const orderResA = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceId: service.id,
      details: { foo: 'bar' },
      documentIds: [docId]
    })
  });
  const orderDataA = await orderResA.json();
  console.log('Order A Result:', orderDataA);
  
  const docAfterA = await prisma.document.findUnique({ where: { id: docId } });
  console.log('Doc after A orderId:', docAfterA.orderId);
  if (docAfterA.orderId === orderDataA.order?.id) {
    console.log('PASS: Customer A successfully bound their document.');
  } else {
    console.log('FAIL: Customer A document binding failed.');
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());

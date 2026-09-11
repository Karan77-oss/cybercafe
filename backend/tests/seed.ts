import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding Database for B3.1A...");

  // 1. Setup Users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: { email: 'customer@test.com', password: passwordHash, name: 'Test Customer', role: 'CUSTOMER' }
  });

  const worker = await prisma.user.upsert({
    where: { email: 'worker@test.com' },
    update: { role: 'WORKER' },
    create: { email: 'worker@test.com', password: passwordHash, name: 'Test Worker', role: 'WORKER' }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { role: 'ADMIN' },
    create: { email: 'admin@test.com', password: passwordHash, name: 'Test Admin', role: 'ADMIN' }
  });

  // 2. Setup Service
  const service = await prisma.service.upsert({
    where: { id: 'srv-101' },
    update: {},
    create: {
      id: 'srv-101',
      name: 'Passport Application',
      description: 'New or renewal passport application assistance.',
      category: 'Government',
      pricePaise: 49900,
      estimatedTime: '2-3 days',
      requiredDocuments: ['Aadhaar Card', 'PAN Card', 'Photo'],
      formSchema: [
        { id: 'fullName', label: 'Full Name (As per Aadhaar)', type: 'text', required: true },
        { id: 'dob', label: 'Date of Birth', type: 'date', required: true },
        { id: 'address', label: 'Current Address', type: 'address', required: true }
      ],
      status: 'ACTIVE',
      approvalStatus: 'APPROVED'
    }
  });

  console.log("Seeded successfully:", { customer: customer.email, service: service.name });
}

seed().catch(console.error).finally(() => prisma.$disconnect());

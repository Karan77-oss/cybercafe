import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { OFFICIAL_SERVICES, OFFICIAL_WORKERS, localStore } from './catalogData';

export const prisma = new PrismaClient({
  // Only emit logs via programmatic event handlers below; suppress automatic stderr output
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

// Only log DB errors when the connection is NOT already known-offline (avoids flood during cooldown)
(prisma as any).$on('error', (e: any) => {
  if (isDbConnected !== false) {
    console.error('[Prisma]', e.message || e);
  }
});
(prisma as any).$on('warn', (e: any) => {
  if (isDbConnected !== false) {
    console.warn('[Prisma]', e.message || e);
  }
});

let isDbConnected: boolean | null = null;
let lastCheckTime = 0;
let checkInFlight: Promise<boolean> | null = null;

export const checkDb = async (force = false): Promise<boolean> => {
  const now = Date.now();
  const cooldownMs = isDbConnected === false ? 60000 : 15000;
  if (!force && isDbConnected !== null && (now - lastCheckTime < cooldownMs)) {
    return isDbConnected;
  }
  if (checkInFlight) {
    return checkInFlight;
  }

  const timeoutMs = process.env.NODE_ENV === 'test' ? 800 : 1500;
  checkInFlight = (async () => {
    try {
      let timer: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('DB connection timeout')), timeoutMs);
      });
      await Promise.race([
        prisma.$queryRaw`SELECT 1`.finally(() => clearTimeout(timer)),
        timeoutPromise
      ]);
      isDbConnected = true;
      lastCheckTime = Date.now();
      return true;
    } catch {
      isDbConnected = false;
      lastCheckTime = Date.now();
      return false;
    } finally {
      checkInFlight = null;
    }
  })();

  return checkInFlight;
};

/**
 * Initialize and sync PostgreSQL database on startup.
 * Seeds Admin, Services, and Workers into PostgreSQL if not present,
 * and loads persisted orders/users from PostgreSQL into localStore for zero-downtime consistency.
 */
export const initDatabase = async (): Promise<boolean> => {
  const dbOk = await checkDb(true);
  if (!dbOk) {
    console.log('[Database] PostgreSQL connection failed; running in ResilientStore fallback mode.');
    return false;
  }

  try {
    console.log('[Database] PostgreSQL connected. Synchronizing persistent records...');
    // 1. Purge old demo Admin if present
    await prisma.user.deleteMany({
      where: { OR: [{ email: 'admin@cybercafe.com' }, { id: 'ADM-001' }] }
    });

    // 2. Synchronize Admin accounts from PostgreSQL into localStore
    const dbAdmins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    if (dbAdmins.length === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
      const newAdmin = await prisma.user.create({
        data: {
          id: process.env.ADMIN_ID || 'Karan Kumar',
          email: process.env.ADMIN_EMAIL,
          name: process.env.ADMIN_ID || 'Karan Kumar',
          role: 'ADMIN',
          password: hashed,
          phone: '9876543200'
        }
      });
      dbAdmins.push(newAdmin);
      console.log(`[Database] Initialized Admin from secure environment: ${newAdmin.email}`);
    }

    for (const a of dbAdmins) {
      localStore.saveUser({
        id: a.id,
        adminId: a.id,
        email: a.email,
        name: a.name,
        phone: a.phone || '',
        role: 'ADMIN',
        password: a.password,
        passwordHash: a.password,
        accountStatus: 'ACTIVE',
        createdAt: a.createdAt.toISOString()
      });
      localStore.settings.adminName = a.name;
      localStore.settings.adminId = a.id;
      localStore.settings.email = a.email;
      if (a.phone) localStore.settings.mobile = a.phone;
    }
    console.log(`[Database] Admin synchronized (${dbAdmins.length} active).`);

    // 2. Seed Official Services
    const serviceCount = await prisma.service.count();
    if (serviceCount === 0) {
      for (const s of OFFICIAL_SERVICES) {
        await prisma.service.create({
          data: {
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            pricePaise: s.pricePaise,
            estimatedTime: s.estimatedTime,
            requiredDocuments: s.requiredDocuments,
            formSchema: s.formSchema as any,
            status: s.status || 'ACTIVE',
            approvalStatus: 'APPROVED'
          }
        });
      }
      console.log(`[Database] Seeded ${OFFICIAL_SERVICES.length} official services.`);
    }

    // 3. Seed Official Workers
    const defaultWorkerPasswordHash = bcrypt.hashSync('worker123', 10);
    for (const w of OFFICIAL_WORKERS) {
      const existingWorker = await prisma.user.findUnique({ where: { email: w.email } });
      if (!existingWorker) {
        await prisma.user.create({
          data: {
            id: w.id,
            email: w.email,
            name: w.name,
            role: 'WORKER',
            password: defaultWorkerPasswordHash,
            phone: w.phone
          }
        });
      }
    }

    // 4. Hydrate existing orders from DB into localStore for instant lookup
    const dbOrders = await prisma.order.findMany({
      include: { job: true, documents: true }
    });
    for (const o of dbOrders) {
      if (!localStore.getOrder(o.id)) {
        const snapshot = typeof o.serviceSnapshot === 'string' ? JSON.parse(o.serviceSnapshot) : o.serviceSnapshot;
        const pricing = typeof o.pricing === 'string' ? JSON.parse(o.pricing) : o.pricing;
        localStore.orders.set(o.id, {
          id: o.id,
          customerId: o.customerId,
          serviceId: o.serviceId,
          serviceName: snapshot?.name || 'Service',
          status: o.status,
          pricePaise: pricing?.basePricePaise || 0,
          workerEarningsPaise: pricing?.workerEarningsPaise || Math.round((pricing?.basePricePaise || 0) * 0.8),
          assignedWorkerId: o.job?.workerId || null,
          documents: o.documents || [],
          deliverables: [],
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString()
        });
      }
    }

    console.log('[Database] Synchronization complete. Production PostgreSQL is active.');
    return true;
  } catch (err: any) {
    console.error('[Database] Sync error, fallback will handle requests:', err.message);
    return false;
  }
};

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { OFFICIAL_SERVICES, OFFICIAL_WORKERS, localStore } from './catalogData';

// ==========================================
// PRISMA CLIENT INITIALIZATION & LOGGING
// ==========================================
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

let isDbConnected: boolean | null = null;
let lastCheckTime = 0;
let checkInFlight: Promise<boolean> | null = null;

// Only log when database is not in cooldown offline state
prisma.$on('error' as never, (e: any) => {
  if (isDbConnected !== false) {
    console.error('[Prisma Error]:', e.message || e);
  }
});

prisma.$on('warn' as never, (e: any) => {
  if (isDbConnected !== false) {
    console.warn('[Prisma Warning]:', e.message || e);
  }
});

// ==========================================
// ENVIRONMENT FLAGS
// ==========================================
/**
 * Controls whether the local JSON fallback store is permitted for write/transactional
 * operations. Defaults to `true` in development and `false` in production to prevent
 * split-brain persistence on ephemeral/serverless file systems.
 *
 * Explicitly set ALLOW_JSON_FALLBACK=true to re-enable in production for emergencies.
 */
export const isJsonFallbackAllowed = (): boolean => {
  if (process.env.ALLOW_JSON_FALLBACK === 'true') return true;
  if (process.env.ALLOW_JSON_FALLBACK === 'false') return false;
  // Default: allow in development/test, disallow in production
  return process.env.NODE_ENV !== 'production';
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================
/**
 * Safely parse JSON strings or return original object if already parsed
 */
const safeJsonParse = <T = any>(data: any, fallback: T): T => {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
};

// ==========================================
// DATABASE RETRY WRAPPER
// ==========================================
/**
 * Retry wrapper for transient Supabase PgBouncer connection drops.
 * Uses exponential backoff with fixed configurable delay.
 *
 * @param fn      - Async function to execute (receives no arguments)
 * @param retries - Number of additional attempts after the first failure (default: 3)
 * @param delayMs - Base delay in milliseconds between retries (default: 250)
 */
export const withDbRetry = async <T>(
  fn: () => Promise<T>,
  retries = process.env.NODE_ENV === 'test' ? 1 : 3,
  delayMs = process.env.NODE_ENV === 'test' ? 50 : 250
): Promise<T> => {
  if (isDbConnected === false) {
    throw new Error('Database is currently offline');
  }
  if (isDbConnected === null) {
    await checkDb().catch(() => false);
    if (isDbConnected === false) {
      throw new Error('Database is currently offline');
    }
  }
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      // Detect transient PgBouncer / connection pool errors only
      const isTransient =
        err?.code === 'P1001' || // Prisma: Can't reach database server
        err?.code === 'P1002' || // Prisma: Database server timeout
        err?.code === 'P1008' || // Prisma: Operations timed out
        err?.code === 'P1017' || // Prisma: Server has closed the connection
        err?.message?.includes('connection pool') ||
        err?.message?.includes('PgBouncer') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('ETIMEDOUT');

      if (!isTransient || attempt === retries) {
        throw err;
      }

      const wait = delayMs * Math.pow(2, attempt); // Exponential backoff
      console.warn(`[DB Retry] Attempt ${attempt + 1}/${retries} failed. Retrying in ${wait}ms...`, err.message);
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  throw lastErr;
};

// ==========================================
// DATABASE CONNECTION MONITOR / HEALTHCHECK
// ==========================================
/**
 * Fast-checking database ping with timeout and throttling cooldown.
 * Prevents flooding PostgreSQL with repeated queries when disconnected.
 */
export const checkDb = async (force = false): Promise<boolean> => {
  const now = Date.now();
  const isTest = process.env.NODE_ENV === 'test';
  const cooldownMs = isDbConnected === false ? (isTest ? 2000 : 60000) : (isTest ? 5000 : 15000);

  // Use cached status if within cooldown window
  if (!force && isDbConnected !== null && now - lastCheckTime < cooldownMs) {
    return isDbConnected;
  }

  // Deduplicate concurrent checks
  if (checkInFlight) {
    return checkInFlight;
  }

  const timeoutMs = Number(process.env.DB_TIMEOUT_MS) || (isTest ? 5000 : 7000);

  checkInFlight = (async () => {
    let timer: NodeJS.Timeout | null = null;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('DB connection timeout')), timeoutMs);
      });

      // Race DB query with timeout
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
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
      if (timer) clearTimeout(timer);
      checkInFlight = null;
    }
  })();

  return checkInFlight;
};

// ==========================================
// PRODUCTION 503 GUARD FOR WRITE ENDPOINTS
// ==========================================
/**
 * Throws a structured error that controllers can catch to return HTTP 503.
 *
 * Use this in POST/PATCH/DELETE handlers (orders, payments, withdrawals, job
 * state changes) when:
 *   - checkDb() returns false, AND
 *   - isJsonFallbackAllowed() returns false (production mode)
 *
 * Example usage in a controller:
 *   const dbOk = await checkDb();
 *   if (!dbOk && !isJsonFallbackAllowed()) throw new DbUnavailableError();
 */
export class DbUnavailableError extends Error {
  public readonly statusCode = 503;
  public readonly code = 'SERVICE_UNAVAILABLE';

  constructor(message = 'Database is temporarily unavailable. Please retry in a few moments.') {
    super(message);
    this.name = 'DbUnavailableError';
  }
}

// ==========================================
// STARTUP SYNCHRONIZATION & SEEDING
// ==========================================
/**
 * Initialize and sync PostgreSQL database on startup.
 * Seeds Admin, Services, and Workers into PostgreSQL if not present,
 * and loads persisted orders/users from PostgreSQL into localStore for zero-downtime consistency.
 */
export const initDatabase = async (): Promise<boolean> => {
  const dbOk = await checkDb(true);
  if (!dbOk) {
    console.warn('[Database] PostgreSQL connection failed; running in ResilientStore fallback mode.');
    return false;
  }

  try {
    console.log('[Database] PostgreSQL connected. Synchronizing persistent records...');

    // 0. Ensure worker_orders_view and process_cybercafe_timers exist in PostgreSQL
    try {
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE VIEW worker_orders_view AS
        SELECT
          o.id,
          o."orderNumber",
          o."customerId",
          o."serviceId",
          o."assignedWorkerId",
          o."formData",
          o."workerAmountPaise",
          o."currency",
          o.status,
          o."paymentStatus",
          o."earningStatus",
          o."acceptedAt",
          o."startedAt",
          o."workCompletedAt",
          o."receiptSubmittedAt",
          o."completedAt",
          o."cancelledAt",
          o."createdAt",
          o."updatedAt",
          o."timeSlot",
          o."bookingDate",
          o."slotStatus",
          o."proposedSlot",
          o."proposedDate"
        FROM "Order" o;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION process_cybercafe_timers()
        RETURNS void AS $$
        DECLARE
          expired_order RECORD;
          inactive_worker RECORD;
        BEGIN
          FOR expired_order IN
            SELECT id, "assignedWorkerId", status
            FROM "Order"
            WHERE status = 'OFFERED'
              AND "updatedAt" < NOW() - INTERVAL '10 minutes'
            FOR UPDATE SKIP LOCKED
          LOOP
            UPDATE "Order"
            SET status = 'AVAILABLE',
                "assignedWorkerId" = NULL,
                "updatedAt" = NOW()
            WHERE id = expired_order.id;
          END LOOP;

          FOR inactive_worker IN
            SELECT id
            FROM "User"
            WHERE role = 'WORKER'
              AND "isOnline" = true
              AND ("lastHeartbeatAt" IS NULL OR "lastHeartbeatAt" < NOW() - INTERVAL '30 minutes')
            FOR UPDATE SKIP LOCKED
          LOOP
            UPDATE "User"
            SET "isOnline" = false,
                "updatedAt" = NOW()
            WHERE id = inactive_worker.id;
          END LOOP;
        END;
        $$ LANGUAGE plpgsql;
      `);
    } catch (viewErr: any) {
      console.warn('[Database] Notice initializing worker_orders_view / timers:', viewErr.message || viewErr);
    }

    // 1. Purge obsolete demo admin accounts if present
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: 'admin@cybercafe.com' }, { id: 'ADM-001' }]
      }
    });

    // 2. Synchronize Admin accounts from PostgreSQL into localStore
    const dbAdmins = await prisma.user.findMany({ where: { role: 'ADMIN' } });

    if (dbAdmins.length === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      const newAdmin = await prisma.user.create({
        data: {
          id: process.env.ADMIN_ID || 'Karan Kumar',
          email: process.env.ADMIN_EMAIL,
          name: process.env.ADMIN_ID || 'Karan Kumar',
          role: 'ADMIN',
          password: hashedPassword,
          phone: process.env.ADMIN_PHONE || '9876543200'
        }
      });
      dbAdmins.push(newAdmin);
      console.log(`[Database] Initialized default Admin: ${newAdmin.email}`);
    }

    // Mirror active Admins into local memory store
    for (const admin of dbAdmins) {
      localStore.saveUser({
        id: admin.id,
        adminId: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone || '',
        role: 'ADMIN',
        password: admin.password,
        passwordHash: admin.password,
        accountStatus: 'ACTIVE',
        createdAt: admin.createdAt.toISOString()
      });

      localStore.settings.adminName = admin.name;
      localStore.settings.adminId = admin.id;
      localStore.settings.email = admin.email;
      if (admin.phone) {
        localStore.settings.mobile = admin.phone;
      }
    }
    console.log(`[Database] Admin synchronized (${dbAdmins.length} active).`);

    // 3. Seed Official Services — idempotent.
    // BUG FIX: this previously seeded only when the table was empty
    // (serviceCount === 0). The moment any test/admin row existed, the 16-row
    // official catalog was skipped, so the customer portal displayed only those
    // stray rows. We now guarantee every official service exists by its stable
    // id, without ever touching admin-authored rows.
    const existingServiceIds = new Set(
      (await prisma.service.findMany({ select: { id: true } })).map(s => s.id)
    );
    const missingOfficial = OFFICIAL_SERVICES.filter(s => !existingServiceIds.has(s.id));
    if (missingOfficial.length > 0) {
      await prisma.service.createMany({
        data: missingOfficial.map(s => ({
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
        })) as any,
        skipDuplicates: true
      });
      console.log(`[Database] Seeded ${missingOfficial.length} missing official services.`);
    } else {
      console.log('[Database] Official service catalog complete.');
    }

    // 4. Seed Official Workers
    const defaultWorkerSecret = process.env.DEFAULT_WORKER_PASSWORD || 'Worker@Safe123';
    const defaultWorkerPasswordHash = await bcrypt.hash(defaultWorkerSecret, 10);

    for (const worker of OFFICIAL_WORKERS) {
      const existingWorker = await prisma.user.findUnique({
        where: { email: worker.email }
      });

      if (!existingWorker) {
        await prisma.user.create({
          data: {
            id: worker.id,
            email: worker.email,
            name: worker.name,
            role: 'WORKER',
            password: defaultWorkerPasswordHash,
            phone: worker.phone
          }
        });
      }
    }

    // 5. Hydrate persisted orders from DB into localStore for instant lookup
    const dbOrders = await prisma.order.findMany({
      include: {
        job: true,
        documents: true
      }
    });

    for (const order of dbOrders) {
      if (!localStore.getOrder(order.id)) {
        const snapshot = (order.serviceSnapshot || {}) as any;
        const pricing = (order.pricing || {}) as any;
        localStore.orders.set(order.id, {
          id: order.id,
          customerId: order.customerId,
          serviceId: order.serviceId,
          serviceName: snapshot?.name || 'Service',
          status: order.status as any,
          earningStatus: order.earningStatus || undefined,
          completedAt: order.completedAt ? order.completedAt.toISOString() : undefined,
          workerAmountPaise: order.workerAmountPaise || undefined,
          pricePaise: pricing?.basePricePaise || order.customerPaidAmountPaise || 0,
          workerEarningsPaise:
            pricing?.workerEarningsPaise ||
            order.workerAmountPaise ||
            (order.adminCommissionPaise !== undefined ? Math.max(0, (pricing?.basePricePaise || order.customerPaidAmountPaise || 0) - order.adminCommissionPaise) : (pricing?.basePricePaise || order.customerPaidAmountPaise || 0)),
          assignedWorkerId: order.assignedWorkerId || order.job?.workerId || null,
          documents: (order.documents || []) as any,
          deliverables: [],
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString()
        } as any);
      }
    }

    // 6. Hydrate persisted withdrawals from DB into localStore for accurate balances
    const dbWithdrawals = await prisma.withdrawal.findMany();
    for (const w of dbWithdrawals) {
      localStore.withdrawals.set(w.id, {
        id: w.id,
        workerId: w.workerId,
        amountPaise: w.amountPaise,
        method: (w.method as any) || 'BANK',
        payoutDetails: w.payoutDetails,
        status: (w.status as any) || 'COMPLETED',
        paymentReference: w.paymentReference || undefined,
        processedAt: w.processedAt ? w.processedAt.toISOString() : undefined,
        createdAt: w.requestedAt ? w.requestedAt.toISOString() : new Date().toISOString()
      });
    }

    // 7. Sync workers from DB into localStore
    const dbWorkers = await prisma.worker.findMany();
    for (const dw of dbWorkers) {
      const lw = localStore.getWorker(dw.id);
      if (lw) {
        lw.walletBalancePaise = dw.walletBalancePaise;
        lw.totalEarningsPaise = dw.totalEarningsPaise;
        lw.isOnline = dw.isOnline;
      }
    }

    console.log(`[Database] Synchronization complete (${dbOrders.length} orders, ${dbWithdrawals.length} withdrawals loaded into local cache).`);
    return true;
  } catch (err: any) {
    console.error('[Database] Sync error, fallback will handle requests:', err.message || err);
    return false;
  }
};
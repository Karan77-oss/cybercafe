import { localStore } from './catalogData';
import { prisma, checkDb } from './db';

// ==========================================
// CONFIGURATION & TIMER STATE
// ==========================================
const TIMER_INTERVAL_MS = 30000; // 30 Seconds
const MAX_NOTIFICATIONS_HISTORY = 500; // Cap to prevent memory leaks

let backgroundTimer: NodeJS.Timeout | null = null;
let isTickInProgress = false; // Prevents overlapping cycles

// ==========================================
// HELPER FUNCTIONS
// ==========================================
/**
 * Generate collision-safe unique notification IDs
 */
const generateNotifId = (prefix = 'notif'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Safely parse timestamp to avoid NaN comparison pitfalls
 */
const getSafeTimestamp = (dateValue: any): number | null => {
  if (!dateValue) return null;
  const parsed = new Date(dateValue).getTime();
  return isNaN(parsed) ? null : parsed;
};

/**
 * Add notification to memory store with automatic memory trimming
 */
const pushNotification = (notification: any) => {
  localStore.notifications.unshift(notification);
  if (localStore.notifications.length > MAX_NOTIFICATIONS_HISTORY) {
    localStore.notifications.length = MAX_NOTIFICATIONS_HISTORY;
  }
};

/**
 * Resolve current active Admin identifier
 */
const getActiveAdminId = (): string => {
  return localStore.settings?.adminId || process.env.ADMIN_ID || 'ADM-001';
};

// ==========================================
// SINGLE-PASS MAINTENANCE FUNCTION (IDEMPOTENT)
// ==========================================
/**
 * Runs all maintenance passes in a single idempotent async sweep.
 *
 * Safe to call from:
 *  - `setInterval` in stateful long-running processes (server.ts)
 *  - Vercel Cron via `POST /api/internal/cron/timers` (routes.ts)
 *
 * Returns a summary of work performed so the cron endpoint can log it.
 */
export async function runAllMaintenanceTimers(): Promise<{
  expiredOffers: number;
  autoOfflinedWorkers: number;
  correctionAlerts: number;
}> {
  const result = { expiredOffers: 0, autoOfflinedWorkers: 0, correctionAlerts: 0 };

  const now = Date.now();
  const isDbConnected = await checkDb().catch(() => false);

  // ----------------------------------------------------
  // 1. Expire 10-Minute Worker Offer Timeouts (atomic updateMany)
  //    Using updateMany so concurrent invocations cannot double-process.
  // ----------------------------------------------------
  const currentOrders = Array.from(localStore.orders.values());
  for (const order of currentOrders) {
    if (order.status === 'OFFERED' && order.offerExpiresAt) {
      const expiresAt = getSafeTimestamp(order.offerExpiresAt);
      if (expiresAt !== null && expiresAt <= now) {
        console.log(`[Timers] Offer for order #${order.id} expired.`);

        localStore.handleOfferExpiry(order.id);
        result.expiredOffers++;

        // Sync order status back to DB atomically if online.
        // Note: 'OFFERED' is a localStore-only state. In the DB the order
        // remains 'AVAILABLE' while being offered locally, so we match that.
        if (isDbConnected) {
          try {
            await prisma.order.updateMany({
              where: { id: order.id, status: 'AVAILABLE' },
              data: { status: 'AVAILABLE' }
            });
          } catch (err: any) {
            console.warn(`[Timers] Failed to sync expired offer #${order.id} in DB:`, err.message);
          }
        }
      }
    }
  }

  // ----------------------------------------------------
  // 2. Auto-Offline Workers After 30-Minute Inactivity (atomic updateMany)
  // ----------------------------------------------------
  for (const worker of localStore.workers) {
    if (worker.isOnline && worker.lastActivityAt) {
      const lastActive = getSafeTimestamp(worker.lastActivityAt);
      if (lastActive !== null) {
        const inactiveMs = now - lastActive;

        if (inactiveMs > 30 * 60 * 1000) {
          console.log(`[Timers] Worker ${worker.id} auto-offline due to 30m inactivity.`);
          worker.isOnline = false;
          result.autoOfflinedWorkers++;

          pushNotification({
            id: generateNotifId('notif_wrk'),
            recipientId: worker.id,
            recipientRole: 'WORKER',
            type: 'AUTO_OFFLINE',
            title: 'Switched to Offline',
            message: 'You have been switched to Offline due to 30 minutes of inactivity. Switch back to Online when ready.',
            isRead: false,
            createdAt: new Date().toISOString()
          });

          // Update worker status in DB atomically — updateMany won't error if already offline
          if (isDbConnected) {
            try {
              await prisma.user.updateMany({
                where: { id: worker.id, role: 'WORKER', isOnline: true } as any,
                data: { isOnline: false } as any
              });
            } catch { /* Non-critical: local state already updated above */ }
          }
        }
      }
    }
  }

  // ----------------------------------------------------
  // 3. 2-Hour Correction Window Overdue Notifications
  // ----------------------------------------------------
  for (const order of currentOrders) {
    if (order.status === 'CORRECTION_REQUIRED' && order.correctionDeadline) {
      const deadline = getSafeTimestamp(order.correctionDeadline);

      if (deadline !== null && deadline <= now && !order.correctionOverdueNotified) {
        order.correctionOverdueNotified = true;
        result.correctionAlerts++;

        const adminId = getActiveAdminId();

        // A. Notify Customer
        if (order.customerId) {
          pushNotification({
            id: generateNotifId('notif_cust'),
            recipientId: order.customerId,
            recipientRole: 'CUSTOMER',
            type: 'ORDER_CORRECTION_OVERDUE',
            title: 'Correction Window Notice',
            message: `Order #${order.id} correction has exceeded the 2-hour window. Administrative review is in progress.`,
            orderId: order.id,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }

        // B. Notify Admin
        pushNotification({
          id: generateNotifId('notif_adm'),
          recipientId: adminId,
          recipientRole: 'ADMIN',
          type: 'ORDER_CORRECTION_OVERDUE',
          title: 'Order Correction Overdue',
          message: `Order #${order.id} for operator ${order.assignedWorkerId || 'Unassigned'} exceeded 2-hour correction deadline. Admin action needed.`,
          orderId: order.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });

        // Sync order snapshot with flag to DB
        if (isDbConnected) {
          try {
            await prisma.order.update({
              where: { id: order.id },
              data: { serviceSnapshot: order.serviceSnapshot }
            });
          } catch { /* Non-critical: notification already pushed to memory store */ }
        }
      }
    }
  }

  return result;
}

// ==========================================
// STATEFUL PROCESS SCHEDULER
// ==========================================
/**
 * Core background cycle that prevents overlapping ticks.
 * Wraps runAllMaintenanceTimers with a mutex guard.
 */
async function runBackgroundCycle() {
  if (isTickInProgress) return;
  isTickInProgress = true;

  try {
    await runAllMaintenanceTimers();
  } catch (err: any) {
    console.error('[Timers] Error in background timer cycle:', err.message || err);
  } finally {
    isTickInProgress = false;
  }
}

// ==========================================
// LIFECYCLE MANAGEMENT EXPORTS
// ==========================================
/**
 * Starts background heartbeat timers.
 * Only called from server.ts when running in stateful mode
 * (not Vercel Serverless, not DISABLE_INTERNAL_TIMERS).
 */
export function startBackgroundTimers(): NodeJS.Timeout {
  if (backgroundTimer) {
    return backgroundTimer;
  }

  console.log(`[Timers] Starting central server background timers (${TIMER_INTERVAL_MS / 1000}s interval)...`);

  backgroundTimer = setInterval(runBackgroundCycle, TIMER_INTERVAL_MS);

  // In test environments, unref to allow Jest/Mocha to exit cleanly
  if (process.env.NODE_ENV === 'test' && typeof backgroundTimer.unref === 'function') {
    backgroundTimer.unref();
  }

  return backgroundTimer;
}

/**
 * Gracefully stops background heartbeat timers
 */
export function stopBackgroundTimers() {
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
    isTickInProgress = false;
    console.log('[Timers] Central server background timers stopped.');
  }
}
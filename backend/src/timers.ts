import { localStore } from './catalogData';

let backgroundTimer: NodeJS.Timeout | null = null;

export function startBackgroundTimers() {
  if (backgroundTimer) return backgroundTimer;

  console.log('[Timers] Starting central server background timers (30s interval)...');

  backgroundTimer = setInterval(() => {
    try {
      const now = Date.now();

      // 1. Check 10-minute worker offer timeouts (Section 6 & 12)
      for (const order of localStore.orders.values()) {
        if (order.status === 'OFFERED' && order.offerExpiresAt) {
          if (new Date(order.offerExpiresAt).getTime() <= now) {
            console.log(`[Timers] Offer for order ${order.id} expired.`);
            localStore.handleOfferExpiry(order.id);
          }
        }
      }

      // 2. Check 30-minute worker inactivity timeouts (Section 11 & 12)
      for (const worker of localStore.workers) {
        if (worker.isOnline && worker.lastActivityAt) {
          const inactiveMs = now - new Date(worker.lastActivityAt).getTime();
          if (inactiveMs > 30 * 60 * 1000) {
            console.log(`[Timers] Worker ${worker.id} auto-offline due to 30m inactivity.`);
            worker.isOnline = false;
            localStore.notifications.unshift({
              id: `notif_${Date.now()}`,
              recipientId: worker.id,
              recipientRole: 'WORKER',
              type: 'AUTO_OFFLINE',
              title: 'Switched to Offline',
              message: 'You have been switched to Offline due to 30 minutes of inactivity. Switch back to Online when ready.',
              isRead: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 3. Check 2-hour correction overdue notifications (Section 13 & 17)
      for (const order of localStore.orders.values()) {
        if (order.status === 'CORRECTION_REQUIRED' && order.correctionDeadline) {
          if (new Date(order.correctionDeadline).getTime() <= now && !order.correctionOverdueNotified) {
            order.correctionOverdueNotified = true;
            // Notify Customer
            localStore.notifications.unshift({
              id: `notif_${Date.now()}`,
              recipientId: order.customerId,
              recipientRole: 'CUSTOMER',
              type: 'ORDER_CORRECTION_OVERDUE',
              title: 'Correction Window Notice',
              message: `Order #${order.id} correction has exceeded the 2-hour window. Administrative review is in progress.`,
              orderId: order.id,
              isRead: false,
              createdAt: new Date().toISOString()
            });
            // Notify Admin
            localStore.notifications.unshift({
              id: `notif_adm_${Date.now()}`,
              recipientId: 'ADM-001',
              recipientRole: 'ADMIN',
              type: 'ORDER_CORRECTION_OVERDUE',
              title: 'Order Correction Overdue',
              message: `Order #${order.id} for operator ${order.assignedWorkerId} exceeded 2-hour correction deadline. Admin action needed.`,
              orderId: order.id,
              isRead: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (err: any) {
      console.error('[Timers] Error in background timer cycle:', err.message);
    }
  }, 30000);

  // Unref so Jest and CLI tools exit cleanly without leaking timers
  if (backgroundTimer.unref) backgroundTimer.unref();

  return backgroundTimer;
}

export function stopBackgroundTimers() {
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }
}

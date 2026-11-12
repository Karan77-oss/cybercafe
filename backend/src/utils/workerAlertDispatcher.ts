import { sendUserEvent, broadcastEvent } from './realtimeEvents';

export interface OrderAlertPayload {
  orderId: string;
  orderNumber?: string;
  serviceName: string;
  workerAmountPaise: number;
  workerId?: string;
  deadline?: string;
}

/**
 * Dispatches free instant alerts to workers via:
 * 1. Telegram Bot (TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID)
 * 2. In-App Realtime SSE Push
 *
 * Saves 100% of SMS costs for worker notifications.
 */
export async function dispatchWorkerAlert(payload: OrderAlertPayload): Promise<void> {
  const { orderId, orderNumber, serviceName, workerAmountPaise, workerId } = payload;
  const rupeePayout = Math.round(Number(workerAmountPaise || 0) / 100);

  // 1. In-App Realtime SSE Notification
  try {
    const sseEvent = {
      type: 'NEW_ORDER_OFFER',
      orderId,
      orderNumber: orderNumber || orderId,
      serviceName,
      workerAmountPaise,
      payoutRupees: rupeePayout,
      timestamp: new Date().toISOString()
    };

    if (workerId) {
      sendUserEvent(workerId, 'NEW_ORDER_OFFER', sseEvent);
    } else {
      broadcastEvent('NEW_AVAILABLE_ORDER', sseEvent);
    }
  } catch (err: any) {
    console.warn('[WorkerAlert] SSE dispatch notice:', err.message);
  }

  // 2. Telegram Bot Dispatcher (if configured in env)
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    try {
      const message = `⚡ *CyberCafe Operator Alert*\n\n` +
        `📦 *Order:* \`#${orderNumber || orderId}\`\n` +
        `🛠️ *Service:* ${serviceName}\n` +
        `💰 *Operator Payout:* ₹${rupeePayout}\n\n` +
        `👉 Open your worker workspace to accept.`;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        console.warn('[WorkerAlert] Telegram API responded with status:', response.status);
      }
    } catch (tgErr: any) {
      console.warn('[WorkerAlert] Telegram alert notice:', tgErr.message || tgErr);
    }
  }
}

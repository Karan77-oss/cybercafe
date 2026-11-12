import { Request, Response } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma, checkDb, withDbRetry } from './db';
import { localStore } from './catalogData';
import { dispatchWorkerAlert } from './utils/workerAlertDispatcher';

// ==========================================
// CONFIGURATION & SECRETS
// ==========================================
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret';

if (process.env.NODE_ENV === 'production' && WEBHOOK_SECRET === 'secret') {
  console.warn('⚠️ [SECURITY WARNING] Using default fallback RAZORPAY_WEBHOOK_SECRET in production. Set RAZORPAY_WEBHOOK_SECRET in your environment variables.');
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
/**
 * Timing-safe signature verification to prevent side-channel timing attacks
 */
const verifyRazorpaySignature = (rawBody: string | Buffer, signature: string, secret: string): boolean => {
  if (!rawBody || !signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  // Length mismatch check avoids timingSafeEqual length error
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};

// ==========================================
// WEBHOOK CONTROLLER
// ==========================================
export const webhookController = {
  /**
   * Razorpay Payment Gateway Webhook Receiver
   */
  razorpayWebhook: async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;

      // rawBody is attached by express.raw / body-parser middleware before JSON parsing
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

      if (!rawBody || !signature) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WEBHOOK_PAYLOAD',
            message: 'Webhook payload or Razorpay signature header is missing'
          }
        });
      }

      // 1. Verify webhook authenticity
      const isAuthentic = verifyRazorpaySignature(rawBody, signature, WEBHOOK_SECRET);
      if (!isAuthentic) {
        console.error('[Razorpay Webhook] Signature mismatch detected.');
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Razorpay webhook signature verification failed'
          }
        });
      }

      // 2. Parse event payload
      const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      const eventType = event?.event;

      // 3. Process payment.captured event
      if (eventType === 'payment.captured') {
        const paymentEntity = event.payload?.payment?.entity;
        if (!paymentEntity) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_PAYLOAD', message: 'Missing payment entity' }
          });
        }

        const providerPaymentId: string = paymentEntity.id;
        const providerOrderId: string = paymentEntity.order_id;
        const amountPaise: number = paymentEntity.amount;
        const currency: string = paymentEntity.currency;

        if (currency !== 'INR') {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_CURRENCY', message: 'Transactions must be in INR currency' }
          });
        }

        // 4. Update Database if connected
        const isDbOnline = await checkDb().catch(() => false);
        if (isDbOnline) {
          try {
            await withDbRetry(() => prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              let payment = await tx.payment.findUnique({
                where: { providerOrderId }
              });

              const receiptCandidate = String(paymentEntity?.receipt || paymentEntity?.notes?.orderId || '');

              // Retry/backoff lookup for target order if payment row doesn't exist yet
              if (!payment && receiptCandidate) {
                let targetOrder = await tx.order.findFirst({
                  where: {
                    OR: [
                      { id: receiptCandidate },
                      { orderNumber: receiptCandidate }
                    ]
                  }
                });

                if (!targetOrder) {
                  // Fallback: Check if order exists in local store
                  const localFallbackOrder = localStore.getOrder(receiptCandidate) ||
                    Array.from(localStore.orders.values()).find(
                      o => o.id === receiptCandidate || o.orderNumber === receiptCandidate || o.payment?.providerOrderId === providerOrderId
                    );

                  if (localFallbackOrder) {
                    // Upsert order into database to guarantee consistency
                    targetOrder = await tx.order.upsert({
                      where: { id: localFallbackOrder.id },
                      create: {
                        id: localFallbackOrder.id,
                        orderNumber: localFallbackOrder.orderNumber || localFallbackOrder.id,
                        customerId: localFallbackOrder.customerId,
                        serviceId: localFallbackOrder.serviceId,
                        status: 'PAYMENT_PENDING',
                        paymentStatus: 'PENDING',
                        serviceSnapshot: localFallbackOrder.serviceSnapshot || {},
                        pricing: localFallbackOrder.pricing || {},
                        workerAmountPaise: localFallbackOrder.workerAmountPaise || 0,
                        adminCommissionPaise: localFallbackOrder.adminCommissionPaise || 0,
                        customerPaidAmountPaise: amountPaise
                      },
                      update: {}
                    });
                  }
                }

                if (targetOrder) {
                  payment = await tx.payment.create({
                    data: {
                      orderId: targetOrder.id,
                      provider: 'RAZORPAY',
                      providerOrderId,
                      providerPaymentId,
                      amountPaise,
                      currency: 'INR',
                      status: 'PENDING'
                    }
                  });
                }
              }

              if (!payment) {
                // If database record is not located, check localStore before failing
                const localOrderMatch = Array.from(localStore.orders.values()).find(
                  o => o.payment?.providerOrderId === providerOrderId || o.id === receiptCandidate
                );
                if (localOrderMatch) {
                  console.warn(`[Razorpay Webhook] Order found in localStore fallback for ${providerOrderId}`);
                  return null;
                }
                throw new Error('PAYMENT_NOT_FOUND');
              }

              // Row Lock (FOR UPDATE)
              await tx.$queryRaw`
                SELECT id, "paymentStatus" FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE
              `;

              // Idempotency: Ignore already verified payments
              if (payment.status === 'PAID') {
                return payment;
              }

              if (payment.amountPaise !== amountPaise) {
                throw new Error('AMOUNT_MISMATCH');
              }

              const updatedPayment = await tx.payment.update({
                where: { providerOrderId },
                data: {
                  status: 'PAID',
                  providerPaymentId,
                  verifiedAt: new Date()
                }
              });

              await tx.order.update({
                where: { id: payment.orderId },
                data: { 
                  status: 'AVAILABLE',
                  paymentStatus: 'PAID',
                  assignedWorkerId: null,
                  paidAt: new Date()
                }
              });

              await tx.auditLog.create({
                data: {
                  action: 'PAYMENT_CAPTURED',
                  entityType: 'Payment',
                  entityId: updatedPayment.id,
                  metadata: {
                    providerPaymentId,
                    providerOrderId,
                    amountPaise
                  }
                }
              });

              return updatedPayment;
            }));
          } catch (dbErr: any) {
            console.error('[Razorpay Webhook] Database transaction notice:', dbErr.message);

            if (dbErr.message === 'AMOUNT_MISMATCH') {
              return res.status(400).json({
                success: false,
                error: { code: 'AMOUNT_MISMATCH', message: 'Captured amount does not match order record' }
              });
            }

            if (dbErr.message === 'PAYMENT_NOT_FOUND') {
              // Check if local store has the order before throwing 404
              const localOrder = Array.from(localStore.orders.values()).find(
                o => o.payment?.providerOrderId === providerOrderId || o.id === String(paymentEntity?.receipt || '')
              );
              if (!localOrder) {
                return res.status(404).json({
                  success: false,
                  error: { code: 'PAYMENT_NOT_FOUND', message: 'No matching payment order record found' }
                });
              }
            }
          }
        }

        // 5. Synchronize In-Memory Resilient Store & Double-entry Ledger
        try {
          const localOrder =
            localStore.getOrder(providerOrderId) ||
            Array.from(localStore.orders.values()).find(
              o => o.payment?.providerOrderId === providerOrderId || (o as any).providerOrderId === providerOrderId
            );

          if (localOrder) {
            localOrder.status = 'AVAILABLE';
            localOrder.paymentStatus = 'PAID';
            localOrder.earningStatus = 'PENDING';
            localOrder.assignedWorkerId = null;
            localOrder.worker = null;
            localOrder.job = null;
            localOrder.paidAt = new Date().toISOString();

            localStore.appendLedgerEntry({
              orderId: localOrder.id,
              amountPaise: localOrder.customerPaidAmount || localOrder.pricePaise || amountPaise,
              type: 'ORDER_PAYMENT',
              idempotencyKey: `PAYMENT_SUCCESS_${providerPaymentId}`,
              referenceNote: `Customer paid via Razorpay ID: ${providerPaymentId}`
            });

            // Customer notification for successful order placement
            if (localOrder.customerId) {
              localStore.notifications.unshift({
                id: `notif_pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                recipientId: localOrder.customerId,
                recipientRole: 'CUSTOMER',
                type: 'PAYMENT_SUCCESS',
                title: '💳 Payment Received!',
                message: `Your payment of ₹${((amountPaise || 0) / 100).toFixed(2)} was successful. Your order #${localOrder.id} is now available for operator pickup.`,
                orderId: localOrder.id,
                isRead: false,
                createdAt: new Date().toISOString()
              } as any);
            }

            localStore.saveOrder(localOrder);

            // Free Instant Worker Alert (Telegram Bot + Push) (Task 5.1)
            dispatchWorkerAlert({
              orderId: localOrder.id,
              orderNumber: localOrder.orderNumber,
              serviceName: localOrder.serviceName,
              workerAmountPaise: localOrder.workerAmountPaise || localOrder.workerAmount || localOrder.workerEarningsPaise || 0,
              workerId: localOrder.assignedWorkerId || undefined
            }).catch(() => {});
          }
        } catch (syncErr: any) {
          console.warn('[Razorpay Webhook] ResilientStore synchronization warning:', syncErr.message);
        }

        console.log(`[Razorpay Webhook] Successfully processed payment ${providerPaymentId} for order ${providerOrderId}`);
      } else {
        // Acknowledge other webhook events (e.g. payment.failed, refund.created) cleanly
        console.log(`[Razorpay Webhook] Received unhandled event type: ${eventType}`);
      }

      // Always return 200 OK so Razorpay stops repeating webhooks
      return res.status(200).json({ success: true, message: 'Webhook received successfully' });
    } catch (e: any) {
      console.error('[Razorpay Webhook] Unexpected internal failure:', e);
      return res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: e.message || 'Internal error handling webhook'
        }
      });
    }
  }
};
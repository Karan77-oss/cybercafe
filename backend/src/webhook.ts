import { Request, Response } from 'express';
import crypto from 'crypto';
import PaytmChecksum from 'paytmchecksum';
import { Prisma } from '@prisma/client';
import { prisma, checkDb, withDbRetry } from './db';
import { localStore } from './catalogData';
import { dispatchWorkerAlert } from './utils/workerAlertDispatcher';
import { broadcastEvent, sendUserEvent } from './utils/realtimeEvents';

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
  },

  /**
   * Paytm Payment Gateway Callback Handler
   */
  paytmCallback: async (req: Request, res: Response) => {
    try {
      const paytmParams = { ...req.body, ...req.query };
      const orderId = String(paytmParams.ORDER_ID || paytmParams.orderId || req.query.ORDER_ID || '');
      const txnStatus = String(paytmParams.STATUS || paytmParams.status || '');
      const checksum = String(paytmParams.CHECKSUMHASH || '');
      const paytmKey = process.env.PAYTM_MERCHANT_KEY || 'NbeW0mMpO%AHWojF';

      console.log(`[Paytm Callback] Received callback for Order ${orderId}, Status: ${txnStatus}`);

      if (!orderId) {
        return res.status(400).send('Invalid Paytm callback parameters: Missing ORDER_ID');
      }

      let isValidChecksum = false;
      if (checksum && paytmKey) {
        const verifyBody = { ...paytmParams };
        delete verifyBody.CHECKSUMHASH;
        try {
          isValidChecksum = await PaytmChecksum.verifySignature(verifyBody, paytmKey, checksum);
        } catch {
          isValidChecksum = false;
        }
      }

      const isSuccessful = isValidChecksum && txnStatus === 'TXN_SUCCESS';
      const txnId = paytmParams.TXNID || `PTM_${Date.now()}`;
      const now = new Date();
      const nowIso = now.toISOString();

      if (isSuccessful || txnStatus === 'TXN_SUCCESS') {
        let order: any = null;
        try {
          if (await checkDb()) {
            order = await prisma.order.findUnique({
              where: { id: orderId }
            });
          }
        } catch {}

        if (!order) {
          order = localStore.getOrder(orderId);
        }

        if (order) {
          const verifiedAmount = Number(
            order.customerPaidAmountPaise ||
            (order.pricing as any)?.pricePaise ||
            order.pricePaise ||
            4900
          );

          order.status = 'AVAILABLE';
          order.paymentStatus = 'PAID';
          order.earningStatus = 'PENDING';
          order.paidAt = nowIso;
          order.payment = {
            status: 'PAID',
            provider: 'PAYTM',
            providerOrderId: orderId,
            providerPaymentId: txnId,
            amountPaise: verifiedAmount,
            paidAt: nowIso
          };
          localStore.saveOrder(order);

          try {
            if (await checkDb()) {
              await withDbRetry(() => prisma.$transaction(async (tx) => {
                await tx.order.update({
                  where: { id: orderId },
                  data: {
                    status: 'AVAILABLE',
                    paymentStatus: 'PAID',
                    earningStatus: 'PENDING',
                    paidAt: now
                  }
                });
                await tx.payment.upsert({
                  where: { providerOrderId: orderId },
                  create: {
                    orderId,
                    provider: 'PAYTM',
                    providerOrderId: orderId,
                    providerPaymentId: txnId,
                    amountPaise: verifiedAmount,
                    currency: 'INR',
                    status: 'PAID',
                    signature: checksum,
                    paidAt: now,
                    verifiedAt: now
                  },
                  update: {
                    provider: 'PAYTM',
                    providerPaymentId: txnId,
                    status: 'PAID',
                    signature: checksum,
                    paidAt: now,
                    verifiedAt: now
                  }
                });
              }));
            }
          } catch (dbErr: any) {
            console.error('[Paytm Callback DB Error]:', dbErr?.message);
          }

          broadcastEvent('ORDER_CREATED', { order, orderId });
          broadcastEvent('ORDER_AVAILABLE', { order, orderId });
          broadcastEvent('ORDER_STATUS_UPDATED', {
            orderId,
            status: 'AVAILABLE',
            paymentStatus: 'PAID'
          });

          sendUserEvent(order.customerId, 'PAYMENT_CONFIRMED', {
            orderId,
            serviceName: order.serviceName || (order.serviceSnapshot as any)?.name || 'Cyber Cafe Service'
          });

          dispatchWorkerAlert({
            orderId,
            serviceName: order.serviceName || (order.serviceSnapshot as any)?.name || 'Service Order',
            serviceCategory: (order.serviceSnapshot as any)?.category,
            pricePaise: (order.pricing as any)?.pricePaise || 4900,
            bookingDate: order.bookingDate,
            timeSlot: order.timeSlot,
            customerId: order.customerId
          }).catch(() => {});
        }

        // Determine destination client URL for redirect
        const redirectParam = (req.query.redirectUrl as string) || (order?.serviceSnapshot as any)?.clientRedirectUrl;
        let clientBase = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
        if (!clientBase && req.headers.referer) {
          try {
            clientBase = new URL(req.headers.referer).origin;
          } catch {}
        }
        if (!clientBase) {
          clientBase = 'http://localhost:5176';
        }

        const redirectUrl = redirectParam || `${clientBase}/orders/${orderId}?status=success`;
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment Successful - Cyber Cafe</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0fdf4; text-align: center; padding: 20px;">
              <div style="background: white; padding: 36px 28px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.03); max-width: 420px; width: 100%; border: 1px solid #dcfce7;">
                <div style="width: 64px; height: 64px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px;">✓</div>
                <h2 style="color: #166534; margin: 0 0 10px; font-size: 22px; font-weight: 800;">Payment Successful!</h2>
                <p style="color: #4b5563; font-size: 14px; margin-bottom: 8px; line-height: 1.5;">Your payment has been verified and your order is actively assigned to expert operators.</p>
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 24px;">TXN ID: <strong style="color: #111827;">${txnId}</strong></p>
                <a href="${redirectUrl}" style="display: block; background: #0284c7; color: white; text-decoration: none; padding: 14px 24px; border-radius: 14px; font-weight: 700; font-size: 14px; transition: background 0.2s;">Return to Order</a>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 14px;">Redirecting automatically in 2 seconds...</p>
              </div>
              <script>
                setTimeout(function() {
                  window.location.href = "${redirectUrl}";
                }, 1800);
              </script>
            </body>
          </html>
        `);
      } else {
        const redirectParam = (req.query.redirectUrl as string) || (req.query.ORDER_ID ? `http://localhost:5176/orders/${req.query.ORDER_ID}?status=failed` : 'http://localhost:5176/orders');
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment Incomplete - Cyber Cafe</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff1f2; text-align: center; padding: 20px;">
              <div style="background: white; padding: 36px 28px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); max-width: 420px; width: 100%; border: 1px solid #fee2e2;">
                <div style="width: 64px; height: 64px; background: #fee2e2; color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px;">✕</div>
                <h2 style="color: #991b1b; margin: 0 0 10px; font-size: 22px; font-weight: 800;">Payment Incomplete</h2>
                <p style="color: #4b5563; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">${paytmParams.RESPMSG || 'Transaction could not be completed. You can re-try payment at any time.'}</p>
                <a href="${redirectParam}" style="display: block; background: #374151; color: white; text-decoration: none; padding: 14px 24px; border-radius: 14px; font-weight: 700; font-size: 14px;">Return to Order</a>
              </div>
            </body>
          </html>
        `);
      }
    } catch (e: any) {
      console.error('[Paytm Callback Error]:', e);
      return res.status(500).send('Payment callback processing failure');
    }
  }
};
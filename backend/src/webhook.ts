import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret';

export const webhookController = {
  razorpayWebhook: async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      
      // req.rawBody must be populated by Express middleware
      const rawBody = (req as any).rawBody;
      if (!rawBody || !signature) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_WEBHOOK', message: 'Missing signature or body' } });
      }

      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Signature mismatch' } });
      }

      const event = JSON.parse(rawBody);
      
      if (event.event === 'payment.captured') {
        const paymentEntity = event.payload.payment.entity;
        const providerPaymentId = paymentEntity.id;
        const providerOrderId = paymentEntity.order_id;
        const amountPaise = paymentEntity.amount;
        const currency = paymentEntity.currency;
        
        if (currency !== 'INR') {
          return res.status(400).json({ success: false, error: { code: 'INVALID_CURRENCY', message: 'Must be INR' } });
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const payment = await tx.payment.findUnique({ where: { providerOrderId } });
          if (!payment) throw new Error('PAYMENT_NOT_FOUND');
          
          if (payment.status === 'PAID') return payment; // Idempotent success
          
          if (payment.amountPaise !== amountPaise) {
            throw new Error('AMOUNT_MISMATCH');
          }

          const updated = await tx.payment.update({
            where: { providerOrderId },
            data: { status: 'PAID', providerPaymentId, verifiedAt: new Date() }
          });
          
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'AVAILABLE' }
          });
          
          await tx.auditLog.create({
            data: { action: 'PAYMENT_CAPTURED', entityType: 'Payment', entityId: updated.id }
          });
          
          return updated;
        });

        // Also synchronize in-memory resilient store & append double-entry ledger
        try {
          const { localStore } = await import('./catalogData');
          const localOrder = localStore.getOrder(providerOrderId) || Array.from(localStore.orders.values()).find(o => o.payment?.providerOrderId === providerOrderId);
          if (localOrder) {
            localOrder.status = 'AVAILABLE';
            localOrder.paymentStatus = 'PAID';
            localOrder.earningStatus = 'PENDING';
            localOrder.paidAt = new Date().toISOString();
            localStore.appendLedgerEntry({
              orderId: localOrder.id,
              amountPaise: localOrder.customerPaidAmount || localOrder.pricePaise || amountPaise,
              type: 'ORDER_PAYMENT',
              idempotencyKey: `PAYMENT_SUCCESS_${providerPaymentId}`,
              referenceNote: `Customer paid via payment ${providerPaymentId}`
            });
            localStore.saveOrder(localOrder);
          }
        } catch {}
      }

      
      return res.json({ success: true });
    } catch (e: any) {
      if (e.message === 'AMOUNT_MISMATCH' || e.message === 'PAYMENT_NOT_FOUND') {
        return res.status(400).json({ success: false, error: { code: e.message } });
      }
      return res.status(500).json({ success: false });
    }
  }
};

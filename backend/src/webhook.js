"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret';
exports.webhookController = {
    razorpayWebhook: async (req, res) => {
        try {
            const signature = req.headers['x-razorpay-signature'];
            // req.rawBody must be populated by Express middleware
            const rawBody = req.rawBody;
            if (!rawBody || !signature) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_WEBHOOK', message: 'Missing signature or body' } });
            }
            const expectedSignature = crypto_1.default
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
                await prisma.$transaction(async (tx) => {
                    const payment = await tx.payment.findUnique({ where: { providerOrderId } });
                    if (!payment)
                        throw new Error('PAYMENT_NOT_FOUND');
                    if (payment.status === 'PAID')
                        return payment; // Idempotent success
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
                    const { localStore } = await Promise.resolve().then(() => __importStar(require('./catalogData')));
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
                }
                catch { }
            }
            return res.json({ success: true });
        }
        catch (e) {
            if (e.message === 'AMOUNT_MISMATCH' || e.message === 'PAYMENT_NOT_FOUND') {
                return res.status(400).json({ success: false, error: { code: e.message } });
            }
            return res.status(500).json({ success: false });
        }
    }
};

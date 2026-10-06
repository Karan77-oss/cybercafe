"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("./controllers");
const webhook_1 = require("./webhook");
const extendedControllers_1 = require("./extendedControllers");
const portalControllers_1 = require("./portalControllers");
const auth_1 = require("./middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// ==========================================
// 1. Authentication Routes (Section 11, 12)
// ==========================================
router.post('/auth/register', controllers_1.authController.register);
router.post('/auth/login', controllers_1.authController.login);
router.post('/auth/logout', auth_1.requireAuth, controllers_1.authController.logout);
router.get('/auth/me', auth_1.requireAuth, controllers_1.authController.me);
router.post('/auth/change-password', auth_1.requireAuth, controllers_1.authController.changePassword);
router.post('/auth/forgot-password', controllers_1.authController.forgotPassword);
// ==========================================
// 2. Services Catalog (Section 13)
// ==========================================
router.get('/services', extendedControllers_1.servicesController.getServices);
router.get('/services/:id', extendedControllers_1.servicesController.getService);
// Optional auth helper: extracts user if token provided, but doesn't block guests
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
        ? authHeader.split(' ')[1]
        : req.query.token;
    if (!token)
        return next();
    try {
        const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';
        const decoded = require('jsonwebtoken').verify(token, secret);
        req.user = decoded;
    }
    catch { }
    next();
};
// Customer Worker Selection
router.get('/workers/available', optionalAuth, extendedControllers_1.workersController.getAvailableWorkers);
// ==========================================
// 3. Customer Orders & Payments (Section 14 - 27)
// ==========================================
const ORDER_ROLES = ['CUSTOMER', 'ADMIN'];
router.post('/orders', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.createOrder);
router.get('/orders', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.getOrders);
router.get('/orders/:id', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.getOrder);
router.post('/orders/:id/timeslot/accept', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.acceptTimeSlot);
router.post('/orders/:id/timeslot/reschedule', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.rescheduleTimeSlot);
router.post('/orders/:id/pay', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.payOrder);
router.post('/orders/:id/review', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.submitReview);
router.post('/payments/webhook', webhook_1.webhookController.razorpayWebhook);
// Customer Document, Receipt, Complaint (Section 23, 24, 25, 27)
router.post('/orders/:id/documents', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), upload.single('file'), extendedControllers_1.ordersController.uploadOrderDocument);
router.get('/orders/:id/receipt', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.getOrderReceipt);
router.post('/orders/:id/receipt/download', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.downloadOrderReceipt);
router.post('/orders/:id/complaints', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.ordersController.createOrderComplaint);
// Customer Wallet & Notifications
router.get('/customer/wallet', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.walletController.getWallet);
router.get('/customer/notifications', auth_1.requireAuth, (0, auth_1.requireRole)(ORDER_ROLES), extendedControllers_1.notificationsController.getNotifications);
// Document & Deliverables Access
router.post('/documents/upload', optionalAuth, upload.single('file'), extendedControllers_1.documentController.upload);
router.get('/documents/:id', optionalAuth, extendedControllers_1.documentController.getSignedUrl);
router.get('/documents/:id/download', optionalAuth, extendedControllers_1.documentController.download);
router.get(/^\/documents\/stream\/(.+)$/, optionalAuth, extendedControllers_1.documentController.streamFile);
router.get('/orders/:id/deliverables/:deliverableId/download', optionalAuth, extendedControllers_1.ordersController.downloadDeliverable);
// ==========================================
// 4. Worker Routes (Section 28 - 42)
// ==========================================
const WORKER_ROLES = ['WORKER', 'ADMIN'];
// Standard Specification Worker Routes
router.get('/worker/orders/available', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getAvailableOrders);
router.post('/worker/orders/:id/accept', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.acceptJob);
router.get('/worker/orders/active', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getActiveOrders);
router.get('/worker/orders/:id', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getOrderDetails);
router.get('/worker/orders/:id/documents', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getOrderDocuments);
router.post('/worker/orders/:id/start', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.startWork);
router.post('/worker/orders/:id/complete', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.completeOrder);
router.post('/worker/orders/:id/receipt', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), upload.single('file'), portalControllers_1.workerController.uploadReceipt);
router.get('/worker/earnings/summary', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getEarningsSummary);
router.get('/worker/withdrawals/:id', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getWithdrawalDetails);
// Backwards-Compatible Worker Routes
router.get('/worker/requests', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getAvailableRequests);
router.post('/worker/requests/:id/accept', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.acceptJob);
router.post('/worker/requests/:id/reject', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.rejectJob);
router.post('/worker/jobs/:id/accept', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.acceptJob);
router.get('/worker/jobs', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getMyJobs);
router.get('/worker/jobs/:id', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getJobDetails);
router.post('/worker/jobs/:id/start', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.startWork);
router.post('/worker/jobs/:id/timeslot', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.setTimeSlot);
router.post('/worker/jobs/:id/timeslot/accept-reschedule', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.acceptReschedule);
router.post('/worker/jobs/:id/deliverables', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), upload.single('file'), portalControllers_1.workerController.uploadDeliverables);
router.delete('/worker/jobs/:id/deliverables/:deliverableId', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.deleteDeliverable);
router.post('/worker/jobs/:id/submit', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.submitJob);
router.post('/worker/availability/toggle', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.toggleAvailability);
router.post('/worker/activity', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.recordActivity);
router.get('/worker/stats', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getStats);
router.get('/worker/earnings', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getEarningsHistory);
router.get('/worker/withdrawals', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getWithdrawals);
router.post('/worker/withdrawals', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.requestWithdrawal);
router.get('/worker/notifications', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getNotifications);
router.put('/worker/notifications/:id/read', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.markNotificationRead);
router.get('/worker/chat/:orderId', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getOrderChat);
router.post('/worker/chat/:orderId', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.sendChatMessage);
router.get('/worker/support/tickets', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getSupportTickets);
router.post('/worker/support/tickets', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.createSupportTicket);
router.post('/worker/support/tickets/:id/reply', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.replySupportTicket);
router.get('/worker/profile', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getProfile);
router.put('/worker/profile', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.updateProfile);
router.post('/worker/services/propose', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.proposeService);
router.get('/worker/services/proposals', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getProposals);
// Legacy & Direct Job / Payout endpoints
router.get('/jobs/available', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getAvailableOrders);
router.get('/jobs', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getMyJobs);
router.get('/jobs/:id', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.getJobDetails);
router.post('/jobs/:id/start', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.startWork);
router.post('/jobs/:id/submit', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), portalControllers_1.workerController.submitJob);
router.post('/jobs/:id/accept', auth_1.requireAuth, (0, auth_1.requireRole)(WORKER_ROLES), controllers_1.jobController.acceptJob);
router.post('/payouts/:jobId/release', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), controllers_1.payoutController.releasePayout);
// ==========================================
// 5. Admin Routes (Section 43 - 62)
// Strict RBAC: ADMIN Only
// ==========================================
// Dashboard
router.get('/admin/dashboard', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getDashboardStats);
// Worker Management
router.get('/admin/workers', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getWorkers);
router.get('/admin/workers/top-earning', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getTopEarningWorkers);
router.get('/admin/workers/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getWorkerDetails);
router.post('/admin/workers', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), upload.any(), portalControllers_1.adminController.createWorker);
router.post('/admin/workers/:id/reset-password', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.resetWorkerPassword);
router.post('/admin/workers/:id/verify', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.verifyWorker);
router.put('/admin/workers/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.setWorkerStatus);
router.delete('/admin/workers/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.deleteWorker);
// Customer Management
router.get('/admin/customers', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getCustomers);
router.get('/admin/customers/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getCustomerDetails);
router.put('/admin/customers/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.setCustomerStatus);
// Order Management & Overrides (Section 43 - 49, 54)
router.get('/admin/orders', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getOrders);
router.get('/admin/orders/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getOrderDetails);
router.post('/admin/orders/:id/assign', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.assignWorker);
router.post('/admin/orders/:id/assign-worker', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.assignWorker);
router.post('/admin/orders/:id/reassign-worker', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.reassignWorker);
router.post('/admin/orders/:id/verify-receipt', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.verifyReceipt);
router.put('/admin/orders/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.updateOrderStatus);
router.post('/admin/orders/:id/correction', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.requestCorrection);
router.post('/admin/orders/:id/hold-earnings', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.holdWorkerEarnings);
router.post('/admin/orders/:id/earning/hold', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.holdWorkerEarnings);
router.post('/admin/orders/:id/release-earnings', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.releaseWorkerEarnings);
router.post('/admin/orders/:id/earning/release', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.releaseWorkerEarnings);
router.post('/admin/orders/:id/refund', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.refundOrder);
// Service Management
router.get('/admin/services', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getServices);
router.post('/admin/services', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.createService);
router.put('/admin/services/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.updateService);
router.delete('/admin/services/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.deleteService);
router.post('/admin/services/:id/toggle', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.toggleServiceStatus);
router.get('/admin/proposals', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getServiceProposals);
router.post('/admin/proposals/:id/approve', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.approveProposal);
router.post('/admin/proposals/:id/reject', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.rejectProposal);
// Payments, Financials & Withdrawals (Section 50 - 61)
router.get('/admin/financials/summary', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getFinancialSummary);
router.get('/admin/finance/summary', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getFinancialSummary);
router.get('/admin/finance/top-workers', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getTopEarningWorkers);
router.get('/admin/finance/orders/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getOrderFinancialBreakdown);
router.get('/admin/finance/commission', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getCommissionReport);
router.get('/admin/finance/platform-fee', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getPlatformFeeReport);
router.get('/admin/finance/refunds', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getRefundsReport);
router.get('/admin/reports', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getReports);
router.get('/admin/financials/ledger', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getFinancialLedger);
router.get('/admin/payments', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getPayments);
router.get('/admin/withdrawals', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getWithdrawals);
router.get('/admin/payouts', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getWithdrawals);
router.post('/admin/withdrawals/:id/approve', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.rejectWithdrawal);
router.post('/admin/withdrawals/:id/complete', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.completeWithdrawal);
// Complaints & Disputes
router.get('/admin/complaints', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getComplaints);
router.get('/admin/complaints/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getComplaintDetails);
router.post('/admin/complaints/:id/reply', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.replyComplaint);
router.post('/admin/complaints/:id/note', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.addComplaintNote);
router.post('/admin/complaints/:id/resolve', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.resolveComplaint);
// Help & Support Desk
router.get('/admin/support/tickets', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getSupportTickets);
router.post('/admin/support/tickets/:id/reply', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.replySupportTicket);
router.post('/admin/support/tickets/:id/note', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.addSupportTicketNote);
router.put('/admin/support/tickets/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.updateSupportTicketStatus);
// Notifications & Auditing (Section 62)
router.get('/admin/notifications', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getNotifications);
router.put('/admin/notifications/:id/read', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.markNotificationRead);
router.put('/admin/notifications/read-all', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.markAllNotificationsRead);
router.get('/admin/audit-logs', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getAuditLogs);
// Settings & Profile
router.get('/admin/settings', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.getSettings);
router.put('/admin/settings', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.updateSettings);
router.put('/admin/profile', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), portalControllers_1.adminController.updateProfile);
// ==========================================
// 6. Generic User Notifications (Section 63)
// ==========================================
router.get('/notifications', auth_1.requireAuth, portalControllers_1.generalNotificationController.getUserNotifications);
router.post('/notifications/:id/read', auth_1.requireAuth, portalControllers_1.generalNotificationController.markUserNotificationRead);
router.put('/notifications/:id/read', auth_1.requireAuth, portalControllers_1.generalNotificationController.markUserNotificationRead);
exports.default = router;

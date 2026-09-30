import { Router } from 'express';
import { authController, jobController, payoutController } from './controllers';
import { webhookController } from './webhook';
import { 
  servicesController, 
  ordersController, 
  documentController,
  workersController,
  walletController,
  notificationsController
} from './extendedControllers';
import { workerController, adminController, generalNotificationController } from './portalControllers';
import { requireAuth, requireRole } from './middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. Authentication Routes (Section 11, 12)
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', requireAuth, authController.logout);
router.get('/auth/me', requireAuth, authController.me);
router.post('/auth/change-password', requireAuth, authController.changePassword);
router.post('/auth/forgot-password', authController.forgotPassword);

// ==========================================
// 2. Services Catalog (Section 13)
// ==========================================
router.get('/services', servicesController.getServices);
router.get('/services/:id', servicesController.getService);

// Optional auth helper: extracts user if token provided, but doesn't block guests
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : (req.query.token as string);
  if (!token) return next();
  try {
    const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';
    const decoded = require('jsonwebtoken').verify(token, secret);
    req.user = decoded;
  } catch {}
  next();
};

// Customer Worker Selection
router.get('/workers/available', optionalAuth, workersController.getAvailableWorkers);

// ==========================================
// 3. Customer Orders & Payments (Section 14 - 27)
// ==========================================
const ORDER_ROLES = ['CUSTOMER', 'ADMIN'];
router.post('/orders', requireAuth, requireRole(ORDER_ROLES), ordersController.createOrder);
router.get('/orders', requireAuth, requireRole(ORDER_ROLES), ordersController.getOrders);
router.get('/orders/:id', requireAuth, requireRole(ORDER_ROLES), ordersController.getOrder);
router.post('/orders/:id/timeslot/accept', requireAuth, requireRole(ORDER_ROLES), ordersController.acceptTimeSlot);
router.post('/orders/:id/timeslot/reschedule', requireAuth, requireRole(ORDER_ROLES), ordersController.rescheduleTimeSlot);
router.post('/orders/:id/pay', requireAuth, requireRole(ORDER_ROLES), ordersController.payOrder);
router.post('/orders/:id/review', requireAuth, requireRole(ORDER_ROLES), ordersController.submitReview);

router.post('/payments/webhook', webhookController.razorpayWebhook);

// Customer Document, Receipt, Complaint (Section 23, 24, 25, 27)
router.post('/orders/:id/documents', requireAuth, requireRole(ORDER_ROLES), upload.single('file'), ordersController.uploadOrderDocument);
router.get('/orders/:id/receipt', requireAuth, requireRole(ORDER_ROLES), ordersController.getOrderReceipt);
router.post('/orders/:id/receipt/download', requireAuth, requireRole(ORDER_ROLES), ordersController.downloadOrderReceipt);
router.post('/orders/:id/complaints', requireAuth, requireRole(ORDER_ROLES), ordersController.createOrderComplaint);

// Customer Wallet & Notifications
router.get('/customer/wallet', requireAuth, requireRole(ORDER_ROLES), walletController.getWallet);
router.get('/customer/notifications', requireAuth, requireRole(ORDER_ROLES), notificationsController.getNotifications);

// Document & Deliverables Access
router.post('/documents/upload', optionalAuth, upload.single('file'), documentController.upload);
router.get('/documents/:id', optionalAuth, documentController.getSignedUrl);
router.get('/documents/:id/download', optionalAuth, documentController.download);
router.get('/orders/:id/deliverables/:deliverableId/download', optionalAuth, ordersController.downloadDeliverable);

// ==========================================
// 4. Worker Routes (Section 28 - 42)
// ==========================================
const WORKER_ROLES = ['WORKER', 'ADMIN'];

// Standard Specification Worker Routes
router.get('/worker/orders/available', requireAuth, requireRole(WORKER_ROLES), workerController.getAvailableOrders);
router.post('/worker/orders/:id/accept', requireAuth, requireRole(WORKER_ROLES), workerController.acceptJob);
router.get('/worker/orders/active', requireAuth, requireRole(WORKER_ROLES), workerController.getActiveOrders);
router.get('/worker/orders/:id', requireAuth, requireRole(WORKER_ROLES), workerController.getOrderDetails);
router.get('/worker/orders/:id/documents', requireAuth, requireRole(WORKER_ROLES), workerController.getOrderDocuments);
router.post('/worker/orders/:id/start', requireAuth, requireRole(WORKER_ROLES), workerController.startWork);
router.post('/worker/orders/:id/complete', requireAuth, requireRole(WORKER_ROLES), workerController.completeOrder);
router.post('/worker/orders/:id/receipt', requireAuth, requireRole(WORKER_ROLES), upload.single('file'), workerController.uploadReceipt);
router.get('/worker/earnings/summary', requireAuth, requireRole(WORKER_ROLES), workerController.getEarningsSummary);
router.get('/worker/withdrawals/:id', requireAuth, requireRole(WORKER_ROLES), workerController.getWithdrawalDetails);

// Backwards-Compatible Worker Routes
router.get('/worker/requests', requireAuth, requireRole(WORKER_ROLES), workerController.getAvailableRequests);
router.post('/worker/requests/:id/accept', requireAuth, requireRole(WORKER_ROLES), workerController.acceptJob);
router.post('/worker/requests/:id/reject', requireAuth, requireRole(WORKER_ROLES), workerController.rejectJob);
router.post('/worker/jobs/:id/accept', requireAuth, requireRole(WORKER_ROLES), workerController.acceptJob);
router.get('/worker/jobs', requireAuth, requireRole(WORKER_ROLES), workerController.getMyJobs);
router.get('/worker/jobs/:id', requireAuth, requireRole(WORKER_ROLES), workerController.getJobDetails);
router.post('/worker/jobs/:id/start', requireAuth, requireRole(WORKER_ROLES), workerController.startWork);
router.post('/worker/jobs/:id/timeslot', requireAuth, requireRole(WORKER_ROLES), workerController.setTimeSlot);
router.post('/worker/jobs/:id/timeslot/accept-reschedule', requireAuth, requireRole(WORKER_ROLES), workerController.acceptReschedule);
router.post('/worker/jobs/:id/deliverables', requireAuth, requireRole(WORKER_ROLES), upload.single('file'), workerController.uploadDeliverables);
router.delete('/worker/jobs/:id/deliverables/:deliverableId', requireAuth, requireRole(WORKER_ROLES), workerController.deleteDeliverable);
router.post('/worker/jobs/:id/submit', requireAuth, requireRole(WORKER_ROLES), workerController.submitJob);
router.post('/worker/availability/toggle', requireAuth, requireRole(WORKER_ROLES), workerController.toggleAvailability);
router.post('/worker/activity', requireAuth, requireRole(WORKER_ROLES), workerController.recordActivity);
router.get('/worker/stats', requireAuth, requireRole(WORKER_ROLES), workerController.getStats);
router.get('/worker/earnings', requireAuth, requireRole(WORKER_ROLES), workerController.getEarningsHistory);
router.get('/worker/withdrawals', requireAuth, requireRole(WORKER_ROLES), workerController.getWithdrawals);
router.post('/worker/withdrawals', requireAuth, requireRole(WORKER_ROLES), workerController.requestWithdrawal);
router.get('/worker/notifications', requireAuth, requireRole(WORKER_ROLES), workerController.getNotifications);
router.put('/worker/notifications/:id/read', requireAuth, requireRole(WORKER_ROLES), workerController.markNotificationRead);
router.get('/worker/chat/:orderId', requireAuth, requireRole(WORKER_ROLES), workerController.getOrderChat);
router.post('/worker/chat/:orderId', requireAuth, requireRole(WORKER_ROLES), workerController.sendChatMessage);
router.get('/worker/support/tickets', requireAuth, requireRole(WORKER_ROLES), workerController.getSupportTickets);
router.post('/worker/support/tickets', requireAuth, requireRole(WORKER_ROLES), workerController.createSupportTicket);
router.get('/worker/profile', requireAuth, requireRole(WORKER_ROLES), workerController.getProfile);
router.put('/worker/profile', requireAuth, requireRole(WORKER_ROLES), workerController.updateProfile);
router.post('/worker/services/propose', requireAuth, requireRole(WORKER_ROLES), workerController.proposeService);
router.get('/worker/services/proposals', requireAuth, requireRole(WORKER_ROLES), workerController.getProposals);

// Legacy job/payout endpoints
router.post('/jobs/:id/accept', requireAuth, requireRole(['WORKER']), jobController.acceptJob);
router.post('/payouts/:jobId/release', requireAuth, requireRole(['ADMIN']), payoutController.releasePayout);

// ==========================================
// 5. Admin Routes (Section 43 - 62)
// Strict RBAC: ADMIN Only
// ==========================================
// Dashboard
router.get('/admin/dashboard', requireAuth, requireRole(['ADMIN']), adminController.getDashboardStats);

// Worker Management
router.get('/admin/workers', requireAuth, requireRole(['ADMIN']), adminController.getWorkers);
router.get('/admin/workers/top-earning', requireAuth, requireRole(['ADMIN']), adminController.getTopEarningWorkers);
router.get('/admin/workers/:id', requireAuth, requireRole(['ADMIN']), adminController.getWorkerDetails);
router.post('/admin/workers', requireAuth, requireRole(['ADMIN']), adminController.createWorker);
router.post('/admin/workers/:id/verify', requireAuth, requireRole(['ADMIN']), adminController.verifyWorker);
router.put('/admin/workers/:id/status', requireAuth, requireRole(['ADMIN']), adminController.setWorkerStatus);
router.delete('/admin/workers/:id', requireAuth, requireRole(['ADMIN']), adminController.deleteWorker);

// Customer Management
router.get('/admin/customers', requireAuth, requireRole(['ADMIN']), adminController.getCustomers);
router.get('/admin/customers/:id', requireAuth, requireRole(['ADMIN']), adminController.getCustomerDetails);
router.put('/admin/customers/:id/status', requireAuth, requireRole(['ADMIN']), adminController.setCustomerStatus);

// Order Management & Overrides (Section 43 - 49, 54)
router.get('/admin/orders', requireAuth, requireRole(['ADMIN']), adminController.getOrders);
router.get('/admin/orders/:id', requireAuth, requireRole(['ADMIN']), adminController.getOrderDetails);
router.post('/admin/orders/:id/assign', requireAuth, requireRole(['ADMIN']), adminController.assignWorker);
router.post('/admin/orders/:id/assign-worker', requireAuth, requireRole(['ADMIN']), adminController.assignWorker);
router.post('/admin/orders/:id/reassign-worker', requireAuth, requireRole(['ADMIN']), adminController.reassignWorker);
router.post('/admin/orders/:id/verify-receipt', requireAuth, requireRole(['ADMIN']), adminController.verifyReceipt);
router.put('/admin/orders/:id/status', requireAuth, requireRole(['ADMIN']), adminController.updateOrderStatus);
router.post('/admin/orders/:id/correction', requireAuth, requireRole(['ADMIN']), adminController.requestCorrection);
router.post('/admin/orders/:id/hold-earnings', requireAuth, requireRole(['ADMIN']), adminController.holdWorkerEarnings);
router.post('/admin/orders/:id/earning/hold', requireAuth, requireRole(['ADMIN']), adminController.holdWorkerEarnings);
router.post('/admin/orders/:id/release-earnings', requireAuth, requireRole(['ADMIN']), adminController.releaseWorkerEarnings);
router.post('/admin/orders/:id/earning/release', requireAuth, requireRole(['ADMIN']), adminController.releaseWorkerEarnings);
router.post('/admin/orders/:id/refund', requireAuth, requireRole(['ADMIN']), adminController.refundOrder);

// Service Management
router.get('/admin/services', requireAuth, requireRole(['ADMIN']), adminController.getServices);
router.post('/admin/services', requireAuth, requireRole(['ADMIN']), adminController.createService);
router.put('/admin/services/:id', requireAuth, requireRole(['ADMIN']), adminController.updateService);
router.delete('/admin/services/:id', requireAuth, requireRole(['ADMIN']), adminController.deleteService);
router.post('/admin/services/:id/toggle', requireAuth, requireRole(['ADMIN']), adminController.toggleServiceStatus);
router.get('/admin/proposals', requireAuth, requireRole(['ADMIN']), adminController.getServiceProposals);
router.post('/admin/proposals/:id/approve', requireAuth, requireRole(['ADMIN']), adminController.approveProposal);
router.post('/admin/proposals/:id/reject', requireAuth, requireRole(['ADMIN']), adminController.rejectProposal);

// Payments, Financials & Withdrawals (Section 50 - 61)
router.get('/admin/financials/summary', requireAuth, requireRole(['ADMIN']), adminController.getFinancialSummary);
router.get('/admin/finance/summary', requireAuth, requireRole(['ADMIN']), adminController.getFinancialSummary);
router.get('/admin/finance/top-workers', requireAuth, requireRole(['ADMIN']), adminController.getTopEarningWorkers);
router.get('/admin/finance/orders/:id', requireAuth, requireRole(['ADMIN']), adminController.getOrderFinancialBreakdown);
router.get('/admin/finance/commission', requireAuth, requireRole(['ADMIN']), adminController.getCommissionReport);
router.get('/admin/finance/platform-fee', requireAuth, requireRole(['ADMIN']), adminController.getPlatformFeeReport);
router.get('/admin/finance/refunds', requireAuth, requireRole(['ADMIN']), adminController.getRefundsReport);
router.get('/admin/reports', requireAuth, requireRole(['ADMIN']), adminController.getReports);
router.get('/admin/financials/ledger', requireAuth, requireRole(['ADMIN']), adminController.getFinancialLedger);
router.get('/admin/payments', requireAuth, requireRole(['ADMIN']), adminController.getPayments);
router.get('/admin/withdrawals', requireAuth, requireRole(['ADMIN']), adminController.getWithdrawals);
router.post('/admin/withdrawals/:id/approve', requireAuth, requireRole(['ADMIN']), adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', requireAuth, requireRole(['ADMIN']), adminController.rejectWithdrawal);
router.post('/admin/withdrawals/:id/complete', requireAuth, requireRole(['ADMIN']), adminController.completeWithdrawal);

// Complaints & Disputes
router.get('/admin/complaints', requireAuth, requireRole(['ADMIN']), adminController.getComplaints);
router.get('/admin/complaints/:id', requireAuth, requireRole(['ADMIN']), adminController.getComplaintDetails);
router.post('/admin/complaints/:id/reply', requireAuth, requireRole(['ADMIN']), adminController.replyComplaint);
router.post('/admin/complaints/:id/note', requireAuth, requireRole(['ADMIN']), adminController.addComplaintNote);
router.post('/admin/complaints/:id/resolve', requireAuth, requireRole(['ADMIN']), adminController.resolveComplaint);

// Help & Support Desk
router.get('/admin/support/tickets', requireAuth, requireRole(['ADMIN']), adminController.getSupportTickets);
router.post('/admin/support/tickets/:id/reply', requireAuth, requireRole(['ADMIN']), adminController.replySupportTicket);
router.post('/admin/support/tickets/:id/note', requireAuth, requireRole(['ADMIN']), adminController.addSupportTicketNote);
router.put('/admin/support/tickets/:id/status', requireAuth, requireRole(['ADMIN']), adminController.updateSupportTicketStatus);

// Notifications & Auditing (Section 62)
router.get('/admin/notifications', requireAuth, requireRole(['ADMIN']), adminController.getNotifications);
router.put('/admin/notifications/:id/read', requireAuth, requireRole(['ADMIN']), adminController.markNotificationRead);
router.put('/admin/notifications/read-all', requireAuth, requireRole(['ADMIN']), adminController.markAllNotificationsRead);
router.get('/admin/audit-logs', requireAuth, requireRole(['ADMIN']), adminController.getAuditLogs);

// Settings & Profile
router.get('/admin/settings', requireAuth, requireRole(['ADMIN']), adminController.getSettings);
router.put('/admin/settings', requireAuth, requireRole(['ADMIN']), adminController.updateSettings);
router.put('/admin/profile', requireAuth, requireRole(['ADMIN']), adminController.updateProfile);

// ==========================================
// 6. Generic User Notifications (Section 63)
// ==========================================
router.get('/notifications', requireAuth, generalNotificationController.getUserNotifications);
router.post('/notifications/:id/read', requireAuth, generalNotificationController.markUserNotificationRead);
router.put('/notifications/:id/read', requireAuth, generalNotificationController.markUserNotificationRead);

export default router;

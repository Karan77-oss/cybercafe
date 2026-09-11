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
import { requireAuth, requireRole } from './middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', requireAuth, authController.logout);
router.get('/auth/me', requireAuth, authController.me);
router.post('/auth/change-password', requireAuth, authController.changePassword);
router.post('/auth/forgot-password', authController.forgotPassword);

router.get('/services', servicesController.getServices);
router.get('/services/:id', servicesController.getService);

// Customer Worker Selection
router.get('/workers/available', requireAuth, workersController.getAvailableWorkers);

// Customer Orders & Interactions
router.post('/orders', requireAuth, requireRole(['CUSTOMER']), ordersController.createOrder);
router.get('/orders', requireAuth, ordersController.getOrders);
router.get('/orders/:id', requireAuth, ordersController.getOrder);
router.post('/orders/:id/timeslot/accept', requireAuth, requireRole(['CUSTOMER']), ordersController.acceptTimeSlot);
router.post('/orders/:id/timeslot/reschedule', requireAuth, requireRole(['CUSTOMER']), ordersController.rescheduleTimeSlot);
router.post('/orders/:id/review', requireAuth, requireRole(['CUSTOMER']), ordersController.submitReview);

// Customer Wallet & Notifications
router.get('/customer/wallet', requireAuth, requireRole(['CUSTOMER']), walletController.getWallet);
router.get('/customer/notifications', requireAuth, requireRole(['CUSTOMER']), notificationsController.getNotifications);

router.post('/documents/upload', requireAuth, upload.single('file'), documentController.upload);
router.get('/documents/:id', requireAuth, documentController.getSignedUrl);

import { workerController, adminController } from './portalControllers';

// Worker Routes
router.get('/worker/requests', requireAuth, requireRole(['WORKER']), workerController.getAvailableRequests);
router.post('/worker/requests/:id/accept', requireAuth, requireRole(['WORKER']), workerController.acceptJob);
router.post('/worker/requests/:id/reject', requireAuth, requireRole(['WORKER']), workerController.rejectJob);
router.post('/worker/jobs/:id/accept', requireAuth, requireRole(['WORKER']), workerController.acceptJob);
router.get('/worker/jobs', requireAuth, requireRole(['WORKER']), workerController.getMyJobs);
router.get('/worker/jobs/:id', requireAuth, requireRole(['WORKER']), workerController.getJobDetails);
router.post('/worker/jobs/:id/start', requireAuth, requireRole(['WORKER']), workerController.startWork);
router.post('/worker/jobs/:id/timeslot', requireAuth, requireRole(['WORKER']), workerController.setTimeSlot);
router.post('/worker/jobs/:id/deliverables', requireAuth, requireRole(['WORKER']), workerController.uploadDeliverables);
router.post('/worker/jobs/:id/submit', requireAuth, requireRole(['WORKER']), workerController.submitJob);
router.post('/worker/availability/toggle', requireAuth, requireRole(['WORKER']), workerController.toggleAvailability);
router.post('/worker/activity', requireAuth, requireRole(['WORKER']), workerController.recordActivity);
router.get('/worker/stats', requireAuth, requireRole(['WORKER']), workerController.getStats);
router.get('/worker/earnings', requireAuth, requireRole(['WORKER']), workerController.getEarnings);
router.get('/worker/withdrawals', requireAuth, requireRole(['WORKER']), workerController.getWithdrawals);
router.post('/worker/withdrawals', requireAuth, requireRole(['WORKER']), workerController.requestWithdrawal);
router.get('/worker/notifications', requireAuth, requireRole(['WORKER']), workerController.getNotifications);
router.put('/worker/notifications/:id/read', requireAuth, requireRole(['WORKER']), workerController.markNotificationRead);
router.get('/worker/chat/:orderId', requireAuth, requireRole(['WORKER']), workerController.getOrderChat);
router.post('/worker/chat/:orderId', requireAuth, requireRole(['WORKER']), workerController.sendChatMessage);
router.get('/worker/support/tickets', requireAuth, requireRole(['WORKER']), workerController.getSupportTickets);
router.post('/worker/support/tickets', requireAuth, requireRole(['WORKER']), workerController.createSupportTicket);
router.get('/worker/profile', requireAuth, requireRole(['WORKER']), workerController.getProfile);
router.put('/worker/profile', requireAuth, requireRole(['WORKER']), workerController.updateProfile);
router.post('/worker/services/propose', requireAuth, requireRole(['WORKER']), workerController.proposeService);
router.get('/worker/services/proposals', requireAuth, requireRole(['WORKER']), workerController.getProposals);

// Admin Routes (Strict RBAC - ADMIN Only)
// 1. Dashboard
router.get('/admin/dashboard', requireAuth, requireRole(['ADMIN']), adminController.getDashboardStats);

// 2. Worker Management
router.get('/admin/workers', requireAuth, requireRole(['ADMIN']), adminController.getWorkers);
router.get('/admin/workers/top-earning', requireAuth, requireRole(['ADMIN']), adminController.getTopEarningWorkers);
router.get('/admin/workers/:id', requireAuth, requireRole(['ADMIN']), adminController.getWorkerDetails);
router.post('/admin/workers', requireAuth, requireRole(['ADMIN']), adminController.createWorker);
router.post('/admin/workers/:id/verify', requireAuth, requireRole(['ADMIN']), adminController.verifyWorker);
router.put('/admin/workers/:id/status', requireAuth, requireRole(['ADMIN']), adminController.setWorkerStatus);

// 3. Customer Management
router.get('/admin/customers', requireAuth, requireRole(['ADMIN']), adminController.getCustomers);
router.get('/admin/customers/:id', requireAuth, requireRole(['ADMIN']), adminController.getCustomerDetails);
router.put('/admin/customers/:id/status', requireAuth, requireRole(['ADMIN']), adminController.setCustomerStatus);

// 4. Order Management & Overrides
router.get('/admin/orders', requireAuth, requireRole(['ADMIN']), adminController.getOrders);
router.get('/admin/orders/:id', requireAuth, requireRole(['ADMIN']), adminController.getOrderDetails);
router.post('/admin/orders/:id/assign', requireAuth, requireRole(['ADMIN']), adminController.assignWorker);
router.put('/admin/orders/:id/status', requireAuth, requireRole(['ADMIN']), adminController.updateOrderStatus);
router.post('/admin/orders/:id/correction', requireAuth, requireRole(['ADMIN']), adminController.requestCorrection);
router.post('/admin/orders/:id/hold-earnings', requireAuth, requireRole(['ADMIN']), adminController.holdWorkerEarnings);
router.post('/admin/orders/:id/release-earnings', requireAuth, requireRole(['ADMIN']), adminController.releaseWorkerEarnings);
router.post('/admin/orders/:id/refund', requireAuth, requireRole(['ADMIN']), adminController.refundOrder);

// 5. Service Management
router.get('/admin/services', requireAuth, requireRole(['ADMIN']), adminController.getServices);
router.post('/admin/services', requireAuth, requireRole(['ADMIN']), adminController.createService);
router.put('/admin/services/:id', requireAuth, requireRole(['ADMIN']), adminController.updateService);
router.delete('/admin/services/:id', requireAuth, requireRole(['ADMIN']), adminController.deleteService);
router.post('/admin/services/:id/toggle', requireAuth, requireRole(['ADMIN']), adminController.toggleServiceStatus);
router.get('/admin/proposals', requireAuth, requireRole(['ADMIN']), adminController.getServiceProposals);
router.post('/admin/proposals/:id/approve', requireAuth, requireRole(['ADMIN']), adminController.approveProposal);
router.post('/admin/proposals/:id/reject', requireAuth, requireRole(['ADMIN']), adminController.rejectProposal);

// 6. Payments, Financials & Withdrawals
router.get('/admin/financials/summary', requireAuth, requireRole(['ADMIN']), adminController.getFinancialSummary);
router.get('/admin/payments', requireAuth, requireRole(['ADMIN']), adminController.getPayments);
router.get('/admin/withdrawals', requireAuth, requireRole(['ADMIN']), adminController.getWithdrawals);
router.post('/admin/withdrawals/:id/approve', requireAuth, requireRole(['ADMIN']), adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', requireAuth, requireRole(['ADMIN']), adminController.rejectWithdrawal);

// 7. Complaints & Disputes
router.get('/admin/complaints', requireAuth, requireRole(['ADMIN']), adminController.getComplaints);
router.get('/admin/complaints/:id', requireAuth, requireRole(['ADMIN']), adminController.getComplaintDetails);
router.post('/admin/complaints/:id/reply', requireAuth, requireRole(['ADMIN']), adminController.replyComplaint);
router.post('/admin/complaints/:id/note', requireAuth, requireRole(['ADMIN']), adminController.addComplaintNote);
router.post('/admin/complaints/:id/resolve', requireAuth, requireRole(['ADMIN']), adminController.resolveComplaint);

// 8. Help & Support Desk
router.get('/admin/support/tickets', requireAuth, requireRole(['ADMIN']), adminController.getSupportTickets);
router.post('/admin/support/tickets/:id/reply', requireAuth, requireRole(['ADMIN']), adminController.replySupportTicket);
router.post('/admin/support/tickets/:id/note', requireAuth, requireRole(['ADMIN']), adminController.addSupportTicketNote);
router.put('/admin/support/tickets/:id/status', requireAuth, requireRole(['ADMIN']), adminController.updateSupportTicketStatus);

// 9. Notifications
router.get('/admin/notifications', requireAuth, requireRole(['ADMIN']), adminController.getNotifications);
router.put('/admin/notifications/:id/read', requireAuth, requireRole(['ADMIN']), adminController.markNotificationRead);
router.put('/admin/notifications/read-all', requireAuth, requireRole(['ADMIN']), adminController.markAllNotificationsRead);

// 10. Reports & Analytics
router.get('/admin/reports', requireAuth, requireRole(['ADMIN']), adminController.getReports);

// 11. Settings, Profile & Audit Logs
router.get('/admin/settings', requireAuth, requireRole(['ADMIN']), adminController.getSettings);
router.put('/admin/settings', requireAuth, requireRole(['ADMIN']), adminController.updateSettings);
router.put('/admin/profile', requireAuth, requireRole(['ADMIN']), adminController.updateProfile);
router.get('/admin/audit-logs', requireAuth, requireRole(['ADMIN']), adminController.getAuditLogs);

router.post('/jobs/:id/accept', requireAuth, requireRole(['WORKER']), jobController.acceptJob);
router.post('/payouts/:jobId/release', requireAuth, requireRole(['ADMIN']), payoutController.releasePayout);

router.post('/payments/webhook', webhookController.razorpayWebhook);

export default router;

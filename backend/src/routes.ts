import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { runAllMaintenanceTimers } from './timers';
import { addClient, removeClient, SSEClient } from './utils/realtimeEvents';

// ==========================================
// CONTROLLER IMPORTS
// ==========================================
import {
  authController,
  jobController,
  payoutController
} from './controllers';

import { webhookController } from './webhook';

import {
  servicesController,
  ordersController,
  documentController,
  workersController,
  walletController,
  notificationsController,
  systemController,
  welfareController
} from './extendedControllers';

import {
  workerController,
  adminController,
  generalNotificationController
} from './portalControllers';

import { requireAuth, requireRole } from './middleware/auth';

const router = Router();

// ==========================================
// CONFIGURATION & UPLOAD MIDDLEWARE
// ==========================================
const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';

// Safe memory storage with explicit limits to prevent server OOM crashes
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size (Zero-Trust Document Vault requirement)
    files: 5                    // Max 5 files per batch
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_MIME_TYPE: Only PDF, JPEG, PNG, and WebP files are permitted'));
    }
  }
});

// Role Groups for RBAC
const ORDER_ROLES = ['CUSTOMER', 'ADMIN'] as const;
const WORKER_ROLES = ['WORKER', 'ADMIN'] as const;

/**
 * Optional Authentication Middleware
 * Populates req.user if a valid token is provided, without blocking unauthenticated guests.
 */
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : (typeof req.query.token === 'string' ? req.query.token : undefined);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
  } catch {
    // Token is invalid/expired; continue gracefully as unauthenticated guest
  }
  next();
};

// ==========================================
// 1. AUTHENTICATION & SESSION ROUTES
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/worker/login', authController.login);
router.post('/auth/logout', requireAuth, authController.logout);
router.get('/auth/me', requireAuth, authController.me);
router.post('/auth/change-password', requireAuth, authController.changePassword);
router.post('/auth/forgot-password', authController.forgotPassword);

// ==========================================
// 2. PUBLIC CATALOG & WORKER DISCOVERY
// ==========================================
router.get('/services', servicesController.getServices);
router.get('/services/:id', servicesController.getService);
router.get('/workers/available', optionalAuth, workersController.getAvailableWorkers);

// ==========================================
// 3. CUSTOMER ORDERS, PAYMENTS & VAULT
// ==========================================
// Static & Collections (Must be placed before dynamic /:id paths)
router.get('/orders', requireAuth, requireRole(ORDER_ROLES), ordersController.getOrders);
router.get('/orders/my-orders', requireAuth, requireRole(ORDER_ROLES), ordersController.getOrders);
router.post('/orders', requireAuth, requireRole(ORDER_ROLES), upload.any(), ordersController.createOrder);

// Payment Gateways & Webhooks
router.post('/orders/create-payment', requireAuth, requireRole(ORDER_ROLES), ordersController.createRazorpayPayment);
router.post('/orders/verify-payment', requireAuth, requireRole(ORDER_ROLES), ordersController.verifyRazorpayPayment);
router.post('/payments/webhook', webhookController.razorpayWebhook);

// Customer Personal Vault
router.get('/customer/vault/documents', requireAuth, requireRole(ORDER_ROLES), documentController.getVaultDocuments);
router.post('/customer/vault/upload', requireAuth, requireRole(ORDER_ROLES), upload.single('file'), documentController.uploadVaultDocument);
router.get('/customer/wallet', requireAuth, requireRole(ORDER_ROLES), walletController.getWallet);
router.get('/customer/notifications', requireAuth, requireRole(ORDER_ROLES), notificationsController.getNotifications);

// Dynamic Single Order Routes
router.get('/orders/:id', requireAuth, requireRole(ORDER_ROLES), ordersController.getOrder);
router.post('/orders/:id/pay', requireAuth, requireRole(ORDER_ROLES), ordersController.payOrder);
router.post('/orders/:id/create-payment', requireAuth, requireRole(ORDER_ROLES), ordersController.createRazorpayPayment);
router.post('/orders/:id/verify-payment', requireAuth, requireRole(ORDER_ROLES), ordersController.verifyRazorpayPayment);

// Order Scheduling & Rescheduling
router.post('/orders/:id/timeslot/accept', requireAuth, requireRole(ORDER_ROLES), ordersController.acceptTimeSlot);
router.post('/orders/:id/timeslot/reschedule', requireAuth, requireRole(ORDER_ROLES), ordersController.rescheduleTimeSlot);
router.post('/orders/:id/request-reschedule', requireAuth, requireRole(['CUSTOMER', 'WORKER', 'ADMIN']), ordersController.requestReschedule);
router.post('/orders/:id/respond-reschedule', requireAuth, requireRole(['CUSTOMER', 'WORKER', 'ADMIN']), ordersController.respondReschedule);

// Order Documents, Receipts & Complaints
router.post('/orders/:id/documents', requireAuth, requireRole(ORDER_ROLES), upload.single('file'), ordersController.uploadOrderDocument);
router.get('/orders/:id/receipt', requireAuth, requireRole(ORDER_ROLES), ordersController.getOrderReceipt);
router.post('/orders/:id/receipt/download', requireAuth, requireRole(ORDER_ROLES), ordersController.downloadOrderReceipt);
router.post('/orders/:id/complaints', requireAuth, requireRole(ORDER_ROLES), ordersController.createOrderComplaint);
router.post('/orders/:id/review', requireAuth, requireRole(ORDER_ROLES), ordersController.submitReview);
router.post('/orders/:id/feedback', requireAuth, requireRole(ORDER_ROLES), ordersController.submitReview);
router.get('/orders/:id/chat', requireAuth, requireRole(ORDER_ROLES), workerController.getOrderChat);
router.post('/orders/:id/chat', requireAuth, requireRole(ORDER_ROLES), upload.single('file'), workerController.sendChatMessage);
router.post('/worker/orders/:id/request-clarification', requireAuth, requireRole(WORKER_ROLES), workerController.requestClarification);

// ==========================================
// 4. STORAGE & DELIVERABLES ACCESS
// ==========================================
router.post('/documents/upload', optionalAuth, upload.single('file'), documentController.upload);
router.post('/documents/presign-upload', optionalAuth, documentController.presignUpload);
router.post('/documents/confirm-upload', optionalAuth, documentController.confirmUpload);
router.get('/documents/:id', optionalAuth, documentController.getSignedUrl);
router.get('/documents/:id/signed-url', optionalAuth, documentController.getSignedUrl);
router.get('/documents/:id/download', optionalAuth, documentController.download);
// Clean wildcard route for file streaming
router.get('/documents/stream/*key', optionalAuth, documentController.streamFile);
router.get('/orders/:id/deliverables/:deliverableId/download', optionalAuth, ordersController.downloadDeliverable);

// ==========================================
// 5. OPERATOR / WORKER ROUTES
// ==========================================
// Order Queues & Active Work
router.get('/worker/orders/available', requireAuth, requireRole(WORKER_ROLES), workerController.getAvailableOrders);
router.get('/worker/orders/active', requireAuth, requireRole(WORKER_ROLES), workerController.getActiveOrders);
router.post('/worker/orders/:id/accept', requireAuth, requireRole(WORKER_ROLES), workerController.acceptJob);
router.post('/worker/orders/:id/accept-and-schedule', requireAuth, requireRole(WORKER_ROLES), workerController.acceptAndSchedule);
router.get('/worker/orders/:id', requireAuth, requireRole(WORKER_ROLES), workerController.getOrderDetails);
router.get('/worker/orders/:id/documents', requireAuth, requireRole(WORKER_ROLES), workerController.getOrderDocuments);
router.post('/worker/orders/:id/start', requireAuth, requireRole(WORKER_ROLES), workerController.startWork);
router.post('/worker/orders/:id/complete', requireAuth, requireRole(WORKER_ROLES), workerController.completeOrder);
router.post('/worker/orders/:id/receipt', requireAuth, requireRole(WORKER_ROLES), upload.single('file'), workerController.uploadReceipt);

// Financials, Wallet & Withdrawals
router.get('/worker/earnings/summary', requireAuth, requireRole(WORKER_ROLES), workerController.getEarningsSummary);
router.get('/worker/earnings', requireAuth, requireRole(WORKER_ROLES), workerController.getEarnings);
router.get('/worker/earnings/history', requireAuth, requireRole(WORKER_ROLES), workerController.getEarningsHistory);
router.post('/worker/wallet/sync', requireAuth, requireRole(WORKER_ROLES), workerController.syncWalletBalances);
router.post('/worker/earnings/sync', requireAuth, requireRole(WORKER_ROLES), workerController.syncWalletBalances);
router.get('/worker/stats', requireAuth, requireRole(WORKER_ROLES), workerController.getStats);
router.get('/worker/withdrawals', requireAuth, requireRole(WORKER_ROLES), workerController.getWithdrawals);
router.post('/worker/withdrawals', requireAuth, requireRole(WORKER_ROLES), workerController.requestWithdrawal);
router.get('/worker/withdrawals/:id', requireAuth, requireRole(WORKER_ROLES), workerController.getWithdrawalDetails);

// Availability, Profile & Services
router.post('/worker/availability/toggle', requireAuth, requireRole(WORKER_ROLES), workerController.toggleAvailability);
router.post('/worker/activity', requireAuth, requireRole(WORKER_ROLES), workerController.recordActivity);
router.post('/worker/heartbeat', requireAuth, requireRole(WORKER_ROLES), workerController.heartbeat);
router.get('/worker/profile', requireAuth, requireRole(WORKER_ROLES), workerController.getProfile);
router.put('/worker/profile', requireAuth, requireRole(WORKER_ROLES), workerController.updateProfile);
router.post('/worker/services/propose', requireAuth, requireRole(WORKER_ROLES), workerController.proposeService);
router.post('/worker/proposals', requireAuth, requireRole(WORKER_ROLES), workerController.proposeService);
router.get('/worker/services/proposals', requireAuth, requireRole(WORKER_ROLES), workerController.getProposals);
router.get('/worker/proposals', requireAuth, requireRole(WORKER_ROLES), workerController.getProposals);

// Operator Communications & Tickets
router.get('/worker/notifications', requireAuth, requireRole(WORKER_ROLES), workerController.getNotifications);
router.put('/worker/notifications/:id/read', requireAuth, requireRole(WORKER_ROLES), workerController.markNotificationRead);
router.get('/worker/chat/:orderId', requireAuth, requireRole(WORKER_ROLES), workerController.getOrderChat);
router.post('/worker/chat/:orderId', requireAuth, requireRole(WORKER_ROLES), workerController.sendChatMessage);
router.get('/worker/support/tickets', requireAuth, requireRole(WORKER_ROLES), workerController.getSupportTickets);
router.post('/worker/support/tickets', requireAuth, requireRole(WORKER_ROLES), workerController.createSupportTicket);
router.post('/worker/support/tickets/:id/reply', requireAuth, requireRole(WORKER_ROLES), workerController.replySupportTicket);

// Backward Compatibility Aliases for Operator Apps
router.get('/worker/requests', requireAuth, requireRole(WORKER_ROLES), workerController.getAvailableRequests);
router.post('/worker/requests/:id/accept', requireAuth, requireRole(WORKER_ROLES), workerController.acceptJob);
router.post('/worker/requests/:id/reject', requireAuth, requireRole(WORKER_ROLES), workerController.rejectJob);
router.get('/worker/jobs', requireAuth, requireRole(WORKER_ROLES), workerController.getMyJobs);
router.get('/worker/jobs/:id', requireAuth, requireRole(WORKER_ROLES), workerController.getJobDetails);
router.post('/worker/jobs/:id/accept', requireAuth, requireRole(WORKER_ROLES), workerController.acceptJob);
router.post('/worker/jobs/:id/accept-and-schedule', requireAuth, requireRole(WORKER_ROLES), workerController.acceptAndSchedule);
router.post('/worker/jobs/:id/start', requireAuth, requireRole(WORKER_ROLES), workerController.startWork);
router.post('/worker/jobs/:id/timeslot', requireAuth, requireRole(WORKER_ROLES), workerController.setTimeSlot);
router.post('/worker/jobs/:id/timeslot/accept-reschedule', requireAuth, requireRole(WORKER_ROLES), workerController.acceptReschedule);
router.post('/worker/jobs/:id/deliverables', requireAuth, requireRole(WORKER_ROLES), upload.single('file'), workerController.uploadDeliverables);
router.delete('/worker/jobs/:id/deliverables/:deliverableId', requireAuth, requireRole(WORKER_ROLES), workerController.deleteDeliverable);
router.post('/worker/jobs/:id/submit', requireAuth, requireRole(WORKER_ROLES), workerController.submitJob);

// Legacy Root Job Endpoints
router.get('/jobs/available', requireAuth, requireRole(WORKER_ROLES), workerController.getAvailableOrders);
router.get('/jobs', requireAuth, requireRole(WORKER_ROLES), workerController.getMyJobs);
router.get('/jobs/:id', requireAuth, requireRole(WORKER_ROLES), workerController.getJobDetails);
router.post('/jobs/:id/start', requireAuth, requireRole(WORKER_ROLES), workerController.startWork);
router.post('/jobs/:id/submit', requireAuth, requireRole(WORKER_ROLES), workerController.submitJob);
router.post('/jobs/:id/accept', requireAuth, requireRole(WORKER_ROLES), jobController.acceptJob);

// ==========================================
// 6. ADMIN MANAGEMENT & CONTROLS (RBAC: ADMIN)
// ==========================================
// Dashboard
router.get('/admin/dashboard', requireAuth, requireRole(['ADMIN']), adminController.getDashboardStats);

// Operator / Worker Administration
router.get('/admin/workers', requireAuth, requireRole(['ADMIN']), adminController.getWorkers);
router.get('/admin/workers/top-earning', requireAuth, requireRole(['ADMIN']), adminController.getTopEarningWorkers);
router.get('/admin/workers/:id', requireAuth, requireRole(['ADMIN']), adminController.getWorkerDetails);
router.post('/admin/workers', requireAuth, requireRole(['ADMIN']), upload.any(), adminController.createWorker);
router.post('/admin/workers/:id/reset-password', requireAuth, requireRole(['ADMIN']), adminController.resetWorkerPassword);
router.post('/admin/workers/:id/verify', requireAuth, requireRole(['ADMIN']), adminController.verifyWorker);
router.put('/admin/workers/:id/status', requireAuth, requireRole(['ADMIN']), adminController.setWorkerStatus);
router.delete('/admin/workers/:id', requireAuth, requireRole(['ADMIN']), adminController.deleteWorker);

// Customer Administration
router.get('/admin/customers', requireAuth, requireRole(['ADMIN']), adminController.getCustomers);
router.get('/admin/users', requireAuth, requireRole(['ADMIN']), (req, res) => {
  if (String(req.query.role || '').toUpperCase() === 'WORKER') {
    return adminController.getWorkers(req, res);
  }
  return adminController.getCustomers(req, res);
});
router.get('/admin/customers/:id', requireAuth, requireRole(['ADMIN']), adminController.getCustomerDetails);
router.put('/admin/customers/:id/status', requireAuth, requireRole(['ADMIN']), adminController.setCustomerStatus);

// Order Overrides & Supervision
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

// Service Management & Catalog Proposals
router.get('/admin/services', requireAuth, requireRole(['ADMIN']), adminController.getServices);
router.post('/admin/services', requireAuth, requireRole(['ADMIN']), adminController.createService);
router.put('/admin/services/:id', requireAuth, requireRole(['ADMIN']), adminController.updateService);
router.delete('/admin/services/:id', requireAuth, requireRole(['ADMIN']), adminController.deleteService);
router.post('/admin/services/:id/toggle', requireAuth, requireRole(['ADMIN']), adminController.toggleServiceStatus);
router.get('/admin/proposals', requireAuth, requireRole(['ADMIN']), adminController.getServiceProposals);
router.post('/admin/proposals/:id/approve', requireAuth, requireRole(['ADMIN']), adminController.approveProposal);
router.post('/admin/proposals/:id/reject', requireAuth, requireRole(['ADMIN']), adminController.rejectProposal);

// Finance, Ledgers & Payout Execution
router.get('/admin/financials/summary', requireAuth, requireRole(['ADMIN']), adminController.getFinancialSummary);
router.get('/admin/finance/summary', requireAuth, requireRole(['ADMIN']), adminController.getFinancialSummary);
router.get('/admin/finance/top-workers', requireAuth, requireRole(['ADMIN']), adminController.getTopEarningWorkers);
router.get('/admin/finance/commission', requireAuth, requireRole(['ADMIN']), adminController.getCommissionReport);
router.get('/admin/finance/platform-fee', requireAuth, requireRole(['ADMIN']), adminController.getPlatformFeeReport);
router.get('/admin/finance/refunds', requireAuth, requireRole(['ADMIN']), adminController.getRefundsReport);
router.get('/admin/finance/orders/:id', requireAuth, requireRole(['ADMIN']), adminController.getOrderFinancialBreakdown);
router.get('/admin/reports', requireAuth, requireRole(['ADMIN']), adminController.getReports);
router.get('/admin/financials/ledger', requireAuth, requireRole(['ADMIN']), adminController.getFinancialLedger);
router.get('/admin/payments', requireAuth, requireRole(['ADMIN']), adminController.getPayments);
router.get('/admin/withdrawals', requireAuth, requireRole(['ADMIN']), adminController.getWithdrawals);
router.get('/admin/payouts', requireAuth, requireRole(['ADMIN']), adminController.getWithdrawals);
router.post('/admin/withdrawals/:id/approve', requireAuth, requireRole(['ADMIN']), adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', requireAuth, requireRole(['ADMIN']), adminController.rejectWithdrawal);
router.post('/admin/withdrawals/:id/complete', requireAuth, requireRole(['ADMIN']), adminController.completeWithdrawal);
router.post('/payouts/:jobId/release', requireAuth, requireRole(['ADMIN']), payoutController.releasePayout);

// Disputes & Complaint Desk
router.get('/admin/complaints', requireAuth, requireRole(['ADMIN']), adminController.getComplaints);
router.get('/admin/complaints/:id', requireAuth, requireRole(['ADMIN']), adminController.getComplaintDetails);
router.post('/admin/complaints/:id/reply', requireAuth, requireRole(['ADMIN']), adminController.replyComplaint);
router.post('/admin/complaints/:id/note', requireAuth, requireRole(['ADMIN']), adminController.addComplaintNote);
router.post('/admin/complaints/:id/resolve', requireAuth, requireRole(['ADMIN']), adminController.resolveComplaint);

// Admin Support Desk
router.get('/admin/support/tickets', requireAuth, requireRole(['ADMIN']), adminController.getSupportTickets);
router.post('/admin/support/tickets/:id/reply', requireAuth, requireRole(['ADMIN']), adminController.replySupportTicket);
router.post('/admin/support/tickets/:id/note', requireAuth, requireRole(['ADMIN']), adminController.addSupportTicketNote);
router.put('/admin/support/tickets/:id/status', requireAuth, requireRole(['ADMIN']), adminController.updateSupportTicketStatus);

// Admin Notifications, Logs & Platform Settings
router.get('/admin/notifications', requireAuth, requireRole(['ADMIN']), adminController.getNotifications);
router.put('/admin/notifications/:id/read', requireAuth, requireRole(['ADMIN']), adminController.markNotificationRead);
router.put('/admin/notifications/read-all', requireAuth, requireRole(['ADMIN']), adminController.markAllNotificationsRead);
router.get('/admin/audit-logs', requireAuth, requireRole(['ADMIN']), adminController.getAuditLogs);
router.get('/admin/settings', requireAuth, requireRole(['ADMIN']), adminController.getSettings);
router.put('/admin/settings', requireAuth, requireRole(['ADMIN']), adminController.updateSettings);
router.put('/admin/profile', requireAuth, requireRole(['ADMIN']), adminController.updateProfile);
router.post('/admin/maintenance/purge-documents', requireAuth, requireRole(['ADMIN']), adminController.purgeExpiredDocuments);

// ==========================================
// 7. GENERIC USER NOTIFICATIONS
// ==========================================
router.get('/notifications', requireAuth, generalNotificationController.getUserNotifications);
router.post('/notifications/:id/read', requireAuth, generalNotificationController.markUserNotificationRead);
router.put('/notifications/:id/read', requireAuth, generalNotificationController.markUserNotificationRead);

// ==========================================
// 8. SYSTEM CONFIGURATION
// ==========================================
router.get('/system/app-version', systemController.getAppVersion);

// ==========================================
// 9. WELFARE & DISPUTE PIPELINE
// ==========================================
// Customer Welfare
router.post('/welfare/tickets', requireAuth, welfareController.createTicket);
router.get('/welfare/my-tickets', requireAuth, welfareController.getMyTickets);
router.get('/welfare/tickets/:id', requireAuth, welfareController.getTicketDetails);

// Operator Welfare
router.get('/welfare/worker/tickets', requireAuth, requireRole(WORKER_ROLES), welfareController.getWorkerTickets);
router.post('/welfare/tickets/:id/notes', requireAuth, requireRole(WORKER_ROLES), welfareController.addWorkerNote);
router.post('/welfare/tickets/:id/escalate', requireAuth, requireRole(WORKER_ROLES), welfareController.escalateTicket);

// Admin Welfare Resolution
router.get('/admin/welfare/tickets', requireAuth, requireRole(['ADMIN']), welfareController.getAdminTickets);
router.post('/admin/welfare/tickets/:id/review', requireAuth, requireRole(['ADMIN']), welfareController.reviewAdminTicket);
router.post('/admin/welfare/tickets/:id/refund', requireAuth, requireRole(['ADMIN']), upload.single('receipt'), welfareController.processAdminRefund);


// ==========================================
// 10. REAL-TIME SERVER-SENT EVENTS (SSE) BUS
// ==========================================
router.get('/events/stream', optionalAuth, (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = 'sse_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const user = (req as any).user;
  const client: SSEClient = {
    id: clientId,
    userId: user?.id || 'guest_' + clientId,
    role: (user?.role || 'GUEST').toUpperCase(),
    res
  };

  addClient(client);

  // Initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat ping every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      removeClient(clientId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(clientId);
  });
});

// ==========================================
// 11. INTERNAL CRON MAINTENANCE ENDPOINT
// ==========================================
/**
 * POST /api/internal/cron/timers
 *
 * Invokes runAllMaintenanceTimers() idempotently.
 * Protected by a shared secret so only Vercel Cron (or trusted schedulers) can call it.
 * Configure via vercel.json:  { "crons": [{ "path": "/api/internal/cron/timers", "schedule": "* * * * *" }] }
 *
 * Authorization: Bearer <CRON_SECRET env var>
 */
router.post('/internal/cron/timers', async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'CRON_SECRET environment variable is not set.' } });
  }

  const authHeader = req.headers.authorization || '';
  const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (providedSecret !== cronSecret) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret.' } });
  }

  try {
    const summary = await runAllMaintenanceTimers();
    console.log('[Cron] Maintenance timer run completed:', summary);
    return res.status(200).json({ success: true, summary, ranAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('[Cron] runAllMaintenanceTimers failed:', err.message || err);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: err.message || 'Timer execution failed.' } });
  }
});
export default router;

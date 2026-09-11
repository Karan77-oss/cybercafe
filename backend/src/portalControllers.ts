import { Request, Response } from 'express';
import { localStore } from './catalogData';
import { prisma, checkDb } from './db';

export const workerController = {
  getAvailableRequests: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const result = localStore.getAvailableOrdersForWorker(workerId);
      return res.json({
        success: true,
        isOnline: result.isOnline,
        orders: result.orders
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  acceptJob: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.id as string;
      const order = localStore.acceptOrder(orderId, workerId);
      return res.json({ success: true, order, message: 'Order accepted successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  rejectJob: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.id as string;
      const { reason, note } = req.body;
      if (!reason) {
        return res.status(400).json({ success: false, error: 'Rejection reason is mandatory' });
      }
      const result = localStore.rejectOrder(orderId, workerId, reason, note);
      return res.json({ success: true, message: result.message });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  getMyJobs: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const statusFilter = req.query.status as string;
      const jobs = localStore.getWorkerJobs(workerId, statusFilter);
      return res.json({ success: true, jobs });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getJobDetails: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.id as string;
      const job = localStore.getOrderForWorker(orderId, workerId);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Order not found or unauthorized' });
      }
      return res.json({ success: true, job });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  startWork: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.id as string;
      const order = localStore.startWork(orderId, workerId);
      return res.json({ success: true, order });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  setTimeSlot: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.id as string;
      const { date, startTime, endTime } = req.body;
      if (!startTime || !endTime) {
        return res.status(400).json({ success: false, error: 'Start time and end time are required' });
      }
      const order = localStore.setOrderTimeSlot(orderId, workerId, { date, startTime, endTime });
      return res.json({ success: true, order });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  uploadDeliverables: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.id as string;
      const { deliverables } = req.body;
      const order = localStore.uploadDeliverables(orderId, workerId, deliverables);
      return res.json({ success: true, deliverables: order.deliverables });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  submitJob: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.id as string;
      const { note } = req.body;
      const order = localStore.finishWork(orderId, workerId, note);
      return res.json({ success: true, order, message: 'Work completed and submitted successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  toggleAvailability: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const { isOnline } = req.body;
      const result = localStore.toggleWorkerAvailability(workerId, isOnline);
      return res.json({ success: true, isOnline: result.isOnline, worker: result.worker });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  recordActivity: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const result = localStore.recordWorkerActivity(workerId);
      return res.json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const summary = localStore.getWorkerEarningsSummary(workerId);
      return res.json({ success: true, stats: summary });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getEarnings: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const summary = localStore.getWorkerEarningsSummary(workerId);
      return res.json({ success: true, earnings: summary });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  requestWithdrawal: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const { amountPaise, method, payoutDetails } = req.body;
      if (!amountPaise || amountPaise < 10000) {
        return res.status(400).json({ success: false, error: 'Minimum withdrawal amount is ₹100.00' });
      }
      const withdrawal = localStore.requestWithdrawal(workerId, Number(amountPaise), method || 'BANK', payoutDetails);
      return res.json({ success: true, withdrawal, message: 'Withdrawal request submitted successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  getWithdrawals: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const withdrawals = localStore.getWorkerWithdrawals(workerId);
      return res.json({ success: true, withdrawals });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getNotifications: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const notifications = localStore.getWorkerNotifications(workerId);
      return res.json({ success: true, notifications });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  markNotificationRead: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const notifId = req.params.id as string;
      const ok = localStore.markNotificationRead(notifId, workerId);
      return res.json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getOrderChat: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.orderId as string;
      const result = localStore.getOrderChat(orderId, workerId);
      return res.json({ success: true, ...result });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  sendChatMessage: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const orderId = req.params.orderId as string;
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Message cannot be empty' });
      }
      const worker = localStore.getWorker(workerId);
      const chatMsg = localStore.addChatMessage(orderId, workerId, 'WORKER', worker?.name || 'Worker', message);
      return res.json({ success: true, message: chatMsg });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  getSupportTickets: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const tickets = localStore.getWorkerTickets(workerId);
      return res.json({ success: true, tickets });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  createSupportTicket: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const { category, subject, message, orderId } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ success: false, error: 'Subject and message are required' });
      }
      const ticket = localStore.createWorkerTicket(workerId, { category: category || 'General', subject, message, orderId });
      return res.json({ success: true, ticket, message: 'Ticket submitted successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  getProfile: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const worker = localStore.getWorker(workerId);
      if (!worker) return res.status(404).json({ success: false, error: 'Worker not found' });
      return res.json({ success: true, profile: worker });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const updated = localStore.updateWorkerProfile(workerId, req.body);
      return res.json({ success: true, profile: updated, message: 'Profile updated successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  proposeService: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const proposal = localStore.proposeService(workerId, req.body);
      return res.json({ success: true, proposal, message: 'Service proposal submitted for admin review' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getProposals: async (req: Request, res: Response) => {
    try {
      const workerId = (req as any).user.id;
      const proposals = localStore.getWorkerProposals(workerId);
      return res.json({ success: true, proposals });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

export const adminController = {
  // 1. Dashboard
  getDashboardStats: async (req: Request, res: Response) => {
    try {
      const stats = localStore.getAdminDashboardStats();
      return res.json({ success: true, stats });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  // 2. Worker Management
  getWorkers: async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const search = req.query.search as string;
      const workers = localStore.getAllWorkersAdmin({ status, search });
      return res.json({ success: true, workers });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getWorkerDetails: async (req: Request, res: Response) => {
    try {
      const workerId = req.params.id as string;
      const data = localStore.getWorkerDetailedAdmin(workerId);
      return res.json({ success: true, ...data });
    } catch (e: any) {
      return res.status(404).json({ success: false, error: e.message });
    }
  },

  createWorker: async (req: Request, res: Response) => {
    try {
      const worker = localStore.createWorkerAdmin(req.body);
      return res.json({ success: true, worker, message: 'Worker created successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  verifyWorker: async (req: Request, res: Response) => {
    try {
      const workerId = req.params.id as string;
      const { approved, note } = req.body;
      const worker = localStore.verifyWorkerAdmin(workerId, !!approved, note);
      return res.json({ success: true, worker, message: approved ? 'Worker verified and activated' : 'Verification rejected' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  setWorkerStatus: async (req: Request, res: Response) => {
    try {
      const workerId = req.params.id as string;
      const { status, reason } = req.body;
      const worker = localStore.setWorkerAccountStatusAdmin(workerId, status, reason);
      return res.json({ success: true, worker, message: `Worker status set to ${status}` });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  // 3. Customer Management
  getCustomers: async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const search = req.query.search as string;
      const customers = localStore.getAllCustomersAdmin({ status, search });
      return res.json({ success: true, customers });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getCustomerDetails: async (req: Request, res: Response) => {
    try {
      const customerId = req.params.id as string;
      const data = localStore.getCustomerDetailedAdmin(customerId);
      return res.json({ success: true, ...data });
    } catch (e: any) {
      return res.status(404).json({ success: false, error: e.message });
    }
  },

  setCustomerStatus: async (req: Request, res: Response) => {
    try {
      const customerId = req.params.id as string;
      const { status, reason } = req.body;
      const customer = localStore.setCustomerStatusAdmin(customerId, status, reason);
      return res.json({ success: true, customer, message: `Customer account ${status.toLowerCase()}` });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  // 4. Order Management & Administrative Overrides
  getOrders: async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const search = req.query.search as string;
      const orders = localStore.getAllOrdersAdmin({ status, search });
      return res.json({ success: true, orders });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getOrderDetails: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const data = localStore.getOrderDetailedAdmin(orderId);
      return res.json({ success: true, ...data });
    } catch (e: any) {
      return res.status(404).json({ success: false, error: e.message });
    }
  },

  assignWorker: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const { workerId, note } = req.body;
      if (!workerId) return res.status(400).json({ success: false, error: 'Worker ID is required' });
      const order = localStore.adminAssignWorker(orderId, workerId, note);
      return res.json({ success: true, order, message: 'Worker assigned successfully (Administrative Override)' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const { status, note } = req.body;
      const order = localStore.adminUpdateOrderStatus(orderId, status, note);
      return res.json({ success: true, order, message: `Order status updated to ${status}` });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  requestCorrection: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const { reason, instruction } = req.body;
      if (!reason || !instruction) {
        return res.status(400).json({ success: false, error: 'Correction reason and instruction are required' });
      }
      const order = localStore.adminRequestCorrection(orderId, reason, instruction);
      return res.json({ success: true, order, message: 'Correction requested (2-hour window opened)' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  holdWorkerEarnings: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const { reason } = req.body;
      const order = localStore.adminHoldWorkerEarnings(orderId, reason);
      return res.json({ success: true, order, message: 'Worker earnings for this order placed on hold' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  releaseWorkerEarnings: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const order = localStore.adminReleaseWorkerEarnings(orderId);
      return res.json({ success: true, order, message: 'Worker earnings released' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  refundOrder: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ success: false, error: 'Refund reason is mandatory' });
      const order = localStore.adminRefundOrder(orderId, reason);
      return res.json({ success: true, order, message: 'Order refunded and cancelled successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  // 5. Service Management
  getServices: async (req: Request, res: Response) => {
    try {
      const services = localStore.getServices();
      return res.json({ success: true, services });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  createService: async (req: Request, res: Response) => {
    try {
      const service = localStore.createOfficialServiceAdmin(req.body);
      return res.json({ success: true, service, message: 'Service created successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  updateService: async (req: Request, res: Response) => {
    try {
      const serviceId = req.params.id as string;
      const service = localStore.updateOfficialServiceAdmin(serviceId, req.body);
      return res.json({ success: true, service, message: 'Service updated successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  deleteService: async (req: Request, res: Response) => {
    try {
      const serviceId = req.params.id as string;
      localStore.deleteOfficialServiceAdmin(serviceId);
      return res.json({ success: true, message: 'Service removed successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  toggleServiceStatus: async (req: Request, res: Response) => {
    try {
      const serviceId = req.params.id as string;
      const service = localStore.toggleOfficialServiceAdmin(serviceId);
      return res.json({ success: true, service, message: `Service ${service.status.toLowerCase()}` });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  getServiceProposals: async (req: Request, res: Response) => {
    try {
      const proposals = localStore.getAllProposalsAdmin();
      return res.json({ success: true, proposals });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  approveProposal: async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user?.id || 'ADM-001';
      const result = localStore.approveProposalAdmin(req.params.id as string, adminId);
      return res.json({ success: true, ...result, message: 'Service proposal approved and published to customer catalog' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  rejectProposal: async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user?.id || 'ADM-001';
      const { reason } = req.body;
      const proposal = localStore.rejectProposalAdmin(req.params.id as string, adminId, reason);
      return res.json({ success: true, proposal, message: 'Service proposal rejected' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  // 6. Payments & Financials
  getFinancialSummary: async (req: Request, res: Response) => {
    try {
      const summary = localStore.getFinancialSummaryAdmin();
      return res.json({ success: true, summary });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getPayments: async (req: Request, res: Response) => {
    try {
      const orders = localStore.getAllOrdersAdmin();
      const payments = orders.map(o => ({
        id: `pay_${o.id}`,
        orderId: o.id,
        serviceName: o.serviceName,
        customerName: o.customerName,
        amountPaise: o.pricePaise || 0,
        status: o.status === 'CANCELLED' ? 'REFUNDED' : 'PAID',
        paymentMethod: 'UPI / NetBanking',
        createdAt: o.createdAt
      }));
      return res.json({ success: true, payments });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getWithdrawals: async (req: Request, res: Response) => {
    try {
      const withdrawals = localStore.getAllWithdrawalsAdmin();
      return res.json({ success: true, withdrawals });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  approveWithdrawal: async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user?.id || 'ADM-001';
      const withdrawal = localStore.approveWithdrawalAdmin(req.params.id as string, adminId);
      return res.json({ success: true, withdrawal, message: 'Withdrawal request approved and processed' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  rejectWithdrawal: async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user?.id || 'ADM-001';
      const { reason } = req.body;
      const withdrawal = localStore.rejectWithdrawalAdmin(req.params.id as string, adminId, reason);
      return res.json({ success: true, withdrawal, message: 'Withdrawal rejected and funds restored' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  getTopEarningWorkers: async (req: Request, res: Response) => {
    try {
      const period = (req.query.period === 'daily' ? 'daily' : 'monthly') as 'daily' | 'monthly';
      const rankings = localStore.getTopEarningWorkersAdmin(period);
      return res.json({ success: true, rankings });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  // 7. Complaints & Disputes
  getComplaints: async (req: Request, res: Response) => {
    try {
      const type = req.query.type as string;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const complaints = localStore.getAllComplaintsAdmin({ type, status, search });
      return res.json({ success: true, complaints });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getComplaintDetails: async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id as string;
      const data = localStore.getComplaintDetailedAdmin(complaintId);
      return res.json({ success: true, ...data });
    } catch (e: any) {
      return res.status(404).json({ success: false, error: e.message });
    }
  },

  replyComplaint: async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id as string;
      const { message } = req.body;
      if (!message) return res.status(400).json({ success: false, error: 'Reply message is required' });
      const complaint = localStore.addComplaintReplyAdmin(complaintId, 'Admin Operations', message);
      return res.json({ success: true, complaint, message: 'Reply sent' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  addComplaintNote: async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id as string;
      const { note } = req.body;
      if (!note) return res.status(400).json({ success: false, error: 'Note is required' });
      const complaint = localStore.addComplaintInternalNoteAdmin(complaintId, 'Admin', note);
      return res.json({ success: true, complaint, message: 'Internal note saved' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  resolveComplaint: async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id as string;
      const { decision, resolutionNote } = req.body;
      if (!resolutionNote) return res.status(400).json({ success: false, error: 'Resolution explanation is required' });
      const complaint = localStore.resolveComplaintAdmin(complaintId, decision || 'RESOLVED', resolutionNote);
      return res.json({ success: true, complaint, message: 'Complaint marked as resolved' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  // 8. Help & Support Desk
  getSupportTickets: async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const tickets = localStore.getAllSupportTicketsAdmin({ role, status, search });
      return res.json({ success: true, tickets });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  replySupportTicket: async (req: Request, res: Response) => {
    try {
      const ticketId = req.params.id as string;
      const adminId = (req as any).user?.id || 'ADM-001';
      const { message } = req.body;
      if (!message) return res.status(400).json({ success: false, error: 'Reply message is required' });
      const ticket = localStore.replySupportTicketAdmin(ticketId, adminId, message);
      return res.json({ success: true, ticket, message: 'Reply dispatched to user' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  addSupportTicketNote: async (req: Request, res: Response) => {
    try {
      const ticketId = req.params.id as string;
      const { note } = req.body;
      if (!note) return res.status(400).json({ success: false, error: 'Note is required' });
      const ticket = localStore.addTicketInternalNoteAdmin(ticketId, 'Admin', note);
      return res.json({ success: true, ticket, message: 'Internal note saved' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  updateSupportTicketStatus: async (req: Request, res: Response) => {
    try {
      const ticketId = req.params.id as string;
      const { status } = req.body;
      const ticket = localStore.updateSupportTicketStatusAdmin(ticketId, status);
      return res.json({ success: true, ticket, message: `Ticket status set to ${status}` });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  // 9. Notifications
  getNotifications: async (req: Request, res: Response) => {
    try {
      const notifications = localStore.getAdminNotifications();
      const unreadCount = notifications.filter(n => !n.isRead).length;
      return res.json({ success: true, notifications, unreadCount });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  markNotificationRead: async (req: Request, res: Response) => {
    try {
      localStore.markAdminNotificationRead(req.params.id as string);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  markAllNotificationsRead: async (req: Request, res: Response) => {
    try {
      localStore.markAllAdminNotificationsRead();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  // 10. Reports & Analytics
  getReports: async (req: Request, res: Response) => {
    try {
      const reportType = (req.query.type as string) || 'orders';
      const period = (req.query.period as string) || 'monthly';
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;
      const report = localStore.getReportDataAdmin(reportType, period, customStartDate, customEndDate);
      return res.json({ success: true, report });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  // 11. Settings, Profile & Audit Logs
  getSettings: async (req: Request, res: Response) => {
    try {
      const settings = localStore.getPlatformSettings();
      return res.json({ success: true, settings });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  updateSettings: async (req: Request, res: Response) => {
    try {
      const settings = localStore.updatePlatformSettings(req.body);
      return res.json({ success: true, settings, message: 'Settings saved successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user?.id || 'ADM-001';
      const result = localStore.updateAdminProfile(adminId, req.body);
      return res.json({ success: true, ...result, message: 'Profile updated' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  getAuditLogs: async (req: Request, res: Response) => {
    try {
      const action = req.query.action as string;
      const entityType = req.query.entityType as string;
      const search = req.query.search as string;
      const logs = localStore.getSecurityAuditLogsAdmin({ action, entityType, search });
      return res.json({ success: true, logs });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

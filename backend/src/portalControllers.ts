import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { localStore } from './catalogData';
import { prisma, checkDb, withDbRetry, isJsonFallbackAllowed } from './db';
import { storage } from './extendedControllers';
import { fileBufferStore } from './utils/fileStore';
import { broadcastEvent, sendUserEvent } from './utils/realtimeEvents';

// ==========================================
// TYPE DEFINITIONS & INTERFACES
// ==========================================
export interface AuthUserPayload {
  id: string;
  role: 'CUSTOMER' | 'WORKER' | 'ADMIN';
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// ==========================================
// STANDARDIZED API RESPONSE HELPERS
// ==========================================
const sendSuccess = (res: Response, data: Record<string, any> = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, ...data });
};

const sendError = (res: Response, statusCode: number, code: string, message: string) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message }
  });
};

const paiseToRupees = (paise: number): number => {
  return Math.round(Number(paise || 0)) / 100;
};

/**
 * Calculates worker available balance verified against FinancialLedger and WorkerEarning.
 */
export async function calculateVerifiedWorkerBalance(tx: any, workerId: string): Promise<{
  totalCreditedPaise: number;
  totalWithdrawnOrLockedPaise: number;
  availablePaise: number;
}> {
  // Sum of RELEASED earnings
  const releasedEarnings = await tx.workerEarning.aggregate({
    where: { workerId, status: 'RELEASED' },
    _sum: { amountPaise: true }
  });
  const totalCreditedPaise = releasedEarnings._sum.amountPaise || 0;

  // Sum of locked or completed withdrawals
  const lockedWithdrawals = await tx.withdrawal.aggregate({
    where: {
      workerId,
      status: { in: ['REQUESTED', 'APPROVED', 'COMPLETED'] }
    },
    _sum: { amountPaise: true }
  });

  const debitAdjustments = await tx.financialLedger.aggregate({
    where: { workerId, type: 'DEBIT_ADJUSTMENT' },
    _sum: { amountPaise: true }
  });

  const totalWithdrawnOrLockedPaise =
    (lockedWithdrawals._sum.amountPaise || 0) + (debitAdjustments._sum.amountPaise || 0);

  const availablePaise = Math.max(0, totalCreditedPaise - totalWithdrawnOrLockedPaise);

  return {
    totalCreditedPaise,
    totalWithdrawnOrLockedPaise,
    availablePaise
  };
}

// ==========================================
// WORKER SAFE ORDER PROJECTION & SANITIZER (Task 4.1)
// Strictly hides customer price, admin commission, and platform fee from workers
// ==========================================
export const WORKER_SAFE_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  customerId: true,
  serviceId: true,
  assignedWorkerId: true,
  formData: true,
  workerAmountPaise: true,
  currency: true,
  status: true,
  paymentStatus: true,
  earningStatus: true,
  acceptedAt: true,
  startedAt: true,
  workCompletedAt: true,
  receiptSubmittedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  timeSlot: true,
  bookingDate: true,
  slotStatus: true,
  proposedSlot: true,
  proposedDate: true,
  service: {
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      estimatedTime: true,
      requiredDocuments: true
    }
  },
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true
    }
  },
  documents: {
    select: {
      id: true,
      docName: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      isWorkingCopy: true,
      createdAt: true
    }
  }
};

export function sanitizeOrderForWorker(order: any): any {
  if (!order) return order;
  if (Array.isArray(order)) return order.map(o => sanitizeOrderForWorker(o));

  const clone = { ...order };
  delete clone.pricePaise;
  delete clone.customerPaidAmount;
  delete clone.customerPaidAmountPaise;
  delete clone.adminCommission;
  delete clone.adminCommissionPaise;
  delete clone.platformFee;
  delete clone.platformFeePaise;
  delete clone.pricing;
  delete clone.commissionPaise;
  delete clone.adminMargin;
  if (clone.serviceSnapshot) {
    clone.serviceSnapshot = { ...clone.serviceSnapshot };
    delete clone.serviceSnapshot.pricing;
    delete clone.serviceSnapshot.pricePaise;
    delete clone.serviceSnapshot.customerPaidAmount;
    delete clone.serviceSnapshot.adminCommission;
    delete clone.serviceSnapshot.platformFee;
    delete clone.serviceSnapshot.adminMargin;
  }
  return clone;
}

// ==========================================
// WORKER CONTROLLER
// ==========================================
export const workerController = {
  /**
   * Fetch orders available for worker pickup
   */
  getAvailableRequests: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Worker authentication required');

      let isOnline = true;
      let rawList: any[] = [];
      const isDbOnline = await checkDb().catch(() => false);

      if (isDbOnline) {
        try {
          const dbWorker = await prisma.worker.findUnique({
            where: { id: workerId },
            select: { id: true, isOnline: true, status: true }
          });
          if (dbWorker) {
            isOnline = dbWorker.isOnline;
            const memW = localStore.getWorker(workerId);
            if (memW) memW.isOnline = dbWorker.isOnline;
          } else {
            const memW = localStore.getWorker(workerId);
            if (memW) isOnline = memW.isOnline;
          }

          // Strict DB Query: Unassigned AND Open Claimable status only
          const dbOrders = await prisma.order.findMany({
            where: {
              AND: [
                { OR: [{ workerId: null }, { workerId: '' }] },
                { OR: [{ assignedWorkerId: null }, { assignedWorkerId: '' }] },
                { status: { in: ['AVAILABLE', 'PAID', 'CREATED'] } }
              ]
            },
            include: {
              customer: true,
              user: true,
              service: true,
              job: true
            },
            orderBy: { createdAt: 'desc' }
          });

          // Sync into localStore cache so memory cache stays accurate
          for (const ord of dbOrders) {
            localStore.saveOrder(ord);
          }

          // Clean up any claimed orders in localStore so stale cache is kept accurate
          const claimedOrders = await prisma.order.findMany({
            where: {
              OR: [
                { workerId: { not: null } },
                { assignedWorkerId: { not: null } },
                { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'SUBMITTED', 'REJECTED'] } }
              ]
            },
            select: { id: true, workerId: true, assignedWorkerId: true, status: true }
          });
          for (const c of claimedOrders) {
            const loc = localStore.getOrder(c.id);
            if (loc) {
              loc.workerId = c.workerId || loc.workerId;
              loc.assignedWorkerId = c.assignedWorkerId || c.workerId || loc.assignedWorkerId;
              loc.status = c.status as any;
            }
          }

          rawList = dbOrders;
        } catch (dbErr: any) {
          console.warn('[getAvailableRequests DB Query Notice]:', dbErr?.message);
        }
      }

      if (rawList.length === 0 && (!isDbOnline || isJsonFallbackAllowed())) {
        const result = localStore.getAvailableOrdersForWorker(workerId);
        rawList = result.orders || [];
        isOnline = result.isOnline;
      }

      // Defensive filtering: Guarantee that NO assigned or closed order is ever returned
      const strictlyAvailable = rawList.filter(ord => {
        const hasWorkerAssigned = Boolean(
          (ord.workerId && ord.workerId !== '') ||
          (ord.assignedWorkerId && ord.assignedWorkerId !== '') ||
          ord.worker?.id ||
          ord.job?.workerId
        );
        const isClaimableStatus = ['AVAILABLE', 'PAID', 'CREATED', 'OFFERED', 'PENDING'].includes(ord.status);
        const isClosed = ['ASSIGNED', 'IN_PROGRESS', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'SUBMITTED', 'REJECTED', 'REFUNDED'].includes(ord.status);

        return !hasWorkerAssigned && isClaimableStatus && !isClosed;
      });

      const safeOrders = strictlyAvailable.map(sanitizeOrderForWorker);
      return sendSuccess(res, {
        orders: safeOrders,
        isOnline,
        data: { orders: safeOrders, isOnline }
      });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message || 'Failed to fetch available requests');
    }
  },

  getAvailableOrders: async (req: AuthenticatedRequest, res: Response) => {
    return workerController.getAvailableRequests(req, res);
  },

  /**
   * Worker accepts an order
   */
  acceptJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const orderId = String(req.params.id || req.params.orderId);

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      if (!orderId) return sendError(res, 400, 'INVALID_INPUT', 'Order ID is required');

      let order: any = null;
      const isDbOnline = await checkDb().catch(() => false);

      if (isDbOnline) {
        try {
          order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true, user: true, service: true, worker: true, job: true }
          });
        } catch (dbErr: any) {
          console.warn('[acceptJob DB find notice]:', dbErr?.message);
        }
      }

      if (!order) {
        order = localStore.getOrder(orderId);
      }

      if (!order) {
        return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      // Check if order is already assigned to a DIFFERENT worker
      const existingWorkerId = order.assignedWorkerId || order.job?.workerId;
      if (existingWorkerId && existingWorkerId !== workerId) {
        return sendError(res, 409, 'ORDER_ALREADY_ASSIGNED', 'This order has already been accepted by another operator');
      }

      // If already assigned to CURRENT worker, return 200 OK idempotently
      if (existingWorkerId && existingWorkerId === workerId) {
        let safeOrder = localStore.getOrderForWorker(orderId, workerId) || order;
        safeOrder = sanitizeOrderForWorker(safeOrder);
        return sendSuccess(res, {
          job: safeOrder,
          order: safeOrder,
          data: { job: safeOrder, order: safeOrder },
          message: 'Order already accepted by you'
        });
      }

      // Validate claimable status
      const claimableStatuses = ['AVAILABLE', 'OFFERED', 'PAID', 'PENDING', 'CONFIRMED', 'CREATED', 'ASSIGNED', 'ACCEPTED'];
      if (!claimableStatuses.includes(order.status)) {
        return sendError(res, 400, 'ORDER_UNAVAILABLE', `Order cannot be accepted in status: ${order.status}`);
      }

      if (isDbOnline) {
        try {
          // Foreign Key Safety: Guarantee worker exists in Prisma Worker table
          await prisma.worker.upsert({
            where: { id: workerId },
            update: {
              status: 'ACTIVE',
              isOnline: true
            },
            create: {
              id: workerId,
              email: (req.user?.email || `worker_${workerId}@cybercafe.local`).toLowerCase(),
              name: req.user?.name || 'Cyber Cafe Operator',
              status: 'ACTIVE',
              kycStatus: 'VERIFIED',
              passwordHash: '$2b$10$dummyHashForWorkerAccountForeignKeys123'
            }
          }).catch(() => {});

          // Valid OrderStatus enum values in Prisma schema
          const prismaClaimable = ['AVAILABLE', 'PAID', 'CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] as any[];

          await prisma.$transaction(async (tx: any) => {
            const updated = await tx.order.updateMany({
              where: {
                id: orderId,
                status: { in: prismaClaimable },
                AND: [
                  { OR: [{ workerId: null }, { workerId: '' }, { workerId: workerId }] },
                  { OR: [{ assignedWorkerId: null }, { assignedWorkerId: '' }, { assignedWorkerId: workerId }] }
                ]
              },
              data: {
                status: 'IN_PROGRESS',
                workerId: workerId,
                assignedWorkerId: workerId,
                acceptedAt: new Date(),
                updatedAt: new Date()
              }
            });

            if (updated.count === 0) {
              const fresh = await tx.order.findUnique({ where: { id: orderId } });
              const currentBoundWorker = fresh?.workerId || fresh?.assignedWorkerId;
              if (fresh && currentBoundWorker && currentBoundWorker !== workerId) {
                const err: any = new Error('This order was just accepted by another worker');
                err.statusCode = 409;
                err.code = 'ORDER_ALREADY_ASSIGNED';
                throw err;
              }
              const err: any = new Error('Order is no longer available');
              err.statusCode = 409;
              err.code = 'ORDER_ALREADY_ASSIGNED';
              throw err;
            }

            await tx.job.upsert({
              where: { orderId },
              update: { workerId, status: 'IN_PROGRESS', acceptedAt: new Date() },
              create: { orderId, workerId, status: 'IN_PROGRESS', acceptedAt: new Date() }
            });
          });
        } catch (dbErr: any) {
          if (dbErr.code === 'ORDER_ALREADY_CLAIMED' || dbErr.statusCode === 409) {
            return sendError(res, 409, 'ORDER_ALREADY_ASSIGNED', 'This order has already been accepted by another operator');
          }
          console.warn('[acceptJob DB transaction notice]:', dbErr?.message);
        }
      }

      // Sync with localStore
      let localOrder = localStore.getOrder(orderId);
      if (!localOrder && order) {
        localStore.saveOrder(order);
      }
      try {
        localOrder = localStore.acceptOrder(orderId, workerId);
      } catch (err: any) {
        localOrder = localStore.getOrder(orderId);
        if (localOrder) {
          localOrder.status = 'ASSIGNED';
          localOrder.assignedWorkerId = workerId;
          localStore.saveOrder(localOrder);
        }
      }

      // Broadcast real-time SSE events
      if (localOrder?.customerId) {
        sendUserEvent(localOrder.customerId, 'ORDER_STATUS_UPDATED', {
          orderId,
          status: 'ASSIGNED',
          assignedWorkerId: workerId
        });
      }
      broadcastEvent('ORDER_STATUS_UPDATED', {
        orderId,
        status: 'ASSIGNED',
        assignedWorkerId: workerId
      });
      broadcastEvent('ORDER_CLAIMED', {
        orderId,
        workerId
      });

      const safeOrder = sanitizeOrderForWorker(localOrder || order);
      return sendSuccess(res, {
        job: safeOrder,
        order: safeOrder,
        data: { job: safeOrder, order: safeOrder },
        message: 'Order accepted successfully'
      });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message || 'Failed to accept order');
    }
  },

  /**
   * Worker accepts and sets review schedule window
   */
  acceptAndSchedule: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const orderId = String(req.params.id || req.params.orderId);
      const { date, timeSlot } = req.body;

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      if (!orderId) return sendError(res, 400, 'INVALID_INPUT', 'Order ID is required');
      if (!timeSlot) return sendError(res, 400, 'INVALID_INPUT', 'Initial timeSlot is mandatory');

      let order: any = null;
      const isDbOnline = await checkDb().catch(() => false);

      if (isDbOnline) {
        try {
          order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true, user: true, service: true, worker: true, job: true }
          });
        } catch (dbErr: any) {
          console.warn('[acceptAndSchedule DB find notice]:', dbErr?.message);
        }
      }

      if (!order) {
        order = localStore.getOrder(orderId);
      }

      if (!order) {
        return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      // Check if order is already assigned to a DIFFERENT worker
      const existingWorkerId = order.assignedWorkerId || order.job?.workerId;
      if (existingWorkerId && existingWorkerId !== workerId) {
        return sendError(res, 409, 'ORDER_ALREADY_ASSIGNED', 'Order has already been assigned to another operator');
      }

      const claimableStatuses = ['AVAILABLE', 'OFFERED', 'PAID', 'PENDING', 'CONFIRMED', 'CREATED', 'ASSIGNED', 'IN_PROGRESS', 'ACCEPTED'];
      if (!claimableStatuses.includes(order.status)) {
        return sendError(res, 400, 'ORDER_UNAVAILABLE', `Order cannot be accepted in status: ${order.status}`);
      }

      if (isDbOnline) {
        try {
          await prisma.worker.upsert({
            where: { id: workerId },
            update: {
              status: 'ACTIVE',
              isOnline: true
            },
            create: {
              id: workerId,
              email: (req.user?.email || `worker_${workerId}@cybercafe.local`).toLowerCase(),
              name: req.user?.name || 'Cyber Cafe Operator',
              status: 'ACTIVE',
              kycStatus: 'VERIFIED',
              passwordHash: '$2b$10$dummyHashForWorkerAccountForeignKeys123'
            }
          }).catch(() => {});

          // Valid OrderStatus enum values in Prisma schema
          const prismaClaimable = ['AVAILABLE', 'PAID', 'CREATED', 'ASSIGNED', 'IN_PROGRESS', 'ACCEPTED'] as any[];

          await prisma.$transaction(async (tx: any) => {
            const updated = await tx.order.updateMany({
              where: {
                id: orderId,
                status: { in: prismaClaimable },
                AND: [
                  { OR: [{ workerId: null }, { workerId: '' }, { workerId: workerId }] },
                  { OR: [{ assignedWorkerId: null }, { assignedWorkerId: '' }, { assignedWorkerId: workerId }] }
                ]
              },
              data: {
                status: 'IN_PROGRESS',
                workerId: workerId,
                assignedWorkerId: workerId,
                timeSlot,
                bookingDate: date || 'Today',
                slotStatus: 'CONFIRMED',
                acceptedAt: new Date(),
                updatedAt: new Date()
              }
            });

            if (updated.count === 0) {
              const fresh = await tx.order.findUnique({ where: { id: orderId } });
              const currentBoundWorker = fresh?.workerId || fresh?.assignedWorkerId;
              if (fresh && currentBoundWorker && currentBoundWorker !== workerId) {
                const err: any = new Error('This order was just accepted by another worker');
                err.statusCode = 409;
                err.code = 'ORDER_ALREADY_ASSIGNED';
                throw err;
              }
              const err: any = new Error('Order is no longer available');
              err.statusCode = 409;
              err.code = 'ORDER_ALREADY_ASSIGNED';
              throw err;
            }

            await tx.job.upsert({
              where: { orderId },
              update: { workerId, status: 'IN_PROGRESS', acceptedAt: new Date() },
              create: { orderId, workerId, status: 'IN_PROGRESS', acceptedAt: new Date() }
            });
          });
        } catch (dbErr: any) {
          if (dbErr.code === 'ORDER_ALREADY_ASSIGNED' || dbErr.statusCode === 409) {
            return sendError(res, 409, 'ORDER_ALREADY_ASSIGNED', 'Order has already been assigned');
          }
          console.warn('[acceptAndSchedule DB transaction notice]:', dbErr?.message);
        }
      }

      let scheduledOrder = localStore.getOrder(orderId);
      if (!scheduledOrder && order) {
        localStore.saveOrder(order);
      }
      try {
        scheduledOrder = localStore.acceptAndScheduleOrder(orderId, workerId, {
          date: date || 'Today',
          timeSlot
        });
      } catch (err: any) {
        scheduledOrder = localStore.getOrder(orderId);
        if (scheduledOrder) {
          scheduledOrder.status = 'ASSIGNED';
          scheduledOrder.assignedWorkerId = workerId;
          scheduledOrder.timeSlot = timeSlot;
          scheduledOrder.bookingDate = date || 'Today';
          scheduledOrder.slotStatus = 'CONFIRMED';
          localStore.saveOrder(scheduledOrder);
        }
      }

      if (scheduledOrder?.customerId) {
        sendUserEvent(scheduledOrder.customerId, 'ORDER_STATUS_UPDATED', {
          orderId,
          status: 'ASSIGNED',
          assignedWorkerId: workerId,
          timeSlot
        });
      }
      broadcastEvent('ORDER_STATUS_UPDATED', {
        orderId,
        status: 'ASSIGNED',
        assignedWorkerId: workerId,
        timeSlot
      });
      broadcastEvent('ORDER_CLAIMED', {
        orderId,
        workerId
      });

      const safeScheduled = sanitizeOrderForWorker(scheduledOrder || order);
      return sendSuccess(res, {
        job: safeScheduled,
        order: safeScheduled,
        data: { job: safeScheduled, order: safeScheduled },
        message: 'Order accepted and schedule window confirmed'
      });
    } catch (e: any) {
      return sendError(res, 400, 'SCHEDULE_FAILED', e.message || 'Failed to schedule order');
    }
  },

  rejectJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const orderId = String(req.params.id);
      const { reason, note } = req.body;

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      if (!reason) return sendError(res, 400, 'INVALID_INPUT', 'Rejection reason is mandatory');

      const result = localStore.rejectOrder(orderId, workerId, reason, note);
      return sendSuccess(res, { message: result.message });
    } catch (e: any) {
      return sendError(res, 400, 'REJECT_FAILED', e.message || 'Failed to reject job');
    }
  },

  getMyJobs: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const statusFilter = req.query.status as string;
      let jobs: any[] = [];
      const isDbOnline = await checkDb().catch(() => false);

      if (isDbOnline) {
        try {
          const whereClause: any = {
            OR: [
              { workerId },
              { assignedWorkerId: workerId }
            ]
          };
          if (statusFilter && statusFilter !== 'ALL') {
            whereClause.status = statusFilter as any;
          }

          const dbJobs = await prisma.order.findMany({
            where: whereClause,
            include: { customer: true, user: true, service: true, job: true, documents: true, receipts: true },
            orderBy: { createdAt: 'desc' }
          });

          for (const j of dbJobs) {
            localStore.saveOrder(j);
          }
          jobs = dbJobs;
        } catch (dbErr: any) {
          console.warn('[getMyJobs DB Query Notice]:', dbErr?.message);
        }
      }

      if (jobs.length === 0 && (!isDbOnline || isJsonFallbackAllowed())) {
        jobs = localStore.getWorkerJobs(workerId, statusFilter);
      }

      const safeJobs = jobs.map(sanitizeOrderForWorker);
      return sendSuccess(res, {
        jobs: safeJobs,
        orders: safeJobs,
        data: { jobs: safeJobs, orders: safeJobs }
      });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message || 'Failed to fetch jobs');
    }
  },

  getActiveOrders: async (req: AuthenticatedRequest, res: Response) => {
    return workerController.getMyJobs(req, res);
  },

  getOrderDetails: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const orderId = String(req.params.id || req.params.orderId);

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      let job = localStore.getOrderForWorker(orderId, workerId);
      if (!job) {
        const isDbOnline = await checkDb().catch(() => false);
        if (isDbOnline) {
          try {
            const dbOrder = await prisma.order.findUnique({
              where: { id: orderId },
              include: { customer: true, service: true, documents: true, receipts: true, job: true }
            });
            if (dbOrder && (dbOrder.assignedWorkerId === workerId || req.user?.role === 'ADMIN')) {
              localStore.saveOrder(dbOrder);
              job = localStore.getOrderForWorker(orderId, workerId) || dbOrder;
            }
          } catch {}
        }
      }

      if (!job) {
        return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found or access denied');
      }

      const safeJob = sanitizeOrderForWorker(job);
      return sendSuccess(res, {
        job: safeJob,
        order: safeJob,
        data: { job: safeJob, order: safeJob }
      });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message || 'Failed to retrieve order');
    }
  },

  getJobDetails: async (req: AuthenticatedRequest, res: Response) => {
    return workerController.getOrderDetails(req, res);
  },

  getOrderDocuments: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const orderId = String(req.params.orderId || req.params.id);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const order = localStore.getOrder(orderId);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      const isAdmin = user.role === 'ADMIN';
      if (!isAdmin && order.assignedWorkerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Access denied: You are not assigned to this order');
      }

      const documents = order.documents || [];
      return sendSuccess(res, { documents, data: { documents } });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message || 'Failed to fetch documents');
    }
  },

  startWork: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const orderId = String(req.params.id);

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const order = localStore.startWork(orderId, workerId);
      const safeOrder = sanitizeOrderForWorker(order);
      return sendSuccess(res, { order: safeOrder, data: { order: safeOrder }, message: 'Work started' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message || 'Failed to start work');
    }
  },

  completeOrder: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const orderId = String(req.params.orderId || req.params.id);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const order = localStore.getOrder(orderId);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      if (user.role !== 'ADMIN' && order.assignedWorkerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Unauthorized: You are not assigned to this order');
      }

      order.status = 'WORK_COMPLETED';
      order.workCompletedAt = new Date().toISOString();
      localStore.saveOrder(order);

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'WORK_COMPLETED', workCompletedAt: new Date() }
          });
        } catch {}
      }
      broadcastEvent('ORDER_STATUS_UPDATED', { orderId, status: 'WORK_COMPLETED' });

      const safeOrder = sanitizeOrderForWorker(order);
      return sendSuccess(res, { order: safeOrder, data: { order: safeOrder }, message: 'Work marked as completed' });
    } catch (e: any) {
      return sendError(res, 400, 'COMPLETE_FAILED', e.message || 'Failed to complete order');
    }
  },

  uploadReceipt: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const orderId = String(req.params.orderId || req.params.id);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const order = localStore.getOrder(orderId);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      if (user.role !== 'ADMIN' && order.assignedWorkerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Unauthorized: You are not assigned to this order');
      }

      if (req.file) {
        const fileKey = `receipts/${orderId}/${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        fileBufferStore.set(fileKey, {
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          fileName: req.file.originalname,
          createdAt: Date.now()
        });

        try {
          await storage.upload(fileKey, req.file.buffer, req.file.mimetype);
        } catch (storageErr) {
          console.warn('[STORAGE] Remote upload warning:', (storageErr as any)?.message);
        }

        const receiptDoc = {
          id: 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: req.file.originalname,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: `${Math.round(req.file.size / 1024)} KB`,
          storageKey: fileKey,
          url: `/api/orders/${orderId}/deliverables/receipt/download`,
          isMandatory: true,
          uploadedAt: new Date().toISOString()
        };

        order.deliverables = [receiptDoc, ...(order.deliverables || []).filter((d: any) => !d.isMandatory)];
        order.receipt = receiptDoc;
      } else if (req.body.deliverables && Array.isArray(req.body.deliverables)) {
        order.deliverables = req.body.deliverables;
      }

      order.status = 'WAITING_FOR_CUSTOMER';
      order.receiptSubmittedAt = new Date().toISOString();
      order.earningStatus = 'PENDING';
      localStore.saveOrder(order);

      // Notify customer
      if (order.customerId) {
        sendUserEvent(order.customerId, 'ORDER_STATUS_UPDATED', {
          orderId: order.id,
          status: 'WAITING_FOR_CUSTOMER',
          receiptSubmittedAt: order.receiptSubmittedAt
        });

        localStore.notifications.unshift({
          id: `notif_${Date.now()}_rcpt`,
          recipientId: order.customerId,
          recipientRole: 'CUSTOMER',
          type: 'RECEIPT_SUBMITTED',
          title: '📥 Work Complete & Receipt Ready',
          message: `Your service request for "${order.serviceName || 'service'}" has been completed. Download your receipt to confirm.`,
          orderId: order.id,
          isRead: false,
          createdAt: new Date().toISOString()
        } as any);
      }

      return sendSuccess(res, {
        order,
        data: { order, status: order.status, earningStatus: order.earningStatus },
        message: 'Receipt uploaded successfully. Awaiting customer download.'
      });
    } catch (e: any) {
      return sendError(res, 400, 'UPLOAD_FAILED', e.message || 'Failed to upload receipt');
    }
  },

  setTimeSlot: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const orderId = String(req.params.id);
      const { date, startTime, endTime, note } = req.body;

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      if (!startTime || !endTime) return sendError(res, 400, 'INVALID_INPUT', 'Start and end time are required');

      const existingOrder = localStore.getOrder(orderId);
      if (!existingOrder) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      if (user.role !== 'ADMIN' && existingOrder.assignedWorkerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Only the assigned worker or admin can set time slot');
      }

      const order = localStore.setOrderTimeSlot(orderId, user.id, { date, startTime, endTime, note });

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: order.serviceSnapshot }
          });
        } catch { }
      }

      return sendSuccess(res, { order });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  acceptReschedule: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const orderId = String(req.params.id);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const existingOrder = localStore.getOrder(orderId);
      if (!existingOrder) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      if (user.role !== 'ADMIN' && existingOrder.assignedWorkerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Only assigned operator or admin can accept reschedule');
      }

      const order = localStore.acceptCustomerReschedule(orderId, user.id);

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: order.serviceSnapshot }
          });
        } catch { }
      }

      return sendSuccess(res, { order, message: 'Reschedule request accepted successfully' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  uploadDeliverables: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const orderId = String(req.params.id);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const order = localStore.getOrder(orderId);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      if (user.role !== 'ADMIN' && order.assignedWorkerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Unauthorized: Not assigned to this order');
      }
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        return sendError(res, 400, 'INVALID_STATE', 'Cannot attach deliverables to completed or cancelled orders');
      }

      // Handle single file upload
      if (req.file) {
        const current = order.deliverables || [];
        if (current.length >= 2) {
          return sendError(res, 400, 'LIMIT_EXCEEDED', 'Maximum 2 deliverables allowed (1 mandatory receipt + 1 optional proof)');
        }

        const isMandatory = current.length === 0;
        const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `deliverables/${orderId}/${Date.now()}_${safeOriginalName}`;

        fileBufferStore.set(fileKey, {
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          fileName: req.file.originalname,
          createdAt: Date.now()
        });

        try {
          await storage.upload(fileKey, req.file.buffer, req.file.mimetype);
        } catch (storageErr: any) {
          console.warn('[STORAGE] Deliverable remote upload skipped:', storageErr.message);
        }

        const delivId = 'deliv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const sizeFormatted = req.file.size > 1024 * 1024
          ? `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(req.file.size / 1024)} KB`;

        const newDeliv = {
          id: delivId,
          name: (req.body.name && req.body.name.trim()) || req.file.originalname,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype || 'application/octet-stream',
          size: sizeFormatted,
          sizeBytes: req.file.size,
          storageKey: fileKey,
          url: `/api/orders/${orderId}/deliverables/${delivId}/download`,
          isMandatory,
          uploadedAt: new Date().toISOString()
        };

        const updatedDeliverables = [...current, newDeliv];
        order.deliverables = updatedDeliverables;

        if (order.serviceSnapshot) {
          if (!order.serviceSnapshot.completion) order.serviceSnapshot.completion = {};
          order.serviceSnapshot.completion.deliverableFiles = updatedDeliverables;
          order.serviceSnapshot.completion.receiptUrl = updatedDeliverables[0].url;
        }

        const docRecord = {
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          orderId,
          customerId: order.customerId,
          workerId: user.id,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype || 'application/octet-stream',
          size: req.file.size,
          storageKey: fileKey,
          type: 'DELIVERABLE',
          createdAt: new Date().toISOString()
        };
        localStore.saveDocument(docRecord);

        if (await checkDb().catch(() => false)) {
          try {
            await prisma.document.create({ data: docRecord as any });
            await prisma.order.update({
              where: { id: orderId },
              data: { serviceSnapshot: order.serviceSnapshot }
            });
          } catch { }
        }

        return sendSuccess(res, {
          deliverable: newDeliv,
          deliverables: order.deliverables
        });
      }

      // Handle raw array payload
      if (req.body.deliverables !== undefined) {
        if (!Array.isArray(req.body.deliverables)) {
          return sendError(res, 400, 'INVALID_INPUT', 'Deliverables payload must be an array');
        }
        const updated = localStore.uploadDeliverables(orderId, user.id, req.body.deliverables);
        return sendSuccess(res, { deliverables: updated.deliverables });
      }

      return sendError(res, 400, 'INVALID_INPUT', 'No deliverable file or data payload provided');
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  deleteDeliverable: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const orderId = String(req.params.id);
      const deliverableId = String(req.params.deliverableId);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const order = localStore.getOrder(orderId);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      if (user.role !== 'ADMIN' && order.assignedWorkerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Unauthorized');
      }
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        return sendError(res, 400, 'INVALID_STATE', 'Cannot modify deliverables of completed or cancelled order');
      }

      const current = order.deliverables || [];
      const updated = current.filter((d: any) => d.id !== deliverableId && d.fileName !== deliverableId);
      if (updated.length > 0) {
        updated[0].isMandatory = true;
      }
      order.deliverables = updated;

      if (order.serviceSnapshot?.completion) {
        order.serviceSnapshot.completion.deliverableFiles = updated;
        order.serviceSnapshot.completion.receiptUrl = updated.length > 0 ? updated[0].url : null;
      }

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: order.serviceSnapshot }
          });
        } catch { }
      }

      return sendSuccess(res, { deliverables: order.deliverables });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  submitJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const orderId = String(req.params.id);
      const { note, finalDocumentUrls, documents, deliverables } = req.body;

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      let incomingDeliverables: any[] = Array.isArray(deliverables) ? [...deliverables] : [];
      if (Array.isArray(finalDocumentUrls)) {
        incomingDeliverables.push(...finalDocumentUrls.map((u: string, idx: number) => ({
          id: `del_${Date.now()}_${idx}`,
          name: `Document_${idx + 1}.pdf`,
          url: u,
          uploadedAt: new Date().toISOString()
        })));
      }
      if (Array.isArray(documents)) {
        incomingDeliverables.push(...documents);
      }

      const order = localStore.finishWork(orderId, workerId, note, incomingDeliverables);

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              workCompletedAt: new Date(),
              receiptSubmittedAt: new Date(),
              earningStatus: 'PENDING',
              workerAmountPaise: order.workerAmountPaise || 0,
              serviceSnapshot: order.serviceSnapshot
            }
          });
          await prisma.job.updateMany({
            where: { orderId },
            data: { status: 'COMPLETED', completedAt: new Date() }
          });
          await prisma.workerEarning.upsert({
            where: { id: `earning_${orderId}` },
            create: {
              id: `earning_${orderId}`,
              workerId,
              orderId,
              amountPaise: order.workerAmountPaise || 0,
              status: 'PENDING',
              createdAt: new Date()
            },
            update: {
              amountPaise: order.workerAmountPaise || 0,
              status: 'PENDING'
            }
          }).catch(() => null);

          await prisma.worker.update({
            where: { id: workerId },
            data: {
              completedOrdersCount: { increment: 1 }
            }
          }).catch(() => null);
        } catch (dbErr: any) {
          console.warn('[Prisma] Job completion sync skipped:', dbErr.message);
        }
      }

      broadcastEvent('ORDER_STATUS_UPDATED', {
        orderId,
        status: 'COMPLETED',
        completedAt: order.completedAt,
        deliverables: order.deliverables
      });
      broadcastEvent('WORKER_EARNINGS_UPDATED', { workerId });

      return sendSuccess(res, { order: sanitizeOrderForWorker(order), message: 'Work completed and submitted successfully. Payout placed in 1-hour pending balance.' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  toggleAvailability: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const isOnline = Boolean(req.body.isOnline);
      const isDbOnline = await checkDb().catch(() => false);
      if (isDbOnline) {
        try {
          await prisma.worker.update({
            where: { id: workerId },
            data: { isOnline, lastActivityAt: new Date() }
          }).catch(() => {});
          await prisma.user.updateMany({
            where: { id: workerId },
            data: { isOnline }
          }).catch(() => {});
        } catch (dbErr: any) {
          console.warn('[toggleAvailability DB Update Notice]:', dbErr?.message);
        }
      }
      const result = localStore.toggleWorkerAvailability(workerId, isOnline);
      return sendSuccess(res, { isOnline: result.isOnline, worker: result.worker });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  recordActivity: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const isDbOnline = await checkDb().catch(() => false);
      if (isDbOnline) {
        try {
          await prisma.worker.update({
            where: { id: workerId },
            data: { lastActivityAt: new Date() }
          }).catch(() => {});
        } catch {}
      }

      const result = localStore.recordWorkerActivity(workerId);
      return sendSuccess(res, { ...result });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  heartbeat: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const isDbOnline = await checkDb().catch(() => false);
      if (isDbOnline) {
        await withDbRetry(() => prisma.worker.update({
          where: { id: workerId },
          data: {
            lastHeartbeatAt: new Date(),
            lastActivityAt: new Date(),
            isOnline: true
          }
        })).catch(() => {});
        await withDbRetry(() => prisma.user.updateMany({
          where: { id: workerId },
          data: {
            lastHeartbeatAt: new Date(),
            isOnline: true
          }
        })).catch(() => {});
      }

      const result = localStore.recordWorkerActivity(workerId);
      return sendSuccess(res, { ...result, heartbeatAt: new Date().toISOString() });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getStats: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const summary = localStore.getWorkerEarningsSummary(workerId);
      return sendSuccess(res, { stats: summary });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getEarnings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      // Auto-settlement check on DB if connected
      if (await checkDb().catch(() => false)) {
        try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const maturedOrders = await prisma.order.findMany({
            where: {
              workerId,
              status: 'COMPLETED',
              earningStatus: 'PENDING',
              completedAt: { lte: oneHourAgo }
            }
          });

          for (const ord of maturedOrders) {
            await prisma.order.update({
              where: { id: ord.id },
              data: { earningStatus: 'RELEASED' }
            }).catch(() => null);

            await prisma.workerEarning.updateMany({
              where: { orderId: ord.id },
              data: { status: 'SETTLED', releasedAt: new Date() }
            }).catch(() => null);

            if (ord.workerAmountPaise > 0) {
              await prisma.worker.update({
                where: { id: workerId },
                data: {
                  walletBalancePaise: { increment: ord.workerAmountPaise },
                  totalEarningsPaise: { increment: ord.workerAmountPaise }
                }
              }).catch(() => null);
            }
          }
        } catch (dbErr: any) {
          console.warn('[Prisma Wallet Settlement notice]:', dbErr?.message);
        }
      }

      const summary = localStore.getWorkerEarningsSummary(workerId);
      const formatted = {
        todayEarnings: paiseToRupees(summary.todayEarningsPaise),
        pendingEarnings: paiseToRupees(summary.pendingEarningsPaise),
        onHoldEarnings: paiseToRupees(summary.onHoldEarningsPaise),
        availableEarnings: paiseToRupees(summary.walletBalancePaise),
        lifetimeEarnings: paiseToRupees(summary.totalEarningsPaise),
        ...summary
      };
      return sendSuccess(res, { earnings: formatted, data: formatted });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  syncWalletBalances: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      if (await checkDb().catch(() => false)) {
        try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const maturedOrders = await prisma.order.findMany({
            where: {
              workerId,
              status: 'COMPLETED',
              earningStatus: 'PENDING',
              completedAt: { lte: oneHourAgo }
            }
          });

          for (const ord of maturedOrders) {
            await prisma.order.update({
              where: { id: ord.id },
              data: { earningStatus: 'RELEASED' }
            }).catch(() => null);

            await prisma.workerEarning.updateMany({
              where: { orderId: ord.id },
              data: { status: 'SETTLED', releasedAt: new Date() }
            }).catch(() => null);

            if (ord.workerAmountPaise > 0) {
              await prisma.worker.update({
                where: { id: workerId },
                data: {
                  walletBalancePaise: { increment: ord.workerAmountPaise },
                  totalEarningsPaise: { increment: ord.workerAmountPaise }
                }
              }).catch(() => null);
            }
          }
        } catch (dbErr: any) {
          console.warn('[Prisma Wallet Sync notice]:', dbErr?.message);
        }
      }

      const summary = localStore.getWorkerEarningsSummary(workerId);
      const formatted = {
        todayEarnings: paiseToRupees(summary.todayEarningsPaise),
        pendingEarnings: paiseToRupees(summary.pendingEarningsPaise),
        onHoldEarnings: paiseToRupees(summary.onHoldEarningsPaise),
        availableEarnings: paiseToRupees(summary.walletBalancePaise),
        lifetimeEarnings: paiseToRupees(summary.totalEarningsPaise),
        ...summary
      };
      return sendSuccess(res, { earnings: formatted, summary: formatted, data: formatted, message: 'Wallet balances synced successfully' });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getEarningsSummary: async (req: AuthenticatedRequest, res: Response) => {
    return workerController.getEarnings(req, res);
  },

  getEarningsHistory: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const { status, dateFrom, dateTo, orderId } = req.query as any;

      const summary = localStore.getWorkerEarningsSummary(workerId);
      let completedOrders = Array.from(localStore.orders.values()).filter(
        o => o.assignedWorkerId === workerId && (o.status === 'COMPLETED' || o.earningStatus === 'RELEASED' || o.earningStatus === 'PENDING')
      );

      if (orderId) completedOrders = completedOrders.filter(o => o.id === orderId);
      if (status) completedOrders = completedOrders.filter(o => o.earningStatus === status || o.status === status);

      if (dateFrom) {
        const fromTime = new Date(dateFrom).getTime();
        completedOrders = completedOrders.filter(o => new Date(o.createdAt).getTime() >= fromTime);
      }
      if (dateTo) {
        const toDateObj = new Date(dateTo);
        toDateObj.setHours(23, 59, 59, 999);
        completedOrders = completedOrders.filter(o => new Date(o.createdAt).getTime() <= toDateObj.getTime());
      }

      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();

      const earnings = completedOrders.map(o => {
        let amountPaise = o.workerAmountPaise || o.workerAmount || o.workerEarningsPaise;
        if (!amountPaise || amountPaise <= 0) {
          const svc = o.serviceId ? (localStore.getService(o.serviceId) || o.service) : null;
          if (svc?.workerAmountPaise) {
            amountPaise = svc.workerAmountPaise;
          } else if (o.adminCommissionPaise !== undefined) {
            amountPaise = Math.max(0, (o.pricePaise || 0) - o.adminCommissionPaise);
          } else {
            amountPaise = o.pricePaise || 0;
          }
        }

        const completedTime = o.completedAt ? new Date(o.completedAt).getTime() : new Date(o.createdAt).getTime();
        const elapsedMs = now - completedTime;
        const unlockAt = completedTime + ONE_HOUR_MS;
        const isPendingSettlement = elapsedMs < ONE_HOUR_MS && o.earningStatus !== 'RELEASED';
        const remainingMs = Math.max(0, unlockAt - now);

        return {
          orderId: o.id,
          serviceName: o.serviceName || (o.serviceSnapshot as any)?.name || 'Cyber Cafe Service',
          workerAmount: paiseToRupees(amountPaise),
          workerAmountPaise: amountPaise,
          status: isPendingSettlement ? 'PENDING' : 'RELEASED',
          isPendingSettlement,
          unlockAt: new Date(unlockAt).toISOString(),
          remainingMs,
          earnedAt: o.completedAt || o.createdAt,
          releasedAt: isPendingSettlement ? null : (o.completedAt || o.createdAt)
        };
      });

      return sendSuccess(res, {
        data: { earnings, summary },
        earnings: { history: earnings, list: earnings, ...summary },
        ...summary
      });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  },

  requestWithdrawal: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      let { amount, amountPaise, method, payoutDetails } = req.body;
      if (amount !== undefined && amountPaise === undefined) {
        amountPaise = Math.round(Number(amount) * 100);
      }

      const reqAmount = Number(amountPaise);
      if (!reqAmount || reqAmount < 10000) {
        return sendError(res, 400, 'INVALID_INPUT', 'Minimum withdrawal amount is ₹100.00 (10000 paise)');
      }

      let dbWithdrawal: any = null;
      const isDbConnected = await checkDb().catch(() => false);

      if (isDbConnected) {
        dbWithdrawal = await prisma.$transaction(async (tx) => {
          const balance = await calculateVerifiedWorkerBalance(tx, workerId);
          // If DB has earnings records, enforce strict ledger check
          if (balance.totalCreditedPaise > 0 && reqAmount > balance.availablePaise) {
            const err: any = new Error(`Insufficient verified ledger balance. Available: ₹${(balance.availablePaise / 100).toFixed(2)}`);
            err.code = 'INSUFFICIENT_AMOUNT';
            err.statusCode = 409;
            throw err;
          }

          const created = await tx.withdrawal.create({
            data: {
              workerId,
              amountPaise: reqAmount,
              status: 'REQUESTED',
              method: method || 'BANK',
              payoutDetails: payoutDetails || null,
            }
          });

          await tx.financialLedger.create({
            data: {
              workerId,
              withdrawalId: created.id,
              type: 'WITHDRAWAL_RESERVED',
              amountPaise: reqAmount,
              status: 'COMPLETED',
              idempotencyKey: `withdrawal_req_${created.id}`,
              metadata: { method, payoutDetails }
            }
          });

          return created;
        });
      }

      const localWithdrawal = localStore.requestWithdrawal(workerId, reqAmount, method || 'BANK', payoutDetails);
      const finalResult = dbWithdrawal || localWithdrawal;

      return sendSuccess(res, { withdrawal: finalResult, data: { withdrawal: finalResult }, message: 'Withdrawal request submitted successfully' });
    } catch (e: any) {
      const statusCode = e.statusCode || (e.code === 'INSUFFICIENT_AMOUNT' ? 409 : 400);
      return sendError(res, statusCode, e.code || 'WITHDRAWAL_FAILED', e.message || 'Withdrawal failed');
    }
  },

  getWithdrawals: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const withdrawals = localStore.getWorkerWithdrawals(workerId);
      return sendSuccess(res, { withdrawals, data: { withdrawals } });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getWithdrawalDetails: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const withdrawalId = String(req.params.withdrawalId || req.params.id);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const withdrawal = localStore.getWithdrawal(withdrawalId);
      if (!withdrawal) return sendError(res, 404, 'WITHDRAWAL_NOT_FOUND', 'Withdrawal record not found');

      if (user.role !== 'ADMIN' && withdrawal.workerId !== user.id) {
        return sendError(res, 403, 'FORBIDDEN', 'Access denied');
      }

      return sendSuccess(res, { withdrawal, data: { withdrawal } });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getNotifications: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const notifications = localStore.getWorkerNotifications(workerId);
      return sendSuccess(res, { notifications });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  markNotificationRead: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const notifId = String(req.params.id);

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const ok = localStore.markNotificationRead(notifId, workerId);
      return sendSuccess(res, { success: ok });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getOrderChat: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const orderId = String(req.params.orderId || req.params.id);

      if (!userId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      let order: any = null;
      try {
        if (await checkDb()) {
          order = await prisma.order.findUnique({ where: { id: orderId } });
        }
      } catch {}

      if (!order) {
        order = localStore.getOrder(orderId);
      }

      if (order) {
        const isCustomer = order.customerId === userId;
        const isWorker = order.assignedWorkerId === userId;
        const isAdmin = req.user?.role === 'ADMIN';

        if (!isCustomer && !isWorker && !isAdmin) {
          return sendError(res, 403, 'FORBIDDEN', 'Access denied to this order conversation');
        }
      }

      const result = localStore.getOrderChat(orderId, userId);
      return sendSuccess(res, { ...result });
    } catch (e: any) {
      if (e.message && e.message.includes('Order not found')) {
        return sendSuccess(res, { isClosed: true, messages: [] });
      }
      return sendError(res, 400, 'CHAT_ERROR', e.message);
    }
  },

  sendChatMessage: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const orderId = String(req.params.orderId || req.params.id);
      const messageText = (req.body?.message || '').trim();

      if (!userId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      let order: any = null;
      let dbOnline = false;
      try {
        dbOnline = await checkDb();
        if (dbOnline) {
          order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true, user: true, worker: true }
          });
        }
      } catch {}

      if (!order) {
        order = localStore.getOrder(orderId);
      }
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      const isCustomer = order.customerId === userId;
      const isWorker = order.assignedWorkerId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isCustomer && !isWorker && !isAdmin) {
        return sendError(res, 403, 'FORBIDDEN', 'Access denied to this order conversation');
      }

      let attachmentUrl: string | undefined = undefined;
      let attachmentName: string | undefined = undefined;

      // Handle replacement document upload if provided
      if (req.file) {
        const file = req.file;
        attachmentName = file.originalname;
        try {
          const key = `clarification_${orderId}_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          attachmentUrl = await storage.upload(key, file.buffer, file.mimetype || 'application/pdf');

          const newDoc = {
            id: `doc_${Date.now()}`,
            name: file.originalname,
            docName: file.originalname,
            fileName: file.originalname,
            mimeType: file.mimetype || 'application/pdf',
            size: file.size,
            url: attachmentUrl,
            createdAt: new Date().toISOString()
          };

          if (!order.documents) order.documents = [];
          order.documents.push(newDoc);

          if (dbOnline) {
            await prisma.document.create({
              data: {
                orderId: order.id,
                customerId: order.customerId,
                workerId: order.assignedWorkerId,
                type: 'CLARIFICATION_DOCUMENT',
                fileName: file.originalname,
                mimeType: file.mimetype || 'application/pdf',
                size: file.size,
                storageKey: key,
                url: attachmentUrl,
                name: file.originalname,
                docName: file.originalname
              }
            }).catch(() => {});
          }
        } catch (upErr: any) {
          console.warn('[Clarification doc upload notice]:', upErr?.message);
        }
      }

      if (!messageText && !attachmentUrl) {
        return sendError(res, 400, 'INVALID_INPUT', 'Message or file attachment is required');
      }

      const senderRole: 'WORKER' | 'CUSTOMER' | 'ADMIN' = isWorker ? 'WORKER' : (isCustomer ? 'CUSTOMER' : 'ADMIN');
      const senderName = isWorker
        ? (localStore.getWorker(userId)?.name || req.user?.name || 'Operator')
        : (isCustomer ? (req.user?.name || 'Customer') : 'Support Admin');

      const chatMsg = localStore.addChatMessage(
        orderId,
        userId,
        senderRole,
        senderName,
        messageText || (attachmentName ? `Uploaded clarification file: ${attachmentName}` : 'Updated document provided.'),
        attachmentUrl,
        attachmentName
      );

      // If customer replied while order was in WAITING_FOR_CUSTOMER, move back to IN_PROGRESS
      if (isCustomer && order.status === 'WAITING_FOR_CUSTOMER') {
        order.status = 'IN_PROGRESS';
        if (dbOnline) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'IN_PROGRESS' }
          }).catch(() => {});
        }
        broadcastEvent('ORDER_STATUS_UPDATED', { orderId, status: 'IN_PROGRESS' });
      }

      localStore.saveOrder(order);

      // Realtime notification broadcast to all portals
      broadcastEvent('ORDER_CHAT_MESSAGE', { orderId, message: chatMsg });

      return sendSuccess(res, { message: chatMsg, order });
    } catch (e: any) {
      return sendError(res, 400, 'CHAT_SEND_FAILED', e.message);
    }
  },

  requestClarification: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const orderId = String(req.params.id || req.params.orderId);
      const { message, reason } = req.body;

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      if (!message || !message.trim()) {
        return sendError(res, 400, 'INVALID_INPUT', 'Please specify the clarification message for the customer');
      }

      let order: any = null;
      let dbOnline = false;
      try {
        dbOnline = await checkDb();
        if (dbOnline) {
          order = await prisma.order.findUnique({ where: { id: orderId } });
        }
      } catch {}

      if (!order) {
        order = localStore.getOrder(orderId);
      }
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      if (dbOnline) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'WAITING_FOR_CUSTOMER' }
        }).catch(() => {});
      }
      order.status = 'WAITING_FOR_CUSTOMER';

      const worker = localStore.getWorker(workerId);
      const chatMsg = localStore.addChatMessage(
        orderId,
        workerId,
        'WORKER',
        worker?.name || req.user?.name || 'Operator',
        message.trim()
      );

      localStore.saveOrder(order);

      // Broadcast real-time SSE events to Customer App and Worker
      broadcastEvent('ORDER_STATUS_UPDATED', { orderId, status: 'WAITING_FOR_CUSTOMER' });
      broadcastEvent('ORDER_CLARIFICATION_REQUESTED', { orderId, message: chatMsg, reason: reason || 'Customer clarification needed' });

      return sendSuccess(res, { order, message: chatMsg });
    } catch (e: any) {
      return sendError(res, 400, 'CLARIFICATION_REQUEST_FAILED', e.message);
    }
  },

  getSupportTickets: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const tickets = localStore.getWorkerTickets(workerId);
      return sendSuccess(res, { tickets });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  createSupportTicket: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const { category, subject, message, orderId } = req.body;

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      if (!subject || !message) return sendError(res, 400, 'INVALID_INPUT', 'Subject and message are required');

      const ticket = localStore.createWorkerTicket(workerId, {
        category: category || 'General',
        subject: subject.trim(),
        message: message.trim(),
        orderId
      });
      return sendSuccess(res, { ticket, message: 'Ticket submitted successfully' });
    } catch (e: any) {
      return sendError(res, 400, 'TICKET_CREATE_FAILED', e.message);
    }
  },

  replySupportTicket: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      const ticketId = String(req.params.id);
      const { message } = req.body;

      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      if (!message || !message.trim()) return sendError(res, 400, 'INVALID_INPUT', 'Reply message is required');

      const ticket = localStore.addWorkerTicketReply(ticketId, workerId, message.trim());
      return sendSuccess(res, { ticket, message: 'Reply sent successfully' });
    } catch (e: any) {
      return sendError(res, 400, 'TICKET_REPLY_FAILED', e.message);
    }
  },

  getProfile: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      let worker = localStore.getWorker(workerId);
      const isDbOnline = await checkDb().catch(() => false);
      if (isDbOnline) {
        try {
          const dbWorker = await prisma.worker.findUnique({
            where: { id: workerId }
          });
          if (dbWorker) {
            if (worker) {
              worker.isOnline = dbWorker.isOnline;
              worker.accountStatus = (dbWorker.status as any) || worker.accountStatus;
            } else {
              worker = {
                id: dbWorker.id,
                name: dbWorker.name,
                email: dbWorker.email,
                phone: dbWorker.phone,
                businessName: dbWorker.businessName || '',
                address: dbWorker.address || '',
                city: dbWorker.city || '',
                skills: (dbWorker.skills as string[]) || [],
                bankDetails: (dbWorker.bankDetails as any) || { accountNumber: '', ifsc: '', accountHolderName: '', upiId: '' },
                activeJobs: 0,
                completedJobs: 0,
                rating: dbWorker.rating || 5.0,
                isOnline: dbWorker.isOnline,
                accountStatus: (dbWorker.status as any) || 'ACTIVE',
                lastActivityAt: (dbWorker.lastActivityAt || new Date()).toISOString(),
                walletBalancePaise: dbWorker.walletBalancePaise || 0,
                pendingEarningsPaise: 0,
                onHoldEarningsPaise: 0,
                totalEarningsPaise: 0,
                averageCompletionMinutes: 45,
                reviews: []
              };
              localStore.saveWorker(worker);
            }
          }
        } catch (dbErr: any) {
          console.warn('[getProfile DB Notice]:', dbErr?.message);
        }
      }

      if (!worker) return sendError(res, 404, 'WORKER_NOT_FOUND', 'Worker profile not found');

      return sendSuccess(res, { profile: worker });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  updateProfile: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const updated = localStore.updateWorkerProfile(workerId, req.body);
      return sendSuccess(res, { profile: updated, message: 'Profile updated successfully' });
    } catch (e: any) {
      return sendError(res, 400, 'PROFILE_UPDATE_FAILED', e.message);
    }
  },

  proposeService: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const body = req.body || {};
      const requestedPaise = Number(body.requestedWorkerAmountPaise || body.workerAmountPaise || body.pricePaise || body.suggestedPricePaise || 0);
      const suggestedPrice = Number(body.suggestedPricePaise || body.pricePaise || requestedPaise);

      let proposal: any = null;
      if (await checkDb().catch(() => false)) {
        try {
          proposal = await prisma.serviceProposal.create({
            data: {
              workerId,
              name: String(body.name || '').trim(),
              description: String(body.description || '').trim(),
              category: String(body.category || 'General').trim(),
              suggestedPricePaise: suggestedPrice,
              requestedWorkerAmountPaise: requestedPaise,
              estimatedTime: String(body.estimatedTime || '24-48 Hours').trim(),
              requiredDocuments: Array.isArray(body.requiredDocuments)
                ? body.requiredDocuments
                : typeof body.requiredDocuments === 'string'
                ? body.requiredDocuments.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
              formSchema: body.formSchema || null,
              applicationTypes: body.applicationTypes || null,
              status: 'PENDING_APPROVAL'
            },
            include: { worker: { select: { id: true, name: true, email: true } } }
          });
        } catch (dbErr: any) {
          console.warn('[Proposal DB Create Notice]:', dbErr.message);
        }
      }

      if (!proposal) {
        proposal = localStore.proposeService(workerId, body);
      } else {
        localStore.proposeService(workerId, { ...body, id: proposal.id });
      }

      return sendSuccess(res, { proposal, message: 'Service proposal submitted for admin review' });
    } catch (e: any) {
      return sendError(res, 500, 'PROPOSAL_FAILED', e.message);
    }
  },

  getProposals: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      if (await checkDb().catch(() => false)) {
        try {
          const dbProposals = await prisma.serviceProposal.findMany({
            where: { workerId },
            include: { worker: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
          });
          if (dbProposals && dbProposals.length > 0) {
            return sendSuccess(res, { proposals: dbProposals });
          }
        } catch { }
      }

      const proposals = localStore.getWorkerProposals(workerId);
      return sendSuccess(res, { proposals });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  }
};

// ==========================================
// ADMIN CONTROLLER
// ==========================================


const slugify = (input: string): string =>
  (input || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const normalizeStringArray = (value: any): string[] => {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// Resolve pricing fields from a raw admin payload. Accepts rupee-based
// `workerAmount`/`platformFee` (×100) or paise-based `*Paise` fields.
const resolveServicePricing = (body: any): {
  pricePaise: number;
  workerAmountPaise: number;
  adminCommissionPaise: number;
  platformFeePaise: number;
} => {
  const toPaise = (v: any): number | null => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  };

  const pricePaise = toPaise(body.pricePaise);
  const workerAmountPaise =
    toPaise(body.workerAmountPaise) ??
    (toPaise(body.workerAmount) !== null ? toPaise(body.workerAmount)! * 100 : null);
  const platformFeePaise =
    toPaise(body.platformFeePaise) ??
    toPaise(body.adminCommissionPaise) ??
    (toPaise(body.platformFee) !== null ? toPaise(body.platformFee)! * 100 : null);

  // Invariant: price = worker payout + platform commission/fee
  const worker = workerAmountPaise ?? 0;
  const fee = platformFeePaise ?? 0;
  const finalPrice = pricePaise ?? (worker + fee > 0 ? worker + fee : 0);
  const finalWorker = workerAmountPaise ?? Math.max(0, finalPrice - fee);
  const finalFee = platformFeePaise ?? Math.max(0, finalPrice - finalWorker);

  return { pricePaise: finalPrice, workerAmountPaise: finalWorker, adminCommissionPaise: finalFee, platformFeePaise: finalFee };
};

export const adminController = {
  // 1. Dashboard
  getDashboardStats: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (await checkDb().catch(() => false)) {
        try {
          const [totalCustomers, totalWorkers, activeOrders, pendingWithdrawals, paidPayments, complaintsCount, availableOrders] = await Promise.all([
            prisma.user.count({ where: { role: 'CUSTOMER' } }).catch(() => 0),
            prisma.worker.count().catch(() => prisma.user.count({ where: { role: 'WORKER' } })).catch(() => 0),
            prisma.order.count({
              where: {
                status: { in: ['ACCEPTED', 'IN_PROGRESS', 'RECEIPT_SUBMITTED', 'WAITING_FOR_CUSTOMER' as any] }
              }
            }).catch(() => 0),
            prisma.withdrawal.count({ where: { status: { in: ['PENDING', 'REQUESTED'] } } }).catch(() => 0),
            prisma.payment.aggregate({
              _sum: { amountPaise: true },
              where: { status: 'PAID' }
            }).catch(() => ({ _sum: { amountPaise: 0 } })),
            prisma.complaint.count({
              where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } }
            }).catch(() => 0),
            prisma.order.count({
              where: {
                status: { in: ['CREATED', 'AVAILABLE', 'PAYMENT_PENDING', 'PAID'] },
                AND: [
                  { OR: [{ workerId: null }, { workerId: '' }] },
                  { OR: [{ assignedWorkerId: null }, { assignedWorkerId: '' }] }
                ]
              }
            }).catch(() => 0)
          ]);

          const revenuePaise = paidPayments._sum?.amountPaise || 0;
          const commissionAgg = await prisma.order.aggregate({
            _sum: { adminCommissionPaise: true }
          }).catch(() => ({ _sum: { adminCommissionPaise: 0 } }));
          const totalCommissionPaise = commissionAgg._sum?.adminCommissionPaise || 0;

          const stats = {
            totalCustomers,
            totalWorkers,
            activeOrders,
            availableOrders,
            pendingOrders: availableOrders,
            pendingWithdrawals,
            totalRevenue: paiseToRupees(revenuePaise),
            totalRevenuePaise: revenuePaise,
            totalCommissionPaise,
            revenuePaise,
            totalOrders: await prisma.order.count().catch(() => 0),
            complaintsDisputes: complaintsCount,
            activeComplaints: complaintsCount,
            pendingProposals: await prisma.serviceProposal.count({ where: { status: 'PENDING_APPROVAL' } }).catch(() => 0)
          };

          return sendSuccess(res, { stats, ...stats });
        } catch { }
      }

      const stats = localStore.getAdminDashboardStats();
      return sendSuccess(res, { stats, ...stats });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  // 2. Worker Management
  getWorkers: async (req: AuthenticatedRequest, res: Response) => {
    try {
      let status = String(req.query.status || '');
      if (status === 'ALL' || status === 'All Status' || status === 'undefined') status = '';
      const search = String(req.query.search || '').trim();

      if (await checkDb().catch(() => false)) {
        try {
          const where: any = {};
          if (status) where.status = status;
          if (search) {
            where.OR = [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { id: { contains: search, mode: 'insensitive' } },
              { specialization: { contains: search, mode: 'insensitive' } }
            ];
          }

          const dbWorkers = await prisma.worker.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
              _count: { select: { orders: true } },
              orders: {
                select: {
                  id: true,
                  status: true,
                  workerAmountPaise: true
                }
              }
            }
          });

          if (dbWorkers && dbWorkers.length > 0) {
            const formatted = dbWorkers.map(w => {
              const completedOrders = w.orders.filter(o => o.status === 'COMPLETED');
              const activeOrders = w.orders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'ACCEPTED' || o.status === 'WAITING_FOR_CUSTOMER');
              const earnedPaise = completedOrders.reduce((sum, o) => sum + (o.workerAmountPaise || 0), 0);
              return {
                id: w.id,
                workerId: w.id,
                name: w.name,
                email: w.email,
                phone: w.phone || 'N/A',
                specialization: w.specialization || 'Operator',
                status: w.status,
                kycStatus: w.kycStatus,
                isOnline: w.isOnline,
                totalOrders: w._count?.orders || w.orders.length,
                completedOrders: completedOrders.length,
                activeOrders: activeOrders.length,
                walletBalancePaise: w.walletBalancePaise,
                totalEarningsPaise: w.totalEarningsPaise || earnedPaise,
                totalEarningsRupees: (w.totalEarningsPaise || earnedPaise) / 100,
                createdAt: w.createdAt,
                updatedAt: w.updatedAt
              };
            });
            return sendSuccess(res, { workers: formatted });
          }
        } catch (dbErr: any) {
          console.warn('[AdminController] DB getWorkers fallback:', dbErr.message);
        }
      }

      const workers = localStore.getAllWorkersAdmin({ status, search });
      return sendSuccess(res, { workers });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getWorkerDetails: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = String(req.params.id);
      const data = localStore.getWorkerDetailedAdmin(workerId);
      return sendSuccess(res, { ...data });
    } catch (e: any) {
      return sendError(res, 404, 'WORKER_NOT_FOUND', e.message);
    }
  },

  createWorker: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        workerName,
        name: rawName,
        workerId: rawWorkerId,
        username,
        password,
        confirmPassword,
        mobile,
        phone: rawPhone,
        email,
        businessName,
        address,
        city,
        skills,
        accountNumber,
        ifsc,
        accountHolderName,
        upiId,
        bankDetails
      } = req.body;

      const workerId = String(rawWorkerId || username || ('wrk_' + Math.random().toString(36).substring(2, 9))).trim();
      const name = String(workerName || rawName || '').trim();
      const emailLower = String(email || '').trim().toLowerCase();
      const phone = String(mobile || rawPhone || '').trim();

      if (!name) return sendError(res, 400, 'INVALID_INPUT', 'Worker name is required');
      if (!workerId || workerId.length < 3) return sendError(res, 400, 'INVALID_INPUT', 'Worker ID must be at least 3 characters');
      if (/\s/.test(workerId)) return sendError(res, 400, 'INVALID_INPUT', 'Worker ID cannot contain spaces');
      if (!emailLower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) return sendError(res, 400, 'INVALID_INPUT', 'Valid email is required');
      if (!phone) return sendError(res, 400, 'INVALID_INPUT', 'Mobile number is required');

      const pass = password || 'password123';
      if (password && password.length < 6) return sendError(res, 400, 'INVALID_INPUT', 'Password must be at least 6 characters');
      if (confirmPassword && password !== confirmPassword) return sendError(res, 400, 'INVALID_INPUT', 'Passwords do not match');

      // Check duplicates in local store
      if (
        localStore.workers.some(w => w.id.toLowerCase() === workerId.toLowerCase()) ||
        localStore.findUserById(workerId)
      ) {
        return sendError(res, 409, 'DUPLICATE_ID', `Worker ID "${workerId}" is already taken`);
      }
      if (localStore.findUserByEmail(emailLower)) {
        return sendError(res, 409, 'DUPLICATE_EMAIL', `Email "${emailLower}" is already in use`);
      }

      // Multer file processing (support both single files and fields)
      let idProofUrl = String(req.body.idProof || '');
      let photoUrl = String(req.body.photo || '');

      const filesList: Express.Multer.File[] = [];
      if (Array.isArray(req.files)) {
        filesList.push(...req.files);
      } else if (req.files && typeof req.files === 'object') {
        Object.values(req.files).forEach(f => filesList.push(...f));
      }

      for (const file of filesList) {
        const fileKey = `workers/${workerId}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        try {
          await storage.upload(fileKey, file.buffer, file.mimetype);
        } catch { }

        fileBufferStore.set(fileKey, {
          buffer: file.buffer,
          mimeType: file.mimetype,
          fileName: file.originalname,
          createdAt: Date.now()
        });

        const streamUrl = `/api/documents/stream/${encodeURIComponent(fileKey)}`;
        if (file.fieldname === 'idProofFile' || file.fieldname === 'idProof') {
          idProofUrl = streamUrl;
        } else if (file.fieldname === 'photoFile' || file.fieldname === 'photo') {
          photoUrl = streamUrl;
        }
      }

      const hashedPassword = await bcrypt.hash(pass, 10);

      // Check DB duplication and insert strictly into Worker table
      let createdWorker: any = null;
      if (await checkDb().catch(() => false)) {
        try {
          const existingDbWorker = await prisma.worker.findFirst({
            where: { OR: [{ id: workerId }, { email: emailLower }] }
          });
          if (existingDbWorker) {
            return sendError(res, 409, 'DUPLICATE_USER', 'Worker ID or Email is already registered in Worker registry');
          }

          createdWorker = await prisma.worker.create({
            data: {
              id: workerId,
              email: emailLower,
              name,
              passwordHash: hashedPassword,
              phone: phone || null,
              specialization: businessName || skills || 'Digital Seva Specialist',
              skills: skills ? (typeof skills === 'string' ? JSON.parse(skills) : skills) : null,
              status: 'ACTIVE',
              kycStatus: 'VERIFIED',
              walletBalancePaise: 0,
              totalEarningsPaise: 0,
              profileImage: photoUrl || undefined,
              businessName,
              address,
              city
            }
          });

          const actorInDb = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null) : null;
          await prisma.auditLog.create({
            data: {
              actorUserId: actorInDb ? req.user?.id : null,
              action: 'WORKER_HIRED',
              entityType: 'Worker',
              entityId: workerId,
              metadata: { name, email: emailLower, specialization: businessName || skills, actor: req.user?.id || 'ADMIN' }
            }
          }).catch(() => {});
        } catch (dbErr: any) {
          console.warn('[AdminController] DB worker creation error:', dbErr.message);
        }
      }

      const worker = localStore.createWorkerAdmin({
        workerName: name,
        workerId: createdWorker?.id || workerId,
        username: workerId,
        password: pass,
        passwordHash: hashedPassword,
        mobile: phone,
        email: emailLower,
        businessName,
        address,
        city,
        skills,
        idProof: idProofUrl,
        photo: photoUrl,
        accountNumber,
        ifsc,
        accountHolderName,
        upiId,
        bankDetails
      });

      return sendSuccess(res, {
        worker: createdWorker || worker,
        message: `Worker account created successfully! User ID: ${workerId}`
      }, 201);
    } catch (e: any) {
      return sendError(res, 400, 'CREATE_WORKER_FAILED', e.message);
    }
  },

  resetWorkerPassword: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = String(req.params.id);
      const tempPassword = req.body?.newPassword || `Temp@${Math.floor(100000 + Math.random() * 900000)}`;

      const result = await localStore.resetWorkerPasswordAdmin(workerId, tempPassword);

      if (await checkDb().catch(() => false)) {
        try {
          const hashedPassword = await bcrypt.hash(tempPassword, 10);
          await prisma.worker.updateMany({
            where: { OR: [{ id: workerId }, { email: workerId }] },
            data: { passwordHash: hashedPassword }
          });
        } catch { }
      }

      return sendSuccess(res, {
        message: `Temporary password reset successfully to: ${tempPassword}`,
        tempPassword,
        worker: (result as any)?.worker || localStore.getWorker(workerId)
      });
    } catch (e: any) {
      return sendError(res, 400, 'PASSWORD_RESET_FAILED', e.message);
    }
  },

  verifyWorker: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = String(req.params.id);
      const { approved, note } = req.body;
      const worker = localStore.verifyWorkerAdmin(workerId, Boolean(approved), note);

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.worker.updateMany({
            where: { OR: [{ id: workerId }, { email: workerId }] },
            data: {
              kycStatus: approved ? 'VERIFIED' : 'REJECTED',
              status: approved ? 'ACTIVE' : 'SUSPENDED'
            }
          });
        } catch { }
      }

      return sendSuccess(res, {
        worker,
        message: approved ? 'Worker verified and activated' : 'Verification rejected'
      });
    } catch (e: any) {
      return sendError(res, 400, 'VERIFY_FAILED', e.message);
    }
  },

  setWorkerStatus: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = String(req.params.id);
      const { status, reason } = req.body;
      const worker = localStore.setWorkerAccountStatusAdmin(workerId, status, reason);

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.worker.updateMany({
            where: { OR: [{ id: workerId }, { email: workerId }] },
            data: { status }
          });
        } catch { }
      }

      return sendSuccess(res, { worker, message: `Worker status updated to ${status}` });
    } catch (e: any) {
      return sendError(res, 400, 'STATUS_UPDATE_FAILED', e.message);
    }
  },

  deleteWorker: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workerId = String(req.params.id);
      const reason = req.body?.reason || 'Deactivated by Admin';

      const result = localStore.deleteWorkerAdmin(workerId, reason);

      if (await checkDb().catch(() => false)) {
        try {
          await prisma.worker.updateMany({
            where: { OR: [{ id: workerId }, { email: workerId }] },
            data: { status: 'DELETED' }
          });

          const actorInDb = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null) : null;
          await prisma.auditLog.create({
            data: {
              actorUserId: actorInDb ? req.user?.id : null,
              action: 'WORKER_DELETED',
              entityType: 'Worker',
              entityId: workerId,
              metadata: { reason, actor: req.user?.id || 'ADMIN' }
            }
          }).catch(() => {});
        } catch { }
      }

      return sendSuccess(res, { message: result.message, workerId });
    } catch (e: any) {
      return sendError(res, 400, 'DELETE_FAILED', e.message);
    }
  },

  // 3. Customer Management
  getCustomers: async (req: AuthenticatedRequest, res: Response) => {
    try {
      let status = String(req.query.status || '');
      if (status === 'ALL' || status === 'All Status' || status === 'undefined') status = '';
      const search = String(req.query.search || req.query.q || '').trim();

      try {
        const where: any = { role: 'CUSTOMER' };
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } }
          ];
        }

        const dbCustomers = await withDbRetry(() =>
          prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              address: true,
              createdAt: true,
              _count: { select: { ordersAsCustomer: true } },
              ordersAsCustomer: {
                select: {
                  id: true,
                  customerPaidAmountPaise: true,
                  workerAmountPaise: true,
                  adminCommissionPaise: true,
                  status: true,
                  paymentStatus: true,
                  createdAt: true
                },
                orderBy: { createdAt: 'desc' }
              }
            }
          })
        );

        if (dbCustomers) {
          const formatted = dbCustomers.map(c => {
            const paidOrders = c.ordersAsCustomer?.filter(o => o.paymentStatus === 'PAID') || [];
            const totalSpentPaise = paidOrders.reduce((sum, o) => sum + (o.customerPaidAmountPaise || 0), 0);
            const ordersCount = c._count?.ordersAsCustomer ?? c.ordersAsCustomer?.length ?? 0;
            const lastOrderAt = c.ordersAsCustomer?.[0]?.createdAt || null;
            const accountStatus = c.status || 'ACTIVE';
            return {
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone || '',
              status: accountStatus,
              isVerified: true,
              isActive: accountStatus !== 'BLOCKED' && accountStatus !== 'SUSPENDED',
              createdAt: c.createdAt,
              ordersCount,
              totalOrders: ordersCount,
              totalSpentPaise,
              lastOrderAt,
              recentOrders: c.ordersAsCustomer?.slice(0, 5) || []
            };
          });

          return sendSuccess(res, {
            customers: formatted,
            total: formatted.length,
            data: formatted
          });
        }
      } catch (dbErr: any) {
        console.warn('[Admin getCustomers DB Notice]:', dbErr?.message);
      }

      const rawStoreCustomers = localStore.getAllCustomersAdmin({ status, search });
      const customers = (rawStoreCustomers || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        status: c.status || 'ACTIVE',
        isVerified: true,
        isActive: c.status !== 'BLOCKED' && c.status !== 'SUSPENDED',
        createdAt: c.createdAt,
        ordersCount: c.ordersCount || c.totalOrders || 0,
        totalOrders: c.ordersCount || c.totalOrders || 0,
        totalSpentPaise: c.totalSpentPaise || 0,
        lastOrderAt: c.lastOrderAt || null,
        recentOrders: c.recentOrders || []
      }));

      return sendSuccess(res, {
        customers,
        total: customers.length,
        data: customers
      });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getCustomerDetails: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customerId = String(req.params.id);

      try {
        const dbCustomer = await withDbRetry(() =>
          prisma.user.findFirst({
            where: { id: customerId, role: 'CUSTOMER' },
            include: {
              ordersAsCustomer: {
                include: {
                  service: true,
                  payments: true
                },
                orderBy: { createdAt: 'desc' }
              },
              complaints: {
                orderBy: { createdAt: 'desc' }
              }
            }
          })
        );

        if (dbCustomer) {
          const orders = (dbCustomer.ordersAsCustomer || []).map(o => {
            const serviceSnapshot = typeof o.serviceSnapshot === 'object' ? o.serviceSnapshot : {};
            const serviceName = (serviceSnapshot as any)?.name || o.service?.name || 'Service Order';
            return {
              id: o.id,
              orderNumber: o.orderNumber,
              serviceName,
              serviceId: o.serviceId,
              status: o.status,
              paymentStatus: o.paymentStatus,
              pricePaise: o.customerPaidAmountPaise || o.service?.pricePaise || 0,
              customerPaidAmountPaise: o.customerPaidAmountPaise,
              workerAmountPaise: o.workerAmountPaise,
              adminCommissionPaise: o.adminCommissionPaise,
              createdAt: o.createdAt
            };
          });

          const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
          const totalSpentPaise = paidOrders.reduce((sum, o) => sum + (o.customerPaidAmountPaise || o.pricePaise || 0), 0);
          const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length;

          return sendSuccess(res, {
            customer: {
              id: dbCustomer.id,
              name: dbCustomer.name,
              email: dbCustomer.email,
              phone: dbCustomer.phone,
              address: dbCustomer.address,
              status: dbCustomer.status || 'ACTIVE',
              isVerified: true,
              createdAt: dbCustomer.createdAt,
              updatedAt: dbCustomer.updatedAt
            },
            orders,
            stats: {
              totalOrders: orders.length,
              totalSpentPaise,
              totalSpentRupees: totalSpentPaise / 100,
              activeOrders,
              completedOrders: orders.filter(o => o.status === 'COMPLETED').length,
              complaintsCount: dbCustomer.complaints?.length || 0
            },
            complaints: dbCustomer.complaints || []
          });
        }
      } catch (dbErr: any) {
        console.warn('[Admin getCustomerDetails DB Notice]:', dbErr?.message);
      }

      const data = localStore.getCustomerDetailedAdmin(customerId);
      return sendSuccess(res, { ...data });
    } catch (e: any) {
      return sendError(res, 404, 'CUSTOMER_NOT_FOUND', e.message);
    }
  },

  setCustomerStatus: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customerId = String(req.params.id);
      const { status, reason } = req.body;

      try {
        await withDbRetry(() =>
          prisma.user.update({
            where: { id: customerId },
            data: { status }
          })
        );

        await withDbRetry(() =>
          prisma.auditLog.create({
            data: {
              actorUserId: req.user?.id || 'ADMIN',
              action: 'CUSTOMER_STATUS_UPDATE',
              entityType: 'User',
              entityId: customerId,
              metadata: { newStatus: status, reason }
            }
          })
        );
      } catch (dbErr: any) {
        console.warn('[Admin setCustomerStatus DB Notice]:', dbErr?.message);
      }

      const customer = localStore.setCustomerStatusAdmin(customerId, status, reason);
      return sendSuccess(res, { customer, message: `Customer status updated to ${status}` });
    } catch (e: any) {
      return sendError(res, 400, 'STATUS_UPDATE_FAILED', e.message);
    }
  },

  // 4. Order Management
  getOrders: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawStatus = String(req.query.status || '').trim();
      const status = rawStatus.toUpperCase();
      const search = String(req.query.search || req.query.q || '').trim();

      if (await checkDb().catch(() => false)) {
        try {
          const where: any = {};
          if (status && status !== 'ALL' && status !== 'ALL ORDERS' && status !== 'UNDEFINED') {
            if (['PENDING', 'AVAILABLE', 'NEW', 'UNASSIGNED'].includes(status)) {
              where.OR = [
                { status: { in: ['CREATED', 'AVAILABLE', 'PAID', 'PENDING', 'PAYMENT_PENDING'] as any } },
                {
                  AND: [
                    { status: { notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED'] as any } },
                    { OR: [{ workerId: null }, { workerId: '' }] },
                    { OR: [{ assignedWorkerId: null }, { assignedWorkerId: '' }] }
                  ]
                }
              ];
            } else if (['IN_PROGRESS', 'ACTIVE'].includes(status)) {
              where.status = { in: ['IN_PROGRESS', 'ACCEPTED', 'ASSIGNED', 'PROCESSING', 'WAITING_FOR_CUSTOMER', 'RECEIPT_SUBMITTED'] as any };
            } else if (['COMPLETED', 'DELIVERED'].includes(status)) {
              where.status = { in: ['COMPLETED', 'DELIVERED', 'WORK_COMPLETED'] as any };
            } else if (['CORRECTION_REQUESTED', 'REVISION_REQUIRED'].includes(status)) {
              where.status = { in: ['REVISION_REQUIRED', 'CORRECTION_REQUESTED'] as any };
            } else if (['ON_HOLD', 'DISPUTED'].includes(status)) {
              where.status = { in: ['ON_HOLD', 'DISPUTED'] as any };
            } else if (['CANCELLED'].includes(status)) {
              where.status = { in: ['CANCELLED'] as any };
            } else if (['REFUNDED'].includes(status)) {
              where.status = { in: ['CANCELLED', 'REFUNDED'] as any };
            } else {
              where.status = rawStatus as any;
            }
          }

          if (search) {
            where.AND = [
              ...(where.AND || []),
              {
                OR: [
                  { id: { contains: search, mode: 'insensitive' } },
                  { orderNumber: { contains: search, mode: 'insensitive' } },
                  { customer: { name: { contains: search, mode: 'insensitive' } } },
                  { user: { name: { contains: search, mode: 'insensitive' } } },
                  { service: { name: { contains: search, mode: 'insensitive' } } }
                ]
              }
            ];
          }

          const dbOrders = await prisma.order.findMany({
            where,
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              customer: { select: { id: true, name: true, email: true, phone: true } },
              worker: { select: { id: true, name: true, email: true, phone: true, specialization: true, status: true } },
              service: true,
              payments: true,
              receipts: true,
              documents: true,
              job: { include: { worker: true } }
            },
            orderBy: { createdAt: 'desc' }
          });

          const formattedOrders = dbOrders.map(o => {
            const rawUser = o.user || o.customer;
            const formData = (typeof o.formData === 'object' && o.formData !== null) ? (o.formData as any) : {};
            const customerObj = rawUser ? {
              id: rawUser.id,
              name: rawUser.name || formData.fullName || formData.name || 'Customer',
              email: rawUser.email,
              phone: rawUser.phone || formData.phone || formData.mobile || 'N/A'
            } : (formData.fullName || formData.name ? {
              id: o.customerId || o.userId || 'N/A',
              name: formData.fullName || formData.name,
              email: formData.email || 'N/A',
              phone: formData.phone || formData.mobile || 'N/A'
            } : null);

            const rawWorker = o.worker || (o.job?.worker);
            const boundId = String(o.workerId || o.assignedWorkerId || '');
            const localWorker = boundId ? localStore.getWorker(boundId) : null;
            const workerObj = rawWorker ? {
              id: rawWorker.id,
              workerId: rawWorker.id,
              name: rawWorker.name,
              email: rawWorker.email,
              phone: rawWorker.phone || 'N/A',
              specialization: rawWorker.specialization || 'Operator',
              status: rawWorker.status || 'ACTIVE'
            } : (boundId ? {
              id: boundId,
              workerId: boundId,
              name: localWorker?.name || 'Assigned Operator',
              email: localWorker?.email || 'N/A',
              phone: localWorker?.phone || (localWorker as any)?.mobile || 'N/A',
              specialization: 'Operator',
              status: 'ACTIVE'
            } : null);

            const pricingObj = (typeof o.pricing === 'object' && o.pricing !== null) ? (o.pricing as any) : {
              pricePaise: o.customerPaidAmountPaise || 0,
              workerEarningPaise: (o.customerPaidAmountPaise || 0) - (o.adminCommissionPaise || 0),
              adminCommissionPaise: o.adminCommissionPaise || 0
            };

            const serviceSnapshotObj = (typeof o.serviceSnapshot === 'object' && o.serviceSnapshot !== null) ? (o.serviceSnapshot as any) : {
              id: o.serviceId,
              name: o.service?.name || (formData as any)?.serviceName || 'Cyber Cafe Service',
              category: o.service?.category || 'Service'
            };

            return {
              ...o,
              customer: customerObj,
              user: customerObj,
              worker: workerObj,
              assignedWorker: workerObj,
              job: o.job || (workerObj ? { worker: workerObj, workerId: workerObj.id, status: o.status } : null),
              workerId: workerObj?.id || o.workerId || o.assignedWorkerId || null,
              pricing: pricingObj,
              serviceSnapshot: serviceSnapshotObj
            };
          });

          return sendSuccess(res, { orders: formattedOrders, data: formattedOrders, total: formattedOrders.length });
        } catch (dbErr: any) {
          console.warn('[Admin getOrders DB Notice]:', dbErr?.message);
        }
      }

      const orders = localStore.getAllOrdersAdmin({ status, search });
      const formattedLocal = orders.map(o => {
        const workerInfo = o.assignedWorkerId ? localStore.getWorker(o.assignedWorkerId) : null;
        return {
          ...o,
          customer: o.customer || {
            id: o.customerId,
            name: o.customerName || (o.formData as any)?.fullName || 'Customer',
            email: o.customerEmail || 'N/A',
            phone: o.customerPhone || (o.formData as any)?.phone || 'N/A'
          },
          worker: workerInfo ? {
            id: workerInfo.id,
            workerId: workerInfo.id,
            name: workerInfo.name,
            email: workerInfo.email,
            phone: (workerInfo as any).mobile || (workerInfo as any).phone || 'N/A',
            specialization: 'Operator',
            status: workerInfo.status || 'ACTIVE'
          } : null
        };
      });
      return sendSuccess(res, { orders: formattedLocal, data: formattedLocal, total: formattedLocal.length });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getOrderDetails: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.id);
      if (await checkDb().catch(() => false)) {
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              customer: { select: { id: true, name: true, email: true, phone: true } },
              worker: { select: { id: true, name: true, email: true, phone: true, specialization: true, status: true } },
              service: { include: { applicationTypesList: true } },
              payments: { orderBy: { createdAt: 'desc' } },
              documents: true,
              receipts: true,
              complaints: true,
              job: { include: { worker: true } }
            }
          });
          if (order) {
            const rawUser = order.user || order.customer;
            const formData = (typeof order.formData === 'object' && order.formData !== null) ? (order.formData as any) : {};
            const customerObj = rawUser ? {
              id: rawUser.id,
              name: rawUser.name || formData.fullName || formData.name || 'Customer',
              email: rawUser.email,
              phone: rawUser.phone || formData.phone || formData.mobile || 'N/A'
            } : (formData.fullName || formData.name ? {
              id: order.customerId || order.userId || 'N/A',
              name: formData.fullName || formData.name,
              email: formData.email || 'N/A',
              phone: formData.phone || formData.mobile || 'N/A'
            } : null);

            const rawWorker = order.worker || (order.job?.worker);
            const boundId = String(order.workerId || order.assignedWorkerId || '');
            const localWorker = boundId ? localStore.getWorker(boundId) : null;
            const workerObj = rawWorker ? {
              id: rawWorker.id,
              workerId: rawWorker.id,
              name: rawWorker.name,
              email: rawWorker.email,
              phone: rawWorker.phone || 'N/A',
              specialization: rawWorker.specialization || 'Operator',
              status: rawWorker.status || 'ACTIVE'
            } : (boundId ? {
              id: boundId,
              workerId: boundId,
              name: localWorker?.name || 'Assigned Operator',
              email: localWorker?.email || 'N/A',
              phone: localWorker?.phone || (localWorker as any)?.mobile || 'N/A',
              specialization: 'Operator',
              status: 'ACTIVE'
            } : null);

            const formatted = {
              ...order,
              customer: customerObj,
              user: customerObj,
              worker: workerObj,
              assignedWorker: workerObj,
              workerId: workerObj?.id || order.workerId || order.assignedWorkerId || null
            };
            return sendSuccess(res, { order: formatted, data: { order: formatted } });
          }
        } catch (err: any) {
          console.warn('[Admin getOrderDetails DB Notice]:', err?.message);
        }
      }
      const data = localStore.getOrderDetailedAdmin(orderId);
      const workerInfo = data?.order?.assignedWorkerId ? localStore.getWorker(data.order.assignedWorkerId) : null;
      const formattedLocal = data?.order ? {
        ...data.order,
        customer: data.order.customer || {
          id: data.order.customerId,
          name: data.order.customerName || (data.order.formData as any)?.fullName || 'Customer',
          email: data.order.customerEmail || 'N/A',
          phone: data.order.customerPhone || (data.order.formData as any)?.phone || 'N/A'
        },
        worker: workerInfo ? {
          id: workerInfo.id,
          workerId: workerInfo.id,
          name: workerInfo.name,
          email: workerInfo.email,
          phone: (workerInfo as any).mobile || (workerInfo as any).phone || 'N/A',
          specialization: 'Operator',
          status: workerInfo.status || 'ACTIVE'
        } : null
      } : data?.order;

      return sendSuccess(res, { ...data, order: formattedLocal, data: { ...data, order: formattedLocal } });
    } catch (e: any) {
      return sendError(res, 404, 'ORDER_NOT_FOUND', e.message);
    }
  },

  assignWorker: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.orderId || req.params.id);
      const { workerId, note } = req.body;

      if (!workerId) return sendError(res, 400, 'INVALID_INPUT', 'Worker ID is required');

      if (await checkDb().catch(() => false)) {
        try {
          const workerInfo = localStore.getWorker(workerId);
          await prisma.worker.upsert({
            where: { id: workerId },
            update: { status: 'ACTIVE', isOnline: true },
            create: {
              id: workerId,
              email: workerInfo?.email || `worker_${workerId}@cybercafe.local`,
              name: workerInfo?.name || 'Assigned Operator',
              status: 'ACTIVE',
              kycStatus: 'VERIFIED',
              passwordHash: '$2b$10$dummyHashForWorkerAccountForeignKeys123'
            }
          });

          const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
              workerId: workerId,
              assignedWorkerId: workerId,
              status: 'ASSIGNED',
              slotStatus: 'CONFIRMED'
            },
            include: { customer: true, worker: true, service: true }
          });
          await prisma.job.upsert({
            where: { orderId },
            create: {
              orderId,
              workerId,
              status: 'ASSIGNED',
              notes: note || null
            },
            update: {
              workerId,
              status: 'ASSIGNED',
              notes: note || null
            }
          });
          broadcastEvent('ORDER_STATUS_UPDATED', { orderId, status: 'ASSIGNED', assignedWorkerId: workerId, workerId });
          broadcastEvent('ORDER_CLAIMED', { orderId, workerId });
          return sendSuccess(res, { order: updated, data: { order: updated }, message: 'Worker assigned successfully' });
        } catch (err: any) {
          console.warn('[Admin assignWorker DB Notice]:', err?.message);
        }
      }

      const order = localStore.adminAssignWorker(orderId, workerId, note);
      return sendSuccess(res, { order, data: { order }, message: 'Worker assigned successfully' });
    } catch (e: any) {
      return sendError(res, 400, 'ASSIGN_FAILED', e.message);
    }
  },

  reassignWorker: async (req: AuthenticatedRequest, res: Response) => {
    return adminController.assignWorker(req, res);
  },

  verifyReceipt: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.orderId || req.params.id);
      const { decision, note } = req.body;

      if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
        return sendError(res, 400, 'INVALID_INPUT', 'Decision must be APPROVED or REJECTED');
      }

      if (await checkDb().catch(() => false)) {
        try {
          const nextStatus = decision === 'APPROVED' ? 'COMPLETED' : 'REVISION_REQUIRED';
          const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: nextStatus as any,
              ...(decision === 'APPROVED' ? { completedAt: new Date(), workCompletedAt: new Date() } : {})
            },
            include: { customer: true, user: true, worker: true }
          });
          await prisma.receipt.updateMany({
            where: { orderId },
            data: { status: decision }
          });
          broadcastEvent('ORDER_STATUS_UPDATED', { orderId, status: nextStatus });
          return sendSuccess(res, { order: updated, data: { order: updated }, message: `Receipt ${decision.toLowerCase()} successfully` });
        } catch (err: any) {
          console.warn('[Admin verifyReceipt DB Notice]:', err?.message);
        }
      }

      const order = localStore.adminVerifyReceipt(orderId, decision, note);
      return sendSuccess(res, { order, data: { order }, message: `Receipt ${decision.toLowerCase()} successfully` });
    } catch (e: any) {
      return sendError(res, 400, 'VERIFY_FAILED', e.message);
    }
  },

  updateOrderStatus: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.id);
      const { status, note } = req.body;

      if (await checkDb().catch(() => false)) {
        try {
          const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: status as any,
              ...(status === 'COMPLETED' ? { completedAt: new Date(), workCompletedAt: new Date() } : {})
            },
            include: { customer: true, user: true, worker: true, service: true }
          });
          broadcastEvent('ORDER_STATUS_UPDATED', { orderId, status });
          return sendSuccess(res, { order: updated, message: `Order status set to ${status}` });
        } catch (err: any) {
          console.warn('[Admin updateOrderStatus DB Notice]:', err?.message);
        }
      }

      const order = localStore.adminUpdateOrderStatus(orderId, status, note);
      return sendSuccess(res, { order, message: `Order status set to ${status}` });
    } catch (e: any) {
      return sendError(res, 400, 'UPDATE_FAILED', e.message);
    }
  },

  requestCorrection: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.id);
      const { reason, instruction } = req.body;

      if (!reason || !instruction) return sendError(res, 400, 'INVALID_INPUT', 'Reason and instruction are required');

      const order = localStore.adminRequestCorrection(orderId, reason, instruction);
      return sendSuccess(res, { order, message: 'Correction request window opened (2 hours)' });
    } catch (e: any) {
      return sendError(res, 400, 'CORRECTION_FAILED', e.message);
    }
  },

  holdWorkerEarnings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.orderId || req.params.id);
      const { reason } = req.body;
      const order = localStore.adminHoldWorkerEarnings(orderId, reason);
      return sendSuccess(res, { order, data: { order }, message: 'Earnings put on hold' });
    } catch (e: any) {
      const statusCode = e.code === 'EARNING_ALREADY_ON_HOLD' ? 409 : 400;
      return sendError(res, statusCode, e.code || 'HOLD_FAILED', e.message);
    }
  },

  releaseWorkerEarnings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.orderId || req.params.id);
      const order = localStore.adminReleaseWorkerEarnings(orderId);

      // Task 2.3: Set purgeEligibleAt = NOW() + 20 days on working documents
      try {
        if (await checkDb()) {
          const twentyDaysLater = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
          await withDbRetry(() => prisma.$transaction([
            prisma.order.update({
              where: { id: orderId },
              data: {
                earningStatus: 'AVAILABLE',
                status: 'COMPLETED'
              }
            }),
            prisma.document.updateMany({
              where: { orderId, isPurged: false },
              data: {
                purgeEligibleAt: twentyDaysLater,
                isWorkingCopy: true
              }
            }),
            prisma.auditLog.create({
              data: {
                actorUserId: req.user?.id || 'ADMIN',
                action: 'DOCUMENT_RETENTION_SCHEDULED',
                entityType: 'Order',
                entityId: orderId,
                metadata: {
                  purgeEligibleAt: twentyDaysLater.toISOString(),
                  retentionDays: 20
                }
              }
            })
          ]));
        }
      } catch (dbErr: any) {
        console.warn('[Release Worker Earnings DB]:', dbErr.message);
      }

      return sendSuccess(res, { order, data: { order }, message: 'Worker earnings released and 20-day document retention configured' });
    } catch (e: any) {
      const statusCode = e.code === 'EARNING_ALREADY_RELEASED' ? 409 : 400;
      return sendError(res, statusCode, e.code || 'RELEASE_FAILED', e.message);
    }
  },

  purgeExpiredDocuments: async (req: AuthenticatedRequest, res: Response) => {
    try {
      let purgedCount = 0;
      const now = new Date();

      if (await checkDb()) {
        const expiredDocs = await withDbRetry(() => prisma.document.findMany({
          where: {
            purgeEligibleAt: { lte: now },
            isPurged: false
          }
        }));

        for (const doc of expiredDocs) {
          try {
            if (doc.storageKey) {
              await storage.delete(doc.storageKey).catch(() => { });
              fileBufferStore.delete(doc.storageKey);
            }
            await withDbRetry(() => prisma.document.update({
              where: { id: doc.id },
              data: {
                isPurged: true,
                storageKey: `purged_${doc.id}`
              }
            }));
            purgedCount++;
          } catch (purgeErr: any) {
            console.error(`[File Shredder] Failed to shred document ${doc.id}:`, purgeErr.message);
          }
        }

        if (purgedCount > 0) {
          await withDbRetry(() => prisma.auditLog.create({
            data: {
              actorUserId: req.user?.id || 'SYSTEM_CRON',
              action: 'EXPIRED_DOCUMENTS_SHREDDED',
              entityType: 'Document',
              entityId: 'BATCH_PURGE',
              metadata: { purgedCount, timestamp: now.toISOString() }
            }
          }));
        }
      }

      return sendSuccess(res, {
        purgedCount,
        message: `Successfully shredded ${purgedCount} expired customer document(s). Official receipts and audit logs preserved permanently.`
      });
    } catch (e: any) {
      return sendError(res, 500, 'PURGE_FAILED', e.message);
    }
  },

  refundOrder: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.orderId || req.params.id);
      const { reason, amount } = req.body;

      if (!reason) return sendError(res, 400, 'INVALID_INPUT', 'Refund reason is mandatory');

      const order = localStore.adminRefundOrder(orderId, reason, amount);
      return sendSuccess(res, { order, data: { order }, message: 'Order refunded and cancelled' });
    } catch (e: any) {
      const statusCode = e.code === 'REFUND_ALREADY_PROCESSED' ? 409 : 400;
      return sendError(res, statusCode, e.code || 'REFUND_FAILED', e.message);
    }
  },

  // 5. Service Catalog Management (single source of truth: Prisma / PostgreSQL)
  //
  // VISIBILITY CONTRACT — the customer portal only ever reads
  // `prisma.service` where (status === 'ACTIVE' AND approvalStatus === 'APPROVED').
  // Every admin write path below maintains that exact contract, so a toggle or
  // edit in the Admin Portal is immediately visible (or invisible) to customers.
  //
  // The `status` field is the live/in-live flag (`isActive`); `approvalStatus`
  // gates catalog inclusion. Both are persisted on the Service row itself.

  getServices: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbOk = await checkDb();
      if (!dbOk) {
        if (!isJsonFallbackAllowed()) return sendError(res, 503, 'DB_UNAVAILABLE', 'Service catalog is temporarily unavailable.');
        const rawServices = localStore.services || [];
        const statusFilter = String(req.query.status || '').toUpperCase();
        const services = (statusFilter && statusFilter !== 'ALL') ? rawServices.filter(s => s.status === statusFilter) : rawServices;
        return sendSuccess(res, { services, total: services.length });
      }

      const statusFilter = String(req.query.status || '').toUpperCase();
      const where: any = {};
      if (statusFilter && statusFilter !== 'ALL') where.status = statusFilter;

      const services = await prisma.service.findMany({
        where,
        include: { applicationTypesList: true },
        orderBy: { createdAt: 'desc' }
      });
      const formatted = services.map(s => ({
        ...s,
        applicationTypes: s.applicationTypesList && s.applicationTypesList.length > 0 ? s.applicationTypesList : (s.applicationTypes || [])
      }));
      return sendSuccess(res, { services: formatted, total: formatted.length });
    } catch (e: any) {
      return sendError(res, 500, 'GET_SERVICES_FAILED', e.message);
    }
  },

  createService: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbOk = await checkDb();
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const category = String(body.category || '').trim();
      if (!name || !category) {
        return sendError(res, 400, 'VALIDATION_FAILED', 'Service name and category are mandatory.');
      }

      const pricing = resolveServicePricing(body);
      if (pricing.pricePaise <= 0) {
        return sendError(res, 400, 'VALIDATION_FAILED', 'Service price must be greater than zero.');
      }

      if (!dbOk) {
        if (!isJsonFallbackAllowed()) return sendError(res, 503, 'DB_UNAVAILABLE', 'Service catalog is temporarily unavailable.');
        const newService = localStore.createOfficialServiceAdmin({
          name,
          category,
          pricePaise: pricing.pricePaise,
          workerAmountPaise: pricing.workerAmountPaise,
          platformFeePaise: pricing.platformFeePaise,
          estimatedTime: String(body.estimatedTime || '24-48 Hours').trim(),
          description: String(body.description || '').trim(),
          requiredDocuments: normalizeStringArray(body.requiredDocuments),
          formSchema: body.formSchema || null,
          applicationTypes: body.applicationTypes || []
        });
        return sendSuccess(res, { service: newService, message: 'Service created successfully' }, 201);
      }

      const service = await prisma.service.create({
        data: {
          slug: slugify(name) || undefined,
          name,
          description: String(body.description || '').trim(),
          category,
          pricePaise: pricing.pricePaise,
          workerAmountPaise: pricing.workerAmountPaise,
          adminCommissionPaise: pricing.adminCommissionPaise,
          platformFeePaise: pricing.platformFeePaise,
          estimatedTime: String(body.estimatedTime || '24-48 Hours').trim(),
          requiredDocuments: normalizeStringArray(body.requiredDocuments),
          formSchema: body.formSchema || null,
          applicationTypes: body.applicationTypes || null,
          status: 'ACTIVE',
          approvalStatus: 'APPROVED',
          approvedByAdminId: req.user?.id || null
        }
      });

      if (Array.isArray(body.applicationTypes) && body.applicationTypes.length > 0) {
        try {
          await prisma.applicationType.createMany({
            data: body.applicationTypes.map((t: any) => ({
              serviceId: service.id,
              title: typeof t === 'string' ? t : (t.title || t.name || 'Standard Application'),
              description: typeof t === 'object' ? (t.description || null) : null,
              badge: typeof t === 'object' ? (t.badge || null) : null,
              formType: typeof t === 'object' ? (t.formType || null) : null
            }))
          });
        } catch {}
      }

      try {
        localStore.createOfficialServiceAdmin({
          id: service.id,
          name: service.name,
          category: service.category,
          pricePaise: service.pricePaise,
          workerAmountPaise: service.workerAmountPaise,
          platformFeePaise: service.platformFeePaise,
          estimatedTime: service.estimatedTime,
          description: service.description,
          requiredDocuments: service.requiredDocuments,
          formSchema: service.formSchema,
          applicationTypes: body.applicationTypes || []
        });
      } catch {}

      return sendSuccess(res, { service, message: 'Service created successfully' }, 201);
    } catch (e: any) {
      if (e?.code === 'P2002') return sendError(res, 409, 'DUPLICATE_SLUG', 'A service with this slug already exists.');
      return sendError(res, 400, 'CREATE_SERVICE_FAILED', e.message);
    }
  },

  updateService: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbOk = await checkDb();
      const serviceId = String(req.params.id);
      const body = req.body || {};

      if (!dbOk) {
        if (!isJsonFallbackAllowed()) return sendError(res, 503, 'DB_UNAVAILABLE', 'Service catalog is temporarily unavailable.');
        try {
          const updated = localStore.updateOfficialServiceAdmin(serviceId, body);
          return sendSuccess(res, { service: updated, message: 'Service updated successfully' });
        } catch (err: any) {
          return sendError(res, 404, 'SERVICE_NOT_FOUND', err.message || 'Service not found.');
        }
      }

      const existing = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!existing) return sendError(res, 404, 'SERVICE_NOT_FOUND', 'Service not found.');

      const data: any = {};
      if (body.name !== undefined) data.name = String(body.name).trim() || existing.name;
      if (body.description !== undefined) data.description = String(body.description);
      if (body.category !== undefined) data.category = String(body.category).trim() || existing.category;
      if (body.estimatedTime !== undefined) data.estimatedTime = String(body.estimatedTime).trim();
      if (body.requiredDocuments !== undefined) data.requiredDocuments = normalizeStringArray(body.requiredDocuments);
      if (body.formSchema !== undefined) data.formSchema = body.formSchema;
      if (body.applicationTypes !== undefined) data.applicationTypes = body.applicationTypes;

      // Pricing update — only when any pricing field is present; keeps the
      // price = worker + fee invariant intact.
      const hasPricingField =
        body.pricePaise !== undefined ||
        body.workerAmountPaise !== undefined ||
        body.platformFeePaise !== undefined ||
        body.adminCommissionPaise !== undefined ||
        body.workerAmount !== undefined ||
        body.platformFee !== undefined;
      if (hasPricingField) {
        const pricing = resolveServicePricing({ ...body, pricePaise: body.pricePaise ?? existing.pricePaise });
        data.pricePaise = pricing.pricePaise;
        data.workerAmountPaise = pricing.workerAmountPaise;
        data.adminCommissionPaise = pricing.adminCommissionPaise;
        data.platformFeePaise = pricing.platformFeePaise;
      }

      // Status toggle via PUT is allowed for admins; keep approval consistent
      // so the customer-side visibility rule behaves predictably.
      if (body.status !== undefined) {
        const s = String(body.status).toUpperCase();
        if (['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED', 'REJECTED', 'SUSPENDED'].includes(s)) {
          data.status = s;
        }
      }
      if (body.approvalStatus !== undefined) {
        const a = String(body.approvalStatus).toUpperCase();
        if (['APPROVED', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'REJECTED'].includes(a)) {
          data.approvalStatus = a;
          data.approvedByAdminId = a === 'APPROVED' ? (req.user?.id || null) : null;
        }
      }

      if (Object.keys(data).length === 0) {
        return sendError(res, 400, 'VALIDATION_FAILED', 'No updatable fields provided.');
      }

      const service = await prisma.service.update({ where: { id: serviceId }, data });

      // Synchronize applicationTypesList relation table if present
      if (body.applicationTypes !== undefined && Array.isArray(body.applicationTypes)) {
        try {
          await prisma.applicationType.deleteMany({ where: { serviceId } });
          if (body.applicationTypes.length > 0) {
            await prisma.applicationType.createMany({
              data: body.applicationTypes.map((t: any) => ({
                serviceId,
                title: typeof t === 'string' ? t : (t.title || t.name || 'Standard Application'),
                description: typeof t === 'object' ? (t.description || null) : null,
                badge: typeof t === 'object' ? (t.badge || null) : null,
                formType: typeof t === 'object' ? (t.formType || null) : null
              }))
            });
          }
        } catch (appTypeErr: any) {
          console.warn('[Prisma ApplicationType Sync Notice]:', appTypeErr?.message);
        }
      }

      // Synchronize in-memory localStore catalog
      try {
        localStore.updateOfficialServiceAdmin(serviceId, body);
      } catch {}

      broadcastEvent('SERVICE_CATALOG_UPDATED', { serviceId, service });

      return sendSuccess(res, { service, message: 'Service updated successfully' });
    } catch (e: any) {
      if (e?.code === 'P2002') return sendError(res, 409, 'DUPLICATE_SLUG', 'A service with this slug already exists.');
      return sendError(res, 400, 'UPDATE_SERVICE_FAILED', e.message);
    }
  },

  deleteService: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbOk = await checkDb();
      const serviceId = String(req.params.id);

      if (!dbOk) {
        if (!isJsonFallbackAllowed()) return sendError(res, 503, 'DB_UNAVAILABLE', 'Service catalog is temporarily unavailable.');
        try {
          localStore.deleteOfficialServiceAdmin(serviceId);
          return sendSuccess(res, { message: 'Service removed successfully' });
        } catch (err: any) {
          return sendError(res, 404, 'SERVICE_NOT_FOUND', err.message || 'Service not found.');
        }
      }

      const existing = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!existing) return sendError(res, 404, 'SERVICE_NOT_FOUND', 'Service not found.');

      // Order.serviceId is FK Restrict — services referenced by orders must be
      // archived instead of hard-deleted to preserve order snapshots.
      const orderCount = await prisma.order.count({ where: { serviceId } });
      if (orderCount > 0) {
        const archived = await prisma.service.update({
          where: { id: serviceId },
          data: { status: 'ARCHIVED', approvalStatus: 'REJECTED' }
        });
        return sendSuccess(res, {
          service: archived,
          message: `Service has ${orderCount} order(s) and cannot be hard-deleted. It was archived and hidden from the customer catalog.`
        });
      }

      await prisma.service.delete({ where: { id: serviceId } });
      return sendSuccess(res, { message: 'Service removed successfully' });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        return sendError(res, 409, 'DELETE_CONFLICT', 'Service is referenced by existing records and cannot be deleted.');
      }
      return sendError(res, 400, 'DELETE_SERVICE_FAILED', e.message);
    }
  },

  toggleServiceStatus: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbOk = await checkDb();
      const serviceId = String(req.params.id);

      if (!dbOk) {
        if (!isJsonFallbackAllowed()) return sendError(res, 503, 'DB_UNAVAILABLE', 'Service catalog is temporarily unavailable.');
        try {
          const toggled = localStore.toggleOfficialServiceAdmin(serviceId);
          return sendSuccess(res, { service: toggled, message: `Service status set to ${toggled.status}` });
        } catch (err: any) {
          return sendError(res, 404, 'SERVICE_NOT_FOUND', err.message || 'Service not found.');
        }
      }

      const existing = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!existing) return sendError(res, 404, 'SERVICE_NOT_FOUND', 'Service not found.');

      const service = await prisma.service.update({
        where: { id: serviceId },
        data: { status: existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
      });
      return sendSuccess(res, { service, message: `Service status set to ${service.status}` });
    } catch (e: any) {
      return sendError(res, 400, 'TOGGLE_FAILED', e.message);
    }
  },

  getServiceProposals: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const statusFilter = String(req.query.status || '').toUpperCase();
      let proposals: any[] = [];
      let dbOnline = false;

      try {
        dbOnline = await checkDb();
        if (dbOnline) {
          const where: any = {};
          if (statusFilter && statusFilter !== 'ALL') {
            where.status = statusFilter === 'PENDING' ? { in: ['PENDING', 'PENDING_APPROVAL'] } : statusFilter;
          }

          proposals = await prisma.serviceProposal.findMany({
            where,
            include: { worker: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
          });
        }
      } catch (err: any) {
        console.warn('[getServiceProposals DB notice]:', err?.message);
      }

      if (!dbOnline || proposals.length === 0) {
        const localProps = localStore.serviceProposals || [];
        proposals = localProps.filter(p => {
          if (!statusFilter || statusFilter === 'ALL') return true;
          if (statusFilter === 'PENDING') return p.status === 'PENDING' || p.status === 'PENDING_APPROVAL';
          return p.status === statusFilter;
        }).map(p => {
          const w = localStore.findUserById(p.workerId);
          return {
            ...p,
            worker: { id: p.workerId, name: w?.name || 'Worker' }
          };
        });
      }

      return sendSuccess(res, { proposals });
    } catch (e: any) {
      return sendError(res, 500, 'GET_PROPOSALS_FAILED', e.message);
    }
  },

  approveProposal: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id || null;
      const proposalId = String(req.params.id);
      const body = req.body || {};

      let dbOnline = false;
      try {
        dbOnline = await checkDb();
      } catch {}

      if (dbOnline) {
        const proposal = await prisma.serviceProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) return sendError(res, 404, 'PROPOSAL_NOT_FOUND', 'Service proposal not found.');
        if (proposal.status === 'APPROVED') {
          return sendError(res, 409, 'ALREADY_APPROVED', 'This proposal has already been approved.');
        }

        // Strict Pricing Formula: Price = Worker Rate + Admin Commission (Zero Hidden Fees)
        const workerAmountPaise = Number(
          body.workerAmountPaise ??
          (body.workerAmount !== undefined ? Number(body.workerAmount) * 100 : null) ??
          proposal.requestedWorkerAmountPaise ??
          proposal.suggestedPricePaise ??
          0
        );
        const adminCommissionPaise = Number(
          body.adminCommissionPaise ??
          (body.adminCommission !== undefined ? Number(body.adminCommission) * 100 : null) ??
          body.platformFeePaise ??
          0
        );
        const finalPricePaise = workerAmountPaise + adminCommissionPaise;

        const applicationTypesData = body.applicationTypes !== undefined
          ? body.applicationTypes
          : (proposal as any).applicationTypes;

        const [service] = await prisma.$transaction([
          prisma.service.create({
            data: {
              slug: slugify(String(body.name || proposal.name || '')) || undefined,
              name: String(body.name || proposal.name || '').trim(),
              description: String(body.description ?? proposal.description ?? ''),
              category: String(body.category || proposal.category || 'General'),
              pricePaise: finalPricePaise,
              workerAmountPaise,
              adminCommissionPaise,
              platformFeePaise: 0,
              estimatedTime: String(body.estimatedTime || proposal.estimatedTime || '1-2 days'),
              requiredDocuments: normalizeStringArray(body.requiredDocuments !== undefined ? body.requiredDocuments : proposal.requiredDocuments),
              formSchema: body.formSchema ?? proposal.formSchema ?? null,
              applicationTypes: applicationTypesData || null,
              status: 'ACTIVE',
              approvalStatus: 'APPROVED',
              createdByWorkerId: proposal.workerId,
              approvedByAdminId: adminId
            }
          }),
          prisma.serviceProposal.update({
            where: { id: proposalId },
            data: {
              status: 'APPROVED',
              adminComment: body.comment || body.adminComment || 'Approved'
            }
          })
        ]);

        return sendSuccess(res, { service, proposal: { ...proposal, status: 'APPROVED' }, message: 'Proposal approved and added to catalog' });
      }

      // Resilient fallback mode
      const workerAmountPaise = Number(
        body.workerAmountPaise ??
        (body.workerAmount !== undefined ? Number(body.workerAmount) * 100 : null) ??
        0
      );
      const adminCommissionPaise = Number(
        body.adminCommissionPaise ??
        (body.adminCommission !== undefined ? Number(body.adminCommission) * 100 : null) ??
        body.platformFeePaise ??
        0
      );
      const pricePaise = workerAmountPaise + adminCommissionPaise;

      const result = localStore.approveProposalAdmin(proposalId, adminId || 'admin', {
        ...body,
        workerAmountPaise,
        adminCommissionPaise,
        platformFeePaise: 0,
        pricePaise
      });
      return sendSuccess(res, { service: result.newService, proposal: result.proposal, message: 'Proposal approved and added to catalog' });
    } catch (e: any) {
      if (e?.code === 'P2002') return sendError(res, 409, 'DUPLICATE_SLUG', 'A service with this slug already exists.');
      return sendError(res, 400, 'APPROVE_PROPOSAL_FAILED', e.message);
    }
  },

  rejectProposal: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id || null;
      const proposalId = String(req.params.id);
      const { reason, comment } = req.body || {};

      let dbOnline = false;
      try {
        dbOnline = await checkDb();
      } catch {}

      if (dbOnline) {
        const proposal = await prisma.serviceProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) return sendError(res, 404, 'PROPOSAL_NOT_FOUND', 'Service proposal not found.');

        const updated = await prisma.serviceProposal.update({
          where: { id: proposalId },
          data: {
            status: 'REJECTED',
            adminComment: reason || comment || 'Rejected'
          }
        });
        return sendSuccess(res, { proposal: updated, message: 'Proposal rejected' });
      }

      const rejected = localStore.rejectProposalAdmin(proposalId, adminId || 'admin', reason || comment || 'Rejected');
      return sendSuccess(res, { proposal: rejected, message: 'Proposal rejected' });
    } catch (e: any) {
      return sendError(res, 400, 'REJECT_PROPOSAL_FAILED', e.message);
    }
  },

  // 6. Financials & Reports
  getFinancialSummary: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (await checkDb().catch(() => false)) {
        try {
          const [paidPayments, completedOrders, pendingWithdrawals, completedWithdrawals] = await Promise.all([
            prisma.payment.aggregate({
              _sum: { amountPaise: true },
              where: { status: 'PAID' }
            }),
            prisma.order.findMany({
              where: { paymentStatus: 'PAID' },
              select: { customerPaidAmountPaise: true, workerAmountPaise: true, adminCommissionPaise: true }
            }),
            prisma.withdrawal.aggregate({
              _sum: { amountPaise: true },
              where: { status: { in: ['PENDING', 'REQUESTED'] } }
            }),
            prisma.withdrawal.aggregate({
              _sum: { amountPaise: true },
              where: { status: 'COMPLETED' }
            })
          ]);

          const grossRevenuePaise = paidPayments._sum.amountPaise || 0;
          const totalCommissionPaise = completedOrders.reduce((sum, o) => sum + (o.adminCommissionPaise || 0), 0);
          const totalWorkerPayoutsPaise = completedOrders.reduce((sum, o) => sum + (o.workerAmountPaise || 0), 0);
          const pendingWithdrawalsPaise = pendingWithdrawals._sum.amountPaise || 0;
          const completedWithdrawalsPaise = completedWithdrawals._sum.amountPaise || 0;

          const summary = {
            grossRevenuePaise,
            grossRevenueRupees: (grossRevenuePaise / 100).toFixed(2),
            totalRevenue: (grossRevenuePaise / 100).toFixed(2),
            totalCommissionPaise,
            totalCommissionRupees: (totalCommissionPaise / 100).toFixed(2),
            totalWorkerPayoutsPaise,
            totalWorkerPayoutsRupees: (totalWorkerPayoutsPaise / 100).toFixed(2),
            pendingWithdrawalsPaise,
            pendingWithdrawalsRupees: (pendingWithdrawalsPaise / 100).toFixed(2),
            completedWithdrawalsPaise,
            completedWithdrawalsRupees: (completedWithdrawalsPaise / 100).toFixed(2),
            totalTransactions: await prisma.payment.count()
          };
          return sendSuccess(res, { data: summary, summary });
        } catch (dbErr: any) {
          console.warn('[Admin getFinancialSummary DB Notice]:', dbErr?.message);
        }
      }

      const summary = localStore.getFinancialSummaryAdmin();
      return sendSuccess(res, { data: summary, summary });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getFinancialLedger: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (await checkDb().catch(() => false)) {
        try {
          const ledger = await prisma.financialLedger.findMany({
            include: { order: { include: { customer: true } }, worker: true },
            orderBy: { createdAt: 'desc' }
          });
          return sendSuccess(res, { ledger, count: ledger.length });
        } catch (dbErr: any) {
          console.warn('[Admin getFinancialLedger DB Notice]:', dbErr?.message);
        }
      }

      const ledger = localStore.ledgerEntries || [];
      return sendSuccess(res, { ledger, count: ledger.length });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getPayments: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (await checkDb().catch(() => false)) {
        try {
          const payments = await prisma.payment.findMany({
            include: {
              order: {
                include: { customer: true, user: true, service: true, worker: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          });
          const formatted = payments.map(p => ({
            id: p.id,
            orderId: p.orderId,
            orderNumber: p.order?.orderNumber || p.orderId,
            serviceName: (p.order?.serviceSnapshot as any)?.name || p.order?.service?.name || 'Service Order',
            customerName: p.order?.customer?.name || 'Customer',
            customerEmail: p.order?.customer?.email || '',
            amountPaise: p.amountPaise,
            amount: (p.amountPaise / 100).toFixed(2),
            status: p.status,
            provider: p.provider,
            providerOrderId: p.providerOrderId,
            providerPaymentId: p.providerPaymentId,
            createdAt: p.createdAt,
            paidAt: p.paidAt
          }));
          return sendSuccess(res, { payments: formatted, data: formatted });
        } catch (dbErr: any) {
          console.warn('[Admin getPayments DB Notice]:', dbErr?.message);
        }
      }

      const orders = localStore.getAllOrdersAdmin();
      const payments = orders.map(o => ({
        id: `pay_${o.id}`,
        orderId: o.id,
        serviceName: o.serviceName,
        customerName: o.customerName,
        amountPaise: o.pricePaise || 0,
        amount: paiseToRupees(o.pricePaise),
        status: o.status === 'CANCELLED' ? 'REFUNDED' : 'PAID',
        paymentMethod: 'UPI / NetBanking',
        createdAt: o.createdAt
      }));
      return sendSuccess(res, { payments, data: payments });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getWithdrawals: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (await checkDb().catch(() => false)) {
        try {
          const dbWithdrawals = await prisma.withdrawal.findMany({
            include: { worker: true },
            orderBy: { requestedAt: 'desc' }
          });
          const formatted = dbWithdrawals.map(w => ({
            id: w.id,
            workerId: w.workerId,
            workerName: w.worker?.name || 'Worker',
            workerEmail: w.worker?.email || '',
            amountPaise: w.amountPaise,
            amount: (w.amountPaise / 100).toFixed(2),
            status: w.status,
            method: w.method,
            paymentReference: w.paymentReference,
            adminNote: w.adminNote,
            requestedAt: w.requestedAt,
            processedAt: w.processedAt
          }));
          return sendSuccess(res, { withdrawals: formatted, payouts: formatted, data: formatted });
        } catch (dbErr: any) {
          console.warn('[Admin getWithdrawals DB Notice]:', dbErr?.message);
        }
      }

      const withdrawals = localStore.getAllWithdrawalsAdmin();
      return sendSuccess(res, { withdrawals, payouts: withdrawals, data: withdrawals });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  approveWithdrawal: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id || 'ADM-001';
      const withdrawalId = String(req.params.id);
      const paymentRef = req.body?.paymentReference || req.body?.paymentRef;

      let dbWithdrawal: any = null;
      const isDbConnected = await checkDb().catch(() => false);

      if (isDbConnected) {
        dbWithdrawal = await prisma.$transaction(async (tx) => {
          const existing = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });
          if (existing) {
            if (existing.status === 'COMPLETED') {
              const err: any = new Error('Withdrawal is already completed');
              err.code = 'WITHDRAWAL_ALREADY_COMPLETED';
              throw err;
            }
            if (existing.status === 'REJECTED') {
              const err: any = new Error('Withdrawal is already rejected');
              err.code = 'WITHDRAWAL_ALREADY_REJECTED';
              throw err;
            }

            const updated = await tx.withdrawal.update({
              where: { id: withdrawalId },
              data: {
                status: 'COMPLETED',
                paymentReference: paymentRef || `PAY_${Date.now()}`,
                processedBy: adminId,
                processedAt: new Date(),
                completedAt: new Date()
              }
            });

            await tx.financialLedger.upsert({
              where: { idempotencyKey: `withdrawal_paid_${withdrawalId}` },
              update: {},
              create: {
                workerId: existing.workerId,
                withdrawalId,
                type: 'WITHDRAWAL_PAID',
                amountPaise: existing.amountPaise,
                status: 'COMPLETED',
                reference: paymentRef || undefined,
                idempotencyKey: `withdrawal_paid_${withdrawalId}`,
                metadata: { processedBy: adminId, paymentRef }
              }
            });

            return updated;
          }
          return null;
        });
      }

      const withdrawal = localStore.approveWithdrawalAdmin(withdrawalId, adminId, paymentRef);
      return sendSuccess(res, { withdrawal: dbWithdrawal || withdrawal, message: 'Withdrawal approved and processed' });
    } catch (e: any) {
      const statusCode = e.code === 'WITHDRAWAL_ALREADY_REJECTED' || e.code === 'WITHDRAWAL_ALREADY_COMPLETED' ? 409 : 400;
      return sendError(res, statusCode, e.code || 'APPROVE_FAILED', e.message);
    }
  },

  rejectWithdrawal: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id || 'ADM-001';
      const withdrawalId = String(req.params.id);
      const { reason } = req.body;

      const isDbConnected = await checkDb().catch(() => false);
      if (isDbConnected) {
        try {
          await prisma.withdrawal.updateMany({
            where: { id: withdrawalId, status: 'REQUESTED' },
            data: {
              status: 'REJECTED',
              adminNote: reason || 'Rejected by Admin',
              processedBy: adminId,
              rejectedAt: new Date()
            }
          });
        } catch { }
      }

      const withdrawal = localStore.rejectWithdrawalAdmin(withdrawalId, adminId, reason);
      return sendSuccess(res, { withdrawal, message: 'Withdrawal rejected and funds restored' });
    } catch (e: any) {
      const statusCode = e.code === 'WITHDRAWAL_ALREADY_COMPLETED' ? 409 : 400;
      return sendError(res, statusCode, e.code || 'REJECT_FAILED', e.message);
    }
  },

  completeWithdrawal: async (req: AuthenticatedRequest, res: Response) => {
    return adminController.approveWithdrawal(req, res);
  },

  getTopEarningWorkers: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const period = req.query.period === 'daily' ? 'daily' : 'monthly';
      const rankings = localStore.getTopEarningWorkersAdmin(period);
      const workers = rankings.map(r => ({
        workerId: r.workerId,
        workerName: r.workerName,
        totalEarnings: paiseToRupees(r.totalEarningsPaise),
        totalEarningsPaise: r.totalEarningsPaise || 0,
        completedOrders: r.completedOrders,
        rank: r.rank
      }));
      return sendSuccess(res, { workers, data: { workers }, rankings });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getOrderFinancialBreakdown: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = String(req.params.orderId || req.params.id);
      const order = localStore.getOrder(orderId);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

      const customerPaidPaise = order.customerPaidAmountPaise || order.customerPaidAmount || order.pricePaise || 0;
      const workerPaise = order.workerAmountPaise || order.workerAmount || order.workerEarningsPaise || (order.adminCommissionPaise !== undefined ? Math.max(0, customerPaidPaise - order.adminCommissionPaise) : customerPaidPaise);
      const adminCommPaise = order.adminCommissionPaise || order.adminCommission || order.commissionPaise || Math.max(0, customerPaidPaise - workerPaise);
      const platformFeePaise = order.platformFeePaise || order.platformFee || adminCommPaise;

      return sendSuccess(res, {
        data: {
          orderId: order.id,
          customerPaidAmount: paiseToRupees(customerPaidPaise),
          workerAmount: paiseToRupees(workerPaise),
          adminCommission: paiseToRupees(adminCommPaise),
          platformFee: paiseToRupees(platformFeePaise),
          customerPaidAmountPaise: customerPaidPaise,
          workerAmountPaise: workerPaise,
          adminCommissionPaise: adminCommPaise,
          platformFeePaise,
          paymentStatus: order.paymentStatus || 'PAID',
          refundStatus: order.refund ? 'REFUNDED' : 'NONE',
          workerEarningStatus: order.earningStatus || 'NONE'
        }
      });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getCommissionReport: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dateFrom, dateTo, service, worker } = req.query as any;
      let orders = Array.from(localStore.orders.values()).filter(o => o.paymentStatus === 'PAID' || o.status === 'COMPLETED');

      if (service) orders = orders.filter(o => o.serviceId === service || o.serviceName === service);
      if (worker) orders = orders.filter(o => o.assignedWorkerId === worker);

      if (dateFrom) {
        const fromTime = new Date(dateFrom).getTime();
        orders = orders.filter(o => new Date(o.createdAt).getTime() >= fromTime);
      }
      if (dateTo) {
        const toDateObj = new Date(dateTo);
        toDateObj.setHours(23, 59, 59, 999);
        orders = orders.filter(o => new Date(o.createdAt).getTime() <= toDateObj.getTime());
      }

      let totalCommissionPaise = 0;
      const breakdown = orders.map(o => {
        const orderPrice = o.customerPaidAmountPaise || o.customerPaidAmount || o.pricePaise || 0;
        const workerAmt = o.workerAmountPaise || o.workerAmount || o.workerEarningsPaise || 0;
        const comm = o.adminCommissionPaise || o.adminCommission || o.commissionPaise || Math.max(0, orderPrice - workerAmt);
        totalCommissionPaise += comm;
        return {
          orderId: o.id,
          serviceName: o.serviceName,
          workerId: o.assignedWorkerId,
          customerPaidAmount: paiseToRupees(o.customerPaidAmount || o.pricePaise),
          adminCommission: paiseToRupees(comm),
          adminCommissionPaise: comm,
          createdAt: o.createdAt
        };
      });

      return sendSuccess(res, {
        data: {
          totalCommission: paiseToRupees(totalCommissionPaise),
          totalCommissionPaise,
          count: orders.length,
          orders: breakdown
        }
      });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getPlatformFeeReport: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dateFrom, dateTo } = req.query as any;
      let orders = Array.from(localStore.orders.values()).filter(o => o.paymentStatus === 'PAID' || o.status === 'COMPLETED');

      if (dateFrom) {
        const fromTime = new Date(dateFrom).getTime();
        orders = orders.filter(o => new Date(o.createdAt).getTime() >= fromTime);
      }
      if (dateTo) {
        const toDateObj = new Date(dateTo);
        toDateObj.setHours(23, 59, 59, 999);
        orders = orders.filter(o => new Date(o.createdAt).getTime() <= toDateObj.getTime());
      }

      let totalPlatformFeePaise = 0;
      const breakdown = orders.map(o => {
        const fee = o.platformFee || 0;
        totalPlatformFeePaise += fee;
        return {
          orderId: o.id,
          platformFee: paiseToRupees(fee),
          platformFeePaise: fee,
          createdAt: o.createdAt
        };
      });

      return sendSuccess(res, {
        data: {
          totalPlatformFee: paiseToRupees(totalPlatformFeePaise),
          totalPlatformFeePaise,
          count: orders.length,
          orders: breakdown
        }
      });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getRefundsReport: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refunds = localStore.ledgerEntries.filter(l => l.type === 'REFUND_ISSUED');
      const refundedOrders = Array.from(localStore.orders.values()).filter(o => o.refund || o.status === 'REFUNDED');
      const totalRefundedPaise = refunds.reduce((sum, r) => sum + (r.amountPaise || 0), 0) ||
        refundedOrders.reduce((sum, o) => sum + (o.refund?.amountPaise || o.customerPaidAmount || o.pricePaise || 0), 0);

      return sendSuccess(res, {
        data: {
          totalRefunded: paiseToRupees(totalRefundedPaise),
          totalRefundedPaise,
          refundCount: refundedOrders.length,
          refunds: refundedOrders.map(o => {
            const amountPaise = o.refund?.amountPaise || o.customerPaidAmount || o.pricePaise || 0;
            return {
              orderId: o.id,
              amount: paiseToRupees(amountPaise),
              amountPaise,
              reason: o.refund?.reason || 'Service refund',
              refundedAt: o.refund?.refundedAt || o.updatedAt || o.createdAt
            };
          })
        }
      });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  // 7. Complaints
  getComplaints: async (req: AuthenticatedRequest, res: Response) => {
    try {
      let type = String(req.query.type || req.query.role || '');
      if (type === 'ALL' || type === 'All Roles' || type === 'undefined') type = '';
      let status = String(req.query.status || '');
      if (status === 'ALL' || status === 'All Status' || status === 'undefined') status = '';
      let category = String(req.query.category || '');
      if (category === 'ALL' || category === 'All Categories' || category === 'undefined') category = '';
      const search = String(req.query.search || '');

      const complaints = localStore.getAllComplaintsAdmin({ type, status, category, search });
      return sendSuccess(res, { complaints });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getComplaintDetails: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const complaintId = String(req.params.id);
      const data = localStore.getComplaintDetailedAdmin(complaintId);
      return sendSuccess(res, { ...data });
    } catch (e: any) {
      return sendError(res, 404, 'COMPLAINT_NOT_FOUND', e.message);
    }
  },

  replyComplaint: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const complaintId = String(req.params.id);
      const { message } = req.body;
      if (!message) return sendError(res, 400, 'INVALID_INPUT', 'Reply message is required');

      const complaint = localStore.addComplaintReplyAdmin(complaintId, 'Admin Operations', message.trim());
      return sendSuccess(res, { complaint, message: 'Reply sent' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  addComplaintNote: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const complaintId = String(req.params.id);
      const { note } = req.body;
      if (!note) return sendError(res, 400, 'INVALID_INPUT', 'Note is required');

      const complaint = localStore.addComplaintInternalNoteAdmin(complaintId, 'Admin', note.trim());
      return sendSuccess(res, { complaint, message: 'Internal note saved' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  resolveComplaint: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const complaintId = String(req.params.id);
      const { decision, resolutionNote } = req.body || {};
      const note = resolutionNote || 'Resolved by Administrator';

      const complaint = localStore.resolveComplaintAdmin(complaintId, decision || 'RESOLVED', note);
      return sendSuccess(res, { complaint, message: 'Complaint resolved' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  // 8. Helpdesk Tickets
  getSupportTickets: async (req: AuthenticatedRequest, res: Response) => {
    try {
      let role = String(req.query.role || '');
      if (role === 'ALL' || role === 'undefined') role = '';
      let status = String(req.query.status || '');
      if (status === 'ALL' || status === 'undefined') status = '';
      const search = String(req.query.search || '');

      const tickets = localStore.getAllSupportTicketsAdmin({ role, status, search });
      return sendSuccess(res, { tickets });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  replySupportTicket: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = String(req.params.id);
      const adminId = req.user?.id || 'ADM-001';
      const { message } = req.body;

      if (!message || !message.trim()) return sendError(res, 400, 'INVALID_INPUT', 'Reply message is required');

      const ticket = localStore.replySupportTicketAdmin(ticketId, adminId, message.trim());
      return sendSuccess(res, { ticket, message: 'Reply sent' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  addSupportTicketNote: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = String(req.params.id);
      const { note } = req.body;
      if (!note) return sendError(res, 400, 'INVALID_INPUT', 'Note is required');

      const ticket = localStore.addTicketInternalNoteAdmin(ticketId, 'Admin', note.trim());
      return sendSuccess(res, { ticket, message: 'Internal note saved' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  updateSupportTicketStatus: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = String(req.params.id);
      const { status } = req.body;
      const ticket = localStore.updateSupportTicketStatusAdmin(ticketId, status);
      return sendSuccess(res, { ticket, message: `Ticket status set to ${status}` });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  // 9. Admin Notifications
  getNotifications: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const notifications = localStore.getAdminNotifications();
      const unreadCount = notifications.filter(n => !n.isRead).length;
      return sendSuccess(res, { notifications, unreadCount });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  markNotificationRead: async (req: AuthenticatedRequest, res: Response) => {
    try {
      localStore.markAdminNotificationRead(String(req.params.id));
      return sendSuccess(res, { message: 'Marked as read' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  markAllNotificationsRead: async (req: AuthenticatedRequest, res: Response) => {
    try {
      localStore.markAllAdminNotificationsRead();
      return sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  // 10. Reports & Settings
  getReports: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reportType = String(req.query.type || 'orders');
      const period = String(req.query.period || 'monthly');
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;

      const report = localStore.getReportDataAdmin(reportType, period, customStartDate, customEndDate);
      return sendSuccess(res, { report });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  getSettings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = localStore.getPlatformSettings();
      return sendSuccess(res, { settings });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  },

  updateSettings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = localStore.updatePlatformSettings(req.body);
      return sendSuccess(res, { settings, message: 'Settings saved successfully' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  updateProfile: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id || 'ADM-001';
      const result = localStore.updateAdminProfile(adminId, req.body);
      return sendSuccess(res, { ...result, message: 'Profile updated' });
    } catch (e: any) {
      return sendError(res, 400, 'ACTION_FAILED', e.message);
    }
  },

  getAuditLogs: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const action = req.query.action as string;
      const entityType = req.query.entityType as string;
      const search = req.query.search as string;

      const logs = localStore.getSecurityAuditLogsAdmin({ action, entityType, search });
      return sendSuccess(res, { logs });
    } catch (e: any) {
      return sendError(res, 500, 'SERVER_ERROR', e.message);
    }
  }
};

// ==========================================
// GENERAL NOTIFICATION CONTROLLER
// ==========================================
export const generalNotificationController = {
  getUserNotifications: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const list = localStore.notifications.filter(n =>
        n.recipientId === user.id ||
        (user.role === 'ADMIN' && (n.recipientRole === 'ADMIN' || n.recipientId === 'ADM-001'))
      );

      return sendSuccess(res, {
        notifications: list,
        data: { notifications: list },
        unreadCount: list.filter(n => !n.isRead).length
      });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  },

  markUserNotificationRead: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const notifId = String(req.params.notificationId || req.params.id);

      if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');

      const notif = localStore.notifications.find(n =>
        n.id === notifId && (
          n.recipientId === user.id ||
          (user.role === 'ADMIN' && (n.recipientRole === 'ADMIN' || n.recipientId === 'ADM-001'))
        )
      );

      if (!notif) return sendError(res, 404, 'NOT_FOUND', 'Notification not found');

      notif.isRead = true;
      return sendSuccess(res, { message: 'Notification marked as read' });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  }
};
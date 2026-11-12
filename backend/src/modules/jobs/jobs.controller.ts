import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { localStore } from '../../catalogData';
import { prisma, checkDb } from '../../db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email?: string;
    name?: string;
  };
}

const sendSuccess = (res: Response, data: Record<string, any> = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, ...data });
};

const sendError = (res: Response, statusCode: number, code: string, message: string) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message }
  });
};

export const jobController = {
  /**
   * Accept an Order / Job Assignment
   */
  acceptJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawOrderId = req.params.orderId;
      const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
      const workerId = req.user?.id;

      if (!orderId) {
        return sendError(res, 400, 'INVALID_INPUT', 'Order ID is required');
      }
      if (!workerId) {
        return sendError(res, 401, 'UNAUTHORIZED', 'Worker authentication required');
      }

      const isDbConnected = await checkDb().catch(() => false);

      let order: any = null;
      if (isDbConnected) {
        try {
          order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true, service: true, job: true }
          });
        } catch { }
      }

      if (!order) {
        order = localStore.getOrder(orderId);
      }

      if (!order) {
        return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      const existingWorkerId = order.assignedWorkerId || order.job?.workerId;
      if (existingWorkerId && existingWorkerId !== workerId) {
        return sendError(res, 409, 'ORDER_ALREADY_ASSIGNED', 'This order is already assigned or no longer available');
      }

      if (existingWorkerId && existingWorkerId === workerId) {
        const local = localStore.getOrderForWorker(orderId, workerId) || order;
        return sendSuccess(res, { job: { orderId, workerId, status: 'ASSIGNED' }, order: local, message: 'Order already accepted by you' });
      }

      const claimableStatuses = ['AVAILABLE', 'OFFERED', 'PAID', 'PENDING', 'CONFIRMED', 'CREATED', 'ASSIGNED'];
      if (!claimableStatuses.includes(order.status)) {
        return sendError(res, 400, 'ORDER_UNAVAILABLE', `Order cannot be accepted in status: ${order.status}`);
      }

      // Handle DB transaction if available
      if (isDbConnected) {
        try {
          await prisma.user.upsert({
            where: { id: workerId },
            update: { role: 'WORKER', status: 'ACTIVE' },
            create: {
              id: workerId,
              email: req.user?.email || `worker_${workerId}@cybercafe.local`,
              name: req.user?.name || 'Cyber Cafe Operator',
              role: 'WORKER',
              status: 'ACTIVE',
              password: '$2b$10$dummyHashForWorkerAccountForeignKeys123'
            }
          });

          const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const updatedOrder = await tx.order.update({
              where: { id: orderId },
              data: {
                status: 'ASSIGNED',
                assignedWorkerId: workerId,
                acceptedAt: new Date()
              }
            });

            const createdJob = await tx.job.upsert({
              where: { orderId },
              update: { workerId, status: 'ASSIGNED' },
              create: {
                orderId,
                workerId,
                status: 'ASSIGNED'
              }
            });

            return { order: updatedOrder, job: createdJob };
          });

          // Sync localStore safely after DB success
          try {
            localStore.acceptOrder(orderId, workerId);
          } catch { }

          return sendSuccess(res, { job: result.job, order: result.order });
        } catch (dbErr: any) {
          if (dbErr.message === 'ORDER_UNAVAILABLE' || dbErr.code === 'P2002' || dbErr.statusCode === 409) {
            return sendError(res, 409, 'ORDER_ALREADY_ASSIGNED', 'This order is already assigned or no longer available');
          }
          console.error('DB Job assignment transaction failed:', dbErr);
          return sendError(res, 500, 'DATABASE_ERROR', 'Failed to assign job in database');
        }
      }

      // Fallback: localStore handling when DB is unavailable
      try {
        const order = localStore.acceptOrder(orderId, workerId);
        return sendSuccess(res, {
          job: {
            orderId,
            workerId,
            status: 'ASSIGNED',
            createdAt: new Date().toISOString()
          },
          order
        });
      } catch (storeErr: any) {
        return sendError(
          res,
          storeErr.statusCode || 409,
          storeErr.code || 'ORDER_ALREADY_ASSIGNED',
          storeErr.message || 'Order is no longer available'
        );
      }
    } catch (error: any) {
      return sendError(res, error.statusCode || 500, 'SERVER_ERROR', error.message || 'Failed to accept job');
    }
  }
};

export default jobController;

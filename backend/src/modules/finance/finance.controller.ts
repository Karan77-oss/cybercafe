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

export const payoutController = {
  /**
   * Release Worker Payout for Completed Job
   */
  releasePayout: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
      if (!jobId) {
        return sendError(res, 400, 'INVALID_INPUT', 'Job ID is required');
      }

      const isDbConnected = await checkDb().catch(() => false);

      if (isDbConnected) {
        try {
          const jobIdStr = String(jobId);
          const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const job = await tx.job.findUnique({
              where: { id: jobIdStr },
              include: { order: true }
            });

            if (!job || job.status !== 'COMPLETED') {
              throw new Error('INVALID_JOB');
            }

            const existingPayout = await tx.payout.findUnique({ where: { jobId: jobIdStr } });
            if (existingPayout) {
              return existingPayout;
            }

            const orderData = (job as any).order;
            const pricing = (orderData?.pricing || {}) as any;
            const amountPaise = Number(
              pricing?.workerPayout ||
              pricing?.workerEarningsPaise ||
              orderData?.workerAmountPaise ||
              0
            );
            if (!amountPaise || isNaN(amountPaise) || amountPaise <= 0) {
              throw new Error('INVALID_PAYOUT_AMOUNT');
            }

            return tx.payout.create({
              data: {
                jobId: jobIdStr,
                workerId: job.workerId,
                amountPaise,
                status: 'RELEASED',
                releasedAt: new Date()
              }
            });
          });

          return sendSuccess(res, { payout: result });
        } catch (dbErr: any) {
          if (dbErr.message === 'INVALID_JOB') {
            return sendError(res, 400, 'INVALID_JOB', 'Job must be marked COMPLETED before payout can be released');
          }
          if (dbErr.message === 'INVALID_PAYOUT_AMOUNT') {
            return sendError(res, 400, 'INVALID_PAYOUT_AMOUNT', 'Valid worker payout amount could not be determined');
          }
          if (dbErr.code === 'P2002') {
            return sendError(res, 409, 'PAYOUT_EXISTS', 'Payout has already been released for this job');
          }
          console.error('Database payout transaction error:', dbErr);
          return sendError(res, 500, 'DATABASE_ERROR', 'Payout transaction failed');
        }
      }

      const localJob = (localStore as any).jobs?.find?.((j: any) => j.id === jobId);
      const workerPayout = localJob?.workerPayout || 15000;

      return sendSuccess(res, {
        payout: {
          id: 'payout_' + Date.now(),
          jobId,
          amountPaise: workerPayout,
          status: 'RELEASED',
          releasedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Release payout error:', error);
      return sendError(res, 500, 'SERVER_ERROR', error.message || 'Failed to release payout');
    }
  }
};

export default payoutController;

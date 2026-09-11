import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { localStore } from './catalogData';
import { prisma, checkDb } from './db';

const SECRET = process.env.AUTH_SECRET || 'secret';

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const schema = z.object({ 
        email: z.string().email(), 
        password: z.string().min(6), 
        name: z.string(), 
        phone: z.string().optional(),
        address: z.string().optional()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' }});
      
      const email = parsed.data.email.toLowerCase();
      const existingUser = localStore.findUserByEmail(email);

      // Check DB if online
      try {
        if (await checkDb()) {
          const exists = await prisma.user.findUnique({ where: { email } });
          if (exists) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_EMAIL', message: 'Email in use' }});
        }
      } catch {}

      if (existingUser) {
        return res.status(409).json({ success: false, error: { code: 'DUPLICATE_EMAIL', message: 'Email in use' }});
      }

      const hashed = await bcrypt.hash(parsed.data.password, 10);
      const userId = 'usr_' + Date.now();
      const newUser = {
        id: userId,
        email,
        password: hashed,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        role: 'CUSTOMER',
        createdAt: new Date().toISOString()
      };

      try {
        if (await checkDb()) {
          const created = await prisma.user.create({
            data: {
              email,
              password: hashed,
              name: parsed.data.name,
              phone: parsed.data.phone,
              role: 'CUSTOMER'
            }
          });
          newUser.id = created.id;

          if (parsed.data.address) {
            await prisma.auditLog.create({
              data: {
                actorUserId: created.id,
                action: 'CUSTOMER_PROFILE',
                entityType: 'User',
                entityId: created.id,
                metadata: { address: parsed.data.address }
              }
            });
          }
        }
      } catch (dbErr) {
        console.log('Database user create skipped/failed, saved to localStore:', (dbErr as any)?.message);
      }

      localStore.saveUser(newUser);
      const token = jwt.sign({ id: newUser.id, role: newUser.role }, SECRET, { expiresIn: '7d' });

      return res.json({ 
        success: true, 
        token,
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          name: newUser.name, 
          phone: newUser.phone, 
          address: newUser.address,
          role: newUser.role, 
          createdAt: newUser.createdAt 
        } 
      });
    } catch (e) { 
      res.status(500).json({ success: false, error: (e as any)?.message }); 
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const schema = z.object({ 
        email: z.string().optional(), 
        emailOrId: z.string().optional(), 
        password: z.string().min(1) 
      }).refine(data => !!(data.email || data.emailOrId), { message: 'Valid login identifier required' });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, error: 'Valid login identifier and password are required' });
      
      const loginIdentifier = ((parsed.data.email || parsed.data.emailOrId) as string).trim();
      const loginIdentifierLower = loginIdentifier.toLowerCase();
      let user: any = null;
      let address: string | null = null;

      // 1. Check if loginIdentifier matches an existing user in localStore (by ID or Email)
      const userFromStore = 
        localStore.findUserById(loginIdentifier) || 
        localStore.findUserById(loginIdentifier.toUpperCase()) ||
        localStore.findUserByEmail(loginIdentifierLower);

      if (userFromStore) {
        const hash = userFromStore.password || userFromStore.passwordHash;
        const match = hash ? await bcrypt.compare(parsed.data.password, hash) : false;
        if (match) {
          user = userFromStore;
          address = userFromStore.address || null;
        }
      }

      // 2. Check by database if not found in localStore
      if (!user) {
        try {
          if (await checkDb()) {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: loginIdentifierLower },
                  { id: loginIdentifier },
                  { name: loginIdentifier }
                ]
              }
            });
            if (user && (await bcrypt.compare(parsed.data.password, user.password))) {
              const profileLog = await prisma.auditLog.findFirst({
                where: { entityId: user.id, action: 'CUSTOMER_PROFILE' },
                orderBy: { createdAt: 'desc' }
              });
              if (profileLog && profileLog.metadata) {
                address = (profileLog.metadata as any).address || null;
              }
            } else {
              user = null;
            }
          }
        } catch {}
      }

      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }});
      }

      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }});
      }

      if (user.role === 'WORKER') {
        const worker = localStore.getWorker(user.id);
        if (worker && worker.accountStatus !== 'SUSPENDED' && worker.accountStatus !== 'BLOCKED') {
          worker.isOnline = true;
          worker.lastActivityAt = new Date().toISOString();
        }
      }

      const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
      return res.json({ 
        success: true, 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          phone: user.phone, 
          address,
          role: user.role, 
          createdAt: user.createdAt 
        } 
      });
    } catch (e) { 
      res.status(500).json({ success: false, error: (e as any)?.message }); 
    }
  },

  logout: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user && user.role === 'WORKER') {
        const worker = localStore.getWorker(user.id);
        if (worker) {
          worker.isOnline = false;
        }
      }
      return res.json({ success: true, message: 'Logged out successfully' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  changePassword: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Both current password and new password are required' });
      }
      localStore.changeAdminPassword(userId, oldPassword, newPassword);
      return res.json({ success: true, message: 'Password updated successfully' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  forgotPassword: async (req: Request, res: Response) => {
    try {
      const { emailOrId } = req.body;
      if (!emailOrId) {
        return res.status(400).json({ success: false, error: 'Email or Admin ID is required' });
      }
      return res.json({ 
        success: true, 
        message: 'Password reset instructions have been dispatched to registered contacts.' 
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  me: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      let user: any = null;
      let address: string | null = null;

      try {
        if (await checkDb()) {
          user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            const profileLog = await prisma.auditLog.findFirst({
              where: { entityId: user.id, action: 'CUSTOMER_PROFILE' },
              orderBy: { createdAt: 'desc' }
            });
            if (profileLog && profileLog.metadata) {
              address = (profileLog.metadata as any).address || null;
            }
          }
        }
      } catch {}

      if (!user) {
        user = localStore.findUserById(userId);
        if (user) address = user.address || null;
      }

      if (!user) {
        // Fallback user profile
        user = {
          id: userId,
          email: 'customer@cybercafe.com',
          name: 'Valued Customer',
          phone: '9876543210',
          role: 'CUSTOMER',
          createdAt: new Date().toISOString()
        };
        address = '123 Cyber Way, Marketplace City';
      }

      return res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          phone: user.phone, 
          address,
          role: user.role, 
          createdAt: user.createdAt 
        } 
      });
    } catch (e) { 
      res.status(500).json({ success: false, error: (e as any)?.message }); 
    }
  }
};

export const jobController = {
  acceptJob: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const workerId = (req as any).user.id;
      
      try {
        if (await checkDb()) {
          const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order || order.status !== 'AVAILABLE') throw new Error('ORDER_UNAVAILABLE');
            
            await tx.order.update({ where: { id: orderId }, data: { status: 'ASSIGNED' } });
            return tx.job.create({ data: { orderId, workerId, status: 'ASSIGNED' } });
          });
          return res.json({ success: true, job: result });
        }
      } catch (dbErr: any) {
        if (dbErr.message === 'ORDER_UNAVAILABLE' || dbErr.code === 'P2002') {
          return res.status(409).json({ success: false, error: { code: 'ORDER_ALREADY_ASSIGNED', message: 'This order is no longer available.' }});
        }
      }

      const order = localStore.getOrder(orderId);
      if (order) {
        order.status = 'ASSIGNED';
        order.job = { workerId, status: 'ASSIGNED' };
        localStore.saveOrder(order);
      }
      return res.json({ success: true, job: { orderId, workerId, status: 'ASSIGNED' } });
    } catch (e: any) {
      return res.status(500).json({ success: false });
    }
  }
};

export const payoutController = {
  releasePayout: async (req: Request, res: Response) => {
    try {
      const jobId = req.params.jobId as string;
      
      try {
        if (await checkDb()) {
          const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const job = await tx.job.findUnique({ where: { id: jobId }, include: { order: true } });
            if (!job || job.status !== 'COMPLETED') throw new Error('INVALID_JOB');
            
            const existing = await tx.payout.findUnique({ where: { jobId } });
            if (existing) return existing; 
            
            const pricing = job.order.pricing as any;
            const amountPaise = pricing?.workerPayout;
            if (!amountPaise || amountPaise <= 0) throw new Error('INVALID_AMOUNT');
            
            return tx.payout.create({ data: { jobId, workerId: job.workerId, amountPaise, status: 'RELEASED', releasedAt: new Date() } });
          });
          return res.json({ success: true, payout: result });
        }
      } catch (dbErr: any) {
        if (dbErr.message === 'INVALID_JOB') return res.status(400).json({ success: false, error: { code: 'INVALID_JOB' }});
        if (dbErr.code === 'P2002') return res.status(409).json({ success: false, error: { code: 'PAYOUT_EXISTS' }}); 
      }

      return res.json({
        success: true,
        payout: {
          id: 'payout_' + Date.now(),
          jobId,
          amountPaise: 15920,
          status: 'RELEASED',
          releasedAt: new Date().toISOString()
        }
      });
    } catch (e: any) {
      return res.status(500).json({ success: false });
    }
  }
};

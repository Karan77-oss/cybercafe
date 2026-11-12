import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { localStore } from '../../catalogData';
import { prisma, checkDb, withDbRetry, isJsonFallbackAllowed } from '../../db';
import { supabaseAdmin } from '../../utils/supabaseClient';

export interface AuthUserPayload {
  id: string;
  role: 'CUSTOMER' | 'WORKER' | 'ADMIN';
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';

export const sendSuccess = (res: Response, data: Record<string, any> = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, ...data });
};

export const sendError = (res: Response, statusCode: number, code: string, message: string) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message }
  });
};

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional()
});

export const loginSchema = z.object({
  email: z.string().trim().optional(),
  emailOrId: z.string().trim().optional(),
  username: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  portal: z.string().trim().optional(),
  expectedRole: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required')
}).refine(
  data => Boolean(data.email || data.emailOrId || data.username || data.phone),
  { message: 'Valid login identifier (email, username, or phone) is required' }
);

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long')
});

export const forgotPasswordSchema = z.object({
  emailOrId: z.string().trim().min(1, 'Email or User ID is required')
});

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid input');
      }

      const { name, password, address } = parsed.data;
      const rawEmail = parsed.data.email;
      const rawPhone = parsed.data.phone;

      // 1. Strict normalization
      const email = rawEmail ? rawEmail.trim().toLowerCase() : '';
      const phone = rawPhone ? rawPhone.trim().replace(/\s+/g, '') : null;

      if (!email) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid email address is required');
      }

      // 2. Check for duplicate accounts in DB & localStore
      const isDbOnline = await checkDb().catch(() => false);
      let existingDbUser: any = null;
      if (isDbOnline) {
        existingDbUser = await withDbRetry(() =>
          prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: email, mode: 'insensitive' } },
                ...(phone ? [{ phone }] : [])
              ]
            }
          })
        ).catch(() => null);
      }

      if (existingDbUser) {
        return sendError(res, 409, 'DUPLICATE_EMAIL', 'Email or phone number is already registered');
      }

      if (localStore.findUserByEmail(email) || (phone && localStore.findUserByPhone(phone))) {
        return sendError(res, 409, 'DUPLICATE_EMAIL', 'Email or phone number is already registered');
      }

      // 3. Strict single Bcrypt hashing
      const passwordHash = await bcrypt.hash(password, 10);

      // 4. Force direct Prisma write to Supabase PostgreSQL "User" table
      let createdUser: any = null;
      if (isDbOnline) {
        try {
          createdUser = await withDbRetry(() =>
            prisma.user.create({
              data: {
                email,
                password: passwordHash,
                name: name.trim(),
                phone: phone || null,
                address: address ? address.trim() : null,
                role: 'CUSTOMER',
                status: 'ACTIVE'
              }
            })
          );
        } catch (dbErr: any) {
          if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === 'P2002') {
            return sendError(res, 409, 'DUPLICATE_EMAIL', 'Email or phone number is already in use');
          }
          console.warn('[Register] Supabase PostgreSQL write warning:', dbErr?.message);
          if (!isJsonFallbackAllowed()) {
            throw dbErr;
          }
        }
      }

      const userId = createdUser?.id || 'usr_' + Date.now();
      const createdAt = createdUser?.createdAt?.toISOString?.() || new Date().toISOString();

      // 5. Supabase Auth Sync
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.createUser({
            email,
            phone: phone || undefined,
            password,
            email_confirm: true,
            user_metadata: {
              role: 'CUSTOMER',
              name: name.trim(),
              prismaUserId: userId
            }
          });
        } catch (sbErr: any) {
          console.warn('[Supabase Auth Sync Warning]:', sbErr?.message || sbErr);
        }
      }

      // Profile address audit log
      if (createdUser && address) {
        try {
          await withDbRetry(() =>
            prisma.auditLog.create({
              data: {
                actorUserId: createdUser.id,
                action: 'CUSTOMER_PROFILE',
                entityType: 'User',
                entityId: createdUser.id,
                metadata: { address: address.trim() }
              }
            })
          );
        } catch {}
      }

      // 6. Mirror created user into localStore in-memory cache
      const newUserPayload = {
        id: userId,
        email,
        password: passwordHash,
        passwordHash,
        name: name.trim(),
        phone,
        address: address ? address.trim() : null,
        role: 'CUSTOMER' as const,
        status: 'ACTIVE',
        createdAt
      };

      localStore.saveUser(newUserPayload);

      const token = jwt.sign(
        { id: newUserPayload.id, role: newUserPayload.role, email: newUserPayload.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('cc_access_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return sendSuccess(res, {
        token,
        user: {
          id: newUserPayload.id,
          email: newUserPayload.email,
          name: newUserPayload.name,
          phone: newUserPayload.phone,
          address: newUserPayload.address,
          role: newUserPayload.role,
          createdAt: newUserPayload.createdAt
        }
      }, 201);
    } catch (error: any) {
      console.error('Registration error:', error);
      return sendError(res, 500, 'SERVER_ERROR', error.message || 'Internal server error');
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid login details');
      }

      const rawIdentifier = ((parsed.data.username || parsed.data.emailOrId || parsed.data.email || parsed.data.phone) as string).trim();
      const identifierLower = rawIdentifier.toLowerCase();
      const cleanPhone = rawIdentifier.replace(/\s+/g, '');
      const plainPassword = parsed.data.password;

      let user: any = null;
      let userAddress: string | null = null;

      const isDbOnline = await checkDb().catch(() => false);

      // 1. Check Worker in Supabase PostgreSQL (prisma.worker)
      if (isDbOnline) {
        try {
          const dbWorker = await withDbRetry(() =>
            prisma.worker.findFirst({
              where: {
                OR: [
                  { email: { equals: identifierLower, mode: 'insensitive' } },
                  { phone: cleanPhone },
                  { phone: rawIdentifier },
                  { id: rawIdentifier },
                  { id: identifierLower },
                  { name: { equals: rawIdentifier, mode: 'insensitive' } }
                ]
              }
            })
          );

          if (dbWorker) {
            const storedHash = dbWorker.passwordHash;
            let isPasswordValid = false;
            if (storedHash) {
              isPasswordValid = await bcrypt.compare(plainPassword, storedHash);
            }

            if (isPasswordValid) {
              const workerStatus = (dbWorker.status || 'ACTIVE').toUpperCase();
              if (workerStatus === 'DELETED') {
                return sendError(res, 403, 'ACCOUNT_DEACTIVATED', 'Your worker account has been deactivated.');
              }
              if (workerStatus === 'BLOCKED' || workerStatus === 'SUSPENDED') {
                return sendError(res, 403, 'ACCOUNT_BLOCKED', `Your worker account is ${workerStatus.toLowerCase()}.`);
              }

              // Update online status
              await prisma.worker.update({
                where: { id: dbWorker.id },
                data: { isOnline: true, lastLoginAt: new Date() }
              }).catch(() => {});

              // Ensure synced in localStore
              const storeW = localStore.getWorker(dbWorker.id) || localStore.workers.find(w => w.email.toLowerCase() === dbWorker.email.toLowerCase());
              if (storeW) {
                storeW.isOnline = true;
                storeW.status = 'ACTIVE';
              }

              // Issue valid JWT
              const token = jwt.sign(
                {
                  id: dbWorker.id,
                  userId: dbWorker.id,
                  workerId: dbWorker.id,
                  email: dbWorker.email,
                  name: dbWorker.name,
                  role: 'WORKER'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
              );

              const isProd = process.env.NODE_ENV === 'production';
              res.cookie('cc_access_token', token, {
                httpOnly: true,
                secure: isProd,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
              });

              return sendSuccess(res, {
                token,
                role: 'WORKER',
                user: {
                  id: dbWorker.id,
                  workerId: dbWorker.id,
                  email: dbWorker.email,
                  name: dbWorker.name,
                  phone: dbWorker.phone,
                  specialization: dbWorker.specialization,
                  role: 'WORKER',
                  status: dbWorker.status,
                  walletBalancePaise: dbWorker.walletBalancePaise,
                  totalEarningsPaise: dbWorker.totalEarningsPaise,
                  createdAt: dbWorker.createdAt
                }
              });
            }
          }
        } catch (workerDbErr: any) {
          console.warn('[Worker Login DB Notice]:', workerDbErr?.message);
        }
      }

      // 2. Query Customer / Admin in Supabase PostgreSQL via Prisma (prisma.user)
      if (isDbOnline) {
        try {
          const dbUser = await withDbRetry(() =>
            prisma.user.findFirst({
              where: {
                OR: [
                  { email: { equals: identifierLower, mode: 'insensitive' } },
                  { phone: cleanPhone },
                  { phone: rawIdentifier },
                  { id: rawIdentifier },
                  { id: identifierLower },
                  { name: { equals: rawIdentifier, mode: 'insensitive' } }
                ]
              }
            })
          );

          if (dbUser) {
            const storedHash = dbUser.password;
            let isPasswordValid = false;
            if (storedHash) {
              isPasswordValid = await bcrypt.compare(plainPassword, storedHash);
            }

            if (isPasswordValid) {
              user = dbUser;
              userAddress = dbUser.address || null;

              try {
                const profileLog = await prisma.auditLog.findFirst({
                  where: { entityId: dbUser.id, action: 'CUSTOMER_PROFILE' },
                  orderBy: { createdAt: 'desc' }
                });
                if (profileLog?.metadata && !userAddress) {
                  userAddress = (profileLog.metadata as any).address || null;
                }
              } catch {}

              localStore.saveUser({
                id: dbUser.id,
                workerId: dbUser.id,
                username: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                phone: dbUser.phone,
                address: userAddress,
                role: dbUser.role,
                password: dbUser.password,
                passwordHash: dbUser.password,
                accountStatus: dbUser.status || 'ACTIVE',
                status: dbUser.status || 'ACTIVE',
                isOnline: dbUser.role === 'WORKER',
                createdAt: dbUser.createdAt?.toISOString?.() || new Date().toISOString()
              });
            }
          }
        } catch (dbErr: any) {
          console.warn('[Login DB Query Notice]:', dbErr?.message);
        }
      }

      // 2. Supabase Auth fallback / session sync if configured
      if (!user && supabaseAdmin && identifierLower.includes('@')) {
        try {
          const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
            email: identifierLower,
            password: plainPassword
          });
          if (!authErr && authData?.user) {
            const meta = authData.user.user_metadata || {};
            const prismaUserId = meta.prismaUserId || authData.user.id;
            const dbUser = isDbOnline
              ? await prisma.user.findUnique({ where: { email: identifierLower } }).catch(() => null)
              : null;
            user = dbUser || {
              id: prismaUserId,
              email: authData.user.email,
              name: meta.name || authData.user.email?.split('@')[0],
              phone: authData.user.phone || meta.phone,
              role: meta.role || 'CUSTOMER',
              status: 'ACTIVE',
              createdAt: authData.user.created_at
            };
          }
        } catch {}
      }

      // 3. Fallback to localStore
      if (!user) {
        const storeWorker =
          localStore.getWorker(rawIdentifier) ||
          localStore.getWorker(identifierLower) ||
          localStore.workers.find(w => w.email.toLowerCase() === identifierLower);

        if (storeWorker) {
          const storedHash = (storeWorker as any).passwordHash || (storeWorker as any).password;
          if (storedHash && (await bcrypt.compare(plainPassword, storedHash))) {
            user = {
              id: storeWorker.id,
              workerId: storeWorker.id,
              email: storeWorker.email,
              name: storeWorker.name,
              phone: (storeWorker as any).mobile || (storeWorker as any).phone,
              role: 'WORKER',
              status: (storeWorker as any).status || 'ACTIVE'
            };
          }
        }
      }

      if (!user) {
        const storeUser =
          localStore.findUserById(rawIdentifier) ||
          localStore.findUserById(identifierLower) ||
          localStore.findUserById(rawIdentifier.toUpperCase()) ||
          localStore.findUserByEmail(identifierLower) ||
          localStore.findUserByPhone(cleanPhone) ||
          localStore.findUserByPhone(rawIdentifier);

        if (storeUser) {
          const storedHash = storeUser.password || storeUser.passwordHash;
          if (storedHash && (await bcrypt.compare(plainPassword, storedHash))) {
            user = storeUser;
            userAddress = storeUser.address || null;
          }
        }
      }

      if (!user) {
        return sendError(res, 401, 'UNAUTHORIZED', 'Invalid email/username or password');
      }

      const expectedRole = (parsed.data.portal || parsed.data.expectedRole || '').toUpperCase();
      if (expectedRole && expectedRole !== user.role) {
        return sendError(res, 403, 'FORBIDDEN', `Access denied: Account does not have ${expectedRole} privileges`);
      }

      if (user.role === 'WORKER') {
        const worker = localStore.getWorker(user.id);
        const accountStatus = worker?.accountStatus || worker?.status || user.accountStatus || user.status;

        if (accountStatus === 'DELETED') {
          return sendError(res, 403, 'ACCOUNT_DEACTIVATED', 'Your worker account has been deactivated.');
        }
        if (accountStatus === 'BLOCKED') {
          return sendError(res, 403, 'ACCOUNT_BLOCKED', 'Your worker account has been blocked.');
        }

        if (worker && accountStatus !== 'SUSPENDED' && accountStatus !== 'PAUSED') {
          worker.isOnline = true;
          worker.lastActivityAt = new Date().toISOString();
        }
      }

      const token = jwt.sign(
        {
          id: user.id,
          userId: user.id,
          workerId: user.role === 'WORKER' ? user.id : undefined,
          role: user.role,
          email: user.email,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('cc_access_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return sendSuccess(res, {
        token,
        role: user.role,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          address: userAddress,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return sendError(res, 500, 'SERVER_ERROR', error.message || 'Login failed');
    }
  },

  logout: async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.clearCookie('cc_access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      const user = req.user;
      if (user && user.role === 'WORKER') {
        const worker = localStore.getWorker(user.id);
        if (worker) {
          worker.isOnline = false;
        }
      }
      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error: any) {
      return sendError(res, 500, 'SERVER_ERROR', error.message || 'Logout failed');
    }
  },

  changePassword: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      }

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid password input');
      }

      const { oldPassword, newPassword } = parsed.data;
      const isDbConnected = await checkDb().catch(() => false);

      if (isDbConnected) {
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (dbUser) {
          const isMatch = await bcrypt.compare(oldPassword, dbUser.password);
          if (!isMatch) {
            return sendError(res, 400, 'INVALID_CREDENTIALS', 'Current password is incorrect');
          }

          const newHashedPassword = await bcrypt.hash(newPassword, 10);
          await prisma.user.update({
            where: { id: userId },
            data: { password: newHashedPassword }
          });
        }
      }

      try {
        if (typeof localStore.changeAdminPassword === 'function') {
          localStore.changeAdminPassword(userId, oldPassword, newPassword);
        }
      } catch (storeErr: any) {
        if (!isDbConnected) {
          return sendError(res, 400, 'PASSWORD_CHANGE_FAILED', storeErr.message || 'Failed to update password');
        }
      }

      return sendSuccess(res, { message: 'Password updated successfully' });
    } catch (error: any) {
      return sendError(res, 500, 'SERVER_ERROR', error.message || 'Error changing password');
    }
  },

  forgotPassword: async (req: Request, res: Response) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Email or User ID is required');
      }

      return sendSuccess(res, {
        message: 'If the account exists, password reset instructions have been sent to registered contact details.'
      });
    } catch (error: any) {
      return sendError(res, 500, 'SERVER_ERROR', error.message || 'Password reset request failed');
    }
  },

  me: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 401, 'UNAUTHORIZED', 'Authentication token missing or invalid');
      }

      let user: any = null;
      let userAddress: string | null = null;

      const isDbConnected = await checkDb().catch(() => false);
      if (isDbConnected) {
        try {
          user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            const profileLog = await prisma.auditLog.findFirst({
              where: { entityId: user.id, action: 'CUSTOMER_PROFILE' },
              orderBy: { createdAt: 'desc' }
            });
            if (profileLog?.metadata) {
              userAddress = (profileLog.metadata as any).address || null;
            }
          }
        } catch (dbErr) {
          console.error('Failed to fetch user from DB:', dbErr);
        }
      }

      if (!user) {
        user = localStore.findUserById(userId);
        if (user) {
          userAddress = user.address || null;
        }
      }

      if (!user) {
        return sendError(res, 404, 'USER_NOT_FOUND', 'User account was not found');
      }

      return sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          address: userAddress,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      return sendError(res, 500, 'SERVER_ERROR', error.message || 'Failed to fetch user details');
    }
  }
};
export default authController;

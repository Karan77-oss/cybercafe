import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { localStore } from '../catalogData';
import { prisma, checkDb } from '../db';

export interface AuthUser extends JwtPayload {
  id: string;
  userId?: string;
  sub?: string;
  email?: string;
  role: string;
  name?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

declare module 'express-serve-static-core' {
  interface IRouterMatcher<
    T,
    Method extends 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' = any
  > {
    <
      Route extends string,
      P = ParamsDictionary,
      ResBody = any,
      ReqBody = any,
      ReqQuery = any,
      LocalsObj extends Record<string, any> = Record<string, any>
    >(
      path: Route,
      ...handlers: Array<(...args: any[]) => any>
    ): T;
    (path: any, ...handlers: Array<(...args: any[]) => any>): T;
  }

  interface IRouter {
    listen(port: number | string, callback?: () => void): any;
    listen(port: number, hostname: string, callback?: () => void): any;
  }
}

const getJwtSecret = (): string => {
  const rawSecret =
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    'super-secret-jwt-key';
  return rawSecret.replace(/['"]/g, '').trim();
};

const extractToken = (req: Request): string | null => {
  let token: string | null = null;

  // 1. Check HttpOnly cookie first
  if ((req as any).cookies?.cc_access_token) {
    token = (req as any).cookies.cc_access_token;
  }

  // 2. Fall back to Authorization: Bearer <token>
  if (!token) {
    const authHeader = req.headers.authorization || (req.headers.Authorization as string | undefined);
    if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length >= 2) {
        token = parts[1];
      }
    }
  }

  // 3. Fall back to other legacy sources
  if (!token || token === 'null' || token === 'undefined') {
    if (typeof req.query?.token === 'string') {
      token = req.query.token;
    } else if (Array.isArray(req.query?.token) && typeof req.query.token[0] === 'string') {
      token = req.query.token[0] as string;
    } else if ((req as any).cookies?.token) {
      token = (req as any).cookies.token;
    } else if (req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']);
    }
  }

  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }

  return token.replace(/['"]/g, '').trim();
};

export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized / Token missing',
      code: 'AUTH_FAILED',
    });
    return;
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    if (decoded && typeof decoded === 'object') {
      const payload = decoded as Record<string, any>;
      const uid = String(payload.id || payload.userId || payload.user_id || payload.sub || '');
      let resolvedRole = String(
        payload.role !== 'authenticated' && payload.role
          ? payload.role
          : payload.user_metadata?.role ||
          payload.app_metadata?.role ||
          payload.role ||
          'CUSTOMER'
      );

      // Verify active account status against local store / database
      if (uid) {
        const storeUser = localStore.findUserById(uid);
        if (storeUser) {
          const status = (storeUser.accountStatus || (storeUser as any).status || '').toUpperCase();
          if (status === 'BLOCKED' || status === 'SUSPENDED' || status === 'DELETED') {
            res.status(403).json({
              success: false,
              error: `Account is ${status.toLowerCase()}. Access denied.`,
              code: 'ACCOUNT_INACTIVE',
            });
            return;
          }
          if (storeUser.role) {
            resolvedRole = storeUser.role;
          }
        }

        const isDbConnected = await checkDb().catch(() => false);
        if (isDbConnected) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: uid },
              select: { id: true, role: true, status: true }
            });
            if (dbUser) {
              const dbStatus = (dbUser.status || '').toUpperCase();
              if (dbStatus === 'BLOCKED' || dbStatus === 'SUSPENDED' || dbStatus === 'DELETED') {
                res.status(403).json({
                  success: false,
                  error: `Account is ${dbStatus.toLowerCase()}. Access denied.`,
                  code: 'ACCOUNT_INACTIVE',
                });
                return;
              }
              if (dbUser.role) {
                resolvedRole = dbUser.role;
              }
            } else {
              // Check dedicated Worker table
              const dbWorker = await prisma.worker.findUnique({
                where: { id: uid },
                select: { id: true, status: true }
              });
              if (dbWorker) {
                const wStatus = (dbWorker.status || '').toUpperCase();
                if (wStatus === 'BLOCKED' || wStatus === 'SUSPENDED' || wStatus === 'DELETED') {
                  res.status(403).json({
                    success: false,
                    error: `Worker account is ${wStatus.toLowerCase()}. Access denied.`,
                    code: 'ACCOUNT_INACTIVE',
                  });
                  return;
                }
                resolvedRole = 'WORKER';
              }
            }
          } catch {
            // DB transient failure: proceed with cached/store verification
          }
        }
      }

      req.user = {
        ...payload,
        id: uid,
        userId: uid,
        sub: uid,
        role: resolvedRole,
      };
    } else {
      const subStr = String(decoded);
      req.user = { id: subStr, userId: subStr, sub: subStr, role: 'CUSTOMER' };
    }

    next();
  } catch (e) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized / Token expired',
      code: 'AUTH_FAILED',
    });
  }
};

export const requireRole =
  (roles: string | readonly string[]): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized / Token expired',
          code: 'AUTH_FAILED',
        });
        return;
      }

      const roleList = Array.isArray(roles) ? roles : [roles as string];
      const allowedRoles = roleList.map((r) => String(r || '').toUpperCase().trim());

      const rawUserRole =
        user.role !== 'authenticated' && user.role
          ? user.role
          : user.user_metadata?.role || user.app_metadata?.role || user.role || '';
      const userRole = String(rawUserRole).toUpperCase().trim();

      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions',
          code: 'FORBIDDEN',
        });
        return;
      }

      next();
    };
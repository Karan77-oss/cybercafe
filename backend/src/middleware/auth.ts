import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ')) 
      ? authHeader.split(' ')[1] 
      : (req.query.token as string);
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized / Token expired', 
        code: 'AUTH_FAILED' 
      });
    }
    try {
        const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';
        const decoded = jwt.verify(token, secret);
        (req as any).user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized / Token expired', 
          code: 'AUTH_FAILED' 
        });
    }
};

export const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized / Token expired', 
          code: 'AUTH_FAILED' 
        });
    }
    const userRole = String(user.role || '').toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Forbidden: Insufficient permissions', 
          code: 'FORBIDDEN' 
        });
    }
    next();
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ')) 
      ? authHeader.split(' ')[1] 
      : (req.query.token as string);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';
        const decoded = jwt.verify(token, secret);
        (req as any).user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userRole = String(user.role || '').toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

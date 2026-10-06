"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
        ? authHeader.split(' ')[1]
        : req.query.token;
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized / Token expired',
            code: 'AUTH_FAILED'
        });
    }
    try {
        const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-key';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch (e) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized / Token expired',
            code: 'AUTH_FAILED'
        });
    }
};
exports.requireAuth = requireAuth;
const requireRole = (roles) => (req, res, next) => {
    const user = req.user;
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
exports.requireRole = requireRole;

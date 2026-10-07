"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const allowedOrigins = [
    'http://localhost:5173', // Web customer frontend
    'http://localhost:5174', // Admin portal
    'http://localhost:5175', // Worker portal
    'http://localhost:5176', // Mobile dev server
    'capacitor://localhost', // iOS / Native Capacitor origin
    'http://localhost', // Android WebView origin
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile native apps or curl) or matching origins
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.')) {
            return callback(null, true);
        }
        return callback(null, true); // Permissive during local development & testing
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};
// 1. CORS & Preflight handling
app.use((0, cors_1.default)(corsOptions));
app.options(/(.*)/, (0, cors_1.default)(corsOptions));
// 2. Request body parsers
// Capture raw body for webhook signature verification
app.use(express_1.default.json({
    limit: '15mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// 3. Serverless cold-start DB initialization
let dbInitStarted = false;
app.use((req, res, next) => {
    if (!dbInitStarted) {
        dbInitStarted = true;
        (0, db_1.initDatabase)().catch(err => {
            console.error('[Database] Serverless startup sync error:', err?.message || err);
        });
    }
    next();
});
// 4. Base health routes
app.get('/', (req, res) => res.json({ name: 'Cyber Cafe Marketplace API', status: 'ok', version: '1.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
// 5. API Routes mounting
app.use('/api', routes_1.default);
// 6. JSON 404 Fallback Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found`,
        code: 'NOT_FOUND'
    });
});
// 7. Centralized JSON Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_SERVER_ERROR'
    });
});
exports.default = app;

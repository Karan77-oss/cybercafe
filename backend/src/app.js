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

const defaultLocalOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
];

const parseAllowedOrigins = () => {
    const envOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
        : [];
    return Array.from(new Set([...defaultLocalOrigins, ...envOrigins]));
};

app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = parseAllowedOrigins();
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (allowed.includes(cleanOrigin) || (process.env.NODE_ENV !== 'production' && allowed.includes('*'))) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

let dbInitStarted = false;
app.use((req, res, next) => {
    if (!dbInitStarted) {
        dbInitStarted = true;
        (0, db_1.initDatabase)().catch(err => {
            console.error('[Database] Serverless startup sync error:', (err === null || err === void 0 ? void 0 : err.message) || err);
        });
    }
    next();
});

app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.get('/', (req, res) => res.json({ name: 'Cyber Cafe Marketplace API', status: 'ok', version: '1.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes_1.default);

exports.default = app;

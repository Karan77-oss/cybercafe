import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { initDatabase } from './db';

const app = express();

const defaultLocalOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
];

const parseAllowedOrigins = (): string[] => {
  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
    : [];
  return Array.from(new Set([...defaultLocalOrigins, ...envOrigins]));
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, curl, webhooks)
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

// Serverless cold-start DB initialization
let dbInitStarted = false;
app.use((req, res, next) => {
  if (!dbInitStarted) {
    dbInitStarted = true;
    initDatabase().catch(err => {
      console.error('[Database] Serverless startup sync error:', err?.message || err);
    });
  }
  next();
});

// Middleware to capture raw body for webhook verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.get('/', (req, res) => res.json({ name: 'Cyber Cafe Marketplace API', status: 'ok', version: '1.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

export default app;


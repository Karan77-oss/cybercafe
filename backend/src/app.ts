import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';
import { initDatabase } from './db';

const app = express();

const allowedOrigins = [
  'http://localhost:5173', // Web customer frontend
  'http://localhost:5174', // Admin portal
  'http://localhost:5175', // Worker portal
  'http://localhost:5176', // Mobile dev server
  'capacitor://localhost', // iOS / Native Capacitor origin
  'http://localhost',      // Android WebView origin
];

const corsOptions: cors.CorsOptions = {
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
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

// 2. Request body parsers
// Capture raw body for webhook signature verification
app.use(express.json({
  limit: '15mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 3. Serverless cold-start DB initialization
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

// 4. Base health routes
app.get('/', (req, res) => res.json({ name: 'Cyber Cafe Marketplace API', status: 'ok', version: '1.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 5. API Routes mounting
app.use('/api', routes);

// 6. JSON 404 Fallback Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'NOT_FOUND'
  });
});

// 7. Centralized JSON Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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

export default app;



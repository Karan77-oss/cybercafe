import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';

const app = express();

// 1. CORS Configuration (Seamlessly allow Vercel, Custom Domains, Capacitor, and Localhost Admin)
const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  // Allow non-browser requests (e.g. mobile native app Capacitor HTTP, Postman, Railway/Docker health checks)
  if (!origin) return true;

  // Allow Capacitor & Ionic mobile app webview origins
  if (origin === 'capacitor://localhost' || origin === 'ionic://localhost') return true;

  // Allow all Localhost ports for Admin Portal and local developer machines
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;

  // Allow all Vercel deployments (*.vercel.app)
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/.test(origin)) return true;

  // Allow explicitly configured custom domains from environment
  if (allowedOriginsEnv.some(allowed => origin === allowed || origin.endsWith(allowed))) return true;

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS Warning] Request from unauthorized origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['set-cookie']
  })
);

// 2. Body Parsers (Preserve rawBody for Razorpay Webhook signature verification)
app.use(
  express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie Parser (Extract cookies including cc_access_token)
app.use((req: any, _res: Response, next: NextFunction) => {
  if (!req.cookies) {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie: string) => {
        const parts = cookie.split('=');
        const key = parts[0]?.trim();
        if (key) {
          req.cookies[key] = decodeURIComponent(parts.slice(1).join('=').trim());
        }
      });
    }
  }
  next();
});

// 3. Static Files for Local Document/Receipt Fallback
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));
app.use('/api/uploads', express.static(uploadsPath));

// 4. Health Check & Root Welcome Endpoints
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Cyber Cafe Marketplace API is running',
    status: 'online',
    version: '1.0.0',
    health: '/health',
    portals: {
      customer: 'http://localhost:5173',
      admin: 'http://localhost:5174',
      worker: 'http://localhost:5175',
      mobilePreview: 'http://localhost:5176'
    }
  });
});

// 5. Mount All API Routes (Supports both /api/... and direct /... calls)
app.use('/api', routes);
app.use('/', routes);

// 6. Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[App Error]:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

export { app };
export default app;
import 'dotenv/config';
import http from 'http';
import app from './app';
import { initDatabase, prisma } from './db';
import { startBackgroundTimers, stopBackgroundTimers } from './timers';

// ==========================================
// CONFIGURATION
// ==========================================
// When running on Railway, process.env.PORT is injected automatically.
// In local development, falls back to 4000.
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

let server: http.Server | null = null;

// ==========================================
// SERVER BOOTSTRAP LIFECYCLE
// ==========================================
async function bootstrap() {
  try {
    console.log(`[Server] Starting application in "${NODE_ENV}" mode...`);

    // 1. Initialize and synchronize database first
    const dbConnected = await initDatabase();
    if (!dbConnected) {
      console.warn('[Server] Running in fallback in-memory store mode (DB unavailable).');
    }

    // 2. Start central background jobs (offer timeouts, inactivity checks)
    //    Skip when running on Vercel Serverless (timers freeze between invocations)
    //    or when explicitly disabled via env flag (e.g., for horizontal scaling cron mode).
    const isVercel = process.env.VERCEL === '1';
    const disableTimers = process.env.DISABLE_INTERNAL_TIMERS === 'true';
    if (!isVercel && !disableTimers) {
      startBackgroundTimers();
    } else {
      console.log('[Server] Internal background timers disabled. Using external cron endpoint (/api/internal/cron/timers).');
    }

    // 3. Start listening for incoming HTTP requests (0.0.0.0 required for Railway / Cloud)
    server = app.listen(PORT, HOST, () => {
      console.log(`[Server] 🚀 Server is live and listening on http://${HOST}:${PORT}`);
      console.log(`[Server] Environment: ${NODE_ENV} | Process ID: ${process.pid}`);
    });

  } catch (error: any) {
    console.error('[Server] Fatal startup failure:', error.message || error);
    process.exit(1);
  }
}

// ==========================================
// GRACEFUL SHUTDOWN PIPELINE
// ==========================================
async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  // Stop background timers immediately
  stopBackgroundTimers();

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP connection server closed.');

      // Safely close Prisma database connection pool
      try {
        await prisma.$disconnect();
        console.log('[Server] Database connections disconnected cleanly.');
      } catch (err: any) {
        console.error('[Server] Error disconnecting database pool:', err.message);
      }

      console.log('[Server] Process terminated safely.');
      process.exit(0);
    });

    // Force exit if cleanup takes longer than 10 seconds
    setTimeout(() => {
      console.error('[Server] Forceful shutdown timeout exceeded (10s). Exiting immediately.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

// Process Signals for PM2, Docker, Nodemon, and Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==========================================
// GLOBAL UNHANDLED ERROR HANDLERS
// ==========================================
process.on('uncaughtException', (err: Error) => {
  console.error('[Server] Uncaught Exception thrown:', err.message);
  console.error(err.stack);
  // Fail-fast on critical uncaught errors
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Server] Unhandled Promise Rejection:', reason?.message || reason);
});

// Run application
bootstrap();
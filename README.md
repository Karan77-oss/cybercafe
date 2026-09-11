# Cyber Cafe Marketplace Platform

A full-stack, enterprise-grade marketplace connecting customers with verified Cyber Cafe operators and digital service providers for government documentation, certificates, online applications, and digital services.

## Architecture

- **Frontend**: React 19, Vite 8, Lucide Icons, React Router SPA
- **Backend**: Node.js v24, Express 5, TypeScript 7
- **Database & Persistence**: PostgreSQL (Supabase), Prisma ORM v5.22, Resilient Fallback Cache
- **Storage**: Supabase Storage (`customer-documents` bucket)
- **Security & Auth**: JWT (HS256), Bcrypt password hashing, Strict Role-Based Access Control (RBAC)
- **Server Timers**: Background jobs for 10-minute order offers, 30-minute inactivity auto-offline, and 2-hour correction windows

---

## Portals Included

1. **Customer Portal** (`/`, `/services`, `/orders`, `/customer/*`):
   - Service discovery and catalog with custom form schemas
   - Document uploads and secure file management
   - Real-time order tracking and scheduling
   - Customer wallet, notifications, and satisfaction reviews

2. **Worker Portal** (`/worker/*`):
   - Real-time available job requests with 10-minute acceptance timer
   - Active order workspace, status updates, and milestone tracking
   - Mandatory final output deliverable upload
   - Earnings ledger, wallet, and withdrawal management (Bank/UPI)
   - Order-scoped communication and support ticketing

3. **Admin Portal** (`/admin/*`):
   - 11 comprehensive operational modules
   - Operations dashboard with 13 real-time platform metrics
   - Worker verification (11 fields, ID proof audit) and account status management
   - Customer management, dispute investigation, and audit logs
   - Order overrides: manual assignment, status updates, earnings holds/releases, and refunds
   - Official service catalog controls and worker proposal approvals
   - Financial summaries, top earner leaderboards, and withdrawal approvals
   - 14 exportable reports across custom date ranges (CSV, Excel, PDF)

---

## Getting Started Locally

### Prerequisites
- Node.js v20+ (recommended v24)
- npm or yarn

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Configure your DATABASE_URL, SUPABASE credentials, and JWT_SECRET in .env
npx prisma generate
npm run build
npm start
```

Backend runs on `http://localhost:4000`.

### 2. Frontend Setup

```bash
# In project root
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` requests to port 4000.

---

## Deployment Guide

### Deploying Frontend to Vercel

1. Import the repository in [Vercel](https://vercel.com).
2. Root directory: `./` (project root).
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL`: Your hosted backend URL (e.g. `https://your-backend.railway.app/api`)
7. Deploy! Single-page app routing is pre-configured in `vercel.json`.

### Deploying Backend (Railway, Render, Fly.io, or VPS)

Since the backend utilizes persistent server-side timers and background intervals (10-minute offers, 30-minute inactivity), deploy the Express backend to a Node.js runtime host:

1. Deploy the `/backend` directory.
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `npm start`
4. Set required environment variables as shown in `backend/.env.example`.

---

## Verification & Testing

```bash
# Backend tests (Jest)
npm test --prefix backend

# Backend typecheck
npm run typecheck --prefix backend

# Frontend production build
npm run build
```

---

## License

MIT License - Copyright (c) 2026 Karan77-oss

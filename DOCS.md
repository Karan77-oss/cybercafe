# Cyber Cafe Marketplace — Project Documentation

> An enterprise-grade, full-stack marketplace platform connecting customers with verified Cyber Cafe operators and digital service providers for government documentation, certificates, online applications, and digital services.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Portals & Features](#4-portals--features)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Background Timers & Automation](#7-background-timers--automation)
8. [Authentication & Security](#8-authentication--security)
9. [Environment Variables](#9-environment-variables)
10. [Local Development Setup](#10-local-development-setup)
11. [Deployment Guide](#11-deployment-guide)
12. [Testing](#12-testing)
13. [Scripts Reference](#13-scripts-reference)
14. [License](#14-license)

---

## 1. Project Overview

The **Cyber Cafe Marketplace** is a three-sided marketplace platform:

| Actor | Role |
|-------|------|
| **Customer** | Discovers services, uploads documents, places orders, tracks progress, pays online |
| **Worker (Operator)** | Receives job offers, completes assigned work, uploads deliverables, earns payouts |
| **Admin** | Manages the entire platform — verifies workers, oversees orders, handles disputes, approves withdrawals, generates reports |

**Core flow:**
1. Customer selects a service from the catalog → fills dynamic form → uploads documents → pays via Razorpay
2. Backend broadcasts the order to available workers (10-minute acceptance window)
3. Worker accepts → starts work → uploads receipts/deliverables → submits for review
4. Admin verifies output → releases worker earnings → customer is notified

---

## 2. Architecture & Tech Stack

### Frontend (Customer Portal)
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool & dev server |
| React Router | Latest | Client-side SPA routing |
| Lucide Icons | Latest | Icon library |
| Vanilla CSS | — | Custom styling |

### Admin Portal
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | Latest | Build tool |

### Worker Portal
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | Latest | Build tool |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | v24 | JavaScript runtime |
| Express | 5 | HTTP server framework |
| TypeScript | 7 | Type safety |
| Prisma ORM | 5.22 | Database access layer |
| PostgreSQL (Supabase) | — | Primary relational database |
| Supabase Storage | — | File/document storage |
| JWT (HS256) | — | Authentication tokens |
| Bcrypt | — | Password hashing |
| Multer | — | File upload handling |
| Zod | 4.4 | Schema validation |
| Razorpay | — | Payment gateway |

### Infrastructure
| Service | Purpose |
|---|---|
| **Supabase** | PostgreSQL DB + storage bucket (`customer-documents`) |
| **Railway** | Node.js backend hosting (supports persistent timers) |
| **Vercel** | SPA frontends (Customer, Admin, Worker) |

---

## 3. Repository Structure

```
cy/                                  # Monorepo root (npm workspaces)
├── frontend/                        # Customer-facing React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── customer/            # Customer portal pages
│   │   │   │   ├── Home.jsx
│   │   │   │   ├── ServicesPage.jsx
│   │   │   │   ├── ServiceForm.jsx  # Dynamic form builder
│   │   │   │   ├── OrderTracking.jsx
│   │   │   │   ├── MyOrders.jsx
│   │   │   │   ├── CustomerDocuments.jsx
│   │   │   │   ├── Wallet.jsx
│   │   │   │   ├── CustomerNotifications.jsx
│   │   │   │   ├── Profile.jsx
│   │   │   │   └── Help.jsx
│   │   ├── components/
│   │   │   ├── StatCard.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── api/                     # API client utilities
│   │   ├── contexts/                # React context providers
│   │   └── styles/
│   ├── index.html
│   ├── vite.config.js
│   └── vercel.json
│
├── admin/                           # Admin portal React SPA
│   └── src/
│
├── worker/                          # Worker portal React SPA
│   └── src/
│
├── backend/                         # Express API server
│   ├── src/
│   │   ├── server.ts                # Entry point
│   │   ├── app.ts                   # Express app setup, CORS, middleware
│   │   ├── routes.ts                # All route definitions
│   │   ├── controllers.ts           # Auth, job, payout controllers
│   │   ├── extendedControllers.ts   # Services, orders, documents, wallet, notifications
│   │   ├── portalControllers.ts     # Worker portal, Admin portal, Notifications
│   │   ├── db.ts                    # Database init & Prisma client
│   │   ├── catalogData.ts           # In-memory local store + seed data
│   │   ├── timers.ts                # Background timer jobs
│   │   ├── webhook.ts               # Razorpay webhook handler
│   │   ├── middleware/
│   │   │   └── auth.ts              # JWT auth middleware, role guards
│   │   ├── modules/                 # Feature modules
│   │   │   ├── auth/
│   │   │   ├── orders/
│   │   │   ├── services/
│   │   │   ├── documents/
│   │   │   ├── jobs/
│   │   │   ├── payments/
│   │   │   ├── payouts/
│   │   │   ├── proposals/
│   │   │   └── users/
│   │   ├── config/
│   │   └── utils/
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── migrations/
│   ├── api/
│   │   └── index.ts                 # Vercel serverless adapter
│   ├── Dockerfile
│   ├── vercel.json
│   └── railway.json
│
├── shared/                          # Shared types/utilities (workspace)
├── docs/                            # Additional documentation
│   ├── API_SPECIFICATION.md
│   ├── DATABASE_CONTEXT.md
│   ├── FINAL_TEST_REPORT.md
│   └── PRODUCTION_DATABASE_CLEANUP_REPORT.md
│
├── tests/                           # Integration tests
├── package.json                     # Root workspace config
├── vercel.json                      # Root Vercel config
├── railway.json                     # Railway deployment config
└── nixpacks.toml                    # Nixpacks build config
```

---

## 4. Portals & Features

### 4.1 Customer Portal

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page, platform intro |
| Services | `/services` | Browse & search service catalog |
| Service Form | `/services/:id` | Dynamic form, document upload, worker selection |
| Checkout | `/checkout` | Order summary + Razorpay payment |
| My Orders | `/orders` | List of all placed orders |
| Order Tracking | `/orders/:id` | Real-time status tracking, chat, deliverable download |
| Documents | `/customer/documents` | Secure document vault |
| Wallet | `/customer/wallet` | Wallet balance, transaction history |
| Notifications | `/customer/notifications` | Order & platform notifications |
| Profile | `/customer/profile` | Account settings |
| Help | `/customer/help` | Support & FAQ |
| How It Works | `/how-it-works` | Platform guide |

**Key customer capabilities:**
- Browse services by category
- Fill service-specific dynamic forms (JSON schema-driven)
- Upload documents securely (Supabase Storage)
- Select preferred worker (optional)
- Pay via Razorpay (UPI, cards, net banking)
- Track order status in real-time with timeline
- Download completed deliverables
- Submit reviews and ratings
- File complaints on orders
- Manage wallet and view receipts

---

### 4.2 Worker Portal (`/worker/*`)

**Key worker capabilities:**
- Toggle online/offline availability
- View real-time incoming job requests (10-minute timer per offer)
- Accept or reject job offers
- Access customer-uploaded documents securely
- Set appointment time slots (with customer accept/reschedule flow)
- Update order status (start work → complete → submit)
- Upload receipts and final deliverables (mandatory before submission)
- View earnings ledger and history
- Request withdrawals (Bank Transfer / UPI)
- Real-time chat per order
- Create support tickets
- Propose new services for admin review

---

### 4.3 Admin Portal (`/admin/*`)

**11 comprehensive operational modules:**

| Module | Description |
|--------|-------------|
| **Dashboard** | 13 real-time platform metrics |
| **Worker Management** | 11-field verification, ID proof audit, status control |
| **Customer Management** | View profiles, manage account status |
| **Order Management** | Manual assignment, reassignment, status overrides |
| **Financial Management** | Commission reports, platform fees, refunds, ledger |
| **Withdrawal Approvals** | Review & approve/reject worker withdrawal requests |
| **Service Catalog** | Create, update, toggle, delete official services |
| **Proposals** | Approve/reject worker-proposed services |
| **Complaints & Disputes** | Investigate, reply, resolve customer complaints |
| **Support Desk** | Manage worker support tickets |
| **Audit Logs** | Full action trail for compliance |
| **Reports** | 14 exportable reports (CSV, Excel, PDF) across custom date ranges |
| **Notifications** | Platform-wide admin notifications |
| **Settings** | Platform configuration |

---

## 5. Database Schema

### Core Models

```
User
├── id, email, password (bcrypt), name
├── role: CUSTOMER | WORKER | ADMIN
├── status: ACTIVE | INACTIVE | SUSPENDED | BLOCKED | PENDING
├── isOnline, lastActivityAt
├── verificationStatus: PENDING | VERIFIED | REJECTED
└── bankDetails (JSON for UPI/bank payouts)

Service
├── id, name, slug, description, category
├── pricePaise, workerAmountPaise, adminCommissionPaise, platformFeePaise
├── formSchema (JSON — dynamic customer intake form)
├── requiredDocuments[]
└── status: DRAFT | ACTIVE | INACTIVE | ARCHIVED | REJECTED | SUSPENDED

Order
├── id, orderNumber (unique human-readable ref)
├── customerId, serviceId, assignedWorkerId
├── serviceSnapshot (JSON — immutable price at purchase time)
├── pricing (JSON — full breakdown)
├── status: 15-state lifecycle (CREATED → COMPLETED)
├── paymentStatus: PENDING | PAID | FAILED | REFUNDED
└── earningStatus: PENDING | AVAILABLE | ON_HOLD | RELEASED | ADJUSTED

Job                → 1-to-1 with Order (single active assignment)
Payment            → Razorpay providerOrderId, signature
Payout             → 1-to-1 with Job (single payout per job)
WorkerEarning      → per-order earning record with hold/release lifecycle
Withdrawal         → worker payout request (Bank/UPI)
Document           → file metadata + Supabase Storage URL
Receipt            → worker-submitted completion receipt
Complaint          → customer order complaint with admin reply thread
Review             → customer satisfaction rating + comment
Notification       → per-recipient, per-role system notifications
FinancialLedger    → double-entry financial audit trail
AuditLog           → admin action audit trail
ServiceProposal    → worker-proposed new services
```

### Enums Summary

| Enum | Values |
|------|--------|
| `Role` | `CUSTOMER`, `WORKER`, `ADMIN` |
| `OrderStatus` | 15 states (full lifecycle) |
| `JobStatus` | `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `SUBMITTED`, `COMPLETED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED` |
| `PayoutStatus` | `PENDING`, `ELIGIBLE`, `RELEASED`, `FAILED` |
| `ServiceStatus` | `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`, `REJECTED`, `SUSPENDED` |
| `ApprovalStatus` | `PENDING_APPROVAL`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED` |

---

## 6. API Reference

Base URL: `https://your-backend.railway.app/api`
All authenticated routes require: `Authorization: Bearer <token>`

### 6.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Register new user |
| `POST` | `/auth/login` | — | Login, returns JWT |
| `POST` | `/auth/logout` | ✅ | Invalidate session |
| `GET` | `/auth/me` | ✅ | Get current user profile |
| `POST` | `/auth/change-password` | ✅ | Change password |
| `POST` | `/auth/forgot-password` | — | Password reset request |

### 6.2 Services Catalog

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/services` | — | List all active services |
| `GET` | `/services/:id` | — | Get single service with form schema |
| `GET` | `/workers/available` | Optional | Get available workers for selection |

### 6.3 Customer — Orders & Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/orders` | Create order |
| `GET` | `/orders` | List my orders |
| `GET` | `/orders/:id` | Get order details |
| `POST` | `/orders/:id/pay` | Initiate payment |
| `POST` | `/orders/:id/timeslot/accept` | Accept worker's proposed time slot |
| `POST` | `/orders/:id/timeslot/reschedule` | Request reschedule |
| `POST` | `/orders/:id/review` | Submit satisfaction review |
| `POST` | `/orders/:id/documents` | Upload document to order |
| `GET` | `/orders/:id/receipt` | Get order receipt |
| `POST` | `/orders/:id/receipt/download` | Download receipt PDF |
| `POST` | `/orders/:id/complaints` | File a complaint |
| `GET` | `/orders/:id/deliverables/:dId/download` | Download deliverable file |
| `POST` | `/payments/webhook` | Razorpay webhook |

### 6.4 Customer — Wallet & Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/customer/wallet` | Get wallet balance & history |
| `GET` | `/customer/notifications` | Get notifications |
| `POST` | `/documents/upload` | Upload a document |
| `GET` | `/documents/:id` | Get signed URL for document |
| `GET` | `/documents/:id/download` | Download document |

### 6.5 Worker Portal (all require WORKER or ADMIN role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/worker/orders/available` | List available job offers |
| `POST` | `/worker/orders/:id/accept` | Accept a job offer |
| `GET` | `/worker/orders/active` | List active jobs |
| `GET` | `/worker/orders/:id` | Get order details |
| `GET` | `/worker/orders/:id/documents` | View customer documents |
| `POST` | `/worker/orders/:id/start` | Mark work started |
| `POST` | `/worker/orders/:id/complete` | Complete order |
| `POST` | `/worker/orders/:id/receipt` | Upload receipt (file) |
| `GET` | `/worker/earnings/summary` | Earnings summary |
| `GET` | `/worker/withdrawals` | List withdrawal requests |
| `POST` | `/worker/withdrawals` | Request new withdrawal |
| `GET` | `/worker/withdrawals/:id` | Get withdrawal details |
| `POST` | `/worker/jobs/:id/timeslot` | Propose time slot |
| `POST` | `/worker/jobs/:id/timeslot/accept-reschedule` | Accept customer reschedule |
| `POST` | `/worker/jobs/:id/deliverables` | Upload deliverable (file) |
| `DELETE` | `/worker/jobs/:id/deliverables/:dId` | Delete deliverable |
| `POST` | `/worker/jobs/:id/submit` | Submit completed job |
| `POST` | `/worker/availability/toggle` | Toggle online/offline |
| `POST` | `/worker/activity` | Record heartbeat activity |
| `GET` | `/worker/stats` | Worker statistics |
| `GET` | `/worker/earnings` | Earnings history |
| `GET` | `/worker/notifications` | Worker notifications |
| `PUT` | `/worker/notifications/:id/read` | Mark notification read |
| `GET` | `/worker/chat/:orderId` | Get order chat messages |
| `POST` | `/worker/chat/:orderId` | Send chat message |
| `GET` | `/worker/support/tickets` | List support tickets |
| `POST` | `/worker/support/tickets` | Create support ticket |
| `GET` | `/worker/profile` | Get worker profile |
| `PUT` | `/worker/profile` | Update worker profile |
| `POST` | `/worker/services/propose` | Propose a new service |
| `GET` | `/worker/services/proposals` | View my proposals |

### 6.6 Admin Portal (ADMIN role only)

| Category | Endpoints |
|----------|-----------|
| **Dashboard** | `GET /admin/dashboard` |
| **Workers** | CRUD, verify, set status, top-earning list |
| **Customers** | List, get details, set status |
| **Orders** | List, details, assign, reassign, status update, corrections, earnings hold/release, refunds |
| **Services** | CRUD, toggle status, manage proposals |
| **Financials** | Summary, ledger, commission, platform fees, refunds report |
| **Payments** | `GET /admin/payments` |
| **Withdrawals** | List, approve, reject, complete |
| **Complaints** | List, details, reply, note, resolve |
| **Support** | List tickets, reply, note, update status |
| **Audit** | `GET /admin/audit-logs` |
| **Notifications** | List, mark read, mark all read |
| **Settings & Profile** | `GET/PUT /admin/settings`, `PUT /admin/profile` |
| **Reports** | `GET /admin/reports` (14 report types, exportable) |

### 6.7 Generic Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications` | Get all user notifications |
| `PUT` | `/notifications/:id/read` | Mark notification as read |

### Response Conventions

```json
// Success
{ "success": true, "data": { } }

// Error
{ "success": false, "error": "Error message", "code": "ERROR_CODE" }
```

---

## 7. Background Timers & Automation

The backend runs a **central 30-second interval** that checks three automated rules:

| Timer | Trigger | Action |
|-------|---------|--------|
| **10-min offer timeout** | Order status is `OFFERED` AND `offerExpiresAt` has passed | Auto-expire offer, re-broadcast order |
| **30-min worker inactivity** | Worker is online AND `lastActivityAt` > 30 minutes ago | Auto-switch worker to offline, send notification |
| **2-hour correction overdue** | Order status is `CORRECTION_REQUIRED` AND `correctionDeadline` passed | Notify customer & admin, flag for review |

> **Important:** These timers require a persistent Node.js process. Deploy the backend to Railway, Render, Fly.io, or a VPS — not Vercel Serverless Functions.

Workers must call `POST /worker/activity` (heartbeat) to reset the inactivity timer.

---

## 8. Authentication & Security

### JWT Authentication
- **Algorithm:** HS256
- **Expiry:** Configurable via `JWT_EXPIRES_IN` (default `7d`)
- **Header format:** `Authorization: Bearer <token>`

### Role-Based Access Control (RBAC)

| Route Group | Allowed Roles |
|-------------|---------------|
| `/orders`, `/customer/*` | `CUSTOMER`, `ADMIN` |
| `/worker/*` | `WORKER`, `ADMIN` |
| `/admin/*` | `ADMIN` only |
| `/services`, `/auth/*` | Public (no auth required) |
| `/documents/*` | Optional auth (signed URL access) |

### Password Security
- Bcrypt with default salt rounds
- Passwords never returned in API responses

### CORS
- Allowed origins configurable via `CORS_ORIGIN` env variable
- Defaults: `localhost:5173`, `localhost:5174`, `localhost:5175`
- Non-browser requests (server-to-server, webhooks) always allowed

---

## 9. Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
# Database (PostgreSQL via Supabase Pooler)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase Storage
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="customer-documents"

# JWT
JWT_SECRET="your-strong-random-secret"
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=production

# Admin Seed Account
ADMIN_ID="Your Name"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="YourSecureAdminPassword"

# Razorpay
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="your_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# CORS (comma-separated frontend URLs)
CORS_ORIGIN="https://your-frontend.vercel.app,https://your-admin.vercel.app,https://your-worker.vercel.app"
```

### Frontend Environment

```env
# frontend/.env
VITE_API_URL=https://your-backend.railway.app/api
```

---

## 10. Local Development Setup

### Prerequisites
- Node.js v20+ (recommended v24)
- npm v10+
- A Supabase project (for DB and storage)

### Step 1 — Install all workspace dependencies

```bash
# From repo root
npm install
```

### Step 2 — Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials

npx prisma generate
npx prisma migrate deploy   # or: npx prisma db push (for dev)
npm run dev
```

Backend runs at: **`http://localhost:4000`**

### Step 3 — Customer Portal

```bash
npm run dev:frontend
# http://localhost:5173 (proxies /api to port 4000)
```

### Step 4 — Admin Portal

```bash
npm run dev:admin
# http://localhost:5174
```

### Step 5 — Worker Portal

```bash
npm run dev:worker
# http://localhost:5175
```

---

## 11. Deployment Guide

### Backend — Railway (Recommended)

1. Connect repository to [Railway](https://railway.app)
2. Set **root directory** to `backend/`
3. **Build command:** `npm install && npx prisma generate && npm run build`
4. **Start command:** `npm start`
5. Add all environment variables from Section 9
6. Deploy — Railway auto-assigns a public URL

### Frontend — Vercel

Each portal deploys independently:

| Portal | Root Directory | Framework |
|--------|---------------|-----------|
| Customer | `frontend/` | Vite |
| Admin | `admin/` | Vite |
| Worker | `worker/` | Vite |

**For each portal on Vercel:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Set `VITE_API_URL` to your Railway backend URL
- SPA routing is pre-configured in each `vercel.json`

### Supabase Setup

1. Create a new Supabase project
2. Run Prisma migrations: `npx prisma migrate deploy`
3. Create storage bucket named `customer-documents`
4. Set bucket to private (access via signed URLs only)

---

## 12. Testing

```bash
# Backend tests (Jest)
npm run test:backend

# TypeScript type check
npm run typecheck --prefix backend

# Frontend production build validation
npm run build:frontend
```

### Manual Integration Test Scripts

| Script | Purpose |
|--------|---------|
| `backend/test_concurrency.mjs` | Concurrency safety tests |
| `backend/test_document_lifecycle.mjs` | Document upload/access lifecycle |
| `backend/test_worker_lifecycle.mjs` | Full worker job lifecycle |
| `backend/test_worker_portal.mjs` | Worker portal E2E flows |

Run with: `node backend/test_worker_lifecycle.mjs`

---

## 13. Scripts Reference

### Root Workspace (`package.json`)

| Script | Description |
|--------|-------------|
| `npm run dev:frontend` | Start customer portal dev server |
| `npm run dev:admin` | Start admin portal dev server |
| `npm run dev:worker` | Start worker portal dev server |
| `npm run dev:backend` | Start backend dev server |
| `npm run build:frontend` | Build customer portal |
| `npm run build:admin` | Build admin portal |
| `npm run build:worker` | Build worker portal |
| `npm run build:backend` | Build backend |
| `npm run build:all` | Build all packages |
| `npm run test:backend` | Run backend tests |
| `npm start` | Start backend (production) |

### Backend (`backend/package.json`)

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | TypeScript compile + run |
| `npm run build` | Prisma generate + TypeScript compile |
| `npm test` | Run Jest test suite |
| `npm run typecheck` | TypeScript strict check (no emit) |
| `npm run lint` | ESLint on `src/` |
| `npm run db:generate` | Regenerate Prisma client |

---

## 14. License

MIT License — Copyright © 2026 Karan77-oss

---

## Additional Documentation

| Document | Description |
|----------|-------------|
| `docs/API_SPECIFICATION.md` | Full API endpoint specification with request/response schemas |
| `docs/DATABASE_CONTEXT.md` | Detailed database design rationale and context |
| `docs/FINAL_TEST_REPORT.md` | Complete test coverage and results report |
| `docs/PRODUCTION_DATABASE_CLEANUP_REPORT.md` | Production DB maintenance history |

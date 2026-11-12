# ANTIGRAVITY MASTER EXECUTION SPECIFICATION
**Project:** Cyber Cafe Marketplace (`d:/cy`)  
**Architecture:** npm workspaces Monorepo (`backend`, `frontend`, `admin`, `worker`, `mobile-app`, `shared`)  
**Mode:** Deterministic Execution — Do NOT guess, do NOT alter existing API route contracts or Prisma model names, and do NOT break the 20% platform / 80% worker commission split.

---

## 0. GLOBAL GUARDRAILS FOR ANTIGRAVITY (READ FIRST)
1. **Zero Contract Breakage:** Keep all endpoint paths in `backend/src/routes.ts` and `shared/contracts.js` 100% backwards-compatible with `frontend`, `admin`, `worker`, and `mobile-app`.
2. **Prisma Schema Stability:** Do NOT drop or rename any of the 16 existing models in `backend/prisma/schema.prisma`. Only add optional fields or indexes if explicitly instructed below.
3. **Strict PII & Government ID Redaction:** Never log, echo, or expose raw government identification numbers (such as PAN, Voter ID, Passport, or national ID strings) in plaintext server logs, error payloads, or public URLs. Always use masked placeholders (e.g., `[ID_REDACTED]`) in logs and audit trails.
4. **Verification After Every Phase:** Run `npm run build` and `npm run test:backend` after completing each phase before moving to the next.

---

## PHASE 1: REPOSITORY HYGIENE & BUILD SANITIZATION

### Task 1.1: Purge Stale Compiled `.js` Artifacts from `backend/src/`
* **Problem:** `backend/src/` contains stale compiled `.js` and `.js.map` files alongside `.ts` source files, causing Node/bundlers to resolve outdated logic over updated TypeScript code.
* **Action:**
  1. Delete all `.js`, `.js.map`, and `.d.ts` files located inside `backend/src/**`. (Do NOT delete `.js` files inside `shared/`, `frontend/`, `admin/`, `worker/`, or `tests/`).
  2. Update `backend/tsconfig.json` and `backend/tsconfig.build.json` to strictly enforce:
     ```json
     {
       "compilerOptions": {
         "rootDir": "./src",
         "outDir": "./dist",
         "noEmitOnError": true
       },
       "include": ["src/**/*"],
       "exclude": ["node_modules", "dist", "data", "**/*.test.ts"]
     }
     ```
  3. Add `backend/src/**/*.js` and `backend/src/**/*.js.map` to the root `.gitignore`.

### Task 1.2: Deduplicate Capacitor Dependencies Across Workspaces
* **Problem:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, and `@capacitor/camera` are duplicated in both root `package.json` and `mobile-app/package.json`, risking version drift during APK compilation.
* **Action:**
  1. Remove `@capacitor/*` packages from the root `package.json` dependencies.
  2. Retain and lock `@capacitor/*` dependencies exclusively inside `mobile-app/package.json`.
  3. Add a root convenience script in `package.json`:
     `"build:mobile": "npm run build --workspace=cyber-cafe-mobile-app && npm --workspace=cyber-cafe-mobile-app exec cap sync android"`

---

## PHASE 2: CRITICAL CONCURRENCY, PERSISTENCE & SERVERLESS FIXES

### Task 2.1: Eliminate Split-Brain Persistence (`backend/src/db.ts` & `backend/src/catalogData.ts`)
* **Problem:** Falling back to `localStore` (`backend/data/*.json`) when `checkDb()` fails causes data divergence (Split-Brain) in production and fails silently on ephemeral serverless file systems (Vercel `api/index.ts`).
* **Action:**
  1. Introduce an environment flag `ALLOW_JSON_FALLBACK` (default `false` when `NODE_ENV === 'production'`, `true` in `development`).
  2. In `backend/src/db.ts`:
     * Implement a retry wrapper `withDbRetry(fn, retries = 3, delayMs = 250)` for transient Supabase PgBouncer connection drops.
     * When `NODE_ENV === 'production'` and `ALLOW_JSON_FALLBACK !== 'true'`, if PostgreSQL is unreachable after retries, return a deterministic HTTP `503 Service Temporarily Unavailable` for write/transactional endpoints (`POST /orders`, payments, withdrawals, job state changes) instead of writing financial or order mutations to local `.json` files.
  3. Keep `catalogData.ts` read-only fallback strictly for public `GET /services` catalog reads so browsing never breaks during DB maintenance.

### Task 2.2: Fix Race Condition in Worker Order Acceptance (`backend/src/portalControllers.ts` & `controllers.ts`)
* **Problem:** Two operators clicking "Accept" on an `AVAILABLE` order simultaneously can bypass application-level read checks and double-claim the order.
* **Action:**
  Replace the check-then-update pattern in `POST /worker/orders/:id/accept` with an atomic database transaction and conditional write:
  ```typescript
  const result = await prisma.$transaction(async (tx) => {
    // 1. Atomic conditional claim: only succeeds if status is currently AVAILABLE (or OFFERED to this worker)
    const claimed = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { in: ['AVAILABLE', 'OFFERED'] },
        OR: [
          { assignedWorkerId: null },
          { assignedWorkerId: workerId }
        ]
      },
      data: {
        status: 'ASSIGNED',
        assignedWorkerId: workerId,
        updatedAt: new Date()
      }
    });

    if (claimed.count === 0) {
      throw new AppError('ORDER_ALREADY_CLAIMED', 'This order has already been accepted by another operator.', 409);
    }

    // 2. Upsert 1-to-1 Job execution record
    const job = await tx.job.upsert({
      where: { orderId },
      update: { workerId, status: 'ACCEPTED', acceptedAt: new Date() },
      create: { orderId, workerId, status: 'ACCEPTED', acceptedAt: new Date() }
    });

    return job;
  });
  ```

### Task 2.3: Hybrid Background Timers for Serverless + Stateful Runtimes (`backend/src/timers.ts` & `routes.ts`)
* **Problem:** `setInterval` in `timers.ts` freezes on Vercel Serverless (`api/index.ts`) and runs duplicate intervals if multiple containers scale horizontally.
* **Action:**
  1. Refactor `backend/src/timers.ts` to export an idempotent, single-pass async function: `export async function runAllMaintenanceTimers(): Promise<{ expiredOffers: number; autoOfflinedWorkers: number; correctionAlerts: number }>`.
  2. Inside `runAllMaintenanceTimers()`, use atomic `updateMany` queries so concurrent runs cannot duplicate notifications.
  3. In `backend/src/server.ts`, only start `setInterval(runAllMaintenanceTimers, 30_000)` when running as a stateful process (`process.env.VERCEL !== '1'` and `process.env.DISABLE_INTERNAL_TIMERS !== 'true'`).
  4. In `backend/src/routes.ts`, register a cron endpoint `POST /api/internal/cron/timers` protected by `Authorization: Bearer ${process.env.CRON_SECRET}` that invokes `runAllMaintenanceTimers()` and returns the execution summary. Configure `vercel.json` crons to hit this route if deployed on Vercel.

---

## PHASE 3: HIGH-SECURITY HARDENING (AUTH, VAULT & FINANCIAL LEDGER)

### Task 3.1: Dual-Mode Secure Authentication (`HttpOnly` Cookies + Bearer Token Compatibility)
* **Problem:** Storing long-lived 7-day JWTs solely in `localStorage` exposes web portals (`frontend`, `admin`, `worker`) to XSS token theft and lacks immediate session revocation.
* **Action:**
  1. In `backend/src/controllers.ts` (`POST /auth/login` and `POST /auth/register`):
     * Set an `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookie named `cc_access_token` containing the JWT.
     * Continue returning the token in the JSON body so `mobile-app` (Capacitor) continues functioning without breaking.
  2. In `backend/src/middleware/auth.ts` (`requireAuth`):
     * Resolve token from `req.cookies?.cc_access_token` first, falling back to `req.headers.authorization?.split(' ')[1]`.
     * Verify user account status (`isActive` / not banned) and role against database/cache so revoked or suspended workers/admins are blocked immediately even before JWT expiry.
  3. On `POST /auth/logout`, explicitly clear the `cc_access_token` cookie via `res.clearCookie('cc_access_token')`.
  4. Update `credentials: 'include'` in the `fetch` wrappers inside `frontend/src/api/client.js`, `admin/src/api/client.js`, and `worker/src/api/client.js`.

### Task 3.2: Zero-Trust Document Vault & Signed Streaming (`backend/src/utils/` & `extendedControllers.ts`)
* **Problem:** Customer identity documents and certificates in `customer-documents` require strict access control, file validation, and time-limited access.
* **Action:**
  1. **Strict Upload Validation (`POST /documents/upload`):**
     * Enforce a 5 MB file size limit via Multer.
     * Validate both MIME type and magic bytes (file signature buffer header) to permit ONLY `application/pdf`, `image/jpeg`, `image/png`, and `image/webp`. Reject executables, HTML, or SVG scripts immediately.
     * Randomize storage object keys using UUIDv4 (`vault/${userId}/${uuidv4()}.${ext}`) so storage paths are never guessable.
  2. **Strict Ownership RBAC (`GET /documents/:id/download` & `GET /documents/stream/*key`):**
     * Verify the requester is either:
       a) The document owner (`document.userId === req.user.id`),
       b) The currently assigned operator (`order.assignedWorkerId === req.user.id`) for an active, non-completed order (`ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `CORRECTION_REQUIRED`) that explicitly references this document, OR
       c) An `ADMIN`.
     * Once an order reaches `COMPLETED` or `CANCELLED`, revoke worker download access to the customer's raw identity documents (only the final `Receipt` remains accessible).
  3. **Short-Lived Signed URLs:**
     * When serving from Supabase Storage, generate signed URLs with a strict TTL of **300 seconds (5 minutes)** and set `Content-Disposition: attachment` or inline preview headers with `Cache-Control: private, no-store`.

### Task 3.3: Immutable Ledger-Verified Escrow & Payouts (`portalControllers.ts`)
* **Problem:** Relying solely on mutable balance fields in `WorkerEarning` can drift if an order is refunded or disputed after completion.
* **Action:**
  1. Create a helper `calculateVerifiedWorkerBalance(tx, workerId)` that computes:
     * `totalCreditedPaise`: Sum of `RELEASED` earnings in `WorkerEarning` corroborated by `CREDIT_WORKER` entries in `FinancialLedger`.
     * `totalWithdrawnOrLockedPaise`: Sum of `Withdrawal` records with status in `['REQUESTED', 'APPROVED', 'COMPLETED']` plus any `DEBIT_ADJUSTMENT` ledger entries.
     * `availablePaise = totalCreditedPaise - totalWithdrawnOrLockedPaise`.
  2. Inside `POST /worker/withdrawals` and `POST /admin/withdrawals/:id/complete`:
     * Execute inside `prisma.$transaction` with Serializable/row-level locking.
     * Reject the withdrawal if `requestedAmountPaise` exceeds `availablePaise`.
     * Always write a corresponding `FinancialLedger` record with a deterministic `idempotencyKey` (`withdrawal_req_${withdrawalId}` / `withdrawal_paid_${withdrawalId}`).

---

## PHASE 4: MODULAR BACKEND REFACTORING (`backend/src/modules/`)

* **Problem:** `backend/src/modules/` contains empty directories while `controllers.ts`, `extendedControllers.ts`, and `portalControllers.ts` are monolithic files containing 100+ endpoints.
* **Action:**
  Migrate business logic cleanly into domain modules under `backend/src/modules/` and re-export handlers in the root controller files so `routes.ts` does not break:
  ```text
  backend/src/modules/
  ├── auth/           # Login, Register, Logout, Session, Password Reset
  ├── catalog/        # Services CRUD, Dynamic Form Schemas, ServiceProposal workflow
  ├── orders/         # Order creation, Price Authority Guard, 5s Deduplication, Time-slots
  ├── jobs/           # Worker Queue, Atomic Claim, Start, Deliverable/Receipt upload, Complete
  ├── vault/          # Document upload, Magic-byte validator, RBAC guard, Signed URL streaming
  ├── finance/        # Razorpay create/verify, Webhook HMAC, Ledger service, Worker Withdrawals
  ├── disputes/       # Welfare tickets, Correction window triggers, Admin Refund execution
  └── admin/          # Dashboard metrics, Worker verification, Manual assignment, AuditLog service
  ```

---

## PHASE 5: SCALABILITY & PRODUCT FEATURE UPGRADES

### Task 5.1: Unified Dynamic `formSchema` Across Web & Mobile (`shared/` + `mobile-app/`)
* **Problem:** `mobile-app/src/config/servicesConfig.ts` uses hardcoded form schemas (PAN Form 49A, Voter ID, Passport, Certificates), whereas the database `Service` model already supports `formSchema` JSON.
* **Action:**
  1. Move default fallback schemas into `shared/schemas/defaultFormSchemas.js`.
  2. Update both `frontend/src/pages/customer/ServiceForm.jsx` and `mobile-app/src/pages/ServiceForm.tsx` to dynamically render fields from the `service.formSchema` payload returned by `GET /services/:id`, falling back to `shared/schemas/defaultFormSchemas.js` only if `service.formSchema` is null.
  3. In the Admin Portal (`admin/src/pages/Services.jsx`), ensure Admins can edit `requiredDocuments` and `formSchema` JSON/fields directly so new government/utility forms go live across Web and Mobile immediately without rebuilding the APK.

### Task 5.2: Customer Vault One-Click Auto-Reuse (`extendedControllers.ts` & Customer Portals)
* **Problem:** Customers currently re-upload common documents (Passport Photo, Signature, 10th Marksheet, Address Proof) on every new order despite having a `Vault` page.
* **Action:**
  1. Update `POST /orders` in `extendedControllers.ts` to accept an optional array `existingDocumentIds: string[]` alongside new uploads.
  2. Verify that every ID in `existingDocumentIds` belongs to `req.user.id` in the `Document` table, and link those documents to the newly created `Order` snapshot.
  3. In `frontend/src/components/DocumentUploaders` and `mobile-app/src/pages/ServiceForm.tsx`, add a **"Select from My Vault"** picker modal next to every required document slot.

### Task 5.3: Real-Time Order & Queue Notifications via Server-Sent Events (SSE)
* **Problem:** Workers and Customers rely on manual refreshes or polling to see new available jobs and order status updates.
* **Action:**
  1. Create a lightweight SSE manager in `backend/src/utils/realtimeEvents.ts` and expose `GET /api/events/stream` (authenticated).
  2. Emit targeted real-time events on:
     * `ORDER_AVAILABLE` -> Broadcast to online verified workers when payment is verified.
     * `ORDER_STATUS_UPDATED` -> Send to the specific `customerId` and `assignedWorkerId` when order transitions (`ASSIGNED`, `IN_PROGRESS`, `CORRECTION_REQUIRED`, `COMPLETED`).
  3. Connect `worker/src/pages/worker/AvailableRequests.jsx` and `frontend/src/pages/customer/OrderTracking.jsx` to `EventSource('/api/events/stream')` with automatic reconnect and an audible alert badge for workers.

### Task 5.4: Clear Separation of Platform Invoice vs. Official Government Receipt
* **Problem:** Customers need a clear distinction between the Cyber Cafe Marketplace payment receipt and the official government/portal acknowledgment slip uploaded by the operator.
* **Action:**
  1. On `OrderTracking` (`frontend` and `mobile-app`), render two distinct action buttons once an order is paid/completed:
     * **"Download Platform Payment Invoice"** -> Calls the dynamic receipt generator (`utils/fileStore.ts`) showing base service price, GST/platform fee breakdown, and Razorpay transaction ID.
     * **"Download Official Application Acknowledgment"** -> Enabled when `Order.status === 'COMPLETED'`, streaming the operator-uploaded `Receipt` file from the `Receipt` model.

### Task 5.5: Complete Worker `ServiceProposal` Workflow in Portals
* **Action:**
  Ensure the `ServiceProposal` Prisma model is fully wired in UI:
  1. Worker Portal: Allow verified operators to submit a new local/custom service proposal (`title`, `category`, `suggestedPricePaise`, `requiredDocuments`, `description`).
  2. Admin Portal (`Services` page): Add a **"Worker Proposals"** tab where Admin can Approve (which automatically creates an active `Service` record with the 20/80 commission split) or Reject with remarks.

---

## 6. EXECUTION ORDER & VERIFICATION CHECKLIST FOR ANTIGRAVITY
Execute the tasks strictly in this sequence:
1. [x] **Step 1:** Run Phase 1 (Clean `.js` files in `backend/src`, update `tsconfig`, clean Capacitor root deps) -> Verify `npm run build` passes.
2. [x] **Step 2:** Run Phase 2 (DB retry + disable prod JSON split-brain, atomic `updateMany` job accept lock, hybrid cron timer endpoint) -> Verify `npm run test:backend` passes.
3. [x] **Step 3:** Run Phase 3 (HttpOnly cookie + Bearer auth, Vault magic-byte & 5-min signed URLs + post-completion worker access revocation, Ledger-verified withdrawals).
4. [x] **Step 4:** Run Phase 4 (Extract monolithic controllers into `backend/src/modules/*` while preserving exports).
5. [x] **Step 5:** Run Phase 5 (Dynamic `formSchema` sync, Vault auto-reuse picker, SSE real-time notifications, Dual Receipt UI, `ServiceProposal` tab).
# ANTIGRAVITY INCREMENTAL SPEC: AUTH PERSISTENCE, CUSTOM PRICING, SECURITY & SCALE
**File Name:** `ANTIGRAVITY_COST_AND_SCALE_UPGRADE.md`  
**Target Repository:** `d:/cy` (Cyber Cafe Marketplace Monorepo)  
**Execution Mode:** Deterministic — Execute Module 0 through Module 5 sequentially. Do NOT guess and do NOT break existing route URLs.

---

## 0. CORE ARCHITECTURAL MANDATES (STRICT ENFORCEMENT)
1. **100% Supabase Database & Auth Persistence:** Every user registration (`CUSTOMER`, `WORKER`, `ADMIN`) MUST be permanently written to the Supabase PostgreSQL `"User"` table via Prisma (and synced with Supabase Auth when configured). Never store new user registrations solely in ephemeral `localStore`.
2. **No Hardcoded 80/20 Commission Split:** Completely remove all `0.80` / `0.20` (80%/20%) commission formulas across the entire codebase. Pricing is strictly additive:
   $$\text{Customer Price (pricePaise)} = \text{Worker Payout (workerAmountPaise)} + \text{Admin Markup (adminCommissionPaise)}$$
3. **Strict Financial Privacy:** The Worker must **NEVER** see `pricePaise` (what the customer paid) or `adminCommissionPaise` (Admin's added amount) in any UI or API response—the Worker only ever sees `workerAmountPaise`.
4. **Zero Payment Bypass & Zero Document Stealing:** Enforce 5-layer Razorpay verification and private watermarked document access.
5. **No PII in Logs:** Never log raw government ID numbers in server logs or error messages (always mask as `[ID_REDACTED]`).

---

## MODULE 0 (HIGHEST PRIORITY): FIX SUPABASE USER REGISTRATION, LOGIN, ADMIN CUSTOMER VIEW & CUSTOM PRICING

### Task 0.1: Fix Customer Registration & Re-Login "Invalid Credentials" Bug + Supabase Auth Sync
* **Target Files:**
  * `backend/src/modules/auth/auth.controller.ts` (and `backend/src/controllers.ts`)
  * `backend/src/db.ts`
  * `backend/src/catalogData.ts`
* **Root Cause to Fix:** Users registering on the portal fail to log back in after logging out because registration either falls back to in-memory `localStore` without persisting to Supabase PostgreSQL, or email/mobile normalization and Bcrypt hashing differ between `register` and `login`.
* **Implementation Instructions:**
  1. **Mandatory Supabase PostgreSQL Write on Register (`POST /auth/register`):**
     * Normalize identifiers before saving: `const email = rawEmail?.trim().toLowerCase()` and `const phone = rawPhone?.trim().replace(/\s+/g, '')`.
     * Hash the password strictly once using `const passwordHash = await bcrypt.hash(plainPassword, 10)` (Verify that `localStore` or helper functions do NOT double-hash an already hashed password!).
     * Force a direct Prisma write using `withDbRetry(() => prisma.user.create({ ... }))` so the user record is guaranteed to be stored in Supabase PostgreSQL `"User"` table.
     * **Supabase Auth Link:** If `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY` are configured, also sync the user with Supabase Auth (`supabaseAdmin.auth.admin.createUser({ email, phone, password: plainPassword, email_confirm: true, user_metadata: { role, name, prismaUserId: user.id } })`), storing the returned Supabase Auth UID or linking via email/phone.
     * Also mirror the created user into `localStore` in-memory cache so any legacy lookup stays in sync.
  2. **Fix Login Lookup (`POST /auth/login`):**
     * Normalize the incoming identifier (`email` or `phone` or `identifier`) using `.trim().toLowerCase()`.
     * Always query **Supabase PostgreSQL first** via Prisma:
       ```typescript
       const user = await withDbRetry(() =>
         prisma.user.findFirst({
           where: {
             OR: [
               { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
               { phone: normalizedPhone }
             ]
           }
         })
       );
       ```
     * Verify password using `await bcrypt.compare(plainPassword, user.passwordHash)`. (If the user was authenticated via Supabase Auth `signInWithPassword`, sync the session and issue the platform JWT + `cc_access_token` cookie).
     * Write an integration test in `backend/tests/` that registers a new Customer, logs out, and immediately logs back in with the same email/phone and password to verify `200 OK`.

### Task 0.2: Fix Admin Portal Customer Visibility (`GET /admin/customers` & `admin/src/pages/Customers.jsx`)
* **Target Files:**
  * `backend/src/portalControllers.ts`
  * `backend/src/routes.ts`
  * `admin/src/pages/Customers.jsx`
  * `admin/src/api/admin.js` (or `client.js`)
* **Root Cause to Fix:** Admin cannot see registered customers because the backend endpoint either queries stale `localStore` data instead of Supabase PostgreSQL or returns a payload structure that differs from what `admin/src/pages/Customers.jsx` renders.
* **Implementation Instructions:**
  1. In `backend/src/portalControllers.ts` (for `GET /admin/customers` and `GET /admin/users?role=CUSTOMER`):
     * Query Supabase PostgreSQL directly via Prisma:
       ```typescript
       const customers = await withDbRetry(() =>
         prisma.user.findMany({
           where: { role: 'CUSTOMER' },
           orderBy: { createdAt: 'desc' },
           select: {
             id: true,
             name: true,
             email: true,
             phone: true,
             isVerified: true,
             isActive: true,
             createdAt: true,
             _count: { select: { customerOrders: true } },
             customerOrders: {
               select: { id: true, pricePaise: true, status: true, paymentStatus: true, createdAt: true },
               orderBy: { createdAt: 'desc' }
             }
           }
         })
       );
       ```
     * Compute aggregate fields expected by the Admin UI for each customer: `totalOrders`, `totalSpentPaise` (sum of paid orders), `lastOrderAt`, and `status` (`ACTIVE` / `SUSPENDED`).
     * Return a consistent response supporting both `{ customers, total: customers.length, data: customers }` so the frontend table renders all registered customers immediately.
  2. Inspect `admin/src/pages/Customers.jsx` and ensure it calls the exact matching route (`/admin/customers`), handles the response array properly, and displays Name, Email, Phone, Total Orders, Total Spent (₹), Registration Date, and Account Status.

### Task 0.3: Remove 80/20 Commission Ratio & Implement Custom Admin Markup on Proposals & Services
* **Target Files:**
  * `backend/src/portalControllers.ts`
  * `backend/src/extendedControllers.ts`
  * `backend/src/modules/finance/finance.controller.ts`
  * `backend/src/catalogData.ts`
  * `admin/src/pages/Services.jsx`
  * `worker/src/pages/worker/` (Service proposal form)
* **Implementation Instructions:**
  1. **Purge Hardcoded 80/20 Split:**
     * Search the entire repository for `0.8`, `0.80`, `0.2`, `0.20`, `80%`, `20%` commission calculations and remove them.
  2. **Worker Service Proposal Submission (`POST /worker/proposals`):**
     * When a Worker proposes a service, the Worker enters their requested payout (`workerAmountPaise` / `proposedWorkerPrice`).
     * Save this in `ServiceProposal` as the worker's requested base amount.
  3. **Admin Proposal Edit & Approval With Custom Admin Amount (`admin/src/pages/Services.jsx` & `POST /admin/proposals/:id/approve` / `PUT /admin/proposals/:id`):**
     * In the Admin Portal **"Worker Proposals"** tab (`admin/src/pages/Services.jsx`), when Admin opens a proposal to review/approve, provide an editable modal/form where Admin can edit:
       * `title`, `category`, `description`, and `requiredDocuments` checklist.
       * **Worker Payout Amount (₹)** (`workerAmountPaise`, pre-filled with what the worker asked for, e.g., ₹55, editable by Admin).
       * **Admin Commission / Markup Amount (₹)** (`adminCommissionPaise`, e.g., ₹45, entered separately by Admin).
       * **Final Customer Price (₹)** (`pricePaise`) — automatically calculated live in UI and enforced on backend as:
         ```typescript
         const workerAmountPaise = Math.round(Number(inputWorkerAmountRupees) * 100);
         const adminCommissionPaise = Math.round(Number(inputAdminMarkupRupees) * 100);
         const pricePaise = workerAmountPaise + adminCommissionPaise;
         ```
     * Also update the standard Admin **"Create / Edit Service"** modal in `admin/src/pages/Services.jsx` so Admin enters **Worker Amount (₹)** and **Admin Amount (₹)** separately, automatically setting `Customer Price = Worker Amount + Admin Amount`.
  4. **Order Payment & Split Execution (`POST /orders`, Razorpay Verify & Ledger):**
     * When a Customer creates and pays for an order, the Customer pays `service.pricePaise` (e.g., ₹100).
     * Lock the exact `pricePaise` (₹100), `workerAmountPaise` (₹55), and `adminCommissionPaise` (₹45) from the `Service` record into the `Order` and `serviceSnapshot`.
     * When payment is captured and the order is completed:
       * Admin's revenue ledger records the exact `adminCommissionPaise` (₹45).
       * Worker's `WorkerEarning` and `worker_orders_view` record **only** `workerAmountPaise` (₹55).
       * The Worker Portal (`AvailableRequests`, `MyJobs`, `JobWorkspace`, `Earnings`) displays **only ₹55** and never exposes `pricePaise` (₹100) or `adminCommissionPaise` (₹45).

---

## MODULE 1: BULLETPROOF PAYMENT VERIFICATION (ZERO-BYPASS 5-LAYER ENGINE)

### Task 1.1: Server-Authoritative Order Creation & Immutable Snapshot
* **Target Files:** `backend/src/extendedControllers.ts`
* **Implementation Instructions:**
  1. Discard any price sent from the frontend request body.
  2. Fetch the `Service` record from PostgreSQL and lock `pricePaise`, `workerAmountPaise`, and `adminCommissionPaise` into `Order` (`status: 'PAYMENT_PENDING'`).
  3. Create the Razorpay order on the backend using `amount: order.pricePaise`.

### Task 1.2: Timing-Safe HMAC-SHA256 + Server-to-Server API Double Check + Row Lock
* **Target Files:** `backend/src/extendedControllers.ts`, `backend/src/webhook.ts`, `backend/prisma/schema.prisma`
* **Implementation Instructions:**
  1. Verify Razorpay signature using `crypto.timingSafeEqual`.
  2. Fetch payment status directly from Razorpay API (`razorpay.payments.fetch(paymentId)`) and confirm `status === 'captured'` and `Number(amount) === Number(order.pricePaise)`.
  3. Ensure `providerPaymentId` has a `@unique` constraint in `Payment` model and lock the `Order` row with `SELECT id, "paymentStatus" FROM "Order" WHERE id = ${orderId} FOR UPDATE` inside `prisma.$transaction` before marking `paymentStatus = 'PAID'`.

---

## MODULE 2: MILITARY-GRADE DOCUMENT SECURITY (ZERO DOCUMENT STEALING)

### Task 2.1: 100% Private Bucket & Strict State-Based Gatekeeper (`GET /api/documents/:id/download`)
* **Target Files:** `backend/src/modules/vault/vault.controller.ts`
* **Implementation Instructions:**
  1. Ensure Supabase bucket `customer-documents` is strictly private.
  2. In `GET /api/documents/:id/download` and `/documents/stream/*key`:
     * `ADMIN`: Allow.
     * `CUSTOMER`: Allow only if `doc.userId === req.user.id`.
     * `WORKER`: Allow **ONLY** if `order.assignedWorkerId === req.user.id` AND `order.status IN ('ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED')`. Return `403 Forbidden` if the order is `AVAILABLE`, `OFFERED` (not yet accepted), `SUBMITTED`, `COMPLETED`, or `CANCELLED`.
  3. Return a 300-second (5-minute) signed URL + watermark metadata.

### Task 2.2: Client-Side Dynamic Watermarking in Worker Workspace
* **Target Files:** `worker/src/components/WatermarkedDocumentViewer.jsx` (Create), `worker/src/pages/worker/JobWorkspace.jsx`
* **Implementation Instructions:**
  Render customer documents inside `WatermarkedDocumentViewer.jsx` with right-click disabled and a semi-transparent diagonal overlay:
  `"For Sarkari Portal Processing Only - Worker ID: ${worker.id} - Order #${order.id}"`

### Task 2.3: Post-Completion Automated File Shredding (20 Days)
* **Target Files:** `backend/prisma/schema.prisma`, `backend/src/portalControllers.ts`
* **Implementation Instructions:**
  Add `isWorkingCopy Boolean @default(true)`, `purgeEligibleAt DateTime?`, and `isPurged Boolean @default(false)` to `Document`. Set `purgeEligibleAt = NOW() + INTERVAL '20 days'` when worker payout is released, and purge expired raw working files from Supabase Storage while keeping final `Receipt` and `AuditLog` records forever.

---

## MODULE 3: 80% STORAGE & BANDWIDTH COST REDUCTION PIPELINE

### Task 3.1: Client-Side Compression & Pre-Upload Document Clarity Check
* **Target Files:** `frontend/src/utils/documentProcessor.js`, `mobile-app/src/utils/documentProcessor.ts`
* **Implementation Instructions:**
  1. Reject corrupt files under `15 KB` or images under `600x400 px`, and warn on blurry images using an HTML5 `<canvas>` Laplacian variance check.
  2. Compress images in the browser (`maxWidth: 1600`, `quality: 0.78`, `image/webp` or `image/jpeg`) so 5 MB photos shrink to **200 KB–300 KB** before upload.

### Task 3.2: Direct Presigned Upload to Private Bucket (Bypass Multer RAM)
* **Target Files:** `backend/src/modules/vault/vault.controller.ts`, `frontend/src/pages/customer/ServiceForm.jsx`
* **Implementation Instructions:**
  Add `POST /api/documents/presign-upload` and `POST /api/documents/confirm-upload` using `createSignedUploadUrl` so compressed files upload directly from the browser to Supabase Storage without consuming Node.js `Multer memoryStorage` RAM.

---

## MODULE 4: DATABASE-LEVEL FINANCIAL PRIVACY & `pg_cron` ENGINE

### Task 4.1: PostgreSQL Restricted View (`worker_orders_view`)
* **Target Files:** `backend/prisma/migrations/`, `backend/src/portalControllers.ts`
* **Implementation Instructions:**
  Create SQL view `worker_orders_view` exposing `workerAmountPaise` while completely excluding `pricePaise`, `adminCommissionPaise`, and `platformFeePaise`. Enforce `WORKER_SAFE_ORDER_SELECT` on all `/worker/*` endpoints so the worker never sees customer total price or admin commission.

### Task 4.2: Smart Worker Ranking Index, `pg_cron` Timers, 10-Min Heartbeat & Scoped Chat
* **Target Files:** `backend/prisma/schema.prisma`, `worker/src/components/WorkerLayout.jsx`, `worker/src/pages/worker/JobWorkspace.jsx`
* **Implementation Instructions:**
  1. Add `activeOrdersCount`, `completedOrdersCount`, `avgCompletionMinutes`, and `lastHeartbeatAt` to `User` with composite index `idx_smart_worker_ranking`.
  2. Create PostgreSQL function `process_cybercafe_timers()` scheduled via `pg_cron` using `FOR UPDATE SKIP LOCKED` for 10-minute offer reassignment and 30-minute inactivity auto-offline.
  3. Send worker heartbeat (`POST /api/worker/heartbeat`) only once every 10 minutes of active browser interaction.
  4. Scope order chat strictly to active `JobWorkspace.jsx` orders and auto-close chat as soon as the worker clicks **Finish Work**.

---

## MODULE 5: 90% SMS COST CUT & DYNAMIC DOCUMENT CHECKLIST

### Task 5.1: OTP Only on Signup/Reset + Free PWA Push & Telegram Bot Alerts
* **Target Files:** `backend/src/modules/auth/auth.controller.ts`, `worker/public/sw.js`, `backend/src/utils/workerAlertDispatcher.ts`
* **Implementation Instructions:**
  Restrict SMS OTP strictly to first-time mobile verification and password reset. Add PWA Web Push (`sw.js`) and Telegram Bot alerts (`TELEGRAM_BOT_TOKEN`) for free instant worker order notifications.

### Task 5.2: Dynamic JSON Document Checklist (`requiredDocuments`)
* **Target Files:** `admin/src/pages/Services.jsx`, `frontend/src/pages/customer/ServiceForm.jsx`, `mobile-app/src/pages/ServiceForm.jsx`
* **Implementation Instructions:**
  Render dedicated document upload boxes (`[{"id": "doc_1", "doc": "Passport Photo", "format": "JPG/WEBP", "mandatory": true}]`) with **"Upload"** and **"Select from Vault"** actions.

---

## FINAL VERIFICATION CHECKLIST FOR ANTIGRAVITY
1. [ ] **Auth & Re-Login Test:** Register a new Customer -> Log out -> Log back in -> Verify `200 OK` and verify the row exists in Supabase PostgreSQL `"User"` table.
2. [ ] **Admin Customer List Test:** Verify `GET /admin/customers` and `admin/src/pages/Customers.jsx` display all registered customers from PostgreSQL with order counts and total spent.
3. [ ] **Custom Admin Markup Test:** Verify all hardcoded 80/20 splits are gone; Admin can edit Worker Proposal amount (`workerAmountPaise`) and add a separate Admin Markup (`adminCommissionPaise`), Customer pays the sum (`pricePaise`), and Worker only ever sees `workerAmountPaise`.
4. [ ] **Security & Cost Pipeline:** Verify 5-layer payment verification, watermarked worker document viewer, post-completion access revocation, client-side compression, and `npm run build` + `npm run test:backend` pass with 0 errors.
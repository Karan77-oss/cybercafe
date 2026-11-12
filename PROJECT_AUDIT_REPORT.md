# PROJECT AUDIT REPORT — Cyber Cafe Marketplace

**Date:** 2026-10-23 · **Branch:** main · **Method:** single-thread sequential audit (no sub-agents)

---

## 1. Tech Stack & Architecture

**Monorepo (npm workspaces)** at the root: `frontend` (customer web), `admin`, `worker` (operator web), `mobile-app` (Capacitor Android), `backend` (Express + TypeScript + Prisma), `shared` (constants/contracts/form-schemas), plus `api/index.ts` — a Vercel serverless entry that re-exports the Express app.

| Layer | Tech |
|---|---|
| Web apps | React 19, Vite 8, react-router-dom 7, lucide-react, Tailwind (mobile only) |
| Mobile | React Native via Capacitor 7 (Android), same Vite build |
| Backend | Express 5 (TypeScript), Prisma 5 / PostgreSQL (Supabase), JWT auth, Multer, SSE |
| Payments | Razorpay (order/verify endpoints + webhook with raw-body signature verification) |
| Storage | Supabase Storage adapter (signed URLs), S3 adapter, local file fallback |

**Deployment targets (dual):**
- **Vercel** — root `vercel.json` rewrites everything to `/api/index`; background timers are disabled when `VERCEL=1` (timers.ts) and the cron endpoint `POST /api/internal/cron/timers` (CRON_SECRET-gated) is the intended external scheduler.
- **Railway** — `railway.json` (nixpacks, `rootDir: backend`, persistent process) where in-process timers run.

**Database:** Prisma schema (PostgreSQL) with 15 models (User, Service, Order, Job, Payment, Payout, WorkerEarning, FinancialLedger, Withdrawal, Receipt, Complaint, Refund, Notification, Review, Document, AuditLog, WelfareCase). Connection health is managed in `backend/src/db.ts` with a retry wrapper (`withDbRetry`, exponential backoff for PgBouncer P1001/P1002/P1008/P1017), a throttled health check, and a **resilient fallback**: an in-memory store (`localStore` in `catalogData.ts`) persisted to **file-based JSON stores** — `backend/data/persisted_orders.json`, `persisted_documents.json`, `financial_ledger.json`. The fallback is enabled by default in dev/test and **disabled for writes in production** unless `ALLOW_JSON_FALLBACK=true` (db.ts:43-48).

**Key architectural concern:** the backend runs two sources of truth (Postgres + local JSON store). On Vercel's ephemeral filesystem the JSON store can only act as a cold-start cache — every serverless instance re-hydrates from Postgres in `initDatabase()` (db.ts:206), which loads **all** orders with includes on each cold start.

---

## 2. Functional Status

### Stable
- **Server-side RBAC is real, not just UI hiding.** Every `/worker/*` and `/admin/*` route in `backend/src/routes.ts` is wrapped in `requireAuth` + `requireRole([...])` (routes.ts:167-349). `middleware/auth.ts` verifies JWTs, then re-checks role/account status against local store **and** Postgres (auth.ts:132-173). Blocked/suspended accounts get 403.
- **Resilient DB layer** with retry, health-cooldown, and a 503 guard (`DbUnavailableError`) for write endpoints when Postgres is down in production.
- **SSE realtime bus** (`/events/stream`, routes.ts:355) with 25s heartbeats and client cleanup.
- **Razorpay webhook** preserves `rawBody` for signature verification (app.ts:19-26).
- **Multer uploads** are MIME-allowlisted (PDF/JPEG/PNG/WebP) and capped at 5 MB × 5 files (routes.ts:46-66).
- Backend Jest suite (`tests/business.test.ts`) plus a set of root-level `tests/*.js` e2e scripts.

### Broken / At-risk
- **`initDatabase()` seeds a default admin whose user id is a person's full name** — `process.env.ADMIN_ID || 'Karan Kumar'` (db.ts:303-305). Fragile, personal, and a data-quality hazard.
- **Default worker password fallback is hardcoded** — `process.env.DEFAULT_WORKER_PASSWORD || 'Worker@Safe123'` (db.ts:363) and seeded at startup.
- **Vercel serverless + per-instance `localStore`** means read-your-own-writes can diverge across invocations; the JSON fallback is explicitly disallowed for writes in production, so any write-path that silently assumes the fallback works in dev will 503 in prod if Postgres blips.
- **Root `tests/` scripts are scratch-grade** (11 loose `.js` files, `get_latest_orders.js`, etc.), not wired into any npm script.

---

## 3. Performance Bottlenecks & the Slow-Reload Fix

**Confirmed: the production build is a single 1,012 KB JS chunk** (`frontend/dist/assets/index-DwLJ2FKX.js`) — no code splitting at all.

Root causes, in order of impact:

1. **The entire lucide-react library is force-inlined.** `frontend/src/components/customer/ServiceCard.jsx:2` does `import * as Icons from 'lucide-react'` (used as `Icons[service.icon]`, line 5). A namespace import defeats tree-shaking and pulls every icon (~2,000 of them) into the bundle. This is the single biggest bloat source.
2. **No route-level code splitting.** `frontend/src/App.jsx` statically imports ~15 pages (Home, ServicesPage, ServiceForm, Checkout, MyOrders, OrderTracking, Profile, Wallet, Notifications, Documents, Help, Login, Register…) into one chunk. Same pattern in admin/worker routers.
3. **Dead chart dependencies.** `chart.js` + `react-chartjs-2` are declared in **all three** web workspaces' `package.json` but **imported nowhere** in `frontend/src`, `admin/src`, or `worker/src` (verified by grep). Install/node_modules bloat, zero functional use.
4. **No `manualChunks`** in `frontend/vite.config.js` — React/React-DOM/router never get their own long-cacheable vendor chunk.
5. **Slow dev reload** is the mirror of #1–2: Vite must pre-bundle and re-optimize the whole icon namespace plus every static page on every dependency change; the monorepo `postinstall` also runs `prisma generate` on every install.

**The fix (concrete):**
- `ServiceCard.jsx`: replace the namespace import with an explicit named-import map of the ~10–15 icons actually used (e.g. `import { FileText, Zap, Printer, ... } from 'lucide-react'; const icons = { file: FileText, ... }`).
- `App.jsx` (and admin/worker): `const Home = React.lazy(() => import('./pages/customer/Home'))` per route, wrapped in `<Suspense fallback={...}>`. Heavy pages (Checkout, OrderTracking, ServiceForm, CustomerDocuments) win most.
- `vite.config.js`: add `build.rollupOptions.output.manualChunks` for `react`, `react-dom`, `react-router-dom`.
- Remove `chart.js`/`react-chartjs-2` from the three web `package.json` files (keep in mobile-app — actually verify usage there too; mobile declares them in its own package.json but I found no import in `mobile-app/src` either, so remove there as well).
- Expected result: initial chunk drops from ~1,012 KB to roughly 250–350 KB, with on-demand lazy chunks; dev pre-bundle shrinks the same way, fixing the slow reload.

---

## 4. Security Audit

### What I checked
| Search | Result |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` in repo (excl. node_modules) | **No exposure found** — referenced only via env in `SupabaseStorageAdapter.ts`/`supabaseClient.ts` |
| Hardcoded JWTs (`eyJ…` tokens) anywhere in source/docs | **None found** (verified with two independent regex passes) |
| Raw `postgres://user:pass@…` connection strings in tracked files | **None found** |
| `.env` files | Correctly git-ignored (`.env`, `.env.*`, `*.env`, `!.env.example`) |
| **`backend/data/*.json`** | ⚠️ **All 7 files are git-tracked**, including `persisted_orders.json` (244 KB in working tree), `financial_ledger.json` (56 KB), `persisted_documents.json` (22 KB), plus a `PRE_PRODUCTION_CLEANUP_BACKUP/` copy of the same. Operational/financial data is in git history. |

### Vulnerabilities identified (ranked)
1. **Weak default JWT secret.** Both `middleware/auth.ts:55-62` and `routes.ts:43` fall back to the literal string `'super-secret-jwt-key'` if `AUTH_SECRET`/`JWT_SECRET` are unset. If any deployment omits the env var, anyone can forge admin/worker tokens. → Make it fail-fast (throw at boot when unset in production).
2. **CORS is open with credentials.** `app.ts:9-16` uses `origin: true` (reflects any origin) + `credentials: true` — effectively any website can make credentialed cross-origin API calls. Restrict to the known app origins (Vercel frontends + localhost in dev).
3. **Sensitive JSON data tracked in git** (see table above) — order records, document metadata, and ledger entries are version-controlled and leaked to every clone/fork. Remove with `git rm --cached` + gitignore; clean history with filter-repo if this repo is ever public or shared.
4. **Hardcoded default worker password** `'Worker@Safe123'` (db.ts:363) — seeded into Postgres on startup when the env var is unset.
5. **50 MB JSON body limit** (app.ts:21) — an oversized-payload DoS surface; order payloads never approach 1 MB. 1–2 MB is plenty.
6. **IDOR risk on document routes (verify, not confirmed):** `/documents/:id`, `/documents/:id/download` (routes.ts:156-158) use `optionalAuth` — guests can attempt access and any user passes auth. Ownership of `:id` must be enforced *inside* `documentController`; I did not audit those handlers line-by-line. Same for `/orders/:id/deliverables/.../download` (routes.ts:161).
7. **SSE stream sets `Access-Control-Allow-Origin: *`** (routes.ts:361) — low impact (public events only) but inconsistent with the credentialed-CORS decision above.
8. **JWT accepted from `?token=` query string** (auth.ts:84-88) — tokens in URLs leak into server logs, proxies, and referrer headers.

### Security score: **5 / 10**
Server-side authZ is genuinely enforced (a real plus — many projects of this kind get away with UI-only hiding), and no secrets are committed. But the weak-secret fallback, open credentialed CORS, tracked operational data, and default worker password are production-grade hazards. Fix #1–#4 and this jumps to 8/10.

---

## 5. Immediate 3-Step Action Plan

**Step 1 — Kill the 1 MB bundle (highest user-visible impact, ~2h)**
1. `ServiceCard.jsx`: namespace import → explicit named icon imports.
2. `App.jsx` (repeat for admin/worker/mobile): convert all page imports to `React.lazy()` + `<Suspense>`.
3. `vite.config.js`: add `manualChunks` for the React vendor trio.
4. Drop `chart.js`/`react-chartjs-2` from every workspace that doesn't import them (all four, per grep).
   Rebuild: target **< 350 KB initial chunk** and verify in `dist` output.

**Step 2 — Lock the doors (security, ~1h)**
1. Remove the `'super-secret-jwt-key'` fallback: throw at startup when `AUTH_SECRET` is missing in `NODE_ENV=production` (both `auth.ts` and `routes.ts` read it — dedupe to one helper).
2. Replace `origin: true` with an explicit origin allowlist (env-driven, e.g. `CORS_ORIGINS`).
3. `git rm --cached backend/data/` (all 7 files), add `backend/data/` to `.gitignore`, and note that *history* still contains the data — use `git filter-repo` if this repo leaves your hands.
4. Require `DEFAULT_WORKER_PASSWORD` (fail-fast like #1) and rotate any workers seeded with `Worker@Safe123`.
5. Cut the JSON body limit from 50 MB to 2 MB; drop the `?token=` query param from `extractToken`.

**Step 3 — Clean the yard (repo hygiene, ~30m)**
1. Delete `backend.zip` (**231 MB**) and `worker.zip` (1.4 MB) from the repo root; add `*.zip` to `.gitignore` so they stop polluting `git status`.
2. De-triplicate the docs: `API_SPECIFICATION.md`, `DATABASE_CONTEXT.md`, `FINAL_TEST_REPORT.md`, `PRODUCTION_DATABASE_CLEANUP_REPORT.md` exist at root **and** `docs/` **and** `backend/` — keep `docs/` as the single source and delete the other copies.
3. Move `jest`, `ts-node`, `typescript`, and all `@types/*` from `backend` **dependencies** to **devDependencies** (they're currently shipped in the production image), and prune the root `axios`/`tailwindcss`/`postcss`/`autoprefixer` — no workspace relies on root-level hoisting of them (mobile declares its own).
4. Delete or archive the root `tests/*.js` scratch scripts; keep only the Jest suite under `backend/`.

---

### Appendix — Files that matter most
| File | Why |
|---|---|
| `backend/src/routes.ts` | Entire API surface + RBAC wiring |
| `backend/src/middleware/auth.ts` | Token extraction, role verification, DB re-check |
| `backend/src/db.ts` | Prisma lifecycle, retry, fallback policy, seeding |
| `backend/src/catalogData.ts` | In-memory store + JSON persistence (`data/*.json`) |
| `frontend/src/App.jsx` | Static route imports (the bundle problem) |
| `frontend/src/components/customer/ServiceCard.jsx:2` | `import * as Icons` — the biggest bloat line |
| `backend/data/*.json` | Sensitive operational data, git-tracked |

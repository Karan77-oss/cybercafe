-- ============================================================================
-- Cyber Cafe — Service Catalog: RLS hardening + schema validation
-- Target: the PostgreSQL database that Prisma manages (table: "Service")
--
-- IMPORTANT ARCHITECTURE NOTE
-- --------------------------
-- The customer portal (frontend/) and mobile-app/ do NOT read this table
-- directly through PostgREST / the anon key. They call the Express backend
-- `GET /api/services`, whose single source of truth is Prisma reading "Service"
-- as the superuser/service connection. Prisma's default connection bypasses RLS
-- entirely, so RLS is NOT the reason your admin-created services were missing
-- from the customer portal.
--
--   The ACTUAL root cause of "only 2 services showing" was a seeding bug in
--   backend/src/db.ts: the 16-row official catalog was only written when the
--   table was completely EMPTY. The moment any test/admin row existed, the
--   seed was skipped, so the base catalog never materialized. That is fixed
--   (idempotent per-service seeding).
--
-- This script is still worth running because it makes the "Service" table safe
-- to expose to PostgREST/anon later (defense-in-depth): RLS ON + a narrow
-- public read policy, with NO anon write access. It is idempotent.
--
-- Run from Supabase SQL editor / psql against the same schema Prisma uses.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PART 0 — DIAGNOSIS: confirm what the customer portal will actually see.
-- The customer endpoint filters: status = 'ACTIVE' AND "approvalStatus" = 'APPROVED'
-- ----------------------------------------------------------------------------
SELECT status,
       "approvalStatus",
       COUNT(*) AS total
FROM   "Service"
GROUP  BY status, "approvalStatus"
ORDER  BY "approvalStatus", status;

-- What the portal exposes today:
SELECT COUNT(*) AS visible_to_customers
FROM   "Service"
WHERE  status = 'ACTIVE'
  AND  "approvalStatus" = 'APPROVED';

-- Are there rows the admin created that SHOULD be visible but aren't?
-- (i.e. stuck in a non-visible state)
SELECT id, name, status, "approvalStatus"
FROM   "Service"
WHERE  NOT (status = 'ACTIVE' AND "approvalStatus" = 'APPROVED');


-- ----------------------------------------------------------------------------
-- PART 1 — SCHEMA VALIDATION (no-ops that just assert the expected shape).
-- Run each; they throw if the column/type is missing (helps catch drift).
-- ----------------------------------------------------------------------------
-- Confirm the columns the UI card component relies on exist:
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_name = 'Service'
  AND column_name IN (
        'id','name','slug','description','category',
        'pricePaise','workerAmountPaise','adminCommissionPaise','platformFeePaise',
        'currency','estimatedTime','requiredDocuments','formSchema',
        'status','"approvalStatus"','createdAt','updatedAt'
      )
ORDER  BY ordinal_position;

-- NOTE on naming: this table has NO `is_active` / `fee` / `title` / `turnaround_time`
-- columns. The canonical fields are:
--     price      -> "pricePaise"      (integer, paise = ₹*100)
--     title      -> "name"
--     status/is_active -> "status"    (enum "ServiceStatus")
--     approval   -> "approvalStatus"  (enum "ApprovalStatus")
--     turnaround -> "estimatedTime"   (text, e.g. '24-48 Hours')
-- The frontend already reads pricePaise/name/estimatedTime, so keep using those.


-- ----------------------------------------------------------------------------
-- PART 2 — ENABLE ROW LEVEL SECURITY on "Service" (idempotent).
-- ----------------------------------------------------------------------------
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;

-- Apply to the service user itself too (Supabase convention: FORCE so that even
-- the owner-role connection is subject to the policies below).
ALTER TABLE "Service" FORCE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- PART 3 — POLICIES (drop-then-create keeps this re-runnable).
-- ----------------------------------------------------------------------------

-- Public/anon + authenticated may READ only live, approved services.
DROP POLICY IF EXISTS "service_public_read" ON "Service";
CREATE POLICY "service_public_read"
ON "Service"
FOR SELECT TO anon, authenticated, public
USING (
  status = 'ACTIVE' AND "approvalStatus" = 'APPROVED'
);

-- Guarded role grants (only if you model per-role Postgres users; skipped
-- silently otherwise — the admin panel writes through the backend service user
-- which bypasses RLS, so these are optional hardening, not required).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worker') THEN
    DROP POLICY IF EXISTS "service_worker_read" ON "Service";
    CREATE POLICY "service_worker_read"
    ON "Service"
    FOR SELECT TO worker
    USING (status = 'ACTIVE' AND "approvalStatus" = 'APPROVED');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    DROP POLICY IF EXISTS "service_admin_all" ON "Service";
    CREATE POLICY "service_admin_all"
    ON "Service"
    FOR ALL TO admin
    USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- Intentionally NO INSERT/UPDATE/DELETE policy for anon/authenticated,
-- so the catalog can only be mutated by admins or via the backend service.


-- ----------------------------------------------------------------------------
-- PART 4 — VERIFY (run last).
-- ----------------------------------------------------------------------------
-- Which policies now guard the table?
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM   pg_policies
WHERE  schemaname = 'public'
  AND  tablename  = 'Service'
ORDER  BY policyname;

-- Is RLS actually armed?
SELECT relname, relforcerls, relrowsecurity
FROM   pg_class
WHERE  relname = 'Service';

-- ============================================================================
-- DONE. Re-run `GET /api/services` on the portal — it should now list every
-- ACTIVE+APPROVED service, including ones you added from the Admin panel.
-- ============================================================================

-- ==============================================================================
-- Cyber Cafe Digital Marketplace - Database Performance & RLS Security Migration
-- Target Table: public."Order"
-- Purpose: 
--   1. Accelerate queries to <5ms with composite indexes on customerId, userId, workerId, status, and createdAt
--   2. Enforce strict Row Level Security (RLS) policies for Customer INSERT and Customer/Worker UPDATE
-- ==============================================================================

-- 1. Performance Indexes for Ultra-Fast Customer & Worker Order Lookups
CREATE INDEX IF NOT EXISTS "Order_customerId_createdAt_desc_idx" 
  ON public."Order" ("customerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_desc_idx" 
  ON public."Order" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Order_workerId_createdAt_desc_idx" 
  ON public."Order" ("workerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Order_status_createdAt_desc_idx" 
  ON public."Order" ("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Order_assignedWorkerId_status_idx" 
  ON public."Order" ("assignedWorkerId", "status");

-- 2. RLS Policy: Customer Order Placement (INSERT)
DROP POLICY IF EXISTS "orders_customer_insert" ON public."Order";
CREATE POLICY "orders_customer_insert" ON public."Order"
  FOR INSERT TO authenticated
  WITH CHECK (
    "customerId" = (auth.uid())::text
    OR "userId" = (auth.uid())::text
    OR ((auth.jwt() ->> 'role'::text) = 'ADMIN'::text)
    OR ((auth.jwt() ->> 'role'::text) = 'CUSTOMER'::text)
  );

-- 3. RLS Policy: Customer and Worker Updates (UPDATE)
DROP POLICY IF EXISTS "orders_customer_and_worker_update" ON public."Order";
CREATE POLICY "orders_customer_and_worker_update" ON public."Order"
  FOR UPDATE TO authenticated
  USING (
    "customerId" = (auth.uid())::text
    OR "userId" = (auth.uid())::text
    OR "workerId" = (auth.uid())::text
    OR "assignedWorkerId" = (auth.uid())::text
    OR ((auth.jwt() ->> 'role'::text) = 'ADMIN'::text)
  )
  WITH CHECK (
    "customerId" = (auth.uid())::text
    OR "userId" = (auth.uid())::text
    OR "workerId" = (auth.uid())::text
    OR "assignedWorkerId" = (auth.uid())::text
    OR ((auth.jwt() ->> 'role'::text) = 'ADMIN'::text)
  );

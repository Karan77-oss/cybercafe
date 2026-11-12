-- ============================================================================
-- Enterprise Cyber Cafe Marketplace: Complete Production Database Hardening
-- PostgreSQL / Supabase SQL Migration
-- ============================================================================

-- 1. Ensure applicationTypes JSONB column exists on Service and ServiceProposal
ALTER TABLE IF EXISTS "Service" 
ADD COLUMN IF NOT EXISTS "applicationTypes" JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS "ServiceProposal" 
ADD COLUMN IF NOT EXISTS "applicationTypes" JSONB DEFAULT '[]'::jsonb;

-- 2. Add chat attachment support on OrderChatMessage
ALTER TABLE IF EXISTS "OrderChatMessage"
ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;

-- 3. Ensure Strict Transparent Pricing Constraints
-- Enforce: Customer Price = Worker Base Amount + Admin Commission (Zero Hidden Platform Fees)
-- platformFeePaise = 0
UPDATE "Service"
SET "platformFeePaise" = 0,
    "adminCommissionPaise" = COALESCE("adminCommissionPaise", GREATEST(0, "pricePaise" - COALESCE("workerAmountPaise", 0)))
WHERE "platformFeePaise" IS DISTINCT FROM 0;

-- 4. Enable Row Level Security on Core Tables
ALTER TABLE IF EXISTS "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "OrderChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ServiceProposal" ENABLE ROW LEVEL SECURITY;

-- 5. Public read policy for live active catalog
DROP POLICY IF EXISTS "service_public_read" ON "Service";
CREATE POLICY "service_public_read" ON "Service"
FOR SELECT TO anon, authenticated, public
USING (status = 'ACTIVE' AND ("approvalStatus" = 'APPROVED' OR "approvalStatus" IS NULL));

-- 6. Storage Bucket Configuration (Idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverables', 'deliverables', false)
ON CONFLICT (id) DO NOTHING;

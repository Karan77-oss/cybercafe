-- ============================================================================
-- Enterprise Cyber Cafe Marketplace: Order Worker Visibility & Realtime RLS
-- PostgreSQL / Supabase SQL Migration
-- ============================================================================

-- 1. Enable Row Level Security on Order
ALTER TABLE IF EXISTS "Order" ENABLE ROW LEVEL SECURITY;

-- 2. Worker & Customer Order SELECT Policy
-- Workers can view unassigned open orders OR their own assigned orders.
-- Customers can view their own orders. Admins can view all orders.
DROP POLICY IF EXISTS "orders_worker_and_customer_select" ON "Order";
CREATE POLICY "orders_worker_and_customer_select" ON "Order"
FOR SELECT TO authenticated
USING (
  -- Available unassigned orders in open/claimable status
  (
    status IN ('AVAILABLE', 'PAID', 'CREATED') 
    AND ("workerId" IS NULL OR "workerId" = '')
    AND ("assignedWorkerId" IS NULL OR "assignedWorkerId" = '')
  )
  -- Or assigned to this operator
  OR "workerId" = auth.uid()::text
  OR "assignedWorkerId" = auth.uid()::text
  -- Or belongs to this customer
  OR "customerId" = auth.uid()::text
  OR "userId" = auth.uid()::text
  -- Or Admin token
  OR (auth.jwt()->>'role') = 'ADMIN'
);

-- 3. Add "Order" table to the supabase_realtime publication for postgres_changes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Order'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
    END IF;
  END IF;
END $$;

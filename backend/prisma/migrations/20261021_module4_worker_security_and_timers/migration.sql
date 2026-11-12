-- AlterTable User to add smart worker ranking fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activeOrdersCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "completedOrdersCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avgCompletionMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastHeartbeatAt" TIMESTAMP(3);

-- Create composite index for smart worker ranking
CREATE INDEX IF NOT EXISTS "idx_smart_worker_ranking" ON "User"("role", "isOnline", "status", "activeOrdersCount");

-- Create or Replace worker_orders_view
-- Strictly exposes workerAmountPaise while completely excluding pricePaise, adminCommissionPaise, and platformFeePaise
CREATE OR REPLACE VIEW worker_orders_view AS
SELECT
  o.id,
  o."orderNumber",
  o."customerId",
  o."serviceId",
  o."assignedWorkerId",
  o."formData",
  o."workerAmountPaise",
  o."currency",
  o.status,
  o."paymentStatus",
  o."earningStatus",
  o."acceptedAt",
  o."startedAt",
  o."workCompletedAt",
  o."receiptSubmittedAt",
  o."completedAt",
  o."cancelledAt",
  o."createdAt",
  o."updatedAt",
  o."timeSlot",
  o."bookingDate",
  o."slotStatus",
  o."proposedSlot",
  o."proposedDate"
FROM "Order" o;

-- Create or Replace process_cybercafe_timers function for pg_cron
-- Handles 10-minute offer reassignment and 30-minute worker inactivity auto-offline with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION process_cybercafe_timers()
RETURNS void AS $$
DECLARE
  expired_order RECORD;
  inactive_worker RECORD;
BEGIN
  -- 1. 10-Minute offer reassignment with FOR UPDATE SKIP LOCKED
  FOR expired_order IN
    SELECT id, "assignedWorkerId", status
    FROM "Order"
    WHERE status = 'OFFERED'
      AND "updatedAt" < NOW() - INTERVAL '10 minutes'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE "Order"
    SET status = 'AVAILABLE',
        "assignedWorkerId" = NULL,
        "updatedAt" = NOW()
    WHERE id = expired_order.id;
  END LOOP;

  -- 2. 30-Minute worker inactivity auto-offline
  FOR inactive_worker IN
    SELECT id
    FROM "User"
    WHERE role = 'WORKER'
      AND "isOnline" = true
      AND ("lastHeartbeatAt" IS NULL OR "lastHeartbeatAt" < NOW() - INTERVAL '30 minutes')
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE "User"
    SET "isOnline" = false,
        "updatedAt" = NOW()
    WHERE id = inactive_worker.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

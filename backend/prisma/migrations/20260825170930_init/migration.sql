-- ==========================================
-- 1. SAFE ENUM CREATION & SYNC
-- ==========================================
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'WORKER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

DO $$ BEGIN
    CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM (
        'CREATED', 'PAYMENT_PENDING', 'PAID', 'AVAILABLE', 'ASSIGNED', 'ACCEPTED',
        'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'SUBMITTED', 'WORK_COMPLETED',
        'RECEIPT_SUBMITTED', 'REVISION_REQUIRED', 'COMPLETED', 'CANCELLED',
        'REJECTED', 'DISPUTED', 'REFUND_PENDING', 'REFUNDED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'WORK_COMPLETED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RECEIPT_SUBMITTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

DO $$ BEGIN
    CREATE TYPE "JobStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';

DO $$ BEGIN
    CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'RELEASED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================
-- 2. CREATE & ALTER ALL 17 TABLES
-- ==========================================

-- 1. User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "profileImage" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "businessName" TEXT,
    "verificationStatus" TEXT DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "bankDetails" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankDetails" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- 2. Service
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "workerAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "adminCommissionPaise" INTEGER NOT NULL DEFAULT 0,
    "platformFeePaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "estimatedTime" TEXT NOT NULL,
    "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "formSchema" JSONB,
    "status" "ServiceStatus" NOT NULL DEFAULT 'INACTIVE',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdByWorkerId" TEXT,
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "workerAmountPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "adminCommissionPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "platformFeePaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';

-- 3. ServiceProposal
CREATE TABLE IF NOT EXISTS "ServiceProposal" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "suggestedPricePaise" INTEGER NOT NULL,
    "requestedWorkerAmountPaise" INTEGER,
    "estimatedTime" TEXT NOT NULL,
    "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "formSchema" JSONB,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceProposal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServiceProposal" ADD COLUMN IF NOT EXISTS "requestedWorkerAmountPaise" INTEGER;

-- 4. Order
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "assignedWorkerId" TEXT,
    "serviceSnapshot" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "pricing" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "formData" JSONB,
    "workerAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "adminCommissionPaise" INTEGER NOT NULL DEFAULT 0,
    "platformFeePaise" INTEGER NOT NULL DEFAULT 0,
    "customerPaidAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "earningStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "workCompletedAt" TIMESTAMP(3),
    "receiptSubmittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSlot" TEXT,
    "bookingDate" TEXT,
    "slotStatus" TEXT DEFAULT 'UNASSIGNED',
    "proposedSlot" TEXT,
    "proposedDate" TEXT,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "assignedWorkerId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "formData" JSONB;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "workerAmountPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminCommissionPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformFeePaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPaidAmountPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "earningStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "workCompletedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "receiptSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "timeSlot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "bookingDate" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "slotStatus" TEXT DEFAULT 'UNASSIGNED';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "proposedSlot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "proposedDate" TEXT;

-- 5. Job
CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 6. Payment
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "signature" TEXT,
    "paidAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "signature" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

-- 7. Payout
CREATE TABLE IF NOT EXISTS "Payout" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 8. WorkerEarning
CREATE TABLE IF NOT EXISTS "WorkerEarning" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "holdReason" TEXT,
    "holdAt" TIMESTAMP(3),
    "releasedFromHoldAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerEarning_pkey" PRIMARY KEY ("id")
);

-- 9. FinancialLedger
CREATE TABLE IF NOT EXISTS "FinancialLedger" (
    "id" TEXT NOT NULL,
    "workerId" TEXT,
    "orderId" TEXT,
    "withdrawalId" TEXT,
    "refundId" TEXT,
    "type" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialLedger_pkey" PRIMARY KEY ("id")
);

-- 10. Withdrawal
CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "method" TEXT NOT NULL DEFAULT 'BANK',
    "payoutDetails" JSONB,
    "paymentReference" TEXT,
    "adminNote" TEXT,
    "approvedBy" TEXT,
    "processedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- 11. Receipt
CREATE TABLE IF NOT EXISTS "Receipt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- 12. Complaint
CREATE TABLE IF NOT EXISTS "Complaint" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "workerId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- 13. Refund
CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "customerId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "providerRefundId" TEXT,
    "approvedBy" TEXT,
    "processedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- 14. Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- 15. Review
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "workerId" TEXT,
    "serviceId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- 16. Document
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "jobId" TEXT,
    "customerId" TEXT NOT NULL,
    "workerId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Document" ALTER COLUMN "orderId" DROP NOT NULL;

-- 17. AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- 18. WelfareCase (tickets)
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "internal_notes" JSONB,
    "is_escalated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- 19. RefundRecord (refund_records)
CREATE TABLE IF NOT EXISTS "refund_records" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "utr_number" TEXT,
    "receipt_url" TEXT,
    "processed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refund_records_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- 3. INDEXES
-- ==========================================
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "Service_slug_key" ON "Service"("slug");
CREATE INDEX IF NOT EXISTS "Service_category_idx" ON "Service"("category");
CREATE INDEX IF NOT EXISTS "Service_status_idx" ON "Service"("status");

CREATE INDEX IF NOT EXISTS "ServiceProposal_workerId_idx" ON "ServiceProposal"("workerId");
CREATE INDEX IF NOT EXISTS "ServiceProposal_status_idx" ON "ServiceProposal"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_serviceId_idx" ON "Order"("serviceId");
CREATE INDEX IF NOT EXISTS "Order_assignedWorkerId_idx" ON "Order"("assignedWorkerId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Job_orderId_key" ON "Job"("orderId");
CREATE INDEX IF NOT EXISTS "Job_workerId_idx" ON "Job"("workerId");
CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerOrderId_key" ON "Payment"("providerOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");

CREATE UNIQUE INDEX IF NOT EXISTS "Payout_jobId_key" ON "Payout"("jobId");
CREATE INDEX IF NOT EXISTS "Payout_workerId_idx" ON "Payout"("workerId");
CREATE INDEX IF NOT EXISTS "Payout_status_idx" ON "Payout"("status");

CREATE INDEX IF NOT EXISTS "WorkerEarning_workerId_idx" ON "WorkerEarning"("workerId");
CREATE INDEX IF NOT EXISTS "WorkerEarning_orderId_idx" ON "WorkerEarning"("orderId");
CREATE INDEX IF NOT EXISTS "WorkerEarning_status_idx" ON "WorkerEarning"("status");
CREATE INDEX IF NOT EXISTS "WorkerEarning_createdAt_idx" ON "WorkerEarning"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "FinancialLedger_idempotencyKey_key" ON "FinancialLedger"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "FinancialLedger_workerId_idx" ON "FinancialLedger"("workerId");
CREATE INDEX IF NOT EXISTS "FinancialLedger_orderId_idx" ON "FinancialLedger"("orderId");
CREATE INDEX IF NOT EXISTS "FinancialLedger_withdrawalId_idx" ON "FinancialLedger"("withdrawalId");
CREATE INDEX IF NOT EXISTS "FinancialLedger_type_idx" ON "FinancialLedger"("type");
CREATE INDEX IF NOT EXISTS "FinancialLedger_createdAt_idx" ON "FinancialLedger"("createdAt");

CREATE INDEX IF NOT EXISTS "Withdrawal_workerId_idx" ON "Withdrawal"("workerId");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX IF NOT EXISTS "Withdrawal_requestedAt_idx" ON "Withdrawal"("requestedAt");

CREATE INDEX IF NOT EXISTS "Receipt_orderId_idx" ON "Receipt"("orderId");
CREATE INDEX IF NOT EXISTS "Receipt_workerId_idx" ON "Receipt"("workerId");
CREATE INDEX IF NOT EXISTS "Receipt_customerId_idx" ON "Receipt"("customerId");
CREATE INDEX IF NOT EXISTS "Receipt_status_idx" ON "Receipt"("status");

CREATE INDEX IF NOT EXISTS "Complaint_orderId_idx" ON "Complaint"("orderId");
CREATE INDEX IF NOT EXISTS "Complaint_customerId_idx" ON "Complaint"("customerId");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX IF NOT EXISTS "Complaint_createdAt_idx" ON "Complaint"("createdAt");

CREATE INDEX IF NOT EXISTS "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX IF NOT EXISTS "Refund_customerId_idx" ON "Refund"("customerId");
CREATE INDEX IF NOT EXISTS "Refund_status_idx" ON "Refund"("status");
CREATE INDEX IF NOT EXISTS "Refund_requestedAt_idx" ON "Refund"("requestedAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX IF NOT EXISTS "Review_orderId_idx" ON "Review"("orderId");
CREATE INDEX IF NOT EXISTS "Review_customerId_idx" ON "Review"("customerId");
CREATE INDEX IF NOT EXISTS "Review_workerId_idx" ON "Review"("workerId");
CREATE INDEX IF NOT EXISTS "Review_serviceId_idx" ON "Review"("serviceId");

CREATE UNIQUE INDEX IF NOT EXISTS "Document_storageKey_key" ON "Document"("storageKey");
CREATE INDEX IF NOT EXISTS "Document_orderId_idx" ON "Document"("orderId");
CREATE INDEX IF NOT EXISTS "Document_customerId_idx" ON "Document"("customerId");
CREATE INDEX IF NOT EXISTS "Document_jobId_idx" ON "Document"("jobId");

CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX IF NOT EXISTS "tickets_user_id_idx" ON "tickets"("user_id");
CREATE INDEX IF NOT EXISTS "tickets_order_id_idx" ON "tickets"("order_id");
CREATE INDEX IF NOT EXISTS "tickets_status_idx" ON "tickets"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "refund_records_ticket_id_key" ON "refund_records"("ticket_id");
CREATE INDEX IF NOT EXISTS "refund_records_ticket_id_idx" ON "refund_records"("ticket_id");
CREATE INDEX IF NOT EXISTS "refund_records_order_id_idx" ON "refund_records"("order_id");
CREATE INDEX IF NOT EXISTS "refund_records_status_idx" ON "refund_records"("status");
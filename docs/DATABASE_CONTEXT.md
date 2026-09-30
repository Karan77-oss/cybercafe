# DATABASE_CONTEXT.md

# Cyber Cafe Marketplace

## Authoritative Database Architecture, Data Model & Financial Integrity Context

---

# 1. DOCUMENT PURPOSE

This document is the **authoritative database context and data-integrity specification** for the Cyber Cafe Marketplace.

It defines:

* Database architecture
* Core entities
* Entity relationships
* Customer data
* Worker data
* Admin data
* Services
* Orders
* Payments
* Razorpay integration
* Service price snapshots
* Worker assignment
* Customer documents
* Final receipts
* Worker earnings
* Financial ledger
* Commission
* Platform fee
* Complaints
* Earning holds
* Refunds
* Withdrawals
* Notifications
* Reviews and ratings
* Audit logs
* Status/state machines
* Security boundaries
* Transaction requirements
* Idempotency requirements
* Realtime synchronization
* Financial invariants
* Indexing requirements
* Data lifecycle
* Production data rules

This file must be treated as a **source of truth for database design**.

---

# 2. TECHNOLOGY CONTEXT

The project uses a relational database architecture.

Expected technology:

```text
PostgreSQL
+
Prisma ORM
+
Supabase
```

Supabase may also be used for:

* Authentication
* PostgreSQL
* Storage
* Realtime
* Row-level/security-related mechanisms where applicable

The exact implementation must first be inspected from the existing repository.

Do NOT create duplicate models if equivalent models already exist.

---

# 3. DATABASE DESIGN PRINCIPLES

The database must follow these principles:

1. Backend is the financial source of truth.
2. Database is the authoritative persistent source of truth.
3. Frontend must never be treated as authoritative.
4. Financial values must be stored using exact decimal/numeric representation.
5. Do NOT use floating-point numbers for money.
6. Historical financial values must be immutable.
7. Financial operations must be transactional.
8. Financial operations must be idempotent.
9. Every important financial action must be auditable.
10. Customer payment amount and worker earning must remain separate.
11. Commission and platform fee must remain separate.
12. Worker must never receive unauthorized customer payment data.
13. Worker earnings must come from worker-assigned amount.
14. Withdrawal must never exceed available balance.
15. Held/pending earnings cannot be withdrawn.
16. Lifetime earnings must not decrease because of withdrawals.
17. Refunds must not destroy historical financial records.
18. Duplicate webhook/event processing must never duplicate money.
19. Database constraints should protect critical business rules wherever possible.

---

# 4. MONEY STORAGE RULE

All monetary values must use:

```text
Decimal / NUMERIC
```

Never:

```text
Float
Double
JavaScript floating-point arithmetic
```

Example:

```text
workerAmount       NUMERIC
adminCommission    NUMERIC
platformFee        NUMERIC
customerPaidAmount NUMERIC
refundAmount       NUMERIC
withdrawalAmount   NUMERIC
```

Currency should be explicitly stored where appropriate:

```text
currency = INR
```

---

# 5. CORE ENTITY MAP

The conceptual database contains:

```text
User
│
├── Customer Profile
│
├── Worker Profile
│
└── Admin Role/Profile
│
├── Service
│   ├── Service Proposal
│   ├── Service Price
│   └── Required Documents
│
├── Order
│   ├── Order Service Snapshot
│   ├── Payment
│   ├── Order Documents
│   ├── Worker Assignment
│   ├── Receipt
│   ├── Review
│   ├── Complaint
│   ├── Refund
│   └── Worker Earning
│
├── Financial Ledger
│
├── Withdrawal
│
├── Notification
│
└── Audit Log
```

---

# 6. USER ENTITY

## Purpose

Represents every authenticated account.

Conceptual fields:

```text
id
email
phone
name
password/auth reference
role
status
createdAt
updatedAt
lastLoginAt
```

Role:

```text
CUSTOMER
WORKER
ADMIN
```

Do not rely only on frontend role values.

Backend must enforce role authorization.

---

# 7. USER STATUS

Possible states:

```text
ACTIVE
INACTIVE
SUSPENDED
BLOCKED
PENDING
```

Do not confuse account status with worker availability.

---

# 8. CUSTOMER PROFILE

Customer-specific information should be separated logically from generic authentication information where appropriate.

Possible fields:

```text
userId
name
phone
email
address
city
profileImage
createdAt
updatedAt
```

Customer can access only their own private information.

---

# 9. WORKER PROFILE

Worker-specific information may contain:

```text
id
userId
name
phone
email
businessName
address
city
profilePhoto
verificationStatus
workerStatus
availabilityStatus
bankDetails/reference
createdAt
updatedAt
```

Sensitive banking information must have strict access control.

Never expose sensitive financial/bank data to other workers or customers.

---

# 10. WORKER STATUS

Worker account/business status:

```text
PENDING
ACTIVE
PAUSED
SUSPENDED
BLOCKED
```

Worker availability should be separate:

```text
ONLINE
OFFLINE
```

Do not use:

```text
workerStatus = OFFLINE
```

to represent availability.

---

# 11. WORKER VERIFICATION

Worker verification should preserve:

```text
verificationStatus
verifiedBy
verifiedAt
verificationNotes
```

Possible state:

```text
PENDING
VERIFIED
REJECTED
```

Admin controls worker activation.

---

# 12. SERVICE ENTITY

Represents a marketplace service.

Possible fields:

```text
id
name
slug
description
categoryId
status
createdBy
approvedBy
approvedAt
createdAt
updatedAt
```

Service status:

```text
DRAFT
PENDING_APPROVAL
ACTIVE
INACTIVE
REJECTED
SUSPENDED
```

Only approved/active services should be available to customers.

---

# 13. SERVICE PRICING

Service pricing must remain logically separated into:

```text
workerAmount
adminCommission
platformFee
customerTotal
currency
```

Example:

```text
workerAmount = ₹55
adminCommission = ₹25
platformFee = ₹20
customerTotal = ₹100
```

Formula:

```text
customerTotal
=
workerAmount
+
adminCommission
+
platformFee
```

Backend calculates this.

Never trust frontend-supplied totals.

---

# 14. SERVICE PRICE HISTORY

When pricing changes, historical orders must NOT change.

Maintain a price history/version concept where appropriate:

```text
serviceId
workerAmount
adminCommission
platformFee
customerTotal
effectiveFrom
effectiveTo
createdBy
createdAt
```

An order must use a snapshot of the price at the time the order is created/paid.

---

# 15. ORDER ENTITY

The Order is the central business entity.

Conceptual fields:

```text
id
orderNumber
customerId
serviceId
assignedWorkerId
status
paymentStatus
createdAt
updatedAt
acceptedAt
startedAt
completedAt
cancelledAt
```

Additional fields may exist depending on the current implementation.

---

# 16. ORDER PRICE SNAPSHOT

Every order must preserve immutable financial values.

Conceptual fields:

```text
workerAmount
adminCommission
platformFee
customerTotal
currency
```

These values must represent the agreed order price.

Example:

```text
Order #1001

workerAmount = 55
adminCommission = 25
platformFee = 20
customerTotal = 100
```

If the service later changes to:

```text
workerAmount = 70
```

Order #1001 must remain:

```text
workerAmount = 55
```

Historical order financial data must never be recalculated from the current service price.

---

# 17. ORDER STATUS

Order lifecycle:

```text
CREATED
↓
PAYMENT_PENDING
↓
PAID
↓
LIVE
↓
ACCEPTED
↓
IN_PROGRESS
↓
WORK_COMPLETED
↓
RECEIPT_SUBMITTED
↓
WAITING_FOR_CUSTOMER
↓
COMPLETED
```

Alternative/exception states:

```text
CANCELLED
REJECTED
DISPUTED
REFUND_PENDING
REFUNDED
```

Do not mix payment status with order status.

---

# 18. PAYMENT ENTITY

Payment represents customer payment.

Conceptual fields:

```text
id
orderId
customerId
provider
providerOrderId
providerPaymentId
amount
currency
status
signature/reference
paidAt
createdAt
updatedAt
```

Provider:

```text
RAZORPAY
```

Payment status:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUND_PENDING
REFUNDED
```

---

# 19. RAZORPAY PAYMENT RULES

Razorpay secrets must never be stored in frontend code.

Payment verification must happen server-side.

Store:

```text
razorpayOrderId
razorpayPaymentId
```

and relevant verified payment metadata.

Webhook processing must be idempotent.

If the same webhook arrives multiple times:

```text
Payment must be processed only once.
```

Use a unique provider event/payment identifier where appropriate.

---

# 20. PAYMENT → ORDER RULE

Only a verified successful payment can transition:

```text
PAYMENT_PENDING
↓
PAID
```

Then:

```text
PAID
↓
LIVE
```

Unpaid orders must never appear in worker available orders.

---

# 21. CUSTOMER PAYMENT VISIBILITY

Customer can access:

```text
their payment
their order
their payment status
their receipt
```

Admin can access:

```text
complete payment information
```

Worker must NOT receive:

```text
customerPaidAmount
adminCommission
platformFee
adminMargin
```

This restriction must happen at API/query level.

---

# 22. WORKER ASSIGNMENT

Order assignment must be atomic.

Fields may include:

```text
orderId
workerId
assignedAt
acceptedAt
assignedBy
assignmentType
```

Assignment type:

```text
AUTO
MANUAL
```

Only one active worker assignment can exist for an order.

---

# 23. WORKER ACCEPTANCE CONCURRENCY

When an order is LIVE:

```text
Worker A accepts
Worker B accepts
```

Only one transaction can succeed.

Use database transaction/locking/conditional update.

Example conceptual condition:

```text
UPDATE order
SET assignedWorkerId = workerA,
    status = ACCEPTED
WHERE id = orderId
AND status = LIVE
AND assignedWorkerId IS NULL
```

If zero rows are updated:

```text
Order was already accepted.
```

---

# 24. ORDER VISIBILITY

Available order queries should only return:

```text
paymentStatus = PAID
status = LIVE
eligible worker
```

Once assigned:

```text
status != LIVE
```

Therefore other workers stop seeing the order.

Realtime updates should then synchronize the UI.

---

# 25. CUSTOMER DOCUMENT ENTITY

Customer-required documents should be linked to the order.

Conceptual fields:

```text
id
orderId
customerId
documentType
storagePath
fileName
mimeType
status
uploadedAt
deletedAt
```

Possible status:

```text
UPLOADED
AVAILABLE
USED
RESTRICTED
DELETED
```

---

# 26. DOCUMENT ACCESS CONTROL

Customer can access their own documents.

Assigned worker can access only documents authorized for that order.

Admin can access documents according to admin permissions.

Other workers must not access them.

Documents should use:

```text
private storage
+
signed URL / authorized backend access
```

Never expose public storage URLs for sensitive customer documents.

---

# 27. RECEIPT ENTITY

Final service receipt/output should be linked to the order.

Conceptual fields:

```text
id
orderId
workerId
customerId
storagePath
fileName
status
submittedAt
viewedAt
downloadedAt
```

Receipt status:

```text
SUBMITTED
AVAILABLE
VIEWED
DOWNLOADED
```

---

# 28. RECEIPT EARNING TRIGGER

Worker earning must not be released merely because:

```text
worker clicked Complete
```

Instead the receipt/customer confirmation workflow controls earning release.

When the defined customer receipt condition is fulfilled:

```text
Pending Worker Earning
↓
Released Worker Earning
```

This operation must be idempotent.

Multiple downloads/views cannot create duplicate earnings.

---

# 29. WORKER EARNING ENTITY

Worker earning represents the amount actually belonging to the worker.

Conceptual fields:

```text
id
workerId
orderId
amount
currency
status
createdAt
releasedAt
holdAt
releasedFromHoldAt
```

Important:

```text
amount = workerAmount
```

NOT:

```text
customerPaidAmount
```

---

# 30. WORKER EARNING STATUS

Possible states:

```text
PENDING
AVAILABLE
ON_HOLD
RELEASED
ADJUSTED
```

Pending:

```text
Customer receipt condition not completed.
```

Available:

```text
Worker can potentially withdraw.
```

On Hold:

```text
Admin has temporarily blocked the earning.
```

Released:

```text
Earning has been credited into worker's usable earnings.
```

---

# 31. WORKER EARNING EXAMPLE

Order:

```text
Customer paid = ₹100
Worker amount = ₹55
Commission = ₹25
Platform fee = ₹20
```

Worker sees:

```text
Pending = ₹55
```

Customer downloads receipt:

```text
Pending = ₹0
Available = ₹55
Lifetime = ₹55
```

Worker must never see:

```text
₹100
₹25
₹20
```

---

# 32. FINANCIAL LEDGER

The financial ledger is the authoritative audit trail for money movements.

Conceptual fields:

```text
id
workerId
orderId
withdrawalId
refundId
type
amount
currency
status
reference
idempotencyKey
metadata
createdAt
```

Possible types:

```text
CUSTOMER_PAYMENT
WORKER_EARNING_PENDING
WORKER_EARNING_RELEASE
WORKER_EARNING_HOLD
WORKER_EARNING_HOLD_RELEASE
ADMIN_COMMISSION
PLATFORM_FEE
WITHDRAWAL_RESERVATION
WITHDRAWAL_COMPLETED
WITHDRAWAL_REVERSED
CUSTOMER_REFUND
REFUND_ADJUSTMENT
```

---

# 33. LEDGER IMMUTABILITY

Financial ledger records should be append-only wherever possible.

Do not silently overwrite historical transactions.

If an adjustment is required:

Create a new transaction:

```text
REFUND_ADJUSTMENT
```

instead of modifying the original earning transaction.

This preserves financial history.

---

# 34. ADMIN COMMISSION

Commission must be separately recorded.

Example:

```text
Customer Total = ₹100
Worker Amount = ₹55
Admin Commission = ₹25
Platform Fee = ₹20
```

Commission:

```text
₹25
```

belongs to Admin/Platform according to the configured business model.

---

# 35. PLATFORM FEE

Platform Fee is separate from Commission.

Example:

```text
Platform Fee = ₹20
```

Do not combine:

```text
Commission + Platform Fee
```

into:

```text
adminFee
```

unless a separate derived/reporting field is needed.

The source values must remain separate.

---

# 36. TOTAL PLATFORM REVENUE

Admin's:

```text
Total Platform Revenue
```

represents cumulative actual customer-paid amount according to the platform's revenue reporting definition.

Example:

```text
Order 1 = ₹100
Order 2 = ₹200
Order 3 = ₹150

Total Platform Revenue = ₹450
```

Only successfully paid customer orders should contribute.

Failed payments do not count.

---

# 37. PLATFORM COMMISSION REPORT

Admin Commission should be calculated from the financial ledger/order snapshot.

Example:

```text
Order 1:
Commission = ₹25

Order 2:
Commission = ₹40

Total Commission = ₹65
```

Do not calculate historical commission from current service pricing.

---

# 38. PLATFORM FEE REPORT

Platform Fee must have its own report/metric.

Example:

```text
Order 1 = ₹20
Order 2 = ₹30

Platform Fee = ₹50
```

---

# 39. WORKER EARNINGS REPORT

Worker earnings are based on:

```text
workerAmount
```

not:

```text
customerPaidAmount
```

Example:

```text
Order 1 worker amount = ₹55
Order 2 worker amount = ₹40
Order 3 worker amount = ₹75

Worker total earnings = ₹170
```

---

# 40. ADMIN TOP EARNING WORKERS

Top earning workers are determined from valid worker earnings.

Conceptually:

```text
SUM(workerEarning.amount)
GROUP BY workerId
ORDER BY totalEarned DESC
```

Only valid earned/released amounts should be included according to the platform's defined accounting rules.

Do not use customer payment totals.

---

# 41. COMPLAINT ENTITY

Customer complaints should be linked to orders.

Fields:

```text
id
orderId
customerId
workerId
reason
description
status
createdAt
resolvedAt
resolvedBy
resolution
```

Possible states:

```text
OPEN
UNDER_REVIEW
RESOLVED
REJECTED
```

---

# 42. EARNING HOLD

When Admin decides an earning must be held:

```text
Worker earning
↓
ON_HOLD
```

Hold record should preserve:

```text
earningId
orderId
workerId
amount
reason
createdBy
createdAt
releasedBy
releasedAt
releaseReason
```

---

# 43. HOLD RULE

Held earning:

```text
must NOT be withdrawable
```

It must not contribute to:

```text
Available Earnings
```

until released.

---

# 44. HOLD RELEASE

Admin release:

```text
ON_HOLD
↓
AVAILABLE
```

The release must generate a ledger entry.

Do not create a second earning.

The original earning and release transaction should remain traceable.

---

# 45. REFUND ENTITY

Refund represents money returned to the customer.

Conceptual fields:

```text
id
orderId
paymentId
customerId
amount
reason
status
requestedAt
approvedAt
processedAt
approvedBy
processedBy
providerRefundId
```

Refund status:

```text
REQUESTED
UNDER_REVIEW
APPROVED
PROCESSING
REFUNDED
REJECTED
FAILED
```

---

# 46. CUSTOMER REFUND RULE

Only Admin can approve/process refunds according to the current business workflow.

Customer complaint:

```text
Complaint
↓
Admin verification
↓
Admin decision
↓
Refund
```

---

# 47. TOTAL CUSTOMER REFUND

Admin dashboard:

```text
Total Customer Refund
```

must represent actual processed refunds.

Example:

```text
Refund 1 = ₹100
Refund 2 = ₹50
Refund 3 = ₹75

Total Customer Refund = ₹225
```

Do not count:

```text
refund requests
rejected refunds
failed refunds
```

as completed refunds.

---

# 48. REFUND IDEMPOTENCY

One refund must never be processed twice.

Use:

```text
providerRefundId
+
unique refund reference
+
database transaction
```

where applicable.

Duplicate refund webhook/event must not create duplicate refund records.

---

# 49. WITHDRAWAL ENTITY

Worker withdrawal request.

Fields:

```text
id
workerId
amount
currency
status
requestedAt
approvedAt
processedAt
completedAt
rejectedAt
paymentReference
adminNote
approvedBy
processedBy
```

---

# 50. WITHDRAWAL STATUS

```text
REQUESTED
↓
ADMIN_REVIEW
↓
APPROVED
↓
PAYMENT_PROCESSING
↓
COMPLETED
```

Failure:

```text
REJECTED
CANCELLED
FAILED
```

---

# 51. WITHDRAWAL BALANCE RULE

Worker cannot withdraw:

```text
amount > availableBalance
```

Backend must validate.

Frontend validation alone is not enough.

---

# 52. WITHDRAWAL RESERVATION

When a valid withdrawal is created:

```text
Available Balance
↓
Reserved
```

Example:

```text
Available = ₹500
Withdrawal Request = ₹200
```

After request:

```text
Available = ₹300
Reserved Withdrawal = ₹200
```

The ₹200 cannot be withdrawn again.

---

# 53. WITHDRAWAL REJECTION

If Admin rejects:

```text
Withdrawal = REJECTED
```

Then reserved amount returns to:

```text
Available Earnings
```

Ledger must record:

```text
WITHDRAWAL_REVERSED
```

---

# 54. WITHDRAWAL COMPLETION

Admin makes actual payment.

Admin marks:

```text
PAYMENT_DONE
```

Then:

```text
Withdrawal = COMPLETED
```

Worker sees the completed withdrawal.

Record:

```text
paymentReference
processedAt
processedBy
```

where applicable.

---

# 55. LIFETIME EARNINGS VS WITHDRAWALS

Lifetime earnings are NOT the same as available balance.

Example:

```text
Lifetime Earnings = ₹1000
Withdrawn = ₹600
Available = ₹400
```

Lifetime remains:

```text
₹1000
```

Do not subtract withdrawals from lifetime earnings.

---

# 56. TODAY EARNINGS

Today Earnings should come from worker earning/release timestamps.

Example:

```text
Order created yesterday
Receipt downloaded today
```

Today's earning:

```text
₹55
```

because the earning was released today.

---

# 57. PENDING EARNINGS

Pending earnings represent worker money that has been earned conditionally but has not yet been released.

Example:

```text
Worker amount = ₹55
Receipt not viewed/downloaded

Pending = ₹55
Available = ₹0
```

---

# 58. ON-HOLD EARNINGS

Example:

```text
Worker amount = ₹55
Admin places hold
```

Then:

```text
On Hold = ₹55
Available = ₹0
```

The amount becomes available only after Admin releases it.

---

# 59. AVAILABLE EARNINGS

Available earnings must represent money currently withdrawable.

It must exclude:

```text
Pending earnings
On-hold earnings
Reserved withdrawal amounts
```

Do not allow negative balances.

---

# 60. BALANCE CALCULATION

Do not blindly trust a cached dashboard number.

Conceptually:

```text
Available
=
Released Worker Earnings
-
Completed/Reserved Withdrawals
+
Valid Reversals
-
Valid Adjustments
-
Active Holds
```

Exact implementation must use the project's financial ledger architecture.

Prefer ledger-derived balances where practical.

---

# 61. NOTIFICATION ENTITY

Notifications should be persistent.

Fields:

```text
id
userId
type
title
message
entityType
entityId
isRead
createdAt
readAt
```

Examples:

```text
NEW_ORDER
ORDER_ACCEPTED
ORDER_COMPLETED
RECEIPT_AVAILABLE
EARNING_RELEASED
EARNING_ON_HOLD
EARNING_RELEASED_FROM_HOLD
WITHDRAWAL_REQUESTED
WITHDRAWAL_APPROVED
WITHDRAWAL_COMPLETED
WITHDRAWAL_REJECTED
REFUND_PROCESSED
```

---

# 62. REVIEW AND RATING

Review should be linked to:

```text
orderId
customerId
workerId
serviceId
```

Possible fields:

```text
rating
comment
createdAt
updatedAt
```

One completed order should normally allow one customer review unless the existing business rules specify otherwise.

---

# 63. AUDIT LOG

Every sensitive operation must create an audit record.

Fields:

```text
id
actorId
actorRole
action
entityType
entityId
oldValue/state
newValue/state
amount
reason
metadata
createdAt
```

Audit:

```text
payment verification
worker assignment
earning release
earning hold
hold release
refund
withdrawal approval
withdrawal rejection
withdrawal completion
price changes
commission changes
platform fee changes
worker status changes
```

---

# 64. FINANCIAL DATA ACCESS MATRIX

| Data                    |  Customer |                    Worker |            Admin |
| ----------------------- | --------: | ------------------------: | ---------------: |
| Own Payment             |       YES |                        NO |              YES |
| Customer Paid Amount    |       Own |                        NO |              YES |
| Worker Amount           | Own Order |               Own Earning |              YES |
| Commission              |        NO |                        NO |              YES |
| Platform Fee            |        NO |                        NO |              YES |
| Other Worker Earnings   |        NO |                        NO |              YES |
| Own Earnings            |        NO |                       YES |              YES |
| Own Withdrawal          |        NO |                       YES |              YES |
| Other Worker Withdrawal |        NO |                        NO |              YES |
| Refund                  | Own Order |            Limited status |              YES |
| Customer Documents      |       Own | Authorized assigned order |              YES |
| Audit Logs              |        NO |                        NO | Authorized Admin |

---

# 65. DATABASE CONSTRAINTS

Where possible enforce:

### Unique

```text
User.email
User.phone
Order.orderNumber
Payment.razorpayPaymentId
Payment.razorpayOrderId
Withdrawal.reference
Ledger.idempotencyKey
```

Actual uniqueness must be validated against current architecture.

---

# 66. INDEXING

Add indexes for frequent queries.

Important indexes:

```text
Order.customerId
Order.assignedWorkerId
Order.status
Order.paymentStatus
Order.createdAt

Payment.orderId
Payment.status
Payment.providerPaymentId

WorkerEarning.workerId
WorkerEarning.orderId
WorkerEarning.status
WorkerEarning.createdAt

Withdrawal.workerId
Withdrawal.status
Withdrawal.createdAt

Complaint.orderId
Complaint.status

Receipt.orderId

FinancialLedger.workerId
FinancialLedger.orderId
FinancialLedger.type
FinancialLedger.createdAt

Notification.userId
Notification.isRead
Notification.createdAt
```

Use composite indexes where actual query patterns justify them.

Do not blindly add indexes everywhere.

---

# 67. TRANSACTION BOUNDARIES

The following operations MUST be transactional:

### Worker Acceptance

```text
Check LIVE
+
Assign worker
+
Change status
+
Create assignment record
```

### Earning Release

```text
Verify receipt condition
+
Check not already released
+
Create ledger transaction
+
Update earning status
```

### Hold

```text
Verify earning
+
Create hold
+
Change earning state
+
Create ledger/audit
```

### Hold Release

```text
Verify held state
+
Release earning
+
Create ledger
+
Create audit
```

### Withdrawal

```text
Check available balance
+
Reserve amount
+
Create withdrawal
+
Create ledger
```

### Withdrawal Rejection

```text
Reject withdrawal
+
Return reservation
+
Create reversal ledger
```

### Refund

```text
Verify refundable state
+
Create refund
+
Update payment/order
+
Create financial transaction
```

---

# 68. IDEMPOTENCY KEYS

Critical operations should have idempotency protection.

Examples:

```text
payment:{razorpayPaymentId}
earning-release:{orderId}
withdrawal:{workerId}:{requestId}
refund:{paymentId}:{refundRequestId}
worker-accept:{orderId}
```

Do not use arbitrary random values if the same operation must be recognized after retries.

---

# 69. FINANCIAL INVARIANTS

The database/system must always preserve:

```text
workerAmount <= customerPaidAmount
```

where the business model requires the worker amount to be a component of customer total.

Also:

```text
customerPaidAmount
=
workerAmount
+
adminCommission
+
platformFee
```

for orders using this exact pricing model.

Additional invariants:

```text
worker cannot withdraw > available
```

```text
held earning cannot be withdrawn
```

```text
pending earning cannot be withdrawn
```

```text
lifetime earnings never decrease because of withdrawal
```

```text
one order cannot produce duplicate worker earning
```

```text
one payment cannot produce duplicate revenue
```

```text
one refund cannot be processed twice
```

```text
one withdrawal cannot be completed twice
```

```text
one order cannot have two active workers
```

---

# 70. REFUND AND EARNING ACCOUNTING

Do not simply delete earnings when a refund occurs.

Instead:

```text
Original transaction
+
Adjustment/reversal transaction
```

This creates a complete audit trail.

Example:

```text
Worker earning = ₹55
```

If later reversed:

```text
ORDER_EARNING = +₹55
REFUND_ADJUSTMENT = -₹55
```

Net effect:

```text
₹0
```

but historical transactions remain visible.

---

# 71. SERVICE PRICE IMMUTABILITY

Never calculate historical order data from:

```text
current Service.price
```

Always use:

```text
Order Service Snapshot
```

This protects against:

* Service price changes
* Commission changes
* Platform fee changes
* Worker changing service price
* Admin editing service

---

# 72. WORKER SERVICE PROPOSALS

If workers can propose services:

Conceptual entity:

```text
ServiceProposal
```

Fields:

```text
id
workerId
serviceName
description
requestedWorkerAmount
status
reviewedBy
reviewedAt
adminNotes
createdAt
```

Status:

```text
PENDING
APPROVED
REJECTED
```

Admin approval creates/activates the marketplace service according to the existing workflow.

---

# 73. ADMIN PRICE CONTROL

Admin can configure:

```text
workerAmount
adminCommission
platformFee
```

After an order is created/paid:

These values are snapshotted.

Changing the service later must NOT change historical orders.

---

# 74. DATA LIFECYCLE

Do not permanently delete financial records.

For sensitive entities use status/soft deletion where appropriate.

Especially preserve:

```text
Payments
Refunds
Worker Earnings
Financial Ledger
Withdrawals
Audit Logs
```

Customer documents may follow a separate deletion/retention policy.

---

# 75. DOCUMENT DELETION

After order completion and required retention period:

Worker access to customer documents should be removed according to security policy.

Do not destroy the customer's final output if the customer is entitled to it.

Maintain secure references where necessary.

---

# 76. REALTIME DATA

Realtime events may be generated for:

```text
ORDER_CREATED
PAYMENT_CONFIRMED
ORDER_LIVE
ORDER_ACCEPTED
ORDER_ASSIGNED
ORDER_COMPLETED
RECEIPT_SUBMITTED
RECEIPT_VIEWED
RECEIPT_DOWNLOADED
EARNING_RELEASED
EARNING_HELD
EARNING_RELEASED_FROM_HOLD
WITHDRAWAL_CREATED
WITHDRAWAL_COMPLETED
REFUND_PROCESSED
```

Realtime is for synchronization.

It is NOT the source of truth.

Database remains authoritative.

---

# 77. CACHE / LOCAL STORAGE RULE

Do not store authoritative financial balances only in:

```text
localStorage
IndexedDB
React state
```

These may be used as cache/UI state.

After important financial operations:

```text
Backend transaction
↓
Database
↓
API/realtime
↓
Frontend refresh
```

---

# 78. DATABASE MIGRATION RULES

Before migration:

1. Inspect current schema.
2. Check existing production-like data.
3. Identify dependencies.
4. Create safe migration.
5. Do not drop important columns blindly.
6. Preserve historical financial data.
7. Backfill carefully.
8. Validate after migration.

Never delete existing legitimate financial data merely to simplify the schema.

---

# 79. TEST DATA

Fake/test orders must not be mixed with real production data.

If test data exists:

```text
environment = TEST
```

or use a separate test database/environment.

Before production:

Remove:

* fake orders
* fake payments
* fake earnings
* fake withdrawals
* fake refunds

without deleting legitimate data.

---

# 80. DATABASE TEST SCENARIOS

Test at database level:

### Payment

```text
Payment success
Payment duplicate
Payment failure
Payment refund
```

### Worker assignment

```text
One worker accepts
Two workers accept simultaneously
```

### Earnings

```text
Pending
Release
Hold
Hold release
Duplicate release
```

### Withdrawal

```text
Valid withdrawal
Insufficient balance
Two simultaneous withdrawals
Rejection
Completion
Duplicate completion
```

### Refund

```text
Valid refund
Duplicate refund
Refund after earning
Refund before earning
```

---

# 81. EXAMPLE COMPLETE ORDER RECORD

Example:

```text
Order ID:
ORD-10001

Customer:
Customer A

Service:
PAN Assistance

Worker:
Worker A

Financial Snapshot:

workerAmount = ₹55
adminCommission = ₹25
platformFee = ₹20
customerPaidAmount = ₹100
currency = INR
```

Payment:

```text
status = PAID
provider = RAZORPAY
```

Worker earning:

```text
amount = ₹55
status = PENDING
```

After customer downloads receipt:

```text
earning status = AVAILABLE/RELEASED
```

Worker withdrawal:

```text
requested = ₹30
```

Available:

```text
₹25
```

Lifetime:

```text
₹55
```

Lifetime remains ₹55 even after withdrawal.

---

# 82. ADMIN DASHBOARD EXAMPLE

Suppose:

```text
Customer payments:

Order 1 = ₹100
Order 2 = ₹200
Order 3 = ₹150
```

Then:

```text
Total Platform Revenue = ₹450
```

Suppose:

```text
Worker amounts:

₹55
₹100
₹70
```

Then:

```text
Worker Earnings = ₹225
```

Commission and platform fee are separately derived from their respective order snapshots/ledger entries.

If customer refunds:

```text
Refund = ₹100
```

Then:

```text
Total Customer Refund = ₹100
```

Top earning workers must be calculated from their worker earnings.

---

# 83. DATA CONSISTENCY CHECKS

Create backend/admin diagnostic functionality where practical to detect:

```text
Payment exists without Order
Order marked PAID without verified Payment
Worker earning without valid Order
Worker earning greater than workerAmount
Withdrawal greater than available
Negative available balance
Refund greater than refundable amount
Duplicate earning
Duplicate refund
Duplicate withdrawal completion
Order with multiple active workers
Missing price snapshot
Missing financial ledger entry
```

These should be detectable before production.

---

# 84. DATABASE SOURCE OF TRUTH HIERARCHY

Use:

```text
DATABASE
↓
BACKEND SERVICE
↓
API
↓
REALTIME
↓
FRONTEND STATE
↓
UI
```

Never:

```text
UI
↓
Database
```

for trusted financial values.

---

# 85. IMPLEMENTATION RULE FOR AI AGENTS

Any AI/developer working on this project must:

1. Read this file first.
2. Inspect existing schema.
3. Compare existing implementation with this context.
4. Identify differences.
5. Preserve working components.
6. Implement missing components.
7. Avoid duplicate tables/models.
8. Avoid destructive migrations.
9. Use transactions for financial operations.
10. Test all state transitions.
11. Test authorization.
12. Test concurrency.
13. Test idempotency.
14. Test realtime synchronization.
15. Verify actual database state.

Do not implement assumptions that contradict this document.

---

# 86. FINAL DATABASE INTEGRITY REQUIREMENT

The database must support this complete lifecycle:

```text
CUSTOMER
↓
SELECT SERVICE
↓
CREATE ORDER
↓
PRICE SNAPSHOT
↓
RAZORPAY PAYMENT
↓
PAYMENT VERIFIED
↓
ORDER PAID
↓
ORDER LIVE
↓
WORKER SEES ORDER
↓
ONE WORKER ACCEPTS
↓
OTHER WORKERS LOSE ORDER
↓
WORKER RECEIVES AUTHORIZED DOCUMENTS
↓
WORKER COMPLETES SERVICE
↓
WORKER UPLOADS RECEIPT
↓
CUSTOMER VIEWS/DOWNLOADS RECEIPT
↓
WORKER EARNING RELEASED
↓
WORKER AVAILABLE BALANCE
↓
CUSTOMER COMPLAINT (IF ANY)
↓
ADMIN HOLD
↓
ADMIN RELEASE
↓
WORKER WITHDRAWAL
↓
ADMIN REVIEW
↓
ADMIN PAYMENT
↓
WITHDRAWAL COMPLETED
```

Parallel financial reporting:

```text
CUSTOMER PAYMENTS
        ↓
TOTAL PLATFORM REVENUE
        ↓
├── WORKER AMOUNT
├── ADMIN COMMISSION
└── PLATFORM FEE

CUSTOMER REFUNDS
        ↓
TOTAL CUSTOMER REFUND

WORKER EARNINGS
        ↓
TOP EARNING WORKERS
```

Every transition must be:

```text
AUTHORIZED
+
TRANSACTIONAL
+
IDEMPOTENT
+
AUDITABLE
+
CONSISTENT
```

---

# 87. FINAL MANDATE

This database context is not merely documentation.

It is a **business-rule contract**.

Before changing the database or financial workflow, the developer/AI agent must verify:

```text
Does this change preserve customer payment integrity?
Does this change preserve worker earning integrity?
Does this change preserve commission?
Does this change preserve platform fee?
Does this change preserve refund accounting?
Does this change preserve withdrawal accounting?
Does this change preserve historical records?
Does this change preserve RBAC?
Does this change preserve document security?
Does this change preserve concurrency safety?
Does this change preserve idempotency?
Does this change preserve auditability?
```

If the answer is NO, the implementation is not complete.

**Never prioritize UI convenience over database integrity.**

**Never prioritize a quick implementation over financial correctness.**

**Never expose financial information through an API merely because the UI hides it.**

**Never modify historical financial records when an immutable adjustment transaction can preserve the audit trail.**

The final database must support a secure, transactional, auditable, multi-role Cyber Cafe Marketplace with correct customer payments, worker earnings, commission, platform fees, refunds, holds, withdrawals, and financial reporting.

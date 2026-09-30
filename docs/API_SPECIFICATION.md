# API_SPECIFICATION.md

# Cyber Cafe Marketplace

## Authoritative API Contract, Security, Workflow & Financial API Specification

---

# 1. DOCUMENT PURPOSE

This document defines the authoritative API contract for the Cyber Cafe Marketplace.

It specifies:

* API architecture
* Authentication
* Authorization
* RBAC
* Request validation
* Response standards
* Error handling
* Customer APIs
* Worker APIs
* Admin APIs
* Service APIs
* Order APIs
* Payment APIs
* Razorpay integration
* Webhooks
* Document APIs
* Receipt APIs
* Review APIs
* Complaint APIs
* Worker earning APIs
* Financial ledger APIs
* Withdrawal APIs
* Refund APIs
* Notification APIs
* Realtime events
* Idempotency
* Concurrency protection
* Rate limiting
* Audit logging
* Financial data isolation
* Security requirements

This document must be treated as the **API contract** between frontend, backend, database and external payment systems.

---

# 2. API ARCHITECTURE

Expected architecture:

```text
Customer Portal
       │
Worker Portal
       │
Admin Panel
       │
       ▼
   API Layer
       │
       ▼
Backend Services
       │
       ├── Authentication
       ├── Order Service
       ├── Payment Service
       ├── Worker Service
       ├── Earning Service
       ├── Withdrawal Service
       ├── Refund Service
       ├── Document Service
       ├── Notification Service
       └── Audit Service
       │
       ▼
PostgreSQL / Supabase
```

External payment:

```text
Backend
   ↓
Razorpay
   ↓
Webhook
   ↓
Backend
   ↓
Database
```

Frontend must NEVER directly control financial state.

---

# 3. BASE API PATH

Use a versioned API:

```text
/api/v1
```

Example:

```text
/api/v1/orders
/api/v1/payments
/api/v1/workers
/api/v1/admin/orders
```

Do not mix versioned and unversioned APIs without a deliberate compatibility reason.

---

# 4. AUTHENTICATION

All protected endpoints require authentication.

Example:

```http
Authorization: Bearer <access_token>
```

Authentication should be handled using the existing authentication architecture.

Never trust:

```text
userId
role
workerId
adminId
```

sent by the client.

These must come from the authenticated server-side identity/session.

---

# 5. AUTHORIZATION

Every protected endpoint must enforce RBAC.

Roles:

```text
CUSTOMER
WORKER
ADMIN
```

Example:

```text
Customer → own orders only
Worker → assigned/authorized worker resources only
Admin → authorized administrative resources
```

A worker must never access another worker's:

* earnings
* withdrawals
* orders
* financial information
* private documents

---

# 6. API RESPONSE STANDARD

Use a consistent response structure.

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

Do not leak:

* stack traces
* database errors
* SQL errors
* secrets
* payment secrets
* internal implementation details

in production responses.

---

# 7. HTTP STATUS CODES

Use standard HTTP semantics.

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
```

Financial conflicts should normally use:

```text
409 Conflict
```

where appropriate.

---

# 8. VALIDATION

Every API endpoint must validate:

* authentication
* authorization
* body
* query parameters
* route parameters
* data types
* amount
* currency
* order ownership
* worker ownership
* status transition
* required fields

Never rely only on frontend validation.

---

# 9. MONEY INPUT RULE

All money-related values must be validated server-side.

Do not trust:

```json
{
  "amount": 100
}
```

from the frontend without verifying the amount against the database.

Especially never trust client-provided:

```text
customerTotal
workerAmount
commission
platformFee
withdrawalAvailableBalance
refundAmount
```

The backend must calculate/verify these.

---

# 10. FINANCIAL DATA ISOLATION

## CUSTOMER

Can receive:

```text
customerPaidAmount
own payment status
own refund status
```

## ADMIN

Can receive:

```text
customerPaidAmount
workerAmount
adminCommission
platformFee
refund
worker earning
withdrawal
complete financial breakdown
```

## WORKER

Can receive ONLY:

```text
workerAmount
worker earning status
worker balance
worker withdrawal
```

Worker API responses must NEVER contain:

```text
customerPaidAmount
adminCommission
platformFee
adminMargin
```

Do not fetch these fields and hide them in the frontend.

Do not serialize unauthorized financial columns.

---

# 11. CUSTOMER AUTH APIs

## POST /api/v1/auth/register

Create customer account.

Request:

```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "9876543210",
  "password": "********"
}
```

Server must:

* validate input
* prevent duplicate account
* hash/store credentials securely
* create user
* assign CUSTOMER role

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USER_ID",
      "name": "Customer Name",
      "role": "CUSTOMER"
    }
  }
}
```

---

# 12. GET CURRENT USER

## GET /api/v1/auth/me

Returns authenticated user's safe profile.

Never expose sensitive fields unnecessarily.

---

# 13. CUSTOMER SERVICE APIs

## GET /api/v1/services

Returns active services.

Customer-facing response may contain:

```text
serviceId
name
description
category
customerPrice
requiredDocuments
estimatedTime
```

Do not expose internal financial breakdown unless intentionally required.

---

## GET /api/v1/services/:serviceId

Returns service details.

Verify service is:

```text
ACTIVE
```

---

# 14. CUSTOMER ORDER CREATION

## POST /api/v1/orders

Creates a customer order.

Request should contain only customer-controlled information.

Example:

```json
{
  "serviceId": "SERVICE_ID",
  "details": {},
  "documentIds": []
}
```

Do NOT accept trusted financial values:

```text
customerTotal
workerAmount
commission
platformFee
```

Backend obtains pricing from the authoritative service configuration.

Backend creates immutable order price snapshot.

Response:

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ORDER_ID",
      "orderNumber": "ORD-10001",
      "status": "PAYMENT_PENDING",
      "paymentStatus": "PENDING",
      "amount": 100,
      "currency": "INR"
    }
  }
}
```

Customer can see their own final amount.

---

# 15. ORDER PRICE SNAPSHOT

When creating an order:

```text
Service Current Price
       ↓
Backend
       ↓
Order Snapshot
```

Store:

```text
workerAmount
adminCommission
platformFee
customerTotal
currency
```

These values must not change after payment/order finalization.

---

# 16. CREATE RAZORPAY ORDER

## POST /api/v1/payments/razorpay/order

Authentication:

```text
CUSTOMER
```

Request:

```json
{
  "orderId": "ORDER_ID"
}
```

Backend must:

1. Verify order belongs to customer.
2. Verify order is payable.
3. Verify current payment status.
4. Read immutable customerTotal from order.
5. Create Razorpay order.
6. Store Razorpay order ID.
7. Return safe checkout information.

Never accept:

```json
{
  "amount": 100
}
```

as authoritative.

Backend calculates the amount.

Response:

```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_xxxxx",
    "keyId": "rzp_xxxxx",
    "amount": 10000,
    "currency": "INR"
  }
}
```

`keyId` may be public.

`keySecret` must NEVER be returned.

---

# 17. VERIFY RAZORPAY PAYMENT

## POST /api/v1/payments/razorpay/verify

Request:

```json
{
  "orderId": "ORDER_ID",
  "razorpayOrderId": "order_xxxxx",
  "razorpayPaymentId": "pay_xxxxx",
  "razorpaySignature": "signature"
}
```

Backend:

1. Authenticate customer.
2. Verify order ownership.
3. Verify Razorpay signature.
4. Verify Razorpay order.
5. Verify payment amount/currency where applicable.
6. Check duplicate payment.
7. Update payment transactionally.
8. Mark payment PAID.
9. Mark order PAID.
10. Make order LIVE.
11. Trigger realtime event.
12. Create audit record.

Must be idempotent.

Repeated verification must NOT create duplicate financial records.

---

# 18. RAZORPAY WEBHOOK

## POST /api/v1/webhooks/razorpay

This endpoint is NOT authenticated using normal user JWT.

It must validate Razorpay webhook signature.

Process relevant events according to the current Razorpay integration.

Possible events include payment/refund-related events supported by the configured integration.

Webhook processing must be:

```text
signature verified
+
event validated
+
idempotency checked
+
database transaction
```

Never trust webhook body without signature verification.

---

# 19. PAYMENT FAILURE

If payment fails:

```text
Payment = FAILED
Order remains unpaid
```

The order must NOT become:

```text
LIVE
```

Customer should be able to retry payment when allowed.

---

# 20. PAYMENT DUPLICATION

If the same payment callback arrives twice:

First request:

```text
PROCESS
```

Second request:

```text
RETURN ALREADY_PROCESSED
```

Do not:

* create second payment
* create second revenue
* create second order
* create second earning

---

# 21. CUSTOMER ORDER LIST

## GET /api/v1/orders

Customer receives only their own orders.

Support filters:

```text
status
paymentStatus
date
service
```

Never allow arbitrary `customerId` to bypass ownership.

---

# 22. CUSTOMER ORDER DETAILS

## GET /api/v1/orders/:orderId

Verify:

```text
order.customerId === authenticatedUser.id
```

Return customer-authorized information.

---

# 23. CUSTOMER DOCUMENT UPLOAD

## POST /api/v1/orders/:orderId/documents

Verify:

* authenticated customer
* order ownership
* order allows document upload
* document type is allowed

Upload securely to private storage.

Store metadata in database.

Never accept arbitrary storage paths from frontend as trusted authorization.

---

# 24. CUSTOMER RECEIPT ACCESS

## GET /api/v1/orders/:orderId/receipt

Customer must own the order.

Return authorized receipt access.

When the business rule considers the receipt viewed:

Record:

```text
receiptViewedAt
```

---

# 25. CUSTOMER RECEIPT DOWNLOAD

## POST /api/v1/orders/:orderId/receipt/download

Verify:

* order ownership
* receipt exists
* receipt is available

Record:

```text
receiptDownloadedAt
```

Then trigger the worker earning release workflow where the defined business rule is satisfied.

This must be transactional/idempotent.

Multiple downloads must NOT create multiple earnings.

---

# 26. CUSTOMER REVIEW

## POST /api/v1/orders/:orderId/review

Customer can review only eligible completed orders.

Request:

```json
{
  "rating": 5,
  "comment": "Good service"
}
```

Backend verifies:

* customer owns order
* order completed
* review not already submitted

---

# 27. CUSTOMER COMPLAINT

## POST /api/v1/orders/:orderId/complaints

Customer can submit complaint for eligible orders.

Request:

```json
{
  "reason": "SERVICE_ISSUE",
  "description": "..."
}
```

Backend creates complaint.

Potential event:

```text
COMPLAINT_CREATED
```

Admin is notified.

---

# 28. WORKER AVAILABLE ORDERS

## GET /api/v1/worker/orders/available

Authentication:

```text
WORKER
```

Return only orders satisfying:

```text
paymentStatus = PAID
status = LIVE
worker is eligible
```

Do NOT return:

```text
customerPaidAmount
adminCommission
platformFee
```

Worker may receive:

```text
workerEarningAmount
service
required documents metadata
order deadline
customer-safe information
```

---

# 29. WORKER ACCEPT ORDER

## POST /api/v1/worker/orders/:orderId/accept

Authentication:

```text
WORKER
```

Backend transaction:

```text
verify worker
+
verify worker eligibility
+
verify order LIVE
+
lock/conditional update
+
assign worker
+
change order status
+
create assignment
+
emit realtime event
```

If another worker already accepted:

```text
409 ORDER_ALREADY_ACCEPTED
```

Never return success to both workers.

---

# 30. WORKER ACTIVE ORDERS

## GET /api/v1/worker/orders/active

Return only orders assigned to authenticated worker.

Never accept arbitrary `workerId`.

---

# 31. WORKER ORDER DETAILS

## GET /api/v1/worker/orders/:orderId

Verify:

```text
order.assignedWorkerId === authenticatedUser.workerId
```

Return only worker-authorized information.

Financial response must contain worker amount only.

---

# 32. WORKER CUSTOMER DOCUMENTS

## GET /api/v1/worker/orders/:orderId/documents

Verify:

* worker assigned to order
* document belongs to order
* worker has authorization

Return secure temporary/signed access where applicable.

---

# 33. WORKER START ORDER

## POST /api/v1/worker/orders/:orderId/start

Verify:

```text
worker owns assignment
order = ACCEPTED
```

Transition:

```text
ACCEPTED
→ IN_PROGRESS
```

---

# 34. WORKER COMPLETE ORDER

## POST /api/v1/worker/orders/:orderId/complete

This does NOT immediately release worker earnings.

Transition:

```text
IN_PROGRESS
→ WORK_COMPLETED
```

Required:

* final work
* required receipt/output

If receipt must be uploaded separately, keep status:

```text
RECEIPT_SUBMITTED
```

---

# 35. WORKER RECEIPT UPLOAD

## POST /api/v1/worker/orders/:orderId/receipt

Verify worker assignment.

Upload final receipt securely.

Store:

```text
receipt
submittedAt
workerId
orderId
```

Transition:

```text
WORK_COMPLETED
→ RECEIPT_SUBMITTED
→ WAITING_FOR_CUSTOMER
```

Worker earning remains pending.

---

# 36. WORKER EARNING RELEASE

This should be implemented as an internal service operation and must not be freely callable by the worker.

Conceptual internal action:

```text
releaseWorkerEarning(orderId)
```

Requirements:

1. Verify receipt condition.
2. Verify earning has not already been released.
3. Read immutable workerAmount.
4. Create earning transaction.
5. Update earning status.
6. Update ledger.
7. Update dashboard aggregates if applicable.
8. Emit realtime event.
9. Create audit record.

All in one safe transaction.

---

# 37. WORKER EARNINGS SUMMARY

## GET /api/v1/worker/earnings/summary

Return only authenticated worker's data:

```json
{
  "todayEarnings": 100,
  "pendingEarnings": 55,
  "onHoldEarnings": 20,
  "availableEarnings": 300,
  "lifetimeEarnings": 1200
}
```

Never return customer financial data.

---

# 38. WORKER EARNING HISTORY

## GET /api/v1/worker/earnings

Filters:

```text
status
dateFrom
dateTo
orderId
```

Return:

```text
order
workerAmount
status
earnedAt
releasedAt
```

Do not expose:

```text
customerPaidAmount
commission
platformFee
```

---

# 39. WORKER WITHDRAWAL REQUEST

## POST /api/v1/worker/withdrawals

Request:

```json
{
  "amount": 200
}
```

Backend must:

1. Authenticate worker.
2. Validate amount.
3. Calculate actual available balance.
4. Reject if insufficient.
5. Create withdrawal.
6. Reserve amount.
7. Create ledger transaction.
8. Create audit record.

All within one transaction.

---

# 40. INSUFFICIENT WITHDRAWAL

If:

```text
requestedAmount > availableAmount
```

return:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_AMOUNT",
    "message": "Insufficient available earnings"
  }
}
```

HTTP:

```text
409 Conflict
```

Do not create a withdrawal record.

---

# 41. WITHDRAWAL LIST

## GET /api/v1/worker/withdrawals

Return only authenticated worker's withdrawals.

Include:

```text
id
amount
status
requestedAt
approvedAt
completedAt
paymentReference
adminNote
```

---

# 42. WITHDRAWAL DETAILS

## GET /api/v1/worker/withdrawals/:withdrawalId

Verify ownership.

Never allow a worker to query another worker's withdrawal by changing the ID.

---

# 43. ADMIN ORDER LIST

## GET /api/v1/admin/orders

Admin can filter:

```text
status
paymentStatus
worker
customer
service
date
complaint
refund
earningStatus
```

Admin can receive complete financial breakdown.

---

# 44. ADMIN ORDER DETAILS

## GET /api/v1/admin/orders/:orderId

Return:

```text
Customer
Worker
Service
Order status
Payment
Customer paid amount
Worker amount
Admin commission
Platform fee
Receipt
Complaint
Refund
Worker earning
Withdrawal relation
Audit history
```

This is an admin-only endpoint.

---

# 45. ADMIN WORKER ASSIGNMENT

## POST /api/v1/admin/orders/:orderId/assign-worker

Request:

```json
{
  "workerId": "WORKER_ID"
}
```

Backend verifies:

* Admin authorization
* Worker exists
* Worker active
* Worker eligible
* Order assignable

Create audit record.

---

# 46. ADMIN REASSIGN WORKER

## POST /api/v1/admin/orders/:orderId/reassign-worker

Only when business rules permit.

Must preserve:

* previous assignment history
* new assignment
* timestamps
* admin identity

Never silently overwrite assignment history.

---

# 47. ADMIN RECEIPT VERIFICATION

## POST /api/v1/admin/orders/:orderId/verify-receipt

Admin can inspect/verify receipt.

Possible result:

```text
APPROVED
REJECTED
```

Do not release worker earning twice.

---

# 48. ADMIN EARNING HOLD

## POST /api/v1/admin/orders/:orderId/earning/hold

Request:

```json
{
  "reason": "Customer complaint under investigation"
}
```

Backend:

* verify admin
* verify earning exists
* verify earning is holdable
* create hold
* update earning
* create ledger
* audit
* notify worker

---

# 49. ADMIN RELEASE EARNING

## POST /api/v1/admin/orders/:orderId/earning/release

Backend:

* verify admin
* verify earning is ON_HOLD
* release exactly once
* create ledger
* audit
* notify worker

Duplicate release:

```text
409 EARNING_ALREADY_RELEASED
```

---

# 50. ADMIN WITHDRAWAL LIST

## GET /api/v1/admin/withdrawals

Admin can filter:

```text
worker
status
date
amount
```

Return complete withdrawal information authorized for admin.

---

# 51. ADMIN APPROVE WITHDRAWAL

## POST /api/v1/admin/withdrawals/:withdrawalId/approve

Transition:

```text
REQUESTED
→ APPROVED
```

Verify withdrawal has not already been processed.

---

# 52. ADMIN REJECT WITHDRAWAL

## POST /api/v1/admin/withdrawals/:withdrawalId/reject

Request:

```json
{
  "reason": "Invalid bank information"
}
```

Transaction:

```text
withdrawal rejected
+
reservation returned
+
ledger reversal
+
audit
```

Worker available balance must increase back by the reserved amount.

---

# 53. ADMIN MARK WITHDRAWAL PAYMENT DONE

## POST /api/v1/admin/withdrawals/:withdrawalId/complete

Request:

```json
{
  "paymentReference": "BANK_TXN_123",
  "note": "Payment completed"
}
```

Transition:

```text
PAYMENT_PROCESSING
→ COMPLETED
```

Must be idempotent.

Duplicate completion must not deduct money twice.

---

# 54. ADMIN REFUND REQUEST/PROCESS

## POST /api/v1/admin/orders/:orderId/refund

Request:

```json
{
  "amount": 100,
  "reason": "Verified service issue"
}
```

Backend must verify:

* order
* payment
* refundable amount
* previous refunds
* admin authorization

Never trust the frontend refund amount without server-side calculation/limits.

---

# 55. REFUND IDEMPOTENCY

One payment cannot be refunded beyond its refundable amount.

Prevent:

```text
₹100 payment
+
₹100 refund
+
₹100 second refund
```

unless another legitimate payment exists.

---

# 56. ADMIN FINANCIAL DASHBOARD

## GET /api/v1/admin/finance/summary

Return:

```json
{
  "totalPlatformRevenue": 0,
  "platformCommission": 0,
  "platformFee": 0,
  "workerEarnings": 0,
  "totalCustomerRefund": 0,
  "pendingWorkerEarnings": 0,
  "onHoldEarnings": 0,
  "pendingWithdrawals": 0,
  "completedWithdrawals": 0
}
```

All values must come from authoritative database/ledger data.

No hardcoded/fake values.

---

# 57. TOP EARNING WORKERS API

## GET /api/v1/admin/finance/top-workers

Return workers ordered by valid worker earnings.

Example:

```json
{
  "workers": [
    {
      "workerId": "W1",
      "workerName": "Worker A",
      "totalEarnings": 5000
    }
  ]
}
```

`totalEarnings` means worker earnings.

NOT customer revenue.

---

# 58. ADMIN FINANCIAL ORDER BREAKDOWN

## GET /api/v1/admin/finance/orders/:orderId

Return:

```text
customerPaidAmount
workerAmount
adminCommission
platformFee
paymentStatus
refundStatus
workerEarningStatus
```

This endpoint must be ADMIN-only.

---

# 59. ADMIN COMMISSION REPORT

## GET /api/v1/admin/finance/commission

Filters:

```text
dateFrom
dateTo
service
worker
```

Return commission totals from immutable order/ledger data.

---

# 60. ADMIN PLATFORM FEE REPORT

## GET /api/v1/admin/finance/platform-fee

Keep this separate from commission.

Return:

```text
totalPlatformFee
order breakdown
date breakdown
```

---

# 61. ADMIN REFUND REPORT

## GET /api/v1/admin/finance/refunds

Return:

```text
totalRefunded
refundCount
refund records
```

Only actual processed refunds count toward completed refund totals.

---

# 62. ADMIN AUDIT LOG API

## GET /api/v1/admin/audit-logs

Admin-only.

Filters:

```text
actor
action
entity
date
order
worker
```

Do not allow ordinary workers/customers to access audit logs.

---

# 63. NOTIFICATION API

## GET /api/v1/notifications

Return authenticated user's notifications.

---

## POST /api/v1/notifications/:notificationId/read

Mark notification read.

Verify notification belongs to authenticated user.

---

# 64. REALTIME EVENTS

Realtime is supplementary to REST/API state.

Important events:

```text
ORDER_CREATED
PAYMENT_CONFIRMED
ORDER_LIVE
ORDER_ACCEPTED
ORDER_ASSIGNED
ORDER_STARTED
ORDER_COMPLETED
RECEIPT_SUBMITTED
RECEIPT_VIEWED
RECEIPT_DOWNLOADED
EARNING_RELEASED
EARNING_HELD
EARNING_RELEASED_FROM_HOLD
WITHDRAWAL_CREATED
WITHDRAWAL_APPROVED
WITHDRAWAL_REJECTED
WITHDRAWAL_COMPLETED
REFUND_PROCESSED
```

Frontend should update from these events but should be able to recover state through API/database after reconnect.

---

# 65. REALTIME SECURITY

Never broadcast sensitive financial information to unauthorized users.

Example:

Worker realtime event may contain:

```json
{
  "orderId": "ORD123",
  "status": "ACCEPTED"
}
```

Do NOT broadcast:

```json
{
  "customerPaidAmount": 100,
  "adminCommission": 25,
  "platformFee": 20
}
```

to worker channels.

Use role/user/order authorization for realtime subscriptions.

---

# 66. ERROR CODES

Use standardized application error codes.

Examples:

```text
AUTH_REQUIRED
FORBIDDEN
INVALID_INPUT
RESOURCE_NOT_FOUND

ORDER_NOT_FOUND
ORDER_NOT_PAYABLE
ORDER_ALREADY_ACCEPTED
ORDER_NOT_AVAILABLE
ORDER_NOT_ASSIGNABLE

PAYMENT_NOT_FOUND
PAYMENT_ALREADY_PROCESSED
PAYMENT_VERIFICATION_FAILED
PAYMENT_FAILED

DOCUMENT_ACCESS_DENIED
RECEIPT_NOT_FOUND
RECEIPT_NOT_AVAILABLE

EARNING_NOT_FOUND
EARNING_ALREADY_RELEASED
EARNING_ALREADY_ON_HOLD
EARNING_NOT_HOLDABLE

INSUFFICIENT_AMOUNT
WITHDRAWAL_NOT_FOUND
WITHDRAWAL_ALREADY_COMPLETED
WITHDRAWAL_ALREADY_REJECTED

REFUND_NOT_ALLOWED
REFUND_ALREADY_PROCESSED
REFUND_AMOUNT_EXCEEDED

VALIDATION_ERROR
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

---

# 67. IDEMPOTENCY

Money-changing endpoints must support idempotency where appropriate.

Potential header:

```http
Idempotency-Key: unique-operation-key
```

Important operations:

```text
Payment verification
Webhook processing
Worker acceptance
Earning release
Earning hold
Earning release from hold
Withdrawal creation
Withdrawal completion
Refund
```

Repeated requests with the same idempotency key must not duplicate financial effects.

---

# 68. CONCURRENCY PROTECTION

The following endpoints require transaction/conditional update protection:

```text
POST /worker/orders/:id/accept
POST /worker/withdrawals
POST /admin/orders/:id/earning/release
POST /admin/orders/:id/earning/hold
POST /admin/orders/:id/refund
POST /admin/withdrawals/:id/complete
```

Never rely on:

```text
GET balance
+
frontend calculation
+
POST update
```

for financial operations.

Use backend transaction.

---

# 69. WITHDRAWAL CONCURRENCY EXAMPLE

Available:

```text
₹100
```

Two requests:

```text
Request A = ₹80
Request B = ₹80
```

Only one can succeed.

The other must receive:

```text
INSUFFICIENT_AMOUNT
```

or an appropriate conflict.

Final balance must never be:

```text
-₹60
```

---

# 70. WORKER ACCEPTANCE CONCURRENCY EXAMPLE

Order:

```text
LIVE
```

Worker A and B simultaneously call:

```text
POST /worker/orders/ORDER123/accept
```

Expected:

```text
Worker A → 200 Success
Worker B → 409 ORDER_ALREADY_ACCEPTED
```

Only one assignment exists.

---

# 71. PAYMENT CONCURRENCY

If frontend retries payment verification:

First:

```text
SUCCESS
```

Second:

```text
ALREADY_PROCESSED
```

The second request must not:

* add revenue again
* create another payment
* make another worker earning
* duplicate ledger transaction

---

# 72. API SECURITY

Protect against:

* IDOR
* privilege escalation
* price tampering
* workerId tampering
* orderId tampering
* payment amount tampering
* refund amount tampering
* withdrawal balance manipulation
* unauthorized document access
* JWT abuse
* replay attacks
* duplicate requests
* race conditions
* mass assignment
* sensitive field exposure

Never allow:

```json
{
  "role": "ADMIN"
}
```

from a public registration request to create an Admin.

---

# 73. MASS ASSIGNMENT PROTECTION

Do not directly spread request bodies into database updates.

Wrong:

```text
updateUser(req.body)
```

Correct:

Explicitly select allowed fields.

Especially protect:

```text
role
status
workerAmount
commission
platformFee
paymentStatus
earningStatus
availableBalance
lifetimeEarnings
refundStatus
withdrawalStatus
```

---

# 74. RATE LIMITING

Rate-limit:

* Login
* OTP
* Payment creation
* Payment verification
* Complaint creation
* Withdrawal creation
* Refund operations
* Sensitive admin operations

Do not make financial endpoints unlimited.

---

# 75. FILE UPLOAD SECURITY

Document/receipt upload APIs must validate:

* file type
* file size
* extension
* MIME type
* authorization
* order ownership/assignment
* storage destination

Do not trust filename or MIME type from client alone.

---

# 76. API LOGGING

Log important API operations without logging secrets.

Never log:

```text
Razorpay secret
JWT
password
OTP
bank credentials
private document contents
```

Log:

```text
requestId
userId
role
endpoint
status
duration
entityId
errorCode
```

For financial operations also preserve audit records.

---

# 77. API TRANSACTION PATTERN

Financial endpoint pattern:

```text
Authenticate
↓
Authorize
↓
Validate
↓
Load authoritative database state
↓
Check state transition
↓
Begin transaction
↓
Lock/conditional update
↓
Create financial record
↓
Create ledger entry
↓
Create audit record
↓
Commit
↓
Publish realtime event
↓
Return response
```

Never publish a success event before the transaction is safely committed.

---

# 78. RESPONSE DATA SECURITY

Before returning any response:

Check:

```text
Is this field allowed for this role?
```

Especially:

```text
customerPaidAmount
workerAmount
commission
platformFee
bankDetails
documents
internal notes
audit information
```

Use role-specific DTO/serializer structures.

---

# 79. CUSTOMER PAYMENT VS WORKER EARNING

This is a critical API boundary.

Example:

```text
Customer paid ₹100
Worker amount ₹55
Commission ₹25
Platform fee ₹20
```

Customer endpoint may return:

```json
{
  "amountPaid": 100
}
```

Admin endpoint:

```json
{
  "customerPaidAmount": 100,
  "workerAmount": 55,
  "adminCommission": 25,
  "platformFee": 20
}
```

Worker endpoint:

```json
{
  "workerEarningAmount": 55
}
```

Worker endpoint must NOT contain:

```json
{
  "customerPaidAmount": 100,
  "adminCommission": 25,
  "platformFee": 20
}
```

---

# 80. FINANCIAL API SOURCE OF TRUTH

These values must always originate from backend/database:

```text
customerPaidAmount
workerAmount
adminCommission
platformFee
availableEarnings
pendingEarnings
onHoldEarnings
lifetimeEarnings
withdrawalAmount
refundAmount
```

Never trust frontend-calculated values.

---

# 81. API WORKFLOW — COMPLETE CUSTOMER JOURNEY

```text
POST /orders
↓
POST /payments/razorpay/order
↓
Razorpay Checkout
↓
POST /payments/razorpay/verify
↓
Webhook
↓
Order PAID
↓
Order LIVE
↓
Worker sees order
```

---

# 82. API WORKFLOW — COMPLETE WORKER JOURNEY

```text
GET /worker/orders/available
↓
POST /worker/orders/:id/accept
↓
GET /worker/orders/active
↓
POST /worker/orders/:id/start
↓
POST /worker/orders/:id/receipt
↓
Customer views/downloads receipt
↓
Internal earning release
↓
GET /worker/earnings/summary
↓
POST /worker/withdrawals
↓
GET /worker/withdrawals
↓
Admin processes payment
↓
Worker receives realtime update
```

---

# 83. API WORKFLOW — ADMIN JOURNEY

```text
GET /admin/orders
↓
GET /admin/orders/:id
↓
Monitor payment
↓
Assign/reassign worker
↓
Verify receipt
↓
Handle complaint
↓
Hold earning if required
↓
Release earning
↓
Review withdrawals
↓
Approve/reject
↓
Mark payment done
↓
Process refunds
↓
View financial analytics
```

---

# 84. API WORKFLOW — REFUND

```text
Customer Complaint
↓
POST /complaints
↓
Admin Review
↓
POST /admin/orders/:id/refund
↓
Payment Provider Refund
↓
Webhook/confirmation
↓
Payment REFUNDED
↓
Refund Ledger Entry
↓
Worker Earning Adjustment if required
↓
Admin Revenue Analytics Updated
```

---

# 85. API WORKFLOW — EARNING HOLD

```text
Customer Complaint
↓
Admin verifies
↓
POST /admin/orders/:id/earning/hold
↓
Worker Earning = ON_HOLD
↓
Worker cannot withdraw held amount
↓
Admin resolves complaint
↓
POST /admin/orders/:id/earning/release
↓
Worker Earning = AVAILABLE
```

---

# 86. API WORKFLOW — WITHDRAWAL

```text
Worker
↓
POST /worker/withdrawals
↓
Backend checks available balance
↓
Reserve amount
↓
Withdrawal REQUESTED
↓
Admin Review
↓
APPROVED
↓
Admin pays worker
↓
POST /admin/withdrawals/:id/complete
↓
COMPLETED
↓
Worker notified
```

---

# 87. API WORKFLOW — CUSTOMER RECEIPT

```text
Worker completes
↓
Receipt uploaded
↓
Customer receives notification
↓
Customer views/downloads
↓
Receipt event recorded
↓
Worker earning release transaction
↓
Worker balance updated
↓
Realtime worker notification
```

---

# 88. API WORKFLOW — LIVE ORDER

```text
Payment Confirmed
↓
Order LIVE
↓
Worker A GET available
Worker B GET available
Worker C GET available
↓
Worker A accepts
↓
Database transaction
↓
Worker A assigned
↓
Realtime ORDER_ACCEPTED
↓
Worker B/C refresh/remove order
```

---

# 89. API RECOVERY AFTER REALTIME FAILURE

Realtime is not guaranteed.

If realtime connection is lost:

Frontend must recover using API.

Example:

```text
Realtime disconnected
↓
GET current orders/state
↓
Synchronize frontend
```

Do not permanently rely on realtime events.

---

# 90. API TESTING REQUIREMENT

Every important API should have tests for:

### Success

```text
valid authenticated request
```

### Authentication

```text
no token
invalid token
expired token
```

### Authorization

```text
wrong role
wrong owner
wrong worker
```

### Validation

```text
invalid input
missing fields
invalid amount
```

### Concurrency

```text
simultaneous requests
```

### Idempotency

```text
same request twice
```

### Financial integrity

```text
incorrect amount
negative amount
amount > balance
duplicate transaction
```

---

# 91. END-TO-END API TEST

Use:

```text
Customer A
Worker A
Worker B
Admin
```

Test:

```text
Customer creates order
↓
Payment
↓
Payment verification
↓
Order LIVE
↓
Worker A sees
Worker B sees
↓
Worker A accepts
↓
Worker B no longer sees
↓
Worker A completes
↓
Receipt submitted
↓
Customer downloads
↓
Worker earning released
↓
Admin hold
↓
Admin release
↓
Worker withdrawal
↓
Admin approval
↓
Admin payment
↓
Withdrawal completed
↓
Customer complaint
↓
Admin refund
↓
Financial dashboard updated
```

---

# 92. API DATABASE CONSISTENCY

After every critical API call verify database state.

Examples:

After payment:

```text
Payment = PAID
Order = PAID/LIVE
Ledger = CUSTOMER_PAYMENT
```

After worker acceptance:

```text
Order = ACCEPTED
Assignment exists
Only one active worker
```

After receipt download:

```text
Receipt downloaded
Earning released exactly once
Ledger created exactly once
```

After withdrawal:

```text
Withdrawal exists
Balance reserved
Ledger exists
```

After refund:

```text
Refund exists
Payment updated
Ledger updated
```

---

# 93. API IMPLEMENTATION RULE

Do NOT create endpoints simply because they are listed here if an equivalent secure endpoint already exists.

Instead:

```text
Inspect
↓
Map
↓
Reuse
↓
Modify
↓
Add only missing functionality
```

Avoid duplicate endpoints performing the same business action.

---

# 94. API VERSIONING

If production APIs already exist:

Do not break existing consumers unnecessarily.

For breaking changes:

```text
/api/v2
```

may be introduced.

Document migration requirements.

---

# 95. API DOCUMENTATION

Every endpoint should document:

```text
Method
Path
Authentication
Role
Purpose
Request
Response
Errors
Validation
Side Effects
Transaction Requirements
Idempotency
```

---

# 96. FINAL API CONTRACT

The API layer must enforce this complete business flow:

```text
CUSTOMER
↓
SERVICE
↓
ORDER
↓
PRICE SNAPSHOT
↓
RAZORPAY PAYMENT
↓
PAYMENT VERIFICATION
↓
ORDER PAID
↓
ORDER LIVE
↓
WORKER ACCEPTANCE
↓
WORK
↓
RECEIPT
↓
CUSTOMER RECEIPT ACCESS
↓
WORKER EARNING RELEASE
↓
AVAILABLE EARNING
↓
OPTIONAL COMPLAINT
↓
HOLD / RELEASE
↓
WITHDRAWAL
↓
ADMIN PAYMENT
↓
WITHDRAWAL COMPLETED
```

Parallel financial system:

```text
CUSTOMER PAYMENT
       ↓
TOTAL PLATFORM REVENUE
       │
       ├── WORKER AMOUNT
       ├── ADMIN COMMISSION
       └── PLATFORM FEE

CUSTOMER REFUND
       ↓
TOTAL CUSTOMER REFUND

WORKER EARNINGS
       ↓
TOP EARNING WORKERS
```

---

# 97. NON-NEGOTIABLE API RULES

The implementation must NEVER:

1. Trust frontend payment amount.
2. Trust frontend worker amount.
3. Trust frontend commission.
4. Trust frontend platform fee.
5. Trust frontend available balance.
6. Trust frontend lifetime earnings.
7. Allow worker to see customer payment.
8. Allow worker to see commission.
9. Allow worker to see platform fee.
10. Allow two workers to accept one order.
11. Allow duplicate earnings.
12. Allow duplicate withdrawals.
13. Allow duplicate refunds.
14. Allow withdrawal above available balance.
15. Allow held earnings to be withdrawn.
16. Treat failed payment as successful.
17. Treat frontend payment success as final verification.
18. Process unsigned payment webhooks.
19. Modify historical financial transactions destructively.
20. bypass RBAC.
21. expose private documents.
22. rely exclusively on localStorage/IndexedDB for financial state.
23. publish unauthorized realtime financial information.
24. create financial records without auditability.
25. perform money-changing operations without transaction/idempotency protection.

---

# 98. AI IMPLEMENTATION INSTRUCTIONS

Any AI/developer working on this project must:

1. Read `DATABASE_CONTEXT.md`.
2. Read this `API_SPECIFICATION.md`.
3. Inspect existing code.
4. Map existing endpoints.
5. Map existing database models.
6. Identify duplicate functionality.
7. Preserve working APIs.
8. Fix broken APIs.
9. Implement missing APIs.
10. Ensure frontend calls match backend contracts.
11. Ensure backend queries match database schema.
12. Ensure RBAC is enforced.
13. Ensure financial operations are transactional.
14. Ensure idempotency.
15. Ensure concurrency safety.
16. Ensure realtime synchronization.
17. Run API tests.
18. Run database tests.
19. Run end-to-end tests.
20. Verify actual database state.

Do NOT assume that an endpoint works because the frontend displays data.

Test the actual request → backend → database → response flow.

---

# 99. FINAL ACCEPTANCE CRITERIA

The API implementation is considered complete ONLY when:

```text
Authentication works
+
RBAC works
+
Customer workflow works
+
Worker workflow works
+
Admin workflow works
+
Razorpay payment works
+
Payment verification works
+
Webhook verification works
+
Order assignment is atomic
+
Documents are secure
+
Receipt workflow works
+
Worker earnings work
+
Earning hold/release works
+
Withdrawals work
+
Refunds work
+
Commission is separate
+
Platform fee is separate
+
Financial analytics work
+
Realtime synchronization works
+
Idempotency works
+
Concurrency protection works
+
Audit logs work
+
API security tests pass
+
Database state remains consistent
```

The API must be treated as the **enforcement layer of the entire business logic**.

The frontend should consume the API.

The frontend must NOT define financial truth.

**Database + Backend API + Transactions + Authorization = authoritative system behavior.**

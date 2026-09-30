require('dotenv').config();
const { localStore } = require('./dist/catalogData');

async function verify() {
  console.log('=== VERIFYING DATABASE & APPLICATION CLEAN STATE ===\n');

  // 1. Users
  const allUsers = Array.from(localStore.users.values());
  const adminUsers = allUsers.filter(u => u.role === 'ADMIN');
  const workerUsers = allUsers.filter(u => u.role === 'WORKER');
  const customerUsers = allUsers.filter(u => u.role === 'CUSTOMER');
  const testUsers = allUsers.filter(u => (u.email && u.email.includes('test')) || (u.id && u.id.includes('test')));

  console.log('--- USERS ---');
  console.log(`Total Users in Store: ${allUsers.length}`);
  console.log(`Admin Users: ${adminUsers.length} (${adminUsers.map(a => a.email).join(', ')})`);
  console.log(`Worker Users: ${workerUsers.length} (${workerUsers.map(w => w.name).join(', ')})`);
  console.log(`Customer Users: ${customerUsers.length}`);
  console.log(`Test Users: ${testUsers.length}`);

  // 2. Orders
  const allOrders = Array.from(localStore.orders.values());
  const realOrders = allOrders.filter(o => !o.id.includes('test') && !o.customerId.includes('test'));
  const testOrders = allOrders.filter(o => o.id.includes('test') || o.customerId.includes('test'));

  console.log('\n--- ORDERS ---');
  console.log(`Total Orders: ${allOrders.length}`);
  console.log(`Real Orders: ${realOrders.length}`);
  console.log(`Test Orders: ${testOrders.length}`);

  // 3. Payments
  const payments = allOrders.filter(o => o.paymentStatus === 'PAID' || o.payment?.status === 'PAID');
  console.log('\n--- PAYMENTS ---');
  console.log(`Total Payments: ${payments.length}`);

  // 4. Worker Earnings
  const workers = localStore.getWorkers();
  let totalPendingPaise = 0;
  let totalAvailablePaise = 0;
  let totalOnHoldPaise = 0;
  let totalLifetimePaise = 0;
  let totalJobs = 0;

  workers.forEach(w => {
    const summary = localStore.getWorkerEarningsSummary(w.id);
    totalPendingPaise += (summary.pendingEarningsPaise || 0);
    totalAvailablePaise += (summary.walletBalancePaise || 0);
    totalOnHoldPaise += (summary.onHoldEarningsPaise || 0);
    totalLifetimePaise += (summary.totalEarningsPaise || 0);
    totalJobs += (summary.completedJobs || 0);
  });

  console.log('\n--- WORKER EARNINGS ---');
  console.log(`Worker Count: ${workers.length}`);
  console.log(`Pending: ₹${(totalPendingPaise / 100).toFixed(2)}`);
  console.log(`Available: ₹${(totalAvailablePaise / 100).toFixed(2)}`);
  console.log(`On Hold: ₹${(totalOnHoldPaise / 100).toFixed(2)}`);
  console.log(`Lifetime: ₹${(totalLifetimePaise / 100).toFixed(2)}`);
  console.log(`Completed Jobs: ${totalJobs}`);

  // 5. Withdrawals
  const withdrawals = Array.from(localStore.withdrawals.values());
  const requestedW = withdrawals.filter(w => w.status === 'REQUESTED' || w.status === 'PENDING').length;
  const approvedW = withdrawals.filter(w => w.status === 'APPROVED').length;
  const completedW = withdrawals.filter(w => w.status === 'COMPLETED').length;

  console.log('\n--- WITHDRAWALS ---');
  console.log(`Total Withdrawals: ${withdrawals.length}`);
  console.log(`Requested: ${requestedW}`);
  console.log(`Approved: ${approvedW}`);
  console.log(`Completed: ${completedW}`);

  // 6. Refunds
  const refundCount = allOrders.filter(o => o.status === 'REFUNDED' || o.refund).length;
  console.log('\n--- REFUNDS ---');
  console.log(`Total Refunds: ${refundCount}`);

  // 7. Financial Ledger
  const ledger = localStore.ledgerEntries || [];
  const customerPayments = ledger.filter(l => l.type === 'ORDER_PAYMENT').length;
  const workerEarnings = ledger.filter(l => l.type.startsWith('WORKER_EARNING')).length;
  const commissions = ledger.filter(l => l.type === 'ADMIN_COMMISSION').length;
  const platformFees = ledger.filter(l => l.type === 'PLATFORM_FEE').length;
  const refunds = ledger.filter(l => l.type === 'REFUND_ISSUED' || l.type === 'CUSTOMER_REFUND').length;
  const withdrawalEntries = ledger.filter(l => l.type.startsWith('WITHDRAWAL')).length;

  console.log('\n--- FINANCIAL LEDGER ---');
  console.log(`Total Entries: ${ledger.length}`);
  console.log(`Customer Payments: ${customerPayments}`);
  console.log(`Worker Earnings: ${workerEarnings}`);
  console.log(`Commission: ${commissions}`);
  console.log(`Platform Fees: ${platformFees}`);
  console.log(`Refunds: ${refunds}`);
  console.log(`Withdrawals: ${withdrawalEntries}`);

  // 8. Admin Dashboard Aggregates
  const adminSummary = localStore.getFinancialSummaryAdmin();
  const dashStats = localStore.getAdminDashboardStats();

  console.log('\n--- ADMIN DASHBOARD AGGREGATES ---');
  console.log(`Total Platform Revenue: ₹${adminSummary.totalPlatformRevenue.toFixed(2)}`);
  console.log(`Platform Commission: ₹${adminSummary.platformCommission.toFixed(2)}`);
  console.log(`Platform Fee: ₹${adminSummary.platformFee.toFixed(2)}`);
  console.log(`Worker Earnings: ₹${adminSummary.workerEarnings.toFixed(2)}`);
  console.log(`Total Customer Refund: ₹${adminSummary.totalCustomerRefund.toFixed(2)}`);
  console.log(`Active Orders: ${dashStats.activeOrders}`);
  console.log(`Available Orders: ${dashStats.availableOrders}`);
  console.log(`Completed Orders: ${dashStats.completedOrders}`);

  const isClean = 
    allOrders.length === 0 &&
    ledger.length === 0 &&
    withdrawals.length === 0 &&
    totalPendingPaise === 0 &&
    totalAvailablePaise === 0 &&
    totalLifetimePaise === 0 &&
    adminSummary.totalPlatformRevenue === 0 &&
    adminSummary.platformCommission === 0 &&
    adminSummary.workerEarnings === 0 &&
    adminSummary.totalCustomerRefund === 0;

  console.log('\n=======================================');
  console.log(`RESULT: ${isClean ? 'PRODUCTION DATABASE CLEAN' : 'PRODUCTION DATABASE NOT CLEAN'}`);
  console.log('=======================================');
}

verify().catch(console.error);

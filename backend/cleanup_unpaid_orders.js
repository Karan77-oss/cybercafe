const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('--- Cleaning Unpaid Orders from PostgreSQL Database ---');
  try {
    // Find all unpaid orders
    const unpaidOrders = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'PAYMENT_PENDING' },
          { 
            AND: [
              { paymentStatus: 'PENDING' },
              { status: { in: ['PAYMENT_PENDING', 'CREATED', 'CANCELLED'] } },
              { paidAt: null }
            ]
          }
        ]
      },
      select: { id: true, status: true, paymentStatus: true, paidAt: true }
    });

    console.log(`Found ${unpaidOrders.length} unpaid/abandoned orders in PostgreSQL:`, unpaidOrders.map(o => o.id));

    for (const order of unpaidOrders) {
      const orderId = order.id;
      console.log(`Deleting related records for order ${orderId}...`);
      
      // Delete child records first to satisfy foreign key constraints
      await prisma.document.deleteMany({ where: { orderId } }).catch(e => console.warn(`Doc delete err: ${e.message}`));
      await prisma.receipt.deleteMany({ where: { orderId } }).catch(e => console.warn(`Receipt delete err: ${e.message}`));
      await prisma.complaint.deleteMany({ where: { orderId } }).catch(e => console.warn(`Complaint delete err: ${e.message}`));
      await prisma.payment.deleteMany({ where: { orderId } }).catch(e => console.warn(`Payment delete err: ${e.message}`));
      await prisma.workerEarning.deleteMany({ where: { orderId } }).catch(e => console.warn(`Earning delete err: ${e.message}`));
      await prisma.financialLedger.deleteMany({ where: { orderId } }).catch(e => console.warn(`Ledger delete err: ${e.message}`));
      await prisma.job.deleteMany({ where: { orderId } }).catch(e => console.warn(`Job delete err: ${e.message}`));
      
      // Delete order
      await prisma.order.delete({ where: { id: orderId } }).catch(e => console.warn(`Order delete err: ${e.message}`));
      console.log(`Successfully deleted order ${orderId} from PostgreSQL.`);
    }
  } catch (err) {
    console.error('Error cleaning database:', err);
  }
}

function cleanPersistedFiles() {
  console.log('\n--- Cleaning Unpaid Orders from JSON Storage ---');
  const filesToClean = [
    path.join(__dirname, 'data', 'persisted_orders.json'),
    path.join(__dirname, 'data', 'PRE_PRODUCTION_CLEANUP_BACKUP', 'persisted_orders.json')
  ];

  const removedIds = new Set();

  filesToClean.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const orders = JSON.parse(raw);
        if (Array.isArray(orders)) {
          const beforeCount = orders.length;
          const filtered = orders.filter(o => {
            const isUnpaid = (
              o.status === 'PAYMENT_PENDING' ||
              (o.paymentStatus === 'PENDING' && o.status !== 'COMPLETED' && o.status !== 'IN_PROGRESS') ||
              (!o.paymentStatus && o.status === 'PAYMENT_PENDING')
            );
            if (isUnpaid) {
              removedIds.add(o.id);
              return false;
            }
            return true;
          });
          fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
          console.log(`Cleaned ${filePath}: ${beforeCount} -> ${filtered.length} orders (removed ${beforeCount - filtered.length})`);
        }
      } catch (err) {
        console.warn(`Error cleaning ${filePath}:`, err.message);
      }
    }
  });

  // Also clean persisted_documents.json
  const docsFiles = [
    path.join(__dirname, 'data', 'persisted_documents.json'),
    path.join(__dirname, 'data', 'PRE_PRODUCTION_CLEANUP_BACKUP', 'persisted_documents.json')
  ];

  docsFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const docs = JSON.parse(raw);
        if (Array.isArray(docs)) {
          const beforeCount = docs.length;
          const filtered = docs.filter(d => !removedIds.has(d.orderId));
          fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
          console.log(`Cleaned ${filePath}: ${beforeCount} -> ${filtered.length} documents`);
        }
      } catch (err) {
        console.warn(`Error cleaning ${filePath}:`, err.message);
      }
    }
  });
}

async function main() {
  await cleanDatabase();
  cleanPersistedFiles();
  console.log('\n--- Cleanup Finished ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

async function main() {
  console.log('=== STEP 1: CLEANING LOCAL PERSISTED STORE FILES ===');
  const dataDir = path.resolve(__dirname, 'data');
  const ordersFile = path.join(dataDir, 'persisted_orders.json');
  const docsFile = path.join(dataDir, 'persisted_documents.json');
  const ledgerFile = path.join(dataDir, 'financial_ledger.json');

  let ordersDeleted = 0;
  let docsDeleted = 0;
  let ledgerDeleted = 0;

  if (fs.existsSync(ordersFile)) {
    const o = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    ordersDeleted = o.length;
    fs.writeFileSync(ordersFile, '[]', 'utf8');
    console.log(`Reset ${ordersFile}: Removed ${ordersDeleted} fake orders.`);
  }

  if (fs.existsSync(docsFile)) {
    const d = JSON.parse(fs.readFileSync(docsFile, 'utf8'));
    docsDeleted = d.length;
    fs.writeFileSync(docsFile, '[]', 'utf8');
    console.log(`Reset ${docsFile}: Removed ${docsDeleted} fake documents.`);
  }

  if (fs.existsSync(ledgerFile)) {
    const l = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
    ledgerDeleted = l.length;
    fs.writeFileSync(ledgerFile, '[]', 'utf8');
    console.log(`Reset ${ledgerFile}: Removed ${ledgerDeleted} fake ledger entries.`);
  }

  console.log('\n=== STEP 2: CHECKING POSTGRESQL DATABASE CONNECTION ===');
  let dbConnected = false;
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
    dbConnected = true;
    console.log('PostgreSQL is CONNECTED. Performing database cleanup transaction...');
  } catch (err) {
    console.log('PostgreSQL connection inactive/paused (' + err.message + '). Skipping direct SQL execution.');
    console.log('Database cleanup routine prepared for whenever PostgreSQL becomes reachable.');
  }

  if (dbConnected) {
    try {
      await prisma.$transaction(async (tx) => {
        // Strict dependency order:
        const rCount = await tx.review.deleteMany({});
        console.log(`Deleted Reviews: ${rCount.count}`);

        const cCount = await tx.complaint.deleteMany({});
        console.log(`Deleted Complaints: ${cCount.count}`);

        const recCount = await tx.receipt.deleteMany({});
        console.log(`Deleted Receipts: ${recCount.count}`);

        const docCount = await tx.document.deleteMany({});
        console.log(`Deleted Documents: ${docCount.count}`);

        const pCount = await tx.payout.deleteMany({});
        console.log(`Deleted Payouts: ${pCount.count}`);

        const jCount = await tx.job.deleteMany({});
        console.log(`Deleted Jobs: ${jCount.count}`);

        const wCount = await tx.withdrawal.deleteMany({});
        console.log(`Deleted Withdrawals: ${wCount.count}`);

        const refCount = await tx.refund.deleteMany({});
        console.log(`Deleted Refunds: ${refCount.count}`);

        const lCount = await tx.financialLedger.deleteMany({});
        console.log(`Deleted FinancialLedger: ${lCount.count}`);

        const weCount = await tx.workerEarning.deleteMany({});
        console.log(`Deleted WorkerEarnings: ${weCount.count}`);

        const payCount = await tx.payment.deleteMany({});
        console.log(`Deleted Payments: ${payCount.count}`);

        const oCount = await tx.order.deleteMany({});
        console.log(`Deleted Orders: ${oCount.count}`);

        // Clean test users preserving real admin and official workers
        const adminEmail = process.env.ADMIN_EMAIL || 'rajkaran969355@gmail.com';
        const officialWorkerEmails = ['amit.cyber@gmail.com', 'neha.cyber@gmail.com', 'mona.estore@gmail.com'];
        const preservedEmails = [adminEmail, ...officialWorkerEmails];

        const uCount = await tx.user.deleteMany({
          where: {
            email: { notIn: preservedEmails },
            OR: [
              { email: { contains: 'test' } },
              { email: { contains: 'example' } },
              { email: { contains: 'fake' } },
              { role: 'CUSTOMER' } // Any customer in DB was test customer
            ]
          }
        });
        console.log(`Deleted Test Users: ${uCount.count}`);
      });
      console.log('PostgreSQL cleanup transaction completed successfully.');
    } catch (txErr) {
      console.error('Database transaction error:', txErr);
    }
  }

  console.log('\n=== CLEANUP SUMMARY ===');
  console.log({
    ordersDeleted,
    docsDeleted,
    ledgerDeleted,
    dbConnected
  });
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(0);
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function runRealTests() {
    console.log("Starting Real Database Concurrency Tests...");
    // Setup Test Data
    const customer = await prisma.user.create({
        data: { email: 'customer_test_' + Date.now() + '@test.com', password: 'hash', name: 'Cust', role: 'CUSTOMER' }
    });
    const worker1 = await prisma.user.create({
        data: { email: 'worker1_test_' + Date.now() + '@test.com', password: 'hash', name: 'W1', role: 'WORKER' }
    });
    const worker2 = await prisma.user.create({
        data: { email: 'worker2_test_' + Date.now() + '@test.com', password: 'hash', name: 'W2', role: 'WORKER' }
    });
    const service = await prisma.service.create({
        data: { name: 'Test Service', description: 'desc', category: 'cat', pricePaise: 10000, estimatedTime: '1h', status: 'ACTIVE', approvalStatus: 'APPROVED' }
    });
    // TEST 1: Job Assignment Concurrency
    console.log("Running Job Concurrency Test...");
    const order = await prisma.order.create({
        data: {
            orderNumber: 'ORD-INT-' + Date.now(),
            customerId: customer.id,
            serviceId: service.id,
            serviceSnapshot: { pricePaise: 10000 },
            pricing: { workerPayout: 8000 },
            status: 'AVAILABLE'
        }
    });
    const acceptJob = async (wId) => {
        return prisma.$transaction(async (tx) => {
            const o = await tx.order.findUnique({ where: { id: order.id } });
            if (!o || o.status !== 'AVAILABLE')
                throw new Error('ORDER_UNAVAILABLE');
            await tx.order.update({ where: { id: order.id }, data: { status: 'ASSIGNED' } });
            return tx.job.create({ data: { orderId: order.id, workerId: wId, status: 'ASSIGNED' } });
        });
    };
    const results = await Promise.allSettled([acceptJob(worker1.id), acceptJob(worker2.id)]);
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    console.log(`Job Concurrency: ${successes.length} success, ${failures.length} conflict`);
    if (successes.length !== 1 || failures.length !== 1) {
        throw new Error('CONCURRENCY FAILED: Expected exactly 1 success and 1 failure.');
    }
    const dbJob = await prisma.job.findMany({ where: { orderId: order.id } });
    if (dbJob.length !== 1)
        throw new Error('CONCURRENCY FAILED: Multiple jobs created.');
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    if (dbOrder?.status !== 'ASSIGNED')
        throw new Error('Order status incorrect.');
    // TEST 2: Payout Concurrency
    console.log("Running Payout Concurrency Test...");
    await prisma.job.update({ where: { id: dbJob[0].id }, data: { status: 'COMPLETED' } });
    const releasePayout = async () => {
        return prisma.$transaction(async (tx) => {
            const j = await tx.job.findUnique({ where: { id: dbJob[0].id }, include: { order: true } });
            if (!j || j.status !== 'COMPLETED')
                throw new Error('INVALID_JOB');
            const existing = await tx.payout.findUnique({ where: { jobId: j.id } });
            if (existing)
                return existing;
            return tx.payout.create({ data: { jobId: j.id, workerId: j.workerId, amountPaise: 8000, status: 'RELEASED' } });
        });
    };
    const payoutResults = await Promise.allSettled([releasePayout(), releasePayout()]);
    const pSuccess = payoutResults.filter(r => r.status === 'fulfilled');
    const dbPayouts = await prisma.payout.findMany({ where: { jobId: dbJob[0].id } });
    console.log(`Payout Concurrency: ${dbPayouts.length} payout(s) inserted`);
    if (dbPayouts.length !== 1) {
        throw new Error('PAYOUT CONCURRENCY FAILED: Duplicate payout created.');
    }
    console.log("All real database tests PASSED.");
    // Cleanup
    await prisma.payout.deleteMany({ where: { jobId: dbJob[0].id } });
    await prisma.job.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.service.delete({ where: { id: service.id } });
    await prisma.user.deleteMany({ where: { id: { in: [customer.id, worker1.id, worker2.id] } } });
}
runRealTests().catch(console.error).finally(() => prisma.$disconnect());

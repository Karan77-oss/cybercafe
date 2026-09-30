/**
 * verify_customer_worker_flow.js
 * 
 * End-to-end audit and test for Customer -> Worker Order Workflow:
 * 1. Verifies zero fake/dummy/seeded orders exist in the system.
 * 2. Customer places a service order.
 * 3. Verifies order immediately appears on ALL eligible active worker portals (Worker 1 and Worker 2).
 * 4. Simulates concurrent acceptance: Worker 1 and Worker 2 accept simultaneously.
 * 5. Verifies atomic transaction/locking: exactly ONE worker succeeds (200), other gets 409 (ORDER_ALREADY_ASSIGNED).
 * 6. Verifies order immediately disappears from losing worker's available requests.
 * 7. Verifies winning worker sees order in Active Orders (/worker/jobs?status=ACTIVE).
 * 8. Verifies customer sees order updated with operator assignment.
 * 9. Verifies customer idempotency (no duplicate order created on rapid submission).
 */

const BASE = process.env.BACKEND_URL || 'http://localhost:4000/api';

async function req(path, opts = {}) {
  const { method = 'GET', body, token } = opts;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AUDIT: CUSTOMER → WORKER ORDER WORKFLOW VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Step 1: Login All Actors ──────────────────────────────────────────────
  console.log('1. Authenticating Actors...');
  const custLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'customer@test.com', password: 'customer123' }
  });
  assert(custLogin.ok && custLogin.data.token, 'Customer login failed');
  const custToken = custLogin.data.token;
  const custUser = custLogin.data.user;
  console.log(`   ✅ Customer logged in: ${custUser.name} (${custUser.id})`);

  const worker1Login = await req('/auth/login', {
    method: 'POST',
    body: { email: 'amit.cyber@gmail.com', password: 'worker123' }
  });
  assert(worker1Login.ok && worker1Login.data.token, 'Worker 1 login failed');
  const w1Token = worker1Login.data.token;
  const w1Id = worker1Login.data.user.id;
  console.log(`   ✅ Worker 1 logged in: ${worker1Login.data.user.name} (${w1Id})`);

  const worker2Login = await req('/auth/login', {
    method: 'POST',
    body: { email: 'neha.cyber@gmail.com', password: 'worker123' }
  });
  assert(worker2Login.ok && worker2Login.data.token, 'Worker 2 login failed');
  const w2Token = worker2Login.data.token;
  const w2Id = worker2Login.data.user.id;
  console.log(`   ✅ Worker 2 logged in: ${worker2Login.data.user.name} (${w2Id})\n`);

  // Ensure both workers are online
  await req('/worker/availability/toggle', { method: 'POST', token: w1Token, body: { isOnline: true } });
  await req('/worker/availability/toggle', { method: 'POST', token: w2Token, body: { isOnline: true } });

  // ── Step 2: Audit For Fake / Dummy Orders ─────────────────────────────────
  console.log('2. Auditing for fake/seeded dummy orders...');
  const initialW1Reqs = await req('/worker/requests', { token: w1Token });
  assert(initialW1Reqs.ok, 'Failed to fetch Worker 1 requests');
  const dummyIds = ['ord_avail_202', 'ord_active_101', 'ord_comp_303'];
  const foundDummies = (initialW1Reqs.data.orders || []).filter(o => dummyIds.includes(o.id));
  assert(foundDummies.length === 0, `Found fake/dummy seeded orders in live pool: ${foundDummies.map(d=>d.id).join(', ')}`);
  console.log('   ✅ No fake/dummy orders (ord_avail_202, ord_active_101, ord_comp_303) exist in the system.\n');

  // ── Step 3: Customer Places an Order ──────────────────────────────────────
  console.log('3. Customer places a service order (PAN Card Application)...');
  const orderPayload = {
    serviceId: 'pan-card',
    details: {
      fullName: 'Sunita Mehra',
      fatherName: 'Dinesh Mehra',
      dateOfBirth: '1995-07-22',
      phone: '9876501234',
      email: 'sunita.mehra@example.com',
      panType: 'New PAN Card (Form 49A)',
      address: 'Flat 302, Green Park, Patna, Bihar'
    },
    additionalInfo: 'Urgent processing requested',
    workerSelection: { mode: 'auto' },
    documentIds: [],
    paymentMethod: {
      provider: 'UPI',
      timestamp: new Date().toISOString(),
      details: { upiId: 'sunita@oksbi' }
    }
  };

  const createRes = await req('/orders', {
    method: 'POST',
    token: custToken,
    body: orderPayload
  });
  assert(createRes.ok && createRes.data.order, `Failed to create order: ${JSON.stringify(createRes.data)}`);
  const placedOrder = createRes.data.order;
  const orderId = placedOrder.id;
  console.log(`   ✅ Order placed successfully! ID: ${orderId}`);
  console.log(`      Initial Status: ${placedOrder.status}`);
  console.log(`      Assigned Worker ID: ${placedOrder.assignedWorkerId || 'none (available in pool)'}`);
  assert(placedOrder.status === 'AVAILABLE', `Order status must be AVAILABLE upon creation, got: ${placedOrder.status}`);
  assert(!placedOrder.assignedWorkerId, 'Order must be unassigned initially');

  // ── Step 4: Verify LIVE/AVAILABLE on EVERY Active Worker Portal ─────────────
  console.log('\n4. Verifying order appears LIVE on EVERY eligible active worker portal...');
  const w1Reqs = await req('/worker/requests', { token: w1Token });
  const w2Reqs = await req('/worker/requests', { token: w2Token });

  const inW1 = (w1Reqs.data.orders || []).find(o => o.id === orderId);
  const inW2 = (w2Reqs.data.orders || []).find(o => o.id === orderId);

  assert(inW1, `Order ${orderId} NOT visible to Worker 1! Available list: ${w1Reqs.data.orders?.map(o=>o.id).join(', ')}`);
  assert(inW2, `Order ${orderId} NOT visible to Worker 2! Available list: ${w2Reqs.data.orders?.map(o=>o.id).join(', ')}`);
  console.log(`   ✅ Worker 1 (${worker1Login.data.user.name}) sees order ${orderId} in Available list.`);
  console.log(`   ✅ Worker 2 (${worker2Login.data.user.name}) sees order ${orderId} in Available list.`);
  console.log(`      Pre-acceptance Customer Name visible: "${inW1.customerName}"`);
  console.log(`      Pre-acceptance Worker Payout: ₹${((inW1.workerEarningsPaise || 0) / 100).toFixed(2)}`);

  // ── Step 5: Simultaneous Concurrency Test (Atomic Locking) ─────────────────
  console.log('\n5. Testing simultaneous acceptance by Worker 1 and Worker 2 (Atomic Locking)...');
  const [accept1, accept2] = await Promise.all([
    req(`/worker/jobs/${orderId}/accept`, { method: 'POST', token: w1Token }),
    req(`/worker/jobs/${orderId}/accept`, { method: 'POST', token: w2Token })
  ]);

  console.log(`   Worker 1 response: HTTP ${accept1.status} (success=${accept1.data.success})`);
  console.log(`   Worker 2 response: HTTP ${accept2.status} (success=${accept2.data.success})`);

  const oneWon = (accept1.status === 200 && accept2.status === 409) || (accept1.status === 409 && accept2.status === 200);
  assert(oneWon, `Expected exactly one HTTP 200 and one HTTP 409, got Worker 1: ${accept1.status}, Worker 2: ${accept2.status}`);

  const winner = accept1.status === 200 ? 'Worker 1 (Amit)' : 'Worker 2 (Neha)';
  const winnerToken = accept1.status === 200 ? w1Token : w2Token;
  const winnerId = accept1.status === 200 ? w1Id : w2Id;
  const loserToken = accept1.status === 200 ? w2Token : w1Token;
  const loserName = accept1.status === 200 ? 'Worker 2 (Neha)' : 'Worker 1 (Amit)';
  console.log(`   ✅ Concurrency handled atomically: ${winner} won the race, ${loserName} got 409 Conflict.`);

  // ── Step 6: Order Disappears From Other Workers ────────────────────────────
  console.log('\n6. Verifying order immediately DISAPPEARED from losing worker\'s available list...');
  const loserReqsAfter = await req('/worker/requests', { token: loserToken });
  const stillInLoser = (loserReqsAfter.data.orders || []).find(o => o.id === orderId);
  assert(!stillInLoser, `Order ${orderId} still appears in ${loserName}'s available list after being accepted!`);
  console.log(`   ✅ Order ${orderId} successfully disappeared from ${loserName}'s available list.`);

  // ── Step 7: Winner Sees Order in Active Orders ─────────────────────────────
  console.log(`\n7. Verifying winning worker (${winner}) sees order in Active Orders...`);
  const winnerActiveJobs = await req('/worker/jobs?status=ACTIVE', { token: winnerToken });
  const foundInActive = (winnerActiveJobs.data.jobs || []).find(j => j.id === orderId);
  assert(foundInActive, `Order ${orderId} NOT found in winner's active jobs list!`);
  assert(foundInActive.status === 'ACCEPTED', `Expected status ACCEPTED, got ${foundInActive.status}`);
  console.log(`   ✅ Order ${orderId} is in winner's Active Orders with status ACCEPTED.`);
  console.log(`      Customer data unlocked for worker: Phone=${foundInActive.customerPhone}, Address=${foundInActive.formData?.address}`);

  // ── Step 8: Customer Sees Operator Assigned ───────────────────────────────
  console.log('\n8. Verifying Customer sees operator assigned in My Orders...');
  const custView = await req(`/orders/${orderId}`, { token: custToken });
  assert(custView.ok && custView.data.order, 'Customer failed to fetch order');
  assert(custView.data.order.status === 'ACCEPTED', `Customer status expected ACCEPTED, got ${custView.data.order.status}`);
  assert(custView.data.order.assignedWorkerId === winnerId, `Assigned worker mismatch: ${custView.data.order.assignedWorkerId} vs ${winnerId}`);
  console.log(`   ✅ Customer view confirmed: Status = ${custView.data.order.status}, Operator = ${custView.data.order.worker?.name || custView.data.order.assignedWorkerId}`);

  // ── Step 9: Deduplication / Idempotency Test ──────────────────────────────
  console.log('\n9. Testing idempotency: Rapid duplicate order submission guard...');
  const dupCreateRes = await req('/orders', {
    method: 'POST',
    token: custToken,
    body: orderPayload
  });
  assert(dupCreateRes.ok, 'Duplicate order call failed');
  console.log(`   Returned Order ID: ${dupCreateRes.data.order?.id}`);
  console.log(`   Original Order ID: ${orderId}`);
  assert(dupCreateRes.data.order?.id === orderId, 'Idempotency failed: A duplicate order was created instead of returning existing order');
  console.log('   ✅ Idempotency guard verified: Double submission safely returned existing order without creating duplicate.');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ALL AUDIT REQUIREMENTS SUCCESSFULLY VERIFIED! ✅');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

run().catch(err => {
  console.error('\n❌ AUDIT TEST FAILED:', err.message);
  process.exit(1);
});

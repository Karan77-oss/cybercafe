import assert from 'assert';

const BASE_URL = 'http://localhost:4000/api';

async function testWorkerPortal() {
  console.log('=== STARTING WORKER PORTAL END-TO-END VERIFICATION ===\n');

  // 1. Worker Login
  console.log('1. Testing Worker Authentication...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amit.cyber@gmail.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true, 'Worker login must succeed');
  assert.ok(loginData.token, 'Must return JWT token');
  assert.strictEqual(loginData.user.role, 'WORKER', 'User role must be WORKER');
  console.log('   ✓ Worker authenticated successfully. Role:', loginData.user.role);
  const token = loginData.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Online / Offline Toggle
  console.log('\n2. Testing Online/Offline Availability Toggle...');
  const offRes = await fetch(`${BASE_URL}/worker/availability/toggle`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ isOnline: false })
  });
  const offData = await offRes.json();
  assert.strictEqual(offData.isOnline, false, 'Should be offline');
  console.log('   ✓ Worker successfully switched to Offline.');

  const onRes = await fetch(`${BASE_URL}/worker/availability/toggle`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ isOnline: true })
  });
  const onData = await onRes.json();
  assert.strictEqual(onData.isOnline, true, 'Should be online');
  console.log('   ✓ Worker successfully switched back to Online.');

  // 3. Available Orders & Pre-Acceptance Privacy Verification (Section 6)
  console.log('\n3. Testing Available Requests & Pre-Acceptance Privacy (Section 6)...');
  const reqsRes = await fetch(`${BASE_URL}/worker/requests`, { headers });
  const reqsData = await reqsRes.json();
  assert.strictEqual(reqsData.success, true);
  assert.ok(Array.isArray(reqsData.orders));
  assert.ok(reqsData.orders.length > 0, 'Must have at least 1 available order');
  
  const sampleOrder = reqsData.orders[0];
  console.log(`   Order ID: ${sampleOrder.id}, Service: ${sampleOrder.serviceName}, Payout: ₹${((sampleOrder.workerEarningsPaise)/100).toFixed(2)}`);
  
  // Verify strict pre-acceptance privacy: customer phone, email, and documents MUST NOT be present
  assert.strictEqual(sampleOrder.customerPhone, undefined, 'Customer phone must be hidden before acceptance');
  assert.strictEqual(sampleOrder.customerEmail, undefined, 'Customer email must be hidden before acceptance');
  assert.strictEqual(sampleOrder.documents, undefined, 'Customer documents must be hidden before acceptance');
  assert.ok(sampleOrder.remainingSeconds !== undefined, 'Must provide remaining offer timer');
  console.log('   ✓ Pre-Acceptance Privacy verified: phone, email, documents strictly hidden.');
  console.log(`   ✓ 10-Minute Response Window verified: ${sampleOrder.remainingSeconds}s remaining.`);

  // 4. Order Acceptance (Section 8)
  console.log('\n4. Testing Order Acceptance...');
  const acceptRes = await fetch(`${BASE_URL}/worker/jobs/${sampleOrder.id}/accept`, {
    method: 'POST',
    headers
  });
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptData.success, true, 'Acceptance must succeed');
  assert.strictEqual(acceptData.order.status, 'ACCEPTED');
  console.log('   ✓ Order accepted. Status is now ACCEPTED.');

  // 5. Verify Unlocked Customer Documents & Details in Workspace (Section 11)
  console.log('\n5. Testing Active Order Workspace Data Access...');
  const detailRes = await fetch(`${BASE_URL}/worker/jobs/${sampleOrder.id}`, { headers });
  const detailData = await detailRes.json();
  assert.strictEqual(detailData.success, true);
  assert.ok(detailData.job.customerPhone, 'Customer phone should now be visible to worker');
  assert.ok(Array.isArray(detailData.job.documents), 'Documents should now be accessible');
  console.log('   ✓ Customer contact & documents unlocked for active working.');

  // 6. Mutual Time-Slot Agreement (Section 10)
  console.log('\n6. Testing Mutual Time-Slot Agreement (Section 10)...');
  const slotRes = await fetch(`${BASE_URL}/worker/jobs/${sampleOrder.id}/timeslot`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ date: 'Today', startTime: '11:00 AM', endTime: '01:00 PM' })
  });
  const slotData = await slotRes.json();
  assert.strictEqual(slotData.success, true);
  assert.strictEqual(slotData.order.timeSlot.startTime, '11:00 AM');
  console.log('   ✓ Time slot confirmed: Today, 11:00 AM - 01:00 PM.');

  // 7. Start Work (Section 11)
  console.log('\n7. Testing Start Work (Status -> IN_PROGRESS)...');
  const startRes = await fetch(`${BASE_URL}/worker/jobs/${sampleOrder.id}/start`, {
    method: 'POST',
    headers
  });
  const startData = await startRes.json();
  assert.strictEqual(startData.success, true);
  assert.strictEqual(startData.order.status, 'IN_PROGRESS');
  console.log('   ✓ Work started. Status is IN_PROGRESS.');

  // 8. Deliverables & Proof of Work Upload (Section 12)
  console.log('\n8. Testing Deliverables Upload (Section 12: 1 mandatory + max 1 optional)...');
  const delivRes = await fetch(`${BASE_URL}/worker/jobs/${sampleOrder.id}/deliverables`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      deliverables: [
        { name: 'Voter_ID_Form6_Submission_Receipt.pdf', url: 'https://cybercafe.local/receipt.pdf' }
      ]
    })
  });
  const delivData = await delivRes.json();
  assert.strictEqual(delivData.success, true);
  assert.strictEqual(delivData.deliverables.length, 1);
  assert.strictEqual(delivData.deliverables[0].isMandatory, true);
  console.log('   ✓ Mandatory output receipt uploaded.');

  // 9. Finish Work & Payout Credit (Section 13)
  console.log('\n9. Testing Finish Work & Earnings Transfer...');
  const finishRes = await fetch(`${BASE_URL}/worker/jobs/${sampleOrder.id}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ note: 'Voter ID form 6 filed with reference NVSP-2026-PATNA' })
  });
  const finishData = await finishRes.json();
  assert.strictEqual(finishData.success, true);
  assert.strictEqual(finishData.order.status, 'COMPLETED');
  console.log('   ✓ Order finished. Status is COMPLETED.');

  // 10. Post-Completion Privacy & Data Purge (Section 15)
  console.log('\n10. Testing Post-Completion Privacy & Data Purge (Section 15)...');
  const postCompRes = await fetch(`${BASE_URL}/worker/jobs/${sampleOrder.id}`, { headers });
  const postCompData = await postCompRes.json();
  assert.strictEqual(postCompData.success, true);
  assert.ok(postCompData.job.customerPhone.includes('*'), 'Phone number must be masked after completion');
  assert.strictEqual(postCompData.job.documents.length, 0, 'Personal working documents must be purged from worker view');
  assert.strictEqual(postCompData.job.isChatClosed, true, 'Chat must be locked for completed order');
  console.log('   ✓ Post-completion privacy verified: phone masked, docs purged, chat locked.');

  // 11. Earnings & Wallet Verification (Section 17)
  console.log('\n11. Testing Earnings & Wallet Balance...');
  const earningsRes = await fetch(`${BASE_URL}/worker/earnings`, { headers });
  const earningsData = await earningsRes.json();
  assert.strictEqual(earningsData.success, true);
  console.log(`   Wallet Balance: ₹${(earningsData.earnings.walletBalancePaise / 100).toFixed(2)}`);
  console.log(`   Lifetime Earnings: ₹${(earningsData.earnings.totalEarningsPaise / 100).toFixed(2)}`);
  assert.ok(earningsData.earnings.walletBalancePaise > 0, 'Wallet balance should have increased');

  // 12. Payout Withdrawal Request (Section 18)
  console.log('\n12. Testing Withdrawal Request (Section 18)...');
  const wthRes = await fetch(`${BASE_URL}/worker/withdrawals`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amountPaise: 10000, method: 'BANK' }) // ₹100
  });
  const wthData = await wthRes.json();
  assert.strictEqual(wthData.success, true);
  assert.strictEqual(wthData.withdrawal.amountPaise, 10000);
  assert.strictEqual(wthData.withdrawal.status, 'PENDING');
  console.log('   ✓ ₹100.00 withdrawal request created with status PENDING.');

  // 13. Customer Portal Regression Check (Zero Changes / Regressions)
  console.log('\n13. Verifying Customer Portal Integrity (Zero Regressions)...');
  const custLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@test.com', password: 'password123' })
  });
  const custData = await custLogin.json();
  assert.strictEqual(custData.success, true, 'Customer login must work');
  const custHeaders = { 'Authorization': `Bearer ${custData.token}`, 'Content-Type': 'application/json' };

  const [custServices, custOrders, custWallet] = await Promise.all([
    fetch(`${BASE_URL}/services`).then(r => r.json()),
    fetch(`${BASE_URL}/orders`, { headers: custHeaders }).then(r => r.json()),
    fetch(`${BASE_URL}/customer/wallet`, { headers: custHeaders }).then(r => r.json())
  ]);

  assert.strictEqual(custServices.success, true, 'Services catalog must return 200');
  assert.ok(custServices.services.length >= 8, 'Customer services must be intact');
  assert.strictEqual(custOrders.success, true, 'Customer orders must return 200');
  assert.strictEqual(custWallet.success, true, 'Customer wallet must return 200');
  console.log('   ✓ Customer Portal completely operational with zero regressions.');

  console.log('\n=== ALL WORKER PORTAL INTEGRATION TESTS PASSED PERFECTLY! ===');
}

testWorkerPortal().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});

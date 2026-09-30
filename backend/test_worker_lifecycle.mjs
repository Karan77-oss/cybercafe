// Test script for Worker Lifecycle (Hire -> Sync -> Login -> Pause -> Resume -> Delete)
const BASE_URL = 'http://localhost:4000/api';

async function testWorkerLifecycle() {
  console.log('--- STARTING WORKER LIFECYCLE E2E TEST ---');

  // Step 1: Admin Login
  console.log('\n[1] Admin Login...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rajkaran969355@gmail.com',
      password: 'Karan@@2002'
    })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  }
  const adminToken = adminLoginData.token;
  console.log('✓ Admin logged in successfully.');

  // Step 2: Admin Hires / Creates Worker with complete details
  const testWorkerId = `wrk_test_${Date.now().toString().slice(-6)}`;
  const workerPassword = 'WorkerPassword123!';
  const workerEmail = `${testWorkerId}@cybercafe.test`;

  console.log(`\n[2] Admin hiring worker: ${testWorkerId}...`);
  const hireRes = await fetch(`${BASE_URL}/admin/workers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      workerId: testWorkerId,
      workerName: 'Rajesh Varma',
      email: workerEmail,
      mobile: '9812345678',
      password: workerPassword,
      businessName: 'Varma Seva Kendra & Cafe',
      address: 'Shop 12, Main Bazaar, Near Station',
      city: 'Ranchi',
      skills: 'PAN Card, Voter ID, Aadhaar Print, Income Certificate',
      idProof: 'varma_aadhaar.pdf',
      photo: 'varma_photo.jpg',
      accountNumber: '987654321098',
      ifsc: 'PUNB0123400',
      accountHolderName: 'Rajesh Varma',
      upiId: 'rajesh@okpnb'
    })
  });
  const hireData = await hireRes.json();
  if (!hireRes.ok) {
    throw new Error(`Worker creation failed: ${JSON.stringify(hireData)}`);
  }
  console.log(`✓ Worker created successfully. ID: ${hireData.worker?.id || testWorkerId}`);

  // Step 3: Worker Login using Worker ID and assigned password
  console.log(`\n[3] Testing Worker Login with Worker ID: "${testWorkerId}"...`);
  const workerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testWorkerId, // Can log in with Worker ID in the email/username field
      password: workerPassword
    })
  });
  const workerLoginData = await workerLoginRes.json();
  if (!workerLoginRes.ok || !workerLoginData.token) {
    throw new Error(`Worker login failed: ${JSON.stringify(workerLoginData)}`);
  }
  const workerToken = workerLoginData.token;
  console.log(`✓ Worker logged in successfully! Role: ${workerLoginData.user?.role}`);

  // Step 4: Worker Profile Verification from backend
  console.log('\n[4] Verifying Worker Profile synchronization from backend database...');
  const profileRes = await fetch(`${BASE_URL}/worker/profile`, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  const profileData = await profileRes.json();
  if (!profileRes.ok || !profileData.profile) {
    throw new Error(`Failed to fetch worker profile: ${JSON.stringify(profileData)}`);
  }
  const p = profileData.profile;
  console.log('Worker Profile Data Received:');
  console.log({
    id: p.id,
    workerId: p.workerId,
    name: p.name,
    email: p.email,
    phone: p.phone,
    businessName: p.businessName,
    city: p.city,
    address: p.address,
    skills: p.skills,
    status: p.status,
    bankDetails: p.bankDetails
  });

  // Verify all fields match without dummy data
  if (p.workerId !== testWorkerId) throw new Error(`workerId mismatch: got ${p.workerId}, expected ${testWorkerId}`);
  if (p.name !== 'Rajesh Varma') throw new Error(`name mismatch: got ${p.name}`);
  if (p.email !== workerEmail) throw new Error(`email mismatch: got ${p.email}`);
  if (p.phone !== '9812345678') throw new Error(`phone mismatch: got ${p.phone}`);
  if (p.businessName !== 'Varma Seva Kendra & Cafe') throw new Error(`businessName mismatch: got ${p.businessName}`);
  if (p.city !== 'Ranchi') throw new Error(`city mismatch: got ${p.city}`);
  if (p.address !== 'Shop 12, Main Bazaar, Near Station') throw new Error(`address mismatch: got ${p.address}`);
  if (!p.bankDetails || p.bankDetails.accountNumber !== '987654321098') {
    throw new Error(`bankDetails accountNumber mismatch: got ${JSON.stringify(p.bankDetails)}`);
  }
  if (p.bankDetails.ifsc !== 'PUNB0123400') throw new Error(`bankDetails ifsc mismatch: got ${p.bankDetails.ifsc}`);
  if (p.bankDetails.upiId !== 'rajesh@okpnb') throw new Error(`bankDetails upiId mismatch: got ${p.bankDetails.upiId}`);
  if (p.status !== 'ACTIVE') throw new Error(`status mismatch: got ${p.status}, expected ACTIVE`);
  console.log('✓ All 11 worker profile fields perfectly synchronized with backend source of truth!');

  // Step 5: Worker available orders when active
  console.log('\n[5] Worker checks available requests...');
  const availOrdersRes = await fetch(`${BASE_URL}/worker/requests`, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  const availOrdersData = await availOrdersRes.json();
  console.log(`✓ Available requests query succeeded (count: ${availOrdersData.orders?.length || 0})`);

  // Step 6: Admin PAUSES the worker
  console.log(`\n[6] Admin pausing worker "${testWorkerId}"...`);
  const pauseRes = await fetch(`${BASE_URL}/admin/workers/${testWorkerId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'PAUSED',
      reason: 'Temporary maintenance pause by Admin'
    })
  });
  const pauseData = await pauseRes.json();
  if (!pauseRes.ok || pauseData.worker?.status !== 'PAUSED') {
    throw new Error(`Failed to pause worker: ${JSON.stringify(pauseData)}`);
  }
  console.log('✓ Worker paused successfully by Admin.');

  // Verify worker profile reflects PAUSED
  const pausedProfileRes = await fetch(`${BASE_URL}/worker/profile`, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  const pausedProfileData = await pausedProfileRes.json();
  if (pausedProfileData.profile?.status !== 'PAUSED') {
    throw new Error(`Expected worker status to be PAUSED, got ${pausedProfileData.profile?.status}`);
  }
  console.log('✓ Worker profile confirms status is "PAUSED".');

  // Verify paused worker can still log in
  const pausedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testWorkerId,
      password: workerPassword
    })
  });
  if (!pausedLoginRes.ok) {
    throw new Error(`Paused worker should still be able to log in, but got: ${pausedLoginRes.status}`);
  }
  console.log('✓ Paused worker successfully logged in to monitor active jobs.');

  // Verify paused worker receives 0 available orders
  const pausedAvailRes = await fetch(`${BASE_URL}/worker/requests`, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  const pausedAvailData = await pausedAvailRes.json();
  if ((pausedAvailData.orders || []).length !== 0) {
    throw new Error(`Expected 0 available orders for paused worker, got ${pausedAvailData.orders.length}`);
  }
  console.log('✓ Paused worker receives 0 available orders (excluded from new assignments).');

  // Verify available workers pool excludes paused worker
  const poolRes = await fetch(`${BASE_URL}/workers/available`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const poolData = await poolRes.json();
  const foundInPool = (poolData.workers || []).some(w => w.id === testWorkerId || w.workerId === testWorkerId);
  if (foundInPool) {
    throw new Error(`Paused worker should NOT be in the available pool`);
  }
  console.log('✓ Available workers pool excludes paused worker.');

  // Step 7: Admin RESUMES the worker
  console.log(`\n[7] Admin resuming worker "${testWorkerId}"...`);
  const resumeRes = await fetch(`${BASE_URL}/admin/workers/${testWorkerId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'ACTIVE',
      reason: 'Resumed by Admin'
    })
  });
  const resumeData = await resumeRes.json();
  if (!resumeRes.ok || resumeData.worker?.status !== 'ACTIVE') {
    throw new Error(`Failed to resume worker: ${JSON.stringify(resumeData)}`);
  }
  console.log('✓ Worker resumed successfully to "ACTIVE".');

  // Step 8: Admin DELETES / DEACTIVATES worker (soft-delete)
  console.log(`\n[8] Admin deleting/deactivating worker "${testWorkerId}"...`);
  const deleteRes = await fetch(`${BASE_URL}/admin/workers/${testWorkerId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      reason: 'Deactivated per testing workflow'
    })
  });
  const deleteData = await deleteRes.json();
  if (!deleteRes.ok) {
    throw new Error(`Worker deletion failed: ${JSON.stringify(deleteData)}`);
  }
  console.log(`✓ Admin DELETE endpoint returned: ${deleteData.message} (status: ${deleteData.worker?.status})`);

  // Step 9: Verify worker login attempt is blocked with HTTP 403 Forbidden
  console.log('\n[9] Verifying deactivated worker login attempt is rejected...');
  const deactivatedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testWorkerId,
      password: workerPassword
    })
  });
  const deactivatedLoginData = await deactivatedLoginRes.json();
  const errorCode = deactivatedLoginData.error?.code || deactivatedLoginData.code;
  const errorMsg = deactivatedLoginData.error?.message || deactivatedLoginData.error;
  if (deactivatedLoginRes.status !== 403 || errorCode !== 'ACCOUNT_DEACTIVATED') {
    throw new Error(`Expected HTTP 403 ACCOUNT_DEACTIVATED, got ${deactivatedLoginRes.status}: ${JSON.stringify(deactivatedLoginData)}`);
  }
  console.log(`✓ Worker login blocked with HTTP 403 Forbidden: "${errorMsg}" (Code: ${errorCode})`);

  // Step 10: Verify worker audit and history in Admin Panel
  console.log('\n[10] Verifying worker details in Admin Panel remain accessible (soft-deleted)...');
  const adminCheckRes = await fetch(`${BASE_URL}/admin/workers/${testWorkerId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminCheckData = await adminCheckRes.json();
  if (!adminCheckRes.ok || !adminCheckData.worker) {
    throw new Error(`Admin failed to inspect deleted worker: ${JSON.stringify(adminCheckData)}`);
  }
  if (adminCheckData.worker.status !== 'DELETED') {
    throw new Error(`Expected status to be DELETED, got ${adminCheckData.worker.status}`);
  }
  console.log(`✓ Historical worker record preserved with status: "${adminCheckData.worker.status}". Audit trail intact.`);

  console.log('\n======================================================');
  console.log('🎉 ALL WORKER LIFECYCLE TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('======================================================');
}

testWorkerLifecycle().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

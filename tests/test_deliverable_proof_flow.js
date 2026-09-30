// Automated End-to-End Test for Deliverables & Proof of Work Workflow
// Tests: Worker uploads -> submits -> Customer views -> Customer downloads

const BASE_URL = 'http://localhost:4000/api';

async function runTest() {
  console.log('====================================================');
  console.log('🚀 TESTING DELIVERABLES & PROOF OF WORK WORKFLOW');
  console.log('====================================================\n');

  // Step 1: Login Worker
  console.log('1. Logging in as Worker (amit.cyber@gmail.com)...');
  const workerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amit.cyber@gmail.com', password: 'worker123' })
  });
  const workerLoginData = await workerLoginRes.json();
  if (!workerLoginData.token) {
    throw new Error('Worker login failed: ' + JSON.stringify(workerLoginData));
  }
  const workerToken = workerLoginData.token;
  console.log('✅ Worker logged in successfully. Worker ID:', workerLoginData.user?.id);

  // Step 1.1: Ensure Worker is ACTIVE & Online
  console.log('1.1 Ensuring Worker is ACTIVE and Online...');
  try {
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rajkaran969355@gmail.com', password: 'Karan@@2002' })
    });
    const adminData = await adminLoginRes.json();
    if (adminData.token) {
      await fetch(`${BASE_URL}/admin/workers/worker-amit-01/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminData.token}`
        },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      console.log('✅ Worker status verified as ACTIVE by Admin.');
    }
  } catch (e) {
    console.log('Note: Admin status check skipped/failed:', e.message);
  }

  // Toggle online
  await fetch(`${BASE_URL}/worker/toggle-online`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${workerToken}`
    },
    body: JSON.stringify({ isOnline: true })
  });
  console.log('✅ Worker availability set to Online.');

  // Step 2: Login Customer
  console.log('\n2. Logging in as Customer (customer@test.com)...');
  const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@test.com', password: 'customer123' })
  });
  const customerLoginData = await customerLoginRes.json();
  if (!customerLoginData.token) {
    throw new Error('Customer login failed: ' + JSON.stringify(customerLoginData));
  }
  const customerToken = customerLoginData.token;
  const customerId = customerLoginData.user?.id;
  console.log('✅ Customer logged in successfully. Customer ID:', customerId);

  // Step 3: Customer creates an order
  console.log('\n3. Customer creates an order for Voter ID Service...');
  const orderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      serviceId: 'voter-id',
      details: { fullName: 'Rajesh Test', phone: '9876543210' },
      workerSelection: { mode: 'preferred', preferredWorkerId: 'worker-amit-01' },
      paymentMethod: { provider: 'UPI' }
    })
  });
  const orderData = await orderRes.json();
  if (!orderData.success || !orderData.order) {
    throw new Error('Order creation failed: ' + JSON.stringify(orderData));
  }
  const orderId = orderData.order.id;
  console.log(`✅ Order created successfully: ${orderId} (Status: ${orderData.order.status}, Assigned: ${orderData.order.assignedWorkerId})`);

  // Step 4: Worker accepts the order
  console.log(`\n4. Worker accepts order ${orderId}...`);
  const acceptRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });
  const acceptData = await acceptRes.json();
  if (!acceptData.success) {
    throw new Error('Worker accept failed: ' + JSON.stringify(acceptData));
  }
  console.log('✅ Worker accepted order. Status:', acceptData.order?.status);

  // Step 5: Worker starts work
  console.log(`\n5. Worker starts work on order ${orderId}...`);
  const startRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });
  const startData = await startRes.json();
  if (!startData.success) {
    throw new Error('Worker start work failed: ' + JSON.stringify(startData));
  }
  console.log('✅ Work started. Status:', startData.order?.status);

  // Step 6: Test Mandatory Final Receipt Enforcement (Must fail if 0 deliverables)
  console.log('\n6. Testing mandatory receipt rule: submitting without deliverables...');
  const earlySubmitRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${workerToken}`
    },
    body: JSON.stringify({ note: 'Attempting finish without files' })
  });
  const earlySubmitData = await earlySubmitRes.json();
  if (earlySubmitRes.status === 400 && earlySubmitData.error) {
    console.log('✅ Correctly BLOCKED finish without deliverables: "' + earlySubmitData.error + '"');
  } else {
    throw new Error('Validation failed! Submission without deliverables should have returned 400');
  }

  // Step 7: Worker uploads Deliverable 1 (Mandatory Final Receipt)
  console.log('\n7. Worker uploads Deliverable 1 (Official Final Receipt)...');
  const dummyPdf1 = Buffer.from('%PDF-1.4 Mock Deliverable Receipt Content 1', 'utf-8');
  const formData1 = new FormData();
  formData1.append('file', new Blob([dummyPdf1], { type: 'application/pdf' }), 'Official_Voter_Acknowledgement_Slip.pdf');
  formData1.append('name', 'Official Election Commission Acknowledgement Slip');

  const upload1Res = await fetch(`${BASE_URL}/worker/jobs/${orderId}/deliverables`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` },
    body: formData1
  });
  const upload1Data = await upload1Res.json();
  if (!upload1Data.success || !upload1Data.deliverable) {
    throw new Error('Deliverable 1 upload failed: ' + JSON.stringify(upload1Data));
  }
  const deliv1 = upload1Data.deliverable;
  console.log('✅ Deliverable 1 uploaded successfully:', {
    id: deliv1.id,
    name: deliv1.name,
    fileName: deliv1.fileName,
    isMandatory: deliv1.isMandatory,
    url: deliv1.url
  });
  if (!deliv1.isMandatory) {
    throw new Error('First deliverable must be flagged as isMandatory: true');
  }

  // Step 8: Worker uploads Deliverable 2 (Supporting Proof)
  console.log('\n8. Worker uploads Deliverable 2 (Supporting Payment Challan)...');
  const dummyPdf2 = Buffer.from('%PDF-1.4 Mock Supporting Proof Content 2', 'utf-8');
  const formData2 = new FormData();
  formData2.append('file', new Blob([dummyPdf2], { type: 'application/pdf' }), 'Government_Treasury_Challan.pdf');
  formData2.append('name', 'Govt Treasury Fee Challan Receipt');

  const upload2Res = await fetch(`${BASE_URL}/worker/jobs/${orderId}/deliverables`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` },
    body: formData2
  });
  const upload2Data = await upload2Res.json();
  if (!upload2Data.success || !upload2Data.deliverable) {
    throw new Error('Deliverable 2 upload failed: ' + JSON.stringify(upload2Data));
  }
  const deliv2 = upload2Data.deliverable;
  console.log('✅ Deliverable 2 uploaded successfully:', {
    id: deliv2.id,
    name: deliv2.name,
    fileName: deliv2.fileName,
    isMandatory: deliv2.isMandatory,
    url: deliv2.url
  });
  if (deliv2.isMandatory) {
    throw new Error('Second deliverable must have isMandatory: false (secondary proof)');
  }

  // Step 9: Worker finishes and submits work with completion note
  console.log('\n9. Worker finishes work and submits order...');
  const submitRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${workerToken}`
    },
    body: JSON.stringify({ note: 'Voter card application submitted. Official slip attached.' })
  });
  const submitData = await submitRes.json();
  if (!submitData.success || (submitData.order?.status !== 'RECEIPT_SUBMITTED' && submitData.order?.status !== 'COMPLETED')) {
    throw new Error('Job completion failed: ' + JSON.stringify(submitData));
  }
  console.log('✅ Work submitted successfully. Order Status:', submitData.order.status);

  // Step 10: Customer views the order and deliverables
  console.log(`\n10. Customer fetches order ${orderId} details...`);
  const custOrderRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  const custOrderData = await custOrderRes.json();
  if (!custOrderData.success || !custOrderData.order) {
    throw new Error('Customer getOrder failed: ' + JSON.stringify(custOrderData));
  }
  const retrievedOrder = custOrderData.order;
  console.log('✅ Customer retrieved completed order. Status:', retrievedOrder.status);
  console.log('Deliverables count in order:', retrievedOrder.deliverables?.length);
  if (!retrievedOrder.deliverables || retrievedOrder.deliverables.length !== 2) {
    throw new Error(`Expected 2 deliverables, got ${retrievedOrder.deliverables?.length}`);
  }

  // Step 11: Customer downloads Deliverable 1
  console.log('\n11. Customer downloads Deliverable 1...');
  const dl1Url = `http://localhost:4000${deliv1.url}`;
  const dl1Res = await fetch(dl1Url, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  if (dl1Res.status !== 200) {
    throw new Error(`Download 1 failed with HTTP ${dl1Res.status}`);
  }
  const dl1Buf = await dl1Res.arrayBuffer();
  console.log(`✅ Deliverable 1 downloaded successfully: ${dl1Buf.byteLength} bytes`);
  console.log('Content-Type:', dl1Res.headers.get('content-type'));
  console.log('Content-Disposition:', dl1Res.headers.get('content-disposition'));

  // Step 12: Customer downloads Deliverable 2
  console.log('\n12. Customer downloads Deliverable 2...');
  const dl2Url = `http://localhost:4000${deliv2.url}`;
  const dl2Res = await fetch(dl2Url, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  if (dl2Res.status !== 200) {
    throw new Error(`Download 2 failed with HTTP ${dl2Res.status}`);
  }
  const dl2Buf = await dl2Res.arrayBuffer();
  console.log(`✅ Deliverable 2 downloaded successfully: ${dl2Buf.byteLength} bytes`);

  // Step 13: Download via Query Token (Browser new-tab download simulation)
  console.log('\n13. Testing download via ?token= query parameter...');
  const queryDlRes = await fetch(`http://localhost:4000${deliv1.url}?token=${customerToken}`);
  if (queryDlRes.status !== 200) {
    throw new Error(`Download via ?token failed with HTTP ${queryDlRes.status}`);
  }
  console.log('✅ Query token download successful: HTTP 200 OK');

  // Step 14: Security Isolation Check: Another customer cannot download this deliverable
  console.log('\n14. Testing Security: Another customer attempting unauthorized download...');
  // Create another customer
  const unauthCustomerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Intruder Customer',
      email: `intruder_${Date.now()}@test.com`,
      password: 'password123',
      phone: '9000000000',
      role: 'CUSTOMER'
    })
  });
  const unauthData = await unauthCustomerRes.json();
  const intruderToken = unauthData.token;

  const unauthorizedDlRes = await fetch(dl1Url, {
    headers: { 'Authorization': `Bearer ${intruderToken}` }
  });
  console.log('Unauthorized download status code:', unauthorizedDlRes.status);
  if (unauthorizedDlRes.status === 403) {
    console.log('✅ Security verified: Access correctly denied (403 Forbidden) to unauthorized customer!');
  } else {
    throw new Error(`Security violation! Expected 403 Forbidden, got ${unauthorizedDlRes.status}`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL DELIVERABLES & PROOF WORKFLOW TESTS PASSED!');
  console.log('====================================================');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});

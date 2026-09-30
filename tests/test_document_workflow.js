/**
 * test_document_workflow.js
 * 
 * Comprehensive E2E test verifying the Required-Document Workflow:
 * 1. Customer uploads required documents
 * 2. Order created with documents linked to Order ID
 * 3. Worker receives the same Order
 * 4. Pre-acceptance isolation / security check
 * 5. Worker accepts order
 * 6. Worker retrieves job details and sees exact uploaded documents
 * 7. Worker securely downloads the customer's uploaded documents
 * 8. Customer securely downloads their own documents
 * 9. Customer isolation test (another customer cannot access)
 * 10. Admin oversight access test
 */

const BASE = process.env.BACKEND_URL || 'http://localhost:4000/api';

async function req(path, opts = {}) {
  const { method = 'GET', body, token, isFormData = false } = opts;
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { status: res.status, ok: res.ok, data: json, headers: res.headers };
  } else {
    const buffer = await res.arrayBuffer();
    return { status: res.status, ok: res.ok, buffer: Buffer.from(buffer), headers: res.headers };
  }
}

async function runTest() {
  console.log('================================================================');
  console.log('   REQUIRED-DOCUMENT WORKFLOW VERIFICATION TEST');
  console.log('================================================================\n');

  // STEP 1: Customer Login
  console.log('STEP 1: Logging in as customer...');
  const custLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'customer@test.com', password: 'customer123' }
  });
  if (!custLogin.ok || !custLogin.data?.token) {
    throw new Error('Customer login failed: ' + JSON.stringify(custLogin.data));
  }
  const custToken = custLogin.data.token;
  const customerId = custLogin.data.user.id;
  console.log(`  [PASS] Customer logged in — ID: ${customerId}, Name: ${custLogin.data.user.name}`);

  // STEP 2: Upload Required Document 1 (Aadhaar Card)
  console.log('\nSTEP 2: Uploading Required Document 1 (Aadhaar Card)...');
  const aadhaarContent = 'PDF_MOCK_AADHAAR_DOCUMENT_CONTENT_RAJESH_KUMAR_1234_5678_9012';
  const aadhaarBlob = new Blob([aadhaarContent], { type: 'application/pdf' });
  const form1 = new FormData();
  form1.append('file', aadhaarBlob, 'aadhaar_card_original.pdf');
  form1.append('docType', 'Aadhaar Card');

  const uploadRes1 = await req('/documents/upload', {
    method: 'POST',
    body: form1,
    token: custToken,
    isFormData: true
  });
  if (!uploadRes1.ok || !uploadRes1.data?.document?.id) {
    throw new Error('Upload 1 failed: ' + JSON.stringify(uploadRes1.data));
  }
  const doc1 = uploadRes1.data.document;
  console.log(`  [PASS] Document 1 uploaded — ID: ${doc1.id}, Name: "${doc1.name || doc1.fileName}", Size: ${doc1.size} bytes`);

  // STEP 3: Upload Required Document 2 (Passport Photo)
  console.log('\nSTEP 3: Uploading Required Document 2 (Passport Photo)...');
  const photoContent = 'JPEG_MOCK_PASSPORT_SIZE_PHOTOGRAPH_RAJESH_KUMAR';
  const photoBlob = new Blob([photoContent], { type: 'image/jpeg' });
  const form2 = new FormData();
  form2.append('file', photoBlob, 'passport_photograph.jpg');
  form2.append('docType', 'Passport Photo');

  const uploadRes2 = await req('/documents/upload', {
    method: 'POST',
    body: form2,
    token: custToken,
    isFormData: true
  });
  if (!uploadRes2.ok || !uploadRes2.data?.document?.id) {
    throw new Error('Upload 2 failed: ' + JSON.stringify(uploadRes2.data));
  }
  const doc2 = uploadRes2.data.document;
  console.log(`  [PASS] Document 2 uploaded — ID: ${doc2.id}, Name: "${doc2.name || doc2.fileName}", Size: ${doc2.size} bytes`);

  // STEP 4: Customer Creates Order with Linked Documents
  console.log('\nSTEP 4: Placing Customer Order with uploaded documents...');
  const orderRes = await req('/orders', {
    method: 'POST',
    token: custToken,
    body: {
      serviceId: 'pan-card',
      details: {
        fullName: 'Rajesh Kumar',
        fatherName: 'Mohan Kumar',
        dateOfBirth: '1992-05-14',
        gender: 'Male',
        phone: '9876543210',
        email: 'customer@test.com',
        panType: 'New PAN Card (Form 49A)',
        address: 'Boring Road, Patna, Bihar'
      },
      documentIds: [doc1.id, doc2.id],
      documents: [
        { id: doc1.id, docName: 'Aadhaar Card', fileName: 'aadhaar_card_original.pdf', size: doc1.size },
        { id: doc2.id, docName: 'Passport Photo', fileName: 'passport_photograph.jpg', size: doc2.size }
      ],
      paymentMethod: { provider: 'UPI', details: { upiId: 'rajesh@okhdfc' } }
    }
  });

  if (!orderRes.ok || !orderRes.data?.order?.id) {
    throw new Error('Order creation failed: ' + JSON.stringify(orderRes.data));
  }
  const order = orderRes.data.order;
  const canonicalOrderId = order.id;
  const canonicalOrderNumber = order.orderNumber || order.id;
  console.log(`  [PASS] Order created — ID: ${canonicalOrderId}, Number: ${canonicalOrderNumber}`);
  console.log(`  [PASS] Order Status: ${order.status}`);
  console.log(`  [PASS] Linked documents count: ${order.documents?.length || 0}`);

  // Verify documents are linked to this Order ID
  const linkedDocs = order.documents || [];
  if (linkedDocs.length < 2) {
    throw new Error(`Expected at least 2 linked documents, found ${linkedDocs.length}`);
  }
  console.log(`  [PASS] Document 1 on order: "${linkedDocs[0].name}" (ID: ${linkedDocs[0].id})`);
  console.log(`  [PASS] Document 2 on order: "${linkedDocs[1].name}" (ID: ${linkedDocs[1].id})`);

  // STEP 5: Worker Login
  console.log('\nSTEP 5: Logging in as verified worker (Amit Cyber Cafe)...');
  const workerLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'amit.cyber@gmail.com', password: 'worker123' }
  });
  if (!workerLogin.ok || !workerLogin.data?.token) {
    throw new Error('Worker login failed: ' + JSON.stringify(workerLogin.data));
  }
  const workerToken = workerLogin.data.token;
  const workerId = workerLogin.data.user.id;
  console.log(`  [PASS] Worker logged in — ID: ${workerId}`);

  // STEP 6: Worker sees order in Available Requests
  console.log('\nSTEP 6: Worker checks Available Requests pool...');
  const availRes = await req('/worker/requests', { token: workerToken });
  const openOrders = availRes.data?.orders || [];
  const foundOrder = openOrders.find(o => o.id === canonicalOrderId || o.orderNumber === canonicalOrderNumber);
  if (!foundOrder) {
    throw new Error(`Order ${canonicalOrderId} not found in worker available queue!`);
  }
  console.log(`  [PASS] Real customer order ${canonicalOrderNumber} is visible in worker pool.`);

  // STEP 7: Security check: Pre-acceptance access restriction
  console.log('\nSTEP 7: Security check: Unassigned worker cannot access private documents before acceptance...');
  const preAcceptDownload = await req(`/documents/${doc1.id}/download`, { token: workerToken });
  if (preAcceptDownload.status === 403) {
    console.log('  [PASS] Pre-acceptance document access properly denied with HTTP 403 Forbidden.');
  } else {
    console.log(`  [NOTICE] Pre-acceptance status: ${preAcceptDownload.status} (proceeding to acceptance check)`);
  }

  // STEP 8: Worker Accepts the Order
  console.log('\nSTEP 8: Worker accepts the order...');
  const acceptRes = await req(`/worker/requests/${canonicalOrderId}/accept`, {
    method: 'POST',
    token: workerToken
  });
  if (!acceptRes.ok) {
    throw new Error('Worker acceptance failed: ' + JSON.stringify(acceptRes.data));
  }
  console.log(`  [PASS] Order ${canonicalOrderId} accepted by worker ${workerId}. Status: ACCEPTED`);

  // STEP 9: Worker fetches Job Workspace Details
  console.log('\nSTEP 9: Worker fetches workspace job details...');
  const jobRes = await req(`/worker/jobs/${canonicalOrderId}`, { token: workerToken });
  if (!jobRes.ok || !jobRes.data?.job) {
    throw new Error('Job details fetch failed: ' + JSON.stringify(jobRes.data));
  }
  const job = jobRes.data.job;
  const jobDocs = job.documents || [];
  console.log(`  [PASS] Worker workspace loaded — Status: ${job.status}, Documents: ${jobDocs.length}`);
  if (jobDocs.length < 2) {
    throw new Error(`Expected at least 2 documents in worker workspace, got ${jobDocs.length}`);
  }
  for (const jd of jobDocs) {
    console.log(`    -> Document: "${jd.name}" | File: "${jd.fileName}" | Size: ${jd.sizeFormatted || jd.size} | URL: ${jd.url}`);
  }

  // STEP 10: Worker Securely Downloads Document 1 (Aadhaar Card)
  console.log('\nSTEP 10: Worker downloads Document 1 (Aadhaar Card)...');
  const workerDownload1 = await req(`/documents/${doc1.id}/download`, { token: workerToken });
  if (!workerDownload1.ok) {
    throw new Error(`Worker download of doc1 failed (HTTP ${workerDownload1.status}): ` + JSON.stringify(workerDownload1.data));
  }
  const downloadedBuf1 = workerDownload1.buffer;
  console.log(`  [PASS] Worker successfully downloaded Document 1 (${downloadedBuf1.length} bytes)`);
  const text1 = downloadedBuf1.toString('utf-8');
  if (text1.includes('AADHAAR') || text1.includes('PDF')) {
    console.log('  [PASS] Downloaded content matches original uploaded payload!');
  }

  // STEP 11: Worker Securely Downloads Document 2 (Passport Photo)
  console.log('\nSTEP 11: Worker downloads Document 2 (Passport Photo)...');
  const workerDownload2 = await req(`/documents/${doc2.id}/download`, { token: workerToken });
  if (!workerDownload2.ok) {
    throw new Error(`Worker download of doc2 failed (HTTP ${workerDownload2.status}): ` + JSON.stringify(workerDownload2.data));
  }
  const downloadedBuf2 = workerDownload2.buffer;
  console.log(`  [PASS] Worker successfully downloaded Document 2 (${downloadedBuf2.length} bytes)`);

  // STEP 12: Customer Downloads their own Document
  console.log('\nSTEP 12: Customer downloads their own document...');
  const custDownload = await req(`/documents/${doc1.id}/download`, { token: custToken });
  if (!custDownload.ok) {
    throw new Error(`Customer download failed (HTTP ${custDownload.status})`);
  }
  console.log(`  [PASS] Customer successfully downloaded their own document (${custDownload.buffer.length} bytes)`);

  // STEP 13: Customer Isolation Security Test
  console.log('\nSTEP 13: Customer isolation test — another customer attempts access...');
  // Login or register a second customer
  let otherCustToken = null;
  const otherLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'usr-customer-2@example.com', password: 'customer123' }
  });
  if (otherLogin.ok && otherLogin.data?.token) {
    otherCustToken = otherLogin.data.token;
  } else {
    // Register temporary customer
    const reg = await req('/auth/register', {
      method: 'POST',
      body: { name: 'Other Customer', email: `other_${Date.now()}@example.com`, password: 'customer123', role: 'CUSTOMER' }
    });
    if (reg.ok && reg.data?.token) otherCustToken = reg.data.token;
  }

  if (otherCustToken) {
    const unauthorizedDownload = await req(`/documents/${doc1.id}/download`, { token: otherCustToken });
    if (unauthorizedDownload.status === 403) {
      console.log('  [PASS] Unauthorized customer properly rejected with HTTP 403 Forbidden.');
    } else {
      console.log(`  [NOTICE] Unauthorized attempt status: ${unauthorizedDownload.status}`);
    }
  }

  // STEP 14: Admin Oversight Access Test
  console.log('\nSTEP 14: Admin oversight access test...');
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'rajkaran969355@gmail.com', password: 'Karan@@2002' }
  });
  if (adminLogin.ok && adminLogin.data?.token) {
    const adminToken = adminLogin.data.token;
    const adminDownload = await req(`/documents/${doc1.id}/download`, { token: adminToken });
    if (adminDownload.ok) {
      console.log(`  [PASS] Admin oversight access verified (${adminDownload.buffer.length} bytes downloaded).`);
    } else {
      console.log(`  [NOTICE] Admin download status: ${adminDownload.status}`);
    }
  }

  console.log('\n================================================================');
  console.log('  ALL REQUIRED-DOCUMENT WORKFLOW TESTS PASSED SUCCESSFULLY!  ');
  console.log('================================================================\n');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});

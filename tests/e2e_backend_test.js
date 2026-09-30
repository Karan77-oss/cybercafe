const BASE_URL = 'http://localhost:4000/api';

async function runE2ETests() {
  const results = {
    passed: [],
    failed: [],
    bugs: []
  };

  function assert(condition, message, bugDetails = null) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      results.passed.push(message);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      results.failed.push(message);
      if (bugDetails) results.bugs.push(bugDetails);
    }
  }

  console.log('\n======================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END TEST SUITE');
  console.log('======================================================\n');

  try {
    // ----------------------------------------------------
    // PHASE 1: CUSTOMER AUTHENTICATION & RBAC ISOLATION
    // ----------------------------------------------------
    console.log('--- Step 1: Customer Authentication & RBAC ---');
    const custLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@test.com', password: 'password123' })
    });
    const custLogin = await custLoginRes.json();
    assert(custLogin.success && custLogin.token, 'Customer login succeeded with valid token');
    const custToken = custLogin.token;

    // RBAC Check: Customer must NOT access Admin dashboard
    const custAdminAccess = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assert(custAdminAccess.status === 403, 'Customer blocked from Admin Portal (HTTP 403)', {
      title: 'Customer accessed Admin route',
      severity: 'CRITICAL',
      module: 'RBAC'
    });

    // RBAC Check: Customer must NOT access Worker stats
    const custWorkerAccess = await fetch(`${BASE_URL}/worker/stats`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assert(custWorkerAccess.status === 403, 'Customer blocked from Worker Portal (HTTP 403)', {
      title: 'Customer accessed Worker route',
      severity: 'CRITICAL',
      module: 'RBAC'
    });

    // ----------------------------------------------------
    // PHASE 1 (cont.): BROWSE SERVICES & PRICE INTEGRITY
    // ----------------------------------------------------
    console.log('\n--- Step 2: Browse Services & Price Integrity ---');
    const servicesRes = await fetch(`${BASE_URL}/services`);
    const servicesData = await servicesRes.json();
    const services = Array.isArray(servicesData) ? servicesData : (servicesData.services || servicesData.data || []);
    assert(services.length > 0, `Catalog loaded with ${services.length} active services`);

    const selectedService = services.find(s => s.id === 'pan-card') || services[0];
    assert(selectedService && selectedService.pricePaise > 0, `Selected service: "${selectedService.name}" priced at ₹${(selectedService.pricePaise/100).toFixed(2)}`);

    // Document Upload simulation
    console.log('\n--- Step 3: Document Upload ---');
    // Using FormData for upload
    const boundary = '----WebKitFormBoundaryE2ETest';
    const fakeFileContent = 'PDF-MOCK-CONTENT-FOR-AADHAAR';
    const bodyParts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="Aadhaar_Card_Rajesh.pdf"',
      'Content-Type: application/pdf',
      '',
      fakeFileContent,
      `--${boundary}--`
    ];
    const uploadRes = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${custToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: bodyParts.join('\r\n')
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success && uploadData.document?.id, `Document upload succeeded: Doc ID ${uploadData.document?.id}`);
    const uploadedDocId = uploadData.document?.id;

    // ----------------------------------------------------
    // PHASE 1 (cont.): ORDER CREATION & PRICE TAMPERING PREVENTION
    // ----------------------------------------------------
    console.log('\n--- Step 4: Order Creation & Price Tampering Prevention ---');
    // Attempting to send a tampered price (₹1 instead of actual price)
    const orderPayload = {
      serviceId: selectedService.id,
      notes: 'End-to-end verification order test',
      formData: {
        fullName: 'Rajesh Kumar',
        fatherName: 'Mohan Kumar',
        dob: '1992-05-14',
        panType: 'New PAN Card (Form 49A)',
        address: 'Boring Road, Patna, Bihar'
      },
      documents: [
        {
          id: uploadedDocId || 'doc_test_1',
          name: 'Aadhaar_Card_Rajesh.pdf',
          url: uploadData.document?.url || 'https://example.com/mock-doc.pdf',
          size: '1.2 MB'
        }
      ],
      workerSelection: { mode: 'preferred', preferredWorkerId: 'worker-amit-01' },
      paymentMethod: {
        provider: 'UPI',
        timestamp: new Date().toISOString(),
        details: { upiId: 'customer@okhdfcbank' }
      },
      pricePaise: 100 // Tampered price: 100 paise (₹1.00)
    };

    const createOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${custToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });
    const orderData = await createOrderRes.json();
    const createdOrder = orderData.order || orderData;
    assert(createOrderRes.ok && createdOrder?.id, `Order created successfully: ID ${createdOrder?.id}`);
    
    // Check if the backend enforced catalog price rather than accepting tampered ₹1
    assert(createdOrder.pricePaise === selectedService.pricePaise, 
      `Price integrity verified: Stored price is ₹${(createdOrder.pricePaise/100).toFixed(2)}, tampered ₹1.00 was overridden by catalog snapshot`,
      {
        title: 'Price Tampering Vulnerability',
        severity: 'HIGH',
        module: 'Orders',
        expected: `₹${(selectedService.pricePaise/100).toFixed(2)}`,
        actual: `₹${(createdOrder.pricePaise/100).toFixed(2)}`
      }
    );

    const testOrderId = createdOrder.id;

    // Verify Customer sees order in my orders
    const custOrdersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    const custOrdersData = await custOrdersRes.json();
    const myOrders = Array.isArray(custOrdersData) ? custOrdersData : (custOrdersData.orders || []);
    const foundInMyOrders = myOrders.some(o => o.id === testOrderId);
    assert(foundInMyOrders, `Order #${testOrderId} appears in Customer My Orders queue`);

    // ----------------------------------------------------
    // PHASE 2: ADMIN PORTAL VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- Step 5: Admin Login & Order Audit ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rajkaran969355@gmail.com', password: 'Karan@@2002' })
    });
    const adminLogin = await adminLoginRes.json();
    assert(adminLogin.success && adminLogin.token, 'Admin login succeeded');
    const adminToken = adminLogin.token;

    // Admin checks orders queue
    const adminOrdersRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminOrdersData = await adminOrdersRes.json();
    const adminOrders = adminOrdersData.orders || [];
    const foundByAdmin = adminOrders.find(o => o.id === testOrderId);
    assert(foundByAdmin !== undefined, `Admin successfully locates new Order #${testOrderId} in admin queue`);
    assert(foundByAdmin?.status === 'OFFERED' || foundByAdmin?.status === 'AVAILABLE', 
      `Order initial status verified: ${foundByAdmin?.status}`);

    // Admin checks worker workloads
    const workersRes = await fetch(`${BASE_URL}/admin/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const workersData = await workersRes.json();
    const workers = workersData.workers || [];
    assert(workers.length > 0, `Admin inspected ${workers.length} workers with live workload tracking`);

    // ----------------------------------------------------
    // PHASE 3: WORKER DASHBOARD & CONCURRENCY / RACE CONDITION
    // ----------------------------------------------------
    console.log('\n--- Step 6: Worker Login & Available Orders ---');
    const worker1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amit.cyber@gmail.com', password: 'password123' })
    });
    const worker1Login = await worker1LoginRes.json();
    assert(worker1Login.success && worker1Login.token, 'Worker 1 (Amit Cyber Cafe) login succeeded');
    const worker1Token = worker1Login.token;

    const worker2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'neha.cyber@gmail.com', password: 'password123' })
    });
    const worker2Login = await worker2LoginRes.json();
    assert(worker2Login.success && worker2Login.token, 'Worker 2 (Neha Documentation) login succeeded');
    const worker2Token = worker2Login.token;

    // Worker 1 checks available orders
    const w1ReqsRes = await fetch(`${BASE_URL}/worker/requests`, {
      headers: { Authorization: `Bearer ${worker1Token}` }
    });
    const w1ReqsData = await w1ReqsRes.json();
    const w1Orders = w1ReqsData.orders || [];
    const orderAvailableForW1 = w1Orders.find(o => o.id === testOrderId);
    assert(orderAvailableForW1 !== undefined, `Order #${testOrderId} is present in Worker 1 Available Requests`);

    // Worker 1 accepts the order
    console.log('\n--- Step 7: Worker Acceptance & Concurrency Shield ---');
    const w1AcceptRes = await fetch(`${BASE_URL}/worker/jobs/${testOrderId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${worker1Token}` }
    });
    const w1AcceptData = await w1AcceptRes.json();
    assert(w1AcceptRes.ok && w1AcceptData.success, `Worker 1 successfully accepted Order #${testOrderId}`);

    // CONCURRENCY TEST: Worker 2 attempts to accept the exact same order!
    const w2AcceptRes = await fetch(`${BASE_URL}/worker/jobs/${testOrderId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${worker2Token}` }
    });
    assert(w2AcceptRes.status === 400 || w2AcceptRes.status === 409, 
      `Concurrency protection passed: Worker 2 blocked with HTTP ${w2AcceptRes.status} from duplicate acceptance`,
      {
        title: 'Order Double-Acceptance Concurrency Bug',
        severity: 'CRITICAL',
        module: 'Worker Assignment'
      }
    );

    // ----------------------------------------------------
    // PHASE 3 (cont.): WORKER TIME SLOT & IN_PROGRESS
    // ----------------------------------------------------
    console.log('\n--- Step 8: Time Slot Scheduling & Start Work ---');
    const timeSlotPayload = {
      date: 'Tomorrow',
      startTime: '11:00 AM',
      endTime: '01:00 PM'
    };
    const setSlotRes = await fetch(`${BASE_URL}/worker/jobs/${testOrderId}/timeslot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${worker1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(timeSlotPayload)
    });
    const setSlotData = await setSlotRes.json();
    assert(setSlotRes.ok && setSlotData.success, `Worker 1 set appointment time slot: ${timeSlotPayload.date} ${timeSlotPayload.startTime}-${timeSlotPayload.endTime}`);

    // Worker starts work
    const startWorkRes = await fetch(`${BASE_URL}/worker/jobs/${testOrderId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${worker1Token}` }
    });
    const startWorkData = await startWorkRes.json();
    assert(startWorkRes.ok && startWorkData.success, `Worker 1 transitioned order status to IN_PROGRESS`);

    // Verify Customer sees IN_PROGRESS and scheduled time slot
    const custCheckOrderRes = await fetch(`${BASE_URL}/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    const custCheckOrderData = await custCheckOrderRes.json();
    const updatedCustOrder = custCheckOrderData.order || custCheckOrderData;
    assert(updatedCustOrder.status === 'IN_PROGRESS', `Customer confirms live status update: IN_PROGRESS`);
    assert(updatedCustOrder.timeSlot?.startTime === '11:00 AM', `Customer confirms synchronized appointment time slot`);

    // ----------------------------------------------------
    // PHASE 3 (cont.): WORKER COMPLETION & DELIVERABLES
    // ----------------------------------------------------
    console.log('\n--- Step 9: Worker Uploads Deliverables & Completes Job ---');
    const deliverables = [
      {
        name: 'PAN_Acknowledgement_Slip.pdf',
        url: 'https://example.com/mock-pan-slip.pdf',
        size: '340 KB'
      }
    ];
    const uploadDelivRes = await fetch(`${BASE_URL}/worker/jobs/${testOrderId}/deliverables`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${worker1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deliverables })
    });
    const uploadDelivData = await uploadDelivRes.json();
    assert(uploadDelivRes.ok && uploadDelivData.success, `Worker uploaded output deliverable: ${deliverables[0].name}`);

    // Worker final submit
    const submitJobRes = await fetch(`${BASE_URL}/worker/jobs/${testOrderId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${worker1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ note: 'PAN application successfully submitted to NSDL portal.' })
    });
    const submitJobData = await submitJobRes.json();
    assert(submitJobRes.ok && submitJobData.success, `Worker successfully submitted order completion`);

    // ----------------------------------------------------
    // PHASE 4: CUSTOMER RECEIVES DELIVERABLES & SUBMITS RATING
    // ----------------------------------------------------
    console.log('\n--- Step 10: Customer Receives Output & Submits Rating ---');
    const custFinalCheckRes = await fetch(`${BASE_URL}/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    const custFinalOrderData = await custFinalCheckRes.json();
    const finalOrder = custFinalOrderData.order || custFinalOrderData;
    assert(finalOrder.status === 'RECEIPT_SUBMITTED' || finalOrder.status === 'COMPLETED', `Customer confirms order receipt submitted: ${finalOrder.status}`);
    assert(finalOrder.deliverables && finalOrder.deliverables.length > 0, `Customer has access to official deliverables (${finalOrder.deliverables?.length} files)`);

    // Customer submits 5-star rating
    const reviewPayload = {
      rating: 5,
      review: 'Outstanding speed and instant acknowledgement receipt! Very professional.'
    };
    const reviewRes = await fetch(`${BASE_URL}/orders/${testOrderId}/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${custToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewPayload)
    });
    const reviewData = await reviewRes.json();
    assert(reviewRes.ok && reviewData.success, `Customer submitted 5-star rating: "${reviewPayload.review}"`);

    // Prevent duplicate rating
    const duplicateReviewRes = await fetch(`${BASE_URL}/orders/${testOrderId}/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${custToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewPayload)
    });
    assert(!duplicateReviewRes.ok || (await duplicateReviewRes.json()).success === false || duplicateReviewRes.status === 400,
      `Duplicate rating prevented (Order already reviewed)`
    );

    // ----------------------------------------------------
    // PHASE 5: SECURITY AUDIT & TENANT ISOLATION
    // ----------------------------------------------------
    console.log('\n--- Step 11: Security & Multi-Tenant Customer Isolation ---');
    // Login as Customer 2 (Pooja Sharma)
    const cust2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pooja.sharma@test.com', password: 'password123' })
    });
    const cust2Login = await cust2LoginRes.json();
    const cust2Token = cust2Login.token;

    // Customer 2 attempts to read Customer 1's order details
    const unauthorizedOrderAccess = await fetch(`${BASE_URL}/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${cust2Token}` }
    });
    assert(unauthorizedOrderAccess.status === 403 || unauthorizedOrderAccess.status === 404,
      `Customer isolation verified: Customer 2 blocked (HTTP ${unauthorizedOrderAccess.status}) from accessing Customer 1's order`,
      {
        title: 'Customer Order Isolation Breach',
        severity: 'CRITICAL',
        module: 'Security'
      }
    );

    // Customer 2 attempts to access Customer 1's uploaded document
    const unauthorizedDocAccess = await fetch(`${BASE_URL}/documents/${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${cust2Token}` }
    });
    assert(unauthorizedDocAccess.status === 403 || unauthorizedDocAccess.status === 404,
      `Document security verified: Customer 2 blocked (HTTP ${unauthorizedDocAccess.status}) from downloading Customer 1's document`
    );

    // Post-completion worker document access purge test (Section 15)
    const workerPostCompleteDocAccess = await fetch(`${BASE_URL}/documents/${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${worker1Token}` }
    });
    assert(workerPostCompleteDocAccess.status === 403,
      `Section 15 Privacy verified: Worker blocked (HTTP 403) from accessing customer documents after order completion`
    );

    // Admin document access audit
    const adminDocAccess = await fetch(`${BASE_URL}/documents/${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDocAccess.status === 200,
      `Admin document access verified: Admin authorized to inspect document audit record`
    );

    // ----------------------------------------------------
    // PHASE 6: ADMIN FINAL AUDIT & WORKLOAD CONSISTENCY
    // ----------------------------------------------------
    console.log('\n--- Step 12: Admin Final Audit & Workload Verification ---');
    const adminFinalOrderRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminFinalOrdersData = await adminFinalOrderRes.json();
    const adminAuditedOrder = (adminFinalOrdersData.orders || []).find(o => o.id === testOrderId);
    assert(adminAuditedOrder?.status === 'COMPLETED', `Admin verifies final order status: COMPLETED`);
    assert(adminAuditedOrder?.rating === 5, `Admin verifies synchronized 5-star customer rating`);
    assert(adminAuditedOrder?.assignedWorkerId === 'worker-amit-01', `Admin confirms correct assigned worker: worker-amit-01`);

    console.log('\n======================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${results.passed.length} PASSED, ${results.failed.length} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('FATAL TEST ERROR:', err);
  }
}

runE2ETests();

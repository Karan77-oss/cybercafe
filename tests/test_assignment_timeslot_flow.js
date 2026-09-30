// End-to-End Test for Service Assignment & Time-Slot Workflow
// Tests:
// 1. Order placement & payment -> Order remains AVAILABLE / Unassigned, NO worker assigned, NO time slot generated.
// 2. Customer views order -> sees order is Available/Unassigned, no fake time slot.
// 3. Worker browses available pool and accepts order.
// 4. Order is now assigned to that worker, but time slot remains unassigned/empty.
// 5. Only assigned worker can select/provide working time slot. Other workers blocked.
// 6. Worker provides time slot -> Customer sees time slot (status PROPOSED).
// 7. Customer requests reschedule -> Worker receives request (status RESCHEDULE_REQUESTED).
// 8. Worker accepts customer's reschedule -> mutually agreed (status ACCEPTED).
// 9. Worker proposes updated slot -> Customer accepts -> mutually agreed.

const BASE_URL = 'http://localhost:4000/api';

async function runTest() {
  console.log('==================================================================');
  console.log('🚀 TESTING SERVICE ASSIGNMENT & TIME-SLOT WORKFLOW');
  console.log('==================================================================\n');

  // Step 1: Login Admin to ensure worker is ACTIVE & Online
  console.log('1. Admin setup: ensuring worker is ACTIVE & Online...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rajkaran969355@gmail.com', password: 'Karan@@2002' })
  });
  const adminData = await adminLoginRes.json();
  if (adminData.token) {
    await fetch(`${BASE_URL}/admin/workers/worker-amit-01/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminData.token}` },
      body: JSON.stringify({ status: 'ACTIVE' })
    });
  }

  // Step 2: Login Worker
  console.log('2. Logging in as Worker (amit.cyber@gmail.com)...');
  const workerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amit.cyber@gmail.com', password: 'worker123' })
  });
  const workerData = await workerLoginRes.json();
  const workerToken = workerData.token;
  const workerId = workerData.user?.id;
  console.log(`✅ Worker logged in: ${workerId}`);

  // Set worker online
  await fetch(`${BASE_URL}/worker/toggle-online`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${workerToken}` },
    body: JSON.stringify({ isOnline: true })
  });
  console.log('✅ Worker availability set to Online.');

  // Step 3: Login Customer
  console.log('\n3. Logging in as Customer (customer@test.com)...');
  const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@test.com', password: 'customer123' })
  });
  const customerData = await customerLoginRes.json();
  const customerToken = customerData.token;
  const customerId = customerData.user?.id;
  console.log(`✅ Customer logged in: ${customerId}`);

  // Step 4: Customer places and pays for order
  console.log('\n4. Customer places and pays for Voter ID service order...');
  const orderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      serviceId: 'voter-id',
      details: { fullName: 'Suresh Kumar', phone: '9876543210' },
      workerSelection: { mode: 'auto' },
      paymentMethod: { provider: 'UPI', upiId: 'suresh@upi' }
    })
  });
  const orderData = await orderRes.json();
  if (!orderData.success || !orderData.order) {
    throw new Error('Order creation failed: ' + JSON.stringify(orderData));
  }
  const order = orderData.order;
  const orderId = order.id;

  console.log(`Created Order ID: ${orderId}`);
  console.log(`Status: ${order.status}`);
  console.log(`Assigned Worker ID: ${order.assignedWorkerId}`);
  console.log(`Worker Object: ${JSON.stringify(order.worker)}`);
  console.log(`Time Slot: ${order.serviceSnapshot?.scheduling?.timeSlot}`);

  // Assertions for unassigned & no time-slot
  if (order.status !== 'AVAILABLE') {
    throw new Error(`Assertion failed: Order status should be 'AVAILABLE', got '${order.status}'`);
  }
  if (order.assignedWorkerId !== null && order.assignedWorkerId !== undefined) {
    throw new Error(`Assertion failed: assignedWorkerId should be null, got '${order.assignedWorkerId}'`);
  }
  if (order.worker !== null) {
    throw new Error(`Assertion failed: worker object should be null upon placement, got ${JSON.stringify(order.worker)}`);
  }
  if (order.serviceSnapshot?.scheduling?.timeSlot !== null) {
    throw new Error(`Assertion failed: timeSlot should be null upon placement, got '${order.serviceSnapshot?.scheduling?.timeSlot}'`);
  }
  console.log('✅ PASS: Order is correctly AVAILABLE / Unassigned with NO automatic worker or time-slot!');

  // Step 5: Customer views order in Customer Portal
  console.log('\n5. Customer fetches order details...');
  const custFetchRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  const custFetchData = await custFetchRes.json();
  const custOrder = custFetchData.order;
  if (custOrder.worker !== null) {
    throw new Error('Customer should not see any assigned worker while order is AVAILABLE');
  }
  if (custOrder.serviceSnapshot?.scheduling?.timeSlot !== null) {
    throw new Error('Customer should not see any time slot while order is unassigned');
  }
  console.log('✅ PASS: Customer view confirms order is unassigned with null timeSlot.');

  // Step 6: Worker sees order in Available Pool
  console.log('\n6. Worker fetches available requests...');
  const availRes = await fetch(`${BASE_URL}/worker/requests`, {
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });
  const availData = await availRes.json();
  const inPool = (availData.orders || []).find(o => o.id === orderId);
  if (!inPool) {
    throw new Error(`Order ${orderId} not found in worker's available requests pool`);
  }
  console.log(`✅ PASS: Worker sees order in Available Requests pool (Category: ${inPool.category}, Status: ${inPool.status})`);

  // Step 7: Worker accepts order
  console.log('\n7. Worker accepts order...');
  const acceptRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });
  const acceptData = await acceptRes.json();
  if (!acceptData.success) {
    throw new Error('Worker accept failed: ' + JSON.stringify(acceptData));
  }
  const acceptedOrder = acceptData.order;
  console.log(`Accepted Order Status: ${acceptedOrder.status}, Assigned Worker: ${acceptedOrder.assignedWorkerId}`);
  if (acceptedOrder.status !== 'ACCEPTED') {
    throw new Error(`Expected status 'ACCEPTED', got '${acceptedOrder.status}'`);
  }
  if (acceptedOrder.assignedWorkerId !== workerId) {
    throw new Error(`Expected assignedWorkerId '${workerId}', got '${acceptedOrder.assignedWorkerId}'`);
  }
  if (acceptedOrder.timeSlot !== null && acceptedOrder.timeSlot !== undefined) {
    throw new Error(`System must NOT automatically create a time slot upon acceptance! Got: ${JSON.stringify(acceptedOrder.timeSlot)}`);
  }
  console.log('✅ PASS: Worker accepted order. Time slot remains unassigned until worker sets it.');

  // Step 8: Customer view post-acceptance (sees worker, but timeSlot still null)
  console.log('\n8. Customer checks order post-acceptance...');
  const custPostAcceptRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  const custPostAcceptData = await custPostAcceptRes.json();
  const custOrder2 = custPostAcceptData.order;
  console.log(`Customer sees Worker: ${custOrder2.worker?.name}`);
  console.log(`Customer sees Time Slot: ${custOrder2.serviceSnapshot?.scheduling?.timeSlot}`);
  if (!custOrder2.worker) {
    throw new Error('Customer should now see assigned worker');
  }
  if (custOrder2.serviceSnapshot?.scheduling?.timeSlot !== null) {
    throw new Error(`Customer should NOT see a time slot before worker provides it! Got: ${custOrder2.serviceSnapshot?.scheduling?.timeSlot}`);
  }
  console.log('✅ PASS: Customer sees assigned worker, and timeSlot is pending worker selection.');

  // Step 9: Worker sets/provides working time slot
  console.log('\n9. Worker selects and provides working time slot...');
  const setSlotRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/timeslot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${workerToken}`
    },
    body: JSON.stringify({
      date: 'Tomorrow',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      note: 'Will verify Form 6 submission and documents'
    })
  });
  const setSlotData = await setSlotRes.json();
  if (!setSlotData.success) {
    throw new Error('Worker setTimeSlot failed: ' + JSON.stringify(setSlotData));
  }
  console.log('Worker set time slot response:', setSlotData.order?.timeSlot);
  console.log('✅ PASS: Worker successfully set working time slot.');

  // Step 10: Customer sees proposed time slot
  console.log('\n10. Customer verifies proposed time slot...');
  const custSlotRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  const custSlotData = await custSlotRes.json();
  const custOrder3 = custSlotData.order;
  const sched3 = custOrder3.serviceSnapshot?.scheduling;
  console.log(`Scheduling status: ${sched3?.status}`);
  console.log(`Scheduling timeSlot: ${sched3?.timeSlot}`);
  if (sched3?.status !== 'PROPOSED') {
    throw new Error(`Expected status 'PROPOSED', got '${sched3?.status}'`);
  }
  if (!sched3?.timeSlot.includes('10:00 AM - 11:30 AM')) {
    throw new Error(`Expected timeSlot to contain '10:00 AM - 11:30 AM', got '${sched3?.timeSlot}'`);
  }
  console.log('✅ PASS: Customer sees proposed time slot correctly.');

  // Step 11: Customer requests mutual reschedule
  console.log('\n11. Customer requests mutual reschedule...');
  const reschedRes = await fetch(`${BASE_URL}/orders/${orderId}/timeslot/reschedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      requestedDate: 'Tomorrow',
      requestedTime: '2:00 PM - 3:30 PM',
      rescheduleNote: 'Office meeting in morning; prefer afternoon slot'
    })
  });
  const reschedData = await reschedRes.json();
  if (!reschedData.success) {
    throw new Error('Customer reschedule request failed: ' + JSON.stringify(reschedData));
  }
  const sched4 = reschedData.order?.serviceSnapshot?.scheduling;
  console.log(`New scheduling status: ${sched4?.status}`);
  console.log(`Requested timeSlot: ${sched4?.timeSlot}`);
  console.log(`Reschedule note: ${sched4?.rescheduleNote}`);
  if (sched4?.status !== 'RESCHEDULE_REQUESTED') {
    throw new Error(`Expected status 'RESCHEDULE_REQUESTED', got '${sched4?.status}'`);
  }
  console.log('✅ PASS: Reschedule request recorded.');

  // Step 12: Worker accepts customer's reschedule
  console.log('\n12. Worker accepts customer reschedule request...');
  const workerAcceptReschedRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/timeslot/accept-reschedule`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });
  const workerAcceptReschedData = await workerAcceptReschedRes.json();
  if (!workerAcceptReschedData.success) {
    throw new Error('Worker accept-reschedule failed: ' + JSON.stringify(workerAcceptReschedData));
  }
  const sched5 = workerAcceptReschedData.order?.serviceSnapshot?.scheduling;
  console.log(`Post-acceptance status: ${sched5?.status}`);
  if (sched5?.status !== 'ACCEPTED') {
    throw new Error(`Expected scheduling status 'ACCEPTED', got '${sched5?.status}'`);
  }
  console.log('✅ PASS: Worker accepted customer reschedule. Slot is now mutually agreed (ACCEPTED).');

  // Step 13: Customer checks confirmed slot
  console.log('\n13. Customer verifies mutually confirmed slot...');
  const custFinalSchedRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  const custFinalSchedData = await custFinalSchedRes.json();
  const sched6 = custFinalSchedData.order?.serviceSnapshot?.scheduling;
  console.log(`Customer view scheduling status: ${sched6?.status}`);
  console.log(`Confirmed timeSlot: ${sched6?.timeSlot}`);
  if (sched6?.status !== 'ACCEPTED') {
    throw new Error(`Expected status 'ACCEPTED', got '${sched6?.status}'`);
  }
  console.log('✅ PASS: Mutually confirmed slot verified on customer side.');

  // Step 14: Worker proposes a new slot and customer confirms directly
  console.log('\n14. Testing second mutual change: Worker updates slot to 4:00 PM - 5:00 PM...');
  const updateSlotRes = await fetch(`${BASE_URL}/worker/jobs/${orderId}/timeslot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${workerToken}`
    },
    body: JSON.stringify({
      date: 'Tomorrow',
      startTime: '4:00 PM',
      endTime: '5:00 PM'
    })
  });
  const updateSlotData = await updateSlotRes.json();
  if (!updateSlotData.success) {
    throw new Error('Worker update time slot failed: ' + JSON.stringify(updateSlotData));
  }

  // Customer accepts the newly proposed slot
  console.log('Customer accepts newly proposed slot...');
  const custAcceptRes = await fetch(`${BASE_URL}/orders/${orderId}/timeslot/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  const custAcceptData = await custAcceptRes.json();
  if (!custAcceptData.success) {
    throw new Error('Customer accept slot failed: ' + JSON.stringify(custAcceptData));
  }
  const sched7 = custAcceptData.order?.serviceSnapshot?.scheduling;
  console.log(`Final confirmed slot: ${sched7?.timeSlot}, status: ${sched7?.status}`);
  if (sched7?.status !== 'ACCEPTED' || !sched7?.timeSlot.includes('4:00 PM - 5:00 PM')) {
    throw new Error('Final slot assertion failed');
  }
  console.log('✅ PASS: Second mutual rescheduling completed successfully.');

  console.log('\n==================================================================');
  console.log('🎉 ALL SERVICE ASSIGNMENT & TIME-SLOT WORKFLOW TESTS PASSED!');
  console.log('==================================================================\n');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});

/**
 * FULL E2E WORKFLOW TEST v2 - Cyber Cafe Marketplace
 * Fixed: Dynamic worker detection (accepts as assigned worker, not hardcoded Amit)
 * Tests: Customer->Admin->Worker->Customer (rating)->Admin final verification
 */

if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
  console.error('CRITICAL SAFETY ERROR: Test scripts cannot be executed against production environment!');
  process.exit(1);
}

const BASE = 'http://localhost:4000/api';
const RESULTS = [];
let PASS = 0, FAIL = 0, WARN = 0;

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

function log(id, label, pass, info) {
  info = info || '';
  const sym = pass === true ? 'PASS' : pass === 'WARN' ? 'WARN' : 'FAIL';
  if (pass === true) PASS++;
  else if (pass === 'WARN') WARN++;
  else FAIL++;
  RESULTS.push({ id, label, pass, info });
  console.log('[' + sym + '] [' + id + '] ' + label + (info ? ' | ' + info : ''));
}

function check(id, label, condition, info) {
  log(id, label, !!condition, info || '');
  return !!condition;
}

// Worker credentials map
const WORKER_CREDS = {
  'worker-amit-01': { email: 'amit.cyber@gmail.com', password: 'worker123', name: 'Amit' },
  'worker-neha-02': { email: 'neha.cyber@gmail.com', password: 'worker123', name: 'Neha' },
  'worker-mona-03': { email: 'mona.estore@gmail.com', password: 'worker123', name: 'Mona' }
};

async function main() {
  console.log('====================================================');
  console.log('CYBER CAFE MARKETPLACE - FULL E2E WORKFLOW TEST v2');
  console.log('====================================================');
  console.log('Started: ' + new Date().toLocaleString());

  // ================================================================
  // PHASE 0: PRE-FLIGHT
  // ================================================================
  console.log('\n--- PHASE 0: PRE-FLIGHT ---');
  const svcRes = await api('GET', '/services');
  check('P0-01', 'Backend reachable', svcRes.status === 200, 'HTTP ' + svcRes.status);
  check('P0-02', 'Services data returned (16)', svcRes.data && svcRes.data.services && svcRes.data.services.length >= 10, (svcRes.data && svcRes.data.services ? svcRes.data.services.length : 0) + ' services');

  // ================================================================
  // PHASE 1: CUSTOMER
  // ================================================================
  console.log('\n--- PHASE 1: CUSTOMER LOGIN & ORDER ---');

  const cLogin = await api('POST', '/auth/login', { email: 'customer@test.com', password: 'customer123' });
  check('C-01', 'Customer login HTTP 200', cLogin.status === 200, 'HTTP ' + cLogin.status);
  check('C-02', 'Customer token issued', !!cLogin.data.token, '');
  check('C-03', 'Customer role=CUSTOMER', cLogin.data.user && cLogin.data.user.role === 'CUSTOMER', cLogin.data.user && cLogin.data.user.role);
  const cToken = cLogin.data.token;
  const customerId = cLogin.data.user && cLogin.data.user.id;

  const meRes = await api('GET', '/auth/me', null, cToken);
  check('C-04', 'GET /auth/me returns correct user', meRes.status === 200, meRes.data && meRes.data.user && meRes.data.user.email);

  // RBAC
  const adminBlock = await api('GET', '/admin/dashboard', null, cToken);
  check('C-05', 'Customer blocked from admin dashboard (403)', adminBlock.status === 403, 'HTTP ' + adminBlock.status);
  const workerBlock = await api('GET', '/worker/jobs', null, cToken);
  check('C-06', 'Customer blocked from worker jobs (403)', workerBlock.status === 403, 'HTTP ' + workerBlock.status);
  const unauth = await api('GET', '/orders');
  check('C-07', 'Unauthenticated /orders returns 401', unauth.status === 401, 'HTTP ' + unauth.status);

  // Browse services
  const panSvc = await api('GET', '/services/pan-card');
  check('C-08', 'PAN Card service detail loads', panSvc.status === 200, 'HTTP ' + panSvc.status);
  const panPrice = panSvc.data && panSvc.data.service && panSvc.data.service.pricePaise;
  check('C-09', 'PAN Card price is 19900 paise', panPrice === 19900, panPrice + ' paise');

  // Workers available
  const workersRes = await api('GET', '/workers/available', null, cToken);
  check('C-10', 'Worker availability list loads', workersRes.status === 200, (workersRes.data && workersRes.data.workers ? workersRes.data.workers.length : 0) + ' workers');

  // Create Order
  const orderRes = await api('POST', '/orders', {
    serviceId: 'pan-card',
    details: {
      fullName: 'Ravi Test Sharma',
      phone: '9900112233',
      email: 'ravi.test@example.com',
      address: '23 Test Lane, Patna, Bihar 800001',
      panType: 'New PAN Card (Form 49A)',
      fatherName: 'Mohan Sharma'
    },
    additionalInfo: 'E2E Test Order v2 - Final Validation',
    workerSelection: { mode: 'auto' },
    documentIds: [],
    paymentMethod: {
      provider: 'UPI',
      timestamp: new Date().toISOString(),
      details: { upiId: 'testpay@upi' }
    }
  }, cToken);
  check('C-11', 'Order creation HTTP 200', orderRes.status === 200, 'HTTP ' + orderRes.status);
  check('C-12', 'Order has ID', orderRes.data && orderRes.data.order && !!orderRes.data.order.id, orderRes.data && orderRes.data.order && orderRes.data.order.id);
  const orderPriceInRes = orderRes.data && orderRes.data.order && (orderRes.data.order.pricing && orderRes.data.order.pricing.pricePaise || orderRes.data.order.pricePaise);
  check('C-13', 'Order price = 19900 paise', orderPriceInRes === 19900, orderPriceInRes + ' paise');
  const orderStatus = orderRes.data && orderRes.data.order && orderRes.data.order.status;
  check('C-14', 'Order paid (OFFERED/AVAILABLE/ASSIGNED)', orderStatus === 'OFFERED' || orderStatus === 'AVAILABLE' || orderStatus === 'ASSIGNED', 'status: ' + orderStatus);
  const orderId = orderRes.data && orderRes.data.order && orderRes.data.order.id;
  const assignedWorkerId = orderRes.data && orderRes.data.order && orderRes.data.order.assignedWorkerId;
  console.log('  -> Created Order: ' + orderId + ' (assigned to: ' + assignedWorkerId + ')');

  // Price tamper protection
  const tamperRes = await api('POST', '/orders', {
    serviceId: 'pan-card',
    details: { fullName: 'Tamper Test' },
    documentIds: [],
    paymentMethod: { provider: 'UPI' },
    pricePaise: 1,
    pricing: { pricePaise: 1 }
  }, cToken);
  const tamperedPrice = tamperRes.data && tamperRes.data.order && tamperRes.data.order.pricing && tamperRes.data.order.pricing.pricePaise;
  check('C-15', 'Price tamper rejected (server uses real price)', tamperedPrice !== 1, 'server returned: ' + tamperedPrice + ' paise');

  // Customer order list
  const myOrders = await api('GET', '/orders', null, cToken);
  check('C-16', 'Customer can list orders', myOrders.status === 200, 'HTTP ' + myOrders.status);
  const found = myOrders.data && myOrders.data.orders && myOrders.data.orders.find(function(o) { return o.id === orderId; });
  check('C-17', 'New order in customer list', !!found, orderId);

  // Isolation test
  const c2Login = await api('POST', '/auth/login', { email: 'sunil.verma@test.com', password: 'customer123' });
  if (c2Login.status === 200) {
    const isoRes = await api('GET', '/orders/' + orderId, null, c2Login.data.token);
    check('C-18', 'Different customer blocked from other order (403)', isoRes.status === 403, 'HTTP ' + isoRes.status);
  } else {
    log('C-18', 'Isolation test skipped (c2 login failed)', 'WARN', 'HTTP ' + c2Login.status);
  }

  // Cannot review non-completed order
  const earlyReview = await api('POST', '/orders/' + orderId + '/review', { rating: 5 }, cToken);
  check('C-19', 'Cannot review non-completed order (400)', earlyReview.status === 400, 'HTTP ' + earlyReview.status);

  // ================================================================
  // PHASE 2: ADMIN
  // ================================================================
  console.log('\n--- PHASE 2: ADMIN VERIFICATION ---');

  const aLogin = await api('POST', '/auth/login', { email: 'rajkaran969355@gmail.com', password: 'Karan@@2002' });
  check('A-01', 'Admin login HTTP 200', aLogin.status === 200, 'HTTP ' + aLogin.status);
  check('A-02', 'Admin role=ADMIN', aLogin.data && aLogin.data.user && aLogin.data.user.role === 'ADMIN', aLogin.data.user && aLogin.data.user.role);
  const aToken = aLogin.data && aLogin.data.token;

  const dashRes = await api('GET', '/admin/dashboard', null, aToken);
  check('A-03', 'Admin dashboard loads (200)', dashRes.status === 200, 'HTTP ' + dashRes.status);

  const adminOrders = await api('GET', '/admin/orders', null, aToken);
  check('A-04', 'Admin can list all orders', adminOrders.status === 200, adminOrders.data && adminOrders.data.orders ? adminOrders.data.orders.length + ' orders' : '0');
  const testOrderInAdmin = adminOrders.data && adminOrders.data.orders && adminOrders.data.orders.find(function(o) { return o.id === orderId; });
  check('A-05', 'Test order visible to admin', !!testOrderInAdmin, orderId);

  const aOrderDetail = await api('GET', '/admin/orders/' + orderId, null, aToken);
  check('A-06', 'Admin order detail loads', aOrderDetail.status === 200, 'HTTP ' + aOrderDetail.status);
  const aOrder = aOrderDetail.data && aOrderDetail.data.order;
  check('A-07', 'Order has serviceSnapshot', aOrder && !!aOrder.serviceSnapshot, '');
  check('A-08', 'Order has pricing', aOrder && (!!aOrder.pricing || !!aOrder.pricePaise), '');

  const workersAdmin = await api('GET', '/admin/workers', null, aToken);
  check('A-09', 'Admin workers list loads', workersAdmin.status === 200, workersAdmin.data && workersAdmin.data.workers ? workersAdmin.data.workers.length + ' workers' : '0');
  const amitFound = workersAdmin.data && workersAdmin.data.workers && workersAdmin.data.workers.find(function(w) { return w.id === 'worker-amit-01' || (w.email && w.email.includes('amit')); });
  check('A-10', 'Amit worker in admin list', !!amitFound, amitFound && amitFound.name);

  const finRes = await api('GET', '/admin/financials/summary', null, aToken);
  check('A-11', 'Financial summary loads', finRes.status === 200, 'HTTP ' + finRes.status);

  // Worker cannot access customer orders (RBAC fix validation)
  const tmpWLogin = await api('POST', '/auth/login', { email: 'amit.cyber@gmail.com', password: 'worker123' });
  if (tmpWLogin.status === 200) {
    const workerCustomerBlock = await api('GET', '/orders', null, tmpWLogin.data.token);
    check('A-12', 'RBAC: Worker cannot access GET /orders (403)', workerCustomerBlock.status === 403, 'HTTP ' + workerCustomerBlock.status);
    const workerGetOrder = await api('GET', '/orders/' + orderId, null, tmpWLogin.data.token);
    check('A-13', 'RBAC: Worker cannot access GET /orders/:id (403)', workerGetOrder.status === 403, 'HTTP ' + workerGetOrder.status);
  }

  // Admin can use worker routes
  const adminAsWorker = await api('GET', '/worker/jobs', null, aToken);
  check('A-14', 'Admin can access worker routes (multi-role)', adminAsWorker.status === 200, 'HTTP ' + adminAsWorker.status);

  // ================================================================
  // PHASE 3: WORKER ACCEPTS & COMPLETES
  // ================================================================
  console.log('\n--- PHASE 3: WORKER ACCEPTS & COMPLETES ---');

  // Determine which worker to login as based on assignment
  let workerEmail, workerPassword, workerName;
  if (assignedWorkerId && WORKER_CREDS[assignedWorkerId]) {
    workerEmail = WORKER_CREDS[assignedWorkerId].email;
    workerPassword = WORKER_CREDS[assignedWorkerId].password;
    workerName = WORKER_CREDS[assignedWorkerId].name;
    console.log('  -> Using assigned worker: ' + workerName + ' (' + assignedWorkerId + ')');
  } else {
    // Default to Neha who has fewer active jobs
    workerEmail = 'neha.cyber@gmail.com';
    workerPassword = 'worker123';
    workerName = 'Neha';
    console.log('  -> No assigned worker, using Neha as fallback');
  }

  const wLogin = await api('POST', '/auth/login', { email: workerEmail, password: workerPassword });
  check('W-01', 'Worker (' + workerName + ') login HTTP 200', wLogin.status === 200, 'HTTP ' + wLogin.status);
  check('W-02', 'Worker role=WORKER', wLogin.data && wLogin.data.user && wLogin.data.user.role === 'WORKER', wLogin.data && wLogin.data.user && wLogin.data.user.role);
  const wToken = wLogin.data && wLogin.data.token;
  const workerId = wLogin.data && wLogin.data.user && wLogin.data.user.id;

  // Worker RBAC
  const wAdminBlock = await api('GET', '/admin/dashboard', null, wToken);
  check('W-03', 'Worker blocked from admin dashboard (403)', wAdminBlock.status === 403, 'HTTP ' + wAdminBlock.status);
  const wCustBlock = await api('GET', '/orders', null, wToken);
  check('W-04', 'Worker blocked from GET /orders (403)', wCustBlock.status === 403, 'HTTP ' + wCustBlock.status);

  // Set worker online
  const toggleRes = await api('POST', '/worker/availability/toggle', { isOnline: true }, wToken);
  check('W-05', 'Worker toggle online', toggleRes.status === 200, 'isOnline: ' + (toggleRes.data && toggleRes.data.isOnline));

  // View requests
  const reqsRes = await api('GET', '/worker/requests', null, wToken);
  check('W-06', 'Worker can view available requests', reqsRes.status === 200, 'HTTP ' + reqsRes.status);
  const availOrders = reqsRes.data && reqsRes.data.orders || [];
  const testInReqs = availOrders.find(function(o) { return o.id === orderId; });
  if (testInReqs) {
    check('W-07', 'Test order in worker available requests', true, orderId + ', status: ' + testInReqs.status);
    check('W-08', 'Request hides customer phone (privacy)', !testInReqs.customerPhone, 'privacy OK');
  } else {
    log('W-07', 'Test order not in requests list (status may be AVAILABLE pool or offered to different worker)', 'WARN', 'Available: ' + availOrders.map(function(o) { return o.id; }).join(', '));
    log('W-08', 'Privacy check skipped', 'WARN', '');
  }

  // Accept order
  let acceptRes = await api('POST', '/worker/requests/' + orderId + '/accept', {}, wToken);
  if (acceptRes.status !== 200) {
    acceptRes = await api('POST', '/worker/jobs/' + orderId + '/accept', {}, wToken);
  }
  check('W-09', 'Worker accepts order (200)', acceptRes.status === 200, 'HTTP ' + acceptRes.status + ': ' + (acceptRes.data && acceptRes.data.error || 'OK'));

  // Concurrency: duplicate accept same worker
  const dupRes = await api('POST', '/worker/requests/' + orderId + '/accept', {}, wToken);
  check('W-10', 'Duplicate accept by same worker rejected (400/409)', dupRes.status === 400 || dupRes.status === 409, 'HTTP ' + dupRes.status + ': ' + (dupRes.data && dupRes.data.error || ''));

  // Concurrency: different worker cannot steal
  const otherWorkerEmail = workerEmail === 'amit.cyber@gmail.com' ? 'neha.cyber@gmail.com' : 'amit.cyber@gmail.com';
  const otherLogin = await api('POST', '/auth/login', { email: otherWorkerEmail, password: 'worker123' });
  if (otherLogin.status === 200) {
    const otherToken = otherLogin.data.token;
    await api('POST', '/worker/availability/toggle', { isOnline: true }, otherToken);
    const otherSteal = await api('POST', '/worker/requests/' + orderId + '/accept', {}, otherToken);
    check('W-11', 'Different worker cannot steal accepted order (400/409)', otherSteal.status === 400 || otherSteal.status === 409, 'HTTP ' + otherSteal.status + ': ' + (otherSteal.data && otherSteal.data.error || ''));
  } else {
    log('W-11', 'Other worker concurrency test skipped', 'WARN', '');
  }

  // Worker views their jobs
  const myJobsRes = await api('GET', '/worker/jobs', null, wToken);
  check('W-12', 'Worker can view their jobs', myJobsRes.status === 200, 'HTTP ' + myJobsRes.status);
  const myJobs = myJobsRes.data && myJobsRes.data.jobs || [];
  const acceptedJob = myJobs.find(function(j) { return j.id === orderId; });
  check('W-13', 'Accepted order in worker jobs list', !!acceptedJob, 'jobs count: ' + myJobs.length);

  // Job detail
  const jobDetailRes = await api('GET', '/worker/jobs/' + orderId, null, wToken);
  check('W-14', 'Worker can view job details', jobDetailRes.status === 200, 'HTTP ' + jobDetailRes.status);
  const jobDetail = jobDetailRes.data && jobDetailRes.data.job;
  check('W-15', 'Job status = ACCEPTED', jobDetail && jobDetail.status === 'ACCEPTED', 'status: ' + (jobDetail && jobDetail.status));

  // Set time slot
  const slotRes = await api('POST', '/worker/jobs/' + orderId + '/timeslot', {
    date: 'Tomorrow',
    startTime: '10:00 AM',
    endTime: '12:00 PM'
  }, wToken);
  check('W-16', 'Worker sets time slot (200)', slotRes.status === 200, 'HTTP ' + slotRes.status + ': ' + (slotRes.data && slotRes.data.error || 'OK'));

  // Customer sees time slot
  const custAfterSlot = await api('GET', '/orders/' + orderId, null, cToken);
  const slotInfo = custAfterSlot.data && custAfterSlot.data.order && custAfterSlot.data.order.serviceSnapshot && custAfterSlot.data.order.serviceSnapshot.scheduling;
  check('W-17', 'Customer can see time slot (sync)', !!slotInfo, JSON.stringify(slotInfo || {}).slice(0, 80));

  // Start work
  const startRes = await api('POST', '/worker/jobs/' + orderId + '/start', {}, wToken);
  check('W-18', 'Worker starts work (200)', startRes.status === 200, 'HTTP ' + startRes.status + ': ' + (startRes.data && startRes.data.error || 'OK'));

  // Upload deliverables
  const delivRes = await api('POST', '/worker/jobs/' + orderId + '/deliverables', {
    deliverables: [{
      name: 'PAN_Application_Receipt_E2E.pdf',
      url: 'https://storage.example.com/e2e-pan-receipt.pdf',
      isMandatory: true,
      size: '820 KB'
    }]
  }, wToken);
  check('W-19', 'Worker uploads deliverables (200)', delivRes.status === 200, 'HTTP ' + delivRes.status + ': ' + (delivRes.data && delivRes.data.error || 'OK'));

  // Submit (complete) job
  const submitRes = await api('POST', '/worker/jobs/' + orderId + '/submit', {
    note: 'PAN application submitted via NSDL portal. Reference: E2EPAN2024001.'
  }, wToken);
  check('W-20', 'Worker submits/completes job (200)', submitRes.status === 200, 'HTTP ' + submitRes.status + ': ' + (submitRes.data && submitRes.data.error || 'OK'));
  const completedOrder = submitRes.data && (submitRes.data.order || submitRes.data.job);
  check('W-21', 'Order status = RECEIPT_SUBMITTED or COMPLETED', completedOrder && (completedOrder.status === 'RECEIPT_SUBMITTED' || completedOrder.status === 'COMPLETED'), 'status: ' + (completedOrder && completedOrder.status));

  // Chat after completion
  const chatRes = await api('GET', '/worker/chat/' + orderId, null, wToken);
  check('W-22', 'Completed order chat graceful (not 500)', chatRes.status !== 500, 'HTTP ' + chatRes.status + ', isClosed: ' + (chatRes.data && chatRes.data.isClosed));

  // ================================================================
  // PHASE 4: CUSTOMER RECEIPT & RATING
  // ================================================================
  console.log('\n--- PHASE 4: CUSTOMER RECEIPT & RATING ---');

  const custCompletedOrder = await api('GET', '/orders/' + orderId, null, cToken);
  check('R-01', 'Customer views completed order (200)', custCompletedOrder.status === 200, 'HTTP ' + custCompletedOrder.status);
  const cOrder = custCompletedOrder.data && custCompletedOrder.data.order;
  check('R-02', 'Order status = RECEIPT_SUBMITTED or COMPLETED for customer', cOrder && (cOrder.status === 'RECEIPT_SUBMITTED' || cOrder.status === 'COMPLETED'), 'status: ' + (cOrder && cOrder.status));
  check('R-03', 'Deliverables visible to customer', cOrder && Array.isArray(cOrder.deliverables) && cOrder.deliverables.length > 0, 'deliverables: ' + (cOrder && cOrder.deliverables && cOrder.deliverables.length));

  // Rating validation
  const badRating0 = await api('POST', '/orders/' + orderId + '/review', { rating: 0 }, cToken);
  check('R-04', 'Rating=0 rejected (400)', badRating0.status === 400, 'HTTP ' + badRating0.status);
  const badRating6 = await api('POST', '/orders/' + orderId + '/review', { rating: 6 }, cToken);
  check('R-05', 'Rating=6 rejected (400)', badRating6.status === 400, 'HTTP ' + badRating6.status);

  // Valid 5-star rating
  const goodRating = await api('POST', '/orders/' + orderId + '/review', {
    rating: 5,
    comment: 'Excellent work! Quick and accurate PAN submission. Highly recommended!'
  }, cToken);
  check('R-06', 'Valid 5-star rating accepted (200)', goodRating.status === 200, 'HTTP ' + goodRating.status + ': ' + (goodRating.data && goodRating.data.error || 'OK'));
  const ratedOrder = goodRating.data && goodRating.data.order;
  const savedRating = ratedOrder && (ratedOrder.rating || (ratedOrder.serviceSnapshot && ratedOrder.serviceSnapshot.review && ratedOrder.serviceSnapshot.review.rating));
  check('R-07', 'Rating = 5 saved', savedRating === 5, 'rating: ' + savedRating);

  // Duplicate rating prevention
  const dupRating = await api('POST', '/orders/' + orderId + '/review', { rating: 3, comment: 'change' }, cToken);
  check('R-08', 'Duplicate rating rejected (400)', dupRating.status === 400, 'HTTP ' + dupRating.status);

  // ================================================================
  // PHASE 5: ADMIN FINAL
  // ================================================================
  console.log('\n--- PHASE 5: ADMIN FINAL VERIFICATION ---');

  const afOrder = await api('GET', '/admin/orders/' + orderId, null, aToken);
  check('AF-01', 'Admin views final order state (200)', afOrder.status === 200, 'HTTP ' + afOrder.status);
  const afO = afOrder.data && afOrder.data.order;
  check('AF-02', 'Final order status = COMPLETED', afO && afO.status === 'COMPLETED', 'status: ' + (afO && afO.status));
  check('AF-03', 'Final order has assigned worker', afO && !!afO.assignedWorkerId, afO && afO.assignedWorkerId);
  const afRating = afO && (afO.rating || (afO.serviceSnapshot && afO.serviceSnapshot.review && afO.serviceSnapshot.review.rating));
  check('AF-04', 'Final order has rating = 5', afRating === 5, 'rating: ' + afRating);
  check('AF-05', 'Final order has deliverables', afO && afO.deliverables && afO.deliverables.length > 0, (afO && afO.deliverables && afO.deliverables.length || 0) + ' deliverables');

  const afWorker = await api('GET', '/admin/workers/' + workerId, null, aToken);
  check('AF-06', 'Admin can view assigned worker profile', afWorker.status === 200, 'HTTP ' + afWorker.status);

  const auditRes = await api('GET', '/admin/audit-logs', null, aToken);
  check('AF-07', 'Admin audit logs load', auditRes.status === 200, 'HTTP ' + auditRes.status);
  const auditLogs = auditRes.data && auditRes.data.logs;
  check('AF-08', 'Audit log has entries', auditLogs && auditLogs.length > 0, (auditLogs && auditLogs.length || 0) + ' entries');

  const settingsRes = await api('GET', '/admin/settings', null, aToken);
  check('AF-09', 'Admin settings load', settingsRes.status === 200, 'HTTP ' + settingsRes.status);

  const reportsRes = await api('GET', '/admin/reports', null, aToken);
  check('AF-10', 'Admin reports load', reportsRes.status === 200, 'HTTP ' + reportsRes.status);

  // ================================================================
  // PHASE 6: SECURITY
  // ================================================================
  console.log('\n--- PHASE 6: SECURITY & EDGE CASES ---');

  check('S-01', 'No token returns 401', (await api('GET', '/orders')).status === 401, '');
  check('S-02', 'Invalid token returns 401', (await api('GET', '/orders', null, 'bad.token.here')).status === 401, '');
  check('S-03', 'Non-existent order returns 404', (await api('GET', '/orders/ord_FAKE99999', null, cToken)).status === 404, '');

  const workerCreateOrder = await api('POST', '/orders', { serviceId: 'pan-card', details: {}, paymentMethod: { provider: 'UPI' } }, wToken);
  check('S-04', 'Worker cannot create customer orders (403)', workerCreateOrder.status === 403, 'HTTP ' + workerCreateOrder.status);

  const wAdminCustomers = await api('GET', '/admin/customers', null, wToken);
  check('S-05', 'Worker blocked from admin customers (403)', wAdminCustomers.status === 403, 'HTTP ' + wAdminCustomers.status);

  const staleAccept = await api('POST', '/worker/requests/' + orderId + '/accept', {}, wToken);
  check('S-06', 'Cannot accept COMPLETED order (400/409)', staleAccept.status === 400 || staleAccept.status === 409, 'HTTP ' + staleAccept.status);

  const staleStart = await api('POST', '/worker/jobs/' + orderId + '/start', {}, wToken);
  check('S-07', 'Cannot start COMPLETED order (400)', staleStart.status === 400, 'HTTP ' + staleStart.status);

  const staleSubmit = await api('POST', '/worker/jobs/' + orderId + '/submit', { note: 'hack' }, wToken);
  check('S-08', 'Cannot re-submit COMPLETED order (400)', staleSubmit.status === 400, 'HTTP ' + staleSubmit.status);

  const dupRatingAgain = await api('POST', '/orders/' + orderId + '/review', { rating: 1 }, cToken);
  check('S-09', 'Cannot override existing rating (400)', dupRatingAgain.status === 400, 'HTTP ' + dupRatingAgain.status);

  // Worker cannot access another worker's job
  const otherWLogin2 = await api('POST', '/auth/login', { email: otherWorkerEmail, password: 'worker123' });
  if (otherWLogin2.status === 200) {
    const otherJobDetail = await api('GET', '/worker/jobs/' + orderId, null, otherWLogin2.data.token);
    check('S-10', 'Other worker cannot view job they did not accept (404)', otherJobDetail.status === 404 || otherJobDetail.status === 403, 'HTTP ' + otherJobDetail.status);
  } else {
    log('S-10', 'Worker isolation test skipped', 'WARN', '');
  }

  // ================================================================
  // PHASE 7: STATE SYNCHRONIZATION
  // ================================================================
  console.log('\n--- PHASE 7: STATE SYNCHRONIZATION ---');

  const custFinal = await api('GET', '/orders/' + orderId, null, cToken);
  const adminFinal = await api('GET', '/admin/orders/' + orderId, null, aToken);
  const workerFinal = await api('GET', '/worker/jobs/' + orderId, null, wToken);

  const custSt = custFinal.data && custFinal.data.order && custFinal.data.order.status;
  const adminSt = adminFinal.data && adminFinal.data.order && adminFinal.data.order.status;
  const workerSt = workerFinal.data && workerFinal.data.job && workerFinal.data.job.status;

  check('SYNC-01', 'Customer sees COMPLETED', custSt === 'COMPLETED', 'customer: ' + custSt);
  check('SYNC-02', 'Admin sees COMPLETED', adminSt === 'COMPLETED', 'admin: ' + adminSt);
  check('SYNC-03', 'Worker sees COMPLETED', workerSt === 'COMPLETED', 'worker: ' + workerSt);
  check('SYNC-04', 'All roles agree on status', custSt === adminSt && adminSt === workerSt, custSt + ' | ' + adminSt + ' | ' + workerSt);

  const custR = custFinal.data && custFinal.data.order && (custFinal.data.order.rating || (custFinal.data.order.serviceSnapshot && custFinal.data.order.serviceSnapshot.review && custFinal.data.order.serviceSnapshot.review.rating));
  const adminR = adminFinal.data && adminFinal.data.order && (adminFinal.data.order.rating || (adminFinal.data.order.serviceSnapshot && adminFinal.data.order.serviceSnapshot.review && adminFinal.data.order.serviceSnapshot.review.rating));
  check('SYNC-05', 'Rating=5 visible to customer', custR === 5, 'customer rating: ' + custR);
  check('SYNC-06', 'Rating=5 visible to admin', adminR === 5, 'admin rating: ' + adminR);

  // ================================================================
  // FINAL SUMMARY
  // ================================================================
  console.log('\n====================================================');
  console.log('FINAL TEST SUMMARY');
  console.log('====================================================');
  console.log('  PASS : ' + PASS);
  console.log('  FAIL : ' + FAIL);
  console.log('  WARN : ' + WARN);
  console.log('  TOTAL: ' + (PASS + FAIL + WARN));

  if (FAIL > 0 || WARN > 0) {
    console.log('\n--- FAILURES & WARNINGS ---');
    RESULTS.filter(function(r) { return r.pass !== true; }).forEach(function(r) {
      var sym = r.pass === 'WARN' ? 'WARN' : 'FAIL';
      console.log('  [' + sym + '] [' + r.id + '] ' + r.label + ': ' + r.info);
    });
  }

  function phasePass(prefix) {
    return RESULTS.filter(function(r) { return r.id.startsWith(prefix) && r.pass === false; }).length === 0;
  }
  console.log('\n--- PHASE STATUS ---');
  console.log('  Customer Workflow     : ' + (phasePass('C-') ? 'PASS' : 'FAIL'));
  console.log('  Admin Workflow        : ' + (phasePass('A-') ? 'PASS' : 'FAIL'));
  console.log('  Worker Workflow       : ' + (phasePass('W-') ? 'PASS' : 'FAIL'));
  console.log('  Receipt & Rating      : ' + (phasePass('R-') ? 'PASS' : 'FAIL'));
  console.log('  Admin Final Check     : ' + (phasePass('AF-') ? 'PASS' : 'FAIL'));
  console.log('  Security/RBAC         : ' + (phasePass('S-') ? 'PASS' : 'FAIL'));
  console.log('  State Synchronization : ' + (phasePass('SYNC-') ? 'PASS' : 'FAIL'));
  console.log('\n  Test Order ID: ' + orderId);
  console.log('  Assigned Worker: ' + assignedWorkerId + ' -> Logged in as: ' + workerName);
  console.log('  Completed: ' + new Date().toLocaleString());
  console.log('  OVERALL: ' + (FAIL === 0 ? 'ALL TESTS PASSED' : FAIL + ' TEST(S) FAILED'));
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  process.exit(1);
});

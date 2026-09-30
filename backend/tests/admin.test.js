"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
describe('Admin Portal End-to-End API Test Suite', () => {
    let adminToken;
    beforeAll(async () => {
        const adminId = process.env.ADMIN_ID || 'Karan Kumar';
        const adminPassword = process.env.ADMIN_PASSWORD || '';
        const loginRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ emailOrId: adminId, password: adminPassword });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.token).toBeDefined();
        expect(loginRes.body.user.role).toBe('ADMIN');
        adminToken = loginRes.body.token;
    });
    it('allows login using Admin email as well', async () => {
        const adminEmail = process.env.ADMIN_EMAIL || 'rajkaran969355@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || '';
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ emailOrId: adminEmail, password: adminPassword });
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(adminEmail);
    });
    it('rejects old default demo admin credentials', async () => {
        const resId = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ emailOrId: 'ADM-001', password: 'password123' });
        expect(resId.status).toBe(401);
        const resEmail = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ emailOrId: 'admin@cybercafe.com', password: 'password123' });
        expect(resEmail.status).toBe(401);
    });
    it('fetches dashboard stats with all 13 metrics', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.stats).toBeDefined();
        expect(res.body.stats.totalCustomers).toBeGreaterThanOrEqual(0);
        expect(res.body.stats.totalWorkers).toBeGreaterThanOrEqual(1);
        expect(res.body.stats.totalRevenuePaise).toBeGreaterThanOrEqual(0);
        expect(res.body.stats.totalCommissionPaise).toBeGreaterThanOrEqual(0);
    });
    it('manages workers: list, create with 11 fields, verify, and status', async () => {
        // List workers
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/workers')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body.workers)).toBe(true);
        // Create worker with 11 required fields
        const createRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/admin/workers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            workerName: 'Suresh Sharma',
            workerId: 'WRK-201',
            mobile: '9829012345',
            email: 'suresh.sharma@cybercafe.com',
            businessName: 'Sharma Online Seva Kendra',
            address: 'Near Bus Stand, Tonk Road',
            city: 'Jaipur',
            skills: 'PAN Card, Voter ID, Aadhaar, Caste Certificate',
            idProof: 'Aadhaar_Suresh.pdf',
            photo: 'Suresh_Photo.jpg',
            accountNumber: '50100234567890',
            ifsc: 'HDFC0001234',
            accountHolderName: 'Suresh Sharma',
            upiId: 'suresh@okhdfcbank'
        });
        expect([200, 201]).toContain(createRes.status);
        expect(createRes.body.worker.workerId).toBe('WRK-201');
        const newWorkerId = createRes.body.worker.id;
        // Get details
        const detailRes = await (0, supertest_1.default)(app_1.default)
            .get(`/api/admin/workers/${newWorkerId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(detailRes.status).toBe(200);
        expect(detailRes.body.worker.name).toBe('Suresh Sharma');
        // Verify ID proof
        const verifyRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/admin/workers/${newWorkerId}/verify`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ approved: true, note: 'All 11 details and Aadhaar document verified' });
        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.worker.workerProfile.idVerified).toBe(true);
        // Toggle status to SUSPENDED and back to ACTIVE
        const suspendRes = await (0, supertest_1.default)(app_1.default)
            .put(`/api/admin/workers/${newWorkerId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'SUSPENDED', reason: 'Routine background re-check' });
        expect(suspendRes.status).toBe(200);
        expect(suspendRes.body.worker.status).toBe('SUSPENDED');
        const activateRes = await (0, supertest_1.default)(app_1.default)
            .put(`/api/admin/workers/${newWorkerId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'ACTIVE', reason: 'Recheck cleared' });
        expect(activateRes.status).toBe(200);
        expect(activateRes.body.worker.status).toBe('ACTIVE');
    });
    it('manages customers: list, detail, and status toggles', async () => {
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/customers')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body.customers)).toBe(true);
        const customer = listRes.body.customers[0];
        if (customer) {
            const detailRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/admin/customers/${customer.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(detailRes.status).toBe(200);
            expect(detailRes.body.customer.id).toBe(customer.id);
            const statusRes = await (0, supertest_1.default)(app_1.default)
                .put(`/api/admin/customers/${customer.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'ACTIVE', reason: 'Admin verified customer' });
            expect(statusRes.status).toBe(200);
        }
    });
    it('manages orders: manual assign override, 2h correction, hold/release earnings, and refunds', async () => {
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/orders')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body.orders)).toBe(true);
        const order = listRes.body.orders[0];
        if (order) {
            // 1. Manual Assignment Override
            const assignRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/orders/${order.id}/assign`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ workerId: 'worker-vikram-02', note: 'Administrative assignment override' });
            expect(assignRes.status).toBe(200);
            expect(assignRes.body.order.status).toBe('ACCEPTED');
            // 2. Request 2h Correction
            const corrRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/orders/${order.id}/correction`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Blurred official stamp', instruction: 'Please re-upload high resolution certificate' });
            expect(corrRes.status).toBe(200);
            expect(['CORRECTION_REQUESTED', 'CORRECTION_REQUIRED']).toContain(corrRes.body.order.status);
            expect(corrRes.body.order.correctionDeadline).toBeDefined();
            // 3. Hold Worker Earnings
            const holdRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/orders/${order.id}/hold-earnings`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Customer disputed certificate resolution' });
            expect(holdRes.status).toBe(200);
            expect(holdRes.body.order.earningsHold).toBe(true);
            // 4. Release Worker Earnings
            const relRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/orders/${order.id}/release-earnings`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(relRes.status).toBe(200);
            expect(relRes.body.order.earningsHold).toBe(false);
            // 5. Full Refund Order
            const refundRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/orders/${order.id}/refund`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: '100% full refund issued per platform customer guarantee' });
            expect(refundRes.status).toBe(200);
            expect(refundRes.body.order.status).toBe('REFUNDED');
        }
    });
    it('manages service catalog and worker proposals', async () => {
        // 1. Create service
        const createRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/admin/services')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            name: 'Domicile Certificate Service',
            category: 'Government forms',
            pricePaise: 24900,
            estimatedTime: '48 Hours',
            description: 'State domicile certificate application service',
            requiredDocuments: ['Aadhaar Card', 'Ration Card', 'Passport Photo']
        });
        expect([200, 201]).toContain(createRes.status);
        const serviceId = createRes.body.service.id;
        // 2. Toggle service
        const toggleRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/admin/services/${serviceId}/toggle`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(toggleRes.status).toBe(200);
        // 3. Update service
        const updateRes = await (0, supertest_1.default)(app_1.default)
            .put(`/api/admin/services/${serviceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ pricePaise: 29900 });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.service.pricePaise).toBe(29900);
        // 4. Delete service
        const delRes = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/admin/services/${serviceId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(delRes.status).toBe(200);
        // 5. Worker proposals list
        const propListRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/proposals')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(propListRes.status).toBe(200);
        expect(Array.isArray(propListRes.body.proposals)).toBe(true);
    });
    it('manages financials, withdrawals and leaderboard', async () => {
        const summaryRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/financials/summary')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(summaryRes.status).toBe(200);
        expect(summaryRes.body.summary).toBeDefined();
        const payRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/payments')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(payRes.status).toBe(200);
        const withRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/withdrawals')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(withRes.status).toBe(200);
        const topRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/workers/top-earning?period=monthly')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(topRes.status).toBe(200);
        expect(Array.isArray(topRes.body.rankings)).toBe(true);
    });
    it('handles complaints and dispute resolution workflow', async () => {
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/complaints')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listRes.status).toBe(200);
        const complaint = listRes.body.complaints[0];
        if (complaint) {
            // Reply to thread
            const replyRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/complaints/${complaint.id}/reply`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ message: 'Admin investigation opened. Please provide transaction receipt.' });
            expect(replyRes.status).toBe(200);
            // Add internal note
            const noteRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/complaints/${complaint.id}/note`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ note: 'Checked with bank gateway, pending status confirmed.' });
            expect(noteRes.status).toBe(200);
            // Resolve dispute
            const resolveRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/complaints/${complaint.id}/resolve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ decision: 'RELEASE_EARNINGS', resolutionNote: 'Dispute investigated and cleared.' });
            expect(resolveRes.status).toBe(200);
            expect(resolveRes.body.complaint.status.toUpperCase()).toBe('RESOLVED');
        }
    });
    it('handles help support desk tickets', async () => {
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/support/tickets')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listRes.status).toBe(200);
        const ticket = listRes.body.tickets[0];
        if (ticket) {
            const replyRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/admin/support/tickets/${ticket.id}/reply`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ message: 'Hello, your ticket is being addressed by customer support.' });
            expect(replyRes.status).toBe(200);
            const statusRes = await (0, supertest_1.default)(app_1.default)
                .put(`/api/admin/support/tickets/${ticket.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'IN_PROGRESS' });
            expect(statusRes.status).toBe(200);
        }
    });
    it('handles notifications stream and mark read actions', async () => {
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/notifications')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body.notifications)).toBe(true);
        const markAllRes = await (0, supertest_1.default)(app_1.default)
            .put('/api/admin/notifications/read-all')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(markAllRes.status).toBe(200);
    });
    it('generates standard platform reports', async () => {
        const reportRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/reports?type=total_revenue&period=this_month')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(reportRes.status).toBe(200);
        expect(reportRes.body.report).toBeDefined();
        expect(reportRes.body.report.columns).toBeDefined();
    });
    it('manages settings, profile, password, and logs audit entries', async () => {
        // 1. Get settings
        const getRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/settings')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.settings.commissionRatePercent).toBe(20);
        // 2. Update settings
        const updateRes = await (0, supertest_1.default)(app_1.default)
            .put('/api/admin/settings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ commissionRatePercent: 20, correctionWindowHours: 2 });
        expect(updateRes.status).toBe(200);
        // 3. Update profile
        const profileRes = await (0, supertest_1.default)(app_1.default)
            .put('/api/admin/profile')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Super Admin', phone: '9876543210' });
        expect(profileRes.status).toBe(200);
        // 4. Change password
        const adminPassword = process.env.ADMIN_PASSWORD || '';
        const pwdRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ oldPassword: adminPassword, newPassword: adminPassword });
        expect(pwdRes.status).toBe(200);
        // 5. Audit logs
        const auditRes = await (0, supertest_1.default)(app_1.default)
            .get('/api/admin/audit-logs')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(auditRes.status).toBe(200);
        expect(Array.isArray(auditRes.body.logs)).toBe(true);
    });
});

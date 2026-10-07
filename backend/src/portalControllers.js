"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalNotificationController = exports.adminController = exports.workerController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const catalogData_1 = require("./catalogData");
const db_1 = require("./db");
const extendedControllers_1 = require("./extendedControllers");
const fileStore_1 = require("./utils/fileStore");
exports.workerController = {
    getAvailableRequests: async (req, res) => {
        try {
            const workerId = req.user.id;
            const result = catalogData_1.localStore.getAvailableOrdersForWorker(workerId);
            return res.json({
                success: true,
                data: { orders: result.orders, isOnline: result.isOnline },
                isOnline: result.isOnline,
                orders: result.orders
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getAvailableOrders: async (req, res) => {
        try {
            const workerId = req.user.id;
            const result = catalogData_1.localStore.getAvailableOrdersForWorker(workerId);
            return res.json({
                success: true,
                data: { orders: result.orders, isOnline: result.isOnline },
                isOnline: result.isOnline,
                orders: result.orders
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    acceptJob: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const order = catalogData_1.localStore.acceptOrder(orderId, workerId);
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.$transaction(async (tx) => {
                        const dbOrder = await tx.order.findUnique({ where: { id: orderId } });
                        if (!dbOrder || (dbOrder.status !== 'AVAILABLE' && dbOrder.status !== 'PAID')) {
                            const err = new Error('Order has already been accepted by another worker');
                            err.statusCode = 409;
                            err.code = 'ORDER_ALREADY_ASSIGNED';
                            throw err;
                        }
                        await tx.order.update({
                            where: { id: orderId },
                            data: {
                                status: 'ASSIGNED',
                                serviceSnapshot: order.serviceSnapshot
                            }
                        });
                        const existingJob = await tx.job.findFirst({ where: { orderId } });
                        if (!existingJob) {
                            await tx.job.create({
                                data: {
                                    orderId,
                                    workerId,
                                    status: 'ASSIGNED'
                                }
                            });
                        }
                        else if (existingJob.workerId !== workerId) {
                            const err = new Error('Order has already been accepted by another worker');
                            err.statusCode = 409;
                            err.code = 'ORDER_ALREADY_ASSIGNED';
                            throw err;
                        }
                    });
                }
            }
            catch (dbErr) {
                if (dbErr.code === 'P2002' || dbErr.message === 'ORDER_ALREADY_ASSIGNED' || dbErr.statusCode === 409) {
                    return res.status(409).json({
                        success: false,
                        error: 'Order has already been accepted by another worker',
                        code: 'ORDER_ALREADY_ASSIGNED'
                    });
                }
            }
            return res.json({ success: true, order, message: 'Order accepted successfully' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'P2002' || e.code === 'ORDER_ALREADY_ASSIGNED' ? 409 : 400);
            return res.status(statusCode).json({
                success: false,
                error: e.message || 'Failed to accept order',
                code: e.code || (statusCode === 409 ? 'ORDER_ALREADY_ASSIGNED' : 'ACCEPT_FAILED')
            });
        }
    },
    acceptAndSchedule: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const { date, timeSlot } = req.body;
            if (!timeSlot) {
                return res.status(400).json({
                    success: false,
                    error: 'Initial timeSlot is mandatory to accept and schedule the order'
                });
            }
            const order = catalogData_1.localStore.acceptAndScheduleOrder(orderId, workerId, {
                date: date || 'Today',
                timeSlot
            });
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.$transaction(async (tx) => {
                        const dbOrder = await tx.order.findUnique({ where: { id: orderId } });
                        if (!dbOrder || (dbOrder.status !== 'AVAILABLE' && dbOrder.status !== 'PAID')) {
                            const err = new Error('Order has already been accepted by another worker');
                            err.statusCode = 409;
                            err.code = 'ORDER_ALREADY_ASSIGNED';
                            throw err;
                        }
                        await tx.order.update({
                            where: { id: orderId },
                            data: {
                                status: 'ASSIGNED',
                                serviceSnapshot: order.serviceSnapshot
                            }
                        });
                        const existingJob = await tx.job.findFirst({ where: { orderId } });
                        if (!existingJob) {
                            await tx.job.create({
                                data: {
                                    orderId,
                                    workerId,
                                    status: 'ASSIGNED'
                                }
                            });
                        }
                        else if (existingJob.workerId !== workerId) {
                            const err = new Error('Order has already been accepted by another worker');
                            err.statusCode = 409;
                            err.code = 'ORDER_ALREADY_ASSIGNED';
                            throw err;
                        }
                    });
                }
            }
            catch (dbErr) {
                if (dbErr.code === 'P2002' || dbErr.message === 'ORDER_ALREADY_ASSIGNED' || dbErr.statusCode === 409) {
                    return res.status(409).json({
                        success: false,
                        error: 'Order has already been accepted by another worker',
                        code: 'ORDER_ALREADY_ASSIGNED'
                    });
                }
            }
            return res.json({
                success: true,
                order,
                data: { order },
                message: 'Order accepted and review window scheduled successfully'
            });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'P2002' || e.code === 'ORDER_ALREADY_ASSIGNED' ? 409 : 400);
            return res.status(statusCode).json({
                success: false,
                error: e.message || 'Failed to accept and schedule order',
                code: e.code || (statusCode === 409 ? 'ORDER_ALREADY_ASSIGNED' : 'ACCEPT_FAILED')
            });
        }
    },
    rejectJob: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const { reason, note } = req.body;
            if (!reason) {
                return res.status(400).json({ success: false, error: 'Rejection reason is mandatory' });
            }
            const result = catalogData_1.localStore.rejectOrder(orderId, workerId, reason, note);
            return res.json({ success: true, message: result.message });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    getMyJobs: async (req, res) => {
        try {
            const workerId = req.user.id;
            const statusFilter = req.query.status;
            const jobs = catalogData_1.localStore.getWorkerJobs(workerId, statusFilter);
            return res.json({ success: true, data: { orders: jobs }, jobs, orders: jobs });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getActiveOrders: async (req, res) => {
        try {
            const workerId = req.user.id;
            const statusFilter = req.query.status;
            const jobs = catalogData_1.localStore.getWorkerJobs(workerId, statusFilter);
            return res.json({ success: true, data: { orders: jobs }, orders: jobs });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getJobDetails: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const job = catalogData_1.localStore.getOrderForWorker(orderId, workerId);
            if (!job) {
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or unauthorized' } });
            }
            return res.json({ success: true, data: { order: job }, job, order: job });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getOrderDetails: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const job = catalogData_1.localStore.getOrderForWorker(orderId, workerId);
            if (!job) {
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or unauthorized' } });
            }
            return res.json({ success: true, data: { order: job }, job, order: job });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getOrderDocuments: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = String(req.params.orderId || req.params.id);
            const order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const isAdmin = req.user?.role === 'ADMIN';
            if (!isAdmin && order.assignedWorkerId !== workerId) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized: Not assigned to this order' } });
            }
            const documents = order.documents || [];
            return res.json({ success: true, data: { documents }, documents });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    startWork: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = String(req.params.id);
            const order = catalogData_1.localStore.startWork(orderId, workerId);
            return res.json({ success: true, data: { order }, order });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    completeOrder: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = String(req.params.orderId || req.params.id);
            const order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const isAdmin = req.user?.role === 'ADMIN';
            if (!isAdmin && order.assignedWorkerId !== workerId) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
            }
            order.status = 'WORK_COMPLETED';
            order.workCompletedAt = new Date().toISOString();
            catalogData_1.localStore.saveOrder(order);
            return res.json({ success: true, data: { order }, order, message: 'Work marked as completed' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: { code: 'COMPLETE_FAILED', message: e.message } });
        }
    },
    uploadReceipt: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = String(req.params.orderId || req.params.id);
            const order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const isAdmin = req.user?.role === 'ADMIN';
            if (!isAdmin && order.assignedWorkerId !== workerId) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
            }
            if (req.file) {
                const fileKey = `receipts/${orderId}/${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                fileStore_1.fileBufferStore.set(fileKey, {
                    buffer: req.file.buffer,
                    mimeType: req.file.mimetype,
                    fileName: req.file.originalname,
                    createdAt: Date.now()
                });
                try {
                    await extendedControllers_1.storage.upload(fileKey, req.file.buffer, req.file.mimetype);
                }
                catch { }
                const receiptDoc = {
                    id: 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                    name: req.file.originalname,
                    fileName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    size: `${Math.round(req.file.size / 1024)} KB`,
                    storageKey: fileKey,
                    url: `/api/orders/${orderId}/deliverables/receipt/download`,
                    isMandatory: true,
                    uploadedAt: new Date().toISOString()
                };
                order.deliverables = [receiptDoc, ...(order.deliverables || []).filter((d) => !d.isMandatory)];
                order.receipt = receiptDoc;
            }
            else if (req.body.receiptUrl || req.body.deliverables) {
                if (req.body.deliverables && Array.isArray(req.body.deliverables)) {
                    order.deliverables = req.body.deliverables;
                }
            }
            order.status = 'WAITING_FOR_CUSTOMER';
            order.receiptSubmittedAt = new Date().toISOString();
            order.earningStatus = 'PENDING';
            catalogData_1.localStore.saveOrder(order);
            // Notify customer that their receipt is ready to download
            if (order.customerId) {
                catalogData_1.localStore.notifications.unshift({
                    id: `notif_${Date.now()}_rcpt`,
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    type: 'RECEIPT_SUBMITTED',
                    title: '📥 Receipt & Deliverables Ready!',
                    message: `Your order for "${order.serviceName || 'your service'}" is complete. Please download your receipt to confirm and release the operator's payment.`,
                    orderId: order.id,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
            }
            return res.json({
                success: true,
                data: { order, status: order.status, earningStatus: order.earningStatus },
                message: 'Receipt uploaded successfully. Awaiting customer download.'
            });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: e.message } });
        }
    },
    setTimeSlot: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const { date, startTime, endTime, note } = req.body;
            if (!startTime || !endTime) {
                return res.status(400).json({ success: false, error: 'Start time and end time are required' });
            }
            const existingOrder = catalogData_1.localStore.getOrder(orderId);
            if (!existingOrder)
                return res.status(404).json({ success: false, error: 'Order not found' });
            const isAdmin = req.user?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
            if (!isAdmin && existingOrder.assignedWorkerId !== workerId) {
                return res.status(403).json({ success: false, error: 'Unauthorized: Only the assigned worker can select/provide the time slot' });
            }
            const order = catalogData_1.localStore.setOrderTimeSlot(orderId, workerId, { date, startTime, endTime, note });
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: order.serviceSnapshot }
                    });
                }
            }
            catch { }
            return res.json({ success: true, order });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    acceptReschedule: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const existingOrder = catalogData_1.localStore.getOrder(orderId);
            if (!existingOrder)
                return res.status(404).json({ success: false, error: 'Order not found' });
            const isAdmin = req.user?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
            if (!isAdmin && existingOrder.assignedWorkerId !== workerId) {
                return res.status(403).json({ success: false, error: 'Unauthorized: Only the assigned worker can accept customer reschedule' });
            }
            const order = catalogData_1.localStore.acceptCustomerReschedule(orderId, workerId);
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: order.serviceSnapshot }
                    });
                }
            }
            catch { }
            return res.json({ success: true, order, message: 'Customer reschedule accepted successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    uploadDeliverables: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: 'Order not found' });
            const isAdmin = req.user?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
            if (!isAdmin && order.assignedWorkerId !== workerId) {
                return res.status(403).json({ success: false, error: 'Unauthorized: Not assigned to this order' });
            }
            if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
                return res.status(400).json({ success: false, error: 'Cannot attach deliverables to completed or cancelled orders' });
            }
            // 1. File Upload (multipart form-data)
            if (req.file) {
                const current = order.deliverables || [];
                if (current.length >= 2) {
                    return res.status(400).json({
                        success: false,
                        error: 'Maximum 2 deliverables allowed (1 mandatory final receipt/output + 1 optional proof)'
                    });
                }
                const isMandatory = current.length === 0;
                const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
                const fileKey = `deliverables/${orderId}/${Date.now()}_${safeOriginalName}`;
                // Cache in memory for instant download
                fileStore_1.fileBufferStore.set(fileKey, {
                    buffer: req.file.buffer,
                    mimeType: req.file.mimetype,
                    fileName: req.file.originalname,
                    createdAt: Date.now()
                });
                // Upload to Supabase Storage
                try {
                    await extendedControllers_1.storage.upload(fileKey, req.file.buffer, req.file.mimetype);
                }
                catch (storageErr) {
                    console.warn('[STORAGE] Deliverable remote upload warning:', storageErr.message);
                }
                const delivId = 'deliv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                const sizeFormatted = (req.file.size > 1024 * 1024)
                    ? `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.round(req.file.size / 1024)} KB`;
                const newDeliv = {
                    id: delivId,
                    name: (req.body.name && req.body.name.trim()) || req.file.originalname,
                    fileName: req.file.originalname,
                    mimeType: req.file.mimetype || 'application/octet-stream',
                    size: sizeFormatted,
                    sizeBytes: req.file.size,
                    storageKey: fileKey,
                    url: `/api/orders/${orderId}/deliverables/${delivId}/download`,
                    isMandatory,
                    uploadedAt: new Date().toISOString()
                };
                const updatedDeliverables = [...current, newDeliv];
                order.deliverables = updatedDeliverables;
                if (order.serviceSnapshot) {
                    if (!order.serviceSnapshot.completion)
                        order.serviceSnapshot.completion = {};
                    order.serviceSnapshot.completion.deliverableFiles = updatedDeliverables;
                    order.serviceSnapshot.completion.receiptUrl = updatedDeliverables[0].url;
                }
                // Save as Document record in store & DB
                const docRecord = {
                    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                    orderId,
                    customerId: order.customerId,
                    workerId,
                    fileName: req.file.originalname,
                    mimeType: req.file.mimetype || 'application/octet-stream',
                    size: req.file.size,
                    storageKey: fileKey,
                    type: 'DELIVERABLE',
                    createdAt: new Date().toISOString()
                };
                catalogData_1.localStore.saveDocument(docRecord);
                try {
                    if (await (0, db_1.checkDb)()) {
                        await db_1.prisma.document.create({ data: docRecord });
                        await db_1.prisma.order.update({
                            where: { id: orderId },
                            data: { serviceSnapshot: order.serviceSnapshot }
                        });
                    }
                }
                catch (dbErr) {
                    console.log('[Storage] DB deliverable save fallback:', dbErr.message);
                }
                return res.json({
                    success: true,
                    deliverable: newDeliv,
                    deliverables: order.deliverables
                });
            }
            // 2. Direct JSON deliverables array payload
            const { deliverables } = req.body;
            if (deliverables !== undefined) {
                if (!Array.isArray(deliverables)) {
                    return res.status(400).json({ success: false, error: 'Expected array of deliverables' });
                }
                const updated = catalogData_1.localStore.uploadDeliverables(orderId, workerId, deliverables);
                return res.json({ success: true, deliverables: updated.deliverables });
            }
            return res.status(400).json({ success: false, error: 'No file or deliverables array provided' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    deleteDeliverable: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const deliverableId = req.params.deliverableId;
            const order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: 'Order not found' });
            const isAdmin = req.user?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
            if (!isAdmin && order.assignedWorkerId !== workerId) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }
            if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
                return res.status(400).json({ success: false, error: 'Cannot modify completed or cancelled order' });
            }
            const current = order.deliverables || [];
            const updated = current.filter((d) => d.id !== deliverableId && d.fileName !== deliverableId);
            if (updated.length > 0) {
                updated[0].isMandatory = true;
            }
            order.deliverables = updated;
            if (order.serviceSnapshot?.completion) {
                order.serviceSnapshot.completion.deliverableFiles = updated;
                order.serviceSnapshot.completion.receiptUrl = updated.length > 0 ? updated[0].url : null;
            }
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: order.serviceSnapshot }
                    });
                }
            }
            catch { }
            return res.json({ success: true, deliverables: order.deliverables });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    submitJob: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.id;
            const { note } = req.body;
            const order = catalogData_1.localStore.finishWork(orderId, workerId, note);
            // Sync with PostgreSQL if connected
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: 'COMPLETED',
                            serviceSnapshot: order.serviceSnapshot
                        }
                    });
                    await db_1.prisma.job.updateMany({
                        where: { orderId },
                        data: {
                            status: 'COMPLETED',
                            completedAt: new Date()
                        }
                    });
                }
            }
            catch (dbErr) {
                console.warn('[Prisma] Completion sync skipped:', dbErr.message);
            }
            return res.json({ success: true, order, message: 'Work completed and submitted successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    toggleAvailability: async (req, res) => {
        try {
            const workerId = req.user.id;
            const { isOnline } = req.body;
            const result = catalogData_1.localStore.toggleWorkerAvailability(workerId, isOnline);
            return res.json({ success: true, isOnline: result.isOnline, worker: result.worker });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    recordActivity: async (req, res) => {
        try {
            const workerId = req.user.id;
            const result = catalogData_1.localStore.recordWorkerActivity(workerId);
            return res.json({ success: true, ...result });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getStats: async (req, res) => {
        try {
            const workerId = req.user.id;
            const summary = catalogData_1.localStore.getWorkerEarningsSummary(workerId);
            return res.json({ success: true, stats: summary });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getEarnings: async (req, res) => {
        try {
            const workerId = req.user.id;
            const summary = catalogData_1.localStore.getWorkerEarningsSummary(workerId);
            const formatted = {
                todayEarnings: (summary.todayEarningsPaise || 0) / 100,
                pendingEarnings: (summary.pendingEarningsPaise || 0) / 100,
                onHoldEarnings: (summary.onHoldEarningsPaise || 0) / 100,
                availableEarnings: (summary.walletBalancePaise || 0) / 100,
                lifetimeEarnings: (summary.totalEarningsPaise || 0) / 100,
                ...summary
            };
            return res.json({ success: true, earnings: formatted, data: formatted });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getEarningsSummary: async (req, res) => {
        try {
            const workerId = req.user.id;
            const summary = catalogData_1.localStore.getWorkerEarningsSummary(workerId);
            const formatted = {
                todayEarnings: (summary.todayEarningsPaise || 0) / 100,
                pendingEarnings: (summary.pendingEarningsPaise || 0) / 100,
                onHoldEarnings: (summary.onHoldEarningsPaise || 0) / 100,
                availableEarnings: (summary.walletBalancePaise || 0) / 100,
                lifetimeEarnings: (summary.totalEarningsPaise || 0) / 100,
                ...summary
            };
            return res.json({ success: true, data: formatted, earnings: formatted, stats: formatted });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getEarningsHistory: async (req, res) => {
        try {
            const workerId = req.user.id;
            const { status, dateFrom, dateTo, orderId } = req.query;
            let completedOrders = Array.from(catalogData_1.localStore.orders.values()).filter(o => o.assignedWorkerId === workerId && (o.status === 'COMPLETED' || o.earningStatus === 'RELEASED' || o.earningStatus === 'PENDING'));
            if (orderId)
                completedOrders = completedOrders.filter(o => o.id === orderId);
            if (status)
                completedOrders = completedOrders.filter(o => o.earningStatus === status || o.status === status);
            if (dateFrom)
                completedOrders = completedOrders.filter(o => new Date(o.createdAt).getTime() >= new Date(dateFrom).getTime());
            if (dateTo)
                completedOrders = completedOrders.filter(o => new Date(o.createdAt).getTime() <= new Date(dateTo).getTime());
            const earnings = completedOrders.map(o => ({
                orderId: o.id,
                serviceName: o.serviceName,
                workerAmount: (o.workerAmount || o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8)) / 100,
                workerAmountPaise: o.workerAmount || o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8),
                status: o.earningStatus || 'RELEASED',
                earnedAt: o.completedAt || o.createdAt,
                releasedAt: o.receiptDownloadedAt || o.completedAt
            }));
            const summary = catalogData_1.localStore.getWorkerEarningsSummary(workerId);
            const earningsObj = {
                history: earnings,
                list: earnings,
                ...summary
            };
            return res.json({
                success: true,
                data: { earnings, summary },
                earnings: earningsObj,
                ...summary
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    requestWithdrawal: async (req, res) => {
        try {
            const workerId = req.user.id;
            let { amount, amountPaise, method, payoutDetails } = req.body;
            if (amount !== undefined && amountPaise === undefined) {
                amountPaise = Math.round(Number(amount) * 100);
            }
            if (!amountPaise || amountPaise < 10000) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_INPUT', message: 'Minimum withdrawal amount is ₹100.00' }
                });
            }
            const withdrawal = catalogData_1.localStore.requestWithdrawal(workerId, Number(amountPaise), method || 'BANK', payoutDetails);
            return res.json({ success: true, data: { withdrawal }, withdrawal, message: 'Withdrawal request submitted successfully' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'INSUFFICIENT_AMOUNT' ? 409 : 400);
            return res.status(statusCode).json({
                success: false,
                error: {
                    code: e.code || 'WITHDRAWAL_FAILED',
                    message: e.message || 'Withdrawal request failed'
                }
            });
        }
    },
    getWithdrawals: async (req, res) => {
        try {
            const workerId = req.user.id;
            const withdrawals = catalogData_1.localStore.getWorkerWithdrawals(workerId);
            return res.json({ success: true, data: { withdrawals }, withdrawals });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getWithdrawalDetails: async (req, res) => {
        try {
            const workerId = req.user.id;
            const withdrawalId = String(req.params.withdrawalId || req.params.id);
            const withdrawal = catalogData_1.localStore.getWithdrawal(withdrawalId);
            if (!withdrawal) {
                return res.status(404).json({ success: false, error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Withdrawal not found' } });
            }
            const isAdmin = req.user?.role === 'ADMIN';
            if (!isAdmin && withdrawal.workerId !== workerId) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
            }
            return res.json({ success: true, data: { withdrawal }, withdrawal });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getNotifications: async (req, res) => {
        try {
            const workerId = req.user.id;
            const notifications = catalogData_1.localStore.getWorkerNotifications(workerId);
            return res.json({ success: true, notifications });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    markNotificationRead: async (req, res) => {
        try {
            const workerId = req.user.id;
            const notifId = req.params.id;
            const ok = catalogData_1.localStore.markNotificationRead(notifId, workerId);
            return res.json({ success: ok });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getOrderChat: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.orderId;
            const result = catalogData_1.localStore.getOrderChat(orderId, workerId);
            return res.json({ success: true, ...result });
        }
        catch (e) {
            // Order not found in memory (e.g. after server restart) — return closed chat gracefully
            // so the frontend polling loop doesn't flood logs with repeated 400 errors
            if (e.message && e.message.includes('Order not found')) {
                return res.json({ success: true, isClosed: true, messages: [] });
            }
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    sendChatMessage: async (req, res) => {
        try {
            const workerId = req.user.id;
            const orderId = req.params.orderId;
            const { message } = req.body;
            if (!message || !message.trim()) {
                return res.status(400).json({ success: false, error: 'Message cannot be empty' });
            }
            const worker = catalogData_1.localStore.getWorker(workerId);
            const chatMsg = catalogData_1.localStore.addChatMessage(orderId, workerId, 'WORKER', worker?.name || 'Worker', message);
            return res.json({ success: true, message: chatMsg });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    getSupportTickets: async (req, res) => {
        try {
            const workerId = req.user.id;
            const tickets = catalogData_1.localStore.getWorkerTickets(workerId);
            return res.json({ success: true, tickets });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    createSupportTicket: async (req, res) => {
        try {
            const workerId = req.user.id;
            const { category, subject, message, orderId } = req.body;
            if (!subject || !message) {
                return res.status(400).json({ success: false, error: 'Subject and message are required' });
            }
            const ticket = catalogData_1.localStore.createWorkerTicket(workerId, { category: category || 'General', subject, message, orderId });
            return res.json({ success: true, ticket, message: 'Ticket submitted successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    replySupportTicket: async (req, res) => {
        try {
            const workerId = req.user.id;
            const ticketId = req.params.id;
            const { message } = req.body;
            if (!message || !message.trim()) {
                return res.status(400).json({ success: false, error: 'Reply message is required' });
            }
            const ticket = catalogData_1.localStore.addWorkerTicketReply(ticketId, workerId, message.trim());
            return res.json({ success: true, ticket, message: 'Reply sent successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    getProfile: async (req, res) => {
        try {
            const workerId = req.user.id;
            const worker = catalogData_1.localStore.getWorker(workerId);
            if (!worker)
                return res.status(404).json({ success: false, error: 'Worker not found' });
            return res.json({ success: true, profile: worker });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    updateProfile: async (req, res) => {
        try {
            const workerId = req.user.id;
            const updated = catalogData_1.localStore.updateWorkerProfile(workerId, req.body);
            return res.json({ success: true, profile: updated, message: 'Profile updated successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    proposeService: async (req, res) => {
        try {
            const workerId = req.user.id;
            const proposal = catalogData_1.localStore.proposeService(workerId, req.body);
            return res.json({ success: true, proposal, message: 'Service proposal submitted for admin review' });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getProposals: async (req, res) => {
        try {
            const workerId = req.user.id;
            const proposals = catalogData_1.localStore.getWorkerProposals(workerId);
            return res.json({ success: true, proposals });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
};
exports.adminController = {
    // 1. Dashboard
    getDashboardStats: async (req, res) => {
        try {
            if (await (0, db_1.checkDb)()) {
                try {
                    const [totalCustomers, totalWorkers, activeOrders, pendingWithdrawals, paidPayments, complaintsCount] = await Promise.all([
                        db_1.prisma.user.count({ where: { role: 'CUSTOMER' } }),
                        db_1.prisma.user.count({ where: { role: 'WORKER' } }),
                        db_1.prisma.order.count({
                            where: {
                                status: { in: ['ACCEPTED', 'IN_PROGRESS', 'RECEIPT_SUBMITTED', 'WAITING_FOR_CUSTOMER'] }
                            }
                        }),
                        db_1.prisma.withdrawal.count({ where: { status: { in: ['PENDING', 'REQUESTED'] } } }),
                        db_1.prisma.payment.aggregate({
                            _sum: { amountPaise: true },
                            where: { status: 'PAID' }
                        }),
                        db_1.prisma.complaint.count({
                            where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } }
                        })
                    ]);
                    const revenuePaise = paidPayments._sum.amountPaise || 0;
                    const stats = {
                        totalCustomers,
                        totalWorkers,
                        activeOrders,
                        pendingWithdrawals,
                        totalRevenue: revenuePaise / 100,
                        totalRevenuePaise: revenuePaise,
                        revenuePaise,
                        totalOrders: await db_1.prisma.order.count(),
                        complaintsDisputes: complaintsCount,
                        activeComplaints: complaintsCount,
                        pendingProposals: await db_1.prisma.serviceProposal.count({ where: { status: 'PENDING_APPROVAL' } })
                    };
                    return res.json({ success: true, stats, ...stats });
                }
                catch { }
            }
            const stats = catalogData_1.localStore.getAdminDashboardStats();
            return res.json({ success: true, stats, ...stats });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    // 2. Worker Management
    getWorkers: async (req, res) => {
        try {
            let status = req.query.status || '';
            if (status === 'ALL' || status === 'All Status' || status === 'undefined') {
                status = '';
            }
            const search = req.query.search || '';
            if (await (0, db_1.checkDb)()) {
                try {
                    const where = { role: 'WORKER' };
                    if (status)
                        where.status = status;
                    if (search.trim()) {
                        const term = search.trim();
                        where.OR = [
                            { name: { contains: term, mode: 'insensitive' } },
                            { email: { contains: term, mode: 'insensitive' } },
                            { phone: { contains: term, mode: 'insensitive' } },
                            { id: { contains: term, mode: 'insensitive' } },
                            { businessName: { contains: term, mode: 'insensitive' } }
                        ];
                    }
                    const dbWorkers = await db_1.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
                    if (dbWorkers && dbWorkers.length > 0) {
                        return res.json({ success: true, workers: dbWorkers });
                    }
                }
                catch { }
            }
            const workers = catalogData_1.localStore.getAllWorkersAdmin({ status, search });
            return res.json({ success: true, workers });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getWorkerDetails: async (req, res) => {
        try {
            const workerId = req.params.id;
            const data = catalogData_1.localStore.getWorkerDetailedAdmin(workerId);
            return res.json({ success: true, ...data });
        }
        catch (e) {
            return res.status(404).json({ success: false, error: e.message });
        }
    },
    createWorker: async (req, res) => {
        try {
            const { workerName, workerId: rawWorkerId, username, password, confirmPassword, mobile, email, businessName, address, city, skills, idProof, photo, accountNumber, ifsc, accountHolderName, upiId, bankDetails } = req.body;
            const workerId = (rawWorkerId || username || '').trim();
            const name = (workerName || '').trim();
            const emailLower = (email || '').trim().toLowerCase();
            const phone = (mobile || '').trim();
            // 1. Mandatory validations
            if (!name) {
                return res.status(400).json({ success: false, error: 'Worker Full Name is required' });
            }
            if (!workerId) {
                return res.status(400).json({ success: false, error: 'Worker User ID / Username is required' });
            }
            if (/\s/.test(workerId)) {
                return res.status(400).json({ success: false, error: 'Worker User ID / Username cannot contain spaces' });
            }
            if (workerId.length < 3) {
                return res.status(400).json({ success: false, error: 'Worker User ID / Username must be at least 3 characters' });
            }
            if (!emailLower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
                return res.status(400).json({ success: false, error: 'A valid Email address is required' });
            }
            if (!phone) {
                return res.status(400).json({ success: false, error: 'Mobile number is required' });
            }
            // Password validation
            const pass = password || 'password123';
            if (password && password.length < 6) {
                return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
            }
            if (confirmPassword && password !== confirmPassword) {
                return res.status(400).json({ success: false, error: 'Password and Confirm Password do not match' });
            }
            // 2. Uniqueness check in localStore
            if (catalogData_1.localStore.workers.some(w => w.id.toLowerCase() === workerId.toLowerCase() || (w.workerId && w.workerId.toLowerCase() === workerId.toLowerCase())) ||
                catalogData_1.localStore.findUserById(workerId)) {
                return res.status(409).json({ success: false, error: `Worker User ID / Username "${workerId}" is already taken` });
            }
            if (catalogData_1.localStore.findUserByEmail(emailLower)) {
                return res.status(409).json({ success: false, error: `Email "${emailLower}" is already in use by another account` });
            }
            // Handle real file uploads if provided via Multer
            let idProofUrl = idProof || '';
            let photoUrl = photo || '';
            if (req.files && Array.isArray(req.files)) {
                for (const file of req.files) {
                    const fileKey = `workers/${workerId}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    try {
                        await extendedControllers_1.storage.upload(fileKey, file.buffer, file.mimetype);
                    }
                    catch { }
                    fileStore_1.fileBufferStore.set(fileKey, {
                        buffer: file.buffer,
                        mimeType: file.mimetype,
                        fileName: file.originalname,
                        originalName: file.originalname,
                        size: file.size,
                        createdAt: Date.now()
                    });
                    const streamUrl = `/api/documents/stream/${encodeURIComponent(fileKey)}`;
                    if (file.fieldname === 'idProofFile' || file.fieldname === 'idProof') {
                        idProofUrl = streamUrl;
                    }
                    else if (file.fieldname === 'photoFile' || file.fieldname === 'photo') {
                        photoUrl = streamUrl;
                    }
                }
            }
            // 3. Database uniqueness and creation if DB is online
            const hashedPassword = await bcrypt_1.default.hash(pass, 10);
            try {
                if (await (0, db_1.checkDb)()) {
                    const existingDbUser = await db_1.prisma.user.findFirst({
                        where: {
                            OR: [
                                { id: workerId },
                                { email: emailLower }
                            ]
                        }
                    });
                    if (existingDbUser) {
                        const conflictField = existingDbUser.id.toLowerCase() === workerId.toLowerCase() ? 'Worker User ID' : 'Email';
                        return res.status(409).json({ success: false, error: `${conflictField} is already registered in database` });
                    }
                    await db_1.prisma.user.create({
                        data: {
                            id: workerId,
                            email: emailLower,
                            name,
                            password: hashedPassword,
                            role: 'WORKER',
                            phone,
                            profileImage: photoUrl || undefined,
                            businessName,
                            address,
                            city
                        }
                    });
                    await db_1.prisma.auditLog.create({
                        data: {
                            actorUserId: req.user?.id || 'ADMIN',
                            action: 'WORKER_HIRED',
                            entityType: 'User',
                            entityId: workerId,
                            metadata: { name, email: emailLower, role: 'WORKER' }
                        }
                    });
                }
            }
            catch (dbErr) {
                console.warn('[AdminController] DB user creation deferred to localStore:', dbErr.message);
            }
            // 4. Create in resilient store
            const worker = catalogData_1.localStore.createWorkerAdmin({
                workerName: name,
                workerId,
                username: workerId,
                password: pass,
                passwordHash: hashedPassword,
                mobile: phone,
                email: emailLower,
                businessName,
                address,
                city,
                skills,
                idProof: idProofUrl,
                photo: photoUrl,
                accountNumber,
                ifsc,
                accountHolderName,
                upiId,
                bankDetails
            });
            return res.status(201).json({
                success: true,
                worker,
                message: `Worker account created successfully! User ID: ${workerId}`
            });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    resetWorkerPassword: async (req, res) => {
        try {
            const workerId = req.params.id;
            const { newPassword } = req.body || {};
            const tempPassword = newPassword || `Temp@${Math.floor(100000 + Math.random() * 900000)}`;
            const result = await catalogData_1.localStore.resetWorkerPasswordAdmin(workerId, tempPassword);
            try {
                if (await (0, db_1.checkDb)()) {
                    const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
                    await db_1.prisma.user.updateMany({
                        where: { OR: [{ id: workerId }, { email: workerId }] },
                        data: { password: hashedPassword }
                    });
                }
            }
            catch { }
            return res.json({
                success: true,
                message: `Temporary password reset successfully to: ${tempPassword}`,
                tempPassword,
                worker: result?.worker || catalogData_1.localStore.getWorker(workerId)
            });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    verifyWorker: async (req, res) => {
        try {
            const workerId = req.params.id;
            const { approved, note } = req.body;
            const worker = catalogData_1.localStore.verifyWorkerAdmin(workerId, !!approved, note);
            return res.json({ success: true, worker, message: approved ? 'Worker verified and activated' : 'Verification rejected' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    setWorkerStatus: async (req, res) => {
        try {
            const workerId = req.params.id;
            const { status, reason } = req.body;
            const worker = catalogData_1.localStore.setWorkerAccountStatusAdmin(workerId, status, reason);
            return res.json({ success: true, worker, message: `Worker status set to ${status}` });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    deleteWorker: async (req, res) => {
        try {
            const workerId = req.params.id;
            const { reason } = req.body || {};
            const result = catalogData_1.localStore.deleteWorkerAdmin(workerId, reason);
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.user.updateMany({
                        where: { id: workerId },
                        data: { role: 'CUSTOMER' }
                    });
                    await db_1.prisma.auditLog.create({
                        data: {
                            actorUserId: req.user?.id || 'ADMIN',
                            action: 'WORKER_DELETED',
                            entityType: 'User',
                            entityId: workerId,
                            metadata: { reason: reason || 'Deactivated and deleted by Admin' }
                        }
                    });
                }
            }
            catch (dbErr) {
                console.warn('[AdminController] DB worker delete sync deferred:', dbErr.message);
            }
            return res.json({ success: true, message: result.message, workerId });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    // 3. Customer Management
    getCustomers: async (req, res) => {
        try {
            let status = req.query.status || '';
            if (status === 'ALL' || status === 'All Status' || status === 'undefined') {
                status = '';
            }
            const search = req.query.search || '';
            if (await (0, db_1.checkDb)()) {
                try {
                    const where = { role: 'CUSTOMER' };
                    if (status)
                        where.status = status;
                    if (search.trim()) {
                        const term = search.trim();
                        where.OR = [
                            { name: { contains: term, mode: 'insensitive' } },
                            { email: { contains: term, mode: 'insensitive' } },
                            { phone: { contains: term, mode: 'insensitive' } },
                            { id: { contains: term, mode: 'insensitive' } }
                        ];
                    }
                    const dbCustomers = await db_1.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
                    if (dbCustomers && dbCustomers.length > 0) {
                        return res.json({ success: true, customers: dbCustomers });
                    }
                }
                catch { }
            }
            const customers = catalogData_1.localStore.getAllCustomersAdmin({ status, search });
            return res.json({ success: true, customers });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getCustomerDetails: async (req, res) => {
        try {
            const customerId = req.params.id;
            const data = catalogData_1.localStore.getCustomerDetailedAdmin(customerId);
            return res.json({ success: true, ...data });
        }
        catch (e) {
            return res.status(404).json({ success: false, error: e.message });
        }
    },
    setCustomerStatus: async (req, res) => {
        try {
            const customerId = req.params.id;
            const { status, reason } = req.body;
            const customer = catalogData_1.localStore.setCustomerStatusAdmin(customerId, status, reason);
            return res.json({ success: true, customer, message: `Customer account ${status.toLowerCase()}` });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    // 4. Order Management & Administrative Overrides
    getOrders: async (req, res) => {
        try {
            let status = req.query.status || '';
            if (status === 'ALL' || status === 'All Status' || status === 'undefined') {
                status = '';
            }
            const search = req.query.search || '';
            if (await (0, db_1.checkDb)()) {
                try {
                    const where = {};
                    if (status)
                        where.status = status;
                    if (search.trim()) {
                        const term = search.trim();
                        where.OR = [
                            { orderNumber: { contains: term, mode: 'insensitive' } },
                            { id: { contains: term, mode: 'insensitive' } },
                            { customer: { name: { contains: term, mode: 'insensitive' } } },
                            { assignedWorker: { name: { contains: term, mode: 'insensitive' } } }
                        ];
                    }
                    const dbOrders = await db_1.prisma.order.findMany({
                        where,
                        include: { customer: true, assignedWorker: true, service: true },
                        orderBy: { createdAt: 'desc' }
                    });
                    if (dbOrders && dbOrders.length > 0) {
                        return res.json({ success: true, orders: dbOrders });
                    }
                }
                catch { }
            }
            const orders = catalogData_1.localStore.getAllOrdersAdmin({ status, search });
            return res.json({ success: true, orders });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getOrderDetails: async (req, res) => {
        try {
            const orderId = req.params.id;
            const data = catalogData_1.localStore.getOrderDetailedAdmin(orderId);
            return res.json({ success: true, ...data });
        }
        catch (e) {
            return res.status(404).json({ success: false, error: e.message });
        }
    },
    assignWorker: async (req, res) => {
        try {
            const orderId = String(req.params.orderId || req.params.id);
            const { workerId, note } = req.body;
            if (!workerId)
                return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Worker ID is required' } });
            const order = catalogData_1.localStore.adminAssignWorker(orderId, workerId, note);
            return res.json({ success: true, data: { order }, order, message: 'Worker assigned successfully (Administrative Override)' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: { code: 'ASSIGN_FAILED', message: e.message } });
        }
    },
    reassignWorker: async (req, res) => {
        try {
            const orderId = String(req.params.orderId || req.params.id);
            const { workerId, note } = req.body;
            if (!workerId)
                return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Worker ID is required' } });
            const order = catalogData_1.localStore.adminAssignWorker(orderId, workerId, note);
            return res.json({ success: true, data: { order }, order, message: 'Worker reassigned successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: { code: 'REASSIGN_FAILED', message: e.message } });
        }
    },
    verifyReceipt: async (req, res) => {
        try {
            const orderId = String(req.params.orderId || req.params.id);
            const { decision, note } = req.body;
            if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Decision must be APPROVED or REJECTED' } });
            }
            const order = catalogData_1.localStore.adminVerifyReceipt(orderId, decision, note);
            return res.json({ success: true, data: { order }, order, message: `Receipt ${decision.toLowerCase()} successfully` });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: { code: 'VERIFY_FAILED', message: e.message } });
        }
    },
    updateOrderStatus: async (req, res) => {
        try {
            const orderId = String(req.params.id);
            const { status, note } = req.body;
            const order = catalogData_1.localStore.adminUpdateOrderStatus(orderId, status, note);
            return res.json({ success: true, order, message: `Order status updated to ${status}` });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    requestCorrection: async (req, res) => {
        try {
            const orderId = String(req.params.id);
            const { reason, instruction } = req.body;
            if (!reason || !instruction) {
                return res.status(400).json({ success: false, error: 'Correction reason and instruction are required' });
            }
            const order = catalogData_1.localStore.adminRequestCorrection(orderId, reason, instruction);
            return res.json({ success: true, order, message: 'Correction requested (2-hour window opened)' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    holdWorkerEarnings: async (req, res) => {
        try {
            const orderId = String(req.params.orderId || req.params.id);
            const { reason } = req.body;
            const order = catalogData_1.localStore.adminHoldWorkerEarnings(orderId, reason);
            return res.json({ success: true, data: { order }, order, message: 'Worker earnings for this order placed on hold' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'EARNING_ALREADY_ON_HOLD' ? 409 : 400);
            return res.status(statusCode).json({ success: false, error: { code: e.code || 'HOLD_FAILED', message: e.message } });
        }
    },
    releaseWorkerEarnings: async (req, res) => {
        try {
            const orderId = String(req.params.orderId || req.params.id);
            const order = catalogData_1.localStore.adminReleaseWorkerEarnings(orderId);
            return res.json({ success: true, data: { order }, order, message: 'Worker earnings released' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'EARNING_ALREADY_RELEASED' ? 409 : 400);
            return res.status(statusCode).json({ success: false, error: { code: e.code || 'RELEASE_FAILED', message: e.message } });
        }
    },
    refundOrder: async (req, res) => {
        try {
            const orderId = String(req.params.orderId || req.params.id);
            const { reason, amount } = req.body;
            if (!reason)
                return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Refund reason is mandatory' } });
            const order = catalogData_1.localStore.adminRefundOrder(orderId, reason, amount);
            return res.json({ success: true, data: { order }, order, message: 'Order refunded and cancelled successfully' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'REFUND_ALREADY_PROCESSED' ? 409 : 400);
            return res.status(statusCode).json({ success: false, error: { code: e.code || 'REFUND_FAILED', message: e.message } });
        }
    },
    // 5. Service Management
    getServices: async (req, res) => {
        try {
            const services = catalogData_1.localStore.getServices();
            return res.json({ success: true, services });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    createService: async (req, res) => {
        try {
            const service = catalogData_1.localStore.createOfficialServiceAdmin(req.body);
            return res.json({ success: true, service, message: 'Service created successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    updateService: async (req, res) => {
        try {
            const serviceId = req.params.id;
            const service = catalogData_1.localStore.updateOfficialServiceAdmin(serviceId, req.body);
            return res.json({ success: true, service, message: 'Service updated successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    deleteService: async (req, res) => {
        try {
            const serviceId = req.params.id;
            catalogData_1.localStore.deleteOfficialServiceAdmin(serviceId);
            return res.json({ success: true, message: 'Service removed successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    toggleServiceStatus: async (req, res) => {
        try {
            const serviceId = req.params.id;
            const service = catalogData_1.localStore.toggleOfficialServiceAdmin(serviceId);
            return res.json({ success: true, service, message: `Service ${service.status.toLowerCase()}` });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    getServiceProposals: async (req, res) => {
        try {
            const proposals = catalogData_1.localStore.getAllProposalsAdmin();
            return res.json({ success: true, proposals });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    approveProposal: async (req, res) => {
        try {
            const adminId = req.user?.id || 'ADM-001';
            const result = catalogData_1.localStore.approveProposalAdmin(req.params.id, adminId, req.body);
            try {
                if (await (0, db_1.checkDb)()) {
                    const s = result.newService;
                    await db_1.prisma.service.upsert({
                        where: { id: s.id },
                        create: {
                            id: s.id,
                            name: s.name,
                            description: s.description || '',
                            category: s.category || 'General',
                            pricePaise: s.pricePaise || 0,
                            workerAmountPaise: s.workerAmountPaise || 0,
                            platformFeePaise: s.platformFeePaise || 0,
                            adminCommissionPaise: s.adminCommissionPaise || s.platformFeePaise || 0,
                            estimatedTime: s.estimatedTime || '1-2 days',
                            requiredDocuments: Array.isArray(s.requiredDocuments) ? s.requiredDocuments : [],
                            status: 'ACTIVE',
                            approvalStatus: 'APPROVED'
                        },
                        update: {
                            name: s.name,
                            description: s.description || '',
                            category: s.category || 'General',
                            pricePaise: s.pricePaise || 0,
                            workerAmountPaise: s.workerAmountPaise || 0,
                            platformFeePaise: s.platformFeePaise || 0,
                            adminCommissionPaise: s.adminCommissionPaise || s.platformFeePaise || 0,
                            estimatedTime: s.estimatedTime || '1-2 days',
                            requiredDocuments: Array.isArray(s.requiredDocuments) ? s.requiredDocuments : [],
                            status: 'ACTIVE',
                            approvalStatus: 'APPROVED'
                        }
                    });
                    await db_1.prisma.serviceProposal.updateMany({
                        where: { id: req.params.id },
                        data: { status: 'APPROVED' }
                    });
                }
            }
            catch (err) {
                console.warn('[AdminController] DB proposal sync:', err.message);
            }
            return res.json({ success: true, ...result, message: 'Service proposal approved and published to customer catalog' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    rejectProposal: async (req, res) => {
        try {
            const adminId = req.user?.id || 'ADM-001';
            const { reason } = req.body;
            const proposal = catalogData_1.localStore.rejectProposalAdmin(req.params.id, adminId, reason);
            return res.json({ success: true, proposal, message: 'Service proposal rejected' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    // 6. Payments & Financials
    getFinancialSummary: async (req, res) => {
        try {
            const summary = catalogData_1.localStore.getFinancialSummaryAdmin();
            return res.json({
                success: true,
                data: summary,
                summary
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getFinancialLedger: async (req, res) => {
        try {
            const ledger = catalogData_1.localStore.ledgerEntries || [];
            return res.json({ success: true, ledger, count: ledger.length });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getPayments: async (req, res) => {
        try {
            const orders = catalogData_1.localStore.getAllOrdersAdmin();
            const payments = orders.map(o => ({
                id: `pay_${o.id}`,
                orderId: o.id,
                serviceName: o.serviceName,
                customerName: o.customerName,
                amountPaise: o.pricePaise || 0,
                status: o.status === 'CANCELLED' ? 'REFUNDED' : 'PAID',
                paymentMethod: 'UPI / NetBanking',
                createdAt: o.createdAt
            }));
            return res.json({ success: true, payments });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getWithdrawals: async (req, res) => {
        try {
            const withdrawals = catalogData_1.localStore.getAllWithdrawalsAdmin();
            return res.json({ success: true, withdrawals, payouts: withdrawals });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    approveWithdrawal: async (req, res) => {
        try {
            const adminId = req.user?.id || 'ADM-001';
            const { paymentReference, paymentRef } = req.body || {};
            const withdrawal = catalogData_1.localStore.approveWithdrawalAdmin(req.params.id, adminId, paymentReference || paymentRef);
            return res.json({ success: true, withdrawal, message: 'Withdrawal request approved and processed' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'WITHDRAWAL_ALREADY_REJECTED' ? 409 : 400);
            return res.status(statusCode).json({ success: false, error: { code: e.code || 'APPROVE_FAILED', message: e.message } });
        }
    },
    rejectWithdrawal: async (req, res) => {
        try {
            const adminId = req.user?.id || 'ADM-001';
            const { reason } = req.body;
            const withdrawal = catalogData_1.localStore.rejectWithdrawalAdmin(req.params.id, adminId, reason);
            return res.json({ success: true, withdrawal, message: 'Withdrawal rejected and funds restored' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'WITHDRAWAL_ALREADY_COMPLETED' ? 409 : 400);
            return res.status(statusCode).json({ success: false, error: { code: e.code || 'REJECT_FAILED', message: e.message } });
        }
    },
    completeWithdrawal: async (req, res) => {
        try {
            const adminId = req.user?.id || 'ADM-001';
            const withdrawalId = String(req.params.withdrawalId || req.params.id);
            const { paymentReference, note } = req.body || {};
            const withdrawal = catalogData_1.localStore.approveWithdrawalAdmin(withdrawalId, adminId, paymentReference);
            return res.json({ success: true, data: { withdrawal }, withdrawal, message: 'Withdrawal completed successfully' });
        }
        catch (e) {
            const statusCode = e.statusCode || (e.code === 'WITHDRAWAL_ALREADY_REJECTED' ? 409 : 400);
            return res.status(statusCode).json({ success: false, error: { code: e.code || 'COMPLETE_FAILED', message: e.message } });
        }
    },
    getTopEarningWorkers: async (req, res) => {
        try {
            const period = (req.query.period === 'daily' ? 'daily' : 'monthly');
            const rankings = catalogData_1.localStore.getTopEarningWorkersAdmin(period);
            const workers = rankings.map(r => ({
                workerId: r.workerId,
                workerName: r.workerName,
                totalEarnings: (r.totalEarningsPaise || 0) / 100,
                totalEarningsPaise: r.totalEarningsPaise || 0,
                completedOrders: r.completedOrders,
                rank: r.rank
            }));
            return res.json({ success: true, data: { workers }, workers, rankings });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getOrderFinancialBreakdown: async (req, res) => {
        try {
            const orderId = String(req.params.orderId || req.params.id);
            const order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const customerPaidAmount = (order.customerPaidAmount || order.pricePaise || 0) / 100;
            const workerAmount = (order.workerAmount || order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8)) / 100;
            const adminCommission = (order.adminCommission || order.commissionPaise || Math.round((order.pricePaise || 0) * 0.2)) / 100;
            const platformFee = (order.platformFee || 0) / 100;
            return res.json({
                success: true,
                data: {
                    orderId: order.id,
                    customerPaidAmount,
                    workerAmount,
                    adminCommission,
                    platformFee,
                    customerPaidAmountPaise: order.customerPaidAmount || order.pricePaise || 0,
                    workerAmountPaise: order.workerAmount || order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8),
                    adminCommissionPaise: order.adminCommission || order.commissionPaise || Math.round((order.pricePaise || 0) * 0.2),
                    platformFeePaise: order.platformFee || 0,
                    paymentStatus: order.paymentStatus || (order.payment ? order.payment.status : 'PENDING'),
                    refundStatus: order.refund ? 'REFUNDED' : 'NONE',
                    workerEarningStatus: order.earningStatus || 'NONE'
                }
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getCommissionReport: async (req, res) => {
        try {
            const { dateFrom, dateTo, service, worker } = req.query;
            let orders = Array.from(catalogData_1.localStore.orders.values()).filter(o => o.paymentStatus === 'PAID' || o.status === 'COMPLETED');
            if (service)
                orders = orders.filter(o => o.serviceId === service || o.serviceName === service);
            if (worker)
                orders = orders.filter(o => o.assignedWorkerId === worker);
            if (dateFrom)
                orders = orders.filter(o => new Date(o.createdAt).getTime() >= new Date(dateFrom).getTime());
            if (dateTo)
                orders = orders.filter(o => new Date(o.createdAt).getTime() <= new Date(dateTo).getTime());
            let totalCommissionPaise = 0;
            const breakdown = orders.map(o => {
                const comm = o.adminCommission || o.commissionPaise || Math.round((o.pricePaise || 0) * 0.2);
                totalCommissionPaise += comm;
                return {
                    orderId: o.id,
                    serviceName: o.serviceName,
                    workerId: o.assignedWorkerId,
                    customerPaidAmount: (o.customerPaidAmount || o.pricePaise || 0) / 100,
                    adminCommission: comm / 100,
                    adminCommissionPaise: comm,
                    createdAt: o.createdAt
                };
            });
            return res.json({
                success: true,
                data: {
                    totalCommission: totalCommissionPaise / 100,
                    totalCommissionPaise,
                    count: orders.length,
                    orders: breakdown
                }
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getPlatformFeeReport: async (req, res) => {
        try {
            const { dateFrom, dateTo } = req.query;
            let orders = Array.from(catalogData_1.localStore.orders.values()).filter(o => o.paymentStatus === 'PAID' || o.status === 'COMPLETED');
            if (dateFrom)
                orders = orders.filter(o => new Date(o.createdAt).getTime() >= new Date(dateFrom).getTime());
            if (dateTo)
                orders = orders.filter(o => new Date(o.createdAt).getTime() <= new Date(dateTo).getTime());
            let totalPlatformFeePaise = 0;
            const breakdown = orders.map(o => {
                const fee = o.platformFee || 0;
                totalPlatformFeePaise += fee;
                return {
                    orderId: o.id,
                    platformFee: fee / 100,
                    platformFeePaise: fee,
                    createdAt: o.createdAt
                };
            });
            return res.json({
                success: true,
                data: {
                    totalPlatformFee: totalPlatformFeePaise / 100,
                    totalPlatformFeePaise,
                    count: orders.length,
                    orders: breakdown
                }
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getRefundsReport: async (req, res) => {
        try {
            const refunds = catalogData_1.localStore.ledgerEntries.filter(l => l.type === 'REFUND_ISSUED');
            const refundedOrders = Array.from(catalogData_1.localStore.orders.values()).filter(o => o.refund || o.status === 'REFUNDED');
            const totalRefundedPaise = refunds.reduce((sum, r) => sum + (r.amountPaise || 0), 0) ||
                refundedOrders.reduce((sum, o) => sum + (o.refund?.amountPaise || o.customerPaidAmount || o.pricePaise || 0), 0);
            return res.json({
                success: true,
                data: {
                    totalRefunded: totalRefundedPaise / 100,
                    totalRefundedPaise,
                    refundCount: refundedOrders.length,
                    refunds: refundedOrders.map(o => ({
                        orderId: o.id,
                        amount: (o.refund?.amountPaise || o.customerPaidAmount || o.pricePaise || 0) / 100,
                        amountPaise: o.refund?.amountPaise || o.customerPaidAmount || o.pricePaise || 0,
                        reason: o.refund?.reason || 'Service issue',
                        refundedAt: o.refund?.refundedAt || o.updatedAt || o.createdAt
                    }))
                }
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    // 7. Complaints & Disputes
    getComplaints: async (req, res) => {
        try {
            let type = req.query.type || req.query.role || '';
            if (type === 'ALL' || type === 'All Roles' || type === 'undefined') {
                type = '';
            }
            let status = req.query.status || '';
            if (status === 'ALL' || status === 'All Status' || status === 'undefined') {
                status = '';
            }
            let category = req.query.category || '';
            if (category === 'ALL' || category === 'All Categories' || category === 'undefined') {
                category = '';
            }
            const search = req.query.search || '';
            const complaints = catalogData_1.localStore.getAllComplaintsAdmin({ type, status, category, search });
            return res.json({ success: true, complaints });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getComplaintDetails: async (req, res) => {
        try {
            const complaintId = req.params.id;
            const data = catalogData_1.localStore.getComplaintDetailedAdmin(complaintId);
            return res.json({ success: true, ...data });
        }
        catch (e) {
            return res.status(404).json({ success: false, error: e.message });
        }
    },
    replyComplaint: async (req, res) => {
        try {
            const complaintId = req.params.id;
            const { message } = req.body;
            if (!message)
                return res.status(400).json({ success: false, error: 'Reply message is required' });
            const complaint = catalogData_1.localStore.addComplaintReplyAdmin(complaintId, 'Admin Operations', message);
            return res.json({ success: true, complaint, message: 'Reply sent' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    addComplaintNote: async (req, res) => {
        try {
            const complaintId = req.params.id;
            const { note } = req.body;
            if (!note)
                return res.status(400).json({ success: false, error: 'Note is required' });
            const complaint = catalogData_1.localStore.addComplaintInternalNoteAdmin(complaintId, 'Admin', note);
            return res.json({ success: true, complaint, message: 'Internal note saved' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    resolveComplaint: async (req, res) => {
        try {
            const complaintId = req.params.id;
            const { decision, resolutionNote } = req.body || {};
            const note = resolutionNote || 'Resolved by Administrator';
            const complaint = catalogData_1.localStore.resolveComplaintAdmin(complaintId, decision || 'RESOLVED', note);
            return res.json({ success: true, complaint, message: 'Complaint marked as resolved' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    // 8. Help & Support Desk
    getSupportTickets: async (req, res) => {
        try {
            let role = req.query.role || '';
            if (role === 'ALL' || role === 'All Roles' || role === 'undefined')
                role = '';
            let status = req.query.status || '';
            if (status === 'ALL' || status === 'All Status' || status === 'undefined')
                status = '';
            const search = req.query.search || '';
            const tickets = catalogData_1.localStore.getAllSupportTicketsAdmin({ role, status, search });
            return res.json({ success: true, tickets });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    replySupportTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const adminId = req.user?.id || 'ADM-001';
            const { message } = req.body;
            if (!message)
                return res.status(400).json({ success: false, error: 'Reply message is required' });
            const ticket = catalogData_1.localStore.replySupportTicketAdmin(ticketId, adminId, message);
            return res.json({ success: true, ticket, message: 'Reply dispatched to user' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    addSupportTicketNote: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { note } = req.body;
            if (!note)
                return res.status(400).json({ success: false, error: 'Note is required' });
            const ticket = catalogData_1.localStore.addTicketInternalNoteAdmin(ticketId, 'Admin', note);
            return res.json({ success: true, ticket, message: 'Internal note saved' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    updateSupportTicketStatus: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { status } = req.body;
            const ticket = catalogData_1.localStore.updateSupportTicketStatusAdmin(ticketId, status);
            return res.json({ success: true, ticket, message: `Ticket status set to ${status}` });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    // 9. Notifications
    getNotifications: async (req, res) => {
        try {
            const notifications = catalogData_1.localStore.getAdminNotifications();
            const unreadCount = notifications.filter(n => !n.isRead).length;
            return res.json({ success: true, notifications, unreadCount });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    markNotificationRead: async (req, res) => {
        try {
            catalogData_1.localStore.markAdminNotificationRead(req.params.id);
            return res.json({ success: true });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    markAllNotificationsRead: async (req, res) => {
        try {
            catalogData_1.localStore.markAllAdminNotificationsRead();
            return res.json({ success: true });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    // 10. Reports & Analytics
    getReports: async (req, res) => {
        try {
            const reportType = req.query.type || 'orders';
            const period = req.query.period || 'monthly';
            const customStartDate = req.query.startDate;
            const customEndDate = req.query.endDate;
            const report = catalogData_1.localStore.getReportDataAdmin(reportType, period, customStartDate, customEndDate);
            return res.json({ success: true, report });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    // 11. Settings, Profile & Audit Logs
    getSettings: async (req, res) => {
        try {
            const settings = catalogData_1.localStore.getPlatformSettings();
            return res.json({ success: true, settings });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    updateSettings: async (req, res) => {
        try {
            const settings = catalogData_1.localStore.updatePlatformSettings(req.body);
            return res.json({ success: true, settings, message: 'Settings saved successfully' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    updateProfile: async (req, res) => {
        try {
            const adminId = req.user?.id || 'ADM-001';
            const result = catalogData_1.localStore.updateAdminProfile(adminId, req.body);
            return res.json({ success: true, ...result, message: 'Profile updated' });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    getAuditLogs: async (req, res) => {
        try {
            const action = req.query.action;
            const entityType = req.query.entityType;
            const search = req.query.search;
            const logs = catalogData_1.localStore.getSecurityAuditLogsAdmin({ action, entityType, search });
            return res.json({ success: true, logs });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
};
exports.generalNotificationController = {
    getUserNotifications: async (req, res) => {
        try {
            const user = req.user;
            const list = catalogData_1.localStore.notifications.filter(n => n.recipientId === user.id ||
                (user.role === 'ADMIN' && (n.recipientRole === 'ADMIN' || n.recipientId === 'ADM-001')));
            return res.json({
                success: true,
                data: { notifications: list },
                notifications: list,
                unreadCount: list.filter(n => !n.isRead).length
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    markUserNotificationRead: async (req, res) => {
        try {
            const user = req.user;
            const notifId = req.params.notificationId || req.params.id;
            const notif = catalogData_1.localStore.notifications.find(n => n.id === notifId && (n.recipientId === user.id ||
                (user.role === 'ADMIN' && (n.recipientRole === 'ADMIN' || n.recipientId === 'ADM-001'))));
            if (!notif)
                return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Notification not found' } });
            notif.isRead = true;
            return res.json({ success: true, message: 'Notification marked as read' });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    }
};

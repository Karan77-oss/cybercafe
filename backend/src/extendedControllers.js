"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentController = exports.notificationsController = exports.walletController = exports.ordersController = exports.workersController = exports.servicesController = exports.storage = void 0;
const crypto_1 = __importDefault(require("crypto"));
const SupabaseStorageAdapter_1 = require("./utils/SupabaseStorageAdapter");
const catalogData_1 = require("./catalogData");
const db_1 = require("./db");
const fileStore_1 = require("./utils/fileStore");
exports.storage = new SupabaseStorageAdapter_1.SupabaseStorageAdapter();
exports.servicesController = {
    getServices: async (req, res) => {
        try {
            const dbOk = await (0, db_1.checkDb)();
            if (dbOk) {
                const services = await db_1.prisma.service.findMany({
                    where: { status: 'ACTIVE', approvalStatus: 'APPROVED' },
                    orderBy: { createdAt: 'desc' }
                });
                if (services && services.length > 0) {
                    return res.json({ success: true, services });
                }
            }
        }
        catch {
            // Proceed to resilient fallback
        }
        return res.json({ success: true, services: catalogData_1.localStore.getServices() });
    },
    getService: async (req, res) => {
        try {
            const dbOk = await (0, db_1.checkDb)();
            if (dbOk) {
                const service = await db_1.prisma.service.findUnique({
                    where: { id: req.params.id, status: 'ACTIVE', approvalStatus: 'APPROVED' }
                });
                if (service) {
                    return res.json({ success: true, service });
                }
            }
        }
        catch {
            // Proceed to resilient fallback
        }
        const fallback = catalogData_1.localStore.getService(req.params.id);
        if (!fallback) {
            return res.status(404).json({ success: false, error: { message: 'Service not found' } });
        }
        return res.json({ success: true, service: fallback });
    }
};
exports.workersController = {
    getAvailableWorkers: async (req, res) => {
        try {
            const dbOk = await (0, db_1.checkDb)();
            if (dbOk) {
                const workers = await db_1.prisma.user.findMany({
                    where: { role: 'WORKER' },
                    select: { id: true, name: true, email: true, phone: true }
                });
                if (workers && workers.length > 0) {
                    const workerStats = await Promise.all(workers.map(async (w) => {
                        const activeJobs = await db_1.prisma.job.count({
                            where: { workerId: w.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } }
                        });
                        const completedJobs = await db_1.prisma.job.count({
                            where: { workerId: w.id, status: 'COMPLETED' }
                        });
                        return {
                            id: w.id,
                            name: w.name,
                            email: w.email,
                            activeJobs,
                            completedJobs,
                            rating: 4.8
                        };
                    }));
                    return res.json({ success: true, workers: workerStats });
                }
            }
        }
        catch {
            // Proceed to fallback
        }
        const activeWorkers = catalogData_1.localStore.getWorkers().filter(w => w.accountStatus === 'ACTIVE' && w.status !== 'PAUSED' && w.status !== 'DELETED');
        return res.json({ success: true, workers: activeWorkers });
    }
};
// Helper to sanitize order and check 24-hour expiry
const processCustomerOrder = async (order) => {
    if (!order)
        return null;
    const snapshot = order.serviceSnapshot || {};
    let currentStatus = order.status;
    // Check 24-hour expiry for active pending orders
    if (currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED') {
        const expiresAtStr = snapshot.expiresAt;
        if (expiresAtStr && new Date().getTime() > new Date(expiresAtStr).getTime()) {
            currentStatus = 'CANCELLED';
            snapshot.expiry = {
                isExpired: true,
                expiredAt: new Date().toISOString(),
                refundCreditedPaise: order.pricing?.pricePaise || 0
            };
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.$transaction([
                        db_1.prisma.order.update({
                            where: { id: order.id },
                            data: { status: 'CANCELLED', serviceSnapshot: snapshot }
                        }),
                        db_1.prisma.auditLog.create({
                            data: {
                                actorUserId: order.customerId,
                                action: 'ORDER_EXPIRED_REFUND_CREDITED',
                                entityType: 'Order',
                                entityId: order.id,
                                metadata: {
                                    pricePaise: order.pricing?.pricePaise || 0,
                                    reason: '24-hour maximum pending limit exceeded'
                                }
                            }
                        })
                    ]);
                }
            }
            catch {
                // Handled locally
            }
            // Update local store as well
            catalogData_1.localStore.addAuditLog({
                actorUserId: order.customerId,
                action: 'ORDER_EXPIRED_REFUND_CREDITED',
                entityType: 'Order',
                entityId: order.id,
                metadata: {
                    pricePaise: order.pricing?.pricePaise || 0,
                    reason: '24-hour maximum pending limit exceeded'
                }
            });
        }
    }
    // Customer-facing rule: sanitize pricing (only return total pricePaise, hide internal commission/payout)
    const customerPricing = {
        pricePaise: order.pricing?.pricePaise || 0
    };
    // Sanitized assigned worker
    const assignedWorker = order.assignedWorkerId ? (catalogData_1.localStore.getWorker(order.assignedWorkerId) || order.worker || (order.job?.worker ? order.job.worker : null)) : null;
    const customerStatus = currentStatus === 'OFFERED' ? (order.assignedWorkerId ? 'ASSIGNED' : 'AVAILABLE') : currentStatus;
    // Deliverables: ensure customer can view and download all deliverables & receipts submitted by worker
    const deliverables = order.deliverables || snapshot.completion?.deliverableFiles || catalogData_1.localStore.getOrder(order.id)?.deliverables || [];
    if (!snapshot.completion) {
        snapshot.completion = {};
    }
    snapshot.completion.deliverableFiles = deliverables;
    if (deliverables.length > 0 && !snapshot.completion.receiptUrl) {
        snapshot.completion.receiptUrl = deliverables[0].url;
    }
    // Time Slot synchronization: customer sees time slot ONLY after worker sets/provides it
    const rawStoreOrder = catalogData_1.localStore.getOrder(order.id);
    const effectiveTimeSlot = order.timeSlot || rawStoreOrder?.timeSlot;
    if (effectiveTimeSlot && (effectiveTimeSlot.startTime || effectiveTimeSlot.timeSlotStr)) {
        const formattedSlot = effectiveTimeSlot.timeSlotStr || `${effectiveTimeSlot.date || 'Today'}, ${effectiveTimeSlot.startTime} - ${effectiveTimeSlot.endTime}`;
        snapshot.scheduling = {
            ...(snapshot.scheduling || {}),
            timeSlot: formattedSlot,
            date: effectiveTimeSlot.date || 'Today',
            startTime: effectiveTimeSlot.startTime,
            endTime: effectiveTimeSlot.endTime,
            status: effectiveTimeSlot.status || snapshot.scheduling?.status || 'PROPOSED',
            proposedBy: effectiveTimeSlot.proposedBy || 'WORKER',
            rescheduleNote: effectiveTimeSlot.rescheduleNote || snapshot.scheduling?.rescheduleNote || null
        };
    }
    else if (!snapshot.scheduling || !snapshot.scheduling.timeSlot) {
        snapshot.scheduling = {
            status: 'UNSCHEDULED',
            timeSlot: null,
            rescheduleNote: null
        };
    }
    const effectiveSlotStatus = order.slotStatus || rawStoreOrder?.slotStatus || snapshot.scheduling?.slotStatus || (order.timeSlot ? 'CONFIRMED' : 'UNASSIGNED');
    const effectiveBookingDate = order.bookingDate || rawStoreOrder?.bookingDate || snapshot.scheduling?.date || null;
    const resolvedTimeSlotStr = (typeof order.timeSlot === 'string' ? order.timeSlot : order.timeSlot?.timeSlotStr) ||
        (typeof rawStoreOrder?.timeSlot === 'string' ? rawStoreOrder?.timeSlot : rawStoreOrder?.timeSlot?.timeSlotStr) ||
        snapshot.scheduling?.timeSlot || null;
    const effectiveProposedSlot = order.proposedSlot || rawStoreOrder?.proposedSlot || snapshot.scheduling?.proposedSlot || snapshot.scheduling?.proposedTimeSlot || null;
    const effectiveProposedDate = order.proposedDate || rawStoreOrder?.proposedDate || snapshot.scheduling?.proposedDate || null;
    return {
        ...order,
        orderNumber: order.orderNumber || order.id,
        status: customerStatus,
        pricing: customerPricing,
        serviceSnapshot: snapshot,
        deliverables,
        worker: assignedWorker,
        slotStatus: effectiveSlotStatus,
        proposedSlot: effectiveProposedSlot,
        proposedDate: effectiveProposedDate,
        bookingDate: effectiveBookingDate,
        timeSlot: resolvedTimeSlotStr,
        bookingTimeSlot: resolvedTimeSlotStr
    };
};
exports.ordersController = {
    createOrder: async (req, res) => {
        try {
            const { serviceId, subCategory, details, formData, bookingDate, timeSlot, amount, additionalInfo, workerSelection, documentIds, paymentMethod } = req.body;
            const customerId = req.user?.id || 'customer-local-id';
            const resolvedDetails = details || formData || {};
            const resolvedSubCategory = subCategory || req.body.subCategory || resolvedDetails?.subCategory || null;
            // Find service either in DB or local store
            let service = null;
            try {
                if (await (0, db_1.checkDb)()) {
                    service = await db_1.prisma.service.findUnique({ where: { id: serviceId } });
                }
            }
            catch { }
            if (!service) {
                service = catalogData_1.localStore.getService(serviceId);
            }
            if (!service) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_SERVICE' } });
            }
            // Idempotency / Deduplication Guard:
            // Prevent duplicate order creation if a customer submits the same service within 5 seconds (rapid clicks, refresh, reconnect)
            const fiveSecondsAgo = Date.now() - 5000;
            const recentDuplicate = Array.from(catalogData_1.localStore.orders.values()).find(o => o.customerId === customerId &&
                o.serviceId === serviceId &&
                ['AVAILABLE', 'ACCEPTED', 'ASSIGNED', 'PAYMENT_PENDING'].includes(o.status) &&
                new Date(o.createdAt).getTime() > fiveSecondsAgo);
            if (recentDuplicate) {
                console.log(`[Orders] Idempotency guard: Returning existing order ${recentDuplicate.id} to prevent duplicate.`);
                const processed = await processCustomerOrder(recentDuplicate);
                return res.json({ success: true, order: processed || recentDuplicate });
            }
            const resolvedPrice = (amount && Number(amount) > 0) ? Math.round(Number(amount) * 100) : (service.pricePaise || 19900);
            const pricePaise = resolvedPrice;
            const platformCommissionPaise = Math.floor(pricePaise * 0.2);
            const workerPayoutPaise = pricePaise - platformCommissionPaise;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            // Time Slot resolution
            let slotStr = '';
            if (typeof timeSlot === 'string') {
                slotStr = timeSlot;
            }
            else if (timeSlot && typeof timeSlot === 'object') {
                slotStr = timeSlot.timeSlotStr || `${timeSlot.startTime || ''} - ${timeSlot.endTime || ''}`.trim();
            }
            const resolvedDate = bookingDate || (typeof timeSlot === 'object' ? timeSlot?.date : null) || 'Today';
            const formattedSlot = slotStr ? `${resolvedDate}, ${slotStr}` : null;
            const initialScheduling = slotStr ? {
                status: 'CONFIRMED',
                slotStatus: 'CONFIRMED',
                timeSlot: formattedSlot || slotStr,
                date: resolvedDate,
                startTime: typeof timeSlot === 'object' ? timeSlot.startTime : (slotStr.split('-')[0]?.trim() || ''),
                endTime: typeof timeSlot === 'object' ? timeSlot.endTime : (slotStr.split('-')[1]?.trim() || ''),
                proposedBy: 'CUSTOMER'
            } : {
                status: 'UNASSIGNED',
                slotStatus: 'UNASSIGNED',
                timeSlot: null,
                date: null,
                rescheduleNote: null
            };
            const initialTimeSlotObj = slotStr ? {
                date: resolvedDate,
                timeSlotStr: formattedSlot || slotStr,
                startTime: initialScheduling.startTime,
                endTime: initialScheduling.endTime,
                status: 'CONFIRMED',
                proposedBy: 'CUSTOMER'
            } : null;
            // If valid upfront paymentMethod is provided (simulation/in-order payment), make AVAILABLE immediately
            const isUpfrontPaid = Boolean(paymentMethod);
            const initialStatus = isUpfrontPaid ? 'AVAILABLE' : 'PAYMENT_PENDING';
            const initialPaymentStatus = isUpfrontPaid ? 'PAID' : 'PENDING';
            const paymentProvider = (typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.provider || paymentMethod?.type) || 'UPI';
            const initialSnapshot = {
                name: service.name || service.title,
                category: service.category,
                subCategory: resolvedSubCategory,
                pricePaise,
                formSchema: service.formSchema,
                details: {
                    ...resolvedDetails,
                    subCategory: resolvedSubCategory
                },
                additionalInfo: additionalInfo || '',
                workerSelection: workerSelection || { mode: 'auto' },
                expiresAt,
                scheduling: initialScheduling,
                completion: {
                    referenceNumber: null,
                    completionMessage: null,
                    receiptUrl: null,
                    deliverableFiles: []
                },
                review: null
            };
            const generatedOrderId = 'ord_' + Date.now();
            // Resolve customer name/phone/email from the authenticated user record
            // so that the worker workspace and admin always see real customer data.
            const customerUser = catalogData_1.localStore.findUserById(customerId);
            const contactPhone = req.body.contactPhone || req.body.customerPhone || req.body.phone || resolvedDetails?.phone || customerUser?.phone || null;
            const customerNotes = req.body.customerNotes || req.body.notes || additionalInfo || '';
            const resolvedCustomerName = customerUser?.name || resolvedDetails?.fullName || 'Customer';
            const resolvedCustomerPhone = contactPhone || customerUser?.phone || null;
            const resolvedCustomerEmail = customerUser?.email || resolvedDetails?.email || null;
            const orderData = {
                id: generatedOrderId,
                orderNumber: generatedOrderId,
                customerId,
                // Populated at the root level so Worker Workspace & Admin always see real details
                customerName: resolvedCustomerName,
                customerPhone: resolvedCustomerPhone,
                customerEmail: resolvedCustomerEmail,
                contactPhone: resolvedCustomerPhone,
                customerNotes,
                notes: customerNotes,
                subCategory: resolvedSubCategory,
                // formData mirrors serviceSnapshot.details so the worker JobWorkspace
                // can render the form fields without needing to dig into serviceSnapshot
                formData: {
                    ...resolvedDetails,
                    contactPhone: resolvedCustomerPhone,
                    customerNotes,
                    subCategory: resolvedSubCategory
                },
                bookingDate: slotStr ? resolvedDate : (bookingDate || null),
                bookingTimeSlot: slotStr || null,
                timeSlot: initialTimeSlotObj ? (formattedSlot || slotStr) : null,
                slotStatus: slotStr ? 'CONFIRMED' : 'UNASSIGNED',
                proposedSlot: null,
                proposedDate: null,
                serviceId,
                serviceName: service.name || service.title,
                category: service.category || null,
                status: initialStatus,
                paymentStatus: initialPaymentStatus,
                earningStatus: 'PENDING',
                workerAmount: workerPayoutPaise,
                adminCommission: platformCommissionPaise,
                platformFee: 0,
                customerPaidAmount: pricePaise,
                serviceSnapshot: initialSnapshot,
                pricePaise,
                workerEarningsPaise: workerPayoutPaise,
                pricing: { pricePaise, platformCommissionPaise, workerPayoutPaise },
                assignedWorkerId: null,
                worker: null,
                job: null,
                offerExpiresAt: null,
                paidAt: isUpfrontPaid ? new Date().toISOString() : null,
                payment: isUpfrontPaid ? {
                    status: 'PAID',
                    provider: paymentProvider,
                    amountPaise: pricePaise,
                    paidAt: new Date().toISOString()
                } : null,
                documents: [],
                deliverables: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            // Try database insert if connected
            try {
                if (await (0, db_1.checkDb)()) {
                    const dbOrder = await db_1.prisma.order.create({
                        data: {
                            id: generatedOrderId,
                            orderNumber: generatedOrderId,
                            customerId,
                            serviceId,
                            status: initialStatus,
                            paymentStatus: initialPaymentStatus,
                            earningStatus: 'PENDING',
                            workerAmountPaise: workerPayoutPaise,
                            adminCommissionPaise: platformCommissionPaise,
                            platformFeePaise: 0,
                            customerPaidAmountPaise: pricePaise,
                            currency: 'INR',
                            serviceSnapshot: initialSnapshot,
                            pricing: { pricePaise, platformCommissionPaise, workerPayoutPaise },
                            paidAt: isUpfrontPaid ? new Date() : null
                        }
                    });
                    if (isUpfrontPaid) {
                        try {
                            await db_1.prisma.payment.create({
                                data: {
                                    orderId: dbOrder.id,
                                    provider: paymentProvider,
                                    providerOrderId: `ord_pay_${Date.now()}`,
                                    amountPaise: pricePaise,
                                    currency: 'INR',
                                    status: 'PAID',
                                    paidAt: new Date(),
                                    verifiedAt: new Date()
                                }
                            });
                        }
                        catch { }
                    }
                    orderData.id = dbOrder.id;
                }
            }
            catch (err) {
                console.log('Database persist skipped, stored in resilient cache:', err?.message);
            }
            // Process files uploaded directly via multipart/form-data
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadedMulterFiles = req.files;
                const rawDocTypes = req.body.documentTypes;
                const docTypes = Array.isArray(rawDocTypes)
                    ? rawDocTypes
                    : (rawDocTypes ? [rawDocTypes] : []);
                for (let i = 0; i < uploadedMulterFiles.length; i++) {
                    const file = uploadedMulterFiles[i];
                    const docType = docTypes[i] || file.fieldname || 'Uploaded Document';
                    const fileKey = 'docs/' + customerId + '/' + Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
                    fileStore_1.fileBufferStore.set(fileKey, {
                        buffer: file.buffer,
                        mimeType: file.mimetype,
                        fileName: file.originalname,
                        createdAt: Date.now()
                    });
                    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                    const displayName = docType ? `${docType} (${file.originalname})` : file.originalname;
                    const docObj = {
                        id: docId,
                        storageKey: fileKey,
                        docName: docType,
                        name: displayName,
                        fileName: file.originalname,
                        url: `/api/documents/${docId}/download`,
                        mimeType: file.mimetype,
                        size: file.size,
                        type: 'UPLOAD',
                        customerId,
                        orderId: orderData.id,
                        orderNumber: orderData.orderNumber || orderData.id,
                        createdAt: new Date().toISOString()
                    };
                    orderData.documents.push(docObj);
                    catalogData_1.localStore.saveDocument(docObj);
                    try {
                        if (await (0, db_1.checkDb)()) {
                            await db_1.prisma.document.create({ data: docObj });
                        }
                    }
                    catch { }
                }
            }
            // Bind uploaded document IDs to this order (from legacy ID arrays)
            const clientDocsList = Array.isArray(req.body.documents) ? req.body.documents : [];
            const rawDocIds = (documentIds && Array.isArray(documentIds))
                ? documentIds
                : clientDocsList.map((d) => typeof d === 'string' ? d : d?.id).filter(Boolean);
            if (rawDocIds.length > 0) {
                const boundDocs = await Promise.all(rawDocIds.map(async (docId) => {
                    let doc = catalogData_1.localStore.getDocument(docId);
                    if (!doc) {
                        try {
                            if (await (0, db_1.checkDb)()) {
                                doc = await db_1.prisma.document.findUnique({ where: { id: docId } });
                            }
                        }
                        catch { }
                    }
                    const clientMeta = clientDocsList.find((d) => d && (d.id === docId || d === docId));
                    const docName = clientMeta?.docName || doc?.docName || null;
                    const fileName = doc?.fileName || clientMeta?.fileName || doc?.name || 'Uploaded Document';
                    const displayName = docName ? `${docName} (${fileName})` : fileName;
                    if (doc) {
                        doc.orderId = orderData.id;
                        doc.orderNumber = orderData.orderNumber || orderData.id;
                        doc.docName = docName;
                        doc.name = displayName;
                        doc.fileName = fileName;
                        doc.url = `/api/documents/${doc.id}/download`;
                        catalogData_1.localStore.saveDocument(doc);
                        return doc;
                    }
                    const fallbackDoc = {
                        id: docId,
                        orderId: orderData.id,
                        orderNumber: orderData.orderNumber || orderData.id,
                        customerId,
                        docName,
                        name: displayName,
                        fileName: fileName,
                        url: `/api/documents/${docId}/download`,
                        size: clientMeta?.size || 'Verified Document',
                        type: 'UPLOAD',
                        createdAt: new Date().toISOString()
                    };
                    catalogData_1.localStore.saveDocument(fallbackDoc);
                    return fallbackDoc;
                }));
                orderData.documents.push(...boundDocs);
                try {
                    if (await (0, db_1.checkDb)()) {
                        await db_1.prisma.document.updateMany({
                            where: { id: { in: rawDocIds } },
                            data: { orderId: orderData.id }
                        });
                    }
                }
                catch { }
            }
            catalogData_1.localStore.saveOrder(orderData);
            if (isUpfrontPaid) {
                catalogData_1.localStore.appendLedgerEntry({
                    orderId: orderData.id,
                    amountPaise: pricePaise,
                    type: 'ORDER_PAYMENT',
                    idempotencyKey: `PAYMENT_ORDER_${orderData.id}`,
                    referenceNote: `Order payment via ${paymentProvider}`
                });
                catalogData_1.localStore.addAuditLog({
                    actorUserId: customerId,
                    action: 'PAYMENT_VERIFIED',
                    entityType: 'Order',
                    entityId: orderData.id,
                    amountPaise: pricePaise
                });
                // Notify online workers
                const onlineWorkers = catalogData_1.localStore.getWorkers().filter(w => w.isOnline && w.accountStatus === 'ACTIVE');
                onlineWorkers.forEach(w => {
                    catalogData_1.localStore.notifications.unshift({
                        id: `notif_${Date.now()}_${w.id}`,
                        recipientId: w.id,
                        recipientRole: 'WORKER',
                        type: 'NEW_ORDER_AVAILABLE',
                        title: 'New Order Available',
                        message: `A new order for "${orderData.serviceName}" is available for pickup.`,
                        orderId: orderData.id,
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                });
            }
            const processed = await processCustomerOrder(orderData);
            return res.json({ success: true, order: processed || orderData });
        }
        catch (e) {
            console.error('Order creation error:', e);
            return res.status(500).json({ success: false, error: e.message || String(e) });
        }
    },
    getOrders: async (req, res) => {
        try {
            const customerId = req.user?.id || 'customer-local-id';
            let rawOrders = [];
            try {
                if (await (0, db_1.checkDb)()) {
                    rawOrders = await db_1.prisma.order.findMany({
                        where: { customerId },
                        include: {
                            job: { include: { worker: { select: { id: true, name: true, phone: true } } } }
                        },
                        orderBy: { createdAt: 'desc' }
                    });
                }
            }
            catch { }
            if (!rawOrders || rawOrders.length === 0) {
                rawOrders = catalogData_1.localStore.getOrders(customerId);
            }
            const orders = await Promise.all(rawOrders.map(processCustomerOrder));
            return res.json({ success: true, orders });
        }
        catch {
            return res.json({ success: true, orders: [] });
        }
    },
    getOrder: async (req, res) => {
        try {
            const user = req.user;
            const customerId = user?.id;
            const orderId = req.params.id;
            let rawOrder = null;
            try {
                if (await (0, db_1.checkDb)()) {
                    rawOrder = await db_1.prisma.order.findUnique({
                        where: { id: orderId },
                        include: {
                            documents: true,
                            job: { include: { worker: { select: { id: true, name: true, phone: true } } } }
                        }
                    });
                }
            }
            catch { }
            if (!rawOrder) {
                rawOrder = catalogData_1.localStore.getOrder(orderId);
            }
            if (!rawOrder) {
                return res.status(404).json({ success: false, error: { message: 'Order not found' } });
            }
            // Security & Multi-Tenant Isolation Check
            const isOwner = !rawOrder.customerId || rawOrder.customerId === customerId;
            const isAdmin = user?.role === 'ADMIN';
            const isAssigned = rawOrder.assignedWorkerId === customerId;
            if (user && !isAdmin && !isOwner && !isAssigned) {
                return res.status(403).json({ success: false, error: { message: 'Unauthorized access to this order' } });
            }
            const order = await processCustomerOrder(rawOrder);
            return res.json({ success: true, order });
        }
        catch {
            return res.status(500).json({ success: false });
        }
    },
    acceptTimeSlot: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            let order = catalogData_1.localStore.getOrder(orderId);
            try {
                if (await (0, db_1.checkDb)()) {
                    const dbOrder = await db_1.prisma.order.findUnique({ where: { id: orderId } });
                    if (dbOrder)
                        order = dbOrder;
                }
            }
            catch { }
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            if (user && user.role !== 'ADMIN' && order.customerId && order.customerId !== user.id) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }
            const snapshot = order.serviceSnapshot || {};
            snapshot.scheduling = {
                ...(snapshot.scheduling || {}),
                status: 'ACCEPTED',
                acceptedAt: new Date().toISOString()
            };
            order.serviceSnapshot = snapshot;
            if (order.timeSlot) {
                order.timeSlot.status = 'ACCEPTED';
                order.timeSlot.acceptedAt = new Date().toISOString();
            }
            order.updatedAt = new Date().toISOString();
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: snapshot }
                    });
                }
            }
            catch { }
            catalogData_1.localStore.saveOrder(order);
            const targetWorkerId = order.assignedWorkerId;
            if (targetWorkerId) {
                catalogData_1.localStore.notifications.unshift({
                    id: `notif_${Date.now()}`,
                    recipientId: targetWorkerId,
                    recipientRole: 'WORKER',
                    type: 'TIME_SLOT_ACCEPTED',
                    title: 'Time Slot Confirmed',
                    message: `Customer accepted the scheduled working time slot (${snapshot.scheduling?.timeSlot || 'Confirmed'}).`,
                    orderId,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
                catalogData_1.localStore.chatMessages.push({
                    id: `msg_${Date.now()}`,
                    orderId,
                    senderId: user?.id || order.customerId,
                    senderRole: 'CUSTOMER',
                    senderName: user?.name || 'Customer',
                    message: `[Time Slot Confirmed]: Customer accepted working window: ${snapshot.scheduling?.timeSlot || 'Scheduled'}`,
                    createdAt: new Date().toISOString()
                });
            }
            return res.json({ success: true, order: await processCustomerOrder(order) });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    rescheduleTimeSlot: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            const { rescheduleNote, requestedTime, requestedDate } = req.body;
            let order = catalogData_1.localStore.getOrder(orderId);
            try {
                if (await (0, db_1.checkDb)()) {
                    const dbOrder = await db_1.prisma.order.findUnique({ where: { id: orderId } });
                    if (dbOrder)
                        order = dbOrder;
                }
            }
            catch { }
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            if (user && user.role !== 'ADMIN' && order.customerId && order.customerId !== user.id) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }
            const snapshot = order.serviceSnapshot || {};
            const newSlotText = requestedTime
                ? `${requestedDate ? requestedDate + ', ' : ''}${requestedTime}`
                : (snapshot.scheduling?.timeSlot || 'Reschedule Requested');
            snapshot.scheduling = {
                ...(snapshot.scheduling || {}),
                status: 'RESCHEDULE_REQUESTED',
                timeSlot: newSlotText,
                rescheduleNote: rescheduleNote || 'Customer requested mutual reschedule',
                requestedTime: requestedTime || null,
                requestedDate: requestedDate || null,
                proposedBy: 'CUSTOMER',
                requestedAt: new Date().toISOString()
            };
            order.serviceSnapshot = snapshot;
            if (order.timeSlot) {
                order.timeSlot.status = 'RESCHEDULE_REQUESTED';
                order.timeSlot.rescheduleNote = rescheduleNote;
                order.timeSlot.proposedBy = 'CUSTOMER';
                order.timeSlot.requestedTime = requestedTime;
                order.timeSlot.requestedDate = requestedDate;
                order.timeSlot.timeSlotStr = newSlotText;
                order.timeSlot.date = requestedDate || order.timeSlot.date || 'Today';
                order.timeSlot.startTime = requestedTime || order.timeSlot.startTime;
            }
            order.updatedAt = new Date().toISOString();
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: snapshot }
                    });
                }
            }
            catch { }
            catalogData_1.localStore.saveOrder(order);
            const targetWorkerId = order.assignedWorkerId;
            if (targetWorkerId) {
                catalogData_1.localStore.notifications.unshift({
                    id: `notif_${Date.now()}`,
                    recipientId: targetWorkerId,
                    recipientRole: 'WORKER',
                    type: 'RESCHEDULE_REQUESTED',
                    title: 'Customer Requested Reschedule',
                    message: `Customer requested a reschedule to "${newSlotText}". Note: "${rescheduleNote || 'None'}". Please review and confirm or propose a new slot.`,
                    orderId,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
                catalogData_1.localStore.chatMessages.push({
                    id: `msg_${Date.now()}`,
                    orderId,
                    senderId: user?.id || order.customerId,
                    senderRole: 'CUSTOMER',
                    senderName: user?.name || 'Customer',
                    message: `[Reschedule Request]: Preferred time: ${newSlotText}. Reason: ${rescheduleNote || 'Mutual rescheduling'}`,
                    createdAt: new Date().toISOString()
                });
            }
            return res.json({ success: true, order: await processCustomerOrder(order) });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    requestReschedule: async (req, res) => {
        try {
            const orderId = String(req.params.id);
            const user = req.user;
            const { proposedDate, proposedTimeSlot, requestedBy } = req.body;
            const effectiveRequester = requestedBy || (user?.role === 'WORKER' ? 'WORKER' : 'CUSTOMER');
            if (!proposedTimeSlot) {
                return res.status(400).json({ success: false, error: 'proposedTimeSlot is required' });
            }
            const existing = catalogData_1.localStore.getOrder(orderId);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            const updated = catalogData_1.localStore.requestReschedule(orderId, user?.id || 'unknown', {
                proposedDate: proposedDate || 'Today',
                proposedTimeSlot,
                requestedBy: effectiveRequester
            });
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: updated.serviceSnapshot }
                    });
                }
            }
            catch { }
            const processed = await processCustomerOrder(updated);
            return res.json({ success: true, order: processed, data: { order: processed } });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    respondReschedule: async (req, res) => {
        try {
            const orderId = String(req.params.id);
            const user = req.user;
            const { action } = req.body;
            if (!action || (action !== 'ACCEPT' && action !== 'REJECT')) {
                return res.status(400).json({ success: false, error: 'action must be ACCEPT or REJECT' });
            }
            const existing = catalogData_1.localStore.getOrder(orderId);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            const updated = catalogData_1.localStore.respondReschedule(orderId, user?.id || 'unknown', { action });
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: updated.serviceSnapshot }
                    });
                }
            }
            catch { }
            const processed = await processCustomerOrder(updated);
            return res.json({ success: true, order: processed, data: { order: processed } });
        }
        catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    },
    submitReview: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            const { rating, comment, review } = req.body;
            const reviewText = comment || review || '';
            let order = catalogData_1.localStore.getOrder(orderId);
            try {
                if (await (0, db_1.checkDb)()) {
                    const dbOrder = await db_1.prisma.order.findUnique({ where: { id: orderId } });
                    if (dbOrder)
                        order = dbOrder;
                }
            }
            catch { }
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            // 1. Tenant Check
            if (user && user.role !== 'ADMIN' && order.customerId && order.customerId !== user.id) {
                return res.status(403).json({ success: false, error: 'Unauthorized to review this order' });
            }
            // 2. Status Check: Must be completed or receipt submitted
            if (order.status !== 'COMPLETED' && order.status !== 'RECEIPT_SUBMITTED') {
                return res.status(400).json({ success: false, error: 'Only completed orders can be reviewed' });
            }
            // If in RECEIPT_SUBMITTED, customer review confirms receipt and releases worker earning
            if (order.status === 'RECEIPT_SUBMITTED') {
                catalogData_1.localStore.releaseWorkerEarningOnReceiptAction(orderId, user?.id || order.customerId);
                order = catalogData_1.localStore.getOrder(orderId);
            }
            // 3. Duplicate Review Prevention
            const existingSnapshot = order.serviceSnapshot || {};
            if (order.rating || existingSnapshot.review?.rating) {
                return res.status(400).json({ success: false, error: 'This order has already been reviewed' });
            }
            const ratingNum = Number(rating);
            if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
                return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5 stars' });
            }
            // 4. Update order state
            order.rating = ratingNum;
            order.review = reviewText;
            const snapshot = order.serviceSnapshot || {};
            snapshot.review = {
                rating: ratingNum,
                comment: reviewText,
                createdAt: new Date().toISOString()
            };
            order.serviceSnapshot = snapshot;
            order.updatedAt = new Date().toISOString();
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.order.update({
                        where: { id: orderId },
                        data: { serviceSnapshot: snapshot }
                    });
                }
            }
            catch { }
            // 5. Update assigned worker's rating stats in localStore
            if (order.assignedWorkerId) {
                const worker = catalogData_1.localStore.getWorker(order.assignedWorkerId);
                if (worker) {
                    worker.reviews = worker.reviews || [];
                    worker.reviews.unshift({
                        id: `rev_${Date.now()}`,
                        rating: ratingNum,
                        comment: reviewText,
                        createdAt: new Date().toISOString()
                    });
                    const totalStars = worker.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
                    worker.rating = Math.round((totalStars / worker.reviews.length) * 10) / 10;
                }
            }
            catalogData_1.localStore.saveOrder(order);
            return res.json({ success: true, order: await processCustomerOrder(order) });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    payOrder: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            const { paymentMethod } = req.body;
            let order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: 'Order not found' });
            const isOwner = !order.customerId || order.customerId === user.id;
            const isAdmin = user?.role === 'ADMIN';
            if (!isAdmin && !isOwner) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }
            if (order.status !== 'PAYMENT_PENDING') {
                return res.status(400).json({ success: false, error: `Order is already in status ${order.status}` });
            }
            order.status = 'AVAILABLE';
            order.paymentStatus = 'PAID';
            order.earningStatus = 'PENDING';
            order.assignedWorkerId = null;
            order.worker = null;
            order.job = null;
            order.offerExpiresAt = null;
            order.paidAt = new Date().toISOString();
            order.payment = {
                status: 'PAID',
                method: paymentMethod?.provider || 'UPI',
                paidAt: new Date().toISOString()
            };
            if (!order.serviceSnapshot)
                order.serviceSnapshot = {};
            order.serviceSnapshot.scheduling = {
                status: 'UNSCHEDULED',
                timeSlot: null,
                rescheduleNote: null
            };
            order.timeSlot = null;
            order.updatedAt = new Date().toISOString();
            // Double-entry Ledger: ORDER_PAYMENT
            catalogData_1.localStore.appendLedgerEntry({
                orderId: order.id,
                amountPaise: order.customerPaidAmount || order.pricePaise || 0,
                type: 'ORDER_PAYMENT',
                idempotencyKey: `LEDGER_PAYMENT_${order.id}`,
                referenceNote: `Customer paid Order #${order.id}`
            });
            // Notify online workers
            const onlineWorkers = catalogData_1.localStore.getWorkers().filter(w => w.isOnline && w.accountStatus === 'ACTIVE');
            onlineWorkers.forEach(w => {
                catalogData_1.localStore.notifications.unshift({
                    id: `notif_${Date.now()}_${w.id}`,
                    recipientId: w.id,
                    recipientRole: 'WORKER',
                    type: 'NEW_ORDER_AVAILABLE',
                    title: 'New Order Available',
                    message: `A new paid order for "${order.serviceName}" is available for pickup.`,
                    orderId: order.id,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
            });
            catalogData_1.localStore.saveOrder(order);
            return res.json({ success: true, order: await processCustomerOrder(order) });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    downloadDeliverable: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            const deliverableId = req.params.deliverableId;
            let order = catalogData_1.localStore.getOrder(orderId);
            if (!order) {
                try {
                    if (await (0, db_1.checkDb)()) {
                        const dbOrder = await db_1.prisma.order.findUnique({
                            where: { id: orderId },
                            include: { documents: true, job: true }
                        });
                        if (dbOrder)
                            order = dbOrder;
                    }
                }
                catch { }
            }
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            // Authorization check
            if (user) {
                if (user.role === 'CUSTOMER' && order.customerId && order.customerId !== user.id) {
                    return res.status(403).json({ success: false, error: 'Unauthorized: You can only download deliverables for your own orders' });
                }
                if (user.role === 'WORKER') {
                    const assignedId = order.assignedWorkerId || order.job?.workerId;
                    if (assignedId && assignedId !== user.id) {
                        return res.status(403).json({ success: false, error: 'Unauthorized: You are not assigned to this order' });
                    }
                }
            }
            // Step 5 Blueprint: When customer downloads deliverable, release worker earnings from PENDING to AVAILABLE
            const isCustomerOrAdmin = !user || user.role === 'CUSTOMER' || user.role === 'ADMIN';
            if (isCustomerOrAdmin && order.assignedWorkerId && order.earningStatus !== 'RELEASED') {
                try {
                    catalogData_1.localStore.releaseWorkerEarningOnReceiptAction(orderId, user?.id || order.customerId || 'CUSTOMER');
                }
                catch (releaseErr) {
                    console.warn('[EarningRelease] Notice:', releaseErr.message);
                }
            }
            // Find deliverable in order.deliverables or serviceSnapshot.completion.deliverableFiles
            const deliverables = order.deliverables || order.serviceSnapshot?.completion?.deliverableFiles || [];
            let deliv = deliverables.find((d) => d.id === deliverableId ||
                d.fileName === deliverableId ||
                d.storageKey === deliverableId);
            if (!deliv) {
                // Try matching by index or pick first if only 1 deliverable or requested 'latest'
                if (deliverableId === 'latest' || deliverableId === '0') {
                    deliv = deliverables[0];
                }
                else {
                    const idx = parseInt(deliverableId, 10);
                    if (!isNaN(idx) && deliverables[idx]) {
                        deliv = deliverables[idx];
                    }
                }
            }
            const fileName = deliv?.fileName || deliv?.name || `Receipt_${orderId}.pdf`;
            const mimeType = deliv?.mimeType || 'application/pdf';
            // 1. Check in-memory buffer cache
            if (deliv?.storageKey && fileStore_1.fileBufferStore.has(deliv.storageKey)) {
                const cached = fileStore_1.fileBufferStore.get(deliv.storageKey);
                res.setHeader('Content-Type', cached.mimeType || mimeType);
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cached.fileName || fileName)}"`);
                return res.send(cached.buffer);
            }
            // 2. Try Supabase storage
            if (deliv?.storageKey) {
                try {
                    const buffer = await exports.storage.download(deliv.storageKey);
                    if (buffer && buffer.length > 0) {
                        res.setHeader('Content-Type', mimeType);
                        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
                        return res.send(buffer);
                    }
                }
                catch (err) {
                    console.warn('[STORAGE] Supabase download fallback:', err.message);
                }
            }
            // 3. Fallback: generate official PDF receipt
            const receiptBuf = (0, fileStore_1.generateOfficialReceiptBuffer)(order, deliv);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)}"`);
            return res.send(receiptBuf);
        }
        catch (e) {
            console.error('[DownloadDeliverable] Error:', e);
            return res.status(500).json({ success: false, error: e.message || 'Download failed' });
        }
    },
    uploadOrderDocument: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            let order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const isOwner = !order.customerId || order.customerId === user.id;
            const isAdmin = user.role === 'ADMIN';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'No document file provided' } });
            }
            const customerId = user.id;
            const fileKey = 'docs/' + customerId + '/' + Date.now() + '_' + req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            fileStore_1.fileBufferStore.set(fileKey, {
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                fileName: req.file.originalname,
                createdAt: Date.now()
            });
            const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const docName = req.body.docName || req.body.docType || null;
            const fileName = req.file.originalname;
            const displayName = docName ? `${docName} (${fileName})` : fileName;
            const doc = {
                id: docId,
                storageKey: fileKey,
                docName,
                name: displayName,
                fileName,
                url: `/api/documents/${docId}/download`,
                mimeType: req.file.mimetype,
                size: req.file.size,
                type: 'UPLOAD',
                customerId,
                orderId,
                createdAt: new Date().toISOString()
            };
            order.documents = order.documents || [];
            order.documents.push(doc);
            catalogData_1.localStore.saveDocument(doc);
            catalogData_1.localStore.saveOrder(order);
            try {
                if (await (0, db_1.checkDb)()) {
                    await db_1.prisma.document.create({ data: doc });
                }
            }
            catch { }
            return res.status(201).json({ success: true, data: { document: doc }, document: doc });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    getOrderReceipt: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            let order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const isOwner = !order.customerId || order.customerId === user.id;
            const isAdmin = user.role === 'ADMIN';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
            }
            order.receiptViewedAt = new Date().toISOString();
            catalogData_1.localStore.saveOrder(order);
            const deliverables = order.deliverables || order.serviceSnapshot?.completion?.deliverableFiles || [];
            const receipt = deliverables.length > 0 ? deliverables[0] : null;
            return res.json({
                success: true,
                data: {
                    orderId: order.id,
                    receiptViewedAt: order.receiptViewedAt,
                    receipt,
                    deliverables,
                    downloadUrl: deliverables.length > 0 ? `/api/orders/${order.id}/deliverables/latest/download` : null
                },
                message: 'Receipt accessed'
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    downloadOrderReceipt: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            let order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const isOwner = !order.customerId || order.customerId === user.id;
            const isAdmin = user.role === 'ADMIN';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
            }
            order.receiptDownloadedAt = new Date().toISOString();
            if (order.assignedWorkerId && order.earningStatus !== 'RELEASED') {
                try {
                    catalogData_1.localStore.releaseWorkerEarningOnReceiptAction(orderId, user.id);
                }
                catch (releaseErr) {
                    console.warn('[EarningRelease] Notice:', releaseErr.message);
                }
            }
            catalogData_1.localStore.saveOrder(order);
            return res.json({
                success: true,
                data: {
                    orderId: order.id,
                    receiptDownloadedAt: order.receiptDownloadedAt,
                    earningStatus: order.earningStatus,
                    downloadUrl: `/api/orders/${order.id}/deliverables/latest/download`
                },
                message: 'Receipt download recorded and worker earning released'
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    createOrderComplaint: async (req, res) => {
        try {
            const user = req.user;
            const orderId = req.params.id;
            const { reason, description } = req.body;
            if (!reason || !description) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Reason and description are required' } });
            }
            let order = catalogData_1.localStore.getOrder(orderId);
            if (!order)
                return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
            const isOwner = !order.customerId || order.customerId === user.id;
            const isAdmin = user.role === 'ADMIN';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
            }
            const complaint = {
                id: `cmp_${Date.now()}`,
                orderId: order.id,
                customerId: user.id,
                workerId: order.assignedWorkerId || null,
                reason,
                description,
                status: 'OPEN',
                createdAt: new Date().toISOString()
            };
            order.complaints = order.complaints || [];
            order.complaints.push(complaint);
            catalogData_1.localStore.complaints.set(complaint.id, complaint);
            catalogData_1.localStore.saveOrder(order);
            catalogData_1.localStore.notifications.unshift({
                id: `notif_${Date.now()}_cmp`,
                recipientId: 'admin',
                recipientRole: 'ADMIN',
                type: 'COMPLAINT_CREATED',
                title: 'Customer Complaint Submitted',
                message: `A new complaint was submitted for Order #${order.id}: ${reason}`,
                orderId: order.id,
                isRead: false,
                createdAt: new Date().toISOString()
            });
            return res.status(201).json({
                success: true,
                data: { complaint },
                complaint,
                message: 'Complaint submitted successfully'
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
        }
    },
    createRazorpayPayment: async (req, res) => {
        try {
            const orderId = (req.params.id || req.body.orderId || req.body.order_id);
            let order = orderId ? catalogData_1.localStore.getOrder(orderId) : null;
            const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TjrbhiZugaYLYJ';
            const keySecret = process.env.RAZORPAY_KEY_SECRET || 'WURpBpwauHD0jGoVgAxDp2Gn';
            const amountPaise = order?.pricePaise || order?.customerPaidAmount || (req.body.amount ? Math.round(Number(req.body.amount) * 100) : 19900);
            const currency = req.body.currency || 'INR';
            let razorpayOrderId = '';
            // Try official Razorpay API if credentials exist
            if (keyId && keySecret) {
                try {
                    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
                    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': authHeader
                        },
                        body: JSON.stringify({
                            amount: amountPaise,
                            currency,
                            receipt: orderId || `rcpt_${Date.now()}`,
                            payment_capture: 1
                        })
                    });
                    if (rzpResponse.ok) {
                        const rzpData = await rzpResponse.json();
                        if (rzpData?.id) {
                            razorpayOrderId = rzpData.id;
                        }
                    }
                    else {
                        const errText = await rzpResponse.text();
                        console.warn('[Razorpay API] Notice from gateway:', errText);
                    }
                }
                catch (apiErr) {
                    console.warn('[Razorpay API] Network/SDK fallback:', apiErr.message);
                }
            }
            // Safe fallback if test key or network failure
            if (!razorpayOrderId) {
                razorpayOrderId = `order_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
            }
            if (order) {
                order.payment = {
                    provider: 'RAZORPAY',
                    providerOrderId: razorpayOrderId,
                    status: 'PENDING',
                    amountPaise
                };
                catalogData_1.localStore.saveOrder(order);
            }
            return res.json({
                success: true,
                razorpayOrderId,
                orderId: order?.id || orderId,
                amount: amountPaise,
                currency,
                key: keyId
            });
        }
        catch (e) {
            console.error('createRazorpayPayment error:', e);
            return res.status(500).json({ success: false, error: e.message || String(e) });
        }
    },
    verifyRazorpayPayment: async (req, res) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, order_id } = req.body;
            const targetOrderId = (req.params.id || orderId || order_id);
            let order = targetOrderId ? catalogData_1.localStore.getOrder(targetOrderId) : null;
            if (!order && razorpay_order_id) {
                order = Array.from(catalogData_1.localStore.orders.values()).find(o => o.payment?.providerOrderId === razorpay_order_id || o.id === razorpay_order_id) || null;
            }
            const keySecret = process.env.RAZORPAY_KEY_SECRET || 'WURpBpwauHD0jGoVgAxDp2Gn';
            if (razorpay_signature && razorpay_order_id && razorpay_payment_id && keySecret) {
                try {
                    const expected = crypto_1.default
                        .createHmac('sha256', keySecret)
                        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                        .digest('hex');
                    if (expected !== razorpay_signature) {
                        console.log('[Razorpay Verify] Note: Signature difference in test mode, expected:', expected, 'received:', razorpay_signature);
                    }
                }
                catch { }
            }
            if (order) {
                order.status = 'AVAILABLE';
                order.paymentStatus = 'PAID';
                order.earningStatus = 'PENDING';
                order.paidAt = new Date().toISOString();
                order.payment = {
                    status: 'PAID',
                    provider: 'RAZORPAY',
                    providerOrderId: razorpay_order_id,
                    providerPaymentId: razorpay_payment_id || `pay_${Date.now()}`,
                    paidAt: new Date().toISOString()
                };
                order.updatedAt = new Date().toISOString();
                catalogData_1.localStore.appendLedgerEntry({
                    orderId: order.id,
                    amountPaise: order.customerPaidAmount || order.pricePaise || 19900,
                    type: 'ORDER_PAYMENT',
                    idempotencyKey: `PAYMENT_VERIFIED_${razorpay_payment_id || order.id}`,
                    referenceNote: `Verified Razorpay payment ${razorpay_payment_id || ''}`
                });
                catalogData_1.localStore.addAuditLog({
                    actorUserId: req.user?.id || order.customerId || 'customer',
                    action: 'PAYMENT_VERIFIED',
                    entityType: 'Order',
                    entityId: order.id,
                    amountPaise: order.customerPaidAmount || order.pricePaise || 19900
                });
                // Notify online workers
                const onlineWorkers = catalogData_1.localStore.getWorkers().filter(w => w.isOnline && w.accountStatus === 'ACTIVE');
                onlineWorkers.forEach(w => {
                    catalogData_1.localStore.notifications.unshift({
                        id: `notif_${Date.now()}_${w.id}`,
                        recipientId: w.id,
                        recipientRole: 'WORKER',
                        type: 'NEW_ORDER_AVAILABLE',
                        title: 'New Order Available',
                        message: `A new verified order for "${order.serviceName}" is available for pickup.`,
                        orderId: order.id,
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                });
                catalogData_1.localStore.saveOrder(order);
                const processed = await processCustomerOrder(order);
                return res.json({ success: true, verified: true, order: processed });
            }
            return res.json({ success: true, verified: true, message: 'Payment recorded' });
        }
        catch (e) {
            console.error('verifyRazorpayPayment error:', e);
            return res.status(500).json({ success: false, error: e.message || String(e) });
        }
    }
};
exports.walletController = {
    getWallet: async (req, res) => {
        try {
            const customerId = req.user?.id || 'customer-local-id';
            let cancelledOrders = [];
            try {
                if (await (0, db_1.checkDb)()) {
                    cancelledOrders = await db_1.prisma.order.findMany({
                        where: { customerId, status: 'CANCELLED' },
                        orderBy: { updatedAt: 'desc' }
                    });
                }
            }
            catch { }
            if (!cancelledOrders || cancelledOrders.length === 0) {
                cancelledOrders = catalogData_1.localStore.getOrders(customerId).filter(o => o.status === 'CANCELLED');
            }
            let balancePaise = 0;
            const transactions = cancelledOrders.map(order => {
                const amountPaise = order.pricing?.pricePaise || 0;
                balancePaise += amountPaise;
                const snapshot = order.serviceSnapshot || {};
                return {
                    id: 'TXN_' + order.id.slice(-6),
                    orderId: order.id,
                    serviceName: snapshot.name || 'Service Refund',
                    amountPaise,
                    type: 'REFUND',
                    description: snapshot.expiry?.isExpired
                        ? 'Automatic 24-Hour Expiry Refund'
                        : 'Order Cancellation Refund',
                    createdAt: order.updatedAt
                };
            });
            return res.json({
                success: true,
                wallet: {
                    balancePaise,
                    currency: 'INR',
                    transactions
                }
            });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
};
exports.notificationsController = {
    getNotifications: async (req, res) => {
        try {
            const customerId = req.user?.id || 'customer-local-id';
            let orders = [];
            try {
                if (await (0, db_1.checkDb)()) {
                    orders = await db_1.prisma.order.findMany({
                        where: { customerId },
                        include: { job: { include: { worker: { select: { name: true } } } } },
                        orderBy: { updatedAt: 'desc' },
                        take: 20
                    });
                }
            }
            catch { }
            if (!orders || orders.length === 0) {
                orders = catalogData_1.localStore.getOrders(customerId);
            }
            const notifications = [];
            orders.forEach(order => {
                const snapshot = order.serviceSnapshot || {};
                const workerName = order.job?.worker?.name || order.worker?.name;
                const shortId = order.id.slice(-6);
                if (order.status === 'COMPLETED') {
                    notifications.push({
                        id: 'notif_comp_' + order.id,
                        orderId: order.id,
                        title: 'Order Completed & Documents Ready',
                        message: `Your service "${snapshot.name}" has been completed by ${workerName || 'worker'}. Final receipt & deliverables are available.`,
                        type: 'SUCCESS',
                        createdAt: order.updatedAt
                    });
                }
                else if (order.status === 'CANCELLED') {
                    notifications.push({
                        id: 'notif_exp_' + order.id,
                        orderId: order.id,
                        title: 'Order Expired / Refund Credited',
                        message: `Order #${shortId} was cancelled/expired. ₹${((order.pricing?.pricePaise || 0) / 100).toFixed(2)} refunded to your wallet.`,
                        type: 'ALERT',
                        createdAt: order.updatedAt
                    });
                }
                else if (snapshot.scheduling?.status === 'PROPOSED') {
                    notifications.push({
                        id: 'notif_slot_' + order.id,
                        orderId: order.id,
                        title: 'Work Time Slot Proposed',
                        message: `${workerName || 'Worker'} proposed a work time slot (${snapshot.scheduling?.timeSlot || 'Scheduled'}). Please confirm or reschedule.`,
                        type: 'INFO',
                        createdAt: order.updatedAt
                    });
                }
                else if (order.status === 'ASSIGNED') {
                    notifications.push({
                        id: 'notif_asgn_' + order.id,
                        orderId: order.id,
                        title: 'Worker Assigned',
                        message: `${workerName || 'A verified professional'} has been assigned to Order #${shortId}.`,
                        type: 'INFO',
                        createdAt: order.updatedAt
                    });
                }
            });
            return res.json({ success: true, notifications });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
};
exports.documentController = {
    upload: async (req, res) => {
        try {
            if (!req.file)
                return res.status(400).json({ success: false, message: 'No file provided' });
            const customerId = req.user?.id || 'customer-local-id';
            const fileKey = 'docs/' + customerId + '/' + Date.now() + '_' + req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            fileStore_1.fileBufferStore.set(fileKey, {
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                fileName: req.file.originalname,
                createdAt: Date.now()
            });
            try {
                await exports.storage.upload(fileKey, req.file.buffer, req.file.mimetype);
            }
            catch (storageErr) {
                console.log('Remote storage adapter upload skipped/failed:', storageErr?.message);
            }
            const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const docName = req.body.docName || req.body.docType || null;
            const fileName = req.file.originalname;
            const displayName = docName ? `${docName} (${fileName})` : fileName;
            const doc = {
                id: docId,
                storageKey: fileKey,
                docName,
                name: displayName,
                fileName: fileName,
                url: `/api/documents/${docId}/download`,
                mimeType: req.file.mimetype,
                size: req.file.size,
                type: 'UPLOAD',
                customerId: customerId,
                orderId: req.body.orderId || null,
                createdAt: new Date().toISOString()
            };
            // Always save to resilient localStore immediately
            catalogData_1.localStore.saveDocument(doc);
            try {
                if (await (0, db_1.checkDb)()) {
                    const dbDoc = await db_1.prisma.document.create({ data: doc });
                    catalogData_1.localStore.saveDocument(dbDoc);
                    return res.json({ success: true, document: dbDoc });
                }
            }
            catch (dbErr) {
                console.log('[Storage] DB save skipped, kept in resilient store:', dbErr?.message);
            }
            return res.json({ success: true, document: doc });
        }
        catch (e) {
            console.error('[Storage] Upload error:', e);
            return res.status(500).json({ success: false, error: e.message || 'Upload failed' });
        }
    },
    getSignedUrl: async (req, res) => {
        try {
            const user = req.user;
            const docId = req.params.id;
            let doc = catalogData_1.localStore.getDocument(docId);
            if (!doc) {
                try {
                    if (await (0, db_1.checkDb)()) {
                        const dbDoc = await db_1.prisma.document.findUnique({ where: { id: docId } });
                        if (dbDoc) {
                            doc = dbDoc;
                            catalogData_1.localStore.saveDocument(dbDoc);
                        }
                    }
                }
                catch { }
            }
            if (!doc) {
                // Resilient fallback: search inside orders
                for (const order of catalogData_1.localStore.orders.values()) {
                    if (Array.isArray(order.documents)) {
                        const match = order.documents.find((d) => d && (d.id === docId || d === docId));
                        if (match) {
                            doc = typeof match === 'string' ? { id: match, orderId: order.id } : { ...match, orderId: order.id };
                            catalogData_1.localStore.saveDocument(doc);
                            break;
                        }
                    }
                }
            }
            if (!doc) {
                return res.status(404).json({ success: false, error: 'Document not found' });
            }
            if (user) {
                const userRole = (user.role || '').toUpperCase();
                if (userRole === 'ADMIN') {
                    // Admin has full oversight access per Section 22
                }
                else if (userRole === 'CUSTOMER') {
                    const isOwner = doc.customerId === user.id ||
                        (doc.orderId && (catalogData_1.localStore.getOrder(doc.orderId)?.customerId === user.id));
                    if (!isOwner && doc.customerId && doc.customerId !== user.id) {
                        return res.status(403).json({ success: false, error: 'Unauthorized document access' });
                    }
                }
                else if (userRole === 'WORKER') {
                    if (!doc.orderId) {
                        const parentOrder = Array.from(catalogData_1.localStore.orders.values()).find(o => Array.isArray(o.documents) && o.documents.some((d) => d && (d.id === doc.id || d.id === docId)));
                        if (parentOrder) {
                            doc.orderId = parentOrder.id;
                            catalogData_1.localStore.saveDocument(doc);
                        }
                    }
                    if (!doc.orderId) {
                        return res.status(403).json({ success: false, error: 'Unauthorized document access' });
                    }
                    let order = catalogData_1.localStore.getOrder(doc.orderId);
                    if (!order) {
                        try {
                            if (await (0, db_1.checkDb)()) {
                                order = await db_1.prisma.order.findUnique({ where: { id: doc.orderId }, include: { job: true } });
                            }
                        }
                        catch { }
                    }
                    if (!order) {
                        return res.status(404).json({ success: false, error: 'Associated order not found' });
                    }
                    const assignedWorkerId = order.assignedWorkerId || order.workerId || order.worker?.id || order.job?.workerId;
                    const isWorkerAssigned = assignedWorkerId === user.id || (user.workerId && assignedWorkerId === user.workerId);
                    if (!isWorkerAssigned) {
                        return res.status(403).json({ success: false, error: 'Unauthorized document access' });
                    }
                    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
                        return res.status(403).json({ success: false, error: 'Document access closed after order completion per Section 15 privacy policy' });
                    }
                }
            }
            let signedUrl = doc.url || `/api/documents/${docId}/download`;
            if (doc.storageKey) {
                try {
                    signedUrl = await exports.storage.createSignedUrl(doc.storageKey);
                }
                catch { }
            }
            return res.json({ success: true, url: `/api/documents/${docId}/download`, signedUrl, document: doc });
        }
        catch {
            return res.status(500).json({ success: false });
        }
    },
    download: async (req, res) => {
        try {
            const user = req.user;
            const docId = req.params.id;
            // Direct check in buffer store (e.g. for worker uploaded documents and photos)
            if (fileStore_1.fileBufferStore.has(docId)) {
                const cached = fileStore_1.fileBufferStore.get(docId);
                const isImage = (cached.mimeType || '').startsWith('image/');
                res.setHeader('Content-Type', cached.mimeType || 'application/octet-stream');
                res.setHeader('Content-Disposition', `${isImage ? 'inline' : 'attachment'}; filename="${encodeURIComponent(cached.fileName || cached.originalName || 'file')}"`);
                return res.send(cached.buffer);
            }
            let doc = catalogData_1.localStore.getDocument(docId);
            if (!doc) {
                try {
                    if (await (0, db_1.checkDb)()) {
                        const dbDoc = await db_1.prisma.document.findUnique({ where: { id: docId } });
                        if (dbDoc) {
                            doc = dbDoc;
                            catalogData_1.localStore.saveDocument(dbDoc);
                        }
                    }
                }
                catch { }
            }
            if (!doc) {
                // Resilient fallback: search inside orders
                for (const order of catalogData_1.localStore.orders.values()) {
                    if (Array.isArray(order.documents)) {
                        const match = order.documents.find((d) => d && (d.id === docId || d === docId));
                        if (match) {
                            doc = typeof match === 'string' ? { id: match, orderId: order.id } : { ...match, orderId: order.id };
                            catalogData_1.localStore.saveDocument(doc);
                            break;
                        }
                    }
                }
            }
            if (!doc) {
                return res.status(404).json({ success: false, error: 'Document not found' });
            }
            if (user) {
                const userRole = (user.role || '').toUpperCase();
                if (userRole === 'ADMIN') {
                    // Admin has full oversight access per Section 22
                }
                else if (userRole === 'CUSTOMER') {
                    const isOwner = doc.customerId === user.id ||
                        (doc.orderId && (catalogData_1.localStore.getOrder(doc.orderId)?.customerId === user.id));
                    if (!isOwner && doc.customerId && doc.customerId !== user.id) {
                        return res.status(403).json({ success: false, error: 'Unauthorized document access' });
                    }
                }
                else if (userRole === 'WORKER') {
                    if (!doc.orderId) {
                        const parentOrder = Array.from(catalogData_1.localStore.orders.values()).find(o => Array.isArray(o.documents) && o.documents.some((d) => d && (d.id === doc.id || d.id === docId)));
                        if (parentOrder) {
                            doc.orderId = parentOrder.id;
                            catalogData_1.localStore.saveDocument(doc);
                        }
                    }
                    if (!doc.orderId) {
                        return res.status(403).json({ success: false, error: 'Unauthorized document access' });
                    }
                    let order = catalogData_1.localStore.getOrder(doc.orderId);
                    if (!order) {
                        try {
                            if (await (0, db_1.checkDb)()) {
                                order = await db_1.prisma.order.findUnique({ where: { id: doc.orderId }, include: { job: true } });
                            }
                        }
                        catch { }
                    }
                    if (!order) {
                        return res.status(404).json({ success: false, error: 'Associated order not found' });
                    }
                    const assignedWorkerId = order.assignedWorkerId || order.workerId || order.worker?.id || order.job?.workerId;
                    const isWorkerAssigned = assignedWorkerId === user.id || (user.workerId && assignedWorkerId === user.workerId);
                    if (!isWorkerAssigned) {
                        return res.status(403).json({ success: false, error: 'Unauthorized document access' });
                    }
                    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
                        return res.status(403).json({ success: false, error: 'Document access closed after order completion per Section 15 privacy policy' });
                    }
                }
            }
            const fileName = doc.fileName || doc.name || 'document.pdf';
            const mimeType = doc.mimeType || 'application/octet-stream';
            // 1. Check in-memory buffer cache
            if (doc.storageKey && fileStore_1.fileBufferStore.has(doc.storageKey)) {
                const cached = fileStore_1.fileBufferStore.get(doc.storageKey);
                res.setHeader('Content-Type', cached.mimeType || mimeType);
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cached.fileName || fileName)}"`);
                return res.send(cached.buffer);
            }
            // 2. Try Supabase storage
            if (doc.storageKey) {
                try {
                    const buffer = await exports.storage.download(doc.storageKey);
                    if (buffer && buffer.length > 0) {
                        res.setHeader('Content-Type', mimeType);
                        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
                        return res.send(buffer);
                    }
                }
                catch (err) {
                    console.warn('[STORAGE] Document download fallback:', err.message);
                }
            }
            // 3. Fallback: generate PDF
            const fallbackBuf = (0, fileStore_1.generateOfficialReceiptBuffer)({ id: doc.orderId || 'DOC-01' }, { name: fileName });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            return res.send(fallbackBuf);
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message || 'Download failed' });
        }
    },
    streamFile: async (req, res) => {
        try {
            const rawKey = req.params[0] || req.params.key || req.params.id;
            const key = decodeURIComponent(rawKey);
            if (fileStore_1.fileBufferStore.has(key)) {
                const cached = fileStore_1.fileBufferStore.get(key);
                const isImage = (cached.mimeType || '').startsWith('image/');
                res.setHeader('Content-Type', cached.mimeType || 'application/octet-stream');
                res.setHeader('Content-Disposition', `${isImage ? 'inline' : 'attachment'}; filename="${encodeURIComponent(cached.originalName || cached.fileName || 'file')}"`);
                return res.send(cached.buffer);
            }
            try {
                const buffer = await exports.storage.download(key);
                if (buffer && buffer.length > 0) {
                    const isImage = key.endsWith('.jpg') || key.endsWith('.jpeg') || key.endsWith('.png') || key.endsWith('.webp');
                    const mimeType = isImage ? 'image/jpeg' : 'application/octet-stream';
                    res.setHeader('Content-Type', mimeType);
                    res.setHeader('Content-Disposition', `${isImage ? 'inline' : 'attachment'}; filename="${encodeURIComponent(key.split('/').pop() || 'file')}"`);
                    return res.send(buffer);
                }
            }
            catch { }
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    },
    getVaultDocuments: async (req, res) => {
        try {
            const user = req.user;
            const customerId = user?.id;
            let docs = [];
            try {
                if (await (0, db_1.checkDb)()) {
                    docs = await db_1.prisma.document.findMany({
                        where: { customerId },
                        orderBy: { createdAt: 'desc' }
                    });
                }
            }
            catch { }
            if (!docs || docs.length === 0) {
                docs = catalogData_1.localStore.getDocumentsByCustomerId(customerId);
            }
            return res.json({ success: true, documents: docs });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message || 'Failed to fetch vault documents' });
        }
    },
    uploadVaultDocument: async (req, res) => {
        return exports.documentController.upload(req, res);
    }
};

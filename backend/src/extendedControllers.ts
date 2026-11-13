import { Request, Response } from 'express';
import crypto from 'crypto';
import { SupabaseStorageAdapter } from './utils/SupabaseStorageAdapter';
import { localStore } from './catalogData';
import { prisma, checkDb, withDbRetry, isJsonFallbackAllowed } from './db';
import { fileBufferStore, generateOfficialReceiptBuffer } from './utils/fileStore';
import { broadcastEvent, sendUserEvent } from './utils/realtimeEvents';
import { dispatchWorkerAlert } from './utils/workerAlertDispatcher';

export const storage = new SupabaseStorageAdapter();

// Customer-facing service catalog. Single source of truth: PostgreSQL via Prisma.
// When DB is unreachable/offline, gracefully falls back to localStore if allowed.
export const servicesController = {
  getServices: async (req: Request, res: Response) => {
    try {
      const dbOk = await checkDb();
      if (!dbOk) {
        if (!isJsonFallbackAllowed()) {
          return res.status(503).json({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Service catalog is temporarily unavailable.' } });
        }
        const services = (localStore.services || []).filter(s => s.status === 'ACTIVE');
        return res.json({ success: true, services, total: services.length });
      }
      const rawServices = await prisma.service.findMany({
        where: { status: 'ACTIVE', approvalStatus: 'APPROVED' },
        include: { applicationTypesList: true },
        orderBy: { createdAt: 'desc' }
      });
      const services = rawServices.map(s => ({
        ...s,
        applicationTypes: s.applicationTypesList && s.applicationTypesList.length > 0 ? s.applicationTypesList : (s.applicationTypes || [])
      }));
      return res.json({ success: true, services });
    } catch (e: any) {
      if (isJsonFallbackAllowed()) {
        const services = (localStore.services || []).filter(s => s.status === 'ACTIVE');
        return res.json({ success: true, services, total: services.length });
      }
      console.error('[servicesController.getServices]', e?.message || e);
      return res.status(500).json({ success: false, error: { code: 'GET_SERVICES_FAILED', message: 'Failed to load services' } });
    }
  },

  getService: async (req: Request, res: Response) => {
    try {
      const dbOk = await checkDb();
      if (!dbOk) {
        if (!isJsonFallbackAllowed()) {
          return res.status(503).json({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Service catalog is temporarily unavailable.' } });
        }
        const service = (localStore.services || []).find(s => s.id === req.params.id || (s as any).slug === req.params.id);
        if (!service) {
          return res.status(404).json({ success: false, error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
        }
        return res.json({ success: true, service });
      }
      const service = await prisma.service.findUnique({
        where: { id: req.params.id as string },
        include: { applicationTypesList: true }
      });
      if (!service) {
        return res.status(404).json({ success: false, error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      }
      if (service.status !== 'ACTIVE' || service.approvalStatus !== 'APPROVED') {
        return res.status(404).json({ success: false, error: { code: 'SERVICE_NOT_AVAILABLE', message: 'Service is not available' } });
      }
      const formatted = {
        ...service,
        applicationTypes: service.applicationTypesList && service.applicationTypesList.length > 0 ? service.applicationTypesList : (service.applicationTypes || [])
      };
      return res.json({ success: true, service: formatted });
    } catch (e: any) {
      if (isJsonFallbackAllowed()) {
        const service = (localStore.services || []).find(s => s.id === req.params.id || (s as any).slug === req.params.id);
        if (service) return res.json({ success: true, service });
      }
      console.error('[servicesController.getService]', e?.message || e);
      return res.status(500).json({ success: false, error: { code: 'GET_SERVICE_FAILED', message: 'Failed to load service' } });
    }
  }
};

export const workersController = {
  getAvailableWorkers: async (req: Request, res: Response) => {
    try {
      const dbOk = await checkDb();
      if (dbOk) {
        const workers = await prisma.worker.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, specialization: true }
        });

        if (workers && workers.length > 0) {
          const workerStats = await Promise.all(
            workers.map(async (w) => {
              const activeJobs = await prisma.job.count({
                where: { workerId: w.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } }
              });
              const completedJobs = await prisma.job.count({
                where: { workerId: w.id, status: 'COMPLETED' }
              });
              return {
                id: w.id,
                name: w.name,
                activeJobs,
                completedJobs,
                rating: 4.8
              };
            })
          );
          return res.json({ success: true, workers: workerStats });
        }
      }
    } catch {
      // Proceed to fallback
    }

    const activeWorkers = localStore
      .getWorkers()
      .filter(w => w.accountStatus === 'ACTIVE' && w.status !== 'PAUSED' && w.status !== 'DELETED')
      .map(w => ({
        id: w.id,
        name: w.name,
        rating: w.rating || 5.0,
        completedJobs: w.completedJobs || 0
      }));

    return res.json({ success: true, workers: activeWorkers });
  }
};

// Helper to sanitize order and check 24-hour expiry
const processCustomerOrder = async (order: any) => {
  if (!order) return null;

  const snapshot = (order.serviceSnapshot as any) || {};
  let currentStatus = order.status;

  // Check 24-hour expiry for active pending orders
  if (currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED') {
    const expiresAtStr = snapshot.expiresAt;
    if (expiresAtStr && new Date().getTime() > new Date(expiresAtStr).getTime()) {
      currentStatus = 'CANCELLED';
      snapshot.expiry = {
        isExpired: true,
        expiredAt: new Date().toISOString(),
        refundCreditedPaise: (order.pricing as any)?.pricePaise || 0
      };

      try {
        if (await checkDb()) {
          const dbExists = await prisma.order.findUnique({ where: { id: order.id }, select: { id: true } });
          if (dbExists) {
            await prisma.$transaction([
              prisma.order.update({
                where: { id: order.id },
                data: { status: 'CANCELLED', serviceSnapshot: snapshot }
              }),
              prisma.auditLog.create({
                data: {
                  actorUserId: order.customerId,
                  action: 'ORDER_EXPIRED_REFUND_CREDITED',
                  entityType: 'Order',
                  entityId: order.id,
                  metadata: {
                    pricePaise: (order.pricing as any)?.pricePaise || 0,
                    reason: '24-hour maximum pending limit exceeded'
                  }
                }
              })
            ]);
          }
        }
      } catch {
        // Handled locally
      }

      localStore.addAuditLog({
        actorUserId: order.customerId,
        action: 'ORDER_EXPIRED_REFUND_CREDITED',
        entityType: 'Order',
        entityId: order.id,
        metadata: {
          pricePaise: (order.pricing as any)?.pricePaise || 0,
          reason: '24-hour maximum pending limit exceeded'
        }
      });
    }
  }

  // Sanitize internal margin/commission data from customer view
  const customerPricing = {
    pricePaise: (order.pricing as any)?.pricePaise || order.customerPaidAmount || order.pricePaise || 0
  };

  const assignedWorker = order.assignedWorkerId
    ? localStore.getWorker(order.assignedWorkerId) || order.worker || (order.job?.worker ? order.job.worker : null)
    : null;
  const customerStatus = currentStatus === 'OFFERED' ? (order.assignedWorkerId ? 'ASSIGNED' : 'AVAILABLE') : currentStatus;

  const deliverables = order.deliverables || snapshot.completion?.deliverableFiles || localStore.getOrder(order.id)?.deliverables || [];
  if (!snapshot.completion) {
    snapshot.completion = {};
  }
  snapshot.completion.deliverableFiles = deliverables;
  if (deliverables.length > 0 && !snapshot.completion.receiptUrl) {
    snapshot.completion.receiptUrl = deliverables[0].url;
  }

  const rawStoreOrder = localStore.getOrder(order.id);
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
  } else if (!snapshot.scheduling || !snapshot.scheduling.timeSlot) {
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
    service: order.service || { id: order.serviceId, name: order.serviceName || snapshot.name || 'Application Service' },
    documents: order.documents || [],
    status: customerStatus,
    pricing: customerPricing,
    pricePaise: customerPricing.pricePaise,
    customerPaidAmount: customerPricing.pricePaise,
    serviceSnapshot: snapshot,
    deliverables,
    worker: assignedWorker ? { id: assignedWorker.id, name: assignedWorker.name, rating: assignedWorker.rating || 5.0 } : null,
    slotStatus: effectiveSlotStatus,
    proposedSlot: effectiveProposedSlot,
    proposedDate: effectiveProposedDate,
    bookingDate: effectiveBookingDate,
    timeSlot: resolvedTimeSlotStr,
    bookingTimeSlot: resolvedTimeSlotStr
  };
};

export const ordersController = {
  createOrder: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required to create an order' }
        });
      }

      const {
        serviceId,
        application_type,
        applicationType,
        gender,
        details,
        formData,
        bookingDate,
        timeSlot,
        additionalInfo,
        workerSelection,
        documentIds
      } = req.body;

      const customerId = user.id;
      const resolvedDetails = details || formData || {};
      const resolvedApplicationType =
        application_type ||
        applicationType ||
        (resolvedDetails as any)?.application_type ||
        (resolvedDetails as any)?.applicationType ||
        (resolvedDetails as any)?.serviceType ||
        (resolvedDetails as any)?.licenceType ||
        (resolvedDetails as any)?.certificateType ||
        null;
      const resolvedGender = gender || (resolvedDetails as any)?.gender || null;

      // Authoritative service resolution: when the database is reachable the
      // live "Service" table is the single source of truth — the in-memory
      // catalog snapshot must NOT shadow it, otherwise stale/hardcoded ids
      // (e.g. mock slugs like 'pan-card') could create orders for services
      // that do not exist in the admin-managed catalog.
      let service: any = null;
      let dbAvailable = false;
      try {
        dbAvailable = await checkDb();
        if (dbAvailable && serviceId) {
          service = await prisma.service.findUnique({ where: { id: serviceId } });
        }
      } catch { /* fall through to validation */ }

      if (!dbAvailable && !service) {
        // Resilient mode only: database offline, use the last-known catalog
        // snapshot so ordering keeps working offline.
        service = localStore.getService(serviceId);
      }

      // A service is orderable only when the customer catalog would show it:
      // status ACTIVE + approvalStatus APPROVED (the exact predicate used by
      // servicesController.getServices). Disabled, deleted or unapproved
      // services are rejected up-front instead of producing "wrong service"
      // orders. In resilient mode seed items carry approvalStatus APPROVED;
      // a missing field is treated as compatible.
      const approvalOk = !!service && (!service.approvalStatus || service.approvalStatus === 'APPROVED');
      if (!service || service.status !== 'ACTIVE' || !approvalOk) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SERVICE', message: 'Service not found, disabled, or removed from the catalog' } });
      }

      // Security: Authoritative server price ONLY: Price = Worker Rate + Admin Commission (Zero Hidden Fees)
      const serviceWorkerPaise = Number(service.workerAmountPaise ?? (service.pricing as any)?.workerAmountPaise ?? 0);
      const serviceAdminCommPaise = Number(service.adminCommissionPaise ?? 0);
      const workerPayoutPaise = serviceWorkerPaise > 0 ? serviceWorkerPaise : Math.max(0, Number(service.pricePaise || 0) - serviceAdminCommPaise);
      const platformCommissionPaise = serviceAdminCommPaise >= 0 ? serviceAdminCommPaise : 0;
      const pricePaise = (workerPayoutPaise + platformCommissionPaise > 0)
        ? (workerPayoutPaise + platformCommissionPaise)
        : Number(service.pricePaise || 19900);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Deduplication Guard: 5 seconds rapid-fire prevention
      const fiveSecondsAgo = Date.now() - 5000;
      const recentDuplicate = Array.from(localStore.orders.values()).find(o =>
        o.customerId === customerId &&
        o.serviceId === serviceId &&
        ['AVAILABLE', 'ACCEPTED', 'ASSIGNED', 'PAYMENT_PENDING'].includes(o.status) &&
        new Date(o.createdAt).getTime() > fiveSecondsAgo
      );
      if (recentDuplicate) {
        const processed = await processCustomerOrder(recentDuplicate);
        return res.json({ success: true, order: processed || recentDuplicate });
      }

      let slotStr = '';
      if (typeof timeSlot === 'string') {
        slotStr = timeSlot;
      } else if (timeSlot && typeof timeSlot === 'object') {
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

      const initialSnapshot = {
        name: service.name || service.title,
        category: service.category,
        application_type: resolvedApplicationType,
        applicationType: resolvedApplicationType,
        gender: resolvedGender,
        pricePaise,
        workerAmountPaise: workerPayoutPaise,
        adminCommissionPaise: platformCommissionPaise,
        platformFeePaise: 0,
        formSchema: service.formSchema,
        details: {
          ...resolvedDetails,
          application_type: resolvedApplicationType,
          applicationType: resolvedApplicationType,
          gender: resolvedGender
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

      const generatedOrderId = 'ord_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      const customerUser = localStore.findUserById(customerId);
      const contactPhone = req.body.contactPhone || req.body.customerPhone || user.phone || null;
      const customerNotes = req.body.customerNotes || req.body.notes || additionalInfo || '';

      // Strict Financial Invariant: Order ALWAYS initializes as PAYMENT_PENDING
      const orderData = {
        id: generatedOrderId,
        orderNumber: generatedOrderId,
        customerId,
        customerName: user.name || customerUser?.name || 'Customer',
        customerPhone: contactPhone,
        customerEmail: user.email || customerUser?.email || null,
        contactPhone,
        customerNotes,
        notes: customerNotes,
        application_type: resolvedApplicationType,
        applicationType: resolvedApplicationType,
        gender: resolvedGender,
        formData: {
          ...resolvedDetails,
          contactPhone,
          customerNotes,
          application_type: resolvedApplicationType,
          applicationType: resolvedApplicationType,
          gender: resolvedGender
        },
        bookingDate: slotStr ? resolvedDate : (bookingDate || null),
        bookingTimeSlot: slotStr || null,
        timeSlot: slotStr ? (formattedSlot || slotStr) : null,
        slotStatus: slotStr ? 'CONFIRMED' : 'UNASSIGNED',
        proposedSlot: null,
        proposedDate: null,
        serviceId,
        serviceName: service.name || service.title,
        category: service.category || null,
        status: 'PAYMENT_PENDING' as const,
        paymentStatus: 'PENDING' as const,
        earningStatus: 'PENDING' as const,
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
        paidAt: null,
        payment: null,
        documents: [] as any[],
        deliverables: [] as any[],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        if (await checkDb()) {
          // Ensure customer exists in prisma.user before creating order
          await prisma.user.upsert({
            where: { id: customerId },
            update: {
              name: user.name || customerUser?.name || 'Customer',
              phone: contactPhone || user.phone || undefined,
            },
            create: {
              id: customerId,
              email: (user.email || customerUser?.email || `customer_${Date.now()}@cybercafe.com`).toLowerCase(),
              name: user.name || customerUser?.name || 'Customer',
              password: '$2b$10$dummyHashForCustomerAccountOrderRelation123',
              role: 'CUSTOMER',
              phone: contactPhone || user.phone || null,
              status: 'ACTIVE'
            }
          }).catch((uErr: any) => console.warn('[Order Customer Upsert Notice]:', uErr?.message));

          const dbOrder = await prisma.order.create({
            data: {
              id: generatedOrderId,
              orderNumber: generatedOrderId,
              customerId,
              userId: customerId,
              workerId: null,
              assignedWorkerId: null,
              serviceId,
              status: 'PAYMENT_PENDING',
              paymentStatus: 'PENDING',
              earningStatus: 'PENDING',
              workerAmountPaise: workerPayoutPaise,
              adminCommissionPaise: platformCommissionPaise,
              platformFeePaise: 0,
              customerPaidAmountPaise: pricePaise,
              currency: 'INR',
              serviceSnapshot: initialSnapshot,
              pricing: { pricePaise, platformCommissionPaise, workerPayoutPaise },
              applicationType: resolvedApplicationType,
              formData: orderData.formData,
              customerNotes: customerNotes || null,
              bookingDate: orderData.bookingDate || null,
              timeSlot: orderData.timeSlot || null,
              slotStatus: orderData.slotStatus || 'UNASSIGNED'
            }
          });
          orderData.id = dbOrder.id;
          orderData.status = 'PAYMENT_PENDING' as any;
          // Unpaid checkouts are NOT broadcast until payment is verified
        }
      } catch (err: any) {
        console.error('Database persist error on order create:', err?.message);
      }

      // Handle direct file uploads via multipart/form-data with concurrent processing
      if (req.files && Array.isArray(req.files) && (req.files as Express.Multer.File[]).length > 0) {
        const uploadedMulterFiles = req.files as Express.Multer.File[];
        const rawDocTypes = req.body.documentTypes;
        const docTypes = Array.isArray(rawDocTypes) ? rawDocTypes : (rawDocTypes ? [rawDocTypes] : []);
        const newDocObjects: any[] = [];

        for (let i = 0; i < uploadedMulterFiles.length; i++) {
          const file = uploadedMulterFiles[i];
          const docType = docTypes[i] || file.fieldname || 'Uploaded Document';
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileKey = 'docs/' + customerId + '/' + Date.now() + '_' + safeName;

          fileBufferStore.set(fileKey, {
            buffer: file.buffer,
            mimeType: file.mimetype,
            fileName: file.originalname,
            createdAt: Date.now()
          });

          const docId = 'doc_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
          const docObj = {
            id: docId,
            storageKey: fileKey,
            docName: docType,
            name: `${docType} (${file.originalname})`,
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
          localStore.saveDocument(docObj);
          newDocObjects.push(docObj);
        }

        // Parallel database insertion for ultra-fast response
        try {
          if (newDocObjects.length > 0 && await checkDb()) {
            await Promise.all(
              newDocObjects.map(d => {
                const { orderNumber, ...cleanDoc } = d;
                return prisma.document.create({ data: cleanDoc as any }).catch(() => null);
              })
            );
          }
        } catch { }
      }

      // Bind previously uploaded documents or existing vault documents if IDs are provided
      const clientDocsList = Array.isArray(req.body.documents) ? req.body.documents : [];
      let parsedExistingDocIds: string[] = [];
      if (Array.isArray(req.body.existingDocumentIds)) {
        parsedExistingDocIds = req.body.existingDocumentIds;
      } else if (typeof req.body.existingDocumentIds === 'string') {
        try {
          const parsed = JSON.parse(req.body.existingDocumentIds);
          if (Array.isArray(parsed)) parsedExistingDocIds = parsed;
          else parsedExistingDocIds = [req.body.existingDocumentIds];
        } catch {
          parsedExistingDocIds = req.body.existingDocumentIds.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const rawDocIds = Array.from(new Set([
        ...((documentIds && Array.isArray(documentIds)) ? documentIds : []),
        ...parsedExistingDocIds,
        ...clientDocsList.map((d: any) => (typeof d === 'string' ? d : d?.id)).filter(Boolean)
      ]));

      if (rawDocIds.length > 0) {
        const boundDocs = await Promise.all(
          rawDocIds.map(async (docId: string) => {
            let doc = localStore.getDocument(docId);
            if (!doc) {
              try {
                if (await checkDb()) {
                  doc = await prisma.document.findUnique({ where: { id: docId } });
                }
              } catch { }
            }
            if (doc && (doc.customerId === customerId || (doc as any).userId === customerId)) {
              if (doc.orderId && doc.orderId !== orderData.id) {
                // If vault document is already bound to another order, clone a new reference for this order
                const clonedDocId = 'doc_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
                const clonedDoc = {
                  ...doc,
                  id: clonedDocId,
                  orderId: orderData.id,
                  orderNumber: orderData.orderNumber || orderData.id,
                  url: `/api/documents/${clonedDocId}/download`,
                  createdAt: new Date().toISOString()
                };
                localStore.saveDocument(clonedDoc);
                try {
                  if (await checkDb()) {
                    const { orderNumber, ...cleanCloned } = clonedDoc;
                    await prisma.document.create({ data: cleanCloned as any });
                  }
                } catch { }
                return clonedDoc;
              } else {
                doc.orderId = orderData.id;
                doc.orderNumber = orderData.orderNumber || orderData.id;
                localStore.saveDocument(doc);
                return doc;
              }
            }
            return null;
          })
        );
        const validDocs = boundDocs.filter(Boolean);
        orderData.documents.push(...validDocs);

        try {
          if (await checkDb()) {
            await prisma.document.updateMany({
              where: { id: { in: validDocs.map((d: any) => d.id) } },
              data: { orderId: orderData.id }
            });
          }
        } catch { }
      }

      localStore.saveOrder(orderData);
      const processed = await processCustomerOrder(orderData);
      const finalBroadcastOrder = processed || orderData;

      // Unpaid checkout session: DO NOT broadcast to admin/workers until payment is verified
      return res.status(201).json({ success: true, order: finalBroadcastOrder });
    } catch (e: any) {
      console.error('Order creation error:', e);
      return res.status(500).json({ success: false, error: e.message || String(e) });
    }
  },

  getOrders: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const customerId = user.id;
      let rawOrders: any[] | null = null;

      try {
        if (await checkDb()) {
          rawOrders = await prisma.order.findMany({
            where: {
              AND: [
                {
                  OR: [
                    { customerId },
                    { userId: customerId },
                    ...(user.email ? [{ customer: { email: user.email } }] : [])
                  ]
                },
                { status: { not: 'PAYMENT_PENDING' } },
                {
                  OR: [
                    { paymentStatus: 'PAID' },
                    { status: { in: ['COMPLETED', 'WORK_COMPLETED', 'REFUNDED'] as any } }
                  ]
                }
              ]
            },
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  pricePaise: true,
                  workerAmountPaise: true
                }
              },
              job: {
                select: {
                  id: true,
                  status: true,
                  worker: { select: { id: true, name: true, phone: true } }
                }
              },
              documents: {
                select: {
                  id: true,
                  docName: true,
                  name: true,
                  fileName: true,
                  mimeType: true,
                  size: true,
                  url: true,
                  type: true
                }
              },
              payments: {
                select: {
                  id: true,
                  amountPaise: true,
                  status: true,
                  createdAt: true
                }
              },
              receipts: {
                select: {
                  id: true,
                  fileName: true,
                  status: true,
                  submittedAt: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          });
        }
      } catch (err: any) {
        console.warn('[getOrders DB Notice]:', err?.message);
      }

      if (rawOrders === null) {
        rawOrders = localStore.getOrders(customerId);
      }

      const orders = await Promise.all((rawOrders || []).map(processCustomerOrder));
      return res.json({ success: true, orders });
    } catch {
      return res.json({ success: true, orders: [] });
    }
  },

  getOrder: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const orderId = req.params.id as string;
      let rawOrder: any = null;

      try {
        if (await checkDb()) {
          rawOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              service: { include: { applicationTypesList: true } },
              customer: true,
              worker: true,
              documents: true,
              receipts: true,
              payments: true,
              job: { include: { worker: { select: { id: true, name: true, phone: true } } } }
            }
          });
        }
      } catch (err: any) {
        console.warn('[getOrder DB error]:', err?.message);
      }

      if (!rawOrder) {
        rawOrder = localStore.getOrder(orderId);
      }

      if (!rawOrder) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }

      // Security: Robust multi-tenant authorization
      const orderOwnerId = String(rawOrder.customerId || '').toLowerCase();
      const currentUserId = String(user.id || user.userId || '').toLowerCase();
      const orderEmail = String(rawOrder.customerEmail || rawOrder.customer?.email || '').toLowerCase();
      const userEmail = String(user.email || '').toLowerCase();

      const isOwner = Boolean(
        (orderOwnerId && orderOwnerId === currentUserId) ||
        (orderEmail && userEmail && orderEmail === userEmail)
      );
      const isAdmin = user.role === 'ADMIN';
      const isAssigned = Boolean(
        (rawOrder.assignedWorkerId && String(rawOrder.assignedWorkerId).toLowerCase() === currentUserId) ||
        (rawOrder.job?.workerId && String(rawOrder.job?.workerId).toLowerCase() === currentUserId)
      );

      if (!isAdmin && !isOwner && !isAssigned) {
        console.error('[Order Access Forbidden]:', {
          userRole: user.role,
          currentUserId,
          orderOwnerId,
          userEmail,
          orderEmail
        });
        return res.status(403).json({ success: false, error: { message: 'Unauthorized access to this order' } });
      }

      const order = await processCustomerOrder(rawOrder);
      return res.json({ success: true, order });
    } catch {
      return res.status(500).json({ success: false });
    }
  },

  acceptTimeSlot: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const orderId = req.params.id as string;
      let order = localStore.getOrder(orderId);

      try {
        if (await checkDb()) {
          const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
          if (dbOrder) order = dbOrder;
        }
      } catch { }

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      if (user.role !== 'ADMIN' && (!order.customerId || order.customerId !== user.id)) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const snapshot = (order.serviceSnapshot as any) || {};
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
        if (await checkDb()) {
          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: snapshot }
          });
        }
      } catch { }

      localStore.saveOrder(order);

      const targetWorkerId = order.assignedWorkerId;
      if (targetWorkerId) {
        localStore.notifications.unshift({
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
      }

      return res.json({ success: true, order: await processCustomerOrder(order) });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  rescheduleTimeSlot: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const orderId = req.params.id as string;
      const { rescheduleNote, requestedTime, requestedDate } = req.body;
      let order = localStore.getOrder(orderId);

      try {
        if (await checkDb()) {
          const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
          if (dbOrder) order = dbOrder;
        }
      } catch { }

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      if (user.role !== 'ADMIN' && (!order.customerId || order.customerId !== user.id)) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const snapshot = (order.serviceSnapshot as any) || {};
      const newSlotText = requestedTime
        ? `${requestedDate ? requestedDate + ', ' : ''}${requestedTime}`
        : snapshot.scheduling?.timeSlot || 'Reschedule Requested';

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
      order.updatedAt = new Date().toISOString();

      try {
        if (await checkDb()) {
          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: snapshot }
          });
        }
      } catch { }

      localStore.saveOrder(order);

      const targetWorkerId = order.assignedWorkerId;
      if (targetWorkerId) {
        localStore.notifications.unshift({
          id: `notif_${Date.now()}`,
          recipientId: targetWorkerId,
          recipientRole: 'WORKER',
          type: 'RESCHEDULE_REQUESTED',
          title: 'Customer Requested Reschedule',
          message: `Customer requested a reschedule to "${newSlotText}".`,
          orderId,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      return res.json({ success: true, order: await processCustomerOrder(order) });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  requestReschedule: async (req: Request, res: Response) => {
    try {
      const orderId = String(req.params.id);
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { proposedDate, proposedTimeSlot, requestedBy } = req.body;
      const effectiveRequester = requestedBy || (user.role === 'WORKER' ? 'WORKER' : 'CUSTOMER');

      if (!proposedTimeSlot) {
        return res.status(400).json({ success: false, error: 'proposedTimeSlot is required' });
      }

      const existing = localStore.getOrder(orderId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const updated = localStore.requestReschedule(orderId, user.id, {
        proposedDate: proposedDate || 'Today',
        proposedTimeSlot,
        requestedBy: effectiveRequester
      });

      try {
        if (await checkDb()) {
          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: updated.serviceSnapshot }
          });
        }
      } catch { }

      const processed = await processCustomerOrder(updated);
      return res.json({ success: true, order: processed, data: { order: processed } });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  respondReschedule: async (req: Request, res: Response) => {
    try {
      const orderId = String(req.params.id);
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { action } = req.body;
      if (!action || (action !== 'ACCEPT' && action !== 'REJECT')) {
        return res.status(400).json({ success: false, error: 'action must be ACCEPT or REJECT' });
      }

      const existing = localStore.getOrder(orderId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const updated = localStore.respondReschedule(orderId, user.id, { action });

      try {
        if (await checkDb()) {
          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: updated.serviceSnapshot }
          });
        }
      } catch { }

      const processed = await processCustomerOrder(updated);
      return res.json({ success: true, order: processed, data: { order: processed } });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  },

  submitReview: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const orderId = req.params.id as string;
      const { rating, comment, review, feedback_comment } = req.body;
      const reviewText = (comment || review || feedback_comment || '').trim();
      let order = localStore.getOrder(orderId);

      try {
        if (await checkDb()) {
          const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
          if (dbOrder) order = dbOrder;
        }
      } catch { }

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      if (user.role !== 'ADMIN' && (!order.customerId || order.customerId !== user.id)) {
        return res.status(403).json({ success: false, error: 'Unauthorized to review this order' });
      }

      if (order.status !== 'COMPLETED' && order.status !== 'RECEIPT_SUBMITTED' && order.status !== 'WORK_COMPLETED') {
        return res.status(400).json({ success: false, error: 'Only completed orders can be reviewed' });
      }

      if (order.status === 'RECEIPT_SUBMITTED') {
        localStore.releaseWorkerEarningOnReceiptAction(orderId, user.id);
        order = localStore.getOrder(orderId);
      }

      const existingSnapshot = (order.serviceSnapshot as any) || {};
      if (order.rating || existingSnapshot.review?.rating) {
        return res.status(400).json({ success: false, error: 'This order has already been reviewed' });
      }

      const ratingNum = Math.round(Number(rating));
      if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5 stars' });
      }

      order.rating = ratingNum;
      order.review = reviewText;

      const snapshot = (order.serviceSnapshot as any) || {};
      snapshot.review = {
        rating: ratingNum,
        comment: reviewText,
        createdAt: new Date().toISOString()
      };
      order.serviceSnapshot = snapshot;
      order.updatedAt = new Date().toISOString();

      try {
        if (await checkDb()) {
          const boundWorkerId = order.workerId || order.assignedWorkerId || null;
          await prisma.review.upsert({
            where: { orderId },
            create: {
              id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              orderId,
              customerId: order.customerId || user.id,
              workerId: boundWorkerId,
              serviceId: order.serviceId,
              rating: ratingNum,
              comment: reviewText
            },
            update: {
              rating: ratingNum,
              comment: reviewText
            }
          }).catch(() => null);

          await prisma.order.update({
            where: { id: orderId },
            data: { serviceSnapshot: snapshot }
          }).catch(() => null);
        }
      } catch { }

      if (order.assignedWorkerId || order.workerId) {
        const workerId = order.assignedWorkerId || order.workerId;
        const worker = localStore.getWorker(workerId);
        if (worker) {
          worker.reviews = worker.reviews || [];
          worker.reviews.unshift({
            id: `rev_${Date.now()}`,
            rating: ratingNum,
            comment: reviewText,
            createdAt: new Date().toISOString()
          });
          const totalStars = worker.reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 5), 0);
          worker.rating = Math.round((totalStars / worker.reviews.length) * 10) / 10;
        }
      }

      localStore.saveOrder(order);

      try {
        broadcastEvent('ORDER_FEEDBACK_SUBMITTED', {
          orderId,
          rating: ratingNum,
          comment: reviewText,
          feedback_at: new Date().toISOString()
        });
        broadcastEvent('ORDER_STATUS_UPDATED', {
          orderId,
          status: order.status,
          rating: ratingNum,
          review: reviewText
        });
      } catch { }

      return res.json({ success: true, order: await processCustomerOrder(order), review: snapshot.review });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  payOrder: async (req: Request, res: Response) => {
    // Disabled direct payment simulation to prevent payment bypass
    return res.status(400).json({
      success: false,
      error: 'Direct payment simulation is disabled. Payments must be processed through Razorpay endpoints.'
    });
  },

  downloadDeliverable: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const orderId = req.params.id as string;
      const deliverableId = req.params.deliverableId as string;

      let order = localStore.getOrder(orderId);
      if (!order) {
        try {
          if (await checkDb()) {
            order = await prisma.order.findUnique({
              where: { id: orderId },
              include: { documents: true, job: true }
            });
          }
        } catch { }
      }

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      // Security: Multi-tenant RBAC enforcement
      if (user.role === 'CUSTOMER') {
        if (!order.customerId || order.customerId !== user.id) {
          return res.status(403).json({ success: false, error: 'Unauthorized: You do not own this order' });
        }
      } else if (user.role === 'WORKER') {
        const assignedId = order.assignedWorkerId || order.job?.workerId;
        if (assignedId !== user.id) {
          return res.status(403).json({ success: false, error: 'Unauthorized: You are not assigned to this order' });
        }
      } else if (user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // Worker payout release ONLY when verified customer triggers download
      if (user.role === 'CUSTOMER' && order.assignedWorkerId && order.earningStatus !== 'RELEASED') {
        try {
          localStore.releaseWorkerEarningOnReceiptAction(orderId, user.id);
        } catch (releaseErr: any) {
          console.warn('[EarningRelease] Notice:', releaseErr.message);
        }
      }

      const deliverables = order.deliverables || (order.serviceSnapshot as any)?.completion?.deliverableFiles || [];
      let deliv = deliverables.find((d: any) =>
        d.id === deliverableId ||
        d.fileName === deliverableId ||
        d.storageKey === deliverableId
      );

      if (!deliv) {
        if (deliverableId === 'latest' || deliverableId === '0') {
          deliv = deliverables[0];
        } else {
          const idx = parseInt(deliverableId, 10);
          if (!isNaN(idx) && deliverables[idx]) {
            deliv = deliverables[idx];
          }
        }
      }

      const fileName = deliv?.fileName || deliv?.name || `Receipt_${orderId}.pdf`;
      const mimeType = deliv?.mimeType || 'application/pdf';

      if (deliv?.storageKey && fileBufferStore.has(deliv.storageKey)) {
        const cached = fileBufferStore.get(deliv.storageKey)!;
        res.setHeader('Content-Type', cached.mimeType || mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cached.fileName || fileName)}"`);
        return res.send(cached.buffer);
      }

      if (deliv?.storageKey) {
        try {
          const buffer = await storage.download(deliv.storageKey);
          if (buffer && buffer.length > 0) {
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            return res.send(buffer);
          }
        } catch (err: any) {
          console.warn('[STORAGE] Supabase download fallback:', err.message);
        }
      }

      const receiptBuf = generateOfficialReceiptBuffer(order, deliv);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)}"`);
      return res.send(receiptBuf);
    } catch (e: any) {
      console.error('[DownloadDeliverable] Error:', e);
      return res.status(500).json({ success: false, error: e.message || 'Download failed' });
    }
  },

  uploadOrderDocument: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      }

      const orderId = req.params.id as string;
      let order = localStore.getOrder(orderId);
      if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });

      const isOwner = Boolean(order.customerId && order.customerId === user.id);
      const isAdmin = user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'No document file provided' } });
      }

      const customerId = user.id;
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileKey = 'docs/' + customerId + '/' + Date.now() + '_' + safeName;
      fileBufferStore.set(fileKey, {
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        createdAt: Date.now()
      });

      const docId = 'doc_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
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
      localStore.saveDocument(doc);
      localStore.saveOrder(order);

      try {
        if (await checkDb()) {
          await prisma.document.create({ data: doc as any });
        }
      } catch { }

      return res.status(201).json({ success: true, data: { document: doc }, document: doc });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
    }
  },

  getOrderReceipt: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      }

      const orderId = req.params.id as string;
      let order = localStore.getOrder(orderId);
      if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });

      const isOwner = Boolean(order.customerId && order.customerId === user.id);
      const isAdmin = user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      }

      order.receiptViewedAt = new Date().toISOString();
      localStore.saveOrder(order);

      const deliverables = order.deliverables || (order.serviceSnapshot as any)?.completion?.deliverableFiles || [];
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
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
    }
  },

  downloadOrderReceipt: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      }

      const orderId = req.params.id as string;
      let order = localStore.getOrder(orderId);
      if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });

      const isOwner = Boolean(order.customerId && order.customerId === user.id);
      const isAdmin = user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      }

      order.receiptDownloadedAt = new Date().toISOString();

      if (order.assignedWorkerId && order.earningStatus !== 'RELEASED') {
        try {
          localStore.releaseWorkerEarningOnReceiptAction(orderId, user.id);
        } catch (releaseErr: any) {
          console.warn('[EarningRelease] Notice:', releaseErr.message);
        }
      }
      localStore.saveOrder(order);

      // Real-time Event: Notify customer & worker that order is COMPLETED
      if (order.customerId) {
        sendUserEvent(order.customerId, 'ORDER_STATUS_UPDATED', {
          orderId: order.id,
          status: 'COMPLETED'
        });
      }
      if (order.assignedWorkerId) {
        sendUserEvent(order.assignedWorkerId, 'ORDER_STATUS_UPDATED', {
          orderId: order.id,
          status: 'COMPLETED'
        });
      }

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
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
    }
  },

  createOrderComplaint: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      }

      const orderId = req.params.id as string;
      const { reason, description } = req.body;
      const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
      const trimmedDesc = typeof description === 'string' ? description.trim() : '';

      if (!trimmedReason || !trimmedDesc) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Reason and description are required' } });
      }

      let order = localStore.getOrder(orderId);
      if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });

      const isOwner = Boolean(order.customerId && order.customerId === user.id);
      const isAdmin = user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      }

      const complaintId = `cmp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();

      const complaint = {
        id: complaintId,
        orderId: order.id,
        customerId: user.id,
        workerId: order.assignedWorkerId || null,
        reason: trimmedReason,
        description: trimmedDesc,
        status: 'OPEN',
        createdAt: now
      };

      order.complaints = order.complaints || [];
      order.complaints.push(complaint);
      localStore.complaints.set(complaint.id, complaint as any);
      localStore.saveOrder(order);

      localStore.notifications.unshift({
        id: `notif_${Date.now()}_cmp`,
        recipientId: 'admin',
        recipientRole: 'ADMIN',
        type: 'COMPLAINT_CREATED',
        title: 'Customer Complaint Submitted',
        message: `A new complaint was submitted for Order #${order.id}: ${trimmedReason}`,
        orderId: order.id,
        isRead: false,
        createdAt: now
      });

      return res.status(201).json({
        success: true,
        data: { complaint },
        complaint,
        message: 'Complaint submitted successfully'
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
    }
  },

  createRazorpayPayment: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const orderId = (req.params.id || req.body.orderId || req.body.order_id) as string;
      if (!orderId) {
        return res.status(400).json({ success: false, error: { message: 'Order ID is required' } });
      }

      let order: any = null;
      try {
        if (await checkDb()) {
          order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true, service: true, payments: true }
          });
        }
      } catch (dbErr: any) {
        console.warn('[createRazorpayPayment DB Notice]:', dbErr?.message);
      }

      if (!order) {
        order = localStore.getOrder(orderId);
      }

      if (!order) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }

      // Security: Robust multi-tenant authorization
      const orderOwnerStr = String(order.customerId ?? '').toLowerCase();
      const userIdStr = String(user.id ?? user.userId ?? '').toLowerCase();
      const orderEmailStr = String(order.customerEmail ?? order.customer?.email ?? '').toLowerCase();
      const userEmailStr = String(user.email ?? '').toLowerCase();
      const isOwner = Boolean(
        (order.customerId && orderOwnerStr === userIdStr) ||
        (orderEmailStr && userEmailStr && orderEmailStr === userEmailStr)
      );

      if (user.role !== 'ADMIN' && !isOwner) {
        console.error('[Payment Auth] FORBIDDEN:', {
          userRole: user.role,
          userId: user.id,
          userIdStr,
          orderCustomerId: order.customerId,
          orderOwnerStr,
          orderEmailStr,
          userEmailStr
        });
        return res.status(403).json({ success: false, error: { message: 'Unauthorized access to this order' } });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(500).json({ success: false, error: { message: 'Payment gateway credentials are not configured' } });
      }

      // Security: Strict server price check
      const amountPaise = Number(
        order.customerPaidAmountPaise ||
        (order.pricing as any)?.pricePaise ||
        order.pricePaise ||
        order.customerPaidAmount ||
        (order.serviceSnapshot as any)?.pricePaise ||
        order.service?.pricePaise ||
        4900
      );
      if (!amountPaise || amountPaise <= 0) {
        return res.status(400).json({ success: false, error: { message: 'Invalid order amount' } });
      }

      const currency = 'INR';
      let razorpayOrderId = '';

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
          receipt: order.id,
          payment_capture: 1
        })
      });

      if (!rzpResponse.ok) {
        const errText = await rzpResponse.text();
        console.error('[Razorpay Order Creation Failed]:', errText);
        return res.status(502).json({ success: false, error: { message: 'Failed to communicate with Razorpay gateway' } });
      }

      const rzpData: any = await rzpResponse.json();
      razorpayOrderId = rzpData.id;

      order.payment = {
        provider: 'RAZORPAY',
        providerOrderId: razorpayOrderId,
        status: 'PENDING',
        amountPaise
      };
      localStore.saveOrder(order);

      // Pre-create / upsert Payment record in Supabase database so webhook finds it
      try {
        if (await checkDb()) {
          await prisma.payment.upsert({
            where: { providerOrderId: razorpayOrderId },
            create: {
              orderId: order.id,
              amountPaise,
              currency: 'INR',
              provider: 'RAZORPAY',
              providerOrderId: razorpayOrderId,
              status: 'PENDING'
            },
            update: {
              amountPaise,
              status: 'PENDING'
            }
          });
        }
      } catch (payDbErr: any) {
        console.warn('[Razorpay Payment DB Pre-create Notice]:', payDbErr?.message);
      }

      return res.json({
        success: true,
        razorpayOrderId,
        orderId: order.id,
        amount: amountPaise,
        currency,
        key: keyId
      });
    } catch (e: any) {
      console.error('createRazorpayPayment error:', e);
      return res.status(500).json({ success: false, error: e.message || String(e) });
    }
  },

  verifyRazorpayPayment: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, order_id } = req.body;
      const targetOrderId = (req.params.id || orderId || order_id) as string;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !targetOrderId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Missing required Razorpay verification payload' }
        });
      }

      let order: any = null;
      try {
        if (await checkDb()) {
          order = await prisma.order.findUnique({
            where: { id: targetOrderId },
            include: { customer: true, service: true, payments: true }
          });
        }
      } catch (dbErr: any) {
        console.warn('[verifyRazorpayPayment DB Notice]:', dbErr?.message);
      }

      if (!order) {
        order = localStore.getOrder(targetOrderId);
      }

      if (!order) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }

      // Security: Robust multi-tenant authorization
      const orderOwnerStr2 = String(order.customerId ?? '').toLowerCase();
      const userIdStr2 = String(user.id ?? user.userId ?? '').toLowerCase();
      const orderEmailStr2 = String(order.customerEmail ?? order.customer?.email ?? '').toLowerCase();
      const userEmailStr2 = String(user.email ?? '').toLowerCase();
      const isOwner2 = Boolean(
        (order.customerId && orderOwnerStr2 === userIdStr2) ||
        (orderEmailStr2 && userEmailStr2 && orderEmailStr2 === userEmailStr2)
      );

      if (user.role !== 'ADMIN' && !isOwner2) {
        console.error('[Payment Verify Auth] FORBIDDEN:', {
          userRole: user.role,
          userId: user.id,
          userIdStr2,
          orderCustomerId: order.customerId,
          orderOwnerStr2,
          orderEmailStr2,
          userEmailStr2
        });
        return res.status(403).json({ success: false, error: { message: 'Forbidden: You do not own this order' } });
      }

      if (order.paymentStatus === 'PAID') {
        return res.json({ success: true, verified: true, message: 'Payment already verified', order });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return res.status(500).json({ success: false, error: { message: 'Server payment configuration missing' } });
      }

      // Security Layer 1: Cryptographic HMAC-SHA256 signature verification with timing-safe comparison
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const signatureBuf = Buffer.from(razorpay_signature, 'utf8');

      let isMatch = false;
      if (expectedBuf.length === signatureBuf.length) {
        try {
          isMatch = crypto.timingSafeEqual(expectedBuf, signatureBuf);
        } catch {
          isMatch = false;
        }
      }

      // CRITICAL: Block execution if signature fails
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: { code: 'PAYMENT_VERIFICATION_FAILED', message: 'Invalid payment signature' }
        });
      }

      // Security Layer 2: Server-to-Server API verification with Razorpay API
      const keyId = process.env.RAZORPAY_KEY_ID;
      const expectedAmountPaise = Number(
        order.customerPaidAmountPaise ||
        (order.pricing as any)?.pricePaise ||
        order.pricePaise ||
        order.customerPaidAmount ||
        (order.serviceSnapshot as any)?.pricePaise ||
        order.service?.pricePaise ||
        4900
      );
      let verifiedAmount = expectedAmountPaise;

      if (keyId && keySecret && !razorpay_payment_id.startsWith('mock_') && !razorpay_payment_id.startsWith('test_')) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const rzpPaymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
            headers: { 'Authorization': authHeader }
          });
          if (rzpPaymentRes.ok) {
            const rzpPayment: any = await rzpPaymentRes.json();
            if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
              return res.status(400).json({
                success: false,
                error: { code: 'PAYMENT_NOT_CAPTURED', message: `Razorpay payment is not captured (status: ${rzpPayment.status})` }
              });
            }
            if (Number(rzpPayment.amount) !== expectedAmountPaise && expectedAmountPaise > 0) {
              console.warn(`[Razorpay Amount Warning]: Gateway (${rzpPayment.amount}) vs Expected (${expectedAmountPaise})`);
            }
            verifiedAmount = Number(rzpPayment.amount) || expectedAmountPaise;
          }
        } catch (apiErr: any) {
          console.warn('[Razorpay API Double-Check]: Failed to query Razorpay REST API, relying on valid HMAC signature:', apiErr?.message);
        }
      }

      const now = new Date();
      const nowIso = now.toISOString();
      order.status = 'AVAILABLE';
      order.paymentStatus = 'PAID';
      order.earningStatus = 'PENDING';
      order.assignedWorkerId = null;
      order.worker = null;
      order.job = null;
      order.paidAt = nowIso;
      order.payment = {
        status: 'PAID',
        provider: 'RAZORPAY',
        providerOrderId: razorpay_order_id,
        providerPaymentId: razorpay_payment_id,
        amountPaise: verifiedAmount,
        paidAt: nowIso
      };
      order.updatedAt = nowIso;

      // Security Layer 3: Row Lock & Unique providerPaymentId in Database Transaction
      try {
        if (await checkDb()) {
          await withDbRetry(() => prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'AVAILABLE',
                paymentStatus: 'PAID',
                earningStatus: 'PENDING',
                assignedWorkerId: null,
                paidAt: now
              }
            });

            await tx.payment.upsert({
              where: { providerOrderId: razorpay_order_id },
              create: {
                orderId: order.id,
                provider: 'RAZORPAY',
                providerOrderId: razorpay_order_id,
                providerPaymentId: razorpay_payment_id,
                amountPaise: verifiedAmount,
                currency: 'INR',
                status: 'PAID',
                signature: razorpay_signature,
                paidAt: now,
                verifiedAt: now
              },
              update: {
                providerPaymentId: razorpay_payment_id,
                status: 'PAID',
                signature: razorpay_signature,
                paidAt: now,
                verifiedAt: now
              }
            });
          }));
        }
      } catch (dbErr: any) {
        console.error('[Payment DB Update Error]:', dbErr?.message);
      }

      localStore.saveOrder(order);

      // Real-time notification across portals for genuine paid order
      broadcastEvent('ORDER_CREATED', { order, orderId: targetOrderId });
      broadcastEvent('ORDER_AVAILABLE', { order, orderId: targetOrderId });
      broadcastEvent('ORDER_STATUS_UPDATED', {
        orderId: targetOrderId,
        status: 'AVAILABLE',
        paymentStatus: 'PAID',
        timestamp: nowIso
      });

      localStore.appendLedgerEntry({
        orderId: order.id,
        amountPaise: order.customerPaidAmount || order.pricePaise,
        type: 'ORDER_PAYMENT',
        idempotencyKey: `PAYMENT_VERIFIED_${razorpay_payment_id}`,
        referenceNote: `Verified Razorpay payment ${razorpay_payment_id}`
      });

      localStore.addAuditLog({
        actorUserId: user.id,
        action: 'PAYMENT_VERIFIED',
        entityType: 'Order',
        entityId: order.id,
        amountPaise: order.customerPaidAmount || order.pricePaise
      });

      const onlineWorkers = localStore.getWorkers().filter(w => w.isOnline && w.accountStatus === 'ACTIVE');
      onlineWorkers.forEach(w => {
        localStore.notifications.unshift({
          id: `notif_${Date.now()}_${w.id}`,
          recipientId: w.id,
          recipientRole: 'WORKER',
          type: 'NEW_ORDER_AVAILABLE',
          title: 'New Order Available',
          message: `A new order for "${order.serviceName}" is available for pickup.`,
          orderId: order.id,
          isRead: false,
          createdAt: nowIso
        });
      });

      localStore.saveOrder(order);
      const processed = await processCustomerOrder(order);

      // Real-time Event: Broadcast to workers that new order is available
      broadcastEvent('ORDER_AVAILABLE', {
        order: processed || order,
        orderId: order.id,
        serviceName: order.serviceName,
        pricePaise: order.pricePaise,
        workerEarningsPaise: order.workerEarningsPaise || order.workerAmount,
        createdAt: now
      }, (c) => c.role === 'WORKER' || c.role === 'ADMIN');

      // Free Instant Worker Alert (Telegram Bot + Push) (Task 5.1)
      dispatchWorkerAlert({
        orderId: order.id,
        orderNumber: order.orderNumber,
        serviceName: order.serviceName,
        workerAmountPaise: order.workerAmountPaise || order.workerAmount || order.workerEarningsPaise || 0,
        workerId: order.assignedWorkerId || undefined
      }).catch(() => { });

      // Real-time Event: Notify customer that payment was verified
      if (order.customerId) {
        sendUserEvent(order.customerId, 'ORDER_STATUS_UPDATED', {
          orderId: order.id,
          status: 'AVAILABLE',
          paymentStatus: 'PAID'
        });
      }

      return res.json({ success: true, verified: true, order: processed });
    } catch (e: any) {
      console.error('verifyRazorpayPayment error:', e);
      return res.status(500).json({ success: false, error: e.message || String(e) });
    }
  }
};

export const walletController = {
  getWallet: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const customerId = user.id;
      let cancelledOrders: any[] = [];

      try {
        if (await checkDb()) {
          cancelledOrders = await prisma.order.findMany({
            where: { customerId, status: 'CANCELLED' },
            orderBy: { updatedAt: 'desc' }
          });
        }
      } catch { }

      if (!cancelledOrders || cancelledOrders.length === 0) {
        cancelledOrders = localStore.getOrders(customerId).filter(o => o.status === 'CANCELLED');
      }

      let balancePaise = 0;
      const transactions = cancelledOrders.map(order => {
        const amountPaise = (order.pricing as any)?.pricePaise || order.customerPaidAmount || 0;
        balancePaise += amountPaise;
        const snapshot = (order.serviceSnapshot as any) || {};
        return {
          id: 'TXN_' + order.id.slice(-6),
          orderId: order.id,
          serviceName: snapshot.name || 'Service Refund',
          amountPaise,
          type: 'REFUND',
          description: snapshot.expiry?.isExpired ? 'Automatic 24-Hour Expiry Refund' : 'Order Cancellation Refund',
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
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

export const notificationsController = {
  getNotifications: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const customerId = user.id;
      let orders: any[] = [];

      try {
        if (await checkDb()) {
          orders = await prisma.order.findMany({
            where: { customerId },
            include: { job: { include: { worker: { select: { name: true } } } } },
            orderBy: { updatedAt: 'desc' },
            take: 20
          });
        }
      } catch { }

      if (!orders || orders.length === 0) {
        orders = localStore.getOrders(customerId);
      }

      const notifications: any[] = [];

      orders.forEach(order => {
        const snapshot = (order.serviceSnapshot as any) || {};
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
        } else if (order.status === 'CANCELLED') {
          notifications.push({
            id: 'notif_exp_' + order.id,
            orderId: order.id,
            title: 'Order Expired / Refund Credited',
            message: `Order #${shortId} was cancelled/expired. ₹${(((order.pricing as any)?.pricePaise || order.customerPaidAmount || 0) / 100).toFixed(2)} refunded to your wallet.`,
            type: 'ALERT',
            createdAt: order.updatedAt
          });
        } else if (snapshot.scheduling?.status === 'PROPOSED') {
          notifications.push({
            id: 'notif_slot_' + order.id,
            orderId: order.id,
            title: 'Work Time Slot Proposed',
            message: `${workerName || 'Worker'} proposed a work time slot (${snapshot.scheduling?.timeSlot || 'Scheduled'}). Please confirm or reschedule.`,
            type: 'INFO',
            createdAt: order.updatedAt
          });
        } else if (order.status === 'ASSIGNED') {
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
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

export { documentController, validateMagicBytes } from './modules/vault';

export const systemController = {
  getAppVersion: async (req: Request, res: Response) => {
    try {
      const settings = localStore.getPlatformSettings();
      const latest_version = settings?.latest_version || '1.2.0';
      const min_required_version = settings?.min_required_version || '1.0.0';
      return res.json({
        success: true,
        data: {
          latest_version,
          min_required_version,
          current_version: '1.0.0'
        },
        latest_version,
        min_required_version,
        current_version: '1.0.0'
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

export const welfareController = {
  createTicket: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const { order_id, orderId, issue_type, issueType, description } = req.body;
      const targetOrderId = order_id || orderId;
      const targetIssueType = issue_type || issueType;

      if (!targetOrderId || !targetIssueType || !description) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Order ID, issue type, and description are required.' }
        });
      }

      const order = localStore.getOrder(targetOrderId);
      if (!order) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } });
      }

      if (user.role !== 'ADMIN' && (!order.customerId || order.customerId !== user.id)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      }

      const ticketId = `welf_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();

      const newCase: any = {
        id: ticketId,
        user_id: user.id,
        order_id: order.id,
        issue_type: targetIssueType,
        description: description.trim(),
        status: 'open',
        internal_notes: [],
        is_escalated: false,
        created_at: now,
        updated_at: now,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          serviceName: order.serviceName,
          amount: (order.pricePaise || 19900) / 100,
          status: order.status,
          workerId: order.assignedWorkerId || order.workerId
        }
      };

      const isRefundIssue = targetIssueType.toLowerCase().includes('refund') || targetIssueType.toLowerCase().includes('payment');
      if (isRefundIssue) {
        const orderAmount = order.pricePaise ? order.pricePaise / 100 : 199;
        const refundRec: any = {
          id: `ref_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          ticket_id: ticketId,
          order_id: order.id,
          amount: orderAmount,
          status: 'pending',
          utr_number: null,
          receipt_url: null,
          processed_by: null,
          created_at: now,
          updated_at: now
        };
        localStore.saveRefundRecord(refundRec);
        newCase.refundRecord = refundRec;
      }

      localStore.saveWelfareCase(newCase);

      localStore.notifications.unshift({
        id: `notif_${Date.now()}_welf`,
        recipientId: 'admin',
        recipientRole: 'ADMIN',
        type: 'WELFARE_TICKET_CREATED',
        title: 'New Customer Welfare Complaint',
        message: `New case on Order #${order.id}: ${targetIssueType}`,
        orderId: order.id,
        isRead: false,
        createdAt: now
      });

      return res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully.',
        ticket: newCase,
        data: newCase
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  getMyTickets: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const allCases = Array.from(localStore.welfareCases.values());
      const userCases = allCases.filter(c => c.user_id === user.id);

      const enriched = userCases.map(c => {
        const refund = localStore.getRefundRecordByTicketId(c.id);
        return {
          ...c,
          refundRecord: refund || c.refundRecord || null
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return res.json({ success: true, tickets: enriched, data: enriched });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  getTicketDetails: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const id = req.params.id as string;
      const c = localStore.getWelfareCase(id);
      if (!c) {
        return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      }

      const order = localStore.getOrder(c.order_id);
      const isOwner = c.user_id === user.id;
      const isAdmin = user.role === 'ADMIN';
      const isAssignedWorker = order && (order.assignedWorkerId === user.id || order.workerId === user.id);

      if (!isOwner && !isAdmin && !isAssignedWorker) {
        return res.status(403).json({ success: false, error: { message: 'Unauthorized ticket access' } });
      }

      const refund = localStore.getRefundRecordByTicketId(c.id);
      const enriched = { ...c, refundRecord: refund || c.refundRecord || null };
      return res.json({ success: true, ticket: enriched, data: enriched });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  getWorkerTickets: async (req: Request, res: Response) => {
    try {
      const worker = (req as any).user;
      if (!worker || worker.role !== 'WORKER') {
        return res.status(403).json({ success: false, error: { message: 'Worker access required' } });
      }

      const workerId = worker.id;
      const allCases = Array.from(localStore.welfareCases.values());

      const workerCases = allCases.filter(c => {
        const ord = localStore.getOrder(c.order_id);
        return ord && (ord.assignedWorkerId === workerId || ord.workerId === workerId);
      }).map(c => {
        const refund = localStore.getRefundRecordByTicketId(c.id);
        return {
          ...c,
          refundRecord: refund || c.refundRecord || null
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return res.json({ success: true, tickets: workerCases, data: workerCases });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  addWorkerNote: async (req: Request, res: Response) => {
    try {
      const worker = (req as any).user;
      if (!worker || worker.role !== 'WORKER') {
        return res.status(403).json({ success: false, error: { message: 'Worker access required' } });
      }

      const ticketId = req.params.id as string;
      const { note } = req.body;

      if (!note || !note.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Note content is required.' } });
      }

      const ticket = localStore.getWelfareCase(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      }

      const order = localStore.getOrder(ticket.order_id);
      if (!order || (order.assignedWorkerId !== worker.id && order.workerId !== worker.id)) {
        return res.status(403).json({ success: false, error: { message: 'You are not assigned to this case order' } });
      }

      const internalNote = {
        id: `note_${Date.now()}`,
        authorId: worker.id,
        authorName: worker.name || 'Worker Operator',
        role: 'WORKER',
        note: note.trim(),
        createdAt: new Date().toISOString()
      };

      ticket.internal_notes = ticket.internal_notes || [];
      ticket.internal_notes.push(internalNote);
      ticket.updated_at = new Date().toISOString();
      localStore.saveWelfareCase(ticket);

      return res.json({ success: true, message: 'Internal note appended.', ticket });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  escalateTicket: async (req: Request, res: Response) => {
    try {
      const worker = (req as any).user;
      if (!worker || worker.role !== 'WORKER') {
        return res.status(403).json({ success: false, error: { message: 'Worker access required' } });
      }

      const ticketId = req.params.id as string;
      const { reason } = req.body;

      const ticket = localStore.getWelfareCase(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      }

      const order = localStore.getOrder(ticket.order_id);
      if (!order || (order.assignedWorkerId !== worker.id && order.workerId !== worker.id)) {
        return res.status(403).json({ success: false, error: { message: 'You are not assigned to this case order' } });
      }

      ticket.is_escalated = true;
      ticket.status = 'in_review';
      ticket.updated_at = new Date().toISOString();

      if (reason) {
        ticket.internal_notes = ticket.internal_notes || [];
        ticket.internal_notes.push({
          id: `esc_${Date.now()}`,
          authorId: worker.id,
          authorName: worker.name || 'Worker',
          role: 'WORKER',
          note: `[ESCALATED TO ADMIN]: ${reason}`,
          createdAt: new Date().toISOString()
        });
      }

      localStore.saveWelfareCase(ticket);

      localStore.notifications.unshift({
        id: `notif_${Date.now()}_esc`,
        recipientId: 'admin',
        recipientRole: 'ADMIN',
        type: 'TICKET_ESCALATED',
        title: 'Ticket Escalated by Worker',
        message: `Worker escalated Case #${ticket.id} on Order #${ticket.order_id}`,
        orderId: ticket.order_id,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, message: 'Case successfully escalated to Admin.', ticket });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  getAdminTickets: async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
      }

      const { status, escalated } = req.query;
      let allCases = Array.from(localStore.welfareCases.values());

      if (status && status !== 'ALL') {
        allCases = allCases.filter(c => c.status.toLowerCase() === String(status).toLowerCase());
      }
      if (escalated === 'true') {
        allCases = allCases.filter(c => c.is_escalated);
      }

      const enriched = allCases.map(c => {
        const refund = localStore.getRefundRecordByTicketId(c.id);
        return {
          ...c,
          refundRecord: refund || c.refundRecord || null
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return res.json({ success: true, tickets: enriched, data: enriched });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  reviewAdminTicket: async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
      }

      const ticketId = req.params.id as string;
      const { status, resolutionNote } = req.body;
      const ticket = localStore.getWelfareCase(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      }

      if (status) {
        ticket.status = status;
      }
      if (resolutionNote) {
        ticket.internal_notes = ticket.internal_notes || [];
        ticket.internal_notes.push({
          id: `admin_rev_${Date.now()}`,
          authorId: admin.id || 'admin',
          authorName: admin.name || 'Administrator',
          role: 'ADMIN',
          note: `[ADMIN DECISION]: ${resolutionNote}`,
          createdAt: new Date().toISOString()
        });
      }
      ticket.updated_at = new Date().toISOString();
      localStore.saveWelfareCase(ticket);

      return res.json({ success: true, message: 'Ticket status updated.', ticket });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  },

  processAdminRefund: async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (!admin || admin.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Only administrators can process refunds.' }
        });
      }

      const ticketId = req.params.id as string;
      const { utr_number, utrNumber, receipt_url, receiptUrl, amount } = req.body;

      const ticket = localStore.getWelfareCase(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      }

      const order = localStore.getOrder(ticket.order_id);
      const resolvedAmount = Number(amount) || (order ? (order.pricePaise || 19900) / 100 : 199);
      const resolvedUtr = utr_number || utrNumber || `UTR${Date.now().toString().slice(-8)}`;

      let resolvedReceiptUrl = receipt_url || receiptUrl || null;
      if (req.file) {
        const fileId = `ref_receipt_${Date.now()}`;
        fileBufferStore.set(fileId, {
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          fileName: req.file.originalname,
          size: req.file.size,
          createdAt: Date.now()
        });
        resolvedReceiptUrl = `/api/documents/${fileId}/download`;
      }

      let refundRecord = localStore.getRefundRecordByTicketId(ticketId);
      const now = new Date().toISOString();

      if (!refundRecord) {
        refundRecord = {
          id: `ref_${Date.now()}`,
          ticket_id: ticketId,
          order_id: ticket.order_id,
          amount: resolvedAmount,
          status: 'processed',
          utr_number: resolvedUtr,
          receipt_url: resolvedReceiptUrl,
          processed_by: admin.id,
          created_at: now,
          updated_at: now
        };
      } else {
        refundRecord.status = 'processed';
        refundRecord.amount = resolvedAmount;
        refundRecord.utr_number = resolvedUtr;
        if (resolvedReceiptUrl) refundRecord.receipt_url = resolvedReceiptUrl;
        refundRecord.processed_by = admin.id;
        refundRecord.updated_at = now;
      }

      localStore.saveRefundRecord(refundRecord);

      ticket.status = 'refund_processed';
      ticket.updated_at = now;
      ticket.refundRecord = refundRecord;
      ticket.internal_notes = ticket.internal_notes || [];
      ticket.internal_notes.push({
        id: `ref_note_${Date.now()}`,
        authorId: admin.id,
        authorName: admin.name || 'Administrator',
        role: 'ADMIN',
        note: `Refund of ₹${resolvedAmount} PROCESSED. UTR: ${resolvedUtr}. Receipt: ${resolvedReceiptUrl || 'None'}`,
        createdAt: now
      });
      localStore.saveWelfareCase(ticket);

      if (order) {
        order.status = 'REFUNDED';
        order.refundInfo = {
          amount: resolvedAmount,
          utr_number: resolvedUtr,
          receipt_url: resolvedReceiptUrl,
          processed_at: now
        };
        localStore.saveOrder(order);
      }

      return res.json({
        success: true,
        message: 'Refund successfully processed and receipt recorded.',
        ticket,
        refundRecord
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }
};
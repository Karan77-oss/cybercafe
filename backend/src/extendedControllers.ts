import { Request, Response } from 'express';
import { SupabaseStorageAdapter } from './utils/SupabaseStorageAdapter';
import { localStore } from './catalogData';
import { prisma, checkDb } from './db';

const storage = new SupabaseStorageAdapter();

export const servicesController = {
  getServices: async (req: Request, res: Response) => {
    try {
      const dbOk = await checkDb();
      if (dbOk) {
        const services = await prisma.service.findMany({
          where: { status: 'ACTIVE', approvalStatus: 'APPROVED' },
          orderBy: { createdAt: 'desc' }
        });
        if (services && services.length > 0) {
          return res.json({ success: true, services });
        }
      }
    } catch {
      // Proceed to resilient fallback
    }
    return res.json({ success: true, services: localStore.getServices() });
  },

  getService: async (req: Request, res: Response) => {
    try {
      const dbOk = await checkDb();
      if (dbOk) {
        const service = await prisma.service.findUnique({
          where: { id: req.params.id as string, status: 'ACTIVE', approvalStatus: 'APPROVED' }
        });
        if (service) {
          return res.json({ success: true, service });
        }
      }
    } catch {
      // Proceed to resilient fallback
    }

    const fallback = localStore.getService(req.params.id as string);
    if (!fallback) {
      return res.status(404).json({ success: false, error: { message: 'Service not found' } });
    }
    return res.json({ success: true, service: fallback });
  }
};

export const workersController = {
  getAvailableWorkers: async (req: Request, res: Response) => {
    try {
      const dbOk = await checkDb();
      if (dbOk) {
        const workers = await prisma.user.findMany({
          where: { role: 'WORKER' },
          select: { id: true, name: true, email: true, phone: true }
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
                email: w.email,
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

    return res.json({ success: true, workers: localStore.getWorkers() });
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
      } catch {
        // Handled locally
      }

      // Update local store as well
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

  // Customer-facing rule: sanitize pricing (only return total pricePaise, hide internal commission/payout)
  const customerPricing = {
    pricePaise: (order.pricing as any)?.pricePaise || 0
  };

  const assignedWorker = order.job?.worker || (order.worker ? order.worker : null);
  const customerStatus = currentStatus === 'OFFERED' ? 'ASSIGNED' : currentStatus;

  return {
    ...order,
    status: customerStatus,
    pricing: customerPricing,
    serviceSnapshot: snapshot,
    worker: assignedWorker
  };
};

export const ordersController = {
  createOrder: async (req: Request, res: Response) => {
    try {
      const { serviceId, details, additionalInfo, workerSelection, documentIds, paymentMethod } = req.body;
      const customerId = (req as any).user?.id || 'customer-local-id';

      // Find service either in DB or local store
      let service: any = null;
      try {
        if (await checkDb()) {
          service = await prisma.service.findUnique({ where: { id: serviceId } });
        }
      } catch {}

      if (!service) {
        service = localStore.getService(serviceId);
      }

      if (!service) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SERVICE' } });
      }

      const pricePaise = service.pricePaise || 19900;
      const platformCommissionPaise = Math.floor(pricePaise * 0.2);
      const workerPayoutPaise = pricePaise - platformCommissionPaise;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Worker assignment logic (Section 8: Backend-controlled assignment)
      let selectedWorker: any = null;
      if (workerSelection?.mode === 'preferred' && workerSelection.preferredWorkerId) {
        const pref = localStore.getWorker(workerSelection.preferredWorkerId);
        if (pref && pref.isOnline && pref.accountStatus === 'ACTIVE') {
          selectedWorker = pref;
        } else {
          // Preferred is offline: do not wait -> move to another suitable Online worker
          selectedWorker = localStore.findBestSuitableWorker(service.category);
        }
      } else {
        // Auto-assign: lowest workload, tie -> faster average completion speed
        selectedWorker = localStore.findBestSuitableWorker(service.category);
      }

      const isPaid = !!paymentMethod;
      const initialStatus = isPaid ? (selectedWorker ? 'OFFERED' : 'AVAILABLE') : 'PAYMENT_PENDING';
      const offerExpiresAt = (isPaid && selectedWorker) ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null;

      const initialSnapshot = {
        name: service.name || service.title,
        category: service.category,
        pricePaise,
        formSchema: service.formSchema,
        details: details || {},
        additionalInfo: additionalInfo || '',
        workerSelection: workerSelection || { mode: 'auto' },
        expiresAt,
        scheduling: {
          status: 'PROPOSED',
          timeSlot: 'Today, 4:00 PM - 5:00 PM',
          rescheduleNote: null
        },
        completion: {
          referenceNumber: null,
          completionMessage: null,
          receiptUrl: null,
          deliverableFiles: []
        },
        review: null
      };

      const generatedOrderId = 'ord_' + Date.now();

      const orderData = {
        id: generatedOrderId,
        customerId,
        serviceId,
        serviceName: service.name || service.title,
        status: initialStatus,
        serviceSnapshot: initialSnapshot,
        pricing: { pricePaise, platformCommissionPaise, workerPayoutPaise },
        assignedWorkerId: selectedWorker ? selectedWorker.id : null,
        worker: selectedWorker ? { id: selectedWorker.id, name: selectedWorker.name, phone: selectedWorker.phone } : null,
        job: selectedWorker ? { worker: { id: selectedWorker.id, name: selectedWorker.name, phone: selectedWorker.phone } } : null,
        offerExpiresAt,
        documents: [],
        deliverables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Try database insert if connected
      try {
        if (await checkDb()) {
          const dbStatus = isPaid ? (selectedWorker ? 'ASSIGNED' : 'AVAILABLE') : 'PAYMENT_PENDING';
          const dbOrder = await prisma.order.create({
            data: {
              customerId,
              serviceId,
              status: dbStatus,
              serviceSnapshot: initialSnapshot,
              pricing: { pricePaise, platformCommissionPaise, workerPayoutPaise }
            }
          });
          if (isPaid && selectedWorker) {
            await prisma.job.create({
              data: {
                orderId: dbOrder.id,
                workerId: selectedWorker.id,
                status: 'ASSIGNED'
              }
            });
          }
          orderData.id = dbOrder.id;
        }
      } catch (err) {
        console.log('Database persist skipped, stored in resilient cache:', (err as any)?.message);
      }

      // Dispatch Section 8 notifications
      if (isPaid && selectedWorker) {
        localStore.notifications.unshift({
          id: `notif_${Date.now()}`,
          recipientId: selectedWorker.id,
          recipientRole: 'WORKER',
          type: 'NEW_ORDER_OFFER',
          title: 'New Order Offer (10-Min Window)',
          message: `You have received an order offer for "${service.name || service.title}". You have 10 minutes to accept.`,
          orderId: orderData.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      } else if (isPaid && !selectedWorker) {
        localStore.notifications.unshift({
          id: `notif_adm_${Date.now()}`,
          recipientId: 'ADM-001',
          recipientRole: 'ADMIN',
          type: 'NO_SUITABLE_WORKER',
          title: 'No Suitable Worker Available',
          message: `Order #${orderData.id} has no available online worker. Please manually assign a worker.`,
          orderId: orderData.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
        localStore.notifications.unshift({
          id: `notif_c_${Date.now()}`,
          recipientId: customerId,
          recipientRole: 'CUSTOMER',
          type: 'NO_WORKER_AVAILABLE',
          title: 'Looking for Available Operator',
          message: `All operators are currently engaged. We are searching for an available operator for your order.`,
          orderId: orderData.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      localStore.saveOrder(orderData);
      const processed = await processCustomerOrder(orderData);
      return res.json({ success: true, order: processed });
    } catch (e: any) {
      console.error('Order creation error:', e);
      return res.status(500).json({ success: false, error: e.message || String(e) });
    }
  },

  getOrders: async (req: Request, res: Response) => {
    try {
      const customerId = (req as any).user?.id || 'customer-local-id';
      let rawOrders: any[] = [];

      try {
        if (await checkDb()) {
          rawOrders = await prisma.order.findMany({
            where: { customerId },
            include: {
              job: { include: { worker: { select: { id: true, name: true, phone: true } } } }
            },
            orderBy: { createdAt: 'desc' }
          });
        }
      } catch {}

      if (!rawOrders || rawOrders.length === 0) {
        rawOrders = localStore.getOrders(customerId);
      }

      const orders = await Promise.all(rawOrders.map(processCustomerOrder));
      return res.json({ success: true, orders });
    } catch {
      return res.json({ success: true, orders: [] });
    }
  },

  getOrder: async (req: Request, res: Response) => {
    try {
      const customerId = (req as any).user?.id;
      const orderId = req.params.id as string;
      let rawOrder: any = null;

      try {
        if (await checkDb()) {
          rawOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              documents: true,
              job: { include: { worker: { select: { id: true, name: true, phone: true } } } }
            }
          });
        }
      } catch {}

      if (!rawOrder) {
        rawOrder = localStore.getOrder(orderId);
      }

      if (!rawOrder) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }

      const order = await processCustomerOrder(rawOrder);
      return res.json({ success: true, order });
    } catch {
      return res.status(500).json({ success: false });
    }
  },

  acceptTimeSlot: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      let order = localStore.getOrder(orderId);

      try {
        if (await checkDb()) {
          const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
          if (dbOrder) order = dbOrder;
        }
      } catch {}

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const snapshot = (order.serviceSnapshot as any) || {};
      snapshot.scheduling = {
        ...(snapshot.scheduling || {}),
        status: 'ACCEPTED',
        acceptedAt: new Date().toISOString()
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
      } catch {}

      localStore.saveOrder(order);
      return res.json({ success: true, order: await processCustomerOrder(order) });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  rescheduleTimeSlot: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const { rescheduleNote, requestedTime } = req.body;
      let order = localStore.getOrder(orderId);

      try {
        if (await checkDb()) {
          const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
          if (dbOrder) order = dbOrder;
        }
      } catch {}

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const snapshot = (order.serviceSnapshot as any) || {};
      snapshot.scheduling = {
        ...(snapshot.scheduling || {}),
        status: 'RESCHEDULE_REQUESTED',
        rescheduleNote: rescheduleNote || 'Customer requested mutual reschedule',
        requestedTime: requestedTime || null,
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
      } catch {}

      localStore.saveOrder(order);
      return res.json({ success: true, order: await processCustomerOrder(order) });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  submitReview: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const { rating, comment } = req.body;
      let order = localStore.getOrder(orderId);

      try {
        if (await checkDb()) {
          const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
          if (dbOrder) order = dbOrder;
        }
      } catch {}

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const ratingNum = Number(rating);
      if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5 stars' });
      }

      const snapshot = (order.serviceSnapshot as any) || {};
      snapshot.review = {
        rating: ratingNum,
        comment: comment || '',
        createdAt: new Date().toISOString()
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
      } catch {}

      localStore.saveOrder(order);
      return res.json({ success: true, order: await processCustomerOrder(order) });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

export const walletController = {
  getWallet: async (req: Request, res: Response) => {
    try {
      const customerId = (req as any).user?.id || 'customer-local-id';
      let cancelledOrders: any[] = [];

      try {
        if (await checkDb()) {
          cancelledOrders = await prisma.order.findMany({
            where: { customerId, status: 'CANCELLED' },
            orderBy: { updatedAt: 'desc' }
          });
        }
      } catch {}

      if (!cancelledOrders || cancelledOrders.length === 0) {
        cancelledOrders = localStore.getOrders(customerId).filter(o => o.status === 'CANCELLED');
      }

      let balancePaise = 0;
      const transactions = cancelledOrders.map(order => {
        const amountPaise = (order.pricing as any)?.pricePaise || 0;
        balancePaise += amountPaise;
        const snapshot = (order.serviceSnapshot as any) || {};
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
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

export const notificationsController = {
  getNotifications: async (req: Request, res: Response) => {
    try {
      const customerId = (req as any).user?.id || 'customer-local-id';
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
      } catch {}

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
            message: `Order #${shortId} was cancelled/expired. ₹${(((order.pricing as any)?.pricePaise || 0) / 100).toFixed(2)} refunded to your wallet.`,
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

export const documentController = {
  upload: async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
      const customerId = (req as any).user?.id || 'customer-local-id';
      const fileKey = 'docs/' + customerId + '/' + Date.now() + '_' + req.file.originalname;
      
      try {
        await storage.upload(fileKey, req.file.buffer, req.file.mimetype);
      } catch (storageErr) {
        console.log('Remote storage adapter upload skipped/failed:', (storageErr as any)?.message);
      }
      
      const doc = {
        id: 'doc_' + Date.now(),
        storageKey: fileKey,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        type: 'UPLOAD',
        customerId: customerId,
        orderId: req.body.orderId || null,
        createdAt: new Date().toISOString()
      };

      try {
        if (await checkDb()) {
          const dbDoc = await prisma.document.create({ data: doc as any });
          return res.json({ success: true, document: dbDoc });
        }
      } catch {}
      
      return res.json({ success: true, document: doc });
    } catch (e: any) { 
      return res.status(500).json({ success: false, error: e.message }); 
    }
  },

  getSignedUrl: async (req: Request, res: Response) => {
    try {
      const docId = req.params.id as string;
      return res.json({ success: true, url: `/api/documents/${docId}/download` });
    } catch { 
      return res.status(500).json({ success: false }); 
    }
  }
};

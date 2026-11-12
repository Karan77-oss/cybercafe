import { Request, Response } from 'express';
import crypto from 'crypto';
import { SupabaseStorageAdapter } from '../../utils/SupabaseStorageAdapter';
import { localStore } from '../../catalogData';
import { prisma, checkDb, withDbRetry } from '../../db';
import { fileBufferStore, generateOfficialReceiptBuffer } from '../../utils/fileStore';

export const storage = new SupabaseStorageAdapter();

/**
 * Zero-Trust Magic-Byte Validator for Customer & Vault Documents
 * Permits ONLY application/pdf, image/jpeg, image/png, and image/webp.
 * Rejects executables, scripts, HTML, and SVG immediately.
 */
export function validateMagicBytes(buffer: Buffer): { isValid: boolean; mime: string; ext: string } {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, mime: '', ext: '' };
  }

  // Reject Windows executables (MZ)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isValid: false, mime: '', ext: '' };
  }

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { isValid: true, mime: 'application/pdf', ext: 'pdf' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { isValid: true, mime: 'image/png', ext: 'png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, mime: 'image/jpeg', ext: 'jpg' };
  }

  // WEBP: RIFF + WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { isValid: true, mime: 'image/webp', ext: 'webp' };
  }

  return { isValid: false, mime: '', ext: '' };
}

export const documentController = {
  upload: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
      const customerId = user.id;

      // Zero-Trust Magic-Byte Validation
      const validation = validateMagicBytes(req.file.buffer);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_FILE_SIGNATURE',
          error: 'Security verification failed: Only authentic PDF, JPEG, PNG, and WebP files are permitted.'
        });
      }

      // Randomize storage object key using UUIDv4: vault/${userId}/${uuidv4()}.${ext}
      const randomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      const fileKey = `vault/${customerId}/${randomId}.${validation.ext}`;

      fileBufferStore.set(fileKey, {
        buffer: req.file.buffer,
        mimeType: validation.mime,
        fileName: req.file.originalname,
        createdAt: Date.now()
      });

      try {
        await storage.upload(fileKey, req.file.buffer, validation.mime);
      } catch (storageErr: any) {
        console.log('Remote storage adapter upload skipped/failed:', storageErr?.message);
      }

      const docId = 'doc_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
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
        mimeType: validation.mime,
        size: req.file.size,
        type: 'UPLOAD',
        customerId,
        orderId: req.body.orderId || null,
        createdAt: new Date().toISOString()
      };

      localStore.saveDocument(doc);

      try {
        if (await checkDb()) {
          const dbDoc = await prisma.document.create({ data: doc as any });
          localStore.saveDocument(dbDoc);
          return res.json({ success: true, document: dbDoc });
        }
      } catch (dbErr: any) {
        console.log('[Storage] DB save skipped, kept in resilient store:', dbErr?.message);
      }

      return res.json({ success: true, document: doc });
    } catch (e: any) {
      console.error('[Storage] Upload error:', e);
      return res.status(500).json({ success: false, error: e.message || 'Upload failed' });
    }
  },

  getSignedUrl: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const docId = req.params.id as string;
      let doc = localStore.getDocument(docId);
      if (!doc) {
        try {
          if (await checkDb()) {
            doc = await prisma.document.findUnique({ where: { id: docId } });
            if (doc) localStore.saveDocument(doc);
          }
        } catch { }
      }

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      const userRole = (user.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        // Full access
      } else if (userRole === 'CUSTOMER') {
        if (!doc.customerId || (doc.customerId !== user.id && (doc as any).userId !== user.id)) {
          return res.status(403).json({ success: false, error: 'Unauthorized document access' });
        }
      } else if (userRole === 'WORKER') {
        if (!doc.orderId) {
          return res.status(403).json({ success: false, error: 'Unauthorized document access' });
        }
        let order = localStore.getOrder(doc.orderId);
        if (!order) {
          try {
            if (await checkDb()) {
              order = await prisma.order.findUnique({ where: { id: doc.orderId } });
            }
          } catch { }
        }
        const assignedId = order?.assignedWorkerId || (order as any)?.workerId;
        if (assignedId !== user.id) {
          return res.status(403).json({ success: false, error: 'Unauthorized document access' });
        }
        const activeStatuses = ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'];
        if (!activeStatuses.includes(order?.status || '')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'DOCUMENT_ACCESS_RESTRICTED',
              message: 'Worker access to customer documents is only permitted while order is actively ACCEPTED, IN_PROGRESS, or CORRECTION_REQUIRED.'
            }
          });
        }
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      res.setHeader('Cache-Control', 'private, no-store');

      let signedUrl = doc.url || `/api/documents/${docId}/download`;
      if (doc.storageKey) {
        try {
          signedUrl = await storage.createSignedUrl(doc.storageKey, 300);
        } catch { }
      }

      const watermark = userRole === 'WORKER' ? {
        text: `For Sarkari Portal Processing Only - Worker ID: ${user.id} - Order #${doc.orderId || 'N/A'}`,
        workerId: user.id,
        orderId: doc.orderId || 'N/A',
        timestamp: new Date().toISOString()
      } : undefined;

      return res.json({
        success: true,
        url: `/api/documents/${docId}/download`,
        signedUrl,
        document: doc,
        watermark
      });
    } catch {
      return res.status(500).json({ success: false });
    }
  },

  download: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const docId = req.params.id as string;
      let doc = localStore.getDocument(docId);
      if (!doc) {
        try {
          if (await checkDb()) {
            doc = await prisma.document.findUnique({ where: { id: docId } });
            if (doc) localStore.saveDocument(doc);
          }
        } catch { }
      }

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      const userRole = (user.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        // Full access
      } else if (userRole === 'CUSTOMER') {
        if (!doc.customerId || (doc.customerId !== user.id && (doc as any).userId !== user.id)) {
          return res.status(403).json({ success: false, error: 'Unauthorized document access' });
        }
      } else if (userRole === 'WORKER') {
        if (!doc.orderId) {
          return res.status(403).json({ success: false, error: 'Unauthorized document access' });
        }
        let order = localStore.getOrder(doc.orderId);
        if (!order) {
          try {
            if (await checkDb()) {
              order = await prisma.order.findUnique({ where: { id: doc.orderId } });
            }
          } catch { }
        }
        const assignedId = order?.assignedWorkerId || (order as any)?.workerId;
        if (assignedId !== user.id) {
          return res.status(403).json({ success: false, error: 'Unauthorized document access' });
        }
        const activeStatuses = ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'];
        if (!activeStatuses.includes(order?.status || '')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'DOCUMENT_ACCESS_RESTRICTED',
              message: 'Worker access to customer documents is only permitted while order is actively ACCEPTED, IN_PROGRESS, or CORRECTION_REQUIRED.'
            }
          });
        }
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      res.setHeader('Cache-Control', 'private, no-store');

      const fileName = doc.fileName || doc.name || 'document.pdf';
      const mimeType = doc.mimeType || 'application/octet-stream';

      if (doc.storageKey && fileBufferStore.has(doc.storageKey)) {
        const cached = fileBufferStore.get(doc.storageKey)!;
        res.setHeader('Content-Type', cached.mimeType || mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cached.fileName || fileName)}"`);
        return res.send(cached.buffer);
      }

      if (doc.storageKey) {
        try {
          const buffer = await storage.download(doc.storageKey);
          if (buffer && buffer.length > 0) {
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            return res.send(buffer);
          }
        } catch (err: any) {
          console.warn('[STORAGE] Document download fallback:', err.message);
        }
      }

      const fallbackBuf = generateOfficialReceiptBuffer({ id: doc.orderId || 'DOC-01' }, { name: fileName });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      return res.send(fallbackBuf);
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Download failed' });
    }
  },

  streamFile: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const rawKey = req.params[0] || (req.params as any).key || req.params.id;
      const key = decodeURIComponent(rawKey);

      // Directory traversal defense
      if (key.includes('..') || key.includes('\\')) {
        return res.status(400).json({ success: false, error: 'Invalid key path' });
      }

      // Zero-Trust Authorization Guard on stream
      const userRole = (user.role || '').toUpperCase();
      if (userRole !== 'ADMIN') {
        let doc = Array.from(localStore.documents.values()).find((d: any) => d.storageKey === key);
        if (!doc) {
          try {
            if (await checkDb()) {
              doc = await prisma.document.findFirst({ where: { storageKey: key } });
            }
          } catch { }
        }

        if (doc) {
          if (userRole === 'CUSTOMER' && doc.customerId !== user.id && (doc as any).userId !== user.id) {
            return res.status(403).json({ success: false, error: 'Unauthorized file stream' });
          }
          if (userRole === 'WORKER') {
            if (!doc.orderId) {
              return res.status(403).json({ success: false, error: 'Unauthorized file stream' });
            }
            let order = localStore.getOrder(doc.orderId);
            if (!order) {
              try {
                if (await checkDb()) {
                  order = await prisma.order.findUnique({ where: { id: doc.orderId } });
                }
              } catch { }
            }
            const assignedId = order?.assignedWorkerId || (order as any)?.workerId;
            if (assignedId !== user.id) {
              return res.status(403).json({ success: false, error: 'Unauthorized file stream' });
            }
            const activeStatuses = ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'];
            if (!activeStatuses.includes(order?.status || '')) {
              return res.status(403).json({
                success: false,
                error: {
                  code: 'DOCUMENT_ACCESS_RESTRICTED',
                  message: 'Worker access to customer documents is only permitted while order is actively ACCEPTED, IN_PROGRESS, or CORRECTION_REQUIRED.'
                }
              });
            }
          }
        } else if (key.startsWith('vault/') || key.startsWith('docs/')) {
          const pathOwnerId = key.split('/')[1];
          if (userRole === 'CUSTOMER' && pathOwnerId !== user.id) {
            return res.status(403).json({ success: false, error: 'Unauthorized file stream' });
          }
        }
      }

      res.setHeader('Cache-Control', 'private, no-store');

      if (fileBufferStore.has(key)) {
        const cached = fileBufferStore.get(key)!;
        const isImage = (cached.mimeType || '').startsWith('image/');
        res.setHeader('Content-Type', cached.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `${isImage ? 'inline' : 'attachment'}; filename="${encodeURIComponent(cached.fileName || 'file')}"`);
        return res.send(cached.buffer);
      }

      try {
        const buffer = await storage.download(key);
        if (buffer && buffer.length > 0) {
          const isImage = key.endsWith('.jpg') || key.endsWith('.jpeg') || key.endsWith('.png') || key.endsWith('.webp');
          const mimeType = isImage ? 'image/jpeg' : 'application/octet-stream';
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Disposition', `${isImage ? 'inline' : 'attachment'}; filename="${encodeURIComponent(key.split('/').pop() || 'file')}"`);
          return res.send(buffer);
        }
      } catch { }

      return res.status(404).json({ success: false, error: 'File not found' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },

  getVaultDocuments: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }

      const customerId = user.id;
      let docs: any[] = [];
      try {
        if (await checkDb()) {
          docs = await prisma.document.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' }
          });
        }
      } catch { }

      if (!docs || docs.length === 0) {
        docs = localStore.getDocumentsByCustomerId(customerId);
      }
      return res.json({ success: true, documents: docs });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Failed to fetch vault documents' });
    }
  },

  uploadVaultDocument: async (req: Request, res: Response) => {
    return documentController.upload(req, res);
  },

  presignUpload: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { fileName, mimeType, orderId } = req.body;
      if (!fileName) {
        return res.status(400).json({ success: false, error: 'fileName is required' });
      }

      const cleanFileName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const randomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      const ext = cleanFileName.split('.').pop() || 'bin';
      const storageKey = `vault/${user.id}/${randomId}.${ext}`;

      const { signedUrl, token } = await storage.createSignedUploadUrl(storageKey);

      return res.json({
        success: true,
        uploadUrl: signedUrl,
        storageKey,
        token,
        fileName: cleanFileName,
        mimeType: mimeType || 'application/octet-stream',
        customerId: user.id,
        orderId: orderId || null
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Failed to generate presigned upload URL' });
    }
  },

  confirmUpload: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { storageKey, fileName, mimeType, size, docName, orderId } = req.body;
      if (!storageKey) {
        return res.status(400).json({ success: false, error: 'storageKey is required' });
      }

      // Check ownership
      const pathOwnerId = storageKey.split('/')[1];
      if (user.role !== 'ADMIN' && pathOwnerId && pathOwnerId !== user.id) {
        return res.status(403).json({ success: false, error: 'Forbidden: Invalid storage key ownership' });
      }

      const docId = 'doc_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      const displayName = docName ? `${docName} (${fileName || 'Document'})` : (fileName || 'Uploaded Document');

      const doc = {
        id: docId,
        storageKey,
        docName: docName || null,
        name: displayName,
        fileName: fileName || 'document.pdf',
        url: `/api/documents/${docId}/download`,
        mimeType: mimeType || 'application/octet-stream',
        size: Number(size || 0),
        type: 'UPLOAD',
        customerId: user.id,
        orderId: orderId || null,
        isWorkingCopy: true,
        createdAt: new Date().toISOString()
      };

      localStore.saveDocument(doc);

      try {
        if (await checkDb()) {
          const dbDoc = await withDbRetry(() => prisma.document.create({ data: doc as any }));
          localStore.saveDocument(dbDoc);
          return res.json({ success: true, document: dbDoc });
        }
      } catch (dbErr: any) {
        console.warn('[Storage] DB save error in confirmUpload:', dbErr?.message);
      }

      return res.json({ success: true, document: doc });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Failed to confirm upload' });
    }
  }
};

export default documentController;

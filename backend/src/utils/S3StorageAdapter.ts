import { StorageProvider } from './StorageProvider';
import { fileBufferStore } from './fileStore';

// ==========================================
// S3 / MinIO STORAGE ADAPTER
// ==========================================
// Required env vars (Cloud mode):
// STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_REGION

export class S3StorageAdapter implements StorageProvider {
  private client: any = null;
  private s3Commands: any = null;
  private bucket: string;
  private endpoint?: string;
  private region: string;
  private isCloudActive: boolean = false;

  constructor() {
    this.bucket = process.env.STORAGE_BUCKET || process.env.AWS_S3_BUCKET || 'cybercafe-docs';
    this.endpoint = process.env.STORAGE_ENDPOINT; // e.g., 'http://localhost:9000' for MinIO
    this.region = process.env.STORAGE_REGION || process.env.AWS_REGION || 'ap-south-1';

    const accessKeyId = process.env.STORAGE_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    // Dynamically initialize AWS S3 Client if SDK is present and credentials exist
    if (accessKeyId && secretAccessKey) {
      try {
        // Safe optional loading to prevent crashing if @aws-sdk is not installed in package.json
        const s3Module = require('@aws-sdk/client-s3');
        const presignerModule = require('@aws-sdk/s3-request-presigner');

        this.client = new s3Module.S3Client({
          region: this.region,
          endpoint: this.endpoint || undefined,
          forcePathStyle: Boolean(this.endpoint), // Mandatory for MinIO / local S3
          credentials: {
            accessKeyId,
            secretAccessKey
          }
        });

        this.s3Commands = {
          PutObjectCommand: s3Module.PutObjectCommand,
          GetObjectCommand: s3Module.GetObjectCommand,
          DeleteObjectCommand: s3Module.DeleteObjectCommand,
          getSignedUrl: presignerModule.getSignedUrl
        };

        this.isCloudActive = true;
        console.log(`[STORAGE ADAPTER] S3/MinIO cloud client active for bucket: "${this.bucket}"`);
      } catch {
        console.warn('[STORAGE ADAPTER] @aws-sdk/client-s3 not detected. Operating in resilient in-memory fallback mode.');
        this.isCloudActive = false;
      }
    } else {
      console.log('[STORAGE ADAPTER] Cloud credentials not found. Using local in-memory storage fallback.');
      this.isCloudActive = false;
    }
  }

  /**
   * Check if real S3/MinIO storage is enabled and ready
   */
  public isConfigured(): boolean {
    return this.isCloudActive && this.client !== null;
  }

  /**
   * Uploads file buffer to S3 or stores in local memory fallback
   */
  async upload(key: string, file: Buffer, mimeType: string): Promise<string> {
    if (!key) throw new Error('File key is required for upload');
    if (!file) throw new Error('File buffer is required for upload');

    // 1. Upload to S3 / MinIO if cloud is active
    if (this.isConfigured()) {
      try {
        const command = new this.s3Commands.PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: mimeType || 'application/octet-stream'
        });

        await this.client.send(command);

        const cloudUrl = this.endpoint
          ? `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`
          : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

        return cloudUrl;
      } catch (err: any) {
        console.error(`[STORAGE ADAPTER] S3 Upload failed for "${key}", saving to local fallback:`, err.message);
      }
    }

    // 2. Resilient In-Memory Fallback (Guarantees no data loss in local/dev)
    fileBufferStore.set(key, {
      buffer: file,
      mimeType: mimeType || 'application/octet-stream',
      fileName: key.split('/').pop() || 'file.pdf',
      createdAt: Date.now()
    });

    return `/api/documents/stream/${encodeURIComponent(key)}`;
  }

  /**
   * Downloads file buffer from S3 or local memory fallback
   */
  async download(key: string): Promise<Buffer> {
    if (!key) throw new Error('File key is required for download');

    // 1. Download from S3 if configured
    if (this.isConfigured()) {
      try {
        const command = new this.s3Commands.GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        });

        const response = await this.client.send(command);
        if (response.Body) {
          // In AWS SDK v3, Body can be converted to byte array / stream
          if (typeof response.Body.transformToByteArray === 'function') {
            const byteArray = await response.Body.transformToByteArray();
            return Buffer.from(byteArray);
          }
          return await streamToBuffer(response.Body);
        }
      } catch (err: any) {
        console.warn(`[STORAGE ADAPTER] S3 fetch failed for key "${key}", checking local fallback:`, err.message);
      }
    }

    // 2. Fallback to in-memory buffer store
    const localFile = fileBufferStore.get(key);
    if (localFile && localFile.buffer) {
      return localFile.buffer;
    }

    throw new Error(`File not found in storage: ${key}`);
  }

  /**
   * Deletes file from S3 and local memory fallback
   */
  async delete(key: string): Promise<void> {
    if (!key) return;

    if (this.isConfigured()) {
      try {
        const command = new this.s3Commands.DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key
        });
        await this.client.send(command);
      } catch (err: any) {
        console.warn(`[STORAGE ADAPTER] S3 delete failed for key "${key}":`, err.message);
      }
    }

    fileBufferStore.delete(key);
  }

  /**
   * Generates a presigned URL or falls back to local stream route
   */
  async createSignedUrl(key: string, expiresInSecs: number = 300): Promise<string> {
    if (!key) return '';

    if (this.isConfigured()) {
      try {
        const command = new this.s3Commands.GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        });

        return await this.s3Commands.getSignedUrl(this.client, command, {
          expiresIn: expiresInSecs
        });
      } catch (err: any) {
        console.warn('[STORAGE ADAPTER] Presigned URL generation failed, falling back to stream URL:', err.message);
      }
    }

    return `/api/documents/stream/${encodeURIComponent(key)}`;
  }
}

// ==========================================
// HELPER: STREAM TO BUFFER CONVERTER
// ==========================================
function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
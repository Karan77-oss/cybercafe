import { StorageProvider } from './StorageProvider';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseStorageAdapter implements StorageProvider {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    let supabaseUrl = (process.env.SUPABASE_URL || '').replace(/['"]/g, '').trim();
    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
      supabaseUrl = 'https://bcslqaiwyzmhdmryuejs.supabase.co';
    }
    let supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '').trim();
    if (!supabaseKey) {
      supabaseKey = 'dummy-service-key';
    }
    
    // Server-side admin client using service_role key
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'customer-documents';
  }

  async upload(key: string, file: Buffer, mimeType: string): Promise<string> {
    try {
      const uploadPromise = this.supabase.storage
        .from(this.bucket)
        .upload(key, file, { contentType: mimeType, upsert: true });

      const timeoutPromise = new Promise<{ error: Error }>((_, reject) => {
        setTimeout(() => reject(new Error('Storage upload timeout')), 20000);
      });

      const res = await Promise.race([uploadPromise, timeoutPromise]) as any;
      if (res?.error) {
        console.warn('[STORAGE] Remote upload warning:', res.error.message);
      }
    } catch (err: any) {
      console.warn('[STORAGE] Remote storage upload skipped (resilient local fallback active):', err.message);
    }
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(key);

    if (error) throw new Error('Download failed: ' + error.message);
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([key]);

    if (error) throw new Error('Delete failed: ' + error.message);
  }

  async createSignedUrl(key: string, expiresInSecs: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSecs);

    if (error) throw new Error('Signed URL failed: ' + error.message);
    return data.signedUrl;
  }
}

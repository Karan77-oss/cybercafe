import { StorageProvider } from './StorageProvider';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export class SupabaseStorageAdapter implements StorageProvider {
  private supabase: SupabaseClient | null = null;
  private bucket: string;
  private localUploadDir: string;

  constructor() {
    let supabaseUrl = (process.env.SUPABASE_URL || '').replace(/['"]/g, '').trim();
    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
      supabaseUrl = 'https://bcslqaiwyzmhdmryuejs.supabase.co';
    }

    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ''
    ).replace(/['"]/g, '').trim();

    this.bucket = (process.env.SUPABASE_STORAGE_BUCKET || 'customer-documents')
      .replace(/['"]/g, '')
      .trim();
    this.localUploadDir = path.join(process.cwd(), 'uploads', this.bucket);

    // Dummy key se fake network request bhejne ke bajaye, valid key hone par hi client banayein
    if (supabaseKey && supabaseKey !== 'dummy-service-key') {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('[STORAGE] Valid SUPABASE_SERVICE_ROLE_KEY not found, using local disk fallback.');
    }
  }

  private getLocalFilePath(key: string): string {
    const safeKey = key.replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.localUploadDir, safeKey);
  }

  async upload(key: string, file: Buffer, mimeType: string): Promise<string> {
    if (this.supabase) {
      let timeoutId: NodeJS.Timeout | undefined;
      try {
        const uploadPromise = this.supabase.storage
          .from(this.bucket)
          .upload(key, file, { contentType: mimeType, upsert: true });

        const timeoutPromise = new Promise<{ error: Error }>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Storage upload timeout')), 20000);
        });

        const res = (await Promise.race([uploadPromise, timeoutPromise])) as any;
        if (timeoutId) clearTimeout(timeoutId);

        if (!res?.error) {
          return key; // Remote Supabase upload successful
        }
        console.warn('[STORAGE] Remote upload warning:', res.error.message);
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn('[STORAGE] Remote storage upload skipped (resilient local fallback active):', err.message);
      }
    }

    // Actual Local Fallback: File ko local 'uploads/customer-documents' folder me save karega
    const localPath = this.getLocalFilePath(key);
    await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
    await fs.promises.writeFile(localPath, file);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    if (this.supabase) {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .download(key);

      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      console.warn('[STORAGE] Remote download failed, checking local fallback:', error?.message);
    }

    const localPath = this.getLocalFilePath(key);
    if (fs.existsSync(localPath)) {
      return await fs.promises.readFile(localPath);
    }

    throw new Error(`Download failed: File not found in remote or local storage for key "${key}"`);
  }

  async delete(key: string): Promise<void> {
    let remoteError: any = null;

    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([key]);
      if (error) remoteError = error;
    }

    const localPath = this.getLocalFilePath(key);
    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath);
      return;
    }

    if (remoteError) {
      throw new Error('Delete failed: ' + remoteError.message);
    }
  }

  async createSignedUrl(key: string, expiresInSecs: number = 300): Promise<string> {
    if (this.supabase) {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(key, expiresInSecs);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
      console.warn('[STORAGE] Remote signed URL failed, using local fallback URL:', error?.message);
    }

    const localPath = this.getLocalFilePath(key);
    if (fs.existsSync(localPath)) {
      return `/uploads/${this.bucket}/${key}`;
    }

    throw new Error(`Signed URL failed: File not found for key "${key}"`);
  }

  async createSignedUploadUrl(key: string): Promise<{ signedUrl: string; token: string; path: string }> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.storage
          .from(this.bucket)
          .createSignedUploadUrl(key);

        if (!error && data?.signedUrl) {
          return { signedUrl: data.signedUrl, token: data.token, path: data.path };
        }
        console.warn('[STORAGE] Remote createSignedUploadUrl warning:', error?.message);
      } catch (err: any) {
        console.warn('[STORAGE] Remote createSignedUploadUrl error:', err?.message);
      }
    }

    return {
      signedUrl: `/api/documents/upload`,
      token: 'local-fallback',
      path: key
    };
  }
}
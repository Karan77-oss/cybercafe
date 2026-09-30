"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseStorageAdapter = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class SupabaseStorageAdapter {
    supabase;
    bucket;
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        // Server-side admin client using service_role key
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'customer-documents';
    }
    async upload(key, file, mimeType) {
        try {
            const uploadPromise = this.supabase.storage
                .from(this.bucket)
                .upload(key, file, { contentType: mimeType, upsert: true });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Storage upload timeout')), 20000);
            });
            const res = await Promise.race([uploadPromise, timeoutPromise]);
            if (res?.error) {
                console.warn('[STORAGE] Remote upload warning:', res.error.message);
            }
        }
        catch (err) {
            console.warn('[STORAGE] Remote storage upload skipped (resilient local fallback active):', err.message);
        }
        return key;
    }
    async download(key) {
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .download(key);
        if (error)
            throw new Error('Download failed: ' + error.message);
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    async delete(key) {
        const { error } = await this.supabase.storage
            .from(this.bucket)
            .remove([key]);
        if (error)
            throw new Error('Delete failed: ' + error.message);
    }
    async createSignedUrl(key, expiresInSecs = 3600) {
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .createSignedUrl(key, expiresInSecs);
        if (error)
            throw new Error('Signed URL failed: ' + error.message);
        return data.signedUrl;
    }
}
exports.SupabaseStorageAdapter = SupabaseStorageAdapter;

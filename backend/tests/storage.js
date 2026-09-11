"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SupabaseStorageAdapter_1 = require("../src/utils/SupabaseStorageAdapter");
async function testStorage() {
    console.log("Testing Supabase Storage...");
    const adapter = new SupabaseStorageAdapter_1.SupabaseStorageAdapter();
    try {
        const { error: bucketError } = await adapter['supabase'].storage.createBucket('customer-documents', { public: false });
        if (bucketError)
            console.log('Bucket exists or creation failed:', bucketError.message);
        const key = 'test/doc_' + Date.now() + '.txt';
        console.log('Uploading...', key);
        await adapter.upload(key, Buffer.from('hello world'), 'text/plain');
        console.log('Generating Signed URL...');
        const url = await adapter.createSignedUrl(key, 3600);
        console.log('Signed URL:', url);
        console.log('Downloading...');
        const downloaded = await adapter.download(key);
        console.log('Downloaded content:', downloaded.toString());
        console.log('Deleting...');
        await adapter.delete(key);
        console.log('Storage Test PASSED.');
    }
    catch (e) {
        console.error('Storage Test FAILED:', e.message);
    }
}
testStorage();

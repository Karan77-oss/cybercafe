
export interface StorageProvider {
    upload(key: string, file: Buffer, mimeType: string): Promise<string>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    createSignedUrl(key: string, expiresInSecs?: number): Promise<string>;
}

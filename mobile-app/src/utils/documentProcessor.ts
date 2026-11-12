/**
 * Mobile App Document Compression & Pre-Upload Clarity Engine (TypeScript)
 * 80% Storage & Bandwidth Cost Reduction Pipeline
 */

export interface ClarityValidationResult {
  valid: boolean;
  error?: string;
  warning?: string | null;
  width?: number;
  height?: number;
  clarityScore?: number;
  isBlurry?: boolean;
  isPdf?: boolean;
}

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number;
}

function calculateLaplacianVariance(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const grayscale = new Float32Array(width * height);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      grayscale[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = y * width + x;
        const lap =
          grayscale[idx - width] +
          grayscale[idx - 1] +
          grayscale[idx + 1] +
          grayscale[idx + width] -
          4 * grayscale[idx];

        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    if (count === 0) return 150;
    const mean = sum / count;
    return sumSq / count - mean * mean;
  } catch {
    return 150;
  }
}

export async function validateDocumentClarity(file: File): Promise<ClarityValidationResult> {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // 1. Minimum File Size Check (15 KB)
  if (file.size < 15 * 1024) {
    return {
      valid: false,
      error: `File is too small (${(file.size / 1024).toFixed(1)} KB). Official documents must be at least 15 KB to prevent corrupted or blank uploads.`
    };
  }

  // PDF check
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: true, isPdf: true };
  }

  // 2. Image resolution & blur check
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (width < 600 || height < 400) {
        return resolve({
          valid: false,
          error: `Document resolution is too low (${width}x${height}px). Minimum 600x400 px is required for government verification.`
        });
      }

      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 400 / width);
      const testWidth = Math.round(width * scale);
      const testHeight = Math.round(height * scale);
      canvas.width = testWidth;
      canvas.height = testHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({ valid: true, width, height });
      }

      ctx.drawImage(img, 0, 0, testWidth, testHeight);
      const variance = calculateLaplacianVariance(ctx, testWidth, testHeight);
      const isBlurry = variance < 80;

      resolve({
        valid: true,
        width,
        height,
        clarityScore: Math.round(variance),
        isBlurry,
        warning: isBlurry
          ? 'Warning: This document photo may be blurry. Please ensure text and details are sharp and legible.'
          : null
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: 'Unable to read document image. Please upload a valid JPG, PNG, WebP, or PDF file.'
      });
    };

    img.src = objectUrl;
  });
}

export async function compressDocument(file: File, options: CompressionOptions = { maxWidth: 1600, quality: 0.78 }): Promise<File> {
  if (!file) return file;

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return file;
  }

  const maxWidth = options.maxWidth || 1600;
  const quality = options.quality !== undefined ? options.quality : 0.78;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const outputMime = 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            return resolve(file);
          }

          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${originalName}.webp`, {
            type: outputMime,
            lastModified: Date.now()
          });

          resolve(compressedFile);
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

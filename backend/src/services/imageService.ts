import sharp from 'sharp';

// Maximum dimensions for uploaded images
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 80;

export interface ProcessedImage {
  buffer: Buffer;
  mimetype: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compress and resize an image using sharp
 * Returns a JPEG buffer optimized for web
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const originalSize = buffer.length;

  const processedBuffer = await sharp(buffer)
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return {
    buffer: processedBuffer,
    mimetype: 'image/jpeg',
    originalSize,
    compressedSize: processedBuffer.length,
  };
}

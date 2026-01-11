import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Check if S3 is configured
const isS3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
);

// S3 Client configuration
const s3Client = isS3Configured
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

// File filter for images only
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// File filter for media (images + videos)
const mediaFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const videoTypes = /mp4|mov|quicktime|m4v/;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype.toLowerCase();

  const isImage = imageTypes.test(ext) || imageTypes.test(mime.split('/')[1] || '');
  const isVideo = videoTypes.test(ext) || mime.startsWith('video/');

  if (isImage || isVideo) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed (jpg, png, gif, webp, mp4, mov)'));
  }
};

// Use memory storage for compression before upload
const memoryStorage = multer.memoryStorage();

if (isS3Configured) {
  console.log('[Upload] Using S3 storage with compression:', process.env.AWS_S3_BUCKET);
} else {
  console.log('[Upload] Using local storage with compression');
}

// Upload middleware for images only (10MB limit)
export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: imageFileFilter,
});

// Upload middleware for media (images + videos, 50MB limit for videos)
export const uploadMedia = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit to accommodate videos
  },
  fileFilter: mediaFileFilter,
});

// Upload buffer to S3
export async function uploadToS3(buffer: Buffer, key: string, mimetype: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

// Save buffer to local file
export async function saveToLocal(buffer: Buffer, filename: string, subdir: string = 'events'): Promise<string> {
  const uploadDir = `uploads/${subdir}`;

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${subdir}/${filename}`;
}

// Helper to determine if a file is a video based on mimetype
export function isVideoMimetype(mimetype: string): boolean {
  return mimetype.startsWith('video/');
}

// Helper to generate unique filename with extension
export function generateUniqueFilename(extension: string = 'jpg'): string {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return `${uniqueSuffix}.${extension}`;
}

export { isS3Configured, s3Client };

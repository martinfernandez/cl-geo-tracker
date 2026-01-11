import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Maximum duration for uploaded videos (in seconds)
const MAX_DURATION = 15;

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
}

export interface ProcessedVideo {
  buffer: Buffer;
  thumbnailBuffer: Buffer;
  mimetype: string;
  thumbnailMimetype: string;
  duration: number;
  originalSize: number;
}

/**
 * Get video metadata (duration, dimensions, codec)
 */
export function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
      });
    });
  });
}

/**
 * Validate video duration
 * @returns true if valid, throws error if invalid
 */
export async function validateVideoDuration(inputPath: string): Promise<number> {
  const metadata = await getVideoMetadata(inputPath);

  if (metadata.duration > MAX_DURATION) {
    throw new Error(`Video exceeds maximum duration of ${MAX_DURATION} seconds (duration: ${metadata.duration.toFixed(1)}s)`);
  }

  return metadata.duration;
}

/**
 * Generate a thumbnail from video at specified time
 */
export function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timestamp: number = 0.5
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x?', // Width 640, maintain aspect ratio
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Failed to generate thumbnail: ${err.message}`)));
  });
}

/**
 * Process video: validate duration, optionally compress, generate thumbnail
 * Note: For 15-second videos, we skip compression to preserve quality
 */
export async function processVideo(buffer: Buffer): Promise<ProcessedVideo> {
  const originalSize = buffer.length;

  // Create temp files for processing
  const tempDir = os.tmpdir();
  const tempInputPath = path.join(tempDir, `video-input-${Date.now()}.mp4`);
  const tempThumbnailPath = path.join(tempDir, `thumbnail-${Date.now()}.jpg`);

  try {
    // Write buffer to temp file
    fs.writeFileSync(tempInputPath, buffer);

    // Validate duration
    const duration = await validateVideoDuration(tempInputPath);

    // Generate thumbnail at 0.5 second mark (or halfway for very short videos)
    const thumbnailTime = Math.min(0.5, duration / 2);
    await generateThumbnail(tempInputPath, tempThumbnailPath, thumbnailTime);

    // Read thumbnail
    const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

    // For short videos (15s or less), we keep original quality
    // Just return the original buffer
    return {
      buffer: buffer,
      thumbnailBuffer,
      mimetype: 'video/mp4',
      thumbnailMimetype: 'image/jpeg',
      duration,
      originalSize,
    };
  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
    } catch (e) {
      console.error('Error cleaning up temp video files:', e);
    }
  }
}

/**
 * Check if a mimetype is a supported video format
 */
export function isSupportedVideoType(mimetype: string): boolean {
  const supportedTypes = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-m4v',
  ];
  return supportedTypes.includes(mimetype.toLowerCase());
}

/**
 * Get the max allowed duration in seconds
 */
export function getMaxDuration(): number {
  return MAX_DURATION;
}

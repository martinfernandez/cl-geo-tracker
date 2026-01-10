import * as ImageManipulator from 'expo-image-manipulator';

// Image size presets for different use cases
export const IMAGE_SIZES = {
  // Profile images and group avatars (displayed small)
  AVATAR: { width: 400, height: 400 },
  // Event images in feed (displayed larger)
  EVENT: { width: 1200, height: 1200 },
};

export type ImageSize = keyof typeof IMAGE_SIZES;

interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Resize and compress an image before uploading
 * This reduces file size and upload time significantly
 *
 * @param uri - The local URI of the image to process
 * @param size - The target size preset (AVATAR or EVENT)
 * @param quality - JPEG compression quality (0-1, default 0.8)
 * @returns Processed image with new URI
 */
export async function processImageForUpload(
  uri: string,
  size: ImageSize = 'AVATAR',
  quality: number = 0.8
): Promise<ProcessedImage> {
  const { width, height } = IMAGE_SIZES[size];

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width,
          height,
        },
      },
    ],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Get the file size of an image from its URI (approximate)
 * Useful for logging compression results
 */
export async function getImageInfo(uri: string): Promise<{ width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(uri, [], {});
  return {
    width: result.width,
    height: result.height,
  };
}

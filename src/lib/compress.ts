import imageCompression from 'browser-image-compression';

/**
 * Compress a captured photo before storing it.
 * - max edge: 1920px
 * - quality: ~0.82 JPEG
 * - target size: ~600KB
 */
export async function compressPhoto(file: File): Promise<Blob> {
  try {
    const out = await imageCompression(file, {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.82,
    });
    return out;
  } catch (err) {
    // If compression fails (corrupt image / unsupported codec), fall back to
    // the original blob.
    console.warn('[KT] compression failed, using original', err);
    return file;
  }
}

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
    console.warn('[KT] compression failed, retrying via canvas', err);
    // Re-encode to JPEG via canvas so we never ship a blob the supervisor's
    // desktop browser can't render (e.g. an iPhone HEIC capture that the
    // compressor couldn't decode). Safari/iOS decodes HEIC here.
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        const jpeg = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, 'image/jpeg', 0.82),
        );
        if (jpeg) return jpeg;
      }
    } catch (e2) {
      console.warn('[KT] canvas re-encode also failed', e2);
    }
    // Last resort: only if no decode path worked at all.
    return file;
  }
}

import { HAS_SUPABASE, getSupabase } from './supabase';
import type { OfflinePhoto, OfflineReport } from './types';

/**
 * Upload a single report + its photos to Supabase.
 * Returns the remote report ID. Throws on failure (uploader queue handles
 * retry / error display).
 *
 * Wire this into `installAutoFlush` at app boot.
 */
export async function uploadReport(
  report: OfflineReport,
  photos: OfflinePhoto[],
): Promise<string> {
  if (!HAS_SUPABASE) {
    // Demo mode — pretend it worked, return a fake remote id.
    await new Promise((r) => setTimeout(r, 400));
    return 'demo-' + report.id;
  }

  const sb = getSupabase();

  // 1. Insert the report row.
  const { data: row, error } = await sb
    .from('reports')
    .insert({
      employee_id: report.employeeId,
      job_type: report.jobType,
      location: report.location,
      gps_lat: report.gps?.lat ?? null,
      gps_lng: report.gps?.lng ?? null,
      gps_accuracy: report.gps?.accuracy ?? null,
      description: report.description,
      notes: report.notes ?? null,
      completion_confirmed: report.completionConfirmed,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to insert report row');
  }

  const remoteId = row.id as string;

  // 2. Upload each photo blob, then insert its metadata.
  for (const p of photos) {
    const ext = blobExt(p.blob);
    const path = `${remoteId}/${p.id}.${ext}`;

    const { error: upErr } = await sb.storage
      .from('report-photos')
      .upload(path, p.blob, {
        contentType: p.blob.type || 'image/jpeg',
        upsert: false,
      });
    if (upErr) {
      throw new Error(`Photo upload failed: ${upErr.message}`);
    }

    const { error: metaErr } = await sb.from('report_photos').insert({
      report_id: remoteId,
      storage_path: path,
      caption: p.caption ?? null,
    });
    if (metaErr) {
      throw new Error(`Photo metadata insert failed: ${metaErr.message}`);
    }
  }

  return remoteId;
}

function blobExt(b: Blob): string {
  switch (b.type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'jpg';
  }
}

/** Returns a signed URL for displaying a private photo. */
export async function getPhotoUrl(
  storagePath: string,
  expiresInSec = 3600,
): Promise<string | null> {
  if (!HAS_SUPABASE) return null;
  const sb = getSupabase();
  const { data, error } = await sb.storage
    .from('report-photos')
    .createSignedUrl(storagePath, expiresInSec);
  if (error) return null;
  return data.signedUrl;
}

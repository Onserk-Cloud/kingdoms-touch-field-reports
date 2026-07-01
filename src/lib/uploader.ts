import { HAS_SUPABASE, getSupabase } from './supabase';
import { notifyNewReport } from './notifications';
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
    // Demo mode — pretend it worked, notify staff, return a fake remote id.
    await new Promise((r) => setTimeout(r, 400));
    await notifyNewReport({ id: report.id, jobType: report.jobType });
    return 'demo-' + report.id;
  }

  const sb = getSupabase();

  // 1. Insert the report row USING THE CLIENT-GENERATED ID so a retry after a
  //    partial failure (photo upload died mid-way) resumes the SAME report
  //    instead of cloning it — a unique-violation just means "already there".
  const { error } = await sb.from('reports').insert({
    id: report.id,
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
  });

  if (error && error.code !== '23505') {
    throw new Error(error.message ?? 'Failed to insert report row');
  }

  const remoteId = report.id;

  // 2. Upload each photo blob (deterministic path + upsert → retry-safe),
  //    then insert its metadata with the photo's own id (duplicate = done).
  for (const p of photos) {
    const ext = blobExt(p.blob);
    const path = `${remoteId}/${p.id}.${ext}`;

    const { error: upErr } = await sb.storage
      .from('report-photos')
      .upload(path, p.blob, {
        contentType: p.blob.type || 'image/jpeg',
        upsert: false,
      });
    // "Already exists" on a retry means this photo made it up last time.
    if (upErr && !/exist|duplicate/i.test(upErr.message)) {
      throw new Error(`Photo upload failed: ${upErr.message}`);
    }

    const { error: metaErr } = await sb.from('report_photos').insert({
      id: p.id,
      report_id: remoteId,
      storage_path: path,
      caption: p.caption ?? null,
    });
    if (metaErr && metaErr.code !== '23505') {
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

/** Returns a signed URL for displaying a private photo (any bucket). */
export async function getPhotoUrl(
  storagePath: string,
  expiresInSec = 3600,
  bucket = 'report-photos',
): Promise<string | null> {
  if (!HAS_SUPABASE) return null;
  const sb = getSupabase();
  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresInSec);
  if (error) return null;
  return data.signedUrl;
}

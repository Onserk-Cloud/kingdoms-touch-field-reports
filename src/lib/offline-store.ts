/**
 * IndexedDB-backed offline queue for reports + photos.
 *
 * Replaces `app/offline-store.js` from the prototype, but with a typed,
 * promise-friendly API on top of `idb`.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { OfflinePhoto, OfflineReport } from './types';

const DB_NAME = 'kt-reports';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('reports')) {
          const s = d.createObjectStore('reports', { keyPath: 'id' });
          s.createIndex('status', 'status');
          s.createIndex('employeeId', 'employeeId');
          s.createIndex('createdAt', 'createdAt');
        }
        if (!d.objectStoreNames.contains('photos')) {
          const s = d.createObjectStore('photos', { keyPath: 'id' });
          s.createIndex('reportId', 'reportId');
        }
        if (!d.objectStoreNames.contains('meta')) {
          d.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'r-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const ktStore = {
  /** Save or update a draft report. */
  async saveDraft(
    partial: Partial<OfflineReport> & { employeeId: string },
  ): Promise<string> {
    const id = partial.id ?? uuid();
    const d = await db();
    const existing = (await d.get('reports', id)) as OfflineReport | undefined;
    const next: OfflineReport = {
      id,
      employeeId: partial.employeeId,
      jobType: partial.jobType ?? existing?.jobType ?? '',
      location: partial.location ?? existing?.location ?? '',
      gps: partial.gps ?? existing?.gps ?? null,
      description: partial.description ?? existing?.description ?? '',
      notes: partial.notes ?? existing?.notes ?? '',
      completionConfirmed:
        partial.completionConfirmed ?? existing?.completionConfirmed ?? false,
      createdAt: existing?.createdAt ?? Date.now(),
      status: 'draft',
    };
    await d.put('reports', next);
    return id;
  },

  /** Add a photo blob to a draft / pending report. */
  async addPhoto(
    reportId: string,
    blob: Blob,
    caption?: string,
  ): Promise<string> {
    const id = uuid();
    const d = await db();
    await d.put('photos', {
      id,
      reportId,
      blob,
      caption,
      createdAt: Date.now(),
    } satisfies OfflinePhoto);
    return id;
  },

  async removePhoto(photoId: string) {
    const d = await db();
    await d.delete('photos', photoId);
  },

  /** List photos for a given local report. */
  async listPhotos(reportId: string): Promise<OfflinePhoto[]> {
    const d = await db();
    const idx = d.transaction('photos').store.index('reportId');
    return (await idx.getAll(reportId)) as OfflinePhoto[];
  },

  /** Promote a draft to "pending" — ready to flush when online. */
  async queueReport(reportId: string): Promise<void> {
    const d = await db();
    const r = (await d.get('reports', reportId)) as OfflineReport | undefined;
    if (!r) throw new Error('Report not found');
    r.status = 'pending';
    r.createdAt = r.createdAt ?? Date.now();
    await d.put('reports', r);
  },

  async getReport(id: string): Promise<OfflineReport | undefined> {
    const d = await db();
    return (await d.get('reports', id)) as OfflineReport | undefined;
  },

  /** Update a report's status in place (used by demo supervisor actions). */
  async setStatus(id: string, status: OfflineReport['status']): Promise<void> {
    const d = await db();
    const r = (await d.get('reports', id)) as OfflineReport | undefined;
    if (!r) return;
    r.status = status;
    await d.put('reports', r);
  },

  /** Merge a partial patch into a report (status, reviewNote, edited fields…). */
  async updateReport(id: string, patch: Partial<OfflineReport>): Promise<void> {
    const d = await db();
    const r = (await d.get('reports', id)) as OfflineReport | undefined;
    if (!r) return;
    await d.put('reports', { ...r, ...patch });
  },

  /** All reports for a given employee, newest first. */
  async listReports(employeeId?: string): Promise<OfflineReport[]> {
    const d = await db();
    const all = (await d.getAll('reports')) as OfflineReport[];
    const filtered = employeeId
      ? all.filter((r) => r.employeeId === employeeId)
      : all;
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },

  /** Find all "pending" reports — uploader iterates over these. */
  async pendingReports(): Promise<OfflineReport[]> {
    const d = await db();
    const idx = d.transaction('reports').store.index('status');
    return (await idx.getAll('pending')) as OfflineReport[];
  },

  /** Mark a report as successfully synced. */
  async markSubmitted(localId: string, remoteId: string): Promise<void> {
    const d = await db();
    const r = (await d.get('reports', localId)) as OfflineReport | undefined;
    if (!r) return;
    r.status = 'submitted';
    r.remoteId = remoteId;
    await d.put('reports', r);
  },

  async markError(localId: string, error: string): Promise<void> {
    const d = await db();
    const r = (await d.get('reports', localId)) as OfflineReport | undefined;
    if (!r) return;
    r.status = 'error';
    r.error = error;
    await d.put('reports', r);
  },

  /** Run the supplied uploader over every pending report. */
  async flushQueue(
    uploader: (
      report: OfflineReport,
      photos: OfflinePhoto[],
    ) => Promise<string>,
    onProgress?: (id: string, ok: boolean, error?: string) => void,
  ): Promise<{ ok: number; failed: number }> {
    const pending = await this.pendingReports();
    let ok = 0;
    let failed = 0;
    for (const r of pending) {
      try {
        const photos = await this.listPhotos(r.id);
        const remoteId = await uploader(r, photos);
        await this.markSubmitted(r.id, remoteId);
        onProgress?.(r.id, true);
        ok++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.markError(r.id, msg);
        onProgress?.(r.id, false, msg);
        failed++;
      }
    }
    return { ok, failed };
  },

  async deleteReport(id: string) {
    const d = await db();
    const photos = await this.listPhotos(id);
    const tx = d.transaction(['reports', 'photos'], 'readwrite');
    await tx.objectStore('reports').delete(id);
    for (const p of photos) {
      await tx.objectStore('photos').delete(p.id);
    }
    await tx.done;
  },

  async clear() {
    const d = await db();
    const tx = d.transaction(['reports', 'photos'], 'readwrite');
    await tx.objectStore('reports').clear();
    await tx.objectStore('photos').clear();
    await tx.done;
  },
};

/**
 * Wire up auto-flush when the device comes back online.
 * Pass in the uploader once, at app boot.
 */
export function installAutoFlush(
  uploader: (r: OfflineReport, photos: OfflinePhoto[]) => Promise<string>,
  onComplete?: (result: { ok: number; failed: number }) => void,
): () => void {
  const handler = async () => {
    if (!navigator.onLine) return;
    const result = await ktStore.flushQueue(uploader);
    onComplete?.(result);
  };
  window.addEventListener('online', handler);
  // Also try on boot if currently online.
  if (navigator.onLine) {
    // Don't await — fire-and-forget.
    void handler();
  }
  return () => window.removeEventListener('online', handler);
}

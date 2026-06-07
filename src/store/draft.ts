import { create } from 'zustand';
import type { GpsFix } from '../lib/geo';

/** In-memory new-report wizard draft (persisted to IndexedDB on submit). */
export interface DraftState {
  jobType: string;
  location: string;
  description: string;
  notes: string;
  gps: GpsFix | null;
  /** Photo blobs the user has captured so far. */
  photos: Array<{ id: string; blob: Blob; previewUrl: string }>;
  completionConfirmed: boolean;
  set: (patch: Partial<Omit<DraftState, 'set' | 'reset' | 'addPhoto' | 'removePhoto'>>) => void;
  addPhoto: (blob: Blob) => void;
  removePhoto: (id: string) => void;
  reset: () => void;
}

const initial = {
  jobType: '',
  location: '',
  description: '',
  notes: '',
  gps: null,
  photos: [] as DraftState['photos'],
  completionConfirmed: false,
};

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useDraftStore = create<DraftState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  addPhoto: (blob) => {
    const id = uuid();
    const previewUrl = URL.createObjectURL(blob);
    set((s) => ({ photos: [...s.photos, { id, blob, previewUrl }] }));
  },
  removePhoto: (id) =>
    set((s) => {
      const next = s.photos.filter((p) => p.id !== id);
      const removed = s.photos.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return { photos: next };
    }),
  reset: () => {
    // Clean up object URLs.
    set((s) => {
      s.photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return { ...initial };
    });
  },
}));

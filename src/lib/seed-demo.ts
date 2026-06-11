/**
 * Seeds the IndexedDB store with a realistic catalogue of reports + photos
 * for **demo mode** (no Supabase configured). Idempotent: runs once per
 * device, controlled by a localStorage flag.
 *
 * Photos are generated procedurally with a Canvas (no external assets) so
 * the bundle stays small and the demo "just works" offline.
 */

import { ktStore } from './offline-store';
import type { OfflineReport } from './types';

// Bumped to v3: the previous seed aborted with a VersionError, so any device
// that ran it has partial/empty data. v3 forces a clean re-seed of the fixed
// catalogue.
const SEED_FLAG = 'kt:demo-seeded:v3';

interface SeedReport {
  /** Offset from now in hours (negative = past). */
  hoursAgo: number;
  employeeId: string;
  jobType: string;
  location: string;
  description: string;
  notes?: string;
  status: OfflineReport['status'];
  /** Reviewer note shown to the employee on a "changes requested" report. */
  reviewNote?: string;
  gps?: { lat: number; lng: number; accuracy: number };
  /** Number of mock photos to attach. */
  photos: number;
  /** Per-photo palette hint (forest / gold / sage / dusk). */
  palette?: 'forest' | 'gold' | 'sage' | 'dusk' | 'rust';
}

const FLORIDA_GPS = {
  orlando: { lat: 28.4823, lng: -81.4187, accuracy: 4 },
  windermere: { lat: 28.4942, lng: -81.5359, accuracy: 6 },
  lakeNona: { lat: 28.371, lng: -81.2434, accuracy: 5 },
  drPhillips: { lat: 28.4514, lng: -81.4954, accuracy: 7 },
  reunion: { lat: 28.2769, lng: -81.6131, accuracy: 8 },
  kissimmee: { lat: 28.2917, lng: -81.4076, accuracy: 5 },
  apopka: { lat: 28.6934, lng: -81.5322, accuracy: 6 },
};

/** Jonathan Reyes — most active employee. */
const SEED: SeedReport[] = [
  {
    hoursAgo: 2,
    employeeId: 'demo-emp-1',
    jobType: 'Pressure Wash · Driveway',
    location: 'Reyna Residence — 4520 S Orange Blossom Trl',
    description:
      'Soft-washed driveway, walkway and front porch using low-pressure detergent. Treated mildew along edge of garage. Homeowner walked the job at completion.',
    notes: 'Recommend repeat treatment in 8–10 months.',
    status: 'submitted',
    gps: FLORIDA_GPS.orlando,
    photos: 3,
    palette: 'forest',
  },
  {
    hoursAgo: 5,
    employeeId: 'demo-emp-1',
    jobType: 'Lawn Care · Full Property',
    location: 'Windermere Estate — 14 Lakeview Dr',
    description:
      'Mowed front and back lawn at 3.5". Edged all hardscapes, blew off driveway and walkways. Trimmed three palm fronds at the front border.',
    status: 'submitted',
    gps: FLORIDA_GPS.windermere,
    photos: 4,
    palette: 'sage',
  },
  {
    hoursAgo: 24,
    employeeId: 'demo-emp-1',
    jobType: 'Hedge Trim · Front Border',
    location: 'Lake Nona Townhomes — Bldg 7',
    description:
      'Trimmed 22 ft of hibiscus hedge to 5 ft. Removed two dead palms and bagged debris (3 bags). Cleaned driveway after.',
    status: 'submitted',
    gps: FLORIDA_GPS.lakeNona,
    photos: 2,
    palette: 'forest',
  },
  {
    hoursAgo: 28,
    employeeId: 'demo-emp-1',
    jobType: 'Mulch Install · Side Beds',
    location: 'Dr. Phillips Residence',
    description:
      'Installed 6 yards of dark brown cypress mulch in front and side beds. Edged borders.',
    notes: 'Customer requested same product next quarter.',
    status: 'pending',
    photos: 5,
    palette: 'gold',
  },
  {
    hoursAgo: 60,
    employeeId: 'demo-emp-1',
    jobType: 'Pressure Wash · Pool Deck',
    location: 'Reunion Resort #214',
    description:
      'Pressure-washed travertine deck, removed algae from waterline. Used pH-neutral detergent per HOA spec.',
    status: 'submitted',
    gps: FLORIDA_GPS.reunion,
    photos: 6,
    palette: 'dusk',
  },
  {
    hoursAgo: 96,
    employeeId: 'demo-emp-1',
    jobType: 'Lawn Care · Bi-weekly',
    location: 'Kissimmee Heights — Lot 18',
    description:
      'Standard bi-weekly mow and trim. Applied weed treatment to driveway cracks.',
    status: 'submitted',
    gps: FLORIDA_GPS.kissimmee,
    photos: 3,
    palette: 'sage',
  },
  {
    hoursAgo: 168,
    employeeId: 'demo-emp-1',
    jobType: 'Storm Cleanup',
    location: 'Apopka — Magnolia Ave 412',
    description:
      'Removed downed branches and palm fronds after Sunday storm. Stacked debris curbside for city pickup.',
    status: 'submitted',
    gps: FLORIDA_GPS.apopka,
    photos: 4,
    palette: 'rust',
  },

  // Maria López — second employee
  {
    hoursAgo: 4,
    employeeId: 'demo-emp-2',
    jobType: 'Lawn Care · Full Property',
    location: 'Windermere Estate — 14 Lakeview Dr',
    description:
      'Same property as Jonathan — back lawn detail + treated brown patch in southeast corner.',
    status: 'submitted',
    gps: FLORIDA_GPS.windermere,
    photos: 5,
    palette: 'sage',
  },
  {
    hoursAgo: 6,
    employeeId: 'demo-emp-2',
    jobType: 'Tree Trim · Oak Canopy',
    location: 'Dr. Phillips Residence',
    description:
      'Raised canopy on three oaks to 8 ft. Removed crossing branches. Used arborist-spec cuts.',
    notes: 'Two limbs flagged for next visit — too close to roof.',
    status: 'pending',
    gps: FLORIDA_GPS.drPhillips,
    photos: 6,
    palette: 'forest',
  },
  {
    hoursAgo: 30,
    employeeId: 'demo-emp-2',
    jobType: 'Flower Bed Install',
    location: 'Orlando — Crystal Lake 88',
    description:
      'Installed 36 marigolds, 12 vinca, and 6 bird of paradise per design plan. Mulched.',
    status: 'submitted',
    gps: FLORIDA_GPS.orlando,
    photos: 4,
    palette: 'gold',
  },
  {
    hoursAgo: 78,
    employeeId: 'demo-emp-2',
    jobType: 'Pressure Wash · House Exterior',
    location: 'Lake Nona — 2210 Eagle Trace',
    description:
      'Full exterior wash, soft-wash siding and trim. Brightened front porch concrete.',
    status: 'submitted',
    gps: FLORIDA_GPS.lakeNona,
    photos: 5,
    palette: 'dusk',
  },
  {
    hoursAgo: 120,
    employeeId: 'demo-emp-2',
    jobType: 'Hedge Trim · Boxwood Border',
    location: 'Orlando — Park Lake Cir',
    description:
      'Trimmed 40 ft of boxwood to flat 3 ft. Cleaned and bagged 4 bags of clippings.',
    status: 'submitted',
    photos: 3,
    palette: 'sage',
  },

  // José Rivera — third employee (only in supervisor seed, but added here too)
  {
    hoursAgo: 7,
    employeeId: 'demo-emp-3',
    jobType: 'Sod Replacement · 200 sqft',
    location: 'Apopka — Magnolia Ave 412',
    description: 'Removed dead turf and laid 200 sqft of St. Augustine sod.',
    status: 'pending',
    gps: FLORIDA_GPS.apopka,
    photos: 4,
    palette: 'forest',
  },

  // Drafts (no submission)
  {
    hoursAgo: 1,
    employeeId: 'demo-emp-1',
    jobType: 'Pressure Wash · Garage Floor',
    location: '',
    description: 'In progress…',
    status: 'draft',
    photos: 1,
    palette: 'dusk',
  },

  // A "changes requested" one — exercises the review → resubmit flow end-to-end.
  {
    hoursAgo: 50,
    employeeId: 'demo-emp-1',
    jobType: 'Pool Deck Repair',
    location: 'Reunion Resort #214',
    description:
      'Patched two hairline cracks with concrete filler. Will re-seal next visit.',
    reviewNote: 'Supervisor requested before/after photos.',
    status: 'needs_update',
    photos: 1,
    palette: 'rust',
  },
];

export async function seedDemoData(force = false): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!force && window.localStorage.getItem(SEED_FLAG) === '1') return;

  // Start from a clean slate so a re-seed (flag bump, or a prior partial run)
  // never leaves orphaned reports behind. Safe: this only runs on the one-time
  // seed (the flag short-circuits returning devices) or an explicit reset.
  await ktStore.clear();

  const now = Date.now();
  for (const s of SEED) {
    const id = await ktStore.saveDraft({
      employeeId: s.employeeId,
      jobType: s.jobType,
      location: s.location,
      description: s.description,
      notes: s.notes,
      gps: s.gps ?? null,
      completionConfirmed: s.status !== 'draft',
    });

    // Override createdAt + status post-save, reusing the store's v2 connection
    // (a hard-coded openDB(..., 1) here threw a VersionError and aborted the seed).
    const patch: Partial<OfflineReport> = {
      createdAt: now - s.hoursAgo * 60 * 60 * 1000,
      status: s.status,
    };
    // Stamp a fake remote id for "submitted" ones so they look real.
    if (s.status === 'submitted' || s.status === 'pending') {
      patch.remoteId = `demo-${id.slice(0, 8)}`;
    }
    if (s.reviewNote) patch.reviewNote = s.reviewNote;
    await ktStore.updateReport(id, patch);

    // Generate mock photos.
    for (let i = 0; i < s.photos; i++) {
      const blob = await makePlaceholderPhoto(
        s.palette ?? 'forest',
        s.jobType,
        i + 1,
      );
      await ktStore.addPhoto(id, blob, `Photo ${i + 1}`);
    }
  }

  window.localStorage.setItem(SEED_FLAG, '1');
}

/** Clear the seed flag so a refresh re-runs the seeder. */
export function resetDemoSeed(): void {
  window.localStorage.removeItem(SEED_FLAG);
}

/* ─── Placeholder photo generator ─────────────────────────── */

const PALETTES: Record<
  NonNullable<SeedReport['palette']>,
  { from: string; to: string; accent: string; ground: string }
> = {
  forest: {
    from: '#1F3D2B',
    to: '#3D6B4F',
    accent: '#C9A24D',
    ground: '#2A5238',
  },
  gold: {
    from: '#A0802F',
    to: '#E2C485',
    accent: '#F7F3E8',
    ground: '#C9A24D',
  },
  sage: {
    from: '#8FA58B',
    to: '#C5D0BD',
    accent: '#1F3D2B',
    ground: '#7FA66E',
  },
  dusk: {
    from: '#15291D',
    to: '#2A5238',
    accent: '#E2C485',
    ground: '#1F3D2B',
  },
  rust: {
    from: '#5A3024',
    to: '#A04A2E',
    accent: '#E2C485',
    ground: '#7A3F2A',
  },
};

async function makePlaceholderPhoto(
  paletteName: NonNullable<SeedReport['palette']>,
  jobType: string,
  index: number,
): Promise<Blob> {
  const W = 480;
  const H = 360;
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(W, H)
      : Object.assign(document.createElement('canvas'), {
          width: W,
          height: H,
        });

  const ctx = (canvas as any).getContext('2d') as CanvasRenderingContext2D;
  const p = PALETTES[paletteName];

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.65);
  sky.addColorStop(0, p.from);
  sky.addColorStop(1, p.to);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Ground
  ctx.fillStyle = p.ground;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.65);
  ctx.bezierCurveTo(W * 0.3, H * 0.55, W * 0.6, H * 0.72, W, H * 0.6);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Sun / accent dot
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.22, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.22, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Hairline scan lines (texture)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Trees / silhouettes
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let i = 0; i < 4; i++) {
    const x = (W / 4) * i + 30 + ((index * 17) % 40);
    const h = 80 + ((i * 23 + index * 11) % 50);
    treeSilhouette(ctx, x, H * 0.7 - h, 28, h);
  }

  // Tag overlay (top-left)
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(16, 16, 110, 28);
  ctx.fillStyle = p.accent;
  ctx.font = 'bold 11px ui-monospace, Menlo, monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${jobType.split(' ')[0].toUpperCase()} · ${String(index).padStart(2, '0')}`,
    24,
    30,
  );

  // Bottom watermark
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '11px Manrope, system-ui, sans-serif';
  ctx.fillText('KT · DEMO PHOTO', 16, H - 18);

  // Export as JPEG blob
  if ('convertToBlob' in canvas) {
    return (canvas as OffscreenCanvas).convertToBlob({
      type: 'image/jpeg',
      quality: 0.82,
    });
  }
  return new Promise<Blob>((resolve) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => resolve(b ?? new Blob()),
      'image/jpeg',
      0.82,
    );
  });
}

function treeSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Trunk
  ctx.fillRect(x - w * 0.08, y + h * 0.5, w * 0.16, h * 0.5);
  // Foliage as overlapping ellipses
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.25, w, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.25, y + h * 0.1, w * 0.6, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

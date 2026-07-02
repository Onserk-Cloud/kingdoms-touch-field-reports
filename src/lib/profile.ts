import { HAS_SUPABASE, getSupabase } from './supabase';
import { compressPhoto } from './compress';
import type { Employee } from './types';

const AVATAR_BUCKET = 'avatars';

const PROFILE_COLS =
  'id, name, role, active, initials, avatar_color, created_at, phone, email, skills, avatar_url, notification_prefs, crew';

/** Per-user notification toggles (mirrors employees.notification_prefs jsonb). */
export interface NotificationPrefs {
  assignments: boolean;
  deadlines: boolean;
  caseUpdates: boolean;
  weeklySummary: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  assignments: true,
  deadlines: true,
  caseUpdates: true,
  weeklySummary: false,
};

/** Normalize the raw jsonb (possibly {} or partial) into a full prefs object. */
function toNotificationPrefs(raw: unknown): NotificationPrefs {
  const src = (raw ?? {}) as Partial<Record<keyof NotificationPrefs, unknown>>;
  const pick = (k: keyof NotificationPrefs): boolean =>
    typeof src[k] === 'boolean' ? (src[k] as boolean) : DEFAULT_NOTIFICATION_PREFS[k];
  return {
    assignments: pick('assignments'),
    deadlines: pick('deadlines'),
    caseUpdates: pick('caseUpdates'),
    weeklySummary: pick('weeklySummary'),
  };
}

/** Employee row plus the profile-only columns (notification_prefs, crew). */
export interface MyProfile extends Employee {
  notification_prefs: NotificationPrefs;
  crew: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEmployee(r: any): Employee {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    active: r.active,
    initials: r.initials ?? '',
    avatar_color: r.avatar_color ?? null,
    created_at: r.created_at,
    phone: r.phone ?? null,
    email: r.email ?? null,
    skills: (r.skills ?? []) as string[],
    avatar_url: r.avatar_url ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(r: any): MyProfile {
  return {
    ...rowToEmployee(r),
    notification_prefs: toNotificationPrefs(r.notification_prefs),
    crew: r.crew ?? null,
  };
}

/** Fetch the full profile row (including phone/email/skills/avatar/prefs/crew). */
export async function getMyProfile(employeeId: string): Promise<MyProfile | null> {
  if (!HAS_SUPABASE) return null;
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('employees')
      .select(PROFILE_COLS)
      .eq('id', employeeId)
      .single();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  } catch (err) {
    console.error('[KT] getMyProfile failed', err);
    return null;
  }
}

export interface ProfilePatch {
  name: string;
  phone: string | null;
  email: string | null;
  skills: string[];
  avatarUrl: string | null;
  notificationPrefs: NotificationPrefs;
  crew: string | null;
}

/** Update the caller's own profile via the SECURITY DEFINER RPC. */
export async function updateMyProfile(patch: ProfilePatch): Promise<MyProfile | null> {
  if (!HAS_SUPABASE) return null;
  try {
    const sb = getSupabase();
    let { data, error } = await sb.rpc('update_my_profile', {
      p_name: patch.name,
      p_phone: patch.phone,
      p_email: patch.email,
      p_skills: patch.skills,
      p_avatar_url: patch.avatarUrl,
      p_notification_prefs: patch.notificationPrefs,
      p_crew: patch.crew,
    });
    if (error && error.code === 'PGRST202') {
      // Migration 0016 not applied yet — retry the legacy 5-arg RPC so the
      // rest of the profile still saves (prefs/crew are skipped until then).
      ({ data, error } = await sb.rpc('update_my_profile', {
        p_name: patch.name,
        p_phone: patch.phone,
        p_email: patch.email,
        p_skills: patch.skills,
        p_avatar_url: patch.avatarUrl,
      }));
    }
    if (error) throw error;
    // The function returns a single employees row.
    const row = Array.isArray(data) ? data[0] : data;
    return row ? rowToProfile(row) : null;
  } catch (err) {
    console.error('[KT] updateMyProfile failed', err);
    return null;
  }
}

function extOf(blob: Blob): string {
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Compress + upload an avatar to the public `avatars` bucket under the
 * caller's auth-uid folder (matching the storage RLS). Returns a public URL.
 */
export async function uploadAvatar(file: File): Promise<string | null> {
  if (!HAS_SUPABASE) return null;
  try {
    const sb = getSupabase();
    const { data: userData } = await sb.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error('No authenticated user');

    const blob = await compressPhoto(file);
    const rand =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const path = `${uid}/${rand}.${extOf(blob)}`;

    const { error: upErr } = await sb.storage
      .from(AVATAR_BUCKET)
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
    if (upErr) throw upErr;

    const { data } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch (err) {
    console.error('[KT] uploadAvatar failed', err);
    return null;
  }
}

export interface ProfileStats {
  cases: number;
  done: number;
  active: number;
  reports: number;
}

/** Real, queryable stats for the profile header (no fabricated numbers). */
export async function getProfileStats(employeeId: string): Promise<ProfileStats> {
  const empty: ProfileStats = { cases: 0, done: 0, active: 0, reports: 0 };
  if (!HAS_SUPABASE) return empty;
  try {
    const sb = getSupabase();
    const head = { count: 'exact' as const, head: true };

    const [cases, done, active, reports] = await Promise.all([
      sb.from('cases').select('id', head).eq('assigned_to', employeeId),
      sb
        .from('cases')
        .select('id', head)
        .eq('assigned_to', employeeId)
        .eq('status', 'closed'),
      sb
        .from('cases')
        .select('id', head)
        .eq('assigned_to', employeeId)
        .in('status', ['assigned', 'in_progress']),
      sb.from('reports').select('id', head).eq('employee_id', employeeId),
    ]);

    return {
      cases: cases.count ?? 0,
      done: done.count ?? 0,
      active: active.count ?? 0,
      reports: reports.count ?? 0,
    };
  } catch (err) {
    console.error('[KT] getProfileStats failed', err);
    return empty;
  }
}

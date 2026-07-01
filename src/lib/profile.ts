import { HAS_SUPABASE, getSupabase } from './supabase';
import { compressPhoto } from './compress';
import type { Employee } from './types';

const AVATAR_BUCKET = 'avatars';

const PROFILE_COLS =
  'id, name, role, active, initials, avatar_color, created_at, phone, email, skills, avatar_url';

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

/** Fetch the full profile row (including phone/email/skills/avatar) for an employee. */
export async function getMyProfile(employeeId: string): Promise<Employee | null> {
  if (!HAS_SUPABASE) return null;
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('employees')
      .select(PROFILE_COLS)
      .eq('id', employeeId)
      .single();
    if (error) throw error;
    return data ? rowToEmployee(data) : null;
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
}

/** Update the caller's own profile via the SECURITY DEFINER RPC. */
export async function updateMyProfile(patch: ProfilePatch): Promise<Employee | null> {
  if (!HAS_SUPABASE) return null;
  try {
    const sb = getSupabase();
    const { data, error } = await sb.rpc('update_my_profile', {
      p_name: patch.name,
      p_phone: patch.phone,
      p_email: patch.email,
      p_skills: patch.skills,
      p_avatar_url: patch.avatarUrl,
    });
    if (error) throw error;
    // The function returns a single employees row.
    const row = Array.isArray(data) ? data[0] : data;
    return row ? rowToEmployee(row) : null;
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

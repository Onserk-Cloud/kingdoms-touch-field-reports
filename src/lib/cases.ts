import { HAS_SUPABASE, getSupabase } from './supabase';
import { compressPhoto } from './compress';
import { getPhotoUrl } from './uploader';
import { relativeDate } from './format';
import type { BadgeKind } from '../components/Badge';

export interface Case {
  id: string;
  createdBy: string;
  assignedTo: string | null;
  jobType: string;
  clientOrSite: string | null;
  location: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string | null;
  dueTime: string | null;
  remind: boolean;
  instructions: string | null;
  assignmentGroup: string | null;
  status:
    | 'available'
    | 'assigned'
    | 'in_progress'
    | 'submitted'
    | 'in_review'
    | 'needs_changes'
    | 'approved'
    | 'closed';
  reportId: string | null;
  reviewNote: string | null;
  createdAt: string;
  /** Free-text estimate of time on task (maps est_time). */
  estTime: string | null;
  /** Joined assignee profile (populated by listAllCases; null otherwise). */
  assigneeName?: string | null;
  assigneeInitials?: string | null;
  assigneeColor?: string | null;
}

/**
 * Demo mode fallback: a small array of mock cases for testing without Supabase.
 */
const DEMO_CASES: Case[] = [
  {
    id: '1',
    createdBy: 'demo-staff',
    assignedTo: null,
    jobType: 'HVAC Inspection',
    clientOrSite: 'Downtown Office',
    location: '123 Main St',
    priority: 'high',
    dueDate: null,
    dueTime: null,
    remind: true,
    instructions: 'Check all units and report status',
    assignmentGroup: null,
    status: 'available',
    reportId: null,
    reviewNote: null,
    createdAt: new Date().toISOString(),
    estTime: null,
    assigneeName: null,
    assigneeInitials: null,
    assigneeColor: null,
  },
];

/** Map a Supabase row (snake_case) to a Case (camelCase). */
function rowToCase(row: any): Case {
  return {
    id: row.id as string,
    createdBy: row.created_by as string,
    assignedTo: row.assigned_to as string | null,
    jobType: row.job_type as string,
    clientOrSite: row.client_or_site as string | null,
    location: row.location as string | null,
    priority: row.priority as Case['priority'],
    dueDate: row.due_date as string | null,
    dueTime: (row.due_time ?? null) as string | null,
    remind: (row.remind ?? true) as boolean,
    instructions: row.instructions as string | null,
    assignmentGroup: row.assignment_group as string | null,
    status: row.status as Case['status'],
    reportId: row.report_id as string | null,
    reviewNote: row.review_note as string | null,
    createdAt: row.created_at as string,
    estTime: (row.est_time ?? null) as string | null,
    // `assignee` is only present when the query joins it; tolerate its absence.
    assigneeName: (row.assignee?.name ?? null) as string | null,
    assigneeInitials: (row.assignee?.initials ?? null) as string | null,
    assigneeColor: (row.assignee?.avatar_color ?? null) as string | null,
  };
}

/**
 * List cases assigned to an employee or in the available pool.
 * Excludes closed cases.
 */
export async function listAssignedCases(employeeId: string): Promise<Case[]> {
  if (!HAS_SUPABASE) {
    return DEMO_CASES;
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('cases')
      .select('*')
      .or(`assigned_to.eq.${employeeId},status.eq.available`)
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(rowToCase);
  } catch (err) {
    console.error('[KT] listAssignedCases failed', err);
    return [];
  }
}

/**
 * List all cases (staff view), newest first.
 */
export async function listAllCases(): Promise<Case[]> {
  if (!HAS_SUPABASE) {
    return DEMO_CASES;
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('cases')
      .select('*, assignee:employees!assigned_to(name, initials, avatar_color)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data ?? []).map(rowToCase);
  } catch (err) {
    console.error('[KT] listAllCases failed', err);
    return [];
  }
}

/**
 * Get a single case by ID.
 */
export async function getCase(id: string): Promise<Case | null> {
  if (!HAS_SUPABASE) {
    return DEMO_CASES.find((c) => c.id === id) ?? null;
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('cases').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? rowToCase(data) : null;
  } catch (err) {
    console.error('[KT] getCase failed', err);
    return null;
  }
}

export interface CreateCaseInput {
  jobType: string;
  clientOrSite?: string | null;
  location?: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate?: string | null;
  dueTime?: string | null;
  estTime?: string | null;
  remind?: boolean;
  instructions?: string | null;
  assignedTo?: string | null;
}

/**
 * Create a new case and optionally notify the assigned employee.
 * If assignedTo is set, a notification is inserted.
 */
export async function createCase(
  input: CreateCaseInput,
  createdBy: string,
): Promise<Case | null> {
  if (!HAS_SUPABASE) {
    const newCase: Case = {
      id: Math.random().toString(36).slice(2),
      createdBy,
      assignedTo: input.assignedTo ?? null,
      jobType: input.jobType,
      clientOrSite: input.clientOrSite ?? null,
      location: input.location ?? null,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      dueTime: input.dueTime ?? null,
      remind: input.remind ?? true,
      instructions: input.instructions ?? null,
      assignmentGroup: null,
      status: input.assignedTo ? 'assigned' : 'available',
      reportId: null,
      reviewNote: null,
      createdAt: new Date().toISOString(),
      estTime: input.estTime ?? null,
      assigneeName: null,
      assigneeInitials: null,
      assigneeColor: null,
    };
    DEMO_CASES.push(newCase);
    return newCase;
  }

  try {
    const sb = getSupabase();

    // Insert the case
    const { data, error } = await sb
      .from('cases')
      .insert({
        created_by: createdBy,
        assigned_to: input.assignedTo ?? null,
        job_type: input.jobType,
        client_or_site: input.clientOrSite ?? null,
        location: input.location ?? null,
        priority: input.priority,
        due_date: input.dueDate ?? null,
        due_time: input.dueTime ?? null,
        est_time: input.estTime ?? null,
        remind: input.remind ?? true,
        instructions: input.instructions ?? null,
        status: input.assignedTo ? 'assigned' : 'available',
      })
      .select('*')
      .single();

    if (error) throw error;

    // Assignment notification + push are created by the kt_notify_case
    // trigger (0017) — client-side inserts were silently blocked by RLS.

    return data ? rowToCase(data) : null;
  } catch (err) {
    console.error('[KT] createCase failed', err);
    return null;
  }
}

/**
 * Claim an available case (set assigned_to and status to 'assigned').
 */
export async function claimCase(id: string, employeeId: string): Promise<Case | null> {
  if (!HAS_SUPABASE) {
    const c = DEMO_CASES.find((x) => x.id === id);
    if (c && c.status === 'available') {
      c.assignedTo = employeeId;
      c.status = 'assigned';
    }
    return c ?? null;
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('cases')
      .update({ assigned_to: employeeId, status: 'assigned' })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data ? rowToCase(data) : null;
  } catch (err) {
    console.error('[KT] claimCase failed', err);
    return null;
  }
}

/**
 * Update case status and optionally add a review note.
 * When setting to 'needs_changes', a notification is created for the assignee.
 */
export async function setCaseStatus(
  id: string,
  status: Case['status'],
  reviewNote?: string | null,
): Promise<Case | null> {
  if (!HAS_SUPABASE) {
    const c = DEMO_CASES.find((x) => x.id === id);
    if (c) {
      c.status = status;
      if (reviewNote) c.reviewNote = reviewNote;
    }
    return c ?? null;
  }

  try {
    const sb = getSupabase();

    // Update the case
    const { data, error } = await sb
      .from('cases')
      .update({
        status,
        review_note: reviewNote ?? null,
        closed_at:
          status === 'closed' || status === 'approved'
            ? new Date().toISOString()
            : null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // The needs_changes notification + push are created by the
    // kt_notify_case trigger (0017).

    return data ? rowToCase(data) : null;
  } catch (err) {
    console.error('[KT] setCaseStatus failed', err);
    return null;
  }
}

/** Update an existing case's editable fields (staff). */
export async function updateCase(
  id: string,
  patch: Partial<CreateCaseInput>,
): Promise<Case | null> {
  if (!HAS_SUPABASE) {
    const c = DEMO_CASES.find((x) => x.id === id);
    if (c) {
      if (patch.jobType !== undefined) c.jobType = patch.jobType;
      if (patch.clientOrSite !== undefined) c.clientOrSite = patch.clientOrSite ?? null;
      if (patch.location !== undefined) c.location = patch.location ?? null;
      if (patch.priority !== undefined) c.priority = patch.priority;
      if (patch.dueDate !== undefined) c.dueDate = patch.dueDate ?? null;
      if (patch.dueTime !== undefined) c.dueTime = patch.dueTime ?? null;
      if (patch.estTime !== undefined) c.estTime = patch.estTime ?? null;
      if (patch.remind !== undefined) c.remind = patch.remind ?? true;
      if (patch.instructions !== undefined) c.instructions = patch.instructions ?? null;
      if (patch.assignedTo !== undefined) c.assignedTo = patch.assignedTo ?? null;
    }
    return c ?? null;
  }
  try {
    const sb = getSupabase();
    const row: Record<string, unknown> = {};
    if (patch.jobType !== undefined) row.job_type = patch.jobType;
    if (patch.clientOrSite !== undefined) row.client_or_site = patch.clientOrSite ?? null;
    if (patch.location !== undefined) row.location = patch.location ?? null;
    if (patch.priority !== undefined) row.priority = patch.priority;
    if (patch.dueDate !== undefined) row.due_date = patch.dueDate ?? null;
    if (patch.dueTime !== undefined) row.due_time = patch.dueTime ?? null;
    if (patch.estTime !== undefined) row.est_time = patch.estTime ?? null;
    if (patch.remind !== undefined) row.remind = patch.remind ?? true;
    if (patch.instructions !== undefined) row.instructions = patch.instructions ?? null;
    if (patch.assignedTo !== undefined) {
      row.assigned_to = patch.assignedTo ?? null;
      // Re-assigning a still-open case keeps its lifecycle sane.
      row.status = patch.assignedTo ? 'assigned' : 'available';
    }
    const { data, error } = await sb
      .from('cases')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data ? rowToCase(data) : null;
  } catch (err) {
    console.error('[KT] updateCase failed', err);
    return null;
  }
}

// ─── Shared UI helpers (DRY — single source of truth for all case screens) ──

export const CASE_STATUS_ORDER: Case['status'][] = [
  'available',
  'assigned',
  'in_progress',
  'submitted',
  'in_review',
  'needs_changes',
  'approved',
  'closed',
];

export const CASE_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

/** Map a case status to a Badge kind (used by every card/detail). */
export function caseStatusBadge(status: Case['status']): BadgeKind {
  switch (status) {
    case 'available':
      return 'draft';
    case 'assigned':
      return 'pending';
    case 'in_progress':
      return 'inProgress';
    case 'submitted':
      return 'submitted';
    case 'in_review':
      return 'inReview';
    case 'needs_changes':
      return 'flagged';
    case 'approved':
      return 'reviewed';
    case 'closed':
      return 'reviewed';
    default:
      return 'draft';
  }
}

/** i18n key for a case status label (e.g. cases.statusAssigned). */
export function caseStatusKey(status: Case['status']): string {
  const camel = status.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
  return `cases.status_${camel}`;
}

/** Priority accent colour, derived from the theme (no hardcoded palette). */
export function priorityColor(
  priority: Case['priority'],
  colors: { gold: string; muted: string; danger?: string },
): string {
  if (priority === 'urgent') return '#B53D2E';
  if (priority === 'high') return colors.danger ?? '#A04A2E';
  if (priority === 'low') return colors.muted;
  return colors.gold;
}

/**
 * Short human reference for a case, e.g. `KT-2026-1A2B`.
 * Mirrors the pattern in `format.ts` shortReportId but accepts a Case or an id.
 */
export function caseRef(c: Case | string): string {
  const id = typeof c === 'string' ? c : c.id;
  const tail = id.replace(/-/g, '').slice(-4).toUpperCase();
  return `KT-${new Date().getFullYear()}-${tail}`;
}

/**
 * Pure, locale-aware short due label (no i18n `t` needed): defers to
 * `relativeDate()` from format.ts, appending the time when supplied.
 * Returns '' when there is no due date.
 */
export function dueLabel(
  dueDate: string | null,
  dueTime?: string | null,
): string {
  if (!dueDate) return '';
  const base = relativeDate(dueDate);
  return dueTime ? `${base} · ${dueTime}` : base;
}

// ─── Case photos (reference by staff, evidence by the assigned employee) ────

const CASE_BUCKET = 'case-photos';

export interface CasePhoto {
  id: string;
  caseId: string;
  uploadedBy: string | null;
  storagePath: string;
  caption: string | null;
  createdAt: string;
}

function casePhotoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'cp-' + Math.random().toString(36).slice(2);
}

function extOf(blob: Blob): string {
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function listCasePhotos(caseId: string): Promise<CasePhoto[]> {
  if (!HAS_SUPABASE) return [];
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('case_photos')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      caseId: r.case_id as string,
      uploadedBy: r.uploaded_by as string | null,
      storagePath: r.storage_path as string,
      caption: r.caption as string | null,
      createdAt: r.created_at as string,
    }));
  } catch (err) {
    console.error('[KT] listCasePhotos failed', err);
    return [];
  }
}

/** Compress + upload one photo to the case, then store its metadata. */
export async function uploadCasePhoto(
  caseId: string,
  file: File,
  uploadedBy: string,
): Promise<CasePhoto | null> {
  if (!HAS_SUPABASE) return null;
  try {
    const sb = getSupabase();
    const blob = await compressPhoto(file);
    const id = casePhotoId();
    const path = `${caseId}/${id}.${extOf(blob)}`;
    const { error: upErr } = await sb.storage
      .from(CASE_BUCKET)
      .upload(path, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: false,
      });
    if (upErr && !/exist|duplicate/i.test(upErr.message)) throw upErr;
    const { data, error } = await sb
      .from('case_photos')
      .insert({ id, case_id: caseId, uploaded_by: uploadedBy, storage_path: path })
      .select('*')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      caseId: data.case_id,
      uploadedBy: data.uploaded_by,
      storagePath: data.storage_path,
      caption: data.caption,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[KT] uploadCasePhoto failed', err);
    return null;
  }
}

export async function deleteCasePhoto(photo: CasePhoto): Promise<void> {
  if (!HAS_SUPABASE) return;
  try {
    const sb = getSupabase();
    await sb.storage.from(CASE_BUCKET).remove([photo.storagePath]);
    await sb.from('case_photos').delete().eq('id', photo.id);
  } catch (err) {
    console.error('[KT] deleteCasePhoto failed', err);
  }
}

/** Signed URL to display a private case photo. */
export function getCasePhotoUrl(path: string): Promise<string | null> {
  return getPhotoUrl(path, 3600, CASE_BUCKET);
}

// ─── Case activity timeline + comments ──────────────────────────────────────

export type CaseActivityKind =
  | 'comment'
  | 'status'
  | 'assigned'
  | 'created'
  | 'submitted'
  | 'reopened';

export interface CaseActivity {
  id: string;
  caseId: string;
  actorId: string | null;
  actorName: string | null;
  kind: CaseActivityKind;
  body: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

/** Demo-mode in-memory activity, keyed by case id. */
const DEMO_ACTIVITY: Record<string, CaseActivity[]> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToActivity(r: any): CaseActivity {
  return {
    id: r.id as string,
    caseId: r.case_id as string,
    actorId: (r.actor_id ?? null) as string | null,
    actorName: (r.actor?.name ?? null) as string | null,
    kind: r.kind as CaseActivityKind,
    body: (r.body ?? null) as string | null,
    meta: (r.meta ?? null) as Record<string, unknown> | null,
    createdAt: r.created_at as string,
  };
}

/** Full timeline for a case (events + comments), oldest first. */
export async function listCaseActivity(caseId: string): Promise<CaseActivity[]> {
  if (!HAS_SUPABASE) return DEMO_ACTIVITY[caseId] ?? [];
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('case_activity')
      .select('id, case_id, actor_id, kind, body, meta, created_at, actor:employees!actor_id(name)')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToActivity);
  } catch (err) {
    console.error('[KT] listCaseActivity failed', err);
    return [];
  }
}

/** Post a comment to a case timeline. */
export async function addCaseComment(
  caseId: string,
  actorId: string,
  body: string,
): Promise<CaseActivity | null> {
  const text = body.trim();
  if (!text) return null;

  if (!HAS_SUPABASE) {
    const entry: CaseActivity = {
      id: 'c-' + Math.random().toString(36).slice(2),
      caseId,
      actorId,
      actorName: 'You',
      kind: 'comment',
      body: text,
      meta: null,
      createdAt: new Date().toISOString(),
    };
    DEMO_ACTIVITY[caseId] = [...(DEMO_ACTIVITY[caseId] ?? []), entry];
    return entry;
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('case_activity')
      .insert({ case_id: caseId, actor_id: actorId, kind: 'comment', body: text })
      .select('id, case_id, actor_id, kind, body, meta, created_at, actor:employees!actor_id(name)')
      .single();
    if (error) throw error;
    return data ? rowToActivity(data) : null;
  } catch (err) {
    console.error('[KT] addCaseComment failed', err);
    return null;
  }
}

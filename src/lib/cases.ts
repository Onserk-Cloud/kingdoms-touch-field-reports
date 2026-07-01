import { HAS_SUPABASE, getSupabase } from './supabase';

export interface Case {
  id: string;
  createdBy: string;
  assignedTo: string | null;
  jobType: string;
  clientOrSite: string | null;
  location: string | null;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  instructions: string | null;
  assignmentGroup: string | null;
  status: 'available' | 'assigned' | 'in_progress' | 'submitted' | 'needs_changes' | 'closed';
  reportId: string | null;
  reviewNote: string | null;
  createdAt: string;
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
    instructions: 'Check all units and report status',
    assignmentGroup: null,
    status: 'available',
    reportId: null,
    reviewNote: null,
    createdAt: new Date().toISOString(),
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
    priority: row.priority as 'high' | 'medium' | 'low',
    dueDate: row.due_date as string | null,
    instructions: row.instructions as string | null,
    assignmentGroup: row.assignment_group as string | null,
    status: row.status as Case['status'],
    reportId: row.report_id as string | null,
    reviewNote: row.review_note as string | null,
    createdAt: row.created_at as string,
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
      .select('*')
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
  priority: 'high' | 'medium' | 'low';
  dueDate?: string | null;
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
      instructions: input.instructions ?? null,
      assignmentGroup: null,
      status: input.assignedTo ? 'assigned' : 'available',
      reportId: null,
      reviewNote: null,
      createdAt: new Date().toISOString(),
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
        instructions: input.instructions ?? null,
        status: input.assignedTo ? 'assigned' : 'available',
      })
      .select('*')
      .single();

    if (error) throw error;

    // If assignedTo is set, create a notification
    if (data && input.assignedTo) {
      await sb.from('notifications').insert({
        recipient_id: input.assignedTo,
        type: 'case_assigned',
        case_id: data.id,
        ref_label: input.jobType,
        note: input.instructions ?? null,
      });
    }

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

    // Get the case first to find the assignee
    const { data: caseData } = await sb.from('cases').select('*').eq('id', id).single();

    // Update the case
    const { data, error } = await sb
      .from('cases')
      .update({
        status,
        review_note: reviewNote ?? null,
        closed_at: status === 'closed' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // If setting to 'needs_changes', notify the assignee
    if (data && status === 'needs_changes' && caseData?.assigned_to) {
      await sb.from('notifications').insert({
        recipient_id: caseData.assigned_to,
        type: 'case_needs_changes',
        case_id: id,
        ref_label: data.job_type,
        note: reviewNote ?? null,
      });
    }

    return data ? rowToCase(data) : null;
  } catch (err) {
    console.error('[KT] setCaseStatus failed', err);
    return null;
  }
}

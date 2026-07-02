/**
 * Shared domain types — these mirror the Supabase schema.
 * See `supabase/migrations/0001_init.sql` for the source of truth.
 */

export type Role = 'employee' | 'supervisor' | 'admin' | 'super_admin';

export type ReportStatus =
  | 'pending'
  | 'submitted'
  | 'reviewed'
  | 'needs_update';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  initials: string;
  avatar_color?: string | null;
  created_at: string;
  phone?: string | null;
  email?: string | null;
  skills?: string[] | null;
  avatar_url?: string | null;
}

export interface ReportRow {
  id: string;
  employee_id: string;
  job_type: string;
  location: string;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  description: string;
  notes: string | null;
  completion_confirmed: boolean;
  status: ReportStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface ReportPhotoRow {
  id: string;
  report_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

/** A "queued" report living in IndexedDB before sync. */
export interface OfflineReport {
  id: string; // local UUID
  employeeId: string;
  jobType: string;
  location: string;
  gps?: { lat: number; lng: number; accuracy: number } | null;
  description: string;
  notes?: string;
  completionConfirmed: boolean;
  createdAt: number;
  status:
    | 'draft'
    | 'pending'
    | 'syncing'
    | 'submitted'
    | 'reviewed'
    | 'needs_update'
    | 'error';
  remoteId?: string;
  error?: string;
  /** Note from the reviewer explaining what to fix (set on "request changes"). */
  reviewNote?: string;
  /** Optional priority carried from a linked case (used later by My Tickets). */
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}

export interface OfflinePhoto {
  id: string; // local UUID
  reportId: string; // local id
  blob: Blob;
  caption?: string;
  createdAt: number;
}

export type NotificationType = 'new_report' | 'reviewed' | 'needs_update';

/** A notification row — mirrors the Supabase `notifications` table. */
export interface OfflineNotification {
  id: string;
  recipientId: string;
  type: NotificationType | string;
  reportId: string | null;
  refLabel?: string | null;
  note?: string | null;
  read: boolean;
  createdAt: number;
}

/** A view-model used in lists / cards. */
export interface ReportView {
  id: string;
  remoteId?: string;
  title: string;
  jobType: string;
  location: string;
  employeeId: string;
  employeeName?: string;
  status: OfflineReport['status'] | ReportStatus;
  photoCount: number;
  createdAt: number;
  submittedAt?: number | null;
}

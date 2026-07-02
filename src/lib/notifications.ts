import { useEffect, useState } from 'react';
import { HAS_SUPABASE, getSupabase } from './supabase';
import { ktStore } from './offline-store';
import { DEMO_EMPLOYEES_BY_ID } from './auth';
import { useSessionStore } from '../store/session';

/**
 * Notifications layer.
 *
 * - Supabase mode: rows are created by a Postgres trigger
 *   (`kt_notify_report`) whenever a report's status changes, so the client
 *   only ever *reads* and marks them read. RLS scopes every query to the
 *   current employee, so reads/updates don't need a recipient id.
 * - Demo mode: there's no backend, so we create the rows client-side at the
 *   same status-change points and store them in IndexedDB.
 */

export interface KtNotification {
  id: string;
  type: 'new_report' | 'reviewed' | 'needs_update' | string;
  reportId: string | null;
  caseId: string | null;
  refLabel: string | null;
  note: string | null;
  read: boolean;
  createdAt: number;
}

export async function listNotifications(
  recipientId: string,
): Promise<KtNotification[]> {
  if (HAS_SUPABASE) {
    const sb = getSupabase();
    const { data } = await sb
      .from('notifications')
      .select('id, type, report_id, case_id, ref_label, note, read, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    return (data ?? []).map((n: Record<string, unknown>) => ({
      id: n.id as string,
      type: n.type as string,
      reportId: (n.report_id as string) ?? null,
      caseId: (n.case_id as string) ?? null,
      refLabel: (n.ref_label as string) ?? null,
      note: (n.note as string) ?? null,
      read: Boolean(n.read),
      createdAt: new Date(n.created_at as string).getTime(),
    }));
  }
  const list = await ktStore.listNotifications(recipientId);
  return list.map((n) => ({
    id: n.id,
    type: n.type,
    reportId: n.reportId,
    caseId: null,
    refLabel: n.refLabel ?? null,
    note: n.note ?? null,
    read: n.read,
    createdAt: n.createdAt,
  }));
}

export async function unreadCount(recipientId: string): Promise<number> {
  if (HAS_SUPABASE) {
    const sb = getSupabase();
    const { count } = await sb
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false);
    return count ?? 0;
  }
  return ktStore.unreadCount(recipientId);
}

export async function markRead(id: string): Promise<void> {
  if (HAS_SUPABASE) {
    const sb = getSupabase();
    await sb.from('notifications').update({ read: true }).eq('id', id);
  } else {
    await ktStore.markNotificationRead(id);
  }
}

/**
 * Snooze stub — true snoozing (hiding a notification and re-surfacing it
 * after a delay) needs backend scheduling that doesn't exist yet. For now it
 * simply marks the notification read so it stops counting as actionable; the
 * screen removes it from the current list. Swap the body for a real
 * `snoozed_until` write once the backend supports it.
 */
export async function snoozeNotification(id: string): Promise<void> {
  await markRead(id);
}

export async function markAllRead(recipientId: string): Promise<void> {
  if (HAS_SUPABASE) {
    const sb = getSupabase();
    await sb.from('notifications').update({ read: true }).eq('read', false);
  } else {
    await ktStore.markAllNotificationsRead(recipientId);
  }
}

/* ── Demo-only creation helpers (Supabase uses DB triggers) ────── */

/** A new / resubmitted report → notify every active staff member. */
export async function notifyNewReport(report: {
  id: string;
  jobType: string;
}): Promise<void> {
  if (HAS_SUPABASE) return; // trigger handles it
  const staff = Object.values(DEMO_EMPLOYEES_BY_ID).filter(
    (e) => e.role !== 'employee' && e.active,
  );
  for (const s of staff) {
    await ktStore.addNotification({
      recipientId: s.id,
      type: 'new_report',
      reportId: report.id,
      refLabel: report.jobType,
    });
  }
}

/** A report was reviewed / flagged → notify its author. */
export async function notifyReview(
  report: { id: string; employeeId: string; jobType: string },
  type: 'reviewed' | 'needs_update',
  note?: string,
): Promise<void> {
  if (HAS_SUPABASE) return; // trigger handles it
  await ktStore.addNotification({
    recipientId: report.employeeId,
    type,
    reportId: report.id,
    refLabel: report.jobType,
    note: note ?? null,
  });
}

/* ── Hook: unread badge count ─────────────────────────────────── */

export function useUnreadCount(): number {
  const me = useSessionStore((s) => s.employee);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!me) {
      setN(0);
      return;
    }
    let alive = true;
    const tick = () => {
      void unreadCount(me.id).then((c) => {
        if (alive) setN(c);
      });
    };
    tick();
    const iv = setInterval(tick, 25000);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener('focus', onFocus);
    };
  }, [me]);
  return n;
}

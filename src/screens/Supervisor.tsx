import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AdminTabBar } from '../components/TabBar';
import { Badge } from '../components/Badge';
import { Priority } from '../components/Priority';
import { BellIcon, ClockIcon } from '../components/Icons';
import { useTheme } from '../theme-context';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { ktStore } from '../lib/offline-store';
import { useUnreadCount } from '../lib/notifications';
import { useSessionStore } from '../store/session';
import {
  listAllCases,
  caseRef,
  caseStatusKey,
  dueLabel,
  type Case,
} from '../lib/cases';
import { formatDate, formatTime, initialsOf } from '../lib/format';
import { useI18n } from '../lib/i18n';

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  avatar_color: string | null;
}
interface ReviewReport {
  id: string;
  jobType: string;
  who: string;
  time: number;
}

export function Supervisor() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const me = useSessionStore((s) => s.employee);
  const unread = useUnreadCount();

  const [cases, setCases] = useState<Case[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [reviewReports, setReviewReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const cs = await listAllCases();
      setCases(cs);
      if (HAS_SUPABASE) {
        const sb = getSupabase();
        const [emps, reps] = await Promise.all([
          sb
            .from('employees')
            .select('id, name, initials, avatar_color')
            .eq('active', true)
            .eq('role', 'employee'),
          sb
            .from('reports')
            .select('id, job_type, submitted_at, created_at, employees!employee_id(name)')
            .eq('status', 'submitted')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        setTeam((emps.data ?? []) as TeamMember[]);
        setReviewReports(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (reps.data ?? []).map((r: any) => ({
            id: r.id,
            jobType: r.job_type,
            who: r.employees?.name ?? '—',
            time: new Date(r.submitted_at ?? r.created_at).getTime(),
          })),
        );
      } else {
        const local = (await ktStore.listReports()).filter(
          (r) => r.status === 'submitted',
        );
        setReviewReports(
          local.map((r) => ({
            id: r.id,
            jobType: r.jobType || 'Field Report',
            who: 'Field Tech',
            time: r.createdAt,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const today = todayStr();
    const done = (c: Case) => c.status === 'approved' || c.status === 'closed';
    const open = cases.filter((c) => !done(c));
    const byStatus = (s: Case['status']) =>
      cases.filter((c) => c.status === s).length;
    return {
      open: open.length,
      inProgress: byStatus('in_progress'),
      inReview: byStatus('submitted') + byStatus('in_review'),
      overdue: open.filter((c) => c.dueDate && c.dueDate < today).length,
      dueToday: open.filter((c) => c.dueDate === today).length,
      pipeline: [
        { key: 'available' as const, n: byStatus('available') },
        {
          key: 'assigned' as const,
          n: byStatus('assigned') + byStatus('needs_changes'),
        },
        { key: 'in_progress' as const, n: byStatus('in_progress') },
        {
          key: 'in_review' as const,
          n: byStatus('submitted') + byStatus('in_review'),
        },
        { key: 'done' as const, n: byStatus('approved') + byStatus('closed') },
      ],
    };
  }, [cases]);

  const attention = useMemo(() => {
    const today = todayStr();
    const rank = (c: Case): number => {
      if (c.dueDate && c.dueDate < today) return 0; // overdue
      if (c.status === 'submitted' || c.status === 'in_review') return 1; // to review
      if (c.dueDate === today) return 2; // due today
      return 9;
    };
    return cases
      .filter(
        (c) =>
          c.status !== 'closed' && c.status !== 'approved' && rank(c) < 9,
      )
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 4);
  }, [cases]);

  const workload = useMemo(() => {
    const today = todayStr();
    void today;
    const counts = new Map<string, number>();
    for (const c of cases) {
      if (c.status !== 'closed' && c.assignedTo)
        counts.set(c.assignedTo, (counts.get(c.assignedTo) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return team
      .map((m) => ({ ...m, n: counts.get(m.id) ?? 0 }))
      .filter((m) => m.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 4)
      .map((m) => ({ ...m, load: m.n / max }));
  }, [cases, team]);

  const attnTotal = stats.overdue + stats.dueToday + stats.inReview;

  // Pipeline column accent per status (design: kt-admin-1 dashboard).
  const pipelineAccent: Record<
    (typeof stats.pipeline)[number]['key'],
    string
  > = {
    available: colors.gold,
    assigned: colors.goldDeep,
    in_progress: colors.blue,
    in_review: colors.goldDeep,
    done: colors.forest,
  };

  return (
    <PhoneFrame bg={colors.ivory}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(160deg, ${colors.forestSoft} 0%, ${colors.forest} 55%, #15291d 100%)`,
          color: '#fff',
          padding: '56px 20px 30px',
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
        className="kt-safe-top"
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -40,
            width: 190,
            height: 190,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(196,152,76,0.25) 0%, transparent 65%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: me?.avatar_color ?? colors.gold,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
              border: '2px solid rgba(255,255,255,0.25)',
              flexShrink: 0,
            }}
          >
            {me ? me.initials || initialsOf(me.name) : 'KT'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
              {me?.name ?? 'Kingdoms Touch'}
            </div>
            <div style={{ marginTop: 3 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: colors.gold,
                  color: colors.forest,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 4l2.5 2L6 2l2.5 4L11 4l-1 6H2L1 4z"
                    fill="currentColor"
                  />
                </svg>
                {t('cases.roleSuperAdmin')}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            aria-label={t('supervisor.notifications')}
            className="kt-tap"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <BellIcon color="#fff" size={18} />
            {unread > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  minWidth: 17,
                  height: 17,
                  padding: '0 4px',
                  borderRadius: 999,
                  background: '#B53D2E',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1.5px solid ${colors.forest}`,
                }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 16,
            fontWeight: 500,
          }}
        >
          {formatDate(Date.now())} · {t('cases.hqLabel')}
        </div>
        <div
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: -0.4,
            marginTop: 2,
          }}
        >
          {t('cases.opsOverview')}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 208,
          bottom: 92,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '0 20px 24px',
        }}
        className="kt-scroll"
      >
        {/* Attention alert */}
        {attnTotal > 0 && (
          <div
            onClick={() => navigate('/cases')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/cases');
            }}
            className="kt-tap"
            style={{
              marginTop: -20,
              marginBottom: 16,
              background: '#fff',
              borderRadius: 18,
              padding: 14,
              border: `1px solid rgba(181,61,46,0.30)`,
              boxShadow: '0 8px 22px rgba(31,61,43,0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(181,61,46,0.10)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M11 2l9 16H2L11 2z"
                  stroke="#B53D2E"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 8v4M11 15h.01"
                  stroke="#B53D2E"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: colors.charcoal,
                }}
              >
                {t('cases.needAttentionTitle', { n: attnTotal })}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: colors.muted,
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                {t('cases.needAttentionSub', {
                  overdue: stats.overdue,
                  due: stats.dueToday,
                  review: stats.inReview,
                })}
              </div>
            </div>
            <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
              <path
                d="M1 1l6 6-6 6"
                stroke={colors.muted}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* KPI tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginTop: attnTotal > 0 ? 0 : 6,
          }}
        >
          {[
            { n: stats.open, label: t('cases.summaryOpen'), color: colors.gold },
            {
              n: stats.inProgress,
              label: t('cases.kpiInProgress'),
              color: colors.blue,
            },
            {
              n: stats.inReview,
              label: t('cases.kpiInReview'),
              color: colors.goldDeep,
            },
            {
              n: stats.overdue,
              label: t('cases.summaryOverdue'),
              color: '#B53D2E',
            },
          ].map((k) => (
            <div
              key={k.label}
              onClick={() => navigate('/cases')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/cases');
              }}
              className="kt-tap"
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '12px 6px',
                border: `1px solid ${colors.line}`,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: 24,
                  fontWeight: 600,
                  color: k.color,
                  letterSpacing: -0.3,
                }}
              >
                {k.n}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: colors.muted,
                  marginTop: 2,
                  letterSpacing: 0.2,
                  lineHeight: 1.1,
                }}
              >
                {k.label}
              </div>
            </div>
          ))}
        </div>

        {/* Create Case CTA */}
        <div
          onClick={() => navigate('/cases/new')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/cases/new');
          }}
          className="kt-tap"
          style={{
            marginTop: 16,
            height: 56,
            borderRadius: 16,
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDeep} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow:
              '0 6px 18px rgba(196,152,76,0.32), inset 0 1px 0 rgba(255,255,255,0.35)',
            color: colors.forest,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="10"
              r="9"
              stroke={colors.forest}
              strokeWidth="1.6"
            />
            <path
              d="M10 6v8M6 10h8"
              stroke={colors.forest}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {t('cases.createNewCase')}
        </div>

        {/* Pipeline */}
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.goldDeep,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {t('cases.pipeline')}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {stats.pipeline.map((p) => (
              <div
                key={p.key}
                onClick={() => navigate('/cases')}
                className="kt-tap"
                style={{
                  flex: 1,
                  background: '#fff',
                  borderRadius: 12,
                  padding: '10px 3px',
                  border: `1px solid ${colors.line}`,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 3,
                    borderRadius: 2,
                    background: pipelineAccent[p.key],
                    margin: '0 auto 7px',
                  }}
                />
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: colors.charcoal,
                  }}
                >
                  {p.n}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: colors.muted,
                    marginTop: 2,
                    letterSpacing: 0,
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.key === 'done'
                    ? t('cases.pipelineDone')
                    : t(caseStatusKey(p.key))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 22,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.goldDeep,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {t('cases.needsAttention')}
          </div>
          <div
            onClick={() => navigate('/cases')}
            className="kt-tap"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.forest,
              letterSpacing: 0.4,
              cursor: 'pointer',
            }}
          >
            {t('cases.allCases').toUpperCase()}
          </div>
        </div>
        {loading && (
          <div
            style={{
              padding: 16,
              textAlign: 'center',
              color: colors.muted,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t('common.loading')}
          </div>
        )}
        {!loading && attention.length === 0 && (
          <div
            style={{
              padding: 18,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 14,
              border: `1px solid ${colors.line}`,
              color: colors.muted,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {t('cases.noAttention')}
          </div>
        )}
        {attention.map((c) => {
          const today = todayStr();
          const overdue = !!c.dueDate && c.dueDate < today;
          const inReview = c.status === 'submitted' || c.status === 'in_review';
          const due =
            inReview && !overdue
              ? t('cases.needsReview')
              : dueLabel(c.dueDate, c.dueTime);
          return (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  navigate(`/cases/${c.id}`);
              }}
              className="kt-tap"
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 13,
                marginBottom: 10,
                border: `1px solid ${colors.line}`,
                display: 'flex',
                gap: 11,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 3,
                  borderRadius: 2,
                  background: overdue
                    ? '#B53D2E'
                    : inReview
                      ? colors.goldDeep
                      : colors.blue,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: colors.muted,
                      letterSpacing: 0.5,
                    }}
                  >
                    #{caseRef(c)}
                  </span>
                  <Priority level={c.priority} size="sm" />
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.charcoal,
                    letterSpacing: -0.1,
                    marginTop: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.jobType}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 0,
                    }}
                  >
                    {c.assigneeName ? (
                      <>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: c.assigneeColor ?? colors.forestSoft,
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 7.5,
                            fontWeight: 700,
                            letterSpacing: 0.3,
                            flexShrink: 0,
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                          }}
                        >
                          {c.assigneeInitials || initialsOf(c.assigneeName)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: colors.muted,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.assigneeName.split(' ')[0]}
                        </span>
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: colors.muted,
                          fontWeight: 600,
                        }}
                      >
                        {t('cases.unassigned')}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.1,
                      color: overdue
                        ? '#B53D2E'
                        : inReview
                          ? colors.goldDeep
                          : colors.forestSoft,
                      flexShrink: 0,
                    }}
                  >
                    {due}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Team workload */}
        {workload.length > 0 && (
          <div
            style={{
              marginTop: 12,
              background: '#fff',
              borderRadius: 16,
              padding: 16,
              border: `1px solid ${colors.line}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: colors.charcoal,
                }}
              >
                {t('cases.teamWorkload')}
              </div>
              <div
                onClick={() => navigate('/manage')}
                className="kt-tap"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.forest,
                  cursor: 'pointer',
                }}
              >
                {t('cases.manage').toUpperCase()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {workload.map((m) => (
                <div key={m.id} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      margin: '0 auto',
                      background: m.avatar_color ?? '#7FA66E',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {m.initials || initialsOf(m.name)}
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      background: colors.ivoryDeep,
                      marginTop: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${m.load * 100}%`,
                        borderRadius: 3,
                        background: m.load > 0.85 ? '#B53D2E' : colors.gold,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.muted,
                      marginTop: 4,
                    }}
                  >
                    {m.n}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports to review */}
        <div
          style={{
            marginTop: 22,
            marginBottom: 10,
            fontSize: 11,
            fontWeight: 700,
            color: colors.goldDeep,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {t('cases.reportsToReview')}
        </div>
        {!loading && reviewReports.length === 0 && (
          <div
            style={{
              padding: 18,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 14,
              border: `1px solid ${colors.line}`,
              color: colors.muted,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {t('supervisor.emptyReports')}
          </div>
        )}
        {reviewReports.slice(0, 8).map((r) => (
          <div
            key={r.id}
            onClick={() => navigate(`/supervisor/report/${r.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                navigate(`/supervisor/report/${r.id}`);
            }}
            className="kt-tap"
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 8,
              border: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: colors.charcoal,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.jobType}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  marginTop: 2,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {r.who} · <ClockIcon color={colors.muted} /> {formatTime(r.time)}
              </div>
            </div>
            <Badge kind="submitted" />
          </div>
        ))}
      </div>

      <AdminTabBar active="overview" />
    </PhoneFrame>
  );
}

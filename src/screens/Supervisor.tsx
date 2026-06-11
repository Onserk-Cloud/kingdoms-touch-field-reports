import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AdminTabBar } from '../components/TabBar';
import { LogoMark } from '../components/LogoMark';
import { Badge, type BadgeKind } from '../components/Badge';
import { BellIcon, ClockIcon, PhotoIcon } from '../components/Icons';
import { useTheme } from '../theme-context';
import { HAS_SUPABASE, getSupabase } from '../lib/supabase';
import { ktStore } from '../lib/offline-store';
import { useUnreadCount } from '../lib/notifications';
import { getDemoEmployee } from '../lib/auth';
import { formatDate, formatTime, initialsOf } from '../lib/format';
import { useI18n } from '../lib/i18n';
import type { OfflineReport, ReportRow } from '../lib/types';

interface CombinedRow {
  id: string;
  jobType: string;
  location: string;
  status: BadgeKind;
  who: string;
  time: number;
  photos: number;
  /** Whether this came from Supabase (remote) or only IndexedDB (local). */
  remote: boolean;
}

export function Supervisor() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const unread = useUnreadCount();
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'flagged' | 'reviewed'
  >('all');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      if (HAS_SUPABASE) {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('reports')
          .select(
            'id, job_type, location, status, submitted_at, created_at, employee_id, employees!employee_id(name), report_photos(id)',
          )
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        const list = (data ?? []).map((r: any) => ({
          id: r.id as string,
          jobType: r.job_type as string,
          location: r.location as string,
          status: r.status as BadgeKind,
          who: r.employees?.name ?? 'Unknown',
          time: new Date(r.submitted_at ?? r.created_at).getTime(),
          photos: r.report_photos?.length ?? 0,
          remote: true,
        }));
        setRows(list);
      } else {
        // Demo mode — use local IndexedDB + demo seed. Exclude the states a
        // real backend never exposes to a supervisor (private drafts, sync
        // errors), so the demo dashboard matches the Supabase path.
        const local = (await ktStore.listReports()).filter(
          (r) => r.status !== 'draft' && r.status !== 'error',
        );
        const photos: Record<string, number> = {};
        for (const r of local) {
          const ps = await ktStore.listPhotos(r.id);
          photos[r.id] = ps.length;
        }
        const list: CombinedRow[] = local.map((r) => ({
          id: r.id,
          jobType: r.jobType || 'Field Report',
          location: r.location || '—',
          status: mapStatus(r.status),
          who: getDemoEmployee(r.employeeId)?.name ?? 'Field Tech',
          time: r.createdAt,
          photos: photos[r.id] ?? 0,
          remote: false,
        }));
        setRows(list);
      }
    } catch (err) {
      console.error('[KT] supervisor load failed', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tStart = today.getTime();
    return {
      total: rows.length,
      today: rows.filter((r) => r.time >= tStart).length,
      pending: rows.filter((r) => r.status === 'pending').length,
      flagged: rows.filter((r) => r.status === 'flagged').length,
      completed: rows.filter(
        (r) => r.status === 'submitted' || r.status === 'reviewed',
      ).length,
    };
  }, [rows]);

  const employees = useMemo(() => {
    const map = new Map<string, { name: string; n: number; color: string }>();
    const palette = ['#7FA66E', colors.gold, colors.sage, colors.forestSoft];
    for (const r of rows) {
      const existing = map.get(r.who);
      if (existing) existing.n += 1;
      else
        map.set(r.who, {
          name: r.who,
          n: 1,
          color: palette[map.size % palette.length],
        });
    }
    return Array.from(map.values()).slice(0, 4);
  }, [rows, colors]);

  const visible = rows.filter((r) => filter === 'all' || r.status === filter);

  return (
    <PhoneFrame bg={colors.ivory}>
      <div
        style={{
          background: '#fff',
          padding: '58px 20px 14px',
          borderBottom: `1px solid ${colors.line}`,
        }}
        className="kt-safe-top"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: colors.forest,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogoMark size={26} variant="white" />
          </div>
          <div style={{ flex: 1, lineHeight: 1.1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colors.goldDeep,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}
            >
              {t('supervisor.eyebrow')}
            </div>
            <div
              style={{
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: 20,
                fontWeight: 500,
                color: colors.charcoal,
                letterSpacing: -0.3,
                marginTop: 2,
              }}
            >
              {t('supervisor.title')}
            </div>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            aria-label={t('supervisor.notifications')}
            className="kt-tap"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: colors.ivory,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BellIcon color={colors.charcoal} size={18} />
            {unread > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 1,
                  right: 1,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 999,
                  background: '#E74E3C',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #fff',
                }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 132,
          bottom: 92,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '18px 20px 30px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.muted,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {t('supervisor.todayDate', { date: formatDate(Date.now()) })}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(143,165,139,0.20)',
              fontSize: 11,
              fontWeight: 700,
              color: colors.forestSoft,
              letterSpacing: 0.4,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: '#7FD692',
              }}
            />
            {t('supervisor.onlineCount', { n: employees.length })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Stat n={counts.today} label={t('supervisor.statToday')} dark />
          <Stat
            n={counts.pending}
            label={t('supervisor.statPending')}
            tint={colors.goldDeep}
          />
          <Stat
            n={counts.flagged}
            label={t('supervisor.statNeedsUpdate')}
            tint="#A04A2E"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 16,
              background: '#fff',
              border: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(143,165,139,0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 9.5l5 5L16 4"
                  stroke={colors.forest}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.charcoal,
                }}
              >
                {counts.completed}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: colors.muted,
                  letterSpacing: 0.3,
                }}
              >
                {t('supervisor.completedJobs')}
              </div>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 16,
              background: 'rgba(196,152,76,0.10)',
              border: `1px solid rgba(196,152,76,0.30)`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: colors.gold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 8a6 6 0 0112 0M5 8a3 3 0 016 0"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="10" r="1.3" fill="#fff" />
                <path
                  d="M1 1l14 14"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.charcoal,
                }}
              >
                {counts.pending}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: colors.goldDeep,
                  letterSpacing: 0.3,
                }}
              >
                {t('supervisor.offlineAwaitingSync')}
              </div>
            </div>
          </div>
        </div>

        {employees.length > 0 && (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              background: '#fff',
              borderRadius: 16,
              border: `1px solid ${colors.line}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.charcoal,
                  letterSpacing: 0.2,
                }}
              >
                {t('supervisor.teamActivity')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {employees.map((e) => (
                <div key={e.name} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      margin: '0 auto',
                      background: e.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 0.3,
                      border: `2px solid ${colors.ivory}`,
                      boxShadow: `0 0 0 1px ${colors.line}`,
                    }}
                  >
                    {initialsOf(e.name)}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Cinzel, Georgia, serif',
                      fontSize: 17,
                      fontWeight: 600,
                      color: colors.charcoal,
                      marginTop: 6,
                      lineHeight: 1,
                    }}
                  >
                    {e.n}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: colors.muted,
                      fontWeight: 600,
                      marginTop: 1,
                    }}
                  >
                    {e.name.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            {t('supervisor.recentReports')}
          </div>
          <button
            onClick={() =>
              setFilter((f) => {
                const order = [
                  'all',
                  'pending',
                  'flagged',
                  'reviewed',
                ] as const;
                return order[(order.indexOf(f) + 1) % order.length];
              })
            }
            className="kt-tap"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: filter === 'all' ? colors.charcoal : colors.goldDeep,
                letterSpacing: 0.2,
              }}
            >
              {filter === 'all'
                ? t('supervisor.filter')
                : filter === 'pending'
                  ? t('supervisor.statPending')
                  : filter === 'flagged'
                    ? t('supervisor.statNeedsUpdate')
                    : t('badge.reviewed')}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 3l3 4 3-4"
                stroke={filter === 'all' ? colors.charcoal : colors.goldDeep}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {loading && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: colors.muted,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t('common.loading')}
          </div>
        )}

        {error && !loading && rows.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 14,
              border: `1px solid ${colors.line}`,
              color: colors.muted,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <div style={{ marginBottom: 14 }}>{t('common.loadError')}</div>
            <button
              onClick={() => void load()}
              className="kt-tap"
              style={{
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 12,
                background: colors.forest,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {visible.length === 0 && !loading && !(error && rows.length === 0) && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 14,
              border: `1px solid ${colors.line}`,
              color: colors.muted,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {t('supervisor.emptyReports')}
          </div>
        )}

        {visible.slice(0, 12).map((r) => (
          <div
            key={r.id}
            onClick={() => navigate(`/supervisor/report/${r.id}`)}
            role="button"
            tabIndex={0}
            aria-label={r.jobType}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/supervisor/report/${r.id}`);
              }
            }}
            className="kt-tap"
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 14,
              marginBottom: 10,
              border: `1px solid ${colors.line}`,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.charcoal,
                    letterSpacing: -0.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.jobType}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    marginTop: 3,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.who} · {r.location}
                </div>
              </div>
              <Badge kind={r.status} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginTop: 10,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: colors.muted,
                  fontWeight: 600,
                }}
              >
                <ClockIcon color={colors.muted} />
                {formatTime(r.time)}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: colors.muted,
                  fontWeight: 600,
                }}
              >
                <PhotoIcon color={colors.muted} />
                {t('supervisor.photosCount', { n: r.photos })}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.forest,
                  letterSpacing: 0.4,
                }}
              >
                {t('supervisor.open')}
              </span>
            </div>
          </div>
        ))}
      </div>
      <AdminTabBar active="overview" />
    </PhoneFrame>
  );
}

function Stat({
  n,
  label,
  tint,
  dark,
}: {
  n: number;
  label: string;
  tint?: string;
  dark?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <div
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        background: dark ? colors.forest : '#fff',
        color: dark ? '#fff' : colors.charcoal,
        border: `1px solid ${dark ? 'transparent' : colors.line}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {dark && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(196,152,76,0.30) 0%, transparent 70%)',
          }}
        />
      )}
      <div
        style={{
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: -0.4,
          color: dark ? colors.gold : (tint ?? colors.forest),
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          marginTop: 4,
          color: dark ? 'rgba(255,255,255,0.7)' : colors.muted,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function mapStatus(s: OfflineReport['status']): BadgeKind {
  switch (s) {
    case 'submitted':
      return 'submitted';
    case 'reviewed':
      return 'reviewed';
    case 'needs_update':
      return 'flagged';
    case 'pending':
      return 'pending';
    case 'syncing':
      return 'pending';
    case 'error':
      return 'flagged';
    default:
      return 'draft';
  }
}

// Keep imports used (TS noUnusedLocals)
export type _Unused = ReportRow;

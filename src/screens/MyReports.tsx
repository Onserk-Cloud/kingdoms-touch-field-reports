import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { TabBar } from '../components/TabBar';
import { Badge, type BadgeKind } from '../components/Badge';
import { ClockIcon, PhotoIcon } from '../components/Icons';
import { useTheme } from '../theme-context';
import { useSessionStore } from '../store/session';
import { ktStore } from '../lib/offline-store';
import { relativeDate } from '../lib/format';
import { useI18n } from '../lib/i18n';
import type { OfflineReport } from '../lib/types';

type ChipKey = 'all' | 'week' | 'pending' | 'reviewed';

export function MyReports() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const employee = useSessionStore((s) => s.employee);
  const [reports, setReports] = useState<OfflineReport[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [chip, setChip] = useState<ChipKey>('all');
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const list = await ktStore.listReports(employee.id);
        const counts: Record<string, number> = {};
        for (const r of list) {
          const ph = await ktStore.listPhotos(r.id);
          counts[r.id] = ph.length;
        }
        if (cancelled) return;
        setReports(list);
        setPhotoCounts(counts);
      } catch {
        if (cancelled) return;
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee, reloadKey]);

  const filtered = useMemo(() => {
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const list = reports.filter((r) => {
      if (chip === 'week' && r.createdAt < week) return false;
      if (chip === 'pending' && r.status !== 'pending') return false;
      if (chip === 'reviewed' && r.status !== 'reviewed') return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.jobType.toLowerCase().includes(s) ||
          r.location.toLowerCase().includes(s)
        );
      }
      return true;
    });
    return [...list].sort((a, b) =>
      sortAsc ? a.createdAt - b.createdAt : b.createdAt - a.createdAt,
    );
  }, [reports, chip, search, sortAsc]);

  const submitted = reports.filter((r) => r.status === 'submitted').length;
  const pending = reports.filter((r) => r.status === 'pending').length;

  const badgeFor = (s: OfflineReport['status']): BadgeKind => {
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
  };

  // Keep the left accent bar in sync with the badge colour.
  const barColorFor = (s: OfflineReport['status']): string => {
    switch (badgeFor(s)) {
      case 'submitted':
      case 'reviewed':
        return colors.forest;
      case 'pending':
        return colors.gold;
      case 'flagged':
        return colors.danger;
      default:
        return colors.muted;
    }
  };

  // Drafts open the editor so the employee can finish them; everything else
  // opens the read-only detail.
  const openReport = (r: OfflineReport) =>
    navigate(r.status === 'draft' ? `/report/${r.id}/edit` : `/report/${r.id}`);

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('myReports.title')}
        eyebrow={t('myReports.eyebrow', { submitted, pending })}
        back={false}
        trailing={
          <button
            aria-label={t('myReports.sort')}
            onClick={() => setSortAsc((v) => !v)}
            className="kt-tap"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: colors.ivory,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ transform: sortAsc ? 'scaleY(-1)' : undefined }}
            >
              <path
                d="M2 4h12M4 8h8M6 12h4"
                stroke={colors.charcoal}
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        }
      />

      <div style={{ padding: '14px 20px 0', background: colors.ivory }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            height: 46,
            padding: '0 14px',
            border: `1px solid ${colors.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="7"
              cy="7"
              r="5"
              stroke={colors.muted}
              strokeWidth="1.6"
            />
            <path
              d="M11 11l3 3"
              stroke={colors.muted}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('myReports.searchPlaceholder')}
            aria-label={t('myReports.searchPlaceholder')}
            className="kt-input"
          />
        </div>
      </div>

      <div
        className="kt-scroll"
        style={{
          padding: '12px 20px 0',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          background: colors.ivory,
        }}
      >
        {[
          {
            k: 'all' as const,
            label: t('myReports.chipAll', { n: reports.length }),
          },
          { k: 'week' as const, label: t('myReports.chipWeek') },
          { k: 'pending' as const, label: t('myReports.chipPending') },
          { k: 'reviewed' as const, label: t('myReports.chipReviewed') },
        ].map((c) => {
          const active = chip === c.k;
          return (
            <button
              key={c.k}
              onClick={() => setChip(c.k)}
              className="kt-tap"
              style={{
                padding: '7px 13px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: active ? colors.forest : '#fff',
                color: active ? '#fff' : colors.ink,
                border: `1px solid ${active ? colors.forest : colors.line}`,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 218,
          bottom: 92,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '16px 20px 30px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.muted,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          {t('myReports.recent')}
        </div>
        {loading && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: colors.muted,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t('common.loading')}
          </div>
        )}
        {!loading && error && (
          <div
            role="alert"
            style={{
              padding: '24px 20px',
              textAlign: 'center',
              background: colors.dangerSoft,
              border: `1px solid ${colors.dangerLine}`,
              borderRadius: 16,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                color: colors.danger,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              {t('common.loadError')}
            </div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="kt-tap"
              style={{
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                background: colors.danger,
                color: '#fff',
                border: 'none',
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: colors.muted,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t('myReports.emptyState')}
          </div>
        )}
        {!loading &&
          !error &&
          filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => openReport(r)}
              role="button"
              tabIndex={0}
              aria-label={r.jobType || t('myReports.untitled')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openReport(r);
                }
              }}
              className="kt-tap"
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
                border: `1px solid ${colors.line}`,
                display: 'flex',
                alignItems: 'stretch',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 3,
                  borderRadius: 2,
                  flexShrink: 0,
                  background: barColorFor(r.status),
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
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: colors.charcoal,
                      letterSpacing: -0.1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.jobType || t('myReports.untitled')}
                  </div>
                  <Badge kind={badgeFor(r.status)} />
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: colors.muted,
                    marginTop: 3,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.location}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 8,
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
                    {relativeDate(r.createdAt)}
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
                    {t('myReports.photoCount', { n: photoCounts[r.id] ?? 0 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
      <TabBar active="reports" />
    </PhoneFrame>
  );
}

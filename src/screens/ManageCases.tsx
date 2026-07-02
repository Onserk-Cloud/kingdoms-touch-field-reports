import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AdminTabBar } from '../components/TabBar';
import { LogoMark } from '../components/LogoMark';
import { CaseCard } from '../components/CaseCard';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import {
  listAllCases,
  caseStatusKey,
  CASE_STATUS_ORDER,
  type Case,
} from '../lib/cases';

/** Local 'YYYY-MM-DD' (matches the date column format). */
function todayStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Approved and closed cases are done — everything else is active work. */
function isDone(c: Case): boolean {
  return c.status === 'approved' || c.status === 'closed';
}

export function ManageCases() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    Case['status'] | 'all' | 'open' | 'overdue' | 'high'
  >('all');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setCases(await listAllCases());
    } finally {
      setLoading(false);
    }
  }

  // KPI counts derived from the real status pipeline (no aliasing).
  const summary = useMemo(() => {
    const today = todayStr();
    const active = cases.filter((c) => !isDone(c));
    return {
      open: active.length,
      inReview: cases.filter((c) => c.status === 'in_review').length,
      overdue: active.filter((c) => c.dueDate && c.dueDate < today).length,
      high: active.filter((c) => c.priority === 'high').length,
    };
  }, [cases]);

  // One chip per real workflow status, always in pipeline order —
  // 'In review' and 'Approved' stay visible even when currently empty.
  const filterChips: Array<Case['status'] | 'all'> = [
    'all',
    ...CASE_STATUS_ORDER,
  ];

  const visible = cases.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'open') return !isDone(c);
    if (filter === 'overdue')
      return !isDone(c) && !!c.dueDate && c.dueDate < todayStr();
    if (filter === 'high') return !isDone(c) && c.priority === 'high';
    return c.status === filter;
  });

  return (
    <PhoneFrame bg={colors.ivory}>
      {/* Header band */}
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
              {t('cases.eyebrow')}
            </div>
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 20,
                fontWeight: 500,
                color: colors.charcoal,
                letterSpacing: -0.3,
                marginTop: 2,
              }}
            >
              {t('cases.tabTitle')}
            </div>
          </div>
          <button
            onClick={() => navigate('/cases/new')}
            aria-label={t('cases.newCase')}
            className="kt-tap"
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 12,
              background: colors.forest,
              color: '#fff',
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
            {t('cases.newCase')}
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
          padding: '16px 20px 30px',
        }}
      >
        {/* Summary — KPI tiles derived from the real status pipeline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <SummaryStat
            n={summary.open}
            label={t('cases.summaryOpen')}
            tint={colors.forest}
            colors={colors}
            active={filter === 'open'}
            onClick={() => setFilter((f) => (f === 'open' ? 'all' : 'open'))}
          />
          <SummaryStat
            n={summary.inReview}
            label={t('cases.status_inReview')}
            tint={colors.gold}
            colors={colors}
            active={filter === 'in_review'}
            onClick={() =>
              setFilter((f) => (f === 'in_review' ? 'all' : 'in_review'))
            }
          />
          <SummaryStat
            n={summary.overdue}
            label={t('cases.summaryOverdue')}
            tint="#A04A2E"
            colors={colors}
            active={filter === 'overdue'}
            onClick={() =>
              setFilter((f) => (f === 'overdue' ? 'all' : 'overdue'))
            }
          />
          <SummaryStat
            n={summary.high}
            label={t('cases.summaryHigh')}
            tint={colors.goldDeep}
            colors={colors}
            active={filter === 'high'}
            onClick={() => setFilter((f) => (f === 'high' ? 'all' : 'high'))}
          />
        </div>

        {/* Filter chips */}
        <div
          className="kt-scroll"
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 12,
          }}
        >
          {filterChips.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="kt-tap"
                style={{
                  flexShrink: 0,
                  padding: '7px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: `1.5px solid ${on ? colors.forest : colors.line}`,
                  background: on ? colors.forest : '#fff',
                  color: on ? '#fff' : colors.muted,
                }}
              >
                {f === 'all' ? t('cases.filterAll') : t(caseStatusKey(f))}
              </button>
            );
          })}
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

        {!loading && visible.length === 0 && (
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
            {t('cases.empty')}
          </div>
        )}

        {visible.map((c) => (
          <CaseCard
            key={c.id}
            c={c}
            onClick={() => navigate(`/cases/${c.id}`)}
          />
        ))}
      </div>

      <AdminTabBar active="cases" />
    </PhoneFrame>
  );
}

function SummaryStat({
  n,
  label,
  tint,
  colors,
  onClick,
  active,
}: {
  n: number;
  label: string;
  tint: string;
  colors: { line: string; muted: string };
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={onClick ? 'kt-tap' : undefined}
      style={{
        padding: '12px 6px',
        background: '#fff',
        borderRadius: 14,
        border: `1.5px solid ${active ? tint : colors.line}`,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 24,
          fontWeight: 600,
          color: tint,
          letterSpacing: -0.3,
          lineHeight: 1,
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          color: colors.muted,
          marginTop: 4,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
          lineHeight: 1.15,
        }}
      >
        {label}
      </div>
    </div>
  );
}

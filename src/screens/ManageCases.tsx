import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppBar } from '../components/AppBar';
import { Badge } from '../components/Badge';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { listAllCases } from '../lib/cases';
import { formatDate } from '../lib/format';
import type { Case } from '../lib/cases';
import type { BadgeKind } from '../components/Badge';

function caseStatusToBadge(status: Case['status']): BadgeKind {
  switch (status) {
    case 'available':
      return 'draft';
    case 'assigned':
    case 'in_progress':
      return 'pending';
    case 'submitted':
      return 'submitted';
    case 'needs_changes':
      return 'flagged';
    case 'closed':
      return 'reviewed';
    default:
      return 'draft';
  }
}

export function ManageCases() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Case['status'] | 'all'>('all');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await listAllCases();
      setCases(list);
    } finally {
      setLoading(false);
    }
  }

  const filtered = cases.filter((c) => filter === 'all' || c.status === filter);

  return (
    <PhoneFrame bg={colors.ivory}>
      <AppBar
        title={t('cases.manageTitle')}
        eyebrow={t('cases.eyebrow')}
        onBack={() => navigate('/supervisor')}
      />

      <div
        style={{
          position: 'absolute',
          top: 110,
          right: 0,
          left: 0,
          padding: '0 20px 12px',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={() => navigate('/cases/new')}
          className="kt-tap"
          style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            background: colors.forest,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {t('cases.newCase')}
        </button>
        <button
          onClick={() => {
            const order: (Case['status'] | 'all')[] = [
              'all',
              'available',
              'assigned',
              'in_progress',
              'submitted',
              'closed',
            ];
            setFilter((f) => order[(order.indexOf(f) + 1) % order.length]);
          }}
          className="kt-tap"
          style={{
            padding: '0 12px',
            borderRadius: 12,
            border: `1.5px solid ${colors.line}`,
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {filter === 'all' ? t('cases.filterAll') : filter}
        </button>
      </div>

      <div
        className="kt-scroll"
        style={{
          position: 'absolute',
          top: 165,
          bottom: 0,
          left: 0,
          right: 0,
          overflow: 'auto',
          padding: '18px 20px 40px',
        }}
      >
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

        {!loading && filtered.length === 0 && (
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

        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/cases/${c.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/cases/${c.id}`);
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
                  {c.jobType}
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
                  {c.location ?? '—'}
                </div>
              </div>
              <Badge kind={caseStatusToBadge(c.status)} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 10,
              }}
            >
              {c.dueDate && (
                <span
                  style={{
                    fontSize: 11,
                    color: colors.muted,
                    fontWeight: 600,
                  }}
                >
                  {t('cases.dueDateShort')}: {formatDate(new Date(c.dueDate).getTime())}
                </span>
              )}
              {c.priority !== 'medium' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      c.priority === 'high'
                        ? '#A04A2E'
                        : colors.gold,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {c.priority}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}

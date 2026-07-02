import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import {
  caseRef,
  caseStatusBadge,
  caseStatusKey,
  dueLabel,
  priorityColor,
  type Case,
} from '../lib/cases';
import { Badge } from './Badge';
import { Priority } from './Priority';

export function CaseCard({
  c,
  onClick,
  subtitle,
}: {
  c: Case;
  onClick: () => void;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const displaySubtitle = subtitle ?? c.location ?? c.clientOrSite ?? '';

  // Leading accent: urgent → red, in_progress → blue, else priority accent.
  const accentColor =
    c.priority === 'urgent'
      ? '#B53D2E'
      : c.status === 'in_progress'
        ? colors.blue
        : priorityColor(c.priority, colors);

  const due = dueLabel(c.dueDate, c.dueTime);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
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
        display: 'flex',
        gap: 12,
        alignItems: 'stretch',
      }}
    >
      {/* Leading accent bar */}
      <div
        style={{
          width: 3,
          borderRadius: 3,
          background: accentColor,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* row1: ref eyebrow + priority */}
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
              letterSpacing: 0.6,
            }}
          >
            #{caseRef(c)}
          </span>
          <Priority level={c.priority} size="sm" />
        </div>

        {/* row2: job title */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: colors.charcoal,
            letterSpacing: -0.1,
            marginTop: 5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {c.jobType}
        </div>

        {/* row3: location / subtitle */}
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
          {displaySubtitle || '—'}
        </div>

        {/* row4: due (left) + status badge (right) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 10,
          }}
        >
          {c.dueDate ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: colors.muted,
                fontWeight: 600,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle
                  cx="6.5"
                  cy="6.5"
                  r="5.7"
                  stroke={colors.muted}
                  strokeWidth="1.2"
                />
                <path
                  d="M6.5 3.5v3l2 1.5"
                  stroke={colors.muted}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {due}
              </span>
            </span>
          ) : (
            <span />
          )}
          <Badge
            kind={caseStatusBadge(c.status)}
            label={t(caseStatusKey(c.status))}
          />
        </div>
      </div>
    </div>
  );
}

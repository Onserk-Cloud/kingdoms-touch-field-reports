import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import {
  caseStatusBadge,
  caseStatusKey,
  priorityColor,
  type Case,
} from '../lib/cases';
import { Badge } from './Badge';
import { formatDate } from '../lib/format';

export function CaseCard({ c, onClick, subtitle }: { c: Case; onClick: () => void; subtitle?: string }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const displaySubtitle = subtitle ?? c.location ?? c.clientOrSite ?? '';

  const priorityCapitalized = c.priority.charAt(0).toUpperCase() + c.priority.slice(1);

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
            {displaySubtitle || '—'}
          </div>
        </div>
        <Badge
          kind={caseStatusBadge(c.status)}
          label={t(caseStatusKey(c.status))}
        />
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
              color: priorityColor(c.priority, colors),
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {t(`cases.priority${priorityCapitalized}`)}
          </span>
        )}
      </div>
    </div>
  );
}

import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';

export type BadgeKind =
  | 'submitted'
  | 'pending'
  | 'reviewed'
  | 'completed'
  | 'flagged'
  | 'draft';

interface BadgeProps {
  kind: BadgeKind;
  label?: string;
}

export function Badge({ kind, label }: BadgeProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const map: Record<
    BadgeKind,
    { bg: string; fg: string; label: string; dot: string }
  > = {
    submitted: {
      bg: 'rgba(143,165,139,0.18)',
      fg: colors.forestSoft,
      label: t('badge.submitted'),
      dot: colors.sage,
    },
    pending: {
      bg: 'rgba(196,152,76,0.16)',
      fg: colors.goldDeep,
      label: t('badge.pending'),
      dot: colors.gold,
    },
    reviewed: {
      bg: colors.forest,
      fg: '#fff',
      label: t('badge.reviewed'),
      dot: colors.goldSoft,
    },
    completed: {
      bg: 'rgba(143,165,139,0.18)',
      fg: colors.forestSoft,
      label: t('badge.completed'),
      dot: colors.forest,
    },
    flagged: {
      bg: 'rgba(180,90,60,0.12)',
      fg: '#A04A2E',
      label: t('badge.flagged'),
      dot: '#A04A2E',
    },
    draft: {
      bg: 'rgba(31,61,43,0.06)',
      fg: colors.muted,
      label: t('badge.draft'),
      dot: colors.muted,
    },
  };

  // Defensive: an unknown kind (e.g. a raw DB status that slipped through)
  // must never crash the whole app — fall back to the neutral draft style.
  const m = map[kind] ?? map.draft;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 9px 4px 8px',
        borderRadius: 999,
        background: m.bg,
        color: m.fg,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: m.dot,
        }}
      />
      {label ?? m.label}
    </span>
  );
}

import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';
import { priorityColor, type Case } from '../lib/cases';

type Level = Case['priority'];

/**
 * Priority pill — a rounded (radius 8) chip with a 3-bar signal glyph + label,
 * coloured per level. Urgent renders solid red; the rest use a soft tint of the
 * level accent from `priorityColor()`. Rendered for ALL levels (incl. medium).
 *
 * Ported from Material/kt-primitives.jsx → KTPriority.
 */
export function Priority({
  level,
  size = 'md',
}: {
  level: Level;
  size?: 'sm' | 'md';
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const accent = priorityColor(level, colors);
  const solid = level === 'urgent';

  // Number of "lit" bars scales with severity.
  const bars = level === 'low' ? 1 : level === 'medium' ? 2 : 3;

  // Solid urgent → red fill, white text. Others → soft tint of the accent.
  const bg = solid ? '#B53D2E' : softTint(level);
  const fg = solid ? '#fff' : accent;

  const sm = size === 'sm';
  const label = t(
    `cases.priority${level.charAt(0).toUpperCase()}${level.slice(1)}`,
  );

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: sm ? '3px 8px' : '5px 10px',
        borderRadius: 8,
        background: bg,
        color: fg,
        fontSize: sm ? 10 : 11,
        fontWeight: 800,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'flex-end',
          gap: 1.5,
          height: 10,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 2.5,
              height: 4 + i * 3,
              borderRadius: 1,
              background:
                i < bars
                  ? solid
                    ? '#fff'
                    : fg
                  : solid
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(0,0,0,0.14)',
            }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

/** Soft background tint per level (non-urgent). */
function softTint(level: Level): string {
  if (level === 'high') return 'rgba(180,110,60,0.14)';
  if (level === 'low') return 'rgba(143,165,139,0.16)';
  // medium
  return 'rgba(201,162,77,0.15)';
}

import type { CSSProperties } from 'react';
import { useTheme } from '../theme-context';

interface PhotoTileProps {
  label?: string;
  width?: number | string;
  height?: number;
  dark?: boolean;
  src?: string;
  onClick?: () => void;
  onRemove?: () => void;
  style?: CSSProperties;
}

/**
 * Photo placeholder / preview tile. When `src` is provided, displays the
 * actual image. Otherwise renders a striped placeholder matching the prototype.
 */
export function PhotoTile({
  label,
  width = '100%',
  height = 110,
  dark = false,
  src,
  onClick,
  onRemove,
  style,
}: PhotoTileProps) {
  const { colors } = useTheme();
  const stripe = dark
    ? 'repeating-linear-gradient(45deg, #2A5238 0 8px, #1F3D2B 8px 16px)'
    : 'repeating-linear-gradient(45deg, #EDE7D5 0 8px, #E3DCC4 8px 16px)';

  return (
    <div
      onClick={onClick}
      className={onClick ? 'kt-tap' : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (label ?? 'Photo') : undefined}
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
      style={{
        width,
        height,
        borderRadius: 14,
        background: src ? '#000' : stripe,
        border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : colors.line}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: dark ? 'rgba(255,255,255,0.7)' : colors.muted,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 10.5,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        overflow: 'hidden',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={label ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        label
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove photo"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M7.5 2.5L2.5 7.5M2.5 2.5l5 5"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { useTheme } from '../theme-context';

interface BaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
}

interface PrimaryProps extends BaseProps {
  color?: 'forest' | 'gold';
}

export function PrimaryButton({
  children,
  color = 'forest',
  fullWidth = true,
  style,
  disabled,
  ...rest
}: PrimaryProps) {
  const { colors } = useTheme();
  const bg = color === 'gold' ? colors.gold : colors.forest;
  const fg = color === 'gold' ? colors.charcoal : '#fff';
  return (
    <button
      {...rest}
      disabled={disabled}
      className="kt-tap"
      style={{
        height: 58,
        width: fullWidth ? '100%' : undefined,
        borderRadius: 16,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontFamily: 'Manrope',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 0.3,
        boxShadow:
          color === 'gold'
            ? '0 4px 14px rgba(201,162,77,0.30), inset 0 1px 0 rgba(255,255,255,0.30)'
            : '0 6px 18px rgba(31,61,43,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  fullWidth = true,
  style,
  ...rest
}: BaseProps) {
  const { colors } = useTheme();
  return (
    <button
      {...rest}
      className="kt-tap"
      style={{
        height: 54,
        width: fullWidth ? '100%' : undefined,
        borderRadius: 14,
        background: '#fff',
        color: colors.forest,
        border: `1.5px solid ${colors.forest}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'Manrope',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 0.2,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

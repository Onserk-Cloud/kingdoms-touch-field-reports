import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../theme-context';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number | string;
  onClick?: () => void;
}

export function Card({ children, style, padding = 18, onClick }: CardProps) {
  const { colors } = useTheme();
  return (
    <div
      onClick={onClick}
      className={onClick ? 'kt-tap' : undefined}
      style={{
        background: '#fff',
        borderRadius: 20,
        padding,
        boxShadow:
          '0 1px 0 rgba(31,61,43,0.04), 0 6px 18px rgba(31,61,43,0.05)',
        border: `1px solid ${colors.line}`,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

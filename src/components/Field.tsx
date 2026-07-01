import type { ChangeEvent, ReactNode } from 'react';
import { useTheme } from '../theme-context';

interface FieldProps {
  label: string;
  value: string;
  placeholder?: string;
  multi?: boolean;
  height?: number;
  hint?: string;
  onChange?: (v: string) => void;
  rightSlot?: ReactNode;
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'time';
  readonly?: boolean;
}

export function Field({
  label,
  value,
  placeholder,
  multi,
  height,
  hint,
  onChange,
  rightSlot,
  type = 'text',
  readonly = false,
}: FieldProps) {
  const { colors } = useTheme();

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onChange?.(e.target.value);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.goldDeep,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>{label}</span>
        {rightSlot}
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: multi ? '12px 14px' : '0 14px',
          border: `1px solid ${colors.line}`,
          minHeight: height ?? (multi ? 84 : 52),
          display: 'flex',
          alignItems: multi ? 'flex-start' : 'center',
        }}
      >
        {multi ? (
          <textarea
            className="kt-input"
            aria-label={label}
            value={value}
            placeholder={placeholder}
            onChange={handleChange}
            readOnly={readonly}
            rows={3}
          />
        ) : (
          <input
            className="kt-input"
            aria-label={label}
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={handleChange}
            readOnly={readonly}
          />
        )}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 11,
            color: colors.muted,
            marginTop: 5,
            fontWeight: 500,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

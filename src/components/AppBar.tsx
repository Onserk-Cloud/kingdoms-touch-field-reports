import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme-context';

interface AppBarProps {
  title: string;
  eyebrow?: string;
  back?: boolean;
  onBack?: () => void;
  trailing?: ReactNode;
  dark?: boolean;
}

export function AppBar({
  title,
  eyebrow,
  back = true,
  onBack,
  trailing,
  dark = false,
}: AppBarProps) {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const txt = dark ? '#fff' : colors.charcoal;

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div
      style={{
        paddingTop: 58,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: dark
          ? '1px solid rgba(255,255,255,0.08)'
          : `1px solid ${colors.line}`,
        background: dark ? 'transparent' : '#fff',
      }}
      className="kt-safe-top"
    >
      {back && (
        <button
          onClick={handleBack}
          className="kt-tap"
          aria-label="Back"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: dark ? 'rgba(255,255,255,0.10)' : colors.ivory,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
            <path
              d="M8 1L1 8L8 15"
              stroke={txt}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div style={{ flex: 1, lineHeight: 1.1, minWidth: 0 }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.6,
              color: dark ? colors.goldSoft : colors.goldDeep,
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: txt,
            letterSpacing: -0.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
      </div>
      {trailing}
    </div>
  );
}

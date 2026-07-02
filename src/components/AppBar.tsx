import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';

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
  const { t } = useI18n();
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
          aria-label={t('common.back')}
          style={{
            // >=44x44 tappable area; the visual chip stays ~38px inside.
            minWidth: 44,
            minHeight: 44,
            // Pull the enlarged hit-box back so layout/spacing is unchanged.
            margin: -3,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: dark ? 'rgba(255,255,255,0.10)' : colors.ivory,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
          </span>
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
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 19,
            fontWeight: 600,
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

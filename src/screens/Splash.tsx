import { PhoneFrame } from '../components/PhoneFrame';
import { FullLogo } from '../components/LogoMark';
import { useTheme } from '../theme-context';
import { useI18n } from '../lib/i18n';

export function Splash() {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <PhoneFrame dark bg={colors.forest}>
      {/* Ambient brand glow */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(196,152,76,0.30) 0%, rgba(196,152,76,0) 65%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -120,
          left: -120,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(143,165,139,0.16) 0%, rgba(0,0,0,0) 60%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 64px)',
        }}
      />

      {/* Centered official logo + tagline */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          textAlign: 'center',
        }}
      >
        <FullLogo variant="white" width={252} />
        <div
          style={{
            width: 40,
            height: 1,
            background: colors.gold,
            margin: '30px 0 16px',
          }}
        />
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 20,
            color: colors.goldSoft,
            letterSpacing: 0.3,
            lineHeight: 1.3,
            maxWidth: '78%',
          }}
        >
          {t('splash.subtitle')}
        </div>
      </div>

      {/* Loader */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 120,
            height: 3,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.10)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '62%',
              background: colors.gold,
              borderRadius: 3,
              animation: 'kt-loader 1.6s ease-in-out infinite',
            }}
          />
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}
        >
          {t('splash.version', { status: t('splash.loading') })}
        </div>
      </div>
      <style>{`
        @keyframes kt-loader {
          0% { transform: translateX(-30%); }
          100% { transform: translateX(60%); }
        }
      `}</style>
    </PhoneFrame>
  );
}

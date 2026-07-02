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

      {/*
        Landscape scroll fix: the shell fills the phone surface (100svh on a
        real device via PhoneFrame) as a flex column that scrolls vertically,
        so a rotated / short viewport scrolls instead of clipping the lockup.
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '100%',
            padding: '54px 40px 60px',
            textAlign: 'center',
          }}
        >
          {/* Layered brand lockup — auto margins centre it when space allows,
              collapse to top-aligned flow when the viewport is short. */}
          <div
            style={{
              margin: 'auto 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontStyle: 'italic',
                fontSize: 13,
                fontWeight: 600,
                color: colors.goldSoft,
                letterSpacing: 6,
                marginBottom: 14,
              }}
            >
              {t('splash.eyebrow')}
            </div>

            <FullLogo variant="white" width={252} />

            <div
              style={{
                width: 36,
                height: 1,
                background: colors.gold,
                margin: '28px 0 18px',
              }}
            />

            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 28,
                fontWeight: 500,
                color: '#fff',
                letterSpacing: -0.5,
                lineHeight: 1.1,
              }}
            >
              {t('splash.title')}
            </div>

            {/* Quiet caption — inherits Manrope from the frame */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: 0.4,
                lineHeight: 1.4,
                marginTop: 8,
              }}
            >
              {t('splash.subtitle')}
            </div>
          </div>

          {/* Loader */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              paddingTop: 28,
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

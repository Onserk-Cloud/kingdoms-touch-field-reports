import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/PhoneFrame';
import { useTheme } from '../theme-context';
import { useDraftStore } from '../store/draft';
import { compressPhoto } from '../lib/compress';
import { useI18n } from '../lib/i18n';

/**
 * Bottom panel height: 240px on tall screens, but capped at 55% of the screen
 * so the viewfinder keeps breathing room (and never clips) in landscape.
 */
const PANEL_H = 'min(240px, 55%)';

/**
 * "Camera" screen — looks like a viewfinder, but actually delegates to the
 * native camera/picker via <input type=file capture=environment>. That's the
 * recommended UX for web PWAs: full-resolution sensor access without
 * needing getUserMedia permissions.
 */
export function Camera() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const draft = useDraftStore();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const open = () => fileRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const compressed = await compressPhoto(f);
      draft.addPhoto(compressed);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <PhoneFrame bg="#000" dark>
      {/* Viewfinder area */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: PANEL_H,
          background:
            'linear-gradient(180deg, #0e1d14 0%, #1a2a20 50%, #0a1410 100%)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.4,
            background:
              'radial-gradient(ellipse at center, rgba(196,152,76,0.08) 0%, transparent 60%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            // Clamp the grid insets so it stays visible (not inverted/clipped)
            // when the viewfinder is short — e.g. a phone held in landscape.
            top: 'min(100px, 25%)',
            left: 30,
            right: 30,
            bottom: 'min(80px, 20%)',
            border: '1px solid rgba(255,255,255,0.10)',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '110px 165px',
          }}
        />
        {/* Focus brackets */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 80,
            height: 80,
          }}
        >
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => {
            const base = {
              width: 16,
              height: 16,
              position: 'absolute',
            } as const;
            const styles: Record<string, React.CSSProperties> = {
              tl: {
                top: 0,
                left: 0,
                borderTop: `2px solid ${colors.gold}`,
                borderLeft: `2px solid ${colors.gold}`,
              },
              tr: {
                top: 0,
                right: 0,
                borderTop: `2px solid ${colors.gold}`,
                borderRight: `2px solid ${colors.gold}`,
              },
              bl: {
                bottom: 0,
                left: 0,
                borderBottom: `2px solid ${colors.gold}`,
                borderLeft: `2px solid ${colors.gold}`,
              },
              br: {
                bottom: 0,
                right: 0,
                borderBottom: `2px solid ${colors.gold}`,
                borderRight: `2px solid ${colors.gold}`,
              },
            };
            return <div key={c} style={{ ...base, ...styles[c] }} />;
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, 60px)',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: 1.5,
            textAlign: 'center',
          }}
        >
          {t('camera.viewfinderLabel')}
        </div>
      </div>

      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '58px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        className="kt-safe-top"
      >
        <button
          onClick={() => navigate(-1)}
          aria-label={t('camera.closeCamera')}
          className="kt-tap"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M11 3L3 11M3 3l8 8"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: '#E74E3C',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {t('camera.photoBadge', { n: draft.photos.length })}
          </span>
        </div>
        {/* Flash affordance (decorative — the native camera sheet controls the
            real flash). Sized 38×38 like the close button so the status pill
            stays optically centered between the two. */}
        <div
          aria-hidden
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.gold,
            fontSize: 18,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          ⚡
        </div>
      </div>

      {/* Bottom panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: PANEL_H,
          background: '#0a1410',
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          padding: '18px 18px 40px',
          borderTop: `1px solid rgba(196,152,76,0.20)`,
          overflowY: 'auto',
        }}
      >
        {/* Gallery */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: colors.goldSoft,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {t('camera.photosAdded', { n: draft.photos.length })}
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {t('camera.tapToRemove')}
            </div>
          </div>
          <div
            className="kt-scroll"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {draft.photos.map((p, i) => (
              <div
                key={p.id}
                onClick={() => draft.removePhoto(p.id)}
                className="kt-tap"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 11,
                  position: 'relative',
                  flexShrink: 0,
                  overflow: 'hidden',
                  border: `1px solid rgba(196,152,76,0.25)`,
                  background: '#000',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={p.previewUrl}
                  alt={t('camera.photoAlt', { n: i + 1 })}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    left: 4,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    fontSize: 9,
                    color: colors.goldSoft,
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(0,0,0,0.5)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
            <button
              onClick={open}
              className="kt-tap"
              style={{
                width: 64,
                height: 64,
                borderRadius: 11,
                flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                border: `1.2px dashed rgba(196,152,76,0.45)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3v10M3 8h10"
                  stroke={colors.goldSoft}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Shutter row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={open}
            aria-label={t('camera.openGallery')}
            className="kt-tap"
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M4 8l3-4h8l3 4v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8z"
                stroke="#fff"
                strokeOpacity="0.7"
                strokeWidth="1.5"
              />
              <path
                d="M14 6l2 2h2"
                stroke="#fff"
                strokeOpacity="0.7"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            onClick={open}
            aria-label={t('camera.takePhoto')}
            className="kt-tap"
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              background: 'transparent',
              border: `3px solid ${colors.gold}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDeep} 100%)`,
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35)',
              }}
            />
          </button>

          <button
            onClick={() => navigate(-1)}
            className="kt-tap"
            style={{
              height: 50,
              paddingLeft: 18,
              paddingRight: 18,
              borderRadius: 14,
              background: colors.forest,
              border: `1px solid ${colors.gold}`,
              color: colors.gold,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t('camera.done')}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1 5l3 3 5-6"
                stroke={colors.gold}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onFiles(e.target.files)}
      />
    </PhoneFrame>
  );
}

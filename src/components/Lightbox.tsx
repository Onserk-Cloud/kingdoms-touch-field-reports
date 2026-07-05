import { useEffect } from 'react';
import { useI18n } from '../lib/i18n';

interface LightboxProps {
  /** Image URL to show; null/undefined renders nothing. */
  src: string | null;
  onClose: () => void;
}

/**
 * Fullscreen photo preview. Tap anywhere (or Escape) to close.
 * Used wherever a PhotoTile thumbnail should expand to full size.
 */
export function Lightbox({ src, onClose }: LightboxProps) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  const { t } = useI18n();

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('common.photo')}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(10, 14, 12, 0.94)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        cursor: 'zoom-out',
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      />
      <button
        onClick={onClose}
        aria-label={t('common.close')}
        className="kt-tap"
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          right: 16,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(0,0,0,0.45)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12.5 3.5l-9 9M3.5 3.5l9 9"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

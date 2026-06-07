import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTheme } from '../theme-context';

interface PhoneFrameProps {
  children: ReactNode;
  /** If true, the screen uses the dark variant. */
  dark?: boolean;
  /** Optional background colour override. */
  bg?: string;
}

/**
 * Renders a "phone screen" surface.
 *
 * On a real mobile device (≤ 480px wide) it becomes full-bleed: no rounded
 * device frame, no fake status bar — just the content fills the viewport.
 *
 * On desktop / tablet it preserves the 390×844 artboard look from the
 * prototype so the design is recognisable and reviewable in the browser.
 */
export function PhoneFrame({ children, dark = false, bg }: PhoneFrameProps) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();

  const background = bg ?? (dark ? colors.forest : colors.ivory);
  const textColor = dark ? '#fff' : colors.ink;

  if (isMobile) {
    // Full-bleed mobile view — let the real device chrome show through.
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100svh',
          background,
          color: textColor,
          position: 'relative',
          fontFamily: 'Manrope, system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {children}
      </div>
    );
  }

  // Desktop preview — 390×844 artboard with status bar + dynamic island.
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0eee9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          borderRadius: 44,
          overflow: 'hidden',
          position: 'relative',
          background,
          color: textColor,
          boxShadow:
            '0 30px 70px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.10)',
          fontFamily: 'Manrope, system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <StatusBar dark={dark} />
        <DynamicIsland />
        <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
        <HomeIndicator dark={dark} />
      </div>
    </div>
  );
}

function useIsMobile(threshold = 480) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth <= threshold);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [threshold]);
  return m;
}

const STATUS_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 54,
  zIndex: 30,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '18px 28px 0',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.2,
  pointerEvents: 'none',
};

function StatusBar({ dark }: { dark: boolean }) {
  const color = dark ? '#fff' : '#1A1A1A';
  return (
    <div style={{ ...STATUS_STYLE, color }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          <rect x="0" y="7" width="3" height="4" rx="0.7" fill="currentColor" />
          <rect
            x="4.5"
            y="5"
            width="3"
            height="6"
            rx="0.7"
            fill="currentColor"
          />
          <rect
            x="9"
            y="2.5"
            width="3"
            height="8.5"
            rx="0.7"
            fill="currentColor"
          />
          <rect
            x="13.5"
            y="0"
            width="3"
            height="11"
            rx="0.7"
            fill="currentColor"
          />
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="20"
            height="10"
            rx="3"
            stroke="currentColor"
            strokeOpacity="0.45"
            fill="none"
          />
          <rect
            x="2"
            y="2"
            width="17"
            height="7"
            rx="1.5"
            fill="currentColor"
          />
          <path
            d="M22 3.5V7.5C22.5 7.3 23 6.8 23 5.5C23 4.2 22.5 3.7 22 3.5Z"
            fill="currentColor"
            fillOpacity="0.45"
          />
        </svg>
      </div>
    </div>
  );
}

function DynamicIsland() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 120,
        height: 35,
        borderRadius: 22,
        background: '#000',
        zIndex: 40,
      }}
    />
  );
}

function HomeIndicator({ dark }: { dark: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 134,
        height: 5,
        borderRadius: 100,
        zIndex: 50,
        background: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.30)',
        pointerEvents: 'none',
      }}
    />
  );
}

interface LogoMarkProps {
  size?: number;
  /** 'gold' for light backgrounds, 'white' for dark backgrounds. */
  variant?: 'gold' | 'white';
  /** @deprecated kept for backward compatibility — ignored. */
  color?: string;
  /** @deprecated ignored. */
  bg?: string;
  /** @deprecated ignored. */
  stroke?: number;
}

// Intrinsic aspect ratios of the brand assets (reserve space → no layout shift).
const MARK_RATIO = '565 / 610';
const FULL_RATIO = '1600 / 1538';

/**
 * Official Kingdoms Touch crown mark (from the brand kit, served from
 * /public/brand). `size` is the rendered height; width keeps the aspect ratio.
 */
export function LogoMark({ size = 56, variant = 'gold' }: LogoMarkProps) {
  const src =
    variant === 'white'
      ? '/brand/mark-white.webp'
      : '/brand/mark-transparent.webp';
  return (
    <img
      src={src}
      alt="Kingdoms Touch Services"
      width={Math.round((size * 565) / 610)}
      height={size}
      style={{
        height: size,
        width: 'auto',
        aspectRatio: MARK_RATIO,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
}

interface FullLogoProps {
  /** 'color' (light bg), 'white' (dark bg), or 'gold'. */
  variant?: 'color' | 'white' | 'gold';
  width?: number;
}

/** Official full Kingdoms Touch logo: crown + hand + wordmark. */
export function FullLogo({ variant = 'color', width = 240 }: FullLogoProps) {
  const src =
    variant === 'white'
      ? '/brand/logo-full-white.webp'
      : variant === 'gold'
        ? '/brand/logo-full-gold.webp'
        : '/brand/logo-full-transparent.webp';
  return (
    <img
      src={src}
      alt="Kingdoms Touch Services"
      width={width}
      height={Math.round((width * 1538) / 1600)}
      style={{
        width,
        maxWidth: '78%',
        height: 'auto',
        aspectRatio: FULL_RATIO,
        display: 'block',
        margin: '0 auto',
      }}
    />
  );
}

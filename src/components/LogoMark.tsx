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

/**
 * Official Kingdoms Touch crown mark (from the brand kit, served from
 * /public/brand). `size` is the rendered height; width keeps the aspect ratio.
 */
export function LogoMark({ size = 56, variant = 'gold' }: LogoMarkProps) {
  const src =
    variant === 'white'
      ? '/brand/mark-white.png'
      : '/brand/mark-transparent.png';
  return (
    <img
      src={src}
      alt="Kingdoms Touch Services"
      style={{
        height: size,
        width: 'auto',
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
      ? '/brand/logo-full-white.png'
      : variant === 'gold'
        ? '/brand/logo-full-gold.png'
        : '/brand/logo-full-transparent.png';
  return (
    <img
      src={src}
      alt="Kingdoms Touch Services"
      style={{
        width,
        maxWidth: '78%',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
      }}
    />
  );
}

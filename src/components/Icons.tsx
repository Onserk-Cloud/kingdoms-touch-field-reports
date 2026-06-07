import type { CSSProperties } from 'react';

interface IconProps {
  color?: string;
  size?: number;
  style?: CSSProperties;
}

export const PinIcon = ({ color = 'currentColor', size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1.5C5 1.5 2.7 3.8 2.7 6.8c0 3.7 5 7.7 5 7.7s5.3-4 5.3-7.7c0-3-2.3-5.3-5-5.3z"
      stroke={color}
      strokeWidth="1.4"
    />
    <circle cx="8" cy="6.8" r="1.8" fill={color} />
  </svg>
);

export const CameraIcon = ({
  color = '#fff',
  size = 22,
}: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path
      d="M3 7.5C3 6.4 3.9 5.5 5 5.5h2l1.3-2h5.4L15 5.5h2c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-9z"
      stroke={color}
      strokeWidth="1.6"
    />
    <circle cx="11" cy="12" r="3.5" stroke={color} strokeWidth="1.6" />
  </svg>
);

export const CheckIcon = ({ color = '#fff', size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path
      d="M4 10.5l4 4 8-9"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ClockIcon = ({
  color = 'currentColor',
  size = 13,
}: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="5.7" stroke={color} strokeWidth="1.2" />
    <path
      d="M6.5 3.5v3l2 1.5"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const BellIcon = ({
  color = 'currentColor',
  size = 20,
}: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path
      d="M5 9a5 5 0 0110 0v3l1.5 2.5h-13L5 12V9z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M8 16.5a2 2 0 004 0"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const ChevronRight = ({
  color = 'currentColor',
  size = 12,
}: IconProps) => (
  <svg
    width={(size * 8) / 12}
    height={size}
    viewBox="0 0 8 12"
    fill="none"
  >
    <path
      d="M1 1l6 5-6 5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PhotoIcon = ({
  color = 'currentColor',
  size = 11,
}: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 11 11" fill="none">
    <rect
      x="1"
      y="2"
      width="9"
      height="7"
      rx="1.5"
      stroke={color}
      strokeWidth="1.1"
    />
    <circle cx="5.5" cy="5.5" r="1.5" stroke={color} strokeWidth="1.1" />
  </svg>
);

export const Dot = ({ color, size = 6 }: IconProps & { color: string }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: color,
      display: 'inline-block',
    }}
  />
);

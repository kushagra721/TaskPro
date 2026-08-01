import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Original Kamdhenu Aviation logo.
 * A stylized letter "K" whose upper arm sweeps upward like an aircraft wing,
 * with a white accent stripe — mirrors the favicon concept.
 *
 * Props:
 *  - size: pixel height of the mark (default 40)
 *  - withWordmark: render "Kamdhenu Aviation" text next to the mark (default true)
 *  - variant: 'dark' (default, for light backgrounds) | 'light' (white text for navy footer)
 */
export default function AviationLogo({ size = 40, withWordmark = true, variant = 'dark' }) {
  const gradId = React.useId();
  const light = variant === 'light';

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label="Kamdhenu Aviation logo"
        style={{ display: 'block', flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`${gradId}-k`} x1="0" y1="48" x2="48" y2="0">
            <stop offset="0" stopColor="#0a4da3" />
            <stop offset="1" stopColor="#2196f3" />
          </linearGradient>
        </defs>
        {/* rounded badge */}
        <rect x="1" y="1" width="46" height="46" rx="12" fill={`url(#${gradId}-k)`} />
        {/* K stem */}
        <rect x="11" y="10" width="6.5" height="28" rx="2.5" fill="#ffffff" />
        {/* upper arm as swept wing */}
        <path
          d="M19 24.5 L38.5 8.5 C40.5 7 42.5 8.8 41.2 10.9 L30 25.5 Z"
          fill="#ffffff"
        />
        {/* white accent stripe on the wing */}
        <path
          d="M23.5 23.4 L36.5 12.6 L34.6 15.2 L26.4 22.2 Z"
          fill="#2196f3"
          opacity="0.85"
        />
        {/* lower leg of the K */}
        <path
          d="M19 26.5 L28.5 26.5 L38 38.5 C39 39.8 37.6 41.4 36.2 40.5 L19 30 Z"
          fill="#ffffff"
          opacity="0.92"
        />
      </svg>
      {withWordmark && (
        <Box sx={{ lineHeight: 1 }}>
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontWeight: 800,
              fontSize: size * 0.42,
              letterSpacing: '-0.02em',
              color: light ? '#ffffff' : '#0a2a52',
              lineHeight: 1.1,
            }}
          >
            Kamdhenu
          </Typography>
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontWeight: 600,
              fontSize: size * 0.28,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: light ? 'rgba(255,255,255,0.72)' : '#2196f3',
              lineHeight: 1.2,
            }}
          >
            Aviation
          </Typography>
        </Box>
      )}
    </Box>
  );
}

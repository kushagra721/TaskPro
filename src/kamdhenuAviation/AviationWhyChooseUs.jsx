import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { SectionHeading } from './aviationShared';

function CheckBadgeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" role="img" aria-label="Check mark" style={{ flexShrink: 0 }}>
      <circle cx="13" cy="13" r="12" fill="#e3f0fd" stroke="#2196f3" strokeWidth="1.6" />
      <path d="M8 13.4 l3.4 3.4 L18.4 10" stroke="#0a4da3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Supporting visual — a certified quality seal over a wing silhouette. */
function QualitySealSvg() {
  return (
    <svg
      viewBox="0 0 420 360"
      role="img"
      aria-label="Illustration of a quality-certified seal above a stylized aircraft wing"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id="kh-seal-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0f7ff" />
          <stop offset="1" stopColor="#dcebfc" />
        </linearGradient>
        <linearGradient id="kh-seal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a4da3" />
          <stop offset="1" stopColor="#2196f3" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="420" height="360" rx="20" fill="url(#kh-seal-bg)" />
      {/* wing silhouette */}
      <path d="M40 292 Q200 236 388 268 L388 292 Q210 268 40 306 Z" fill="#ffffff" stroke="#c3d6ee" strokeWidth="3" />
      <path d="M120 282 Q240 252 360 268 L358 276 Q244 262 124 290 Z" fill="#2196f3" opacity="0.25" />
      {/* seal ribbon tails */}
      <path d="M186 214 l-20 58 22 -12 12 22 16 -56 z" fill="#1b6fc4" opacity="0.85" />
      <path d="M234 214 l20 58 -22 -12 -12 22 -16 -56 z" fill="#1b6fc4" opacity="0.85" />
      {/* scalloped seal */}
      <g transform="translate(210 140)">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={Math.cos(a) * 62} cy={Math.sin(a) * 62} r="14" fill="url(#kh-seal)" />;
        })}
        <circle r="66" fill="url(#kh-seal)" />
        <circle r="52" fill="#ffffff" opacity="0.16" />
        <circle r="46" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="4 6" />
        {/* check */}
        <path d="M-20 2 l14 14 L26 -18" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

const POINTS = [
  {
    title: 'OEM-Approved Materials',
    desc: 'Paint systems and primers approved by leading airframe manufacturers.',
  },
  {
    title: 'Controlled Environment',
    desc: 'Temperature- and humidity-controlled bays for consistent, defect-free cure.',
  },
  {
    title: 'On-Time Delivery',
    desc: 'Planned downtime windows and disciplined scheduling keep your fleet flying.',
  },
  {
    title: 'Safety-First Crews',
    desc: 'Trained, certified teams operating to strict aviation safety protocols.',
  },
  {
    title: 'End-to-End Project Management',
    desc: 'A single point of contact from design approval to redelivery.',
  },
  {
    title: 'Quality Documentation',
    desc: 'Full inspection reports and traceability records with every aircraft.',
  },
];

export default function AviationWhyChooseUs() {
  return (
    <Box component="section" id="why-us" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#ffffff' }}>
      <Container maxWidth="lg">
        <SectionHeading
          overline="Why Choose Us"
          title="Built on process, proven by finish"
        />
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 2, md: 1 } }}>
            <Box sx={{ borderRadius: 5, overflow: 'hidden', boxShadow: '0 16px 44px rgba(10,77,163,0.12)' }}>
              <QualitySealSvg />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 1, md: 2 } }}>
            <Grid container spacing={{ xs: 2.5, md: 3 }}>
              {POINTS.map((p) => (
                <Grid key={p.title} size={{ xs: 12, sm: 6 }}>
                  <Stack
                    direction="row"
                    spacing={1.75}
                    sx={{
                      p: 2.25,
                      borderRadius: 3,
                      border: '1px solid #e3eefc',
                      bgcolor: '#fbfdff',
                      height: '100%',
                      transition: 'border-color 200ms ease, box-shadow 200ms ease',
                      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                      '&:hover': {
                        borderColor: 'rgba(33,150,243,0.5)',
                        boxShadow: '0 8px 24px rgba(10,77,163,0.10)',
                      },
                    }}
                  >
                    <CheckBadgeIcon />
                    <Box>
                      <Typography component="h3" sx={{ fontWeight: 700, color: '#0a2a52', fontSize: 16, mb: 0.5 }}>
                        {p.title}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 14.5, lineHeight: 1.6 }}>
                        {p.desc}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

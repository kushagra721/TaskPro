import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { SectionHeading } from './aviationShared';

/* Minimal duotone SVG icons in the blue palette — all original line art. */
const ICON_PROPS = {
  width: 44,
  height: 44,
  viewBox: '0 0 48 48',
  fill: 'none',
  role: 'img',
};

function SprayGunIcon() {
  return (
    <svg {...ICON_PROPS} aria-label="Spray gun icon">
      <path d="M8 16 h18 l6 -6 h6 v10 h-6 l-6 -0 v8 a6 6 0 0 1 -6 6 h-6 a6 6 0 0 1 -6 -6 z" fill="#e3f0fd" />
      <path
        d="M8 16 h18 l6 -6 h6 v10 h-6 l-6 0 v8 a6 6 0 0 1 -6 6 h-6 a6 6 0 0 1 -6 -6 z"
        stroke="#0a4da3"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M14 34 v6" stroke="#0a4da3" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="43" cy="12" r="1.8" fill="#2196f3" />
      <circle cx="45" cy="18" r="1.4" fill="#2196f3" />
      <circle cx="43" cy="24" r="1.2" fill="#2196f3" />
    </svg>
  );
}

function SandingIcon() {
  return (
    <svg {...ICON_PROPS} aria-label="Surface preparation icon">
      <rect x="8" y="20" width="32" height="12" rx="4" fill="#e3f0fd" stroke="#0a4da3" strokeWidth="2.4" />
      <path d="M16 20 v-4 a4 4 0 0 1 4 -4 h8 a4 4 0 0 1 4 4 v4" stroke="#0a4da3" strokeWidth="2.4" fill="none" />
      <path d="M10 38 h4 M18 38 h4 M26 38 h4 M34 38 h4" stroke="#2196f3" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...ICON_PROPS} aria-label="Protective coating icon">
      <path d="M24 6 L38 12 v10 c0 9 -6 16 -14 20 C16 38 10 31 10 22 V12 Z" fill="#e3f0fd" stroke="#0a4da3" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M17 23 l5 5 l9 -10" stroke="#2196f3" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg {...ICON_PROPS} aria-label="Maintenance support icon">
      <path
        d="M30 8 a10 10 0 0 0 -9 14 L9 34 a4.2 4.2 0 0 0 6 6 l12 -12 a10 10 0 0 0 13 -12 l-6 6 -6 -2 -2 -6 z"
        fill="#e3f0fd"
        stroke="#0a4da3"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="37" r="1.6" fill="#2196f3" />
    </svg>
  );
}

const SERVICES = [
  {
    icon: <SprayGunIcon />,
    title: 'Aircraft Painting',
    desc: 'Complete exterior repaints and livery application with aerospace-grade paint systems, applied in controlled spray environments.',
  },
  {
    icon: <SandingIcon />,
    title: 'Surface Preparation',
    desc: 'Chemical stripping, sanding and corrosion treatment that create the perfect substrate for a durable, defect-free finish.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Protective Coating',
    desc: 'High-performance primers and clear coats that shield airframes from UV, erosion and chemical exposure across thousands of cycles.',
  },
  {
    icon: <WrenchIcon />,
    title: 'Maintenance Support',
    desc: 'Touch-up programs, placard and marking renewal, and finish inspections aligned with your scheduled maintenance events.',
  },
];

export default function AviationServices() {
  return (
    <Box component="section" id="services" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#f5f9ff' }}>
      <Container maxWidth="lg">
        <SectionHeading
          overline="Our Services"
          title="End-to-end aviation surface solutions"
          subtitle="From bare metal to final clear coat, one accountable team handles every stage of your aircraft's finish."
        />
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {SERVICES.map((s) => (
            <Grid key={s.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  border: '2px solid transparent',
                  transition: 'transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease',
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 18px 44px rgba(10, 77, 163, 0.16)',
                    borderColor: 'rgba(33, 150, 243, 0.45)',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#f0f7ff',
                      mb: 2.5,
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Typography component="h3" variant="h6" sx={{ color: '#0a2a52', mb: 1 }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 15, lineHeight: 1.7 }}>
                    {s.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

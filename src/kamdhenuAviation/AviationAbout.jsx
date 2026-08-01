import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { SectionHeading, useInView, usePrefersReducedMotion } from './aviationShared';

const STATS = [
  { value: 150, suffix: '+', label: 'Aircraft Painted' },
  { value: 12, suffix: '+', label: 'Years of Experience' },
  { value: 40, suffix: '+', label: 'Certified Specialists' },
  { value: 100, suffix: '%', label: 'Compliance Record' },
];

/** Count-up number that animates when scrolled into view. */
function StatCounter({ value, suffix, label, animate }) {
  const [display, setDisplay] = React.useState(animate ? 0 : value);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return undefined;
    }
    if (started.current) return undefined;
    started.current = true;
    const duration = 1400;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, value]);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        component="p"
        sx={{
          fontWeight: 800,
          fontSize: { xs: 32, md: 40 },
          letterSpacing: '-0.02em',
          background: 'linear-gradient(90deg, #0a4da3, #2196f3)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          lineHeight: 1.1,
        }}
      >
        {display}
        {suffix}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 14, mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
}

/** Small supporting vignette — a tail fin being masked and painted. */
function TailFinVignetteSvg() {
  return (
    <svg
      viewBox="0 0 420 300"
      role="img"
      aria-label="Illustration of an aircraft tail fin being masked and spray painted"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id="kh-vig-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef5ff" />
          <stop offset="1" stopColor="#dcebfc" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="420" height="300" rx="20" fill="url(#kh-vig-bg)" />
      {/* floor line */}
      <line x1="20" y1="252" x2="400" y2="252" stroke="#b9d0ec" strokeWidth="3" />
      {/* tail fin */}
      <path d="M150 252 L228 60 Q238 42 252 52 L246 252 Z" fill="#ffffff" stroke="#c3d6ee" strokeWidth="3" />
      {/* painted band */}
      <path d="M184 168 L249 148 L247 196 L172 198 Z" fill="#2196f3" />
      {/* masking tape */}
      <line x1="184" y1="168" x2="249" y2="148" stroke="#8fb0d8" strokeWidth="4" strokeDasharray="9 7" />
      <line x1="172" y1="198" x2="247" y2="196" stroke="#8fb0d8" strokeWidth="4" strokeDasharray="9 7" />
      {/* painter figure */}
      <g>
        <rect x="300" y="176" width="20" height="36" rx="9" fill="#2196f3" />
        <circle cx="310" cy="164" r="11" fill="#f2c9a8" />
        <path d="M301 162 a11 11 0 0 1 18 -4 l-4 10 z" fill="#ffffff" />
        <rect x="306" y="166" width="11" height="5" rx="2.5" fill="#9fb8d6" />
        {/* arm + spray wand */}
        <line x1="302" y1="186" x2="278" y2="176" stroke="#2196f3" strokeWidth="7" strokeLinecap="round" />
        <rect x="260" y="170" width="20" height="7" rx="3.5" fill="#33517a" />
        <g fill="#2196f3" opacity="0.35">
          <circle cx="254" cy="172" r="5" />
          <circle cx="245" cy="167" r="3.6" />
          <circle cx="247" cy="179" r="3.2" />
        </g>
        {/* legs */}
        <rect x="302" y="210" width="8" height="26" rx="3.5" fill="#1b6fc4" />
        <rect x="312" y="210" width="8" height="26" rx="3.5" fill="#1b6fc4" />
      </g>
      {/* paint can */}
      <rect x="352" y="216" width="30" height="34" rx="5" fill="#dfeafa" stroke="#a9c6e8" strokeWidth="3" />
      <rect x="352" y="228" width="30" height="6" fill="#0a4da3" opacity="0.8" />
      {/* soft shadow */}
      <ellipse cx="230" cy="258" rx="150" ry="10" fill="#0a4da3" opacity="0.06" />
    </svg>
  );
}

export default function AviationAbout() {
  const reduceMotion = usePrefersReducedMotion();
  const [statsRef, statsInView] = useInView({ threshold: 0.3 });

  return (
    <Box component="section" id="about" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#ffffff' }}>
      <Container maxWidth="lg">
        <SectionHeading
          overline="About Us"
          title="Precision painting for demanding airframes"
        />
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5}>
              <Typography sx={{ color: 'text.secondary', fontSize: 17, lineHeight: 1.8 }}>
                Kamdhenu Aviation is a specialist aircraft painting and surface solutions
                company. From narrow-body airliners to business jets, we deliver
                showroom-quality exterior finishes engineered to withstand the extremes of
                flight — UV, temperature cycling, and high-speed airflow.
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 17, lineHeight: 1.8 }}>
                Every project runs through certified, OEM-aligned processes inside
                climate-controlled, hangar-grade facilities. Our crews handle stripping,
                surface preparation, priming, livery application and clear-coat protection
                as a single, documented workflow.
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 17, lineHeight: 1.8 }}>
                The result: liveries that look immaculate on delivery day and stay
                protected for years of service — backed by full quality documentation for
                your maintenance records.
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ borderRadius: 5, overflow: 'hidden', boxShadow: '0 16px 44px rgba(10,77,163,0.12)' }}>
              <TailFinVignetteSvg />
            </Box>
          </Grid>
        </Grid>

        {/* Stat strip */}
        <Box
          ref={statsRef}
          sx={{
            mt: { xs: 6, md: 9 },
            p: { xs: 3.5, md: 5 },
            borderRadius: 4,
            bgcolor: '#f5f9ff',
            border: '1px solid #e3eefc',
          }}
        >
          <Grid container spacing={{ xs: 4, md: 2 }}>
            {STATS.map((s) => (
              <Grid key={s.label} size={{ xs: 6, md: 3 }}>
                <StatCounter
                  value={s.value}
                  suffix={s.suffix}
                  label={s.label}
                  animate={statsInView && !reduceMotion}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}

import React from 'react';
import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { scrollToSection, usePrefersReducedMotion } from './aviationShared';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const ctaPulse = keyframes`
  0%, 100% { box-shadow: 0 8px 24px rgba(10, 77, 163, 0.35), 0 0 0 0 rgba(33, 150, 243, 0.35); }
  50%      { box-shadow: 0 8px 24px rgba(10, 77, 163, 0.35), 0 0 0 12px rgba(33, 150, 243, 0); }
`;

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
`;

/* ------------------------------------------------------------------ */
/* Original hangar-scene illustration: aircraft on stands inside a
   hangar, painters with spray wands, scissor lift and paint drums.
   Flat/geometric vector style, soft blues/greys/white.                */
/* ------------------------------------------------------------------ */
function HangarSceneSvg() {
  return (
    <svg
      viewBox="0 0 860 560"
      role="img"
      aria-label="Illustration of an aircraft being painted inside a hangar by industrial painters with spray equipment and a scissor lift"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id="kh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eaf3ff" />
          <stop offset="1" stopColor="#dcebfc" />
        </linearGradient>
        <linearGradient id="kh-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8dcf5" />
          <stop offset="1" stopColor="#a9c6e8" />
        </linearGradient>
        <linearGradient id="kh-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e5eefb" />
          <stop offset="1" stopColor="#cfdff4" />
        </linearGradient>
        <linearGradient id="kh-fuse" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbe7f6" />
        </linearGradient>
        <linearGradient id="kh-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* backdrop */}
      <rect x="0" y="0" width="860" height="560" fill="url(#kh-sky)" rx="24" />

      {/* hangar back wall */}
      <path d="M60 470 L60 190 Q430 60 800 190 L800 470 Z" fill="#f2f7fe" />
      {/* hangar arched roof */}
      <path d="M40 200 Q430 40 820 200 L820 232 Q430 78 40 232 Z" fill="url(#kh-roof)" />
      {/* roof ribs */}
      {[130, 240, 350, 460, 570, 680, 790].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={214 - Math.sin(((x - 40) / 780) * Math.PI) * 96}
          x2={x}
          y2={470}
          stroke="#d4e3f6"
          strokeWidth="4"
        />
      ))}
      {/* skylight glow beams */}
      <path d="M300 130 L250 470 L390 470 L350 128 Z" fill="url(#kh-light)" />
      <path d="M540 128 L500 470 L640 470 L590 132 Z" fill="url(#kh-light)" opacity="0.7" />
      {/* skylight strips */}
      <rect x="286" y="112" width="76" height="14" rx="7" fill="#ffffff" opacity="0.9" />
      <rect x="524" y="112" width="76" height="14" rx="7" fill="#ffffff" opacity="0.9" />

      {/* back wall panel lines */}
      <line x1="60" y1="300" x2="800" y2="300" stroke="#e2ecfa" strokeWidth="3" />
      <line x1="60" y1="380" x2="800" y2="380" stroke="#e2ecfa" strokeWidth="3" />

      {/* floor */}
      <rect x="0" y="470" width="860" height="90" fill="url(#kh-floor)" />
      <line x1="0" y1="470" x2="860" y2="470" stroke="#b9d0ec" strokeWidth="3" />
      {/* floor markings */}
      <rect x="120" y="505" width="120" height="8" rx="4" fill="#aac6e9" opacity="0.6" />
      <rect x="600" y="512" width="140" height="8" rx="4" fill="#aac6e9" opacity="0.6" />
      <rect x="380" y="522" width="90" height="8" rx="4" fill="#aac6e9" opacity="0.5" />

      {/* ---------------- aircraft ---------------- */}
      <g>
        {/* jack stands */}
        <g fill="#8fb0d8">
          <path d="M300 430 l16 42 h-32 z" />
          <rect x="292" y="470" width="32" height="8" rx="3" />
          <path d="M560 430 l16 42 h-32 z" />
          <rect x="552" y="470" width="32" height="8" rx="3" />
        </g>

        {/* tail fin */}
        <path d="M628 372 L676 258 Q684 244 694 252 L688 372 Z" fill="#ffffff" stroke="#c3d6ee" strokeWidth="3" />
        {/* tail fin masked/painted band */}
        <path d="M648 330 L688 300 L686 336 L642 348 Z" fill="#2196f3" opacity="0.9" />
        {/* horizontal stabilizer */}
        <path d="M622 372 L700 356 L706 368 L630 388 Z" fill="#e4edf9" stroke="#c3d6ee" strokeWidth="2.5" />

        {/* fuselage */}
        <path
          d="M148 398 Q150 372 196 366 L610 352 Q676 352 690 378 Q696 392 682 402 Q660 420 600 424 L212 430 Q160 428 148 398 Z"
          fill="url(#kh-fuse)"
          stroke="#c3d6ee"
          strokeWidth="3"
        />
        {/* nose cone highlight */}
        <path d="M148 398 Q150 372 196 366 L232 365 Q182 372 168 398 Q166 414 212 428 L206 429 Q158 424 148 398 Z" fill="#0a4da3" opacity="0.12" />
        {/* cockpit window */}
        <path d="M176 382 Q186 372 206 370 L204 384 Q188 386 180 392 Z" fill="#0a4da3" opacity="0.75" />
        {/* accent stripe along fuselage — freshly painted */}
        <path d="M210 412 Q420 400 668 392 Q676 396 670 402 Q430 412 216 422 Q206 418 210 412 Z" fill="#2196f3" />
        {/* unpainted / masked section (primer grey) */}
        <path d="M440 356 L560 353 Q564 388 558 422 L446 426 Q438 390 440 356 Z" fill="#cdd9e9" opacity="0.7" />
        {/* masking tape edges */}
        <line x1="442" y1="356" x2="446" y2="426" stroke="#8fb0d8" strokeWidth="3" strokeDasharray="8 6" />
        <line x1="558" y1="354" x2="556" y2="422" stroke="#8fb0d8" strokeWidth="3" strokeDasharray="8 6" />
        {/* windows */}
        {[250, 282, 314, 346, 378, 410, 590, 616].map((x, i) => (
          <circle key={i} cx={x} cy={384} r={6} fill="#9ec3ec" />
        ))}
        {/* wing (foreground, swept toward viewer) */}
        <path d="M330 402 L472 462 Q478 472 466 474 L306 428 Q298 412 330 402 Z" fill="#eef4fc" stroke="#c3d6ee" strokeWidth="3" />
        {/* engine under wing */}
        <g>
          <ellipse cx="392" cy="452" rx="34" ry="20" fill="#ffffff" stroke="#c3d6ee" strokeWidth="3" />
          <ellipse cx="360" cy="452" rx="7" ry="14" fill="#0a4da3" opacity="0.55" />
        </g>
      </g>

      {/* ---------------- scissor lift with painter at the tail ---------------- */}
      <g>
        {/* platform */}
        <rect x="700" y="330" width="104" height="12" rx="4" fill="#5b7ca6" />
        <rect x="700" y="308" width="104" height="6" rx="3" fill="#8fb0d8" />
        <rect x="700" y="308" width="5" height="34" fill="#8fb0d8" />
        <rect x="799" y="308" width="5" height="34" fill="#8fb0d8" />
        {/* scissor arms */}
        <g stroke="#7d9cc4" strokeWidth="6" strokeLinecap="round">
          <line x1="706" y1="342" x2="798" y2="392" />
          <line x1="798" y1="342" x2="706" y2="392" />
          <line x1="706" y1="392" x2="798" y2="442" />
          <line x1="798" y1="392" x2="706" y2="442" />
        </g>
        {/* base + wheels */}
        <rect x="696" y="442" width="112" height="18" rx="5" fill="#5b7ca6" />
        <circle cx="716" cy="466" r="10" fill="#33517a" />
        <circle cx="788" cy="466" r="10" fill="#33517a" />
        {/* painter on lift (coveralls + respirator) */}
        <g>
          <rect x="734" y="272" width="18" height="30" rx="8" fill="#2196f3" />
          <circle cx="743" cy="262" r="9" fill="#f2c9a8" />
          <path d="M736 260 a9 9 0 0 1 14 -4 l-2 8 z" fill="#ffffff" /> {/* helmet */}
          <rect x="740" y="264" width="9" height="5" rx="2.5" fill="#9fb8d6" /> {/* respirator */}
          {/* arm holding spray wand toward tail */}
          <line x1="738" y1="280" x2="716" y2="292" stroke="#2196f3" strokeWidth="6" strokeLinecap="round" />
          <rect x="700" y="288" width="18" height="6" rx="3" fill="#33517a" />
          {/* spray mist toward the fin */}
          <g fill="#2196f3" opacity="0.35">
            <circle cx="694" cy="288" r="4" />
            <circle cx="686" cy="284" r="3" />
            <circle cx="688" cy="294" r="3" />
            <circle cx="680" cy="289" r="2.2" />
          </g>
          {/* legs */}
          <rect x="735" y="300" width="7" height="16" rx="3" fill="#1b6fc4" />
          <rect x="744" y="300" width="7" height="16" rx="3" fill="#1b6fc4" />
        </g>
      </g>

      {/* ---------------- painter under the fuselage (left) ---------------- */}
      <g>
        {/* body */}
        <rect x="236" y="440" width="20" height="34" rx="9" fill="#2196f3" />
        <circle cx="246" cy="430" r="10" fill="#f2c9a8" />
        <path d="M238 428 a10 10 0 0 1 16 -4 l-3 9 z" fill="#ffffff" />
        <rect x="243" y="432" width="10" height="5" rx="2.5" fill="#9fb8d6" />
        {/* raised arm with spray wand toward fuselage stripe */}
        <line x1="252" y1="448" x2="272" y2="430" stroke="#2196f3" strokeWidth="6" strokeLinecap="round" />
        <rect x="268" y="418" width="7" height="16" rx="3" fill="#33517a" />
        <g fill="#2196f3" opacity="0.35">
          <circle cx="272" cy="412" r="4" />
          <circle cx="278" cy="406" r="3" />
          <circle cx="266" cy="406" r="2.5" />
        </g>
        {/* legs */}
        <rect x="238" y="472" width="8" height="16" rx="3" fill="#1b6fc4" />
        <rect x="248" y="472" width="8" height="16" rx="3" fill="#1b6fc4" />
        {/* airline hose to compressor */}
        <path d="M256 470 Q300 500 344 496" stroke="#7d9cc4" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>

      {/* ---------------- painter checking panel (right of masked area) ---------------- */}
      <g>
        <rect x="512" y="444" width="20" height="32" rx="9" fill="#1b6fc4" />
        <circle cx="522" cy="434" r="10" fill="#e8b58e" />
        <path d="M514 432 a10 10 0 0 1 16 -4 l-3 9 z" fill="#ffffff" />
        {/* clipboard arm */}
        <line x1="514" y1="454" x2="498" y2="446" stroke="#1b6fc4" strokeWidth="6" strokeLinecap="round" />
        <rect x="486" y="436" width="14" height="18" rx="2.5" fill="#ffffff" stroke="#8fb0d8" strokeWidth="2" />
        <line x1="489" y1="442" x2="497" y2="442" stroke="#8fb0d8" strokeWidth="2" />
        <line x1="489" y1="447" x2="497" y2="447" stroke="#8fb0d8" strokeWidth="2" />
        <rect x="514" y="474" width="8" height="15" rx="3" fill="#0a4da3" />
        <rect x="524" y="474" width="8" height="15" rx="3" fill="#0a4da3" />
      </g>

      {/* ---------------- paint drums + compressor ---------------- */}
      <g>
        {/* drums */}
        <g>
          <rect x="96" y="428" width="42" height="56" rx="6" fill="#dfeafa" stroke="#a9c6e8" strokeWidth="3" />
          <rect x="96" y="446" width="42" height="8" fill="#2196f3" opacity="0.85" />
          <ellipse cx="117" cy="428" rx="21" ry="6" fill="#eef4fc" stroke="#a9c6e8" strokeWidth="3" />
        </g>
        <g>
          <rect x="132" y="440" width="38" height="46" rx="6" fill="#dfeafa" stroke="#a9c6e8" strokeWidth="3" />
          <rect x="132" y="456" width="38" height="7" fill="#0a4da3" opacity="0.75" />
          <ellipse cx="151" cy="440" rx="19" ry="5.5" fill="#eef4fc" stroke="#a9c6e8" strokeWidth="3" />
        </g>
        {/* compressor cart */}
        <rect x="336" y="486" width="52" height="22" rx="8" fill="#8fb0d8" />
        <circle cx="348" cy="512" r="8" fill="#33517a" />
        <circle cx="376" cy="512" r="8" fill="#33517a" />
        <rect x="352" y="478" width="20" height="10" rx="4" fill="#5b7ca6" />
      </g>

      {/* soft foreground light pool under aircraft */}
      <ellipse cx="420" cy="500" rx="300" ry="22" fill="#0a4da3" opacity="0.06" />
    </svg>
  );
}

/** Small floating paper-plane accent. */
function PaperPlaneSvg() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label="Paper plane accent">
      <path d="M4 26 L48 8 L34 46 L26 31 Z" fill="#2196f3" opacity="0.9" />
      <path d="M26 31 L48 8 L22 27 Z" fill="#0a4da3" />
    </svg>
  );
}

export default function AviationHero() {
  const reduceMotion = usePrefersReducedMotion();

  const enter = (delay) =>
    reduceMotion
      ? {}
      : {
          opacity: 0,
          animation: `${fadeUp} 700ms ease-out ${delay}ms forwards`,
        };

  return (
    <Box
      component="section"
      aria-label="Kamdhenu Aviation hero"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #f5f9ff 0%, #ffffff 60%), radial-gradient(1200px 500px at 80% -10%, rgba(33,150,243,0.10), transparent)',
        pt: { xs: 6, md: 10 },
        pb: { xs: 8, md: 12 },
      }}
    >
      {/* soft decorative blue wash top-right */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -160,
          right: -120,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(33,150,243,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
          {/* Text column */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography
              component="p"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                fontSize: 13,
                mb: 2,
                ...enter(0),
              }}
            >
              Kamdhenu Aviation
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 38, sm: 48, md: 54 },
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: '#0a2a52',
                mb: 2.5,
                ...enter(120),
              }}
            >
              Flawless finishes,
              <Box
                component="span"
                sx={{
                  display: 'block',
                  background: 'linear-gradient(90deg, #0a4da3, #2196f3)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                built for flight.
              </Box>
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 17, md: 19 },
                color: 'text.secondary',
                lineHeight: 1.7,
                mb: 4,
                maxWidth: 460,
                ...enter(240),
              }}
            >
              Professional Aircraft Painting &amp; Aviation Surface Solutions — precision
              coatings, certified processes and hangar-grade care for every airframe.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={enter(360)}>
              <Button
                size="large"
                variant="contained"
                onClick={() => scrollToSection('services')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: 16,
                  background: 'linear-gradient(135deg, #0a4da3 0%, #2196f3 100%)',
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                  ...(reduceMotion ? {} : { animation: `${ctaPulse} 2.6s ease-in-out infinite` }),
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    background: 'linear-gradient(135deg, #083a7c 0%, #1a86e0 100%)',
                  },
                }}
              >
                Explore Services
              </Button>
              <Button
                size="large"
                variant="outlined"
                onClick={() => scrollToSection('contact')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: 16,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2, bgcolor: 'rgba(33,150,243,0.06)' },
                }}
              >
                Contact Us
              </Button>
            </Stack>
          </Grid>

          {/* Illustration column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ position: 'relative', ...enter(200) }}>
              <Box
                sx={{
                  borderRadius: 6,
                  overflow: 'hidden',
                  boxShadow: '0 24px 60px rgba(10, 77, 163, 0.16)',
                }}
              >
                <HangarSceneSvg />
              </Box>
              {/* floating paper-plane accent */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: -18,
                  right: { xs: 8, md: -14 },
                  ...(reduceMotion ? {} : { animation: `${floatY} 4.5s ease-in-out infinite` }),
                }}
              >
                <PaperPlaneSvg />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/* ---------- shared helpers for the Kamdhenu Aviation landing ---------- */

/** Smooth-scroll to an in-page section id (offset handled by scroll-margin on sections). */
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
}

/** True when the OS asks for reduced motion — used to skip decorative animations. */
export function usePrefersReducedMotion() {
  const [reduce, setReduce] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduce(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

/** IntersectionObserver hook — returns [ref, inView]; fires once. */
export function useInView(options = { threshold: 0.25 }) {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, options);
    obs.observe(node);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

/** Consistent section overline + heading + optional subtitle. */
export function SectionHeading({ overline, title, subtitle, align = 'center', maxWidth = 640 }) {
  return (
    <Box
      sx={{
        mb: { xs: 5, md: 7 },
        textAlign: align,
        mx: align === 'center' ? 'auto' : 0,
        maxWidth,
      }}
    >
      {overline && (
        <Typography
          component="p"
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            fontSize: 13,
            mb: 1.5,
          }}
        >
          {overline}
        </Typography>
      )}
      <Typography component="h2" variant="h3" sx={{ fontWeight: 800, color: '#0a2a52', mb: subtitle ? 2 : 0 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ color: 'text.secondary', fontSize: 17, lineHeight: 1.7 }}>{subtitle}</Typography>
      )}
    </Box>
  );
}

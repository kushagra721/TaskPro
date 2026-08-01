import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AviationHeader from './AviationHeader';
import AviationHero from './AviationHero';
import AviationAbout from './AviationAbout';
import AviationServices from './AviationServices';
import AviationWhyChooseUs from './AviationWhyChooseUs';
import AviationContact from './AviationContact';
import AviationFooter from './AviationFooter';

const FONT_STACK =
  '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

/** Scoped light theme — aviation blues, soft shadows, rounded corners. */
const aviationTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0a4da3', light: '#2196f3', dark: '#083a7c', contrastText: '#ffffff' },
    secondary: { main: '#2196f3' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#152c4e', secondary: '#4d6584' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: FONT_STACK,
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 800, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingLeft: 22, paddingRight: 22 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 6px 24px rgba(10, 77, 163, 0.08)' },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

/**
 * Kamdhenu Aviation — standalone marketing landing page.
 * Self-contained: own ThemeProvider + CssBaseline; swaps document title and
 * favicon on mount and restores both on unmount so the host app is untouched.
 */
export default function KamdhenuAviationLanding() {
  React.useEffect(() => {
    // --- swap title + favicon, remembering previous values for restore ---
    const prevTitle = document.title;
    document.title = 'Kamdhenu Aviation — Aircraft Painting & Aviation Surface Solutions';

    let link = document.querySelector('link[rel="icon"]');
    let createdLink = false;
    let prevHref = null;
    let prevType = null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      createdLink = true;
      document.head.appendChild(link);
    } else {
      prevHref = link.getAttribute('href');
      prevType = link.getAttribute('type');
    }
    link.setAttribute('type', 'image/svg+xml');
    link.setAttribute('href', '/kamdhenu-aviation-favicon.svg');

    return () => {
      // restore whatever the host app had before
      document.title = prevTitle;
      if (createdLink) {
        link.remove();
      } else {
        if (prevHref !== null) link.setAttribute('href', prevHref);
        else link.removeAttribute('href');
        if (prevType !== null) link.setAttribute('type', prevType);
        else link.removeAttribute('type');
      }
    };
  }, []);

  return (
    <ThemeProvider theme={aviationTheme}>
      <CssBaseline />
      <Box
        sx={{
          bgcolor: '#ffffff',
          color: 'text.primary',
          fontFamily: aviationTheme.typography.fontFamily,
          minHeight: '100vh',
          overflowX: 'hidden',
          // smooth in-page anchor scrolling + room for the sticky header
          scrollBehavior: 'smooth',
          '& section[id]': { scrollMarginTop: '84px' },
        }}
      >
        <AviationHeader />
        <AviationHero />
        <AviationAbout />
        <AviationServices />
        <AviationWhyChooseUs />
        <AviationContact />
        <AviationFooter />
      </Box>
    </ThemeProvider>
  );
}

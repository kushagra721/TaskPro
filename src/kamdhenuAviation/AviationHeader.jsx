import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import AviationLogo from './AviationLogo';
import { scrollToSection } from './aviationShared';

const NAV_LINKS = [
  { label: 'About', id: 'about' },
  { label: 'Services', id: 'services' },
  { label: 'Why Us', id: 'why-us' },
  { label: 'Contact', id: 'contact' },
];

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Open menu">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="#0a4da3" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Sticky white header — elevates on scroll, collapses to a drawer on mobile. */
export default function AviationHeader() {
  const elevated = useScrollTrigger({ disableHysteresis: true, threshold: 12 });
  const [open, setOpen] = React.useState(false);

  const handleNav = (id) => {
    setOpen(false);
    scrollToSection(id);
  };

  const goToLogin = () => {
    // Full page navigation on purpose — exits landing mode into the Kamdhenu
    // portal's own sign-in page (aviation-branded).
    window.location.href = '/kamdhenu/login';
  };

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: elevated ? 'rgba(255,255,255,0.96)' : '#ffffff',
        backdropFilter: elevated ? 'blur(8px)' : 'none',
        boxShadow: elevated ? '0 4px 20px rgba(10, 77, 163, 0.10)' : 'none',
        borderBottom: elevated ? 'none' : '1px solid #eef3fb',
        transition: 'box-shadow 200ms ease, background-color 200ms ease',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 2 }}>
          {/* Logo */}
          <Box
            role="button"
            tabIndex={0}
            aria-label="Kamdhenu Aviation — back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            onKeyDown={(e) => e.key === 'Enter' && window.scrollTo({ top: 0, behavior: 'smooth' })}
            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <AviationLogo size={38} />
          </Box>

          {/* Center nav — desktop */}
          <Box
            component="nav"
            aria-label="Primary"
            sx={{
              flex: 1,
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {NAV_LINKS.map((l) => (
              <Button
                key={l.id}
                onClick={() => handleNav(l.id)}
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': { color: 'primary.main', bgcolor: 'rgba(33,150,243,0.06)' },
                }}
              >
                {l.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ flex: { xs: 1, md: 'none' } }} />

          {/* Login CTA */}
          <Button
            variant="contained"
            onClick={goToLogin}
            sx={{
              background: 'linear-gradient(135deg, #0a4da3 0%, #2196f3 100%)',
              boxShadow: '0 6px 18px rgba(10, 77, 163, 0.30)',
              '&:hover': {
                background: 'linear-gradient(135deg, #083a7c 0%, #1a86e0 100%)',
                boxShadow: '0 8px 22px rgba(10, 77, 163, 0.38)',
              },
            }}
          >
            Login
          </Button>

          {/* Mobile hamburger */}
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <HamburgerIcon />
          </IconButton>
        </Toolbar>
      </Container>

      {/* Mobile drawer */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 264, pt: 2 }} role="presentation">
          <Box sx={{ px: 2, pb: 1.5 }}>
            <AviationLogo size={34} />
          </Box>
          <Divider />
          <List>
            {NAV_LINKS.map((l) => (
              <ListItemButton key={l.id} onClick={() => handleNav(l.id)}>
                <ListItemText
                  primary={l.label}
                  slotProps={{ primary: { sx: { fontWeight: 600, color: '#152c4e' } } }}
                />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={goToLogin}
              sx={{ background: 'linear-gradient(135deg, #0a4da3 0%, #2196f3 100%)' }}
            >
              Login
            </Button>
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}

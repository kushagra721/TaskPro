import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import AviationLogo from './AviationLogo';
import { scrollToSection } from './aviationShared';

const QUICK_LINKS = [
  { label: 'About', id: 'about' },
  { label: 'Services', id: 'services' },
  { label: 'Why Us', id: 'why-us' },
  { label: 'Contact', id: 'contact' },
];

const SERVICES_LIST = [
  'Aircraft Painting',
  'Surface Preparation',
  'Protective Coating',
  'Maintenance Support',
];

const linkSx = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: 15,
  textDecoration: 'none',
  cursor: 'pointer',
  width: 'fit-content',
  transition: 'color 160ms ease',
  '&:hover': { color: '#64b5f6' },
};

export default function AviationFooter() {
  const year = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ bgcolor: '#081f3d', color: '#ffffff', pt: { xs: 7, md: 9 }, pb: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 5, md: 6 }}>
          {/* Brand */}
          <Grid size={{ xs: 12, md: 4 }}>
            <AviationLogo size={40} variant="light" />
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7, mt: 2.5, maxWidth: 320 }}>
              Precision aircraft painting and aviation surface solutions, delivered from
              hangar-grade facilities by certified crews.
            </Typography>
          </Grid>

          {/* Quick links */}
          <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: 16, mb: 2 }}>
              Quick Links
            </Typography>
            <Stack spacing={1.25} component="nav" aria-label="Footer">
              {QUICK_LINKS.map((l) => (
                <Link key={l.id} component="button" type="button" onClick={() => scrollToSection(l.id)} sx={{ ...linkSx, textAlign: 'left' }}>
                  {l.label}
                </Link>
              ))}
              <Link href="/kamdhenu/login" sx={linkSx}>
                Staff Login
              </Link>
            </Stack>
          </Grid>

          {/* Services */}
          <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: 16, mb: 2 }}>
              Services
            </Typography>
            <Stack spacing={1.25}>
              {SERVICES_LIST.map((s) => (
                <Typography key={s} sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 15 }}>
                  {s}
                </Typography>
              ))}
            </Stack>
          </Grid>

          {/* Contact summary */}
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: 16, mb: 2 }}>
              Contact
            </Typography>
            <Stack spacing={1.25}>
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.6 }}>
                Hangar 4, Aviation Industrial Estate, Ahmedabad, Gujarat
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 15 }}>+91 98765 43210</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 15 }}>
                projects@kamdhenuaviation.com
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 4 }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            © {year} Kamdhenu Aviation. All rights reserved.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            Powered by Kamdhenu
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { SectionHeading } from './aviationShared';

const iconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', role: 'img' };

function PinIcon() {
  return (
    <svg {...iconProps} aria-label="Address">
      <path d="M12 21 C7 15.5 4.8 12.2 4.8 9.2 a7.2 7.2 0 1 1 14.4 0 C19.2 12.2 17 15.5 12 21 Z" stroke="#0a4da3" strokeWidth="1.8" fill="#e3f0fd" />
      <circle cx="12" cy="9.2" r="2.6" fill="#2196f3" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg {...iconProps} aria-label="Phone">
      <path d="M5 4 h4 l1.6 4.4 -2.2 1.6 a12 12 0 0 0 5.6 5.6 l1.6 -2.2 L20 15 v4 a1.8 1.8 0 0 1 -2 1.8 A16.5 16.5 0 0 1 3.2 6 A1.8 1.8 0 0 1 5 4 Z" stroke="#0a4da3" strokeWidth="1.8" fill="#e3f0fd" strokeLinejoin="round" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg {...iconProps} aria-label="Email">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" stroke="#0a4da3" strokeWidth="1.8" fill="#e3f0fd" />
      <path d="M4 7.5 L12 13.5 L20 7.5" stroke="#2196f3" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg {...iconProps} aria-label="Working hours">
      <circle cx="12" cy="12" r="8.6" stroke="#0a4da3" strokeWidth="1.8" fill="#e3f0fd" />
      <path d="M12 7.6 V12 l3.2 2" stroke="#2196f3" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const CONTACT_ITEMS = [
  { icon: <PinIcon />, label: 'Facility', value: 'Hangar 4, Aviation Industrial Estate, Ahmedabad, Gujarat, India' },
  { icon: <PhoneIcon />, label: 'Phone', value: '+91 98765 43210' },
  { icon: <MailIcon />, label: 'Email', value: 'projects@kamdhenuaviation.com' },
  { icon: <ClockIcon />, label: 'Hours', value: 'Mon – Sat, 9:00 AM – 6:30 PM IST' },
];

export default function AviationContact() {
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = React.useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Client-side only: there is no backend for this enquiry form yet.
  // We simply show a success toast and reset the fields.
  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <Box component="section" id="contact" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#f5f9ff' }}>
      <Container maxWidth="lg">
        <SectionHeading
          overline="Contact"
          title="Let's plan your next repaint"
          subtitle="Tell us about your aircraft and timelines — our project team responds within one business day."
        />
        <Grid container spacing={{ xs: 4, md: 6 }}>
          {/* Info column */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2.5}>
              {CONTACT_ITEMS.map((item) => (
                <Stack key={item.label} direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2.5,
                      bgcolor: '#ffffff',
                      border: '1px solid #e3eefc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#0a2a52', fontSize: 15 }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 15, lineHeight: 1.6 }}>
                      {item.value}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Grid>

          {/* Form column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ borderRadius: 4, p: { xs: 3, md: 4 } }}>
              <Box component="form" onSubmit={handleSubmit} noValidate={false}>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Name"
                      value={form.name}
                      onChange={handleChange('name')}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange('phone')}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Message"
                      value={form.message}
                      onChange={handleChange('message')}
                      required
                      fullWidth
                      multiline
                      minRows={4}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      type="submit"
                      size="large"
                      variant="contained"
                      sx={{
                        px: 5,
                        py: 1.4,
                        background: 'linear-gradient(135deg, #0a4da3 0%, #2196f3 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #083a7c 0%, #1a86e0 100%)' },
                      }}
                    >
                      Send Enquiry
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={sent}
        autoHideDuration={4500}
        onClose={() => setSent(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSent(false)} severity="success" variant="filled" sx={{ borderRadius: 2 }}>
          Thanks — we&apos;ll get back to you shortly.
        </Alert>
      </Snackbar>
    </Box>
  );
}

# Task Pro — Web App (Vite + React)

A modern, fully responsive (mobile + desktop) front-end for Task Pro.

## Pages / flow

- **/login** — email + password → sends a verification code
- **/signup** — name + email → sends a verification code
- **/verify** — enter the 6-digit code (auto-submits) → signed in
- **/dashboard** — protected placeholder home page

Both login and signup finish through the same email-code verification step.
The JWT returned on verify is stored in `localStorage` and used for protected
requests.

## Structure

```
src/
├── api/client.js          fetch wrapper + auth API
├── context/AuthContext.jsx global auth state
├── components/            BrandPanel, OtpInput, ProtectedRoute
├── pages/                 Login, Signup, Verify, Dashboard
├── styles/global.css      design system + responsive layout
├── App.jsx                routes
└── main.jsx               entry
```

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
```

Configure the backend URL in `.env`:

```
VITE_API_URL=http://localhost:5000/api
```

Make sure the backend (`TaskProNode`) is running. In backend dev mode (no SMTP
configured) the verification code is shown on the verify screen and printed to
the backend console, so you can test the whole flow without email.

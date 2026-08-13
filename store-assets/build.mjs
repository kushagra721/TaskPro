/**
 * Builds Google Play Store assets for Task Pro from REAL captures.
 *
 * Nothing here redraws the app. Phone assets are device screenshots of the
 * installed `com.taskpro.app` build with the OS status bar and Android's
 * navigation bar cropped away (framing, not editing). Tablet assets are the
 * same build rendered at a 1280x800 tablet viewport — see README for why they
 * are not device captures.
 *
 * Headlines describe only what is visible in the shot they sit above.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, 'raw').replace(/\\/g, '/');
mkdirSync(join(HERE, 'html'), { recursive: true });

/* ---------------------------------------------------------------- geometry */
// Phone captures are 1080x2400 from the device. Crop the status bar off the top
// and the system navigation bar off the bottom so the frame holds app UI only.
const PHONE = { w: 1080, h: 2400, top: 100, bottom: 2280, screenW: 640, radius: 44, bezel: 13 };
// Tablet captures are a clean 1280x800 render — no OS chrome, so no crop.
const TABLET = { w: 1280, h: 800, top: 0, bottom: 800, screenW: 1340, radius: 18, bezel: 14 };

const frameGeom = (d) => {
  const scale = d.screenW / d.w;
  return {
    scale,
    imgW: Math.round(d.w * scale),
    imgH: Math.round(d.h * scale),
    offset: Math.round(d.top * scale),
    screenH: Math.round((d.bottom - d.top) * scale),
  };
};

/* ------------------------------------------------------------------- style */
// Task Pro's own indigo/violet (#6366F1 -> #8B5CF6), the pair its logo and
// buttons already use. Nothing invented.
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%}
body{
  font-family:'Segoe UI',Roboto,-apple-system,'Helvetica Neue',Arial,sans-serif;
  -webkit-font-smoothing:antialiased;background:#EEF0FA;overflow:hidden;
}
.canvas{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;overflow:hidden}
.canvas::before{
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(120% 72% at 50% -14%, #E9E7FF 0%, rgba(233,231,255,0) 62%),
    radial-gradient(88% 54% at 106% 6%, #E4EDFF 0%, rgba(228,237,255,0) 60%),
    linear-gradient(180deg,#F7F7FD 0%,#E9EBF7 100%);
}
.canvas::after{
  content:'';position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(99,102,241,.055) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(99,102,241,.055) 1px,transparent 1px);
}
.inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;width:100%;height:100%}
/* Fixed-height copy block so the device sits at the same y in every asset — a
   one-line headline must not push the phone down as the carousel is swiped. */
.head{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%}

.brand{display:flex;align-items:center;gap:var(--brand-gap);color:#5A5E73;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.brand svg{display:block;width:var(--dot);height:var(--dot)}

/* 700, not 800 — Windows maps 800 to Segoe UI Black, a poster face rather than
   the enterprise tone the app itself uses. */
h1{color:#111527;font-weight:700;letter-spacing:-.022em;text-align:center;line-height:1.14}
h1 em{font-style:normal;color:#6247E8}
p.sub{color:#585E76;text-align:center;line-height:1.42;font-weight:500}

.device{position:relative;background:linear-gradient(160deg,#232A40 0%,#0D1120 52%,#171D30 100%);
  box-shadow:0 2px 0 rgba(255,255,255,.16) inset,0 40px 80px -28px rgba(15,23,42,.55),0 8px 24px -8px rgba(15,23,42,.35)}
.screen{position:relative;overflow:hidden;background:#F4F6FB}
.screen img{display:block;position:absolute;left:0;top:0}
`;

// The app's own logo, copied verbatim from public/favicon.svg.
const LOGO = (px) => `<svg viewBox="0 0 64 64" width="${px}" height="${px}">
  <defs><linearGradient id="tpg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
  <rect width="64" height="64" rx="16" fill="url(#tpg)"/>
  <path d="M20 33l8 8 16-18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* -------------------------------------------------------------------- html */
const page = (d, o) => {
  const g = frameGeom(d);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${CSS}
body{width:${o.canvasW}px;height:${o.canvasH}px}
.inner{padding:${o.padTop}px 0 0}
.brand{--brand-gap:${o.k(11)}px;--dot:${o.k(20)}px;font-size:${o.k(19)}px;margin-bottom:${o.k(24)}px}
h1{font-size:${o.k(62)}px;max-width:${o.k(880)}px}
p.sub{font-size:${o.k(29)}px;max-width:${o.k(780)}px;margin-top:${o.k(20)}px}
.head{height:${o.headH}px}
.device{margin-top:${o.gap}px;padding:${d.bezel}px;border-radius:${d.radius + d.bezel}px}
.screen{width:${d.screenW}px;height:${g.screenH}px;border-radius:${d.radius}px}
.screen img{width:${g.imgW}px;height:${g.imgH}px;top:${-g.offset}px}
</style></head><body><div class="canvas"><div class="inner">
  <div class="head">
    <div class="brand">${LOGO(o.k(20))}Task Pro</div>
    <h1>${o.title}</h1>
    ${o.sub ? `<p class="sub">${o.sub}</p>` : ''}
  </div>
  <div class="device"><div class="screen"><img src="${RAW}/${o.shot}"></div></div>
</div></div></body></html>`;
};

/* ------------------------------------------------------------------ assets */
const PHONE_SHOTS = [
  {
    shot: '01-dashboard.png',
    title: 'Your workspace,<br><em>at a glance</em>',
    sub: 'Members, channels, open tasks and what is assigned to you — on one home screen.',
  },
  {
    shot: '02-charts.png',
    title: 'See where the<br><em>work stands</em>',
    sub: 'Open, completed and cancelled at a glance, with the open list underneath.',
  },
  {
    shot: '03-hub-groups.png',
    title: 'Every channel,<br><em>with its progress</em>',
    sub: 'Members, open tasks, messages and a completion bar for each one.',
  },
  {
    shot: '07-channel.png',
    title: 'Tasks, people and chat —<br><em>in one channel</em>',
    sub: 'Filter by open, completed or cancelled without leaving the conversation.',
  },
  {
    shot: '09-chats.png',
    title: 'All your team chats,<br><em>in one list</em>',
    sub: 'Search every channel, filter to unread, and pick up where you left off.',
  },
  {
    shot: '10-chat-view.png',
    title: 'Reply, react,<br><em>stay in context</em>',
    sub: 'Quoted replies, emoji reactions, read receipts and day separators.',
  },
  {
    shot: '11-reports.png',
    title: 'Reports that show<br><em>who did what</em>',
    sub: 'Completed work broken down by channel, project, client space and member.',
  },
  {
    shot: '00-login.png',
    title: 'Sign in with a<br><em>password or a code</em>',
    sub: 'Email and password, or a one-time code sent to your inbox.',
  },
];

const TABLET_SHOTS = [
  {
    shot: 't2-hub.png',
    title: 'The same app, <em>more room</em>',
    sub: 'On a tablet the navigation opens out and the whole workspace sits side by side.',
  },
  {
    shot: 't4-chats.png',
    title: 'Chat list and conversation, <em>together</em>',
    sub: 'Pick a channel on the left and read it on the right — no back and forth.',
  },
  {
    shot: 't1-hub-clients.png',
    title: 'Projects, channels and <em>client spaces</em>',
    sub: 'Each client space carries its own tasks and its own completion bar.',
  },
  {
    shot: 't5-channel.png',
    title: 'A full table, <em>not a narrow list</em>',
    sub: 'Priority, dates, assignee, channel, project and status in a single row.',
  },
];

/* --------------------------------------------------- 1024x500 feature graphic */
const featurePhone = (shot, w) => {
  const scale = w / PHONE.w;
  return `<div class="fdev" style="width:${w + 16}px;padding:8px;border-radius:${Math.round(w * 0.09) + 8}px">
    <div class="fscreen" style="width:${w}px;height:${Math.round((PHONE.bottom - PHONE.top) * scale)}px;border-radius:${Math.round(w * 0.09)}px">
      <img src="${RAW}/${shot}" style="width:${w}px;height:${Math.round(PHONE.h * scale)}px;top:${-Math.round(PHONE.top * scale)}px">
    </div></div>`;
};

const FEATURE = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1024px;height:500px;overflow:hidden}
body{font-family:'Segoe UI',Roboto,-apple-system,Arial,sans-serif;-webkit-font-smoothing:antialiased;background:#0A0F1E}
.fg{position:relative;width:1024px;height:500px;overflow:hidden;
  background:
    radial-gradient(58% 120% at 84% 44%, rgba(124,92,255,.36) 0%, rgba(124,92,255,0) 62%),
    radial-gradient(52% 100% at 4% 0%, rgba(99,102,241,.34) 0%, rgba(99,102,241,0) 60%),
    linear-gradient(118deg,#0A0C1C 0%,#161334 52%,#1E1A4A 100%)}
.fg::after{content:'';position:absolute;inset:0;opacity:.55;
  background-image:linear-gradient(rgba(170,170,255,.06) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(170,170,255,.06) 1px,transparent 1px);
  background-size:34px 34px}
.copy{position:absolute;left:66px;top:0;height:100%;width:560px;display:flex;flex-direction:column;justify-content:center;z-index:3}
.lockup{display:flex;align-items:center;gap:16px;margin-bottom:26px}
.tile{width:70px;height:70px;border-radius:19px;display:flex;align-items:center;justify-content:center;
  box-shadow:0 12px 28px -10px rgba(124,92,255,.85)}
.name{color:#fff;font-size:40px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.kicker{color:#9DA6DA;font-size:13px;font-weight:700;letter-spacing:.19em;text-transform:uppercase;margin-top:6px}
.tag{color:#DEE2F7;font-size:26px;font-weight:600;line-height:1.38;max-width:430px}
.tag b{color:#fff;font-weight:700}
.pills{display:flex;gap:10px;margin-top:30px;max-width:470px}
.pill{color:#CBD2F7;font-size:14px;font-weight:600;padding:8px 15px;border-radius:999px;
  background:rgba(160,170,255,.10);border:1px solid rgba(160,170,255,.24)}
.stage{position:absolute;right:-8px;top:0;width:430px;height:100%;z-index:2}
.fdev{position:absolute;background:linear-gradient(160deg,#2A3050 0%,#0B1020 55%,#1B2140 100%);
  box-shadow:0 2px 0 rgba(255,255,255,.14) inset,0 34px 64px -22px rgba(0,0,0,.72)}
.fscreen{position:relative;overflow:hidden;background:#F4F6FB}
.fscreen img{display:block;position:absolute;left:0}
</style></head><body><div class="fg">
  <div class="copy">
    <div class="lockup">
      <div class="tile">${LOGO(70)}</div>
      <div><div class="name">Task Pro</div><div class="kicker">Team tasks &amp; chat</div></div>
    </div>
    <div class="tag">Tasks, channels and chat<br><b>in one workspace.</b></div>
    <div class="pills">
      <div class="pill">Tasks</div><div class="pill">Team chat</div><div class="pill">Reports</div>
    </div>
  </div>
  <div class="stage">
    <div style="position:absolute;left:6px;top:78px;transform:rotate(-7deg)">${featurePhone('09-chats.png', 172)}</div>
    <div style="position:absolute;left:196px;top:36px;transform:rotate(-7deg)">${featurePhone('01-dashboard.png', 206)}</div>
  </div>
</div></body></html>`;

const files = [];
writeFileSync(join(HERE, 'html', 'feature-graphic.html'), FEATURE);
files.push({ name: 'feature-graphic.html', w: 1024, h: 500 });

PHONE_SHOTS.forEach((s, i) => {
  const name = `phone-${String(i + 1).padStart(2, '0')}.html`;
  writeFileSync(join(HERE, 'html', name), page(PHONE, {
    ...s, canvasW: 1080, canvasH: 1920, padTop: 92, headH: 312, gap: 56, k: (n) => n,
  }));
  files.push({ name, w: 1080, h: 1920 });
});
TABLET_SHOTS.forEach((s, i) => {
  const name = `tablet-${String(i + 1).padStart(2, '0')}.html`;
  writeFileSync(join(HERE, 'html', name), page(TABLET, {
    ...s, canvasW: 1920, canvasH: 1200, padTop: 70, headH: 180, gap: 40, k: (n) => Math.round(n * 0.86),
  }));
  files.push({ name, w: 1920, h: 1200 });
});

writeFileSync(join(HERE, 'html', 'manifest.json'), JSON.stringify(files, null, 2));
console.log(`${files.length} compositions written to store-assets/html`);

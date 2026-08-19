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
/**
 * `topBg` is the capture's OWN colour at the crop line, used to fill the iOS
 * status-bar band so it continues the app's header instead of showing a seam.
 * It is only read by the App Store build; the Play build ignores it.
 *
 * Measured, not eyeballed — median of the pixel row at y=101, which ignores the
 * avatar and text that make up a minority of that row. Re-measure with:
 *
 *   python -c "from PIL import Image; import statistics as st; \
 *     im=Image.open('raw/01-dashboard.png').convert('RGB'); w,_=im.size; \
 *     px=[im.getpixel((x,102)) for x in range(0,w,2)]; \
 *     print('#%02X%02X%02X'%tuple(int(st.median([p[i] for p in px])) for i in range(3)))"
 *
 * Every row measured at most 9/255 of horizontal variation, so a flat band is
 * genuinely seamless here. A future capture with a strong horizontal gradient
 * at the top would need a gradient instead.
 */
const PHONE_SHOTS = [
  {
    shot: '01-dashboard.png',
    topBg: '#F9FAFE',
    title: 'Your workspace,<br><em>at a glance</em>',
    sub: 'Members, channels, open tasks and what is assigned to you — on one home screen.',
  },
  {
    shot: '02-charts.png',
    topBg: '#F9FAFE',
    title: 'See where the<br><em>work stands</em>',
    sub: 'Open, completed and cancelled at a glance, with the open list underneath.',
  },
  {
    shot: '03-hub-groups.png',
    topBg: '#F9FAFE',
    title: 'Every channel,<br><em>with its progress</em>',
    sub: 'Members, open tasks, messages and a completion bar for each one.',
  },
  {
    shot: '07-channel.png',
    topBg: '#F9FAFE',
    title: 'Tasks, people and chat —<br><em>in one channel</em>',
    sub: 'Filter by open, completed or cancelled without leaving the conversation.',
  },
  {
    shot: '09-chats.png',
    topBg: '#F9FAFE',
    title: 'All your team chats,<br><em>in one list</em>',
    sub: 'Search every channel, filter to unread, and pick up where you left off.',
  },
  {
    shot: '10-chat-view.png',
    topBg: '#EBEDFA',
    title: 'Reply, react,<br><em>stay in context</em>',
    sub: 'Quoted replies, emoji reactions, read receipts and day separators.',
  },
  {
    shot: '11-reports.png',
    topBg: '#F9FAFE',
    title: 'Reports that show<br><em>who did what</em>',
    sub: 'Completed work broken down by channel, project, client space and member.',
  },
  {
    shot: '00-login.png',
    topBg: '#E0E3FA',
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

/* ------------------------------------------------------ App Store (iOS) */
/**
 * The SAME eight captures and the SAME headlines as the Play phone set — only
 * the canvas differs. Nothing here is a second design.
 *
 * It is not a resize either, and it cannot be: Play's frame is 1080x1920
 * (0.563 wide-over-tall) against the App Store's 1242x2688 / 1284x2778 (0.462).
 * Scaling the Play asset by width leaves hundreds of pixels of dead canvas at
 * the bottom; scaling by height crops it. So the composition is REBUILT from
 * the proportions the Play asset already uses — each band's share of the
 * leftover space, measured off the 1080x1920 original — which is what makes the
 * two stores read as the same asset rather than one looking like a stretched
 * copy of the other.
 */
const PLAY_BANDS = { padTop: 0.153, headH: 0.518, gap: 0.093 }; // rest falls below the device

/**
 * The iPhone frame, as fractions of the SCREEN width so one set of numbers
 * serves both canvases. Taken from iPhone 16 Pro geometry (402x874pt screen):
 * a 55pt display corner, a 125x36pt Dynamic Island 11pt down, a ~62pt status
 * bar and a 139x5pt home indicator. Expressing them as ratios is what keeps the
 * 6.9" and 6.1" frames identical handsets rather than one looking chunkier.
 */
const IPHONE = {
  rail: 0.03, // titanium band around the glass
  ring: 0.008, // black bezel between rail and glass
  radius: 0.12, // display corner — iPhones are much rounder than a generic frame
  statusH: 0.154, // status bar band, which the Dynamic Island sits in
  homeH: 0.085, // home-indicator band
  islandW: 0.311,
  islandH: 0.09,
  islandTop: 0.027,
  pillW: 0.346, // home indicator
  pillH: 0.0125,
};

/**
 * The App Store frame is a REAL iPhone, not the Play frame with rounder
 * corners: titanium rails, side buttons, a Dynamic Island and a home indicator.
 *
 * That forces one structural change. The Play frame shows the capture and
 * nothing else, but an iPhone has chrome ABOVE and BELOW the app — so the glass
 * is three bands (status / app / home) rather than one image. The Android
 * status bar was cropped off at capture time (`PHONE.top`), so the band is
 * empty and gets filled with the shot's own `topBg`, which is why that colour
 * is measured per shot rather than assumed.
 *
 * The Dynamic Island therefore sits in the status band and never covers app UI.
 * Overlaying it on the capture instead would have hidden the avatar and name in
 * the app's own header.
 */
const iosGeom = (canvasW, canvasH) => {
  // Play puts the device at 0.617 of the canvas width. These canvases are
  // narrower relative to their height, so the device takes a slightly larger
  // share (0.70) to stay the subject of the shot rather than a strip down the
  // middle — the ceiling is on WIDTH, so it can never crowd the side margins.
  const screenW = Math.round((canvasW * 0.7) / (1 + 2 * IPHONE.rail));
  const s = (r) => Math.round(screenW * r);
  const appScale = screenW / PHONE.w;
  const appH = Math.round((PHONE.bottom - PHONE.top) * appScale);
  const rail = s(IPHONE.rail);
  const statusH = s(IPHONE.statusH);
  const homeH = s(IPHONE.homeH);
  const free = canvasH - (statusH + appH + homeH + 2 * rail);
  return {
    canvasW,
    canvasH,
    screenW,
    appH,
    rail,
    statusH,
    homeH,
    ring: s(IPHONE.ring),
    radius: s(IPHONE.radius),
    islandW: s(IPHONE.islandW),
    islandH: s(IPHONE.islandH),
    islandTop: s(IPHONE.islandTop),
    pillW: s(IPHONE.pillW),
    pillH: s(IPHONE.pillH),
    imgW: screenW,
    imgH: Math.round(PHONE.h * appScale),
    imgTop: -Math.round(PHONE.top * appScale),
    padTop: Math.round(free * PLAY_BANDS.padTop),
    headH: Math.round(free * PLAY_BANDS.headH),
    gap: Math.round(free * PLAY_BANDS.gap),
    // Type scales with WIDTH, not height. Scaling it by height would give a
    // 100px headline on a canvas no wider than the Play one.
    k: (n) => Math.round((n * canvasW) / 1080),
  };
};

/** Status-bar glyphs. Drawn rather than captured because the Android status bar
 *  was cropped away — these are DEVICE chrome, not app UI, exactly like the
 *  frame around them. 9:41 is Apple's own convention in its marketing. */
const STATUS_ICONS = `<svg class="sb-svg sb-sig" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
  <rect x="0" y="8.5" width="3" height="3.5" rx="1"/><rect x="5" y="6" width="3" height="6" rx="1"/>
  <rect x="10" y="3.5" width="3" height="8.5" rx="1"/><rect x="15" y="1" width="3" height="11" rx="1"/></svg>
<svg class="sb-svg sb-wifi" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true">
  <path d="M1.4 4.3a10 10 0 0 1 13.2 0" stroke-width="1.7"/>
  <path d="M4 7a6.3 6.3 0 0 1 8 0" stroke-width="1.7"/>
  <path d="M6.6 9.7a2.5 2.5 0 0 1 2.8 0" stroke-width="1.7"/></svg>
<svg class="sb-svg sb-bat" viewBox="0 0 25 12" fill="currentColor" aria-hidden="true">
  <rect x="0.6" y="0.6" width="20.8" height="10.8" rx="3.3" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".38"/>
  <rect x="2.2" y="2.2" width="15.6" height="7.6" rx="2.1"/>
  <path d="M23.1 4.3a2.1 2.1 0 0 1 0 3.4z" opacity=".5"/></svg>`;

/**
 * The home-indicator band continues the BOTTOM of the capture, which is a
 * different colour from the top — using `topBg` there left a visible seam under
 * the app's nav bar. Measured the same way as `topBg` (median of the row at
 * y=2277) and it came back #F6F6F6 with ZERO horizontal variation on all eight
 * shots, so this is one constant rather than a per-shot field.
 */
const IOS_HOME_BG = '#F6F6F6';

const IOS_CSS = `
/* MUST null the Play frame. The shared CSS gives .device a dark navy gradient
   and a drop shadow with no radius of its own — harmless there because that
   rule IS the frame, but here .device is only a positioning box for the rail
   and the side buttons, so it renders as a square dark wedge sticking out
   behind every rounded corner. The rail carries the shadow instead. */
.device{position:relative;background:none;box-shadow:none}
/* Titanium rail. The light stops at 0% and 100% are the machined edge catching
   the light — without them the frame reads as a flat dark rectangle. */
.rail{position:relative;background:linear-gradient(128deg,#8A8F98 0%,#3A3E48 12%,#1B1E26 38%,#15171D 62%,#3A3E48 88%,#8A8F98 100%);
  box-shadow:0 44px 90px -30px rgba(15,23,42,.60),0 10px 28px -10px rgba(15,23,42,.38)}
.screen{position:relative;overflow:hidden;display:flex;flex-direction:column}
.statusbar{position:relative;flex:none;display:flex;align-items:center;justify-content:space-between}
.island{position:absolute;left:50%;transform:translateX(-50%);background:#000}
.sb-time{font-weight:600;letter-spacing:-.01em;color:#14161F}
.sb-icons{display:flex;align-items:center;color:#14161F}
.sb-svg{display:block}
.app{position:relative;flex:none;overflow:hidden}
.app img{display:block;position:absolute;left:0}
.homebar{flex:none;display:flex;align-items:center;justify-content:center;background:${IOS_HOME_BG}}
.homepill{background:#14161F;opacity:.34}
/* Side buttons sit just outside the rail so they read as protruding hardware. */
.btn-side{position:absolute;background:linear-gradient(180deg,#6E7078,#2B2E36);border-radius:2px}
`;

const iosPage = (g, o) => `<!doctype html><html><head><meta charset="utf-8"><style>
${CSS}${IOS_CSS}
body{width:${g.canvasW}px;height:${g.canvasH}px}
.inner{padding:${g.padTop}px 0 0}
.brand{--brand-gap:${g.k(11)}px;--dot:${g.k(20)}px;font-size:${g.k(19)}px;margin-bottom:${g.k(24)}px}
h1{font-size:${g.k(62)}px;max-width:${g.k(880)}px}
p.sub{font-size:${g.k(29)}px;max-width:${g.k(780)}px;margin-top:${g.k(20)}px}
.head{height:${g.headH}px}
.device{margin-top:${g.gap}px}
.rail{padding:${g.rail}px;border-radius:${g.radius + g.rail}px}
.screen{width:${g.screenW}px;height:${g.statusH + g.appH + g.homeH}px;border-radius:${g.radius}px;
  background:${o.topBg};box-shadow:0 0 0 ${g.ring}px #07080B}
.statusbar{height:${g.statusH}px;padding:0 ${Math.round(g.screenW * 0.075)}px}
.island{top:${g.islandTop}px;width:${g.islandW}px;height:${g.islandH}px;border-radius:${Math.round(g.islandH / 2)}px}
.sb-time{font-size:${Math.round(g.screenW * 0.045)}px}
.sb-icons{gap:${Math.round(g.screenW * 0.017)}px}
.sb-sig{width:${Math.round(g.screenW * 0.049)}px}
.sb-wifi{width:${Math.round(g.screenW * 0.045)}px}
.sb-bat{width:${Math.round(g.screenW * 0.068)}px}
.app{width:${g.screenW}px;height:${g.appH}px}
.app img{width:${g.imgW}px;height:${g.imgH}px;top:${g.imgTop}px}
.homebar{height:${g.homeH}px}
.homepill{width:${g.pillW}px;height:${g.pillH}px;border-radius:${g.pillH}px}
.btn-mute{left:${-Math.round(g.rail * 0.34)}px;top:${Math.round(g.screenW * 0.20)}px;width:${Math.round(g.rail * 0.34)}px;height:${Math.round(g.screenW * 0.043)}px;border-radius:2px 0 0 2px}
.btn-up{left:${-Math.round(g.rail * 0.34)}px;top:${Math.round(g.screenW * 0.28)}px;width:${Math.round(g.rail * 0.34)}px;height:${Math.round(g.screenW * 0.075)}px;border-radius:2px 0 0 2px}
.btn-dn{left:${-Math.round(g.rail * 0.34)}px;top:${Math.round(g.screenW * 0.375)}px;width:${Math.round(g.rail * 0.34)}px;height:${Math.round(g.screenW * 0.075)}px;border-radius:2px 0 0 2px}
.btn-pwr{right:${-Math.round(g.rail * 0.34)}px;top:${Math.round(g.screenW * 0.31)}px;width:${Math.round(g.rail * 0.34)}px;height:${Math.round(g.screenW * 0.115)}px;border-radius:0 2px 2px 0}
</style></head><body><div class="canvas"><div class="inner">
  <div class="head">
    <div class="brand">${LOGO(g.k(20))}Task Pro</div>
    <h1>${o.title}</h1>
    ${o.sub ? `<p class="sub">${o.sub}</p>` : ''}
  </div>
  <div class="device">
    <div class="btn-side btn-mute"></div><div class="btn-side btn-up"></div>
    <div class="btn-side btn-dn"></div><div class="btn-side btn-pwr"></div>
    <div class="rail"><div class="screen">
      <div class="statusbar">
        <div class="sb-time">9:41</div>
        <div class="island"></div>
        <div class="sb-icons">${STATUS_ICONS}</div>
      </div>
      <div class="app"><img src="${RAW}/${o.shot}"></div>
      <div class="homebar"><div class="homepill"></div></div>
    </div></div>
  </div>
</div></div></body></html>`;

/**
 * App Store Connect's **6.5-inch display** slot, which accepts either of these
 * two pixel counts. Both are generated because Apple takes either and the
 * filenames say which is which, so whichever the upload form wants is already
 * there — they differ by 4% in height and are otherwise the same composition.
 *
 * (This replaced 1320x2868 / 1179x2556, the 6.9" and 6.1" slots.)
 *
 * ⚠️ THE LANDSCAPE PAIR — 2688x1242 and 2778x1284 — IS DELIBERATELY NOT BUILT.
 * Apple lists them as alternatives for the same slot, but this composition is a
 * portrait phone standing under a headline: at 2688x1242 the device alone
 * computes to 1881x4113, which overflows the canvas by more than its own
 * height. A landscape asset is not a re-render, it is a different layout (copy
 * beside the device rather than above it) built from landscape captures the
 * `raw/` folder does not contain. Ask for it rather than changing these numbers
 * and expecting it to work.
 *
 * These are native PIXEL counts, not points — do not "round" them.
 */
const IOS_SIZES = [
  { tag: 'ios-1242x2688', w: 1242, h: 2688 }, // 6.5" — iPhone 11 Pro Max / XS Max
  { tag: 'ios-1284x2778', w: 1284, h: 2778 }, // 6.5" — iPhone 12/13/14 Pro Max
];

/* ------------------------------------------------ App Store (iPad 12.9"/13") */
/**
 * The iPad frame. NOT the iPhone frame with squarer corners — a different
 * device: a uniform aluminium bezel, a much squarer display corner, a front
 * camera on the landscape edge, and **no Dynamic Island**.
 *
 * ⚠️ THESE USE THEIR OWN CAPTURES (`raw/ipad-*.png`) AND MUST. The Play tablet
 * shots are 1288x808 — 1.594, a 16:10 laptop shape — while an iPad screen is
 * 4:3 (1.333). Reusing them would mean cropping 16% off the width of a TWO-PANE
 * layout or letterboxing it. The iPad captures are the app re-rendered at
 * 1366x1024 CSS px, which IS the 12.9"/13" landscape viewport, at
 * deviceScaleFactor 2 — so 2732x2048 of real pixels, the exact screen size.
 *
 * LANDSCAPE, deliberately. The canvas is 4:3 and so is the device, so the
 * headline-above-device layout still balances; and the tablet story here is the
 * two-pane layouts, which only exist in landscape.
 *
 * NO STATUS BAR AND NO HOME INDICATOR are drawn, unlike the iPhone frame. There
 * the Android status bar had been cropped away and left an empty band to fill;
 * here the capture is a browser render that already fills the whole viewport,
 * so a fabricated status bar would sit ON TOP of the app's own header — over
 * the Task Pro logo and the account chip. An honest empty frame beats chrome
 * that covers the thing the screenshot exists to show.
 */
const IPAD = {
  rail: 0.03, // aluminium bezel — a fraction of the screen's SHORT side, so it
  ring: 0.006, // does not stretch with the long one in landscape
  radius: 0.02, // display corner: iPads are far squarer than iPhones
  camera: 0.009,
};

/**
 * The LANDSCAPE band proportions, lifted off the existing 1920x1200 Play tablet
 * asset rather than the phone one — its bottom margin is much tighter (0.13 of
 * the free space against the phone's 0.24), which is what stops a wide canvas
 * looking bottom-heavy.
 */
const TABLET_BANDS = { padTop: 0.21, headH: 0.539, gap: 0.12 };

const ipadGeom = (canvasW, canvasH) => {
  const ar = 2732 / 2048; // the capture's own aspect, i.e. the iPad screen
  // Device at 0.71 of the canvas width, matching the Play tablet's presence.
  // devW = screenW + 2*rail and rail scales off the SHORT side, hence the /ar.
  const screenW = Math.round((canvasW * 0.71) / (1 + (2 * IPAD.rail) / ar));
  const screenH = Math.round(screenW / ar);
  const s = (r) => Math.round(screenH * r);
  const rail = s(IPAD.rail);
  const free = canvasH - (screenH + 2 * rail);
  return {
    canvasW,
    canvasH,
    screenW,
    screenH,
    rail,
    ring: s(IPAD.ring),
    radius: s(IPAD.radius),
    camera: s(IPAD.camera),
    padTop: Math.round(free * TABLET_BANDS.padTop),
    headH: Math.round(free * TABLET_BANDS.headH),
    gap: Math.round(free * TABLET_BANDS.gap),
    // Type scales off the Play TABLET's ratio (0.86 at 1920 wide), not the
    // phone's. Using the phone rule here would put a 157px headline on this
    // canvas, because it keys on width and this canvas is 2732 wide.
    k: (n) => Math.round((n * canvasW * 0.86) / 1920),
  };
};

const IPAD_CSS = `
.ipad{position:relative}
/* Aluminium, lighter and flatter than the iPhone's titanium — an iPad bezel
   catches light across a broad face rather than along a machined edge. */
.ipad-rail{position:relative;background:linear-gradient(135deg,#9BA1AA 0%,#4C525C 14%,#2A2F37 46%,#242931 62%,#4C525C 88%,#9BA1AA 100%);
  box-shadow:0 46px 96px -32px rgba(15,23,42,.55),0 12px 30px -12px rgba(15,23,42,.34)}
.ipad-screen{position:relative;overflow:hidden;background:#F4F6FB}
.ipad-screen img{display:block;width:100%;height:100%}
/* Front camera, centred on the landscape edge — where the M4 iPad Pro puts it. */
.ipad-cam{position:absolute;left:50%;transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(circle at 38% 34%, #3C424C 0%, #12151B 62%, #0A0C10 100%)}
`;

const ipadPage = (g, o) => `<!doctype html><html><head><meta charset="utf-8"><style>
${CSS}${IPAD_CSS}
body{width:${g.canvasW}px;height:${g.canvasH}px}
.inner{padding:${g.padTop}px 0 0}
.brand{--brand-gap:${g.k(11)}px;--dot:${g.k(20)}px;font-size:${g.k(19)}px;margin-bottom:${g.k(24)}px}
h1{font-size:${g.k(62)}px;max-width:${Math.round(g.canvasW * 0.78)}px}
p.sub{font-size:${g.k(29)}px;max-width:${Math.round(g.canvasW * 0.62)}px;margin-top:${g.k(20)}px}
.head{height:${g.headH}px}
.ipad{margin-top:${g.gap}px}
.ipad-rail{padding:${g.rail}px;border-radius:${g.radius + g.rail}px}
.ipad-screen{width:${g.screenW}px;height:${g.screenH}px;border-radius:${g.radius}px;
  box-shadow:0 0 0 ${g.ring}px #07080B}
.ipad-cam{top:${Math.round((g.rail - g.camera) / 2)}px;width:${g.camera}px;height:${g.camera}px}
</style></head><body><div class="canvas"><div class="inner">
  <div class="head">
    <div class="brand">${LOGO(g.k(20))}Task Pro</div>
    <h1>${o.title}</h1>
    ${o.sub ? `<p class="sub">${o.sub}</p>` : ''}
  </div>
  <div class="ipad">
    <div class="ipad-rail">
      <div class="ipad-cam"></div>
      <div class="ipad-screen"><img src="${RAW}/${o.shot}"></div>
    </div>
  </div>
</div></div></body></html>`;

/**
 * The same four tablet screens and the same headlines the Play tablet set uses
 * — that copy was written for landscape and for exactly these views. Only the
 * capture changes, because only the viewport did.
 */
const IPAD_SHOTS = [
  { shot: 'ipad-hub.png', title: 'The same app, <em>more room</em>', sub: 'On a tablet the navigation opens out and the whole workspace sits side by side.' },
  { shot: 'ipad-chats.png', title: 'Chat list and conversation, <em>together</em>', sub: 'Pick a channel on the left and read it on the right — no back and forth.' },
  { shot: 'ipad-clients.png', title: 'Projects, channels and <em>client spaces</em>', sub: 'Each client space carries its own tasks and its own completion bar.' },
  { shot: 'ipad-channel.png', title: 'A full table, <em>not a narrow list</em>', sub: 'Priority, dates, assignee, channel, project and status in a single row.' },
];

/**
 * App Store Connect's 12.9"/13" iPad slot, which accepts either pixel count.
 * The PORTRAIT alternatives (2064x2752, 2048x2732) are not built: they would
 * need the app re-captured at a 1024x1366 viewport, which is a different set of
 * screenshots rather than a re-render of these. Ask if you need them.
 */
const IPAD_SIZES = [
  { tag: 'ipad-2732x2048', w: 2732, h: 2048 }, // 12.9" iPad Pro
  { tag: 'ipad-2752x2064', w: 2752, h: 2064 }, // 13" iPad Pro (M4)
];

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

IOS_SIZES.forEach(({ tag, w, h }) => {
  const g = iosGeom(w, h);
  PHONE_SHOTS.forEach((s, i) => {
    const name = `${tag}-${String(i + 1).padStart(2, '0')}.html`;
    writeFileSync(join(HERE, 'html', name), iosPage(g, s));
    files.push({ name, w, h });
  });
});

IPAD_SIZES.forEach(({ tag, w, h }) => {
  const g = ipadGeom(w, h);
  IPAD_SHOTS.forEach((s, i) => {
    const name = `${tag}-${String(i + 1).padStart(2, '0')}.html`;
    writeFileSync(join(HERE, 'html', name), ipadPage(g, s));
    files.push({ name, w, h });
  });
});

writeFileSync(join(HERE, 'html', 'manifest.json'), JSON.stringify(files, null, 2));
console.log(`${files.length} compositions written to store-assets/html`);

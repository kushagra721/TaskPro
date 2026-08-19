/**
 * Re-captures the four tablet screens at a TRUE iPad viewport.
 *
 * WHY NOT REUSE raw/t*.png. Those are 1288x808 — 1.594, a 16:10 laptop shape.
 * An iPad screen is 4:3 (1.333). Fitting the existing capture into an iPad
 * frame would mean cropping 16% off the width of a TWO-PANE layout, or
 * letterboxing it. So the app is re-rendered at 1366x1024 CSS px, which IS the
 * 12.9"/13" iPad landscape viewport, and the result needs no fitting at all.
 *
 * This is the same method the README documents for the existing tablet assets
 * (rendered in Chrome, not captured from a device) — only the viewport changes.
 *
 * READ-ONLY: it signs in with an existing token and navigates. Nothing is
 * created, edited or deleted.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const APP = 'http://localhost:5173';
const OUT = 'C:/Users/Kushagra kr/Desktop/Task Pro/TaskProReact/store-assets/raw';
const TOKEN = readFileSync('C:/Users/KUSHAG~1/AppData/Local/Temp/tok.txt', 'utf8').trim();
const ORG = '4593bb23-755d-4e3e-81d3-35ca4a8bdd59';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 12.9"/13" iPad landscape is 1366x1024 CSS px. Capturing at deviceScaleFactor 2
// gives 2732x2048 of real pixels, which is the target screen size exactly — so
// the app's own UI is never scaled up, only framed.
const VW = 1366, VH = 1024, DSF = 2;

const SHOTS = [
  { name: 'ipad-hub.png', path: `/groups?tab=groups`, wait: 6500 },
  { name: 'ipad-chats.png', path: `/chats/941df8b5-0177-4052-98b3-bd5f65b03808`, wait: 4600 },
  { name: 'ipad-clients.png', path: `/groups?tab=clients`, wait: 4200 },
  { name: 'ipad-channel.png', path: `/groups/28970c40-8300-4e4f-b62f-b4133ee741c3`, wait: 4600 },
];

let chrome, ws, id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return r?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
try {
  chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9344',
    `--window-size=${VW},${VH}`, '--user-data-dir=' + process.env.TEMP + '\\ipad-cap', '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });
  await sleep(2600);

  const list = await (await fetch('http://127.0.0.1:9344/json/list')).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: VW, height: VH, deviceScaleFactor: DSF, mobile: false,
  });

  // Seed the session, then let the app boot with it already in place.
  await send('Page.navigate', { url: APP + '/login' });
  await sleep(2500);
  await evaluate(`localStorage.setItem('taskpro_token', ${JSON.stringify(TOKEN)});
                  localStorage.setItem('taskpro_current_org', ${JSON.stringify(ORG)}); 'ok'`);

  for (const s of SHOTS) {
    await send('Page.navigate', { url: APP + s.path });
    await sleep(s.wait);
    // Hide anything that would date the shot or cover the UI.
    await evaluate(`document.querySelectorAll('.toast,.toast-host').forEach(e=>e.remove()); window.scrollTo(0,0); 'ok'`);
    // The FIRST capture after setDeviceMetricsOverride came back blank once:
    // the buffer was read before the page had painted at the new scale. Waiting
    // on two animation frames is the cheap, deterministic fix.
    await evaluate(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r('ok'))))`);
    await sleep(900);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (!shot?.data) { console.log(`  FAILED ${s.name}`); continue; }
    writeFileSync(`${OUT}/${s.name}`, Buffer.from(shot.data, 'base64'));
    const title = await evaluate(`document.querySelector('.page__title,.chat-pane__name,h1')?.textContent || ''`);
    console.log(`  ${s.name.padEnd(20)} captured  (page: "${String(title).slice(0, 34)}")`);
  }
} catch (err) {
  console.error('CAPTURE ERROR:', err.message);
} finally {
  try { ws?.close(); } catch {}
  try { chrome?.kill(); } catch {}
}

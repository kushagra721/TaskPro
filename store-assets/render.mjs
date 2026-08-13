/** Renders each composition to an exact-size PNG with headless Chrome. */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(join(HERE, 'out'), { recursive: true });

const list = JSON.parse(readFileSync(join(HERE, 'html', 'manifest.json'), 'utf8'));
for (const f of list) {
  const out = resolve(HERE, 'out', f.name.replace('.html', '.png'));
  const src = pathToFileURL(resolve(HERE, 'html', f.name)).href;
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--allow-file-access-from-files',
      `--window-size=${f.w},${f.h}`,
      `--screenshot=${out}`,
      src,
    ],
    { stdio: 'ignore' },
  );
  console.log(`${f.name.replace('.html', '.png')}  ${f.w}x${f.h}  ${(statSync(out).size / 1024).toFixed(0)}KB`);
}

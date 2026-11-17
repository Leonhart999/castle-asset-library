// Headless screenshot of the module viewer.
// Usage: node scripts/shot.mjs <out.png> [module-id] [width] [height]
// Expects the Vite dev server on http://127.0.0.1:5174 (npm run dev).

import puppeteer from 'puppeteer-core';

const [out = 'shot.png', id = '', w = '1400', h = '900'] = process.argv.slice(2);
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=' + w + ',' + h],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
  protocolTimeout: 600000,
});
const tab = await browser.newPage();
const logs = [];
tab.on('console', (m) => {
  if (['error', 'warning', 'warn'].includes(m.type())) logs.push(m.type() + ': ' + m.text());
});
tab.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
// VIEW=front|back|side|top gives an elevation, DEMO=1 shows the assembled run (src/modules/demo.js).
const url =
  'http://127.0.0.1:5174/viewer/index.html?shot=1&dpr=1' +
  (id ? '&module=' + id : '') +
  (process.env.VIEW ? '&view=' + process.env.VIEW : '') +
  (process.env.DEMO ? '&demo=1' : '');
const t0 = Date.now();
await tab.goto(url, { waitUntil: 'load', timeout: 300000 });
try {
  await tab.waitForFunction('window.__ready === true', { timeout: 300000, polling: 500 });
} catch (e) {
  logs.push('timeout waiting for __ready');
}
await new Promise((r) => setTimeout(r, Number(process.env.SETTLE || 1500)));
await tab.screenshot({ path: out });
console.log('shot ' + out + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
for (const l of [...new Set(logs)].slice(0, 30)) console.log(l);
await browser.close();

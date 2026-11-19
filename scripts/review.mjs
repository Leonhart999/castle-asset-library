// Reviews modules without opening the viewer by hand: prints geometry checks for every module that matches the
// filter and can render them from several directions as rough ASCII maps (PNG previews cannot always be displayed
// in a terminal). Starts its own Vite server and a headless Chrome.
//
// Usage: node scripts/review.mjs <filter> [cols] [rows] [views]
//   filter      comma-separated id substrings or cat:<category> (as for npm run build:models), or all
//   cols, rows  size of each ASCII map (default 100 x 34)
//   views       comma-separated list of iso, front, back, side, top, or none for the geometry checks only
//               (default iso,front,side,top)
// The PNGs stay in scratch/review/<id>_<view>.png (gitignored).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [filterArg, colsArg = '100', rowsArg = '34', viewsArg = 'iso,front,side,top'] = process.argv.slice(2);
if (!filterArg) {
  console.error('usage: node scripts/review.mjs <filter|all> [cols] [rows] [views|none]');
  process.exit(1);
}
const filter = filterArg === 'all' ? '' : filterArg;
const views = viewsArg === 'none' ? [] : viewsArg.split(',').filter(Boolean);
const outDir = path.join(root, 'scratch', 'review');
fs.mkdirSync(outDir, { recursive: true });

/** Prints one line of geometry facts for a module and returns how many warnings it raised. */
function describe(id, s) {
  const f = (v) => v.map((x) => x.toFixed(2)).join(', ');
  const warn = [];
  if (Math.abs(s.min[1]) > 0.01) warn.push('lowest point at y = ' + s.min[1].toFixed(3) + ' (should be 0)');
  if (s.nan) warn.push(s.nan + ' NaN triangles');
  if (s.degenerate) warn.push(s.degenerate + ' zero-area triangles');
  if (s.tris > 40000) warn.push('heavy: ' + s.tris + ' triangles');
  const centre = ((s.min[0] + s.max[0]) / 2).toFixed(2) + ', ' + ((s.min[2] + s.max[2]) / 2).toFixed(2);
  console.log(id.padEnd(26) + 'size [' + f(s.size) + '] m, centre xz [' + centre + '], ' + s.tris + ' tris' + (warn.length ? '  !! ' + warn.join('; ') : '  ok'));
  console.log('    ' + Object.entries(s.perMat).map(([k, v]) => k + ' ' + v).join(', '));
  return warn.length;
}

// strictPort is off so several reviews can run side by side; the real port is read back after listen().
const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.js'),
  // hmr off: other sessions edit src/ while a review runs, and a hot reload would break the page mid-render
  server: { port: 5176, strictPort: false, hmr: false },
  logLevel: 'warn',
});
await server.listen();
const PORT = server.httpServer.address().port;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=800,600'],
  defaultViewport: { width: 800, height: 600, deviceScaleFactor: 1 },
  protocolTimeout: 600000,
});

let failed = false;
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (['error', 'warning', 'warn'].includes(m.type())) logs.push(m.type() + ': ' + m.text());
  });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  const open = async (filterText, extra) => {
    const url = 'http://127.0.0.1:' + PORT + '/viewer/index.html?shot=1&dpr=1&bg=ffffff&ground=0&filter=' + encodeURIComponent(filterText) + extra;
    await page.goto(url, { waitUntil: 'load', timeout: 300000 });
    // the viewer appends a <pre> with the stack when main() throws, so stop waiting as soon as one shows up
    await page.waitForFunction(() => window.__ready === true || document.querySelector('pre') !== null, { timeout: 240000, polling: 300 });
    const crash = await page.evaluate(() => document.querySelector('pre')?.textContent || '');
    if (crash) throw new Error('viewer crashed: ' + crash.slice(0, 800));
  };

  await open(filter, '');
  const ids = (await page.evaluate(() => window.__list())).map((m) => m.id);
  let flagged = 0;
  for (const id of ids) flagged += describe(id, await page.evaluate((m) => window.__inspect(m), id)) ? 1 : 0;
  console.log(ids.length + ' modules checked, ' + flagged + ' with warnings');

  for (const id of views.length ? ids : []) {
    for (const view of views) {
      await open(id, '&module=' + encodeURIComponent(id) + (view === 'iso' ? '' : '&view=' + view));
      await new Promise((r) => setTimeout(r, 500));
      const file = path.join(outDir, id + '_' + view + '.png');
      await page.screenshot({ path: file });
      const text = execFileSync(process.execPath, [path.join(root, 'scripts', 'ascii-preview.mjs'), file, colsArg, rowsArg], { encoding: 'utf8' });
      console.log('--- ' + id + ' / ' + view + ' ---');
      console.log(text.split('\n').slice(1).join('\n'));
    }
  }
  for (const l of [...new Set(logs)].slice(0, 20)) console.log(l);
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);

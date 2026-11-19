// Builds every module in the registry: exports library/models/glb/<id>.glb, renders
// library/models/previews/<id>.png and writes library/models/index.json.
// Starts its own Vite server on port 5175 and a headless Chrome, so nothing else needs to run.
//
// Usage: npm run build:models [filter]
//   filter: optional, comma-separated id substrings or cat:<category>; only matching modules are rebuilt
//           (their entries replace the old ones in index.json).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'library', 'models');
const indexPath = path.join(outDir, 'index.json');
const filter = process.argv[2] || '';
let PORT = 5175; // the real port is read back after listen(), so several sessions can build side by side

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.js'),
  // hmr off: other sessions edit src/ while this build runs, and a hot reload would destroy the page mid-export
  server: { port: PORT, strictPort: false, hmr: false },
  logLevel: 'warn',
});
await server.listen();
PORT = server.httpServer.address().port;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=900,700'],
  defaultViewport: { width: 900, height: 700, deviceScaleFactor: 1 },
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
  const query = '?shot=1&dpr=1' + (filter ? '&filter=' + encodeURIComponent(filter) : '');
  await page.goto('http://127.0.0.1:' + PORT + '/viewer/index.html' + query, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 500 });

  const list = await page.evaluate(() => window.__list()); // already limited to the filter by the viewer
  const order = await page.evaluate(() => window.__ids); // full registry order, used to sort index.json
  fs.mkdirSync(path.join(outDir, 'previews'), { recursive: true });
  const built = [];
  for (const m of list) {
    // every module in the list matches the filter, the viewer applied it
    const bytes = await page.evaluate((id) => window.__exportGLB(id), m.id);
    await page.evaluate((id) => window.__show(id), m.id);
    await new Promise((r) => setTimeout(r, 700));
    await page.screenshot({ path: path.join(outDir, 'previews', m.id + '.png') });
    built.push({ ...m, file: 'glb/' + m.id + '.glb', preview: 'previews/' + m.id + '.png', glb_bytes: bytes });
    console.log(m.id.padEnd(28) + (bytes / 1e6).toFixed(2) + ' MB  ' + m.triangles + ' tris  ' + m.size_m.join(' x ') + ' m');
  }

  let index = built;
  if (filter && fs.existsSync(indexPath)) {
    const old = JSON.parse(fs.readFileSync(indexPath, 'utf8')).filter((x) => order.includes(x.id) && !built.some((b) => b.id === x.id));
    index = [...old, ...built].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
  console.log('index.json: ' + index.length + ' modules');
  for (const l of [...new Set(logs)].slice(0, 20)) console.log(l);
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);

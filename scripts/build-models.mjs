// Builds every module in the registry: exports library/models/glb/<id>.glb, renders
// library/models/previews/<id>.png and writes library/models/index.json.
// Starts its own Vite server on port 5175 and a headless Chrome, so nothing else needs to run.
//
// Usage: npm run build:models [filter]
//   filter: optional substring; only modules whose id contains it are rebuilt
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
const PORT = 5175;

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.js'),
  server: { port: PORT, strictPort: true },
  logLevel: 'warn',
});
await server.listen();

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
  await page.goto('http://127.0.0.1:' + PORT + '/viewer/index.html?shot=1&dpr=1', { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 500 });

  const list = await page.evaluate(() => window.__list());
  fs.mkdirSync(path.join(outDir, 'previews'), { recursive: true });
  const built = [];
  for (const m of list) {
    if (!m.id.includes(filter)) continue;
    const bytes = await page.evaluate((id) => window.__exportGLB(id), m.id);
    await page.evaluate((id) => window.__show(id), m.id);
    await new Promise((r) => setTimeout(r, 700));
    await page.screenshot({ path: path.join(outDir, 'previews', m.id + '.png') });
    built.push({ ...m, file: 'glb/' + m.id + '.glb', preview: 'previews/' + m.id + '.png', glb_bytes: bytes });
    console.log(m.id.padEnd(28) + (bytes / 1e6).toFixed(2) + ' MB  ' + m.triangles + ' tris  ' + m.size_m.join(' x ') + ' m');
  }

  let index = built;
  if (filter && fs.existsSync(indexPath)) {
    const old = JSON.parse(fs.readFileSync(indexPath, 'utf8')).filter((x) => !built.some((b) => b.id === x.id));
    index = [...old, ...built].sort((a, b) => list.findIndex((l) => l.id === a.id) - list.findIndex((l) => l.id === b.id));
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

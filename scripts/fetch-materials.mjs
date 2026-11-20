// Downloads CC0 PBR material sets from Poly Haven according to manifest/materials.json.
// Output: library/materials/<category>/<id>/{diff,nor,arm}_<res>.jpg + meta.json,
// then rebuilds library/materials/index.json from every meta.json on disk.
// Already-downloaded files are skipped.
//
// Usage: node scripts/fetch-materials.mjs [filter]
//   filter: optional substring matched against the category or the material id.
//   --index: only rebuild index.json (used by fetch-ambientcg.py, which fetches the ambientCG sets).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(root, 'library', 'materials');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest', 'materials.json'), 'utf8'));
const filter = process.argv[2] || '';
const UA = { 'User-Agent': 'castle-asset-library-fetcher' };

// Poly Haven API keys for each map we use.
const MAP_KEYS = { diff: 'Diffuse', nor: 'nor_gl', arm: 'arm', disp: 'Displacement' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(1500 * (attempt + 1));
    }
  }
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest + '.part', buf);
      fs.renameSync(dest + '.part', dest);
      return true;
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(1500 * (attempt + 1));
    }
  }
}

async function fetchMaterial(category, id, res) {
  const dir = path.join(outRoot, category, id);
  const files = await getJson(`https://api.polyhaven.com/files/${id}`);
  const got = [];
  await Promise.all(
    manifest.maps.map(async (m) => {
      // A few Poly Haven sets store the base colour under another key (diff_png, coll1, col_01 / col_1 / col_03 variants).
      const ALT_KEYS = { diff: ['diff_png', 'coll1', 'col_01', 'col_1', 'col_03'] };
      const keys = [MAP_KEYS[m] || m, ...(ALT_KEYS[m] || [])];
      const entry = keys.map((k) => files[k]?.[res]?.jpg || files[k]?.[res]?.png).find(Boolean);
      if (!entry) {
        console.warn(`  ! ${id}: no ${m} at ${res}`);
        return;
      }
      const ext = entry.url.split('.').pop();
      const name = `${m}_${res}.${ext}`;
      if (await download(entry.url, path.join(dir, name))) console.log(`  + ${category}/${id}/${name}`);
      got.push(name);
    }),
  );
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    const info = await getJson(`https://api.polyhaven.com/info/${id}`);
    const meta = {
      id,
      name: info.name || id,
      category,
      tags: info.tags || [],
      polyhaven_categories: info.categories || [],
      dimensions_mm: info.dimensions || null,
      res,
      maps: got.sort(),
      license: 'CC0',
      source: `https://polyhaven.com/a/${id}`,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  }
}

function rebuildIndex() {
  const items = [];
  if (fs.existsSync(outRoot)) {
    for (const cat of fs.readdirSync(outRoot, { withFileTypes: true })) {
      if (!cat.isDirectory()) continue;
      for (const mat of fs.readdirSync(path.join(outRoot, cat.name), { withFileTypes: true })) {
        const metaPath = path.join(outRoot, cat.name, mat.name, 'meta.json');
        if (mat.isDirectory() && fs.existsSync(metaPath)) {
          items.push(JSON.parse(fs.readFileSync(metaPath, 'utf8')));
        }
      }
    }
  }
  items.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(outRoot, 'index.json'), JSON.stringify(items, null, 2) + '\n');
  console.log(`index.json: ${items.length} materials`);
}

async function main() {
  if (filter === '--index') {
    rebuildIndex();
    return;
  }
  fs.mkdirSync(outRoot, { recursive: true });
  const tasks = [];
  for (const [category, { res, ids }] of Object.entries(manifest.categories)) {
    for (const id of ids) {
      if (category.includes(filter) || id.includes(filter)) tasks.push(() => fetchMaterial(category, id, res));
    }
  }
  // Small concurrency pool to stay polite to the CDN.
  const pool = 4;
  let i = 0;
  await Promise.all(
    Array.from({ length: pool }, async () => {
      while (i < tasks.length) {
        const job = tasks[i++];
        try {
          await job();
        } catch (err) {
          console.error('  x', err.message);
        }
      }
    }),
  );
  rebuildIndex();
  console.log('done');
}

main();

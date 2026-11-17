import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const modelsDir = path.join(root, 'library', 'models');

// Dev-only endpoint: the headless exporter POSTs GLB/JSON/PNG files here and
// they are written under library/models/. Nothing outside that folder is writable.
function saveModels() {
  return {
    name: 'save-models',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('POST only');
        }
        const rel = new URL(req.url, 'http://localhost').searchParams.get('path') || '';
        const dest = path.resolve(modelsDir, rel);
        if (!dest.startsWith(modelsDir + path.sep) || !/\.(glb|json|png)$/.test(dest)) {
          res.statusCode = 400;
          return res.end('bad path');
        }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [saveModels()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    // library/ holds thousands of texture files; no need to watch them.
    watch: { ignored: ['**/library/**', '**/node_modules/**'] },
  },
  build: {
    target: 'es2022',
    rollupOptions: { input: { viewer: path.join(root, 'viewer', 'index.html') } },
  },
});

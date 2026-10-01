import { defineConfig, type Plugin } from 'vite';

function serviceWorker(): Plugin {
  return {
    name: 'build-service-worker',
    apply: 'build',
    async closeBundle() {
      const { build } = await import('vite');
      const { readdir, readFile, writeFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const files = await readdir('dist/assets');
      await build({ configFile: false, build: { outDir: 'dist', emptyOutDir: false, lib: { entry: 'src/sw.ts', name: 'sw', formats: ['iife'], fileName: () => 'sw.js' }, minify: true } });
      const swPath = join('dist', 'sw.js');
      const sw = await readFile(swPath, 'utf8');
      const assets = JSON.stringify(files.map(file => `/assets/${file}`));
      const injected = sw.replace(/\b[\w$]+\.__WB_MANIFEST/g, assets);
      if (injected === sw) throw new Error('Service Worker asset injection failed');
      const { createHash } = await import('node:crypto');
      const revision = createHash('sha256').update(assets).digest('hex').slice(0, 10);
      await writeFile(swPath, injected.replace('vku-shell-v1', `vku-shell-${revision}`));
    }
  };
}

export default defineConfig({ plugins: [serviceWorker()] });

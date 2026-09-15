import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const root = process.cwd();
// During parallel UI work the unchanged renderer can be read from UI-MAP's worktree.
// Once UI-MAP merges, omit KNOWLEDGE_MAP_ROOT to use this checkout exclusively.
const mapRoot = process.env.KNOWLEDGE_MAP_ROOT || root;
export default defineConfig({
  root, envDir: mapRoot, plugins: [react()],
  resolve: { alias: { '@knowledge-map-preview': resolve(mapRoot, 'src/map/MapPreview.tsx') }, dedupe: ['react', 'react-dom', 'mapbox-gl', 'three'] },
  server: { host: '127.0.0.1', port: 5186, strictPort: true, fs: { allow: [root, mapRoot] } },
});

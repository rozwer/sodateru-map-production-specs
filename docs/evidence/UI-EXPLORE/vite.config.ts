import { defineConfig } from 'vite';

// Isolated visual inspection before the shared UI shell is integrated.
export default defineConfig({ esbuild: { jsx: 'automatic' } });

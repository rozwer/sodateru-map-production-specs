import { defineConfig } from 'vite';

// Isolated UI verification until the shared shell is integrated.
export default defineConfig({ esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 5319, strictPort: true } });

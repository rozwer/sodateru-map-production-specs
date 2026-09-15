import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Reads the owners' actual shared components while their first PRs are in flight.
// After integration, omit UI_QA_BASE_ROOT/UI_QA_MAP_ROOT to use this checkout.
const root = process.cwd();
const baseRoot = process.env.UI_QA_BASE_ROOT || root;
const mapRoot = process.env.UI_QA_MAP_ROOT || root;
export default defineConfig({
  root,
  envDir: root,
  plugins: [react()],
  resolve: {
    alias: {
      "@qa-app": resolve(baseRoot, "src/app"),
      "@qa-map": resolve(mapRoot, "src/map"),
    },
    dedupe: ["react", "react-dom", "mapbox-gl"],
  },
  server: {
    host: "127.0.0.1",
    port: 5188,
    strictPort: true,
    fs: { allow: [root, baseRoot, mapRoot] },
  },
  build: {
    outDir: resolve(root, ".local/ui-plugins-visual-dist"),
    rollupOptions: {
      input: resolve(root, "docs/evidence/UI-PLUGINS/browser.html"),
    },
  },
});

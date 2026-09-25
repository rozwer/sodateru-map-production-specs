// Isolated capture runtime. Shared API/DB processes are never modified.
import { resolve } from 'node:path';
process.env.SODATERU_PORT='3284';
process.env.SODATERU_DB_PATH=resolve('.local/capture-284-live.sqlite');
process.env.SODATERU_DEMO_DB_PATH=resolve('.local/capture-284-demo.sqlite');
process.env.SODATERU_PROFILES_PATH=resolve('.local/capture-284-profiles.json');
process.env.MAPBOX_ACCESS_TOKEN??=process.env.VITE_MAPBOX_ACCESS_TOKEN;
await import('../../../server/app/main.ts');

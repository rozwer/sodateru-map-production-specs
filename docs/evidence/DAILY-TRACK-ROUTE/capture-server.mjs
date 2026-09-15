// Isolated capture runtime. Shared API/DB processes are never modified.
import { resolve } from 'node:path';
process.env.SODATERU_PORT='3277';
process.env.SODATERU_DB_PATH=resolve('.local/capture-live.sqlite');
process.env.SODATERU_DEMO_DB_PATH=resolve('.local/capture-demo.sqlite');
process.env.SODATERU_PROFILES_PATH=resolve('.local/capture-profiles.json');
process.env.MAPBOX_ACCESS_TOKEN??=process.env.VITE_MAPBOX_ACCESS_TOKEN;
await import('../../../server/app/main.ts');

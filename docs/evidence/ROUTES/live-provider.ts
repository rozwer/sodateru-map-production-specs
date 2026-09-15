import { readFileSync, writeFileSync } from 'node:fs';
import { MapboxRoadProvider } from '../../../server/features/routes/mapbox.ts';
const envPath=process.env.ROUTES_ENV_FILE;
if (!envPath) throw Error('Set ROUTES_ENV_FILE to the configured env file');
const env=readFileSync(envPath,'utf8');
const token=env.match(/^MAPBOX_ACCESS_TOKEN=(.*)$/m)?.[1]?.trim().replace(/^[\'\"]|[\'\"]$/g,'');
if (!token) throw Error('MAPBOX_ACCESS_TOKEN is not configured');
const routes=[];
for(const mode of ['walking','driving'] as const) {
  const route=await new MapboxRoadProvider(token).route([[139.767125,35.681236],[139.769,35.682],[139.771,35.684]],mode,undefined,true);
  routes.push({mode,...route});
}
writeFileSync(new URL('./live-provider.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),kind:'actual-provider-only; CORE HTTP and DB verification remains separate',routes},null,2)+'\n');
console.log(JSON.stringify(routes.map(r=>({mode:r.mode,legs:r.legs.length,distanceM:r.distanceM,durationSec:r.durationSec,steps:r.legs.map(l=>l.steps?.length),fetchedAt:r.fetchedAt}))));

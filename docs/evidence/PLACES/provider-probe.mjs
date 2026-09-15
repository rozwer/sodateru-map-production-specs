import { writeFileSync } from "node:fs";
process.loadEnvFile(process.env.PLACES_ENV_FILE || "/Users/shimurakaiya/3_Workspace/sodateru-map-production-specs/.env");
const timestamp=new Date().toISOString();
async function probe(provider,url,headers={}) {
  try {
    const response=await fetch(url,{headers,signal:AbortSignal.timeout(10_000)});
    let value;try{value=await response.json();}catch{}
    const rows=provider==="nominatim"?value:value?.features;
    return {provider,fetchedAt:Date.now(),status:response.status,ok:response.ok&&Array.isArray(rows),count:Array.isArray(rows)?rows.length:null};
  }catch(error){return {provider,fetchedAt:Date.now(),ok:false,error:error?.name || "Error"};}
}
const nominatim=new URL("/search",process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org");
nominatim.search=new URLSearchParams({q:"東京駅",format:"jsonv2",addressdetails:"1",namedetails:"1",limit:"3","accept-language":"ja",countrycodes:"jp"}).toString();
const mapbox=new URL("https://api.mapbox.com/search/searchbox/v1/category/coffee");
mapbox.search=new URLSearchParams({access_token:process.env.MAPBOX_ACCESS_TOKEN || "",language:"ja",limit:"5",proximity:"139.7671,35.6812",bbox:"139.7449,35.6632,139.7893,35.6992"}).toString();
const results=await Promise.all([
  probe("nominatim",nominatim,{"User-Agent":process.env.NOMINATIM_USER_AGENT || "sodateru-map-production/1.0"}),
  probe("mapbox",mapbox)
]);
const evidence={timestamp,kind:"provider connectivity only; CORE/adapter/DB integration pending",requests:{nominatim:{query:"東京駅",limit:3},mapbox:{category:"coffee",limit:5,origin:[139.7671,35.6812]}},results,notes:"No token, provider response body, or Mapbox temporary candidates are persisted."};
writeFileSync(new URL("provider-connectivity.json",import.meta.url),JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence,null,2));
if(results.some(result=>!result.ok))process.exitCode=1;

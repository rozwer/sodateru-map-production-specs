import { createHash } from 'node:crypto';
import { regionMask } from './mask.ts';
import { validatePng } from './png.ts';
import { JAPAN, definitions } from './catalog.ts';
import type { Bounds, Tile, Layer, LayerId, DisasterSettings, DataStatus } from './types.ts';

const timeUrl = 'https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json';
const mercatorY = (lat: number, z: number) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z;
export function tileBounds(z: number, x: number, y: number): Bounds {
  const lat = (v: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * v / 2 ** z))) * 180 / Math.PI;
  return [x / 2 ** z * 360 - 180, lat(y + 1), (x + 1) / 2 ** z * 360 - 180, lat(y)];
}
export function tilesFor(bounds: Bounds) {
  // Fix a single zoom and enumerate every intersecting tile, never only the region centre.
  for (let z = 10; z >= 4; z-=2) {
    const x0 = Math.floor((bounds[0] + 180) / 360 * 2 ** z);
    const x1 = Math.ceil((bounds[2] + 180) / 360 * 2 ** z) - 1;
    const y0 = Math.floor(mercatorY(bounds[3], z));
    const y1 = Math.ceil(mercatorY(bounds[1], z)) - 1;
    if ((x1-x0+1)*(y1-y0+1) > 16) continue;
    const tiles = [];
    for (let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) tiles.push({z,x,y,bounds:tileBounds(z,x,y)});
    return tiles;
  }
  throw new Error('Region exceeds tile budget');
}
const timestamp = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
function jmaTime(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{14}$/.test(value)) return null;
  const iso = `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:${value.slice(10,12)}:${value.slice(12,14)}Z`;
  return timestamp(iso);
}
export function combinedStatus(tiles: Pick<Tile,'status'>[]): DataStatus {
  if (tiles.length && tiles.every(t => t.status === 'available')) return 'available';
  if (tiles.some(t => t.status === 'available')) return 'partial';
  if (tiles.some(t => t.status === 'providerError')) return 'providerError';
  if (tiles.length && tiles.every(t => t.status === 'outOfCoverage')) return 'outOfCoverage';
  return 'missing';
}
export class DisasterProvider {
  constructor(private fetcher: typeof fetch = fetch, private now: () => number = Date.now) {}
  private async response(url: string, signal: AbortSignal) {
    return this.fetcher(url, {signal:AbortSignal.any([signal, AbortSignal.timeout(15000)]),redirect:'error',headers:{Accept:'image/png, application/json'}});
  }
  private async tile(template: string, t: ReturnType<typeof tilesFor>[number], role: Tile['role'], signal: AbortSignal): Promise<Tile> {
    const sourceUrl = template.replace('{z}',String(t.z)).replace('{x}',String(t.x)).replace('{y}',String(t.y));
    const base: Tile = {...t,role,sourceUrl,fetchedAt:this.now(),sourceUpdatedAt:null,sha256:null,imageDataUrl:null,status:'providerError',error:null};
    try {
      const r = await this.response(sourceUrl,signal);
      base.fetchedAt=this.now();base.sourceUpdatedAt=timestamp(r.headers.get('last-modified'));
      if (r.status === 404 || r.status === 204) return {...base,status:'missing',error:'提供元に該当タイルがありません。安全を意味しません。'};
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const bytes = Buffer.from(await r.arrayBuffer());
      validatePng(bytes);
      return {...base,status:'available',sha256:createHash('sha256').update(bytes).digest('hex'),imageDataUrl:`data:image/png;base64,${bytes.toString('base64')}`};
    } catch (error) {
      signal.throwIfAborted();
      return {...base,fetchedAt:this.now(),error:error instanceof Error ? error.message : 'Provider failure'};
    }
  }
  async fetchLayers(settings: DisasterSettings, signal: AbortSignal): Promise<Layer[]> {
    return Promise.all(settings.layerIds.map(id => this.layer(id,settings.region.bounds,signal)));
  }
  private async layer(id: LayerId, bounds: Bounds, signal: AbortSignal): Promise<Layer> {
    const definition = definitions[id];
    const {template: unused, ...metadata} = definition;
    const layer: Layer = {...metadata,layerId:id,bounds:[...bounds],status:'missing',fetchedAt:this.now(),sourceUpdatedAt:null,
      sourceUpdatedAtMeaning:'配信ファイルのLast-Modified。ハザード策定日・地形測量日ではありません。不明はnull。',
      validAt:null,issuedAt:null,coverage:{envelope:[...JAPAN],description:'日本周辺の配信候補範囲。範囲内でも未整備・欠測・非掲載があり、タイル取得は全地点のデータ存在を保証しません。'},
      tiles:[],noDataMask:null,unknowns:['現在の浸水状況は提供しません。未着色・透明画素・欠測を安全やゼロとして扱いません。']};
    if (bounds[2] <= JAPAN[0] || bounds[0] >= JAPAN[2] || bounds[3] <= JAPAN[1] || bounds[1] >= JAPAN[3]) {
      return {...layer,status:'outOfCoverage',unknowns:[...layer.unknowns,'指定地域は対応範囲外です。']};
    }
    // Partly outside a provider envelope is explicit; do not silently widen/narrow the selected region.
    if (bounds[0]<JAPAN[0] || bounds[1]<JAPAN[1] || bounds[2]>JAPAN[2] || bounds[3]>JAPAN[3]) {
      return {...layer,status:'outOfCoverage',unknowns:[...layer.unknowns,'指定地域の一部が対応範囲外です。地域を絞ってください。']};
    }
    let template: string = definition.template;
    try {
      if (id === 'rainfall') {
        const response = await this.response(timeUrl,signal);
        if (!response.ok) throw new Error(`Time catalogue HTTP ${response.status}`);
        const times: unknown = await response.json();
        if (!Array.isArray(times)) throw new Error('Invalid time catalogue');
        const current = times.filter(t => t && t.basetime===t.validtime && jmaTime(t.validtime)!==null &&
          jmaTime(t.validtime)! <= this.now()+60_000 && Array.isArray(t.elements) && t.elements.includes('hrpns') && t.elements.includes('hrpns_nd'))
          .sort((a,b) => String(b.validtime).localeCompare(String(a.validtime)))[0];
        if (!current) throw new Error('No analysis time with no-data mask');
        layer.validAt=jmaTime(current.validtime);layer.issuedAt=jmaTime(current.basetime);
        layer.sourceUpdatedAtMeaning='タイル配信ファイルのLast-Modified。validAtは降水解析対象、issuedAtはbasetime（解析基準時刻）です。';
        template=`https://www.jma.go.jp/bosai/jmatile/data/nowc/${current.basetime}/none/${current.validtime}/surf/hrpns/{z}/{x}/{y}.png`;
        const sourceUrl=template.replace('/hrpns/{z}/{x}/{y}.png','/hrpns_nd/data.geojson');
        const maskResponse=await this.response(sourceUrl,signal);
        if(!maskResponse.ok)throw new Error(`No-data mask HTTP ${maskResponse.status}`);
        const maskBytes=Buffer.from(await maskResponse.arrayBuffer());
        if(maskBytes.length>10_000_000)throw new Error('No-data mask exceeds size limit');
        const mask=regionMask(JSON.parse(maskBytes.toString('utf8')),bounds);
        layer.noDataMask={sourceUrl,fetchedAt:this.now(),sourceUpdatedAt:timestamp(maskResponse.headers.get('last-modified')),sha256:createHash('sha256').update(maskBytes).digest('hex'),...mask};
        if(mask.hasNoData)layer.unknowns.push('指定地域に提供元が示した降水欠測範囲があります。欠測GeoJSONを重ねて表示してください。');
        if (this.now()-layer.validAt!>20*60_000) throw new Error('Rainfall analysis is older than 20 minutes');
      }
      const coordinates=tilesFor(bounds);
      // At most four requests at once per layer; preserve deterministic tile order.
      const tasks=coordinates.map(t=>({t,role:'data' as const,template}));
      for (let i=0;i<tasks.length;i+=4) layer.tiles.push(...await Promise.all(tasks.slice(i,i+4).map(t=>this.tile(t.template,t.t,t.role,signal))));
      layer.status=combinedStatus(layer.tiles);
      if(layer.status==='available' && layer.noDataMask?.hasNoData)layer.status='partial';
      const updates=layer.tiles.map(t=>t.sourceUpdatedAt);
      layer.sourceUpdatedAt=updates.length && updates.every(t=>t!==null) ? Math.max(...updates as number[]) : null;
      if(layer.status!=='available') layer.unknowns.push('一部または全タイルが欠測・取得失敗です。statusと各タイルのerrorを表示してください。');
    } catch(error) {
      signal.throwIfAborted();layer.status='providerError';layer.unknowns.push(error instanceof Error ? error.message : 'Provider failure');
    }
    layer.fetchedAt=this.now();
    return layer;
  }
}

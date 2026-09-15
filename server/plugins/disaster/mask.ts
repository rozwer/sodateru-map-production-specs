import type { Bounds, Position, MaskGeoJSON } from './types.ts';
function clipRing(input: Position[], bounds: Bounds): Position[] {
  let ring=input.slice();
  if(ring.length>1 && ring[0][0]===ring.at(-1)![0] && ring[0][1]===ring.at(-1)![1]) ring.pop();
  for(const [axis,limit,direction] of [[0,bounds[0],1],[0,bounds[2],-1],[1,bounds[1],1],[1,bounds[3],-1]] as const){
    const output:Position[]=[];
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length];
      const ain=(a[axis]-limit)*direction>=0,bin=(b[axis]-limit)*direction>=0;
      if(ain) output.push(a);
      if(ain!==bin){const t=(limit-a[axis])/(b[axis]-a[axis]);output.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    }
    ring=output;
  }
  if(ring.length<3)return [];
  return [...ring,ring[0]];
}
const area=(ring:Position[])=>Math.abs(ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);
/** Clip provider polygons (including holes) to the requested rectangle; never infer rain intensity. */
export function regionMask(input: unknown,bounds: Bounds): {geojson:MaskGeoJSON;hasNoData:boolean} {
  const collection=input as {type?:string;features?:{type?:string;geometry?:{type?:string;coordinates?:unknown}}[]};
  if(collection?.type!=='FeatureCollection'||!Array.isArray(collection.features))throw new Error('Invalid no-data GeoJSON');
  const features:MaskGeoJSON['features']=[];
  for(const feature of collection.features){
    if(feature.type!=='Feature'||feature.geometry?.type!=='Polygon'||!Array.isArray(feature.geometry.coordinates))throw new Error('Invalid no-data polygon');
    const rings=feature.geometry.coordinates as Position[][];
    if(!rings.length||!rings.every(r=>Array.isArray(r)&&r.length>=3&&r.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))))throw new Error('Invalid no-data coordinates');
    const outer=clipRing(rings[0],bounds);if(!outer.length)continue;
    const holes=rings.slice(1).map(r=>clipRing(r,bounds)).filter(r=>r.length);
    // Fully covered by a hole means this rectangle contains no provider-marked no-data area.
    if(area(outer)-holes.reduce((sum,r)=>sum+area(r),0)<=1e-9)continue;
    features.push({type:'Feature',properties:{kind:'missing',label:'気象庁の降水欠測範囲'},geometry:{type:'Polygon',coordinates:[outer,...holes]}});
  }
  return {geojson:{type:'FeatureCollection',features},hasNoData:features.length>0};
}

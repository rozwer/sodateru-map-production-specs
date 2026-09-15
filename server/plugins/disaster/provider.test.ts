import test from 'node:test';
import assert from 'node:assert/strict';
import { DisasterProvider, tilesFor } from './provider.ts';
import { crc32, deflateSync } from 'node:zlib';
import { validatePng } from './png.ts';
import { regionMask } from './mask.ts';
import { defaultSettings, validateSettings } from './catalog.ts';

const now=Date.UTC(2026,8,15,2,30);
// Deliberate provider transport fixture, never used by production registration.
const chunk=(kind:string,data:Buffer)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(kind,4);data.copy(b,8);b.writeUInt32BE(crc32(b.subarray(4,-4)),b.length-4);return b;};
const header=Buffer.alloc(13);header.writeUInt32BE(256);header.writeUInt32BE(256,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc(256*(256*4+1)))),chunk('IEND',Buffer.alloc(0))]);
function transport(tileStatus=200): typeof fetch {
  return async (input)=>{
    if(String(input).endsWith('.geojson')) return Response.json({type:'FeatureCollection',features:[]});
    if(String(input).endsWith('.json')) return Response.json([{basetime:'20260915023000',validtime:'20260915023000',elements:['hrpns','hrpns_nd']},
      {basetime:'20260915023000',validtime:'20260915023500',elements:['hrpns','hrpns_nd']}]);
    return new Response(tileStatus===200?png:null,{status:tileStatus,headers:{'last-modified':'Tue, 15 Sep 2026 02:29:00 GMT'}});
  };
}
test('all requested tiles retain bounds, source times; rainfall analysis and no-data mask are separate',async()=>{
  const layers=await new DisasterProvider(transport(),()=>now).fetchLayers(defaultSettings,new AbortController().signal);
  assert.equal(layers.length,3);assert.ok(layers.every(l=>l.status==='available'));
  const rain=layers[2];assert.equal(rain.kind,'observation');assert.equal(rain.unit,'mm/h');assert.equal(rain.validAt,now);
  assert.equal(rain.tiles.length,tilesFor(defaultSettings.region.bounds).length);
  assert.equal(rain.noDataMask?.hasNoData,false);assert.equal(rain.sourceUpdatedAt,now-60_000);
  assert.equal(layers[0].validAt,null);assert.equal(layers[1].issuedAt,null);
  assert.deepEqual(rain.bounds,defaultSettings.region.bounds);
});
test('404, provider outage, unsupported region and cancellation never become successful empty data',async()=>{
  for(const [status,expected] of [[404,'missing'],[503,'providerError']] as const){
    const layers=await new DisasterProvider(transport(status),()=>now).fetchLayers(defaultSettings,new AbortController().signal);
    assert.ok(layers.every(l=>l.status===expected));assert.ok(layers.every(l=>l.tiles.every(t=>t.imageDataUrl===null)));
  }
  const noFetch:typeof fetch=async()=>{throw new Error('must not fetch');};
  const outside=await new DisasterProvider(noFetch).fetchLayers({...defaultSettings,region:{id:'outside',bounds:[0,0,1,1]}},new AbortController().signal);
  assert.ok(outside.every(l=>l.status==='outOfCoverage'));
  const controller=new AbortController();controller.abort();
  await assert.rejects(new DisasterProvider(noFetch).fetchLayers(defaultSettings,controller.signal));
});
test('invalid/reversed region and unknown layer are rejected',()=>{
  assert.throws(()=>validateSettings({...defaultSettings,region:{id:'bad',bounds:[140,36,139,35]}}));
  assert.throws(()=>validateSettings({...defaultSettings,layerIds:['current-flood']}));
});

test('provider no-data polygons are clipped and holes preserved; empty mask is distinct from failure',()=>{
  const input={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10]],[[2,2],[8,2],[8,8],[2,8]]]}}]};
  assert.equal(regionMask(input,[3,3,4,4]).hasNoData,false);
  const clipped=regionMask(input,[1,1,3,3]);assert.equal(clipped.hasNoData,true);
  assert.ok(clipped.geojson.features[0].geometry.coordinates.flat().every(([x,y])=>x>=1&&x<=3&&y>=1&&y<=3));
  assert.throws(()=>regionMask({},[1,1,3,3]));
});

test('corrupt/truncated images are rejected instead of cached as available',()=>{
  validatePng(png);
  assert.throws(()=>validatePng(png.subarray(0,-5)));
  const corrupt=Buffer.from(png);corrupt[50]^=1;assert.throws(()=>validatePng(corrupt));
});

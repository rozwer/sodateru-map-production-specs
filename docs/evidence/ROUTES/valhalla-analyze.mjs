/** Offline evidence inspection; does not register a production provider or save a route. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source=JSON.parse(readFileSync(new URL('./valhalla-probe.json',import.meta.url),'utf8'));
function decode(shape){
  assert.equal(typeof shape,'string');let at=0,lat=0,lon=0;const points=[];
  function next(){let value=0,shift=0,byte;do{assert.ok(at<shape.length && shift<=30);byte=shape.charCodeAt(at++)-63;assert.ok(byte>=0&&byte<=63);value+=(byte&31)*2**shift;shift+=5;}while(byte>=32);return value%2?-(value+1)/2:value/2;}
  while(at<shape.length){lat+=next();lon+=next();const p=[lon/1e6,lat/1e6];assert.ok(Math.abs(p[0])<=180&&Math.abs(p[1])<=90);points.push(p);}assert.ok(points.length>=2);return points;
}
const results=[];
for(const item of source.results){
  assert.equal(item.httpStatus,200);const trip=item.body.trip;assert.equal(trip.status,0);assert.equal(trip.units,'kilometers');
  assert.equal(trip.locations.length,item.request.locations.length);assert.equal(trip.legs.length,item.request.locations.length-1);
  trip.locations.forEach((l,i)=>{assert.equal(l.original_index,i);assert.equal(l.lon,item.request.locations[i].lon);assert.equal(l.lat,item.request.locations[i].lat);assert.equal(l.time_zone_name,'Asia/Tokyo');assert.equal(l.time_zone_offset,'+09:00');});
  const warnings=[...(item.body.warnings??[]),...(trip.warnings??[])];let joined=[];
  const legs=trip.legs.map((leg,i)=>{const points=decode(leg.shape);if(i)assert.deepEqual(joined.at(-1),points[0]);joined.push(...(i?points.slice(1):points));assert.ok(leg.summary.length>0&&leg.summary.time>0);return {fromIndex:i,toIndex:i+1,geometry:{type:'LineString',coordinates:points},distanceM:leg.summary.length*1000,durationSec:leg.summary.time};});
  assert.ok(Math.abs(legs.reduce((s,l)=>s+l.distanceM,0)-trip.summary.length*1000)<1e-6);
  assert.ok(Math.abs(legs.reduce((s,l)=>s+l.durationSec,0)-trip.summary.time)<0.002);
  const end=item.request.date_time.type===1?0:trip.locations.length-1;
  assert.equal(trip.locations[end].date_time,item.request.date_time.value);
  const geometry={type:'LineString',coordinates:joined};
  results.push({name:item.name,provider:'valhalla-public-demo',costing:item.request.costing,geometry,geometryHash:createHash('sha256').update(JSON.stringify(geometry)).digest('hex'),legs,distanceM:trip.summary.length*1000,durationSec:trip.summary.time,locationTimes:trip.locations.map(l=>({originalIndex:l.original_index,localDateTime:l.date_time,timeZone:l.time_zone_name,offset:l.time_zone_offset})),warnings,requestedHardExclusionHonored:item.request.costing_options?false:null,productAdoption:'not-integrated'});
}
assert.equal(results.length,3);assert.equal(results[0].geometryHash,results[1].geometryHash);assert.ok(results[2].warnings.some(w=>w.code===208));
writeFileSync(new URL('./valhalla-analysis.json',import.meta.url),JSON.stringify({result:'PASS: raw probe structure/geometry/time checks only',sourceCheckedAt:source.checkedAt,requests:source.results.length,results},null,2)+'\n');
console.log(JSON.stringify(results.map(({name,geometryHash,distanceM,durationSec,warnings})=>({name,geometryHash,distanceM,durationSec,warnings})),null,2));

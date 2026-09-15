import type { Place, Visit, TrackPoint, RecordView } from '../../../packages/api-client/index';
import type { LngLat, MapFocus, TrackDisplay } from '../../app/map-bridge';
import { displayTime, trackRuns } from './activity-data';

export interface TrackStop { id:string; number:number; coordinates:LngLat; name:string; time:string; recordId?:string; visitId?:string }
export function dailyTrackMap(records:RecordView[], visits:Visit[], places:Map<string,Place>, track:TrackPoint[], timeZone:string): {stops:TrackStop[];display:TrackDisplay;focus?:MapFocus;startTime:string;endTime:string} {
 const rows = [
  ...visits.filter(v=>v.status!=='rejected').map(v=>({id:v.id,visitId:v.id,placeId:v.placeId,at:v.startedAt})),
  ...records.filter(r=>!r.visitId || !visits.some(v=>v.id===r.visitId)).map(r=>({id:r.id,recordId:r.id,placeId:r.effectivePlaceId,at:r.effectiveStartedAt})),
 ].filter(row=>row.placeId && places.has(row.placeId));
 const stops:TrackStop[]=rows.filter(row=>row.at!==null).sort((a,b)=>a.at!-b.at!||a.id.localeCompare(b.id)).map((row,index)=>({ ...row,number:index+1,coordinates:places.get(row.placeId!)!.coordinates,name:places.get(row.placeId!)!.name,time:displayTime(row.at,timeZone) }));
 const runs=trackRuns(track);
 const segments=runs.filter(run=>run.points.length>1).map(run=>({id:run.id,coordinates:run.points.map(point=>[point.longitude,point.latitude] as LngLat)}));
 const groups=new Map<string,TrackStop[]>();
 for(const stop of stops){const key=stop.coordinates.join(',');groups.set(key,[...(groups.get(key)??[]),stop]);}
 const points:TrackDisplay['points']=[...groups.values()].map(group=>({id:`stop:${group[0]!.id}`,coordinates:group[0]!.coordinates,number:group[0]!.number,label:`${group.map(stop=>stop.number).join('・')} ${group[0]!.name} ${group.map(stop=>stop.time).join(' / ')}`}));
 const shownCoordinates=new Set(points.map(point=>point.coordinates.join(',')));
 for(const row of rows.filter(row=>row.at===null)){
  const place=places.get(row.placeId!)!;
  if(shownCoordinates.has(place.coordinates.join(',')))continue;
  points.push({id:`stop:${row.id}`,coordinates:place.coordinates,label:place.name});
  shownCoordinates.add(place.coordinates.join(','));
 }
 const first=runs[0]?.points[0],last=runs.at(-1)?.points.at(-1);
 if(first)points.push({id:'track-start',coordinates:[first.longitude,first.latitude],label:`出発 ${displayTime(first.observedAt,timeZone)}`});
 if(last && last.id!==first?.id)points.push({id:'track-end',coordinates:[last.longitude,last.latitude],label:`到着 ${displayTime(last.observedAt,timeZone)}`});
 const coordinates=[...rows.map(row=>places.get(row.placeId!)!.coordinates),...track.map(point=>[point.longitude,point.latitude] as LngLat)];
 let focus:MapFocus|undefined;
 if(coordinates.length){
  const west=Math.min(...coordinates.map(p=>p[0])),east=Math.max(...coordinates.map(p=>p[0])),south=Math.min(...coordinates.map(p=>p[1])),north=Math.max(...coordinates.map(p=>p[1]));
  focus=west===east&&south===north?{center:[west,south],zoom:16}:{bounds:[[west,south],[east,north]],zoom:16};
 }
 return {stops,display:{points,segments},focus,startTime:first?displayTime(first.observedAt,timeZone):stops[0]?.time??'',endTime:last?displayTime(last.observedAt,timeZone):stops.at(-1)?.time??''};
}

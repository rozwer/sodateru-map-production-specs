import { expect, it } from 'vitest';
import type { Place, Visit, TrackPoint, RecordView } from '../../../packages/api-client/index';
import { dailyTrackMap } from './track-map';

const places = new Map([
 ['a', { id:'a', name:'駅', coordinates:[139.63,35.45] } as Place],
 ['b', { id:'b', name:'公園', coordinates:[139.65,35.47] } as Place],
]);
const visit = (id:string,placeId:string,startedAt:number,status:Visit['status']='confirmed') => ({id,placeId,startedAt,status} as Visit);
const point = (id:string,longitude:number,latitude:number,observedAt:number,breakBefore=false) => ({id,longitude,latitude,observedAt,segmentId:'walk',breakBefore} as TrackPoint);

it('numbers dated visits chronologically and excludes rejected visits without inventing a route',()=>{
 const result=dailyTrackMap([], [visit('later','b',200),visit('denied','b',150,'rejected'),visit('first','a',100),{...visit('undated','a',0),startedAt:null}],places,[],'Asia/Tokyo');
 expect(result.stops.map(stop=>[stop.id,stop.number])).toEqual([['first',1],['later',2]]);
 expect(result.display.segments).toEqual([]);
 expect(result.focus?.bounds).toEqual([[139.63,35.45],[139.65,35.47]]);
 expect(result.display.points).toHaveLength(2);
});

it('keeps distant undated locations visible without assigning a chronological number',()=>{
 const distantPlaces=new Map([...places,['c',{id:'c',name:'遠方',coordinates:[140,36]} as Place] as const]);
 const result=dailyTrackMap([], [visit('first','a',100),{...visit('undated','c',0),startedAt:null}],distantPlaces,[],'Asia/Tokyo');
 expect(result.stops.map(stop=>stop.id)).toEqual(['first']);
 expect(result.focus?.bounds).toEqual([[139.63,35.45],[140,36]]);
 expect(result.display.points.find(point=>point.id==='stop:undated')).toMatchObject({coordinates:[140,36],label:'遠方'});
 expect(result.display.points.find(point=>point.id==='stop:undated')?.number).toBeUndefined();
 expect(result.display.segments).toEqual([]);
});

it('fits all recorded coordinates and preserves provider gaps rather than connecting them',()=>{
 const result=dailyTrackMap([],[],places,[point('4',139.68,35.49,400),point('1',139.60,35.40,100),point('2',139.62,35.42,200),point('3',139.66,35.48,300,true)],'Asia/Tokyo');
 expect(result.display.segments.map(line=>line.coordinates)).toEqual([[[139.60,35.40],[139.62,35.42]],[[139.66,35.48],[139.68,35.49]]]);
 expect(result.focus?.bounds).toEqual([[139.60,35.40],[139.68,35.49]]);
 expect(result.display.points.find(p=>p.id==='track-start')?.coordinates).toEqual([139.60,35.40]);
 expect(result.display.points.find(p=>p.id==='track-end')?.coordinates).toEqual([139.68,35.49]);
});

it('includes placed records without visits and combines repeated coordinates into one map marker',()=>{
 const records=[{id:'record',effectivePlaceId:'a',effectiveStartedAt:100,visitId:null} as RecordView];
 const result=dailyTrackMap(records,[visit('return','a',300)],places,[],'Asia/Tokyo');
 expect(result.stops.map(stop=>stop.id)).toEqual(['record','return']);
 expect(result.display.points).toHaveLength(1);
 expect(result.display.points[0]?.label).toContain('1・2');
 expect(dailyTrackMap([],[],places,[],'Asia/Tokyo').focus).toBeUndefined();
});

import {describe,it,expect} from 'vitest';
import type {SavedRoute} from '../../../packages/api-client/index';
import {navigationView} from './navigation';
const line={type:'LineString' as const,coordinates:[[139,35],[139.001,35]] as [number,number][]};
const route={id:'r',title:'fixture',mode:'walking',status:'navigating',currentLeg:0,fetchedAt:1,legs:[{distanceM:100,durationSec:80,geometry:line,steps:[{geometry:line,distanceM:100,durationSec:80,location:[139,35],type:'depart',modifier:null,instruction:'直進',name:'道'},{geometry:{type:'LineString',coordinates:[[139.001,35],[139.001,35]]},distanceM:0,durationSec:0,location:[139.001,35],type:'arrive',modifier:null,instruction:'到着',name:'目的地'}]}]} as SavedRoute;
const fix={longitude:139.0005,latitude:35,accuracy:5,timestamp:100000};
describe('saved route navigation',()=>{
 it('uses the saved step geometry and time proportion for current position',()=>{const v=navigationView(route,fix,100000);expect(v.remainingDistanceM).toBeCloseTo(50);expect(v.remainingDurationSec).toBeCloseTo(40);expect(v.direction).toBe('arrive');expect(v.accuracyM).toBe(5);});
 it('does not invent distances for stale, inaccurate or off-route positions',()=>{for(const [p,now] of [[fix,131000],[{...fix,accuracy:100},100000],[{...fix,latitude:36},100000]] as const)expect(navigationView(route,p,now).remainingDistanceM).toBeNull();});
 it('advances only one existing leg near its end and never finishes automatically',()=>{const two={...route,legs:[...route.legs,...route.legs]};expect(navigationView(two,{...fix,longitude:139.001},100000).nextLeg).toBe(1);expect(navigationView(two,fix,100000).nextLeg).toBeUndefined();});
 it('does not infer walking turns for transit or automatically finish at arrival',()=>{expect(navigationView({...route,mode:'transit'},fix,100000).instruction).toBeNull();expect(navigationView(route,{...fix,longitude:139.001},100000).status).toBe('navigating');});
});

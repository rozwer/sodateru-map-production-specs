import type {SavedRoute} from '../../../packages/api-client/index';
import type {NavigationView,TurnDirection} from './types';
export type Fix={longitude:number;latitude:number;accuracy:number;timestamp:number};
const metres=(a:number[],b:number[])=>Math.hypot((a[0]!-b[0]!)*111320*Math.cos(b[1]!*Math.PI/180),(a[1]!-b[1]!)*111320);
const direction=(type:string,modifier:string|null):TurnDirection=>type==='arrive'?'arrive':modifier?.includes('uturn')?'uturn':modifier?.includes('left')?'left':modifier?.includes('right')?'right':'straight';
/** Project only onto the saved current leg. Distances are estimates from that same provider geometry. */
export function navigationView(route:SavedRoute,fix:Fix|null,now=Date.now()):NavigationView{
 const view:NavigationView={routeId:route.id,title:route.title,status:route.status,instruction:route.legs[route.currentLeg]?.steps?.length?'現在地を取得すると次の案内を表示します':null,direction:null,turnDistanceM:null,remainingDistanceM:null,remainingDurationSec:null,accuracyM:fix?.accuracy??null,locationStatus:'idle',fetchedAt:route.fetchedAt};
 if(!fix||now-fix.timestamp>30000||fix.timestamp>now+5000||fix.accuracy>50||!Number.isFinite(fix.accuracy))return {...view,locationStatus:fix?'unavailable':'idle'};
 const steps=route.legs[route.currentLeg]?.steps;
 if(!steps?.length||route.mode!=='walking'||route.status!=='navigating')return {...view,locationStatus:'available'};
 let best:{distance:number;step:number;fraction:number}|null=null;
 for(let i=0;i<steps.length;i++){
  const coords=steps[i]!.geometry.coordinates;const lengths=coords.slice(1).map((p,j)=>metres(coords[j]!,p));const total=lengths.reduce((a,b)=>a+b,0);let before=0;
  for(let j=0;j<lengths.length;j++){
   const a=coords[j]!,b=coords[j+1]!,scale=Math.cos(fix.latitude*Math.PI/180),dx=(b[0]-a[0])*scale,dy=b[1]-a[1],den=dx*dx+dy*dy;
   const t=den?Math.max(0,Math.min(1,((fix.longitude-a[0])*scale*dx+(fix.latitude-a[1])*dy)/den)):0;
   const distance=metres([fix.longitude,fix.latitude],[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
   if(!best||distance<best.distance-1)best={distance,step:i,fraction:total?(before+t*lengths[j]!)/total:0};
   before+=lengths[j]!;
  }
 }
 if(!best||best.distance>Math.max(30,fix.accuracy))return {...view,locationStatus:'available'};
 const current=steps[best.step]!,next=steps[best.step+1]??current;
 const later=steps.slice(best.step+1),legs=route.legs.slice(route.currentLeg+1);
 return {...view,...(best.step>=steps.length-2&&best.fraction>=0.98&&fix.accuracy<=20&&route.currentLeg<route.legs.length-1?{nextLeg:route.currentLeg+1}:{}),locationStatus:'available',instruction:next.instruction,roadName:next.name,direction:direction(next.type,next.modifier),turnDistanceM:current.distanceM*(1-best.fraction),remainingDistanceM:current.distanceM*(1-best.fraction)+later.reduce((n,s)=>n+s.distanceM,0)+legs.reduce((n,l)=>n+l.distanceM,0),remainingDurationSec:current.durationSec*(1-best.fraction)+later.reduce((n,s)=>n+s.durationSec,0)+legs.reduce((n,l)=>n+l.durationSec,0)};
}

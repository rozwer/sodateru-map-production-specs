import {useCallback,useEffect,useRef,useState} from 'react';
import type {Fix} from './navigation';
export function useNavigationPosition(enabled:boolean){
 const [fix,setFix]=useState<Fix|null>(null),[state,setState]=useState<'idle'|'locating'|'denied'|'unavailable'|'available'>('idle');
 const watch=useRef<number|undefined>(undefined);const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const stop=useCallback(()=>{if(watch.current!==undefined)navigator.geolocation?.clearWatch(watch.current);watch.current=undefined;clearTimeout(timer.current);},[]);
 const locate=useCallback(()=>{
  stop();setFix(null);
  if(!enabled||!navigator.geolocation){setState('unavailable');return;}
  setState('locating');
  watch.current=navigator.geolocation.watchPosition(p=>{
   setFix({longitude:p.coords.longitude,latitude:p.coords.latitude,accuracy:p.coords.accuracy,timestamp:p.timestamp});setState('available');clearTimeout(timer.current);
   timer.current=setTimeout(()=>{setFix(null);setState('unavailable');},Math.max(0,30000-(Date.now()-p.timestamp)));
  },error=>{setFix(null);setState(error.code===1?'denied':'unavailable');},{enableHighAccuracy:true,maximumAge:0,timeout:10000});
 },[enabled,stop]);
 useEffect(()=>{if(!enabled){stop();setFix(null);setState('idle');}return stop;},[enabled,stop]);
 return {fix,state,locate};
}

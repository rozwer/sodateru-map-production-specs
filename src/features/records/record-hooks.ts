import { useEffect, useRef, useState } from 'react';
import type { Place, RecordDetail, Visit } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { PlaceChoice } from './form-types';
import { errorText, readRecord } from './record-flow';

export function placeChoice(place: Place, photoUrl?: string | null): PlaceChoice {
  return {id:place.id,name:place.name,address:place.address,longitude:place.coordinates[0],latitude:place.coordinates[1],source:'saved',photoUrl};
}

export function useRecordDetail(recordId: string | undefined, scopeKey: string, active: boolean) {
  const [detail,setDetail]=useState<RecordDetail|null>(null);
  const [place,setPlace]=useState<PlaceChoice|null>(null);
  const [visit,setVisit]=useState<Visit|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!recordId || !active)return;
    const controller=new AbortController();
    setLoading(true);setError('');setDetail(null);setPlace(null);setVisit(null);
    void readRecord(api,recordId,controller.signal).then(async data=>{
      if(controller.signal.aborted)return;
      setDetail(data);
      const mediaPhoto=data.media.status==='ready' ? data.media.data.items.find(item=>item.kind==='photo' && item.status==='ready')?.contentUrl : null;
      const requests:Promise<void>[]=[];
      if(data.record.effectivePlaceId)requests.push(api.request('getPlacesPlaceId',{path:{placeId:data.record.effectivePlaceId},signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setPlace(placeChoice(result.data.place,mediaPhoto));}));
      if(data.record.visitId)requests.push(api.request('getVisitsVisitId',{path:{visitId:data.record.visitId},signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setVisit(result.data);}));
      const results=await Promise.allSettled(requests);
      if(controller.signal.aborted)return;
      const failed=results.find(result=>result.status==='rejected');
      if(failed?.status==='rejected')setError(`記録は取得済みです。関連情報を取得できませんでした。${errorText(failed.reason)}`);
    }).catch(error=>{if(!controller.signal.aborted)setError(errorText(error));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[recordId,scopeKey,active,revision]);
  return {detail,place,visit,error,loading,reload:()=>setRevision(value=>value+1)};
}

export function useScreenMutation(scopeKey:string, active:boolean) {
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[scopeKey]);
  useEffect(()=>{if(!active)controller.current?.abort();},[active]);
  return ()=>{controller.current?.abort();const abort=new AbortController();controller.current=abort;return abort;};
}

import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from 'react';
import type { ScreenProps } from '../../app/contracts';
import { api } from '../../app/api';
import type { MediaDraft } from './form-types';

const MediaActive=createContext(true);
export function withRecordMediaScope(Component:ComponentType<ScreenProps>):ComponentType<ScreenProps> {
 return function MediaScreen(props:ScreenProps){return <MediaActive.Provider value={props.active!==false}><Component {...props}/></MediaActive.Provider>;};
}

/** Protected media needs the same mode and session headers as every other API read. */
export function MediaContent({item,photoOnly=false}:{item:MediaDraft;photoOnly?:boolean}) {
 const active=useContext(MediaActive);
 const player=useRef<HTMLMediaElement|null>(null);
 useEffect(()=>{if(!active)player.current?.pause();},[active]);
 const protectedMedia=Boolean(item.version && !item.file && item.state==='ready');
 const [source,setSource]=useState<string|null>(protectedMedia?null:item.url);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!active)return;
  setFailed(false);
  if(!protectedMedia){setSource(item.url);return;}
  const abort=new AbortController();let objectUrl:string|undefined;setSource(null);
  void api.request('getMediaMediaIdContent',{path:{mediaId:item.id},signal:abort.signal}).then(blob=>{
   if(abort.signal.aborted)return;
   objectUrl=URL.createObjectURL(blob);setSource(objectUrl);
  }).catch(()=>{if(!abort.signal.aborted)setFailed(true);});
  return()=>{abort.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[item.id,item.version,item.url,protectedMedia,active]);
 if(failed || !source)return <span className="records-media-unavailable" role="status">{failed?'媒体を取得できませんでした':'媒体を読み込んでいます…'}</span>;
 if(photoOnly || item.kind==='photo')return <img src={source} alt={item.name} onError={()=>setFailed(true)}/>;
 if(item.kind==='video')return <video ref={node=>{player.current=node;}} src={source} controls preload="metadata" aria-label={item.name} onError={()=>setFailed(true)}/>;
 return <audio ref={node=>{player.current=node;}} src={source} controls aria-label={item.name} onError={()=>setFailed(true)}/>;
}

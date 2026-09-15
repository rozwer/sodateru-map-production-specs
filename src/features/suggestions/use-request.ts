import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../packages/api-client/index';
import type { Notice } from './view-model';

/** Screen lifetime guards supplement the shared client's person/mode cancellation. */
export function useRequest(scopeKey:string,active=true) {
 const alive=useRef(true);const abort=useRef(new AbortController());const busyRef=useRef(false);
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{alive.current=active;abort.current=new AbortController();busyRef.current=false;setBusy(false);return()=>{alive.current=false;abort.current.abort();};},[scopeKey,active]);
 const run=async(action:(signal:AbortSignal)=>Promise<void>,label='処理')=>{
  if(busyRef.current||!alive.current)return;
  const controller=abort.current;busyRef.current=true;setBusy(true);setNotice({kind:'loading',text:`${label}中…`});
  try{await action(controller.signal);}catch(error){
   if(controller.signal.aborted||!alive.current)return;
   const conflict=error instanceof ApiError&&(error.status===409||error.status===412);
   setNotice({kind:'error',text:`${label}できませんでした。${error instanceof Error?error.message:'通信に失敗しました。'}${conflict?' 保存済みの最新内容を確認してください。':''}`,retry:()=>{void run(action,label);}});
  }finally{if(!controller.signal.aborted&&alive.current){busyRef.current=false;setBusy(false);setNotice(current=>current?.kind==='loading'?null:current);}}
 };
 return {run,busy,notice,setNotice,signal:()=>abort.current.signal,valid:(signal:AbortSignal)=>alive.current&&!signal.aborted};
}

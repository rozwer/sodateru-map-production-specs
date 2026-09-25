import { describe, expect, it } from 'vitest';
import { createApiClient, type Media, type RecordCreate, type RecordView, type Visit } from '../../../packages/api-client/index';
import { blankDraft } from './form-types';
import { createSaveSession, saveNewRecord, recordPatch, draftFromRecord } from './record-flow';
import { localDay } from '../activity/activity-data';

function transport({loseCreate=false,failSecondPhoto=false}={}) {
 const records=new Map<string,RecordView>(), visits=new Map<string,Visit>(), media:Media[]=[];
 const calls:{method:string;path:string;key:string|null;version:string|null;body:unknown}[]=[];
 let createLost=loseCreate, mediaFailed=false;
 const fetcher=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const path=new URL(String(input),'http://test').pathname,method=init?.method??'GET',headers=new Headers(init?.headers);
  const body=init?.body instanceof FormData?Object.fromEntries(init.body.entries()):init?.body?JSON.parse(String(init.body)):undefined;
  calls.push({method,path,key:headers.get('Idempotency-Key'),version:headers.get('If-Match'),body});
  const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
  if(path==='/api/v1/visits' && method==='POST'){
   const value=body as Visit;
   const visit={...value,version:1,status:'candidate' as const,createdAt:1,updatedAt:1,personId:'test-person'};visits.set(visit.id,visit);return json({data:visit},201);
  }
  if(path.startsWith('/api/v1/visits/') && method==='PATCH'){
   const visit=visits.get(path.split('/')[4]!)!;const patch=body as {status:Visit['status']};visit.status=patch.status;visit.version++;return json({data:visit});
  }
  if(path==='/api/v1/records'&&method==='POST'){
   const value=body as RecordView;
   const record=records.get(value.id)??{...value,personId:'test-person',version:1,createdAt:1,updatedAt:1,effectivePlaceId:value.placeId,effectiveStartedAt:value.occurredAt,effectiveEndedAt:value.endedAt,effectiveTimePrecision:value.timePrecision};
   records.set(value.id,record);
   if(createLost){createLost=false;throw new TypeError('Connection lost after commit');}
   return json({data:record},201);
  }
  const id=path.split('/')[4];
  const record=id?records.get(id):undefined;
  if(record&&method==='GET')return json({data:{record,media:{status:'ready',data:{items:media,nextCursor:null}}}});
  if(record&&method==='POST'&&path.endsWith('/media')){
   const item=body as {id:string;file:File;position:string};
   if(Number(item.position)===1&&failSecondPhoto&&!mediaFailed){mediaFailed=true;return json({error:{code:'FILE_STORAGE_FAILED',message:'test media write failure',requestId:'test-request'}},503);}
   if(headers.get('If-Match')!==`"${record.version}"`)return json({error:{code:'VERSION_CONFLICT',message:'version mismatch',requestId:'test-request'}},409);
   const result:Media={id:item.id,version:1,createdAt:1,updatedAt:1,recordId:record.id,kind:'photo',mimeType:'image/png',byteSize:item.file.size,position:Number(item.position),status:'ready',contentUrl:`/media/${item.id}/content`};
   media.push(result);record.version++;return json({data:result},201);
  }
  throw new Error(`Unexpected request ${method} ${path}`);
 };
 return {client:createApiClient({fetch:fetcher}),records,visits,media,calls};
}

describe('record UI save calls',()=>{
 it('keeps the creation ID and key when the response is lost, with no implicit visit or date',async()=>{
  const harness=transport({loseCreate:true});
  const session=createSaveSession({...blankDraft(),body:'日時も場所も不明の体験'},null);
  await expect(saveNewRecord(harness.client,session,()=>{})).rejects.toThrow('Connection lost');
  const saved=await saveNewRecord(harness.client,session,()=>{});
  const posts=harness.calls.filter(call=>call.method==='POST');
  expect(posts).toHaveLength(2);
  expect(posts.map(call=>call.key)).toEqual([session.recordKey,session.recordKey]);
  expect(posts.map(call=>call.path)).toEqual(['/api/v1/records','/api/v1/records']);
  expect(harness.records.size).toBe(1);
  expect(saved).toMatchObject({id:session.recordId,body:'日時も場所も不明の体験',visitId:null,placeId:null,occurredAt:null,timePrecision:'unknown'});
 });
 it('adds another record to an existing candidate without creating or confirming a visit',async()=>{
  const harness=transport();
  const visit={id:'existing-visit',placeId:'place-a',status:'candidate',version:1} as Visit;
  const session=createSaveSession({...blankDraft(),body:'同じ訪問の追加記録'}, {id:'place-a',name:'場所A',address:null,longitude:136,latitude:35,source:'saved'},null,visit);
  const saved=await saveNewRecord(harness.client,session,()=>{});
  expect(saved.visitId).toBe(visit.id);
  expect(harness.calls.some(call=>call.path.includes('/visits'))).toBe(false);
 });
 it('retries only the failed photo while retaining the record and first photo',async()=>{
  const harness=transport({failSecondPhoto:true});
  const session=createSaveSession({...blankDraft(),body:'写真を添えた体験',media:[0,1].map(position=>({id:`photo-${position}`,file:new File(['photo'],`${position}.png`,{type:'image/png'}),name:`${position}.png`,kind:'photo' as const,url:null,state:'draft' as const,position}))},null);
  await expect(saveNewRecord(harness.client,session,()=>{})).rejects.toThrow('本文は保存済み');
  expect(harness.records.get(session.recordId)?.body).toBe('写真を添えた体験');
  expect(harness.media.map(item=>item.id)).toEqual(['photo-0']);
  await saveNewRecord(harness.client,session,()=>{});
  expect(harness.calls.filter(call=>call.method==='POST'&&call.path==='/api/v1/records')).toHaveLength(1);
  const uploads=harness.calls.filter(call=>call.method==='POST'&&call.path.endsWith('/media'));
  expect(uploads.map(call=>call.key)).toEqual(['photo-0','photo-1','photo-1']);
  expect(uploads.map(call=>call.version)).toEqual(['"1"','"2"','"2"']);
  expect(harness.media.map(item=>item.id)).toEqual(['photo-0','photo-1']);
 });
 it('explicitly confirms a newly created candidate only when the user checked visited',async()=>{
  const harness=transport();
  const place={id:'saved-place',source:'saved' as const,name:'確認用の場所',address:null,longitude:136.9,latitude:35.1};
  const session=createSaveSession({...blankDraft(),body:'訪問を自分で確認した体験',visited:true},place);
  const saved=await saveNewRecord(harness.client,session,()=>{});
  expect(harness.visits.get(session.visitId!)?.status).toBe('confirmed');
  expect(saved.visitId).toBe(session.visitId);
  expect(harness.calls.filter(call=>call.method!=='GET').map(call=>`${call.method} ${call.path}`)).toEqual(['/api/v1/visits','/api/v1/visits/'+session.visitId,'/api/v1/records'].map((path,index)=>`${index===1?'PATCH':'POST'} ${path}`));
 });
 it('does not round persisted timestamps when only the text changes',async()=>{
  const harness=transport();
  const session=createSaveSession({...blankDraft(),body:'元の言葉'},null);
  const saved=await saveNewRecord(harness.client,session,()=>{});
  const precise={...saved,occurredAt:1789443035123,effectiveStartedAt:1789443035123,timePrecision:'exact' as const,effectiveTimePrecision:'exact' as const};
  const draft=draftFromRecord(precise,[]);
  expect(recordPatch(precise,{...draft,body:'追記した言葉'})).toEqual({body:'追記した言葉'});
 });
 it('updates sharing scope and recipients together without changing saved times',async()=>{
  const harness=transport();
  const session=createSaveSession({...blankDraft(),body:'共有範囲の確認'},null);
  const saved=await saveNewRecord(harness.client,session,()=>{});
  const selected=recordPatch(saved,{...draftFromRecord(saved,[]),visibility:'selected',sharedWith:['friend-a']});
  expect(selected).toEqual({visibility:'selected',sharedWith:['friend-a']});
  const privateAgain=recordPatch({...saved,visibility:'selected',sharedWith:['friend-a']},{...draftFromRecord(saved,[]),visibility:'private',sharedWith:[]});
  expect(privateAgain).toEqual({visibility:'private',sharedWith:[]});
 });
 it('uses the selected local date boundaries, including a daylight-saving day',()=>{
  const tokyo=localDay('2026-09-15','Asia/Tokyo');
  expect(new Date(tokyo.from).toISOString()).toBe('2026-09-14T15:00:00.000Z');
  expect(tokyo.to-tokyo.from).toBe(24*60*60*1000);
  const newYork=localDay('2026-03-08','America/New_York');
  expect(newYork.to-newYork.from).toBe(23*60*60*1000);
 });
});

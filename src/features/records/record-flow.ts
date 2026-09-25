import { ApiError, type ApiClient, type RecordCreate, type RecordDetail, type RecordView, type Visit, type Media, type RecordPatch } from '../../../packages/api-client/index';
import type { MediaDraft, PlaceChoice, RecordDraft } from './form-types';

export type SaveProgress = {
  recordId: string;
  record?: RecordView;
  stage: 'place' | 'visit' | 'record' | 'media' | 'complete';
  media: MediaDraft[];
};

export type RecordSaveSession = {
  recordId: string;
  placeId: string | null;
  visitId: string | null;
  placeKey: string;
  visitKey: string;
  recordKey: string;
  topicKey: string | null;
  draft: RecordDraft;
  place: PlaceChoice | null;
  body?: RecordCreate;
  record?: RecordView;
  visit?: Visit;
  visitConfirmationStarted?: boolean;
  uploaded: Record<string, Media>;
};

export function createSaveSession(draft: RecordDraft, place: PlaceChoice | null, topicKey: string | null = null, existingVisit?: Visit): RecordSaveSession {
  return {
    recordId: crypto.randomUUID(),
    placeId: place ? place.source === 'saved' ? place.id : crypto.randomUUID() : null,
    visitId: existingVisit?.id ?? (draft.visited && place ? crypto.randomUUID() : null),
    visit: existingVisit,
    placeKey: crypto.randomUUID(), visitKey: crypto.randomUUID(), recordKey: crypto.randomUUID(),
    draft: {...draft,media:draft.media.map(item=>({...item})),purposes:[...draft.purposes],sharedWith:[...draft.sharedWith]},
    place, topicKey, uploaded: {},
  };
}

/** Local date/time is only committed after the user explicitly chooses it. */
export function draftTimes(draft: RecordDraft): { occurredAt: number | null; endedAt: number | null; timePrecision: RecordDraft['timePrecision'] } {
  if (!draft.date || draft.timePrecision === 'unknown') return {occurredAt:null,endedAt:null,timePrecision:'unknown'};
  const occurredAt = new Date(`${draft.date}T${draft.startTime || '00:00'}:00`).getTime();
  const endedAt = draft.endTime ? new Date(`${draft.date}T${draft.endTime}:00`).getTime() : null;
  if (!Number.isFinite(occurredAt) || (endedAt !== null && (!Number.isFinite(endedAt) || endedAt < occurredAt))) throw new Error('終了時刻は開始時刻以降にしてください。');
  return {occurredAt,endedAt,timePrecision:draft.startTime ? draft.timePrecision : 'approximate'};
}

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 412) return '保存後に内容が変更されました。入力を保持しています。現在の内容を読み直して確認してください。';
    if (error.status === 413) return '媒体のサイズが大きすぎます。50 MiB以下のファイルを選んでください。';
    if (error.status === 415) return 'この媒体形式は保存できません。JPEG・PNG・WebP・MP4を選んでください。';
    return error.message;
  }
  return error instanceof Error ? error.message : '通信に失敗しました。入力を保持しています。';
}

export async function readRecord(client: ApiClient, recordId: string, signal?: AbortSignal): Promise<RecordDetail> {
  const {data} = await client.request('getRecordsRecordId',{path:{recordId},signal});
  if (data.media.status !== 'ready') return data;
  let cursor = data.media.data.nextCursor;
  const items = [...data.media.data.items];
  while (cursor) {
    const page = await client.request('getRecordsRecordIdMedia',{path:{recordId},query:{cursor,limit:100},signal});
    items.push(...page.items); cursor=page.nextCursor;
  }
  return {...data,media:{status:'ready',data:{items,nextCursor:null}}};
}

export function mediaDraft(media: Media): MediaDraft {
  return {id:media.id,url:media.status === 'ready' ? media.contentUrl : null,kind:media.kind,name:`${media.kind === 'photo' ? '写真' : media.kind === 'video' ? '動画' : '音声'} ${media.position+1}`,position:media.position,version:media.version,state:media.status};
}

export function draftFromRecord(record: RecordView, media: Media[]): RecordDraft {
  const local = (timestamp: number | null) => {
    if (timestamp === null) return {date:'',time:''};
    const date = new Date(timestamp);
    const dateString = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return {date:dateString,time:`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`};
  };
  const start = local(record.effectiveStartedAt), end = local(record.effectiveEndedAt);
  return {body:record.body,impression:record.impression,purposes:[...record.purposes],date:start.date,startTime:start.time,endTime:end.time,timePrecision:record.effectiveTimePrecision,bookmarked:record.bookmarked,visibility:record.visibility,sharedWith:[...record.sharedWith],visited:false,media:media.map(mediaDraft),removedMedia:[]};
}

/** Freeze one logical save; retry it with exactly the same IDs, inputs, and keys. */
export async function saveNewRecord(client: ApiClient, session: RecordSaveSession, progress: (state: SaveProgress) => void, signal?: AbortSignal, onChanged?: () => void): Promise<RecordView> {
  const state = (stage: SaveProgress['stage']) => progress({recordId:session.recordId,record:session.record,stage,media:session.draft.media.map(item=>session.uploaded[item.id] ? {...item,...mediaDraft(session.uploaded[item.id]!)} : item)});
  const time = draftTimes(session.draft);
  if (session.place?.source === 'candidate') {
    if (!session.place.resultId || !session.placeId) throw new Error('場所候補の有効な取得IDがありません。場所を検索し直してください。');
    state('place');
    const {data} = await client.request('postPlaces',{body:{id:session.placeId,mode:'candidate',resultId:session.place.resultId,candidateId:session.place.id},idempotencyKey:session.placeKey,signal});
    session.placeId=data.id; session.place={...session.place,id:data.id,source:'saved'};
  }
  if (session.visitId && !session.visit) {
    if (!session.placeId) throw new Error('訪問を確認する場所を選んでください。');
    state('visit');
    const {data} = await client.request('postVisits',{body:{id:session.visitId,placeId:session.placeId,startedAt:time.occurredAt,endedAt:time.endedAt,timePrecision:time.timePrecision,origin:'manual'},idempotencyKey:session.visitKey,signal});
    session.visit=data; onChanged?.();
  }
  if (session.visit && session.draft.visited && session.visit.status!=='confirmed') {
    state('visit');
    if(session.visitConfirmationStarted){
      const {data}=await client.request('getVisitsVisitId',{path:{visitId:session.visit.id},signal});
      if(data.status==='confirmed'){session.visit=data;onChanged?.();}
    }
    if(session.visit.status!=='confirmed'){
      session.visitConfirmationStarted=true;
      const {data}=await client.request('patchVisitsVisitId',{path:{visitId:session.visit.id},version:session.visit.version,body:{status:'confirmed'},signal});
      session.visit=data; onChanged?.();
    }
  }
  if (!session.record) {
    state('record');
    session.body ??= {
      id:session.recordId,kind:'experience',visitId:session.visitId,placeId:session.visitId ? null : session.placeId,
      occurredAt:session.visitId ? null : time.occurredAt,endedAt:session.visitId ? null : time.endedAt,timePrecision:session.visitId ? 'unknown' : time.timePrecision,
      body:session.draft.body,purposes:session.draft.purposes,activities:[],impression:session.draft.impression,periodAnswers:{},
      bookmarked:session.draft.bookmarked,useForSuggestions:false,topicKey:session.topicKey,visibility:session.draft.visibility,sharedWith:session.draft.sharedWith,
    };
    const {data} = await client.request('postRecords',{body:session.body,idempotencyKey:session.recordKey,signal});
    session.record=data; onChanged?.();
  }
  const failures: string[] = [];
  for (const item of session.draft.media) {
    if (session.uploaded[item.id]?.status === 'ready') continue;
    if (!item.file) {failures.push(item.id);continue;}
    item.state='pending';state('media');
    try {
      // Parent version changes with every media attachment. Refresh it even after an uncertain response.
      const current = await readRecord(client,session.recordId,signal); session.record=current.record;
      const already = current.media.status==='ready' ? current.media.data.items.find(media=>media.id===item.id) : undefined;
      if (already?.status==='ready') {session.uploaded[item.id]=already;item.state='ready';continue;}
      const form = new FormData();form.append('id',item.id);form.append('file',item.file);form.append('position',String(item.position));
      const {data} = await client.request('postRecordsRecordIdMedia',{path:{recordId:session.recordId},body:form,version:session.record.version,idempotencyKey:item.id,signal});
      session.uploaded[item.id]=data;
      item.state=data.status;
      if (data.status!=='ready') failures.push(item.id);
    } catch(error) {
      if (signal?.aborted || (error instanceof DOMException && error.name==='AbortError')) throw error;
      item.state='failed';item.error=errorText(error);failures.push(item.id);
    }
    state('media');
  }
  const latest=await readRecord(client,session.recordId,signal);session.record=latest.record;
  if (failures.length) {state('media');throw new Error('本文は保存済みです。一部の媒体を保存できませんでした。失敗した媒体だけ再送できます。');}
  state('complete');return session.record;
}

export function recordPatch(original: RecordView, draft: RecordDraft): RecordPatch {
  const patch: RecordPatch = {};
  if (original.body!==draft.body) patch.body=draft.body;
  if (original.impression!==draft.impression) patch.impression=draft.impression;
  if (JSON.stringify(original.purposes)!==JSON.stringify(draft.purposes)) patch.purposes=draft.purposes;
  if (original.bookmarked!==draft.bookmarked) patch.bookmarked=draft.bookmarked;
  if (original.visibility!==draft.visibility || JSON.stringify(original.sharedWith)!==JSON.stringify(draft.sharedWith)) {
    patch.visibility=draft.visibility;
    patch.sharedWith=draft.sharedWith;
  }
  const previous=draftFromRecord(original,[]);
  const changedTime=(['date','startTime','endTime','timePrecision'] as const).some(key=>previous[key]!==draft[key]);
  if (changedTime && original.visitId) throw new Error('訪問に紐付く滞在時刻の保存をまだ利用できません。入力は保持しています。');
  if (changedTime && !original.visitId) {
    const time=draftTimes(draft);
    if (original.occurredAt!==time.occurredAt) patch.occurredAt=time.occurredAt;
    if (original.endedAt!==time.endedAt) patch.endedAt=time.endedAt;
    if (original.timePrecision!==time.timePrecision) patch.timePrecision=time.timePrecision;
  }
  return patch;
}

export type EditSession = {
  original: RecordView;
  draft: RecordDraft;
  patch: RecordPatch;
  patchStarted: boolean;
  patchSaved: boolean;
  record: RecordView;
  uploaded: Record<string, Media>;
  deleted: string[];
  uploadPositions: Record<string, number>;
  orderKey: string;
  orderSaved: boolean;
};

export function createEditSession(original: RecordView, draft: RecordDraft): EditSession {
  return {original,draft:{...draft,media:draft.media.map(item=>({...item})),removedMedia:[...draft.removedMedia]},patch:recordPatch(original,draft),patchStarted:false,patchSaved:false,record:original,uploaded:{},deleted:[],uploadPositions:{},orderKey:crypto.randomUUID(),orderSaved:false};
}

export async function saveEditedRecord(client: ApiClient, session: EditSession, progress: (state: SaveProgress) => void, signal?: AbortSignal, onChanged?: () => void): Promise<RecordView> {
  const recordId=session.original.id;
  const state=(stage:SaveProgress['stage'])=>progress({recordId,record:session.record,stage,media:session.draft.media.map(item=>session.uploaded[item.id] ? {...item,...mediaDraft(session.uploaded[item.id]!)} : item)});
  if (!session.patchSaved && Object.keys(session.patch).length) {
    state('record');
    if (session.patchStarted) {
      const current=await readRecord(client,recordId,signal);
      if (Object.entries(session.patch).every(([key,value])=>JSON.stringify(current.record[key as keyof RecordView])===JSON.stringify(value))) {
        session.record=current.record;session.patchSaved=true;
      }
    }
    if (!session.patchSaved) {
      session.patchStarted=true;
      const {data}=await client.request('patchRecordsRecordId',{path:{recordId},body:session.patch,version:session.original.version,signal});
      session.record=data;session.patchSaved=true;onChanged?.();
    }
  }
  for (const removal of session.draft.removedMedia) {
    if (session.deleted.includes(removal.id)) continue;
    state('media');
    const current=await readRecord(client,recordId,signal);session.record=current.record;
    if (current.media.status!=='ready') throw new Error('添付の現在の状態を取得できません。本文と入力を保持しています。');
    if (current.media.data.items.some(item=>item.id===removal.id)) {
      await client.request('deleteMediaMediaId',{path:{mediaId:removal.id},version:removal.version,signal});
    }
    session.deleted.push(removal.id);
  }
  const failures:string[]=[];
  for(const item of session.draft.media) {
    if (!item.file || session.uploaded[item.id]?.status==='ready') continue;
    item.state='pending';state('media');
    try {
      const current=await readRecord(client,recordId,signal);session.record=current.record;
      if (current.media.status!=='ready') throw new Error('添付の現在の状態を取得できません。');
      const already=current.media.data.items.find(media=>media.id===item.id);
      if(already?.status==='ready'){session.uploaded[item.id]=already;item.state='ready';continue;}
      // New items append temporarily. One final reorder applies the user's intended order.
      const position=session.uploadPositions[item.id] ?? Math.max(-1,...current.media.data.items.map(media=>media.position),...Object.values(session.uploadPositions))+1;
      session.uploadPositions[item.id]=position;
      const form=new FormData();form.append('id',item.id);form.append('file',item.file);form.append('position',String(position));
      const {data}=await client.request('postRecordsRecordIdMedia',{path:{recordId},body:form,version:session.record.version,idempotencyKey:item.id,signal});
      session.uploaded[item.id]=data;item.state=data.status;
      if(data.status!=='ready')failures.push(item.id);
    }catch(error){
      if(signal?.aborted || (error instanceof DOMException && error.name==='AbortError'))throw error;
      item.state='failed';item.error=errorText(error);failures.push(item.id);
    }
    state('media');
  }
  if(failures.length)throw new Error('本文は保存済みです。一部の媒体を保存できませんでした。失敗した媒体だけ再送できます。');
  const current=await readRecord(client,recordId,signal);session.record=current.record;
  if(current.media.status!=='ready')throw new Error('媒体一覧を取得できませんでした。入力は保持しています。');
  const intended=session.draft.media.map(item=>item.id);
  const actual=current.media.data.items.map(item=>item.id);
  if(!session.orderSaved && JSON.stringify(actual)!==JSON.stringify(intended)){
    if(actual.length!==intended.length || intended.some(id=>!actual.includes(id)))throw new Error('添付の構成が変更されました。現在の媒体を読み直して確認してください。');
    await client.request('postRecordsRecordIdMediaReorder',{path:{recordId},version:session.record.version,idempotencyKey:session.orderKey,body:{items:intended.map(id=>{const media=current.media.status==='ready' ? current.media.data.items.find(item=>item.id===id)! : null;return {id,version:media!.version};})},signal});
    session.orderSaved=true;
  }
  session.record=(await readRecord(client,recordId,signal)).record;
  state('complete');return session.record;
}

import { useEffect, useRef, useState } from 'react';
import type { SelfCheckin, SelfCheckinCreate, Suggestion, SuggestionBatchInput, SuggestionPatch, PlaceDetail, CommunityBookmark } from '../../../packages/api-client/index';
import { ApiError } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useMapBridge } from '../../app/useMapBridge';
import { useScreenState } from '../../app/useScreenState';
import { CheckinView, SuggestionsView, SuggestionDetailView, Feedback, FeatureHeader } from './views';
import { SuggestionIcon as Icon } from './icons';
import { emptyForm, type CheckinForm } from './view-model';
import { candidateView, checkinForm, endOfDay, formAnswers, formConditions, hasAnswer, localDay } from './presentation';
import { useRequest } from './use-request';
import { suggestionMessages as m } from './messages';

type Props=ScreenProps & {active?:boolean};
const timezone=(props:Props)=>props.route.params.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone;
interface CheckinState {form:CheckinForm;saved:SelfCheckin|null;dirty:boolean;createId:string;createKey:string;pendingCreate:SelfCheckinCreate|null;pendingForm?:CheckinForm|null;batch:SuggestionBatchInput|null;batchKey:string;}
function CheckinScreen(props:Props) {
 const {route,navigate,scopeKey,active=true}=props;const requestedZone=timezone(props);
 const bridge=useMapBridge();const request=useRequest(scopeKey,active);
 const [state,setState]=useScreenState<CheckinState>(()=>({form:{...emptyForm},saved:null,dirty:false,createId:crypto.randomUUID(),createKey:crypto.randomUUID(),pendingCreate:null,batch:null,batchKey:crypto.randomUUID()}));
 const zone=state.saved?.timezone||requestedZone;const date=state.saved?.localDate||route.params.date||localDay(zone);
 const latest=useRef(state);latest.current=state;
 const [history,setHistory]=useState<SelfCheckin[]>([]);
 const checkinId=route.params.checkinId;
 const load=async(signal:AbortSignal)=>{
  if(checkinId){const {data}=await api.request('getSelfCheckinsCheckinId',{path:{checkinId},signal});if(!request.valid(signal))return;setState(previous=>({...previous,saved:data,form:previous.dirty?previous.form:checkinForm(data)}));}
  else {const result=await api.request('getSelfCheckins',{query:{date},signal});if(request.valid(signal))setHistory(result.items);}
 };
 useEffect(()=>{if(active)void request.run(load,'回答を読み込み');},[checkinId,checkinId?null:date,scopeKey,active]);
 const change=<K extends keyof CheckinForm>(key:K,value:CheckinForm[K])=>{setState(previous=>({...previous,form:{...previous.form,[key]:value},dirty:true,batch:null,batchKey:crypto.randomUUID()}));request.setNotice({kind:'info',text:m.unSaved});};
 const save=async(signal:AbortSignal):Promise<SelfCheckin>=>{
  const before=latest.current;
  if(before.saved&&!before.dirty)return before.saved;
  let saved=before.saved;let recovered=false;
  // A lost create response is resolved by ID before a new mutation; the original body/key are retained.
  if(!saved&&before.pendingCreate){try{saved=(await api.request('getSelfCheckinsCheckinId',{path:{checkinId:before.pendingCreate.id},signal})).data;recovered=true;}catch(error){if(!(error instanceof ApiError&&error.status===404))throw error;}}
  const answers=formAnswers(before.form,saved?.answers);
  if(saved&&!(recovered&&before.pendingForm&&JSON.stringify(before.pendingForm)===JSON.stringify(before.form))){
   const {data}=await api.request('patchSelfCheckinsCheckinId',{path:{checkinId:saved.id},version:saved.version,body:{answers,localDate:date,validUntil:endOfDay(date,zone),timezone:zone},signal});
   saved=data;
  }else if(!saved){
   const body=before.pendingCreate??{id:before.createId,localDate:date,answers,validUntil:endOfDay(date,zone),timezone:zone};
   setState(previous=>({...previous,pendingCreate:body,pendingForm:previous.pendingForm??{...before.form}}));latest.current={...before,pendingCreate:body,pendingForm:before.pendingForm??{...before.form}};
   saved=(await api.request('postSelfCheckins',{body,idempotencyKey:before.createKey,signal})).data;
   if(before.pendingForm&&JSON.stringify(before.pendingForm)!==JSON.stringify(before.form)){saved=(await api.request('patchSelfCheckinsCheckinId',{path:{checkinId:saved.id},version:saved.version,body:{answers},signal})).data;}
  }
  if(!request.valid(signal))throw new DOMException('画面を離れました','AbortError');
  const reloaded=(await api.request('getSelfCheckinsCheckinId',{path:{checkinId:saved.id},signal})).data;
  if(!request.valid(signal))throw new DOMException('画面を離れました','AbortError');
  const next={...latest.current,saved:reloaded,dirty:false,pendingCreate:null,pendingForm:null};latest.current=next;setState(next);return reloaded;
 };
 const saveOnly=()=>{void request.run(async signal=>{const saved=await save(signal);request.setNotice({kind:'success',text:m.saved});if(!checkinId)navigate('self-checkin',{checkinId:saved.id,date,timeZone:zone,saved:'1'});},'回答を保存');};
 const search=()=>{void request.run(async signal=>{
  if(endOfDay(date,zone)<=Date.now())throw new Error('この回答の有効期限が過ぎています。今日の回答から探してください。');
  const saved=hasAnswer(latest.current.form)||latest.current.saved?await save(signal):null;
  const camera=bridge.getSnapshot().camera;
  const body=latest.current.batch??{id:crypto.randomUUID(),checkin:saved?{type:'checkin' as const,id:saved.id,version:saved.version}:null,origin:{longitude:camera.longitude,latitude:camera.latitude},conditions:formConditions(latest.current.form),excludedActivities:[],excludedPlaceIds:[],expiresAt:saved?.validUntil??endOfDay(date,zone),localDate:date,timezone:zone,trigger:'onOpen' as const};
  setState(previous=>({...previous,batch:body}));latest.current={...latest.current,batch:body};
  const {data}=await api.request('postSuggestionBatches',{body,idempotencyKey:latest.current.batchKey,signal});
  if(!request.valid(signal))return;
  setState(previous=>({...previous,batch:null,batchKey:crypto.randomUUID()}));
  navigate('suggestions',{batchId:data.id,...(saved?{checkinId:saved.id}:{}),date,timeZone:zone,...(data.emptyReason?{emptyReason:data.emptyReason}:{})});
 },'候補を取得');};
 const notice=request.notice??(route.params.saved==='1'?{kind:'success' as const,text:m.saved}:null);
 return <div className="sg-shell-content"><FeatureHeader title="タイプ診断" onBack={props.back}/><CheckinView form={state.form} onChange={change} date={`${date}（${zone}）`} busy={request.busy} notice={notice} onSave={saveOnly} onSearch={search} onSkip={()=>{bridge.clear('suggestion');navigate('map');}}>
  <small className="sg-origin">出発点：地図の中心。移動前に地図で位置を確認できます。</small>
  {checkinId&&<div className="sg-inline-actions"><button type="button" disabled={request.busy} onClick={()=>{void request.run(load,'最新の回答を読み込み');}}>保存済みの内容を確認</button><button type="button" disabled={request.busy} onClick={()=>navigate('self-checkin',{date:localDay(zone),timeZone:zone,draftId:crypto.randomUUID()})}>今の状態を新しく回答</button></div>}
  {state.saved&&state.dirty&&<details className="sg-saved-comparison"><summary>保存済みの回答と比較</summary><p>{state.saved.answers.state||'状態は未回答'}</p><p>{state.saved.answers.wishes.join('・')||'希望は未回答'}</p><p>版 {state.saved.version} · {state.saved.localDate}</p></details>}
  {!checkinId&&history.length>0&&<details className="sg-saved-comparison"><summary>今日保存した回答（{history.length}件）</summary><p>過去の回答は自動適用しません。</p>{history.map(answer=><button type="button" key={answer.id} onClick={()=>navigate('self-checkin',{checkinId:answer.id,date:answer.localDate,timeZone:zone})}>{new Date(answer.createdAt).toLocaleTimeString('ja-JP',{timeZone:zone,hour:'2-digit',minute:'2-digit'})} · {answer.answers.state||answer.answers.wishes.join('・')||'未回答'}</button>)}</details>}
 </CheckinView></div>;
}

interface ListState {sort:string;items:Suggestion[];places:Record<string,PlaceDetail>;nextCursor:string|null;}
function ListScreen(props:Props) {
 const {route,navigate,scopeKey,active=true}=props;const zone=timezone(props);const request=useRequest(scopeKey,active);const bridge=useMapBridge();
 const [state,setState]=useScreenState<ListState>(()=>({sort:'recommended',items:[],places:{},nextCursor:null}));
 const presentedPending=useRef(new Set<string>());
 const batchId=route.params.batchId;const [conditionForm,setConditionForm]=useState<CheckinForm>({...emptyForm});
 const load=async(signal:AbortSignal,more=false)=>{
  if(!batchId){setState(previous=>({...previous,items:[],places:{},nextCursor:null}));return;}
  if(!more)setState(previous=>({...previous,items:[],places:{},nextCursor:null}));
  const result=await api.request('getSuggestions',{query:{batchId,...(more&&state.nextCursor?{cursor:state.nextCursor}:{})},signal});
  if(!request.valid(signal))return;
  setState(previous=>({...previous,items:more?[...previous.items,...result.items.filter(item=>!previous.items.some(old=>old.id===item.id))]:result.items,nextCursor:result.nextCursor}));
  const snapshot=result.items[0]?.checkinSnapshot;
  if(snapshot)setConditionForm(checkinForm(snapshot));
  else if(route.params.checkinId){const checkin=await api.request('getSelfCheckinsCheckinId',{path:{checkinId:route.params.checkinId},signal});if(request.valid(signal))setConditionForm(checkinForm(checkin.data));}
  const places=await Promise.allSettled([...new Set(result.items.map(item=>item.placeId))].map(async placeId=>({placeId,detail:(await api.request('getPlacesPlaceId',{path:{placeId},signal})).data})));
  if(!request.valid(signal))return;
  const resolved:Record<string,PlaceDetail>={};for(const p of places)if(p.status==='fulfilled')resolved[p.value.placeId]=p.value.detail;
  setState(previous=>({...previous,places:{...previous.places,...resolved}}));
  if(places.some(p=>p.status==='rejected'))request.setNotice({kind:'info',text:'候補は取得しました。一部の場所情報・写真を読み込めませんでした。',retry:()=>{void request.run(signal=>load(signal),'場所情報を読み込み');}});
 };
 useEffect(()=>{if(active)void request.run(signal=>load(signal),'候補を読み込み');return()=>bridge.clear('suggestion');},[batchId,scopeKey,active]);
 useEffect(()=>{
  if(!active||!batchId)return;
  const points=state.items.flatMap(item=>{const place=state.places[item.placeId]?.place;return place?[{id:item.id,coordinates:place.coordinates,label:place.name}]:[];});
  bridge.showCandidates('suggestion',{resultId:batchId,candidates:points,expiresAt:state.items.length?Math.min(...state.items.map(item=>item.expiresAt)):undefined});
  return bridge.onSelect('suggestion',selection=>{if(selection.kind==='candidate'&&state.items.some(item=>item.id===selection.id))open(selection.id);});
 },[state.items,state.places,batchId,active]);
 const markPresented=(id:string)=>{
  const item=state.items.find(value=>value.id===id);if(!active||!item||item.presentedAt!=null||presentedPending.current.has(id))return;
  presentedPending.current.add(id);const signal=request.signal();
  void api.request('patchSuggestionsSuggestionId',{path:{suggestionId:id},version:item.version,body:{presented:true},signal}).then(({data})=>{if(request.valid(signal))setState(previous=>({...previous,items:previous.items.map(old=>old.id===id?data:old)}));}).catch(error=>{if(!signal.aborted){presentedPending.current.delete(id);request.setNotice({kind:'info',text:'候補の提示履歴を保存できませんでした。',retry:()=>markPresented(id)});}});
 };
 const open=(id:string)=>navigate('suggestion-detail',{...route.params,suggestionId:id});
 const edit=()=>navigate('self-checkin',{...(route.params.checkinId?{checkinId:route.params.checkinId}:{}),date:route.params.date||localDay(zone),timeZone:zone});
 const items=state.sort==='shortest'?[...state.items].sort((a,b)=>(a.totalMinutes??Infinity)-(b.totalMinutes??Infinity)||a.position-b.position):state.items;
 return <div className="sg-shell-content"><FeatureHeader title="候補を選ぶ" onBack={props.back}><button type="button" className="sg-header-condition" onClick={edit}><Icon name="sliders"/>条件を変更</button></FeatureHeader><SuggestionsView form={conditionForm} items={items.map(item=>candidateView(item,state.places[item.placeId],zone))} sort={state.sort} onSort={sort=>setState(previous=>({...previous,sort}))} onConditions={edit} onOpen={open} onPresented={markPresented} busy={request.busy} hasBatch={!!batchId} notice={request.notice??(state.items.length===0&&route.params.emptyReason?{kind:'info',text:route.params.emptyReason}:null)} onMore={state.nextCursor?()=>{void request.run(signal=>load(signal,true),'次の候補を読み込み');}:undefined}/></div>;
}

function DetailScreen(props:Props) {
 const {route,navigate,back,scopeKey,active=true}=props;const zone=timezone(props);const request=useRequest(scopeKey,active);const bridge=useMapBridge();
 const [memoState,setMemoState]=useScreenState(()=>({value:'',open:false,dirty:false}));
 const [suggestion,setSuggestion]=useState<Suggestion|null>(null);const [place,setPlace]=useState<PlaceDetail>();const [bookmark,setBookmark]=useState<CommunityBookmark|null>(null);const bookmarkIntent=useRef<{add:boolean;id:string;key:string}|null>(null);const [visitId,setVisitId]=useState(route.params.visitId||'');
 const currentSuggestion=useRef(suggestion);currentSuggestion.current=suggestion;
 const [expired,setExpired]=useState(false);
 useEffect(()=>{if(!suggestion||!active)return;setExpired(suggestion.expiresAt<=Date.now());const timer=setTimeout(()=>setExpired(true),Math.min(Math.max(0,suggestion.expiresAt-Date.now()),2147483647));return()=>clearTimeout(timer);},[suggestion?.expiresAt,active]);
 const id=route.params.suggestionId;
 const readBookmark=async(placeId:string,signal:AbortSignal):Promise<CommunityBookmark|null>=>{
  let cursor:string|undefined;
  do{const page=await api.request('getBookmarks',{query:{limit:100,...(cursor?{cursor}:{})},signal});const found=page.items.find(item=>item.target.type==='place'&&item.target.id===placeId);if(found)return found;cursor=page.nextCursor??undefined;}while(cursor);
  return null;
 };
 const load=async(signal:AbortSignal)=>{
  if(!id)throw new Error('候補が指定されていません。一覧から選んでください。');
  setSuggestion(previous=>previous?.id===id?previous:null);
  let data:Suggestion;
  try{data=(await api.request('getSuggestionsSuggestionId',{path:{suggestionId:id},signal})).data;}catch(error){if(error instanceof ApiError&&[401,403,404,409,410].includes(error.status)){setSuggestion(null);setPlace(undefined);setBookmark(null);}throw error;}
  if(!request.valid(signal))return;setSuggestion(data);setMemoState(previous=>previous.dirty?previous:{...previous,value:data.memo??''});
  if(data.viewedAt==null){try{data=(await api.request('patchSuggestionsSuggestionId',{path:{suggestionId:data.id},version:data.version,body:{viewed:true},signal})).data;if(request.valid(signal)){currentSuggestion.current=data;setSuggestion(data);}}catch(error){if(!signal.aborted)request.setNotice({kind:'info',text:'詳細の閲覧履歴を保存できませんでした。',retry:()=>{void request.run(load,'詳細の閲覧履歴を保存');}});}}
  try{const detail=await api.request('getPlacesPlaceId',{path:{placeId:data.placeId},signal});if(request.valid(signal))setPlace(detail.data);}catch(error){if(!signal.aborted)request.setNotice({kind:'info',text:`場所情報を読み込めませんでした。${error instanceof Error?error.message:''}`,retry:()=>{void request.run(load,'場所情報を読み込み');}});}
  try{const savedBookmark=await readBookmark(data.placeId,signal);if(request.valid(signal))setBookmark(savedBookmark);}catch(error){if(!signal.aborted)request.setNotice({kind:'info',text:'しおりの状態を取得できませんでした。保存操作で再確認します。'});}
 };
 useEffect(()=>{if(active)void request.run(load,'候補を読み込み');},[id,scopeKey,active]);
 const patch=(body:SuggestionPatch,after?:(saved:Suggestion)=>void)=>{void request.run(async signal=>{
  const target=currentSuggestion.current;
  if(!target)return;
  let data:Suggestion;
  try{data=(await api.request('patchSuggestionsSuggestionId',{path:{suggestionId:target.id},version:target.version,body,signal})).data;}
  catch(error){if(error instanceof ApiError&&(error.status===409||error.status===412)){const latest=await api.request('getSuggestionsSuggestionId',{path:{suggestionId:target.id},signal});if(request.valid(signal)){currentSuggestion.current=latest.data;setSuggestion(latest.data);}}throw error;}
  const saved=(await api.request('getSuggestionsSuggestionId',{path:{suggestionId:data.id},signal})).data;
  if(!request.valid(signal))return;setSuggestion(saved);request.setNotice({kind:'success',text:'保存した内容を再取得しました。'});after?.(saved);
 },'候補の変更を保存');};
 const toggleBookmark=()=>{void request.run(async signal=>{
  const target=currentSuggestion.current;if(!target)return;
  const current=await readBookmark(target.placeId,signal);
  const intent=bookmarkIntent.current??{add:!current,id:crypto.randomUUID(),key:crypto.randomUUID()};bookmarkIntent.current=intent;
  if(intent.add){const created=await api.request('postBookmarks',{body:{id:intent.id,target:{type:'place',id:target.placeId}},idempotencyKey:intent.key,signal});const verified=await api.request('getBookmarksBookmarkId',{path:{bookmarkId:created.data.id},signal});if(request.valid(signal))setBookmark(verified.data);}
  else {if(current)await api.request('deleteBookmarksBookmarkId',{path:{bookmarkId:current.id},version:current.version,signal});const verified=await readBookmark(target.placeId,signal);if(request.valid(signal))setBookmark(verified);}
  if(request.valid(signal)){bookmarkIntent.current=null;request.setNotice({kind:'success',text:intent.add?'この場所をしおりに保存しました。':'この場所のしおりを解除しました。'});}
 },'しおりを保存');};
 const stop=()=>{void request.run(async signal=>{
  const target=currentSuggestion.current;if(!target)return;
  const current=(await api.request('getMeSettings',{signal})).data;
  const entry={placeId:target.placeId,activity:target.activity};
  if(!current.suggestions.stopped.some(item=>'placeId' in item&&'activity' in item&&item.placeId===entry.placeId&&item.activity===entry.activity))await api.request('patchMeSettings',{version:current.version,body:{suggestions:{...current.suggestions,stopped:[...current.suggestions.stopped,entry]}},signal});
  const verified=(await api.request('getMeSettings',{signal})).data;
  if(!verified.suggestions.stopped.some(item=>'placeId' in item&&'activity' in item&&item.placeId===entry.placeId&&item.activity===entry.activity))throw new Error('停止設定を再確認できませんでした。');
  if(request.valid(signal)){bridge.clear('suggestion');request.setNotice({kind:'success',text:'この場所・活動の提案を停止しました。設定から解除できます。'});}
 },'提案停止を保存');};
 if(!suggestion)return <section className="sg-screen"><Feedback notice={request.notice??{kind:'loading',text:m.loading}}/><button type="button" onClick={back}>候補一覧へ戻る</button></section>;
 const selected=(saved:Suggestion)=>{
  if(place){bridge.showPlaces('suggestion',{places:[{id:saved.placeId,placeId:saved.placeId,coordinates:place.place.coordinates,label:place.place.name}],selectedPlaceId:saved.placeId});bridge.focus('suggestion',{center:place.place.coordinates,zoom:16});}
  navigate('map',{placeId:saved.placeId,suggestionId:saved.id});
 };
 return <div className="sg-shell-content"><FeatureHeader title="候補の詳細" onBack={back}><button type="button" aria-label="共有する" onClick={()=>navigate('sharing',{placeId:suggestion.placeId,suggestionId:suggestion.id,returnTo:'suggestion-detail'})}><Icon name="share"/></button><button type="button" aria-label="しおり" aria-pressed={!!bookmark} onClick={toggleBookmark} disabled={request.busy}><Icon name="heart"/></button></FeatureHeader><SuggestionDetailView showTools={false} key={suggestion.id} item={candidateView(suggestion,place,zone,!!bookmark)} busy={request.busy} notice={request.notice}
  selectDisabled={expired||(suggestion.sourceState!=null&&suggestion.sourceState!=='current')} selectReason={expired?'提案の有効期限が過ぎました。条件を変えて探し直してください。':suggestion.sourceState&&suggestion.sourceState!=='current'?'根拠が更新・非公開化されています。新しい候補を取得してください。':undefined}
  onSelect={()=>patch({status:'selected'},selected)} onLater={()=>patch({status:'later'},()=>back())} onDismiss={()=>patch({status:'dismissed'},()=>back())}
  memoEditor={{open:memoState.open,value:memoState.value,onOpen:()=>setMemoState(previous=>({...previous,open:true})),onChange:value=>setMemoState(previous=>({...previous,value,dirty:true})),onClose:()=>setMemoState(previous=>({...previous,open:false}))}}
  onMemo={memo=>patch({memo},()=>setMemoState(previous=>({...previous,dirty:false})))} onShare={()=>navigate('sharing',{placeId:suggestion.placeId,suggestionId:suggestion.id,returnTo:'suggestion-detail'})}
  onBookmark={toggleBookmark}
  onStop={stop}
  onRoute={()=>suggestion.routeId?navigate('route-navigation',{routeId:suggestion.routeId,suggestionId:suggestion.id}):navigate('route-conditions',{destinationPlaceId:suggestion.placeId,suggestionId:suggestion.id,...(suggestion.conditions.mode&&suggestion.conditions.mode!=='any'?{mode:suggestion.conditions.mode}:{}),returnTo:'suggestion-detail'})}
  onVisit={()=>navigate('visit-confirm',{placeId:suggestion.placeId,suggestionId:suggestion.id,returnTo:'suggestion-detail'})}>
  {suggestion.status==='selected'&&<div className="sg-visit-achievement"><label>本人確認した訪問<select value={visitId} onChange={event=>setVisitId(event.target.value)}><option value="">訪問を選ぶ</option>{place?.visits.status==='ready'&&place.visits.items.filter(visit=>visit.status==='confirmed').map(visit=><option key={visit.id} value={visit.id}>{visit.startedAt?new Date(visit.startedAt).toLocaleString('ja-JP',{timeZone:zone}):'日時不明の訪問'}</option>)}</select></label><button type="button" disabled={!visitId||request.busy} onClick={()=>patch({status:'completed',completedVisitId:visitId})}>この訪問で達成を確認</button></div>}
  {suggestion.completedVisitId&&<button type="button" onClick={()=>navigate('visit-confirm',{visitId:suggestion.completedVisitId!,placeId:suggestion.placeId,suggestionId:suggestion.id,returnTo:'suggestion-detail'})}>達成に使った訪問を確認・訂正</button>}
  <button type="button" onClick={()=>navigate('settings',{section:'suggestions'})}>提案の停止・解除を設定で管理</button>
 </SuggestionDetailView></div>;
}

export const screens:ScreenDefinition[]=[
 {id:'self-checkin',title:'タイプ診断',component:CheckinScreen,layout:{header:'none',contentPadding:'none',bottomNav:false,background:'soft'}},
 {id:'suggestions',title:'候補を選ぶ',component:ListScreen,layout:{header:'none',contentPadding:'none',bottomNav:true,background:'soft'}},
 {id:'suggestion-detail',title:'候補の詳細',component:DetailScreen,layout:{header:'none',contentPadding:'none',bottomNav:false,background:'surface'}},
];

import { useEffect, useState } from 'react';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import type { Insight } from '../../../packages/api-client/index';
import { CreateRecordScreen } from './CreateRecordScreen';
import { EditRecordScreen } from './EditRecordScreen';
import { RecordCorrection } from './RecordCorrection';
import { RecordDelete } from './RecordDelete';
import { RecordHeading, RecordNotice } from './RecordParts';
import { useRecordDetail, useScreenMutation } from './record-hooks';
import { errorText } from './record-flow';

function CorrectionScreen({route,scopeKey,back,active=true}:ScreenProps & {active?:boolean}) {
 const beginMutation=useScreenMutation(scopeKey,active);
 const loaded=useRecordDetail(route.params.recordId,scopeKey,active);
 const [insight,setInsight]=useState<Insight|null>(null);
 const [insightRevision,setInsightRevision]=useState(0);
 const [state,setState]=useScreenState(()=>({purposes:[] as string[],reason:'',initialized:''}));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(loaded.detail && state.initialized!==loaded.detail.record.id)setState({purposes:[...loaded.detail.record.purposes],reason:'',initialized:loaded.detail.record.id});},[loaded.detail]);
 useEffect(()=>{
  if(!route.params.insightId || !active)return;
  const abort=new AbortController();
  void api.request('getInsightsInsightId',{path:{insightId:route.params.insightId},signal:abort.signal}).then(({data})=>{if(!abort.signal.aborted){setInsight(data);setState(previous=>({...previous,reason:previous.reason||data.reviewNote||''}));}}).catch(error=>{if(!abort.signal.aborted)setError(errorText(error));});
  return()=>abort.abort();
 },[route.params.insightId,scopeKey,active,insightRevision]);
 const savePurpose=async()=>{
  if(!loaded.detail||busy)return;setBusy(true);setError('');const abort=beginMutation();
  try{await api.request('patchRecordsRecordId',{path:{recordId:loaded.detail.record.id},version:loaded.detail.record.version,body:{purposes:state.purposes},signal:abort.signal});if(abort.signal.aborted)return;setNotice('用途を保存しました。');loaded.reload();}catch(error){if(!abort.signal.aborted)setError(errorText(error));}finally{setBusy(false);}
 };
 const saveReason=async()=>{
  if(!insight){setError('訂正する解釈が指定されていません。元の解釈から開き直してください。');return;}
  if(busy)return;setBusy(true);setError('');const abort=beginMutation();
  try{const {data}=await api.request('patchInsightsInsightId',{path:{insightId:insight.id},version:insight.version,body:{review:'edit',reviewNote:state.reason},signal:abort.signal});if(abort.signal.aborted)return;setInsight(data);setNotice('理由を保存しました。');}catch(error){if(!abort.signal.aborted)setError(errorText(error));}finally{setBusy(false);}
 };
 if(!loaded.detail)return <section className="records-screen"><RecordHeading title="解釈を訂正" onBack={back}/><div className="records-body"><RecordNotice error={!!loaded.error} retry={loaded.error?loaded.reload:undefined}>{loaded.error||'記録を読み込んでいます…'}</RecordNotice></div></section>;
 const record=loaded.detail.record;
 return <RecordCorrection body={record.body} date={record.effectiveStartedAt===null?'日時未指定':new Date(record.effectiveStartedAt).toLocaleDateString('ja-JP')} interpretation={insight?.summary||'解釈を読み込めていません。本人の原文と用途は表示しています。'} purposes={state.purposes} onPurposes={purposes=>setState(previous=>({...previous,purposes}))} reason={state.reason} onReason={reason=>setState(previous=>({...previous,reason}))} onSavePurpose={()=>void savePurpose()} onSaveReason={()=>void saveReason()} onBack={back} onReload={()=>{loaded.reload();setInsightRevision(value=>value+1);}} error={error||loaded.error} notice={notice} busy={busy}/>;
}

function DeleteScreen({route,scopeKey,back,navigate,active=true}:ScreenProps & {active?:boolean}) {
 const beginMutation=useScreenMutation(scopeKey,active);
 const loaded=useRecordDetail(route.params.recordId,scopeKey,active);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const remove=async()=>{
  if(!loaded.detail||busy)return;setBusy(true);setError('');const abort=beginMutation();
  try{await api.request('deleteRecordsRecordId',{path:{recordId:loaded.detail.record.id},version:loaded.detail.record.version,signal:abort.signal});if(abort.signal.aborted)return;navigate('daily-track',{date:route.params.date||new Date().toLocaleDateString('sv-SE'),timeZone:route.params.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone});}catch(error){if(!abort.signal.aborted)setError(errorText(error));}finally{setBusy(false);}
 };
 if(!loaded.detail)return <section className="records-screen"><RecordHeading title="削除する内容の確認" onBack={back}/><div className="records-body"><RecordNotice error={!!loaded.error} retry={loaded.error?loaded.reload:undefined}>{loaded.error||'記録を読み込んでいます…'}</RecordNotice></div></section>;
 return <RecordDelete place={loaded.place} date={loaded.detail.record.effectiveStartedAt===null?'日時未指定':new Date(loaded.detail.record.effectiveStartedAt).toLocaleDateString('ja-JP')} onBack={back} onExport={()=>setError('この記録の書き出しをまだ利用できません。削除を取りやめて、記録を残すことができます。')} onDelete={()=>void remove()} busy={busy} error={error||loaded.error}/>;
}

export const screens:ScreenDefinition[]=[
 {id:'record-create',title:'体験を残す',component:CreateRecordScreen},
 {id:'record-edit',title:'体験を編集',component:EditRecordScreen},
 {id:'interpretation-correction',title:'解釈を訂正',component:CorrectionScreen},
 {id:'record-delete',title:'記録を削除',component:DeleteScreen},
];

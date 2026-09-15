import {fail,normalizeConditions,batchExpiry,localDateAt,rankCandidates,validNumber} from './domain.mjs';
import {evidencedStay,validateExplanation,explanationPrompt,explanationSchema} from './generation.mjs';

function refsOf(refs) {
  const byId=new Map();
  for(const ref of refs) {
    const key=`${ref.type}:${ref.id}`;
    if(byId.has(key)&&byId.get(key).version!==ref.version)fail('SOURCE_CHANGED','Conflicting source versions',409);
    byId.set(key,ref);
  }
  return [...byId.values()].sort((a,b)=>a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
}
function enabled(settings,trigger) {
  if(!settings.suggestions.enabled || (trigger==='continuous' && settings.suggestions.timing!=='continuous'))fail('INPUT_CHANGED','提案が設定で停止されています。',409);
}

/** Shared adapters perform all place, route, permission, and AI operations. */
export async function generateBatch(context,input,deps) {
  context.signal.throwIfAborted();
  const now=deps.now??Date.now;
  const checkin=deps.store.resolveCheckin(input.checkin,now());
  const inherited={...checkin?.answers};
  // Either current representation replaces the inherited time choice as a whole.
  if(input.conditions?.timeBudget!==undefined||input.conditions?.minutes!==undefined) {
    delete inherited.timeBudget;delete inherited.minutes;
  }
  const conditions=normalizeConditions({...inherited,...input.conditions});
  const timezone=input.timezone??checkin?.timezone;
  if(!timezone)fail('VALIDATION_FAILED','timezone is required for an unanswered request');
  const localDate=input.localDate??checkin?.localDate??localDateAt(now(),timezone);
  if(checkin && localDate!==checkin.localDate)fail('VALIDATION_FAILED','Checkin date must match the requested day');
  if(!input.origin||!Number.isFinite(input.origin.longitude)||Math.abs(input.origin.longitude)>180||!Number.isFinite(input.origin.latitude)||Math.abs(input.origin.latitude)>85)fail('VALIDATION_FAILED','Invalid origin');
  const trigger=input.trigger??'onOpen';
  if(!['onOpen','continuous'].includes(trigger))fail('VALIDATION_FAILED','Invalid suggestion trigger');
  const initialSettings=deps.settings.read();
  enabled(initialSettings,trigger);
  const expiresAt=batchExpiry({localDate,timezone,expiresAt:input.expiresAt},now(),[checkin?.validUntil]);
  const base={...input,conditions,localDate,timezone,expiresAt,checkinSnapshot:checkin};
  const records=(await deps.sources.materials()).filter(record=>record.useForSuggestions);
  const candidates=await deps.places.candidates(conditions,input.origin);
  context.signal.throwIfAborted();
  const excludedPlaces=new Set(input.excludedPlaceIds??[]),excludedActivities=new Set(input.excludedActivities??[]);
  const eligible=candidates.filter(c=>!excludedPlaces.has(c.placeId)&&deps.settings.allowed({...c,activity:conditions.activity??'visit'},trigger));
  if(eligible.length>20)fail('INPUT_TOO_LARGE','候補の検索範囲を20件以内に絞ってください。',413);
  const prepared=[];
  for(const candidate of eligible) {
    context.signal.throwIfAborted();
    const route=await deps.routes.preview(input.origin,candidate,conditions.mode==='any'?'walking':conditions.mode);
    if(!validNumber(route.durationSec))fail('UPSTREAM_FAILED','経路の移動時間を取得できませんでした。',502);
    if(route.retention!=='storable')fail('INPUT_CHANGED','一時経路は保存候補に採用できません。',409);
    const placeRecords=records.filter(record=>record.place?.id===candidate.placeId);
    const stay=evidencedStay(candidate.placeId,conditions,placeRecords,now());
    const refs=refsOf([...(candidate.sourceRefs??[]),...placeRecords.flatMap(r=>r.sourceRefs),...(input.checkin?[input.checkin]:[])]);
    prepared.push({...candidate,title:candidate.name,activity:conditions.activity??'visit',reason:'',sourceRefs:refs,stay,travelMinutes:route.durationSec/60,routeEvidence:route,expiresAt:Math.min(expiresAt,route.expiresAt,candidate.expiresAt??Infinity),evaluationState:'unevaluated',rating:null,evaluations:[{key:'mode',status:'matched',reason:conditions.mode==='any'?`指定はどれでも。実経路は${route.mode}`:`実経路の移動手段: ${route.mode}`,hard:conditions.mode!=='any'},...(conditions.companion?[{key:'companion',status:'unknown',reason:'同行者条件の受入情報は未確認',hard:true}]:[]),...(conditions.effort&&conditions.effort!=='any'?[{key:'effort',status:'unknown',reason:'歩く負担への適合は未確認',hard:true}]:[])]});
  }
  const refs=refsOf(prepared.flatMap(c=>c.sourceRefs));
  deps.sources.assertCurrent(refs);
  let explained=prepared;
  if(prepared.length) {
    const relevantRecords=records.filter(r=>prepared.some(c=>c.placeId===r.place?.id));
    const prompt=explanationPrompt(conditions,prepared,relevantRecords);
    if(Buffer.byteLength(prompt,'utf8')>128*1024)fail('INPUT_TOO_LARGE','候補・記録がAI入力上限を超えています。範囲を絞ってください。',413);
    deps.settings.assertAiAllowed({records:relevantRecords.length>0,location:true});
    const config=deps.ai.configuration();
    const output=validateExplanation(await deps.ai.explain({prompt,schema:explanationSchema,model:config.model,signal:context.signal,task:'suggestions'}),prepared,conditions.wishes);
    explained=prepared.map(candidate=>{
      const explanation=output.candidates.find(item=>item.placeId===candidate.placeId);
      return {...candidate,activity:explanation.activity,reason:explanation.reason,wishes:explanation.matchedWishes,unknowns:explanation.unknowns,generator:{model:config.model,promptVersion:config.promptVersion}};
    });
  }
  if(deps.settings.read().version!==initialSettings.version&&explained.some(c=>!deps.settings.allowed(c,trigger)))fail('INPUT_CHANGED','生成中に提案の停止条件が変わりました。再取得してください。',409);
  const unstopped=explained.filter(candidate=>!excludedActivities.has(candidate.activity)&&deps.settings.allowed(candidate,trigger));
  const ranked=rankCandidates(unstopped,conditions,now());
  const verify=()=>{
    context.signal.throwIfAborted();
    enabled(deps.settings.read(),trigger);
    deps.store.resolveCheckin(input.checkin,now());
    deps.sources.assertCurrent(refs);
    if(ranked.some(c=>!deps.settings.allowed(c,trigger)))fail('INPUT_CHANGED','生成中に提案の停止条件が変わりました。再取得してください。',409);
    for(const candidate of ranked) {
      if(candidate.expiresAt<=now())fail('EXPIRED','生成中に候補の期限が切れました。',409);
      deps.places.revalidate(candidate);
      deps.routes.revalidate(candidate.routeEvidence.previewId);
    }
  };
  verify();
  const emptyReason=ranked.length?null:prepared.length?'条件と停止対象を適用すると候補がありません。時間や希望を変更して再検索できます。':'検索条件に一致する場所がありません。希望や検索範囲を変更できます。';
  return deps.store.saveBatch(base,ranked,now(),emptyReason,()=>{
    verify();
    deps.places.materialize?.(ranked);
    deps.sources.assertCurrent(refsOf(ranked.flatMap(c=>c.sourceRefs)));
    ranked.splice(0,ranked.length,...rankCandidates(ranked,conditions,now()));
  });
}

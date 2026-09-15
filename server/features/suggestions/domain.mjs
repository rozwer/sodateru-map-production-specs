export function fail(code, message, status = 422) {
  throw Object.assign(new Error(message), { code, status });
}
export const validNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const oneOf = (value, options, name) => {
  if (!options.includes(value)) fail('VALIDATION_FAILED', `${name} is invalid`);
  return value;
};
export function normalizeConditions(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('VALIDATION_FAILED','conditions must be an object');
  const timeBudget = input.timeBudget ?? (input.minutes == null ? {kind:'unspecified',minutes:null} : {kind:'exact',minutes:input.minutes});
  oneOf(timeBudget.kind,['exact','atLeast','unspecified'],'timeBudget.kind');
  if (timeBudget.kind === 'unspecified' ? timeBudget.minutes !== null : !Number.isInteger(timeBudget.minutes) || timeBudget.minutes <= 0 || timeBudget.minutes > 1440) fail('VALIDATION_FAILED','Invalid time budget');
  if (input.minutes != null && (timeBudget.kind !== 'exact' || input.minutes !== timeBudget.minutes)) fail('VALIDATION_FAILED','minutes conflicts with timeBudget');
  const mode=oneOf(input.mode ?? 'any',['walking','cycling','driving','transit','any'],'mode');
  const companion=oneOf(input.companion ?? null,[null,'solo','friends_family','children','pet'],'companion');
  const effort=oneOf(input.effort ?? null,[null,'easy','moderate','any'],'effort');
  const wishes=input.wishes ?? [];
  if (!Array.isArray(wishes) || wishes.length>100 || wishes.some(w=>typeof w!=='string'||!w.trim()||w.length>200)||new Set(wishes).size!==wishes.length) fail('VALIDATION_FAILED','Invalid wishes');
  return {...input,timeBudget:{...timeBudget},mode,companion,effort,wishes:[...wishes]};
}

// Candidate inputs come from shared providers; never manufacture durations or evidence.
export function rankCandidates(candidates, input, now) {
  const conditions=normalizeConditions(input);
  const results=[];
  for (const candidate of candidates) {
    if (candidate.expiresAt <= now) continue;
    const evaluations=(candidate.evaluations ?? []).map(e=>({...e}));
    if (evaluations.some(e=>e.hard && e.status==='unmatched')) continue;
    const stay=candidate.stay;
    const evidencedStay=stay && validNumber(stay.minutes) && validNumber(stay.checkedAt) && stay.checkedAt<=now && (stay.kind==='user'||(stay.kind==='source' && (stay.sourceRefs?.length || stay.sourceUrl)));
    const travelMinutes=validNumber(candidate.travelMinutes)?candidate.travelMinutes:null;
    const stayMinutes=evidencedStay?stay.minutes:null;
    const totalMinutes=travelMinutes==null||stayMinutes==null?null:travelMinutes+stayMinutes;
    const budget=conditions.timeBudget;
    const status=budget.kind==='exact'&&totalMinutes!=null?(totalMinutes<=budget.minutes?'matched':'unmatched'):'unknown';
    if (status==='unmatched') continue;
    evaluations.push({key:'timeBudget',hard:budget.kind==='exact',status,reason:budget.kind==='atLeast'?'Available time has no finite upper limit':totalMinutes==null?'Travel or evidenced stay is unavailable':budget.kind==='unspecified'?'No time limit specified':`${travelMinutes} + ${stayMinutes} = ${totalMinutes} minutes`});
    const matchedWishes=conditions.wishes.filter(w=>candidate.wishes?.includes(w));
    results.push({...candidate,travelMinutes,stayMinutes,totalMinutes,evaluations,matchedWishes});
  }
  results.sort((a,b)=>b.matchedWishes.length-a.matchedWishes.length || b.evaluations.filter(e=>e.status==='matched').length-a.evaluations.filter(e=>e.status==='matched').length || (a.totalMinutes??Infinity)-(b.totalMinutes??Infinity) || a.placeId.localeCompare(b.placeId,'en'));
  return results.slice(0,20).map((item,position)=>({...item,position}));
}

export function validDate(value) {
  if (typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)!==value) fail('VALIDATION_FAILED','Invalid local date');
  return value;
}
export function localDateAt(now, timezone) {
  try { return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
  catch { fail('VALIDATION_FAILED','Invalid timezone'); }
}
export function batchExpiry(input, now, additional = []) {
  validDate(input.localDate);
  // Find the first instant after the local date. Binary search also handles DST.
  let lo=Date.parse(`${input.localDate}T00:00:00Z`)-36*3600000;
  let hi=lo+96*3600000;
  while (hi-lo>1) {
    const mid=Math.floor((hi+lo)/2);
    if (localDateAt(mid,input.timezone)<=input.localDate) lo=mid; else hi=mid;
  }
  const dates=[hi,input.expiresAt,...additional].filter(value=>value!=null);
  if (dates.some(value=>!Number.isSafeInteger(value))) fail('VALIDATION_FAILED','Invalid expiration');
  const expiry=Math.min(...dates);
  if (expiry<=now) fail('EXPIRED','Suggestion conditions have expired',409);
  return expiry;
}

const transitions={offered:['later','dismissed','selected'],later:['dismissed','selected'],dismissed:['selected'],selected:['later','dismissed','completed','not_done'],not_done:['selected'],completed:['selected']};
export function changeSuggestion(row, patch, now, visit = null) {
  const status=patch.status ?? row.status;
  oneOf(status,Object.keys(transitions),'status');
  if (status!==row.status && !transitions[row.status].includes(status)) fail('STATE_CONFLICT','Suggestion transition is not allowed',409);
  const completionCancellation=row.status==='completed' && status==='selected';
  if (status!==row.status && ['selected','completed'].includes(status) && !completionCancellation && now>=row.expiresAt) fail('EXPIRED','Suggestion has expired',409);
  const completedVisitId=status==='completed'?(patch.completedVisitId ?? row.completedVisitId):null;
  if (status==='completed' && (!visit || visit.id!==completedVisitId || visit.personId!==row.personId || visit.placeId!==row.placeId || visit.status!=='confirmed')) fail('VALIDATION_FAILED','Completion requires a confirmed visit to this place by this person');
  if (patch.completedVisitId!=null && status!=='completed') fail('VALIDATION_FAILED','Visit can only be attached to completion');
  if (patch.presented!==undefined && patch.presented!==true) fail('VALIDATION_FAILED','presented must be true');
  for (const field of ['feedback','memo']) if (patch[field]!==undefined && (typeof patch[field]!=='string'||patch[field].length>10000)) fail('VALIDATION_FAILED',`Invalid ${field}`);
  const next={...row,status,completedVisitId,presentedAt:row.presentedAt??(patch.presented?now:null),selectedAt:row.selectedAt??(status==='selected'?now:null),feedback:patch.feedback??row.feedback,memo:patch.memo??row.memo,routeId:patch.routeId===undefined?row.routeId:patch.routeId};
  const changed=Object.keys(next).some(key=>next[key]!==row[key]);
  return changed?{...next,version:row.version+1,updatedAt:now}:next;
}

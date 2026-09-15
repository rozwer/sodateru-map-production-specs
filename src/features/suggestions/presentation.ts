import type { CheckinAnswers, SelfCheckin, Suggestion, SuggestionConditions, PlaceDetail } from '../../../packages/api-client/index';
import type { CandidateView, CheckinForm } from './view-model';
import { emptyForm } from './view-model';

/** Convert controls to the SUGGESTIONS v1 contract, without evaluating candidates. */
export function formAnswers(form: CheckinForm, previous?:CheckinAnswers): CheckinAnswers {
 const timeBudget: NonNullable<CheckinAnswers['timeBudget']> = form.time==='120+'?{kind:'atLeast',minutes:120}:form.time?{kind:'exact',minutes:Number(form.time)}:{kind:'unspecified',minutes:null};
 return {...previous,state:form.state,wishes:previous&&form.wishes===previous.wishes.join('、')?previous.wishes:form.wishes.trim()?[form.wishes]:[],minutes:timeBudget.kind==='exact'?timeBudget.minutes:null,note:previous?.note??'',timeBudget,companion:form.companion||null,effort:form.effort||null,mode:form.mode||'any'};
}
export function formConditions(form:CheckinForm):SuggestionConditions {
 const answers=formAnswers(form);
 return {timeBudget:answers.timeBudget,wishes:answers.wishes,mode:answers.mode,companion:answers.companion,effort:answers.effort};
}
export function checkinForm(checkin:SelfCheckin|null):CheckinForm {
 if(!checkin)return {...emptyForm};
 const a=checkin.answers;
 const minutes=a.timeBudget?.minutes??a.minutes;
 return {state:a.state,wishes:a.wishes.join('、'),time:a.timeBudget?.kind==='atLeast'&&minutes===120?'120+':minutes===15?'15':minutes===30?'30':minutes===60?'60':'',mode:a.mode??'',companion:a.companion??'',effort:a.effort??''};
}
export function hasAnswer(form:CheckinForm) {return Object.values(form).some(value=>value!=='');}
export function localDay(timeZone:string,now=Date.now()) {return new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function endOfDay(date:string,timeZone:string):number {
 const [year,month,day]=date.split('-').map(Number);
 if(year===undefined||month===undefined||day===undefined||![year,month,day].every(Number.isFinite))throw new Error('日付を確認してください');
 const target=Date.UTC(year,month-1,day+1);
 let instant=target;
 // Match next midnight in the named zone; DST offsets are read for the target instant.
 for(let i=0;i<3;i++){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(instant);
  const n=(key:string)=>Number(parts.find(p=>p.type===key)?.value);
  const represented=Date.UTC(n('year'),n('month')-1,n('day'),n('hour'),n('minute'),n('second'));
  instant+=target-represented;
 }
 return instant;
}
export function formatTime(value:number|null|undefined) {return value==null?'未取得':`${Math.round(value*10)/10}分`;}
export function formatDate(value:number|null|undefined,timeZone:string){return value==null?'':new Intl.DateTimeFormat('ja-JP',{timeZone,dateStyle:'short',timeStyle:'short'}).format(value);}
const statusLabels:Record<Suggestion['status'],string>={offered:'',later:'あとで考える候補',dismissed:'今回は見送り',selected:'行き先に選択済み',completed:'本人確認した訪問で達成',not_done:'未達成'};
const modeLabels:Record<string,string>={walking:'徒歩',cycling:'自転車',driving:'車',transit:'公共交通',any:'移動'};
export function candidateView(suggestion:Suggestion,detail:PlaceDetail|undefined,timeZone:string,bookmarked=false):CandidateView {
 const evaluations=suggestion.evaluations??[];
 const own=detail?.ownRecords.status==='ready'?detail.ownRecords.items:[];
 const shared=detail?.sharedRecords.status==='ready'?detail.sharedRecords.items:[];
 const seen=new Set<string>();
 const photos=[...own,...shared].flatMap(record=>record.media.filter(media=>media.kind==='photo'&&media.status==='ready'&&media.contentUrl).map(media=>({id:media.id,url:media.contentUrl!,alt:`${record.person.displayName}の記録の写真（${detail?.place.name??suggestion.title}）`}))).filter(photo=>!seen.has(photo.id)&&!!seen.add(photo.id));
 const checkin=suggestion.checkinSnapshot;
 const wishes=checkin?[checkin.answers.state,...checkin.answers.wishes].filter(Boolean).join('・'):(suggestion.conditions.wishes??[]).join('・');
 return {id:suggestion.id,title:detail?.place.name??suggestion.title,tags:[...new Set([suggestion.activity,...(detail?.place.categories??[]),...(suggestion.matchedWishes??[])])],reason:suggestion.reason,wishes,
  evaluation:suggestion.evaluationState==='rated'&&suggestion.rating!=null?`評価 ${suggestion.rating}`:'未評価',
  travel:`${modeLabels[suggestion.conditions.mode??'any']??'移動'}${formatTime(suggestion.travelMinutes)}`,stay:formatTime(suggestion.stayMinutes),total:suggestion.totalMinutes==null?'未取得':`約${formatTime(suggestion.totalMinutes)}`,
  status:statusLabels[suggestion.status],photos,
  confirmed:evaluations.filter(e=>e.status==='matched').map(e=>e.reason),
  unknown:[...(suggestion.unknowns??[]),...evaluations.filter(e=>e.status!=='matched').map(e=>`${e.status==='unmatched'?'条件に合わない：':''}${e.reason}`),...(!detail?['場所の現在情報は未取得です']:!detail.openingHours?['現在の営業時間は未取得です']:[`取得元の営業時間（未確認）：${detail.openingHours.rawText}`])],
  sourceUrl:detail?.place.sourceUrl??null,sourceLabel:detail?.place.attribution||'',fetchedAt:formatDate(detail?.place.fetchedAt,timeZone),expiresAt:formatDate(suggestion.expiresAt,timeZone),memo:suggestion.memo??'',bookmarked};
}

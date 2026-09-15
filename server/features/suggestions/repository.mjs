import {randomUUID,createHash} from 'node:crypto';
import {fail,normalizeConditions,validDate,localDateAt,changeSuggestion} from './domain.mjs';

const parse=JSON.parse;
const id=value=>{if(typeof value!=='string'||value.length<1||value.length>80)fail('VALIDATION_FAILED','Invalid ID');return value;};
const timestamp=value=>{if(!Number.isSafeInteger(value)||value<0)fail('VALIDATION_FAILED','Invalid timestamp');return value;};
function answers(value) {
  if (!value || typeof value!=='object') fail('VALIDATION_FAILED','answers are required');
  for (const field of ['state','note']) if(typeof value[field]!=='string'||value[field].length>10000) fail('VALIDATION_FAILED',`Invalid ${field}`);
  const normalized=normalizeConditions(value);
  return {...normalized,minutes:normalized.timeBudget.kind==='exact'?normalized.timeBudget.minutes:null};
}
function checkinDTO(row) {
  return {id:row.id,personId:row.person_id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,localDate:row.local_date,answers:parse(row.answers_json),validUntil:row.valid_until,timezone:row.timezone};
}
function suggestionDTO(row) {
  const saved=parse(row.details_json);
  const details=Object.fromEntries(['checkinVersion','checkinSnapshot','travelMinutes','stayMinutes','totalMinutes','stay','evaluations','evaluationState','rating','matchedWishes','routeEvidence','unknowns','generator'].filter(key=>saved[key]!==undefined).map(key=>[key,saved[key]]));
  return {...details,id:row.id,personId:row.person_id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,placeId:row.place_id,batchId:row.batch_id,position:row.position,title:row.title,activity:row.activity,reason:row.reason,conditions:parse(row.conditions_json),checkinId:row.checkin_id,sourceRefs:parse(row.source_refs_json),status:row.status,presentedAt:row.presented_at,viewedAt:row.viewed_at,selectedAt:row.selected_at,expiresAt:row.expires_at,routeId:row.route_id,completedVisitId:row.completed_visit_id,feedback:row.feedback,memo:row.memo};
}
function pagination(query,scope) {
  const limit=query.limit===undefined?50:Number(query.limit);
  if(!Number.isInteger(limit)||limit<1||limit>100) fail('VALIDATION_FAILED','Invalid pagination');
  const queryHash=createHash('sha256').update(JSON.stringify(scope)).digest('hex');
  let after=null;
  if(query.cursor!=null) {
    try {after=JSON.parse(Buffer.from(query.cursor,'base64url').toString());}catch{fail('VALIDATION_FAILED','Invalid cursor');}
    if(!after||after.queryHash!==queryHash||!Number.isSafeInteger(after.time)||typeof after.id!=='string')fail('VALIDATION_FAILED','Cursor does not match this query');
  }
  const cursor=row=>Buffer.from(JSON.stringify({queryHash,time:row.created_at,id:row.id,unknown:false,...(row.batch_id?{batchId:row.batch_id,position:row.position}:{})})).toString('base64url');
  return {limit,after,cursor};
}
export function listSelfCheckins(db,context,query={}) {
  const {limit,after,cursor}=pagination(query,[context.personId,context.dataMode??'live','checkins',query.date??null,'created_at DESC,id DESC']);
  if(query.date)validDate(query.date);
  const rows=db.prepare('SELECT * FROM self_checkins WHERE person_id=? AND (? IS NULL OR local_date=?) AND (? IS NULL OR created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT ?').all(context.personId,query.date??null,query.date??null,after?.time??null,after?.time??null,after?.time??null,after?.id??null,limit+1);
  return {items:rows.slice(0,limit).map(checkinDTO),nextCursor:rows.length>limit?cursor(rows[limit-1]):null};
}

export class SuggestionsRepository {
  constructor(db,personId,transaction,dataMode='live') {this.db=db;this.personId=personId;this.dataMode=dataMode;this.transaction=fn=>transaction(db,fn);}
  getCheckin(checkinId) {
    const row=this.db.prepare('SELECT * FROM self_checkins WHERE id=? AND person_id=?').get(id(checkinId),this.personId);
    if(!row)fail('NOT_FOUND','Checkin not found',404);
    return checkinDTO(row);
  }
  listCheckins(query={}) {
    return listSelfCheckins(this.db,{personId:this.personId,dataMode:this.dataMode},query);
  }
  createCheckin(input,now) {
    id(input.id);validDate(input.localDate);timestamp(input.validUntil);
    const timezone=input.timezone??'UTC';localDateAt(now,timezone);
    if(input.validUntil<=now)fail('VALIDATION_FAILED','Answer validity must be in the future');
    const normalized=answers(input.answers);
    return this.transaction(()=>{
      const exists=this.db.prepare('SELECT id FROM self_checkins WHERE id=?').get(input.id);
      if(exists)fail('STATE_CONFLICT','Checkin ID already exists; use its update operation',409);
      this.db.prepare('INSERT INTO self_checkins(id,person_id,version,created_at,updated_at,local_date,answers_json,valid_until,timezone) VALUES(?,?,1,?,?,?,?,?,?)').run(input.id,this.personId,now,now,input.localDate,JSON.stringify(normalized),input.validUntil,timezone);
      const saved=this.getCheckin(input.id);this.saveCheckinVersion(saved);return saved;
    });
  }
  saveCheckinVersion(saved) {
    this.db.prepare('INSERT INTO suggestion_checkin_versions(checkin_id,person_id,version,snapshot_json) VALUES(?,?,?,?)').run(saved.id,this.personId,saved.version,JSON.stringify(saved));
  }
  patchCheckin(checkinId,patch,expected,now) {
    return this.transaction(()=>{
      const old=this.getCheckin(checkinId);
      if(old.version!==expected)fail('VERSION_CONFLICT','Checkin version changed',412);
      const next={...old,localDate:patch.localDate??old.localDate,validUntil:patch.validUntil??old.validUntil,answers:patch.answers===undefined?old.answers:answers(patch.answers),timezone:patch.timezone??old.timezone};
      validDate(next.localDate);timestamp(next.validUntil);localDateAt(now,next.timezone);
      if(next.validUntil<=old.createdAt)fail('VALIDATION_FAILED','Answer validity must follow creation');
      if(JSON.stringify(next)===JSON.stringify(old))return old;
      this.db.prepare('UPDATE self_checkins SET local_date=?,answers_json=?,valid_until=?,timezone=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND version=?').run(next.localDate,JSON.stringify(next.answers),next.validUntil,next.timezone,now,checkinId,this.personId,expected);
      const saved=this.getCheckin(checkinId);this.saveCheckinVersion(saved);return saved;
    });
  }
  deleteCheckin(checkinId,expected) {
    return this.transaction(()=>{
      const row=this.getCheckin(checkinId);
      if(row.version!==expected)fail('VERSION_CONFLICT','Checkin version changed',412);
      // The immutable sourceRef/snapshot remains in the historical batch.
      this.db.prepare('UPDATE suggestions SET checkin_id=NULL,version=version+1,updated_at=? WHERE checkin_id=? AND person_id=?').run(Date.now(),checkinId,this.personId);
      this.db.prepare('DELETE FROM suggestion_checkin_versions WHERE checkin_id=? AND person_id=?').run(checkinId,this.personId);
      this.db.prepare('DELETE FROM self_checkins WHERE id=? AND person_id=?').run(checkinId,this.personId);
    });
  }
  resolveCheckin(ref,now) {
    if(ref===null)return null;
    if(!ref||ref.type!=='checkin')fail('VALIDATION_FAILED','checkin must be a checkin SourceRef or null');
    const row=this.getCheckin(ref.id);
    if(row.version!==ref.version)fail('SOURCE_CHANGED','Answer was corrected; regenerate using the current version',409);
    if(row.validUntil<=now)fail('EXPIRED','Answer expired',409);
    return row;
  }
  reserveBatch(input,now) {
    id(input.id);
    if(this.db.prepare('SELECT id FROM suggestion_batch_runs WHERE id=? UNION SELECT id FROM suggestion_batches WHERE id=?').get(input.id,input.id))fail('REQUEST_CONFLICT','Batch ID already exists',409);
    this.db.prepare("INSERT INTO suggestion_batch_runs(id,person_id,status,request_json,created_at,updated_at) VALUES(?,?,'running',?,?,?)").run(input.id,this.personId,JSON.stringify(input),now,now);
  }
  failBatch(batchId,error,now) {
    this.db.prepare("UPDATE suggestion_batch_runs SET status='failed',error_json=?,updated_at=? WHERE id=? AND person_id=? AND status='running'").run(JSON.stringify({code:error.code,message:error.message,status:error.status}),now,batchId,this.personId);
  }
  interruptPending(now) {
    this.db.prepare("UPDATE suggestion_batch_runs SET status='failed',error_json=?,updated_at=? WHERE person_id=? AND status='running'").run(JSON.stringify({code:'INTERRUPTED',message:'候補生成が再起動で中断されました。新しい操作で生成してください。',status:409}),now,this.personId);
  }
  saveBatch(input,candidates,now,emptyReason=null,beforeSave=null) {
    id(input.id);timestamp(input.expiresAt);
    if(input.expiresAt<=now)fail('EXPIRED','Batch expired',409);
    return this.transaction(()=>{
      if(beforeSave)beforeSave();
      if(this.db.prepare('SELECT id FROM suggestion_batches WHERE id=?').get(input.id))fail('STATE_CONFLICT','Batch ID already exists',409);
      this.resolveCheckin(input.checkin,now);
      this.db.prepare('INSERT INTO suggestion_batches(id,person_id,input_json,expires_at,created_at,empty_reason) VALUES(?,?,?,?,?,?)').run(input.id,this.personId,JSON.stringify(input),input.expiresAt,now,emptyReason);
      for(const [position,candidate] of candidates.entries()) {
        this.db.prepare('INSERT INTO suggestions(id,person_id,version,created_at,updated_at,place_id,batch_id,position,title,activity,reason,conditions_json,checkin_id,source_refs_json,status,presented_at,selected_at,expires_at,route_id,completed_visit_id,feedback,details_json,memo) VALUES(?,?,1,?,?,?,?,?,?,?,?,?,?,?,\'offered\',NULL,NULL,?,NULL,NULL,\'\',?,\'\')').run(randomUUID(),this.personId,now,now,id(candidate.placeId),input.id,position,candidate.title,candidate.activity,candidate.reason,JSON.stringify(input.conditions),input.checkin?.id??null,JSON.stringify(candidate.sourceRefs??[]),Math.min(input.expiresAt,candidate.expiresAt),JSON.stringify({...candidate,checkinVersion:input.checkin?.version??null,checkinSnapshot:input.checkinSnapshot??null}));
      }
      this.db.prepare("UPDATE suggestion_batch_runs SET status='complete',updated_at=? WHERE id=? AND person_id=? AND status='running'").run(now,input.id,this.personId);
      return this.getBatch(input.id);
    });
  }
  getBatch(batchId) {
    const row=this.db.prepare('SELECT * FROM suggestion_batches WHERE id=? AND person_id=?').get(id(batchId),this.personId);
    if(!row) {
      const run=this.db.prepare('SELECT * FROM suggestion_batch_runs WHERE id=? AND person_id=?').get(batchId,this.personId);
      if(run?.status==='running')fail('BUSY','候補を生成しています。同じ要求を再送して状態を確認してください。',409);
      if(run?.status==='failed') {const error=parse(run.error_json);fail(error.code,error.message,error.status);}
      fail('NOT_FOUND','Batch not found',404);
    }
    return {id:row.id,items:this.db.prepare('SELECT * FROM suggestions WHERE batch_id=? AND person_id=? ORDER BY position,id').all(batchId,this.personId).map(suggestionDTO),expiresAt:row.expires_at,emptyReason:row.empty_reason,conditions:parse(row.input_json).conditions};
  }
  getSuggestion(suggestionId) {
    const row=this.db.prepare('SELECT * FROM suggestions WHERE id=? AND person_id=?').get(id(suggestionId),this.personId);
    if(!row)fail('NOT_FOUND','Suggestion not found',404);
    return suggestionDTO(row);
  }
  listSuggestions(query={}) {
    const {limit,after,cursor}=pagination(query,[this.personId,this.dataMode,'suggestions',query.batchId??null,query.status??null,'created_at DESC,batch_id,position,id']);
    if(after&&(typeof after.batchId!=='string'||!Number.isInteger(after.position)))fail('VALIDATION_FAILED','Invalid suggestion cursor');
    const rows=this.db.prepare('SELECT * FROM suggestions WHERE person_id=? AND (? IS NULL OR batch_id=?) AND (? IS NULL OR status=?) AND (? IS NULL OR created_at<? OR (created_at=? AND (batch_id,position,id)>(?,?,?))) ORDER BY created_at DESC,batch_id,position,id LIMIT ?').all(this.personId,query.batchId??null,query.batchId??null,query.status??null,query.status??null,after?.time??null,after?.time??null,after?.time??null,after?.batchId??null,after?.position??null,after?.id??null,limit+1);
    return {items:rows.slice(0,limit).map(suggestionDTO),nextCursor:rows.length>limit?cursor(rows[limit-1]):null};
  }
  patchSuggestion(suggestionId,patch,expected,now,visit=null) {
    return this.transaction(()=>{
      const old=this.getSuggestion(suggestionId);
      if(old.version!==expected)fail('VERSION_CONFLICT','Suggestion version changed',412);
      const next=changeSuggestion(old,patch,now,visit);
      if(next.version===old.version)return old;
      this.db.prepare('UPDATE suggestions SET status=?,presented_at=?,viewed_at=?,selected_at=?,completed_visit_id=?,feedback=?,memo=?,route_id=?,version=?,updated_at=? WHERE id=? AND person_id=? AND version=?').run(next.status,next.presentedAt,next.viewedAt,next.selectedAt,next.completedVisitId,next.feedback,next.memo,next.routeId,next.version,now,suggestionId,this.personId,expected);
      return this.getSuggestion(suggestionId);
    });
  }
}

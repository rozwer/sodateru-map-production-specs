import {randomUUID} from 'node:crypto';
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
  return {...parse(row.details_json),id:row.id,personId:row.person_id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,placeId:row.place_id,batchId:row.batch_id,position:row.position,title:row.title,activity:row.activity,reason:row.reason,conditions:parse(row.conditions_json),checkinId:row.checkin_id,sourceRefs:parse(row.source_refs_json),status:row.status,presentedAt:row.presented_at,selectedAt:row.selected_at,expiresAt:row.expires_at,routeId:row.route_id,completedVisitId:row.completed_visit_id,feedback:row.feedback,memo:row.memo};
}
function pagination(query) {
  const limit=query.limit===undefined?50:Number(query.limit), offset=query.cursor===undefined?0:Number(query.cursor);
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0) fail('VALIDATION_FAILED','Invalid pagination');
  return {limit,offset};
}

export class SuggestionsRepository {
  constructor(db,personId,transaction) {this.db=db;this.personId=personId;this.transaction=fn=>transaction(db,fn);}
  getCheckin(checkinId) {
    const row=this.db.prepare('SELECT * FROM self_checkins WHERE id=? AND person_id=?').get(id(checkinId),this.personId);
    if(!row)fail('NOT_FOUND','Checkin not found',404);
    return checkinDTO(row);
  }
  listCheckins(query={}) {
    const {limit,offset}=pagination(query);
    if(query.date)validDate(query.date);
    const rows=this.db.prepare('SELECT * FROM self_checkins WHERE person_id=? AND (? IS NULL OR local_date=?) ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?').all(this.personId,query.date??null,query.date??null,limit+1,offset);
    return {items:rows.slice(0,limit).map(checkinDTO),nextCursor:rows.length>limit?String(offset+limit):null};
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
      this.db.prepare('UPDATE suggestions SET checkin_id=NULL WHERE checkin_id=? AND person_id=?').run(checkinId,this.personId);
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
  saveBatch(input,candidates,now,emptyReason=null) {
    id(input.id);timestamp(input.expiresAt);
    if(input.expiresAt<=now)fail('EXPIRED','Batch expired',409);
    return this.transaction(()=>{
      if(this.db.prepare('SELECT id FROM suggestion_batches WHERE id=?').get(input.id))fail('STATE_CONFLICT','Batch ID already exists',409);
      this.resolveCheckin(input.checkin,now);
      this.db.prepare('INSERT INTO suggestion_batches(id,person_id,input_json,expires_at,created_at,empty_reason) VALUES(?,?,?,?,?,?)').run(input.id,this.personId,JSON.stringify(input),input.expiresAt,now,emptyReason);
      for(const [position,candidate] of candidates.entries()) {
        this.db.prepare('INSERT INTO suggestions(id,person_id,version,created_at,updated_at,place_id,batch_id,position,title,activity,reason,conditions_json,checkin_id,source_refs_json,status,presented_at,selected_at,expires_at,route_id,completed_visit_id,feedback,details_json,memo) VALUES(?,?,1,?,?,?,?,?,?,?,?,?,?,?,\'offered\',NULL,NULL,?,NULL,NULL,\'\',?,\'\')').run(randomUUID(),this.personId,now,now,id(candidate.placeId),input.id,position,candidate.title,candidate.activity,candidate.reason,JSON.stringify(input.conditions),input.checkin?.id??null,JSON.stringify(candidate.sourceRefs??[]),Math.min(input.expiresAt,candidate.expiresAt),JSON.stringify({...candidate,checkinVersion:input.checkin?.version??null,checkinSnapshot:input.checkinSnapshot??null}));
      }
      return this.getBatch(input.id);
    });
  }
  getBatch(batchId) {
    const row=this.db.prepare('SELECT * FROM suggestion_batches WHERE id=? AND person_id=?').get(id(batchId),this.personId);
    if(!row)fail('NOT_FOUND','Batch not found',404);
    return {id:row.id,items:this.db.prepare('SELECT * FROM suggestions WHERE batch_id=? AND person_id=? ORDER BY position,id').all(batchId,this.personId).map(suggestionDTO),expiresAt:row.expires_at,emptyReason:row.empty_reason,conditions:parse(row.input_json).conditions};
  }
  getSuggestion(suggestionId) {
    const row=this.db.prepare('SELECT * FROM suggestions WHERE id=? AND person_id=?').get(id(suggestionId),this.personId);
    if(!row)fail('NOT_FOUND','Suggestion not found',404);
    return suggestionDTO(row);
  }
  listSuggestions(query={}) {
    const {limit,offset}=pagination(query);
    const rows=this.db.prepare('SELECT * FROM suggestions WHERE person_id=? AND (? IS NULL OR batch_id=?) AND (? IS NULL OR status=?) ORDER BY created_at DESC,batch_id,position,id LIMIT ? OFFSET ?').all(this.personId,query.batchId??null,query.batchId??null,query.status??null,query.status??null,limit+1,offset);
    return {items:rows.slice(0,limit).map(suggestionDTO),nextCursor:rows.length>limit?String(offset+limit):null};
  }
  patchSuggestion(suggestionId,patch,expected,now,visit=null) {
    return this.transaction(()=>{
      const old=this.getSuggestion(suggestionId);
      if(old.version!==expected)fail('VERSION_CONFLICT','Suggestion version changed',412);
      const next=changeSuggestion(old,patch,now,visit);
      if(next.version===old.version)return old;
      this.db.prepare('UPDATE suggestions SET status=?,presented_at=?,selected_at=?,completed_visit_id=?,feedback=?,memo=?,route_id=?,version=?,updated_at=? WHERE id=? AND person_id=? AND version=?').run(next.status,next.presentedAt,next.selectedAt,next.completedVisitId,next.feedback,next.memo,next.routeId,next.version,now,suggestionId,this.personId,expected);
      return this.getSuggestion(suggestionId);
    });
  }
}

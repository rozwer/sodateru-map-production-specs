import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { CompanionRepository, CompanionFailure } from './repository.ts';

const active = (status: string) => status === 'queued' || status === 'running';
const fail = (code: string): never => { throw new CompanionFailure(code); };
export class GenerationRepository {
  db: DatabaseSync;
  personId: string;
  pets: CompanionRepository;
  constructor(db: DatabaseSync, personId: string) { this.db=db; this.personId=personId; this.pets=new CompanionRepository(db,personId); }
  get(id: string) {
    const r = this.db.prepare('SELECT g.*,c.id AS adopted_companion_id FROM companion_generations g LEFT JOIN companions c ON c.import_id=g.result_import_id AND c.person_id=g.person_id WHERE g.id=? AND g.person_id=?').get(id,this.personId);
    if (!r) return fail('NOT_FOUND');
    return {id:r.id as string,draftId:r.draft_id as string,input:JSON.parse(r.input_json as string),provider:r.provider as string,upstreamJobId:r.upstream_job_id as string|null,status:r.status as string,progress:r.progress as number,resultImportId:r.result_import_id as string|null,failureCode:r.failure_code as string|null,version:r.version as number,adoptedCompanionId:r.adopted_companion_id as string|null,createdAt:r.created_at as string,updatedAt:r.updated_at as string};
  }
  list(draftId?: string) {
    const rows = draftId
      ? this.db.prepare('SELECT id FROM companion_generations WHERE person_id=? AND draft_id=? ORDER BY created_at DESC,id').all(this.personId,draftId)
      : this.db.prepare('SELECT id FROM companion_generations WHERE person_id=? ORDER BY created_at DESC,id').all(this.personId);
    return rows.map(r => this.get(r.id as string));
  }
  create(draftId: string, expectedDraftVersion: number, provider: string) {
    const draft = this.pets.getDraft(draftId);
    if (draft.version !== expectedDraftVersion) fail('VERSION_CONFLICT');
    if (!draft.name.trim() || !draft.appearance.trim() || !provider) fail('INVALID_INPUT');
    if (this.db.prepare("SELECT id FROM companion_generations WHERE person_id=? AND draft_id=? AND status IN ('queued','running')").get(this.personId,draftId)) fail('GENERATION_BUSY');
    const id=randomUUID(), now=new Date().toISOString();
    this.db.prepare('INSERT INTO companion_generations(id,person_id,draft_id,input_json,provider,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id,this.personId,draftId,JSON.stringify(draft),provider,now,now);
    return this.get(id);
  }
  recordProgress(id: string, update: {jobId: string; status:'queued'|'running'; progress:number}) {
    const item=this.get(id);
    if (!active(item.status)) return item;
    if (!update.jobId || !Number.isFinite(update.progress) || update.progress<0 || update.progress>100) fail('INVALID_PROVIDER_RESULT');
    if (item.upstreamJobId && item.upstreamJobId!==update.jobId) fail('INVALID_PROVIDER_RESULT');
    this.db.prepare("UPDATE companion_generations SET upstream_job_id=?,status=?,progress=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND status IN ('queued','running')").run(update.jobId,update.status,Math.max(item.progress,Math.floor(update.progress)),new Date().toISOString(),id,this.personId);
    return this.get(id);
  }
  complete(id: string, resultImportId: string) {
    const item=this.get(id);
    if (!active(item.status)) fail('GENERATION_TERMINAL');
    this.pets.getImport(resultImportId);
    const r=this.db.prepare("UPDATE companion_generations SET status='succeeded',progress=100,result_import_id=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND status IN ('queued','running')").run(resultImportId,new Date().toISOString(),id,this.personId);
    if (r.changes!==1) fail('GENERATION_TERMINAL');
    return this.get(id);
  }
  fail(id: string, code: string) {
    this.get(id);
    this.db.prepare("UPDATE companion_generations SET status='failed',failure_code=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND status IN ('queued','running')").run(code,new Date().toISOString(),id,this.personId);
    return this.get(id);
  }
  cancel(id: string, expected: number) {
    const item=this.get(id);
    if (item.version!==expected) fail('VERSION_CONFLICT');
    if (!active(item.status)) return item;
    const r=this.db.prepare("UPDATE companion_generations SET status='cancelled',version=version+1,updated_at=? WHERE id=? AND person_id=? AND version=? AND status IN ('queued','running')").run(new Date().toISOString(),id,this.personId,expected);
    if (r.changes!==1) fail('VERSION_CONFLICT');
    return this.get(id);
  }
  noteCancellationFailure(id: string) {
    this.get(id);
    this.db.prepare("UPDATE companion_generations SET failure_code='REMOTE_CANCEL_FAILED',version=version+1,updated_at=? WHERE id=? AND person_id=? AND status='cancelled'").run(new Date().toISOString(),id,this.personId);
  }
  adopt(id: string, expected: number) {
    const item=this.get(id);
    if (item.version!==expected) fail('VERSION_CONFLICT');
    if (item.status!=='succeeded' || !item.resultImportId) fail('GENERATION_NOT_READY');
    return this.pets.registerImport(item.resultImportId,'generation');
  }
}

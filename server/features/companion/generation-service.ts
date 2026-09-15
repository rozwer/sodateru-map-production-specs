import type { DraftInput, InspectedPackage } from './repository.ts';
import { CompanionFailure } from './repository.ts';
import { GenerationRepository } from './generations.ts';
import type { DatabaseSync } from 'node:sqlite';

export type ProviderResult = {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  zip?: Uint8Array;
  failureCode?: string;
};
/** Each concrete provider must implement its actual documented job protocol. */
export interface CompanionProvider {
  id: string;
  start(input: DraftInput, reference: {bytes:Uint8Array;mime:string}|null, generationId: string): Promise<ProviderResult>;
  poll(jobId: string): Promise<ProviderResult>;
  cancel(jobId: string): Promise<void>;
}
type Atomic = <T>(db:DatabaseSync,action:()=>T)=>T;
const active = (status:string) => status==='queued' || status==='running';

export class GenerationService {
  provider: CompanionProvider|null;
  inspect: (zip:Uint8Array)=>Promise<InspectedPackage>;
  atomic: Atomic;
  pending=new Set<string>();
  constructor(provider:CompanionProvider|null, inspect:(zip:Uint8Array)=>Promise<InspectedPackage>, atomic:Atomic) {
    this.provider=provider; this.inspect=inspect; this.atomic=atomic;
  }
  status() { return {connected:Boolean(this.provider),provider:this.provider?.id??null,reason:this.provider?null:'PROVIDER_NOT_CONNECTED'}; }
  private connected() { if (!this.provider) throw new CompanionFailure('PROVIDER_NOT_CONNECTED'); return this.provider; }
  async start(jobs:GenerationRepository,draftId:string,expected:number) {
    const provider=this.connected();
    const job=jobs.create(draftId,expected,provider.id);
    this.pending.add(job.id);
    try {
      const reference=job.input.referenceImageId?jobs.pets.getReferenceImage(job.input.referenceImageId):null;
      const result=await provider.start(job.input,reference,job.id);
      return await this.accept(jobs,job.id,result);
    } catch {
      return jobs.fail(job.id,'PROVIDER_REQUEST_FAILED');
    } finally { this.pending.delete(job.id); }
  }
  async refresh(jobs:GenerationRepository,id:string) {
    const job=jobs.get(id);
    if (!active(job.status) || this.pending.has(id)) return job;
    const provider=this.connected();
    if (provider.id!==job.provider) throw new CompanionFailure('PROVIDER_NOT_CONNECTED');
    if (!job.upstreamJobId) return jobs.fail(id,'GENERATION_INTERRUPTED');
    // A transient poll failure keeps the durable job available for another poll.
    const result=await provider.poll(job.upstreamJobId);
    return this.accept(jobs,id,result);
  }
  async cancel(jobs:GenerationRepository,id:string,expected:number) {
    const job=jobs.cancel(id,expected);
    if (job.status==='cancelled' && job.upstreamJobId && this.provider?.id===job.provider) {
      try { await this.provider.cancel(job.upstreamJobId); }
      catch { jobs.noteCancellationFailure(id); }
    }
    return jobs.get(id);
  }
  private async accept(jobs:GenerationRepository,id:string,result:ProviderResult) {
    let job=jobs.get(id);
    if (!active(job.status)) {
      if (job.status==='cancelled' && result.jobId) {
        try { await this.connected().cancel(result.jobId); }
        catch { jobs.noteCancellationFailure(id); }
      }
      return jobs.get(id);
    }
    if (!result.jobId || !['queued','running','succeeded','failed'].includes(result.status)) throw new CompanionFailure('INVALID_PROVIDER_RESULT');
    job=jobs.recordProgress(id,{jobId:result.jobId,status:result.status==='queued'?'queued':'running',progress:result.progress});
    if (result.status==='failed') return jobs.fail(id,result.failureCode??'GENERATION_FAILED');
    if (result.status!=='succeeded') return job;
    if (!result.zip) return jobs.fail(id,'INVALID_PROVIDER_RESULT');
    let inspected:InspectedPackage;
    try { inspected=await this.inspect(result.zip); }
    catch { return jobs.fail(id,'INVALID_GENERATED_PACKAGE'); }
    // CORE owns the transaction implementation; no network/image decode occurs inside it.
    return this.atomic(jobs.db,()=>{
      const latest=jobs.get(id);
      if (!active(latest.status)) return latest;
      const imported=jobs.pets.saveInspectedImport(inspected);
      return jobs.complete(id,imported.id);
    });
  }
}

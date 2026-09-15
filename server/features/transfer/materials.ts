import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { transaction } from '../../db/transaction.ts';
import { createInformationService } from '../../information/service.ts';
import { placesService } from '../places/service.ts';
import { getPlace } from '../places/repository.ts';
import { TransferError } from './types.ts';
import type { Recipe, SourceRef, Candidate } from './types.ts';
import type { Evidence } from './service.ts';

export function sourceMaterials(db: DatabaseSync, context: RequestContext, refs: SourceRef[]) {
  const info = createInformationService(db);
  info.assertSourcesCurrent(context,{refs});
  const all = new Map(refs.map(ref => [`${ref.type}:${ref.id}`,ref]));
  const evidence: Evidence[] = [];
  for (const ref of [...refs].sort((a,b)=>a.type.localeCompare(b.type)||a.id.localeCompare(b.id))) {
    if (ref.type === 'record') {
      const record = info.getRecord(context,ref.id);
      for (const source of record.sourceRefs) {
        const previous = all.get(`${source.type}:${source.id}`);
        if (previous && previous.version !== source.version) throw new TransferError('SOURCE_CHANGED','元体験の参照が変更されています');
        all.set(`${source.type}:${source.id}`,source);
      }
      evidence.push({id:`src_record_${ref.id}`,role:'source-experience',sourceRef:ref,
        text:JSON.stringify({body:record.body,purposes:record.purposes,impression:record.impression,place:record.place,effectiveAt:record.effectiveAt})});
    }
    if (ref.type === 'place') {
      const place = getPlace(db,ref.id);
      evidence.push({id:`src_place_${ref.id}`,role:'place',sourceRef:ref,
        text:JSON.stringify({name:place.name,address:place.address,categories:place.categories,sourceUrl:place.sourceUrl,attribution:place.attribution})});
    }
  }
  const sourceRefs = [...all.values()].sort((a,b)=>a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
  info.assertSourcesCurrent(context,{refs:sourceRefs});
  return {evidence,sourceRefs};
}

export function searchQuery(region: string, meaning: string): string {
  const category = [
    [/カフェ|喫茶|コーヒー|珈琲|coffee|cafe|café/i,'cafe'],
    [/公園|緑|散歩|散策|park|walk/i,'park'],
    [/美術|博物|museum/i,'museum'],
    [/図書|読書|library/i,'library'],
    [/寺|神社|temple|shrine/i,'shrine'],
    [/食事|食べ|ランチ|夕食|restaurant|lunch/i,'restaurant'],
    [/パン|ベーカリー|bakery/i,'bakery'],
  ] as const;
  const matched = category.find(([pattern])=>pattern.test(meaning));
  return matched ? `${matched[1]} in ${region}`.slice(0,200) : `${region} ${meaning}`.slice(0,200);
}

export async function findCandidates(db: DatabaseSync, context: RequestContext, recipe: Recipe, region: string): Promise<Candidate[]> {
  const candidates = new Map<string,Candidate>();
  for (const step of recipe.steps) {
    const result = await placesService.search(context,db,{q:searchQuery(region,step.meaning),limit:5});
    for (const item of result.items) {
      if (item.retention !== 'storable') continue;
      const place = transaction(db,()=>placesService.adopt(context,db,{id:crypto.randomUUID(),mode:'candidate',resultId:result.resultId,candidateId:item.candidateId}).place);
      const previous = candidates.get(place.id);
      if (previous) { if (!previous.stepIds.includes(step.id)) previous.stepIds.push(step.id); }
      else candidates.set(place.id,{placeId:place.id,version:place.version,name:place.name,position:{longitude:place.coordinates[0],latitude:place.coordinates[1]},stepIds:[step.id]});
    }
  }
  return [...candidates.values()];
}

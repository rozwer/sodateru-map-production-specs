import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { CompanionRepository } from './repository.ts';
import { GenerationRepository } from './generations.ts';
import { GenerationService } from './generation-service.ts';

test('no provider preserves the draft and makes no generation record', async () => {
  const db=new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../../db/migrations/companion/001-companion.sql',import.meta.url),'utf8'));
  try {
    const pets=new CompanionRepository(db,'alice'),jobs=new GenerationRepository(db,'alice');
    const draft=pets.createDraft({name:'猫',appearance:'青い帽子',referenceImageId:null});
    const service=new GenerationService(null,async()=>{throw Error('unused');},(_db,fn)=>fn());
    await assert.rejects(service.start(jobs,draft.id,1),/PROVIDER_NOT_CONNECTED/);
    assert.equal(pets.getDraft(draft.id).appearance,'青い帽子');
    assert.equal(jobs.list().length,0);
  } finally { db.close(); }
});

test('cancellation while provider is pending discards the late package and attempts remote cancellation', async () => {
  const db=new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../../db/migrations/companion/001-companion.sql',import.meta.url),'utf8'));
  try {
    const pets=new CompanionRepository(db,'alice'),jobs=new GenerationRepository(db,'alice');
    const draft=pets.createDraft({name:'猫',appearance:'青い帽子',referenceImageId:null});
    let release!: (value:any)=>void;
    const pending=new Promise<any>(resolve=>{release=resolve;});
    let cancelledRemote='';
    // Controlled provider boundary only; this test is not external connection evidence.
    const service=new GenerationService({id:'test-provider',start:async()=>pending,poll:async()=>{throw Error('unused');},cancel:async id=>{cancelledRemote=id;}},async()=>{throw Error('late package must not be inspected');},(_db,fn)=>fn());
    const started=service.start(jobs,draft.id,1);
    const row=jobs.list()[0]!;
    await service.cancel(jobs,row.id,row.version);
    release({jobId:'remote-1',status:'succeeded',progress:100,zip:Buffer.from('late')});
    const result=await started;
    assert.equal(result.status,'cancelled');
    assert.equal(cancelledRemote,'remote-1');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM companion_imports').get()!.n,0);
    assert.equal(pets.listCompanions().length,0);
  } finally { db.close(); }
});

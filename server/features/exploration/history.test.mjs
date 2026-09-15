import test from 'node:test';import assert from 'node:assert/strict';import {ConsultHistoryService} from './history.mjs';
test('history restores same temporary result only for same owner/mode while saved conversation remains independent',async()=>{
 let alive=true;const result={resultId:'r1',origin:{coordinates:[1,2],kind:'selected',label:'起点'},places:[{candidateId:'candidate-2',retention:'temporary'}],expiresAt:10000};
 const c={personId:'p1',dataMode:'live'};
 const dialogue={get:async(ctx,id)=>{if(!alive)throw Object.assign(new Error('expired'),{code:'RESULT_EXPIRED'});assert.equal(id,'r1');return structuredClone(result);}};
 const service=new ConsultHistoryService(dialogue,async(ctx,id)=>({id,purpose:'consult'}));
 assert.deepEqual((await service.link(c,'r1',{conversationId:'c1'})).result,result);
 assert.equal((await service.resume(c,'c1')).result.places[0].candidateId,'candidate-2');
 assert.equal((await service.resume({...c,dataMode:'demo'},'c1')).resumeAction,'search');
 assert.equal((await service.resume({...c,personId:'p2'},'c1')).result,null);
 alive=false;assert.deepEqual(await service.resume(c,'c1'),{conversationId:'c1',resultId:null,result:null,expiresAt:null,resumeAction:'search'});
});

import { readFileSync } from 'node:fs';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { defineFeature } from '../../core/features.ts';
import { expectedVersion } from '../../core/errors.ts';
import { idempotencyKey, idempotentMutation } from '../../core/idempotency.ts';
import type { StoredResult } from '../../core/idempotency.ts';
import { createReflectionService } from './service.ts';
import { registerReflectionTasks } from './tasks.ts';
import { migrationSql } from './questions.ts';

export const reflectionMigrations=[
 {id:'reflection/001-questions',sql:migrationSql},
 {id:'reflection/002-proposals-comparisons',sql:readFileSync(new URL('../../db/migrations/reflection/002_proposals_comparisons.sql',import.meta.url),'utf8')}
];
let tasksRegistered=false;
export default defineFeature({
 id:'reflection',migrations:reflectionMigrations,
 register(api,services) {
  if(!tasksRegistered){registerReflectionTasks();tasksRegistered=true;}
  const service=(c:any)=>createReflectionService(c.get('db'),{transaction:services.transaction});
  const output=(c:any,data:any,status=200)=>{if(data.version)c.header('ETag','"'+data.version+'"');return c.json({data},status);};
  const mutate=(c:any,input:any,execute:()=>StoredResult,replay:(r:StoredResult)=>StoredResult)=>{
    const result=idempotentMutation(c.get('db'),{context:c.get('context'),operation:c.req.method+' '+c.req.path,key:idempotencyKey(c.req.header('Idempotency-Key')),input},{execute,replay});
    return c.body(JSON.stringify(result.body),result.status as ContentfulStatusCode,{'Content-Type':'application/json',...result.headers});
  };
  api.get('/reflection/questions',c=>c.json(service(c).listQuestions(c.get('context'),c.get('input').query)));
  api.get('/reflection/questions/:questionId',c=>output(c,service(c).getQuestion(c.get('context'),c.req.param('questionId'))));
  api.patch('/reflection/questions/:questionId',c=>output(c,service(c).updateQuestion(c.get('context'),c.req.param('questionId'),expectedVersion(c.req.header('If-Match')),c.get('input').body as any)));
  api.post('/reflection/questions',async c=>{
    const s=service(c),context=c.get('context'),input=c.get('input').body as any;
    const q=await s.questionFromRun(context,input);
    const result=(id:string):StoredResult=>{const data=s.getQuestion(context,id);return{status:200,body:{data},headers:{ETag:'"'+data.version+'"'},resource:{type:'reflection-question',id:data.id}};};
    return mutate(c,input,()=>result(q.id),r=>result(r.resource!.id));
  });
  api.post('/reflection/comparisons',c=>{
    const s=service(c),context=c.get('context'),input=c.get('input').body as any;
    return mutate(c,input,()=>{const data=s.saveComparison(context,input);return{status:201,body:{data},headers:{ETag:'"'+data.version+'"'},resource:{type:'reflection-comparison',id:data.id}};},
      r=>{const data=s.getComparison(context,r.resource!.id);return{status:200,body:{data},headers:{ETag:'"'+data.version+'"'}};});
  });
  api.get('/reflection/comparisons/:comparisonId',c=>output(c,service(c).getComparison(c.get('context'),c.req.param('comparisonId'))));
  api.patch('/reflection/comparisons/:comparisonId',c=>output(c,service(c).saveComparison(c.get('context'),{...(c.get('input').body as any),id:c.req.param('comparisonId')},expectedVersion(c.req.header('If-Match')))));
  api.post('/reflection/adoptions',async c=>{
    const s=service(c),context=c.get('context'),input=c.get('input').body as any;
    const version=c.req.header('If-Match')?expectedVersion(c.req.header('If-Match')):null;
    let prepared:any,preparationError:unknown;
    try{prepared=await s.prepareAdoption(context,input);}catch(error){preparationError=error;}
    const result=():StoredResult=>{if(preparationError)throw preparationError;const data=s.adopt(context,input,version,prepared);return{status:200,body:{data},headers:{ETag:'"'+data.version+'"'},resource:{type:'record',id:data.id}};};
    // Replay resolves the completed proposal and current destination again; it never returns a stale response body.
    return mutate(c,{input,version},result,r=>{const data=s.getSavedRecord(context,r.resource!.id);return{status:200,body:{data},headers:{ETag:'"'+data.version+'"'}};});
  });
 }
});

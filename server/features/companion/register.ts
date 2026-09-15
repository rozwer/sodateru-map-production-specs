import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Context,Handler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { defineFeature } from '../../core/features.ts';
import type { CoreEnv } from '../../core/context.ts';
import { CommonError,expectedVersion,requireVersion } from '../../core/errors.ts';
import { idempotentMutation,type StoredResult } from '../../core/idempotency.ts';
import { CompanionRepository,CompanionFailure,type DraftInput,type SettingsInput } from './repository.ts';
import { GenerationRepository } from './generations.ts';
import { GenerationService,type CompanionProvider } from './generation-service.ts';
import { inspectPetZip,decodeReferenceImage } from './package.ts';
import { MAX_ZIP_BYTES } from './package-format.ts';

type C=Context<CoreEnv>;
const statuses:Record<string,number>={NOT_FOUND:404,INVALID_CURSOR:400,VERSION_CONFLICT:412,VERSION_REQUIRED:428,PREVIEW_REQUIRED:409,GENERATION_BUSY:409,GENERATION_ADOPTION_REQUIRED:409,GENERATION_NOT_READY:409,GENERATION_TERMINAL:409,PROVIDER_NOT_CONNECTED:503,ZIP_SIZE_INVALID:413,ZIP_EXPANDED_SIZE_INVALID:413};
function guarded(fn:(c:C)=>Response|Promise<Response>):Handler<CoreEnv>{
  return async c=>{try{return await fn(c);}catch(error){
    if(error instanceof CompanionFailure){
      const status=statuses[error.code]??422;
      const code=status===413?'PAYLOAD_TOO_LARGE':status===422?'VALIDATION_FAILED':status===409?'STATE_CONFLICT':status===503?'PROVIDER_UNAVAILABLE':status===400?'INVALID_REQUEST':error.code;
      const message=status===413?'相棒ファイルのサイズが上限を超えています。':status===422?'相棒ファイルの形式や入力内容を確認してください。':error.code==='PREVIEW_REQUIRED'?'すべての動作を確認してから登録してください。':error.message;
      throw new CommonError(code,message,false,{fields:[{path:'companion',reason:error.code}]},status);
    }
    throw error;
  }};
}
const repo=(c:C)=>new CompanionRepository(c.get('db'),c.get('context').personId);
const jobs=(c:C)=>new GenerationRepository(c.get('db'),c.get('context').personId);
const body=<T>(c:C)=>c.get('input').body as T;
const version=(c:C)=>expectedVersion(c.req.header('If-Match'));
function single(c:C,data:any,status:ContentfulStatusCode=200,location?:string){
  if(typeof data?.version==='number')c.header('ETag',`"${data.version}"`);
  else if(typeof data?.companion?.version==='number')c.header('ETag',`"${data.companion.version}"`);
  if(location)c.header('Location',location);
  return c.body(JSON.stringify({data}),status,{'Content-Type':'application/json'});
}
function mutation(c:C,input:unknown,execute:()=>{data:any;id:string;location?:string},replay:(id:string)=>any,status=200):StoredResult {
  return idempotentMutation(c.get('db'),{context:c.get('context'),operation:`${c.req.method} ${c.req.path}`,key:c.req.header('Idempotency-Key')!,input:{body:input,ifMatch:c.req.header('If-Match')??null}}, {
    execute(){const result=execute();return {status,body:result.data,headers:result.location?{Location:result.location}:undefined,resource:{type:'companion',id:result.id}};},
    replay(result){return {status:200,body:replay(result.resource!.id),headers:result.headers};},
  });
}
const response=(c:C,r:StoredResult)=>single(c,r.body,r.status as ContentfulStatusCode,r.headers?.Location);
async function upload(c:C){
  if(!/^multipart\/form-data(?:;|$)/i.test(c.req.header('Content-Type')??''))throw new CommonError('UNSUPPORTED_MEDIA_TYPE','fileをmultipart/form-dataで送信してください。');
  let parsed:Record<string,unknown>;
  try{parsed=await c.req.parseBody({all:true});}catch{throw new CommonError('INVALID_REQUEST','ファイルを読み取れません。');}
  if(Object.keys(parsed).length!==1 || !(parsed.file instanceof File))throw new CommonError('VALIDATION_FAILED','fileを1件だけ指定してください。');
  if(parsed.file.size<1 || parsed.file.size>MAX_ZIP_BYTES)throw new CommonError('PAYLOAD_TOO_LARGE','ファイルは1〜50,000,000 bytesです。');
  const bytes=new Uint8Array(await parsed.file.arrayBuffer());
  return {bytes,hash:createHash('sha256').update(bytes).digest('hex')};
}

export function createCompanionFeature(options:{provider?:CompanionProvider|null}={}){
  return defineFeature({
    id:'companion',
    migrations:[{id:'companion/001-storage',sql:readFileSync(new URL('../../db/migrations/companion/001-companion.sql',import.meta.url),'utf8')}],
    register(api,services){
      const generation=new GenerationService(options.provider??null,inspectPetZip,services.transaction);
      const maxBody=bodyLimit({maxSize:MAX_ZIP_BYTES+65_536,onError:()=>{throw new CommonError('PAYLOAD_TOO_LARGE','ファイルは50MBまでです。');}});
      api.post('/companion/imports',maxBody,guarded(async c=>{
        const file=await upload(c),inspected=await inspectPetZip(file.bytes),r=repo(c);
        return response(c,mutation(c,{sha256:file.hash},()=>{const data=r.saveInspectedImport(inspected);return {data,id:data.id,location:`/api/v1/companion/imports/${data.id}`};},id=>r.getImport(id),201));
      }));
      api.get('/companion/imports/:importId',guarded(c=>single(c,repo(c).getImport(c.req.param('importId')))));
      api.get('/companion/imports/:importId/atlas',guarded(c=>{const item=repo(c).importMedia(c.req.param('importId'),'atlas');return c.body(Buffer.from(item.bytes),200,{'Content-Type':item.mime});}));
      api.patch('/companion/imports/:importId/confirmation',guarded(c=>{
        const input=body<{actions:string[]}>(c),r=repo(c),id=c.req.param('importId');
        if(new Set(input.actions).size!==input.actions.length)throw new CommonError('VALIDATION_FAILED','確認動作が重複しています。');
        const actions=[...input.actions].sort();
        return response(c,mutation(c,{actions},()=>({data:r.confirmImport(id,version(c),actions),id}),()=>r.getImport(id)));
      }));
      api.post('/companion/imports/:importId/registration',guarded(c=>{
        const input=body<{selectCurrent:boolean;settingsVersion?:number|null}>(c),r=repo(c),importId=c.req.param('importId');
        return response(c,mutation(c,input,()=>{
          requireVersion(r.getImport(importId).version,version(c));
          const companion=r.registerImport(importId);
          if(input.selectCurrent){if(!Number.isSafeInteger(input.settingsVersion))throw new CommonError('VERSION_REQUIRED','現在選択の設定versionが必要です。');r.updateSettings(input.settingsVersion!,{selectedCompanionId:companion.id});}
          return {data:{companion,settings:r.getSettings()},id:companion.id,location:`/api/v1/companions/${companion.id}`};
        },id=>({companion:r.getCompanion(id),settings:r.getSettings()}),201));
      }));
      api.get('/companions',guarded(c=>c.json(repo(c).page('companions',(c.get('input').query.cursor as string)??null,c.get('input').query.limit as number|undefined))));
      api.get('/companions/:companionId',guarded(c=>single(c,repo(c).getCompanion(c.req.param('companionId')))));
      api.get('/companion/settings',guarded(c=>single(c,repo(c).getSettings())));
      api.patch('/companion/settings',guarded(c=>{const r=repo(c),input=body<Partial<SettingsInput>>(c);return response(c,mutation(c,input,()=>({data:r.updateSettings(version(c),input),id:r.personId}),()=>r.getSettings()));}));
      api.post('/companion/drafts',guarded(c=>{const r=repo(c),input=body<DraftInput>(c);return response(c,mutation(c,input,()=>{const data=r.createDraft(input);return {data,id:data.id,location:`/api/v1/companion/drafts/${data.id}`};},id=>r.getDraft(id),201));}));
      api.get('/companion/drafts',guarded(c=>c.json(repo(c).page('drafts',(c.get('input').query.cursor as string)??null,c.get('input').query.limit as number|undefined))));
      api.get('/companion/drafts/:draftId',guarded(c=>single(c,repo(c).getDraft(c.req.param('draftId')))));
      api.patch('/companion/drafts/:draftId',guarded(c=>{const r=repo(c),id=c.req.param('draftId'),input=body<Partial<DraftInput>>(c);return response(c,mutation(c,input,()=>({data:r.updateDraft(id,version(c),input),id}),()=>r.getDraft(id)));}));
      api.get('/companion/drafts/:draftId/instructions',guarded(c=>single(c,repo(c).exportInstructions(c.req.param('draftId')))));
      api.post('/companion/reference-images',maxBody,guarded(async c=>{
        const file=await upload(c),decoded=await decodeReferenceImage(file.bytes),r=repo(c);
        const read=(id:string)=>{const media=r.getReferenceImage(id);return {id,mime:media.mime,byteLength:media.bytes.length,url:`/api/v1/companion/reference-images/${id}`};};
        return response(c,mutation(c,{sha256:file.hash},()=>{const data=r.saveReferenceImage(file.bytes,decoded.mime);return {data,id:data.id,location:data.url};},read,201));
      }));
      api.get('/companion/reference-images/:mediaId',guarded(c=>{const item=repo(c).getReferenceImage(c.req.param('mediaId'));return c.body(item.bytes,200,{'Content-Type':item.mime});}));
      api.get('/companion/provider',guarded(c=>single(c,generation.status())));
      api.post('/companion/generations',guarded(c=>{
        if(!generation.provider)throw new CommonError('PROVIDER_UNAVAILABLE','生成先が未接続です。下書きと制作指示を保存できます。');
        const input=body<{draftId:string;draftVersion:number}>(c),j=jobs(c);let started:string|null=null;
        const result=mutation(c,input,()=>{const data=j.create(input.draftId,input.draftVersion,generation.provider!.id);started=data.id;return {data,id:data.id,location:`/api/v1/companion/generations/${data.id}`};},id=>j.get(id),202);
        if(started)void generation.run(j,started);
        return response(c,result);
      }));
      api.get('/companion/generations',guarded(c=>{const r=repo(c),j=jobs(c),page=r.page('generations',(c.get('input').query.cursor as string)??null,c.get('input').query.limit as number|undefined);return c.json({...page,items:page.items.map(i=>j.get(String(i.id)))});}));
      api.get('/companion/generations/:generationId',guarded(c=>single(c,jobs(c).get(c.req.param('generationId')))));
      api.post('/companion/generations/:generationId/refresh',guarded(async c=>{
        const j=jobs(c),id=c.req.param('generationId');let fresh=false;
        const result=mutation(c,null,()=>{const data=j.get(id);requireVersion(data.version,version(c));fresh=true;return {data,id};},()=>j.get(id));
        if(fresh){try{result.body=await generation.refresh(j,id);}catch{result.body=j.get(id);}}
        return response(c,result);
      }));
      api.post('/companion/generations/:generationId/cancellation',guarded(async c=>{
        const j=jobs(c),id=c.req.param('generationId');let fresh=false;
        const result=mutation(c,null,()=>{const data=j.cancel(id,version(c));fresh=true;return {data,id};},()=>j.get(id));
        if(fresh)result.body=await generation.cancelRemote(j,id);
        return response(c,result);
      }));
      api.post('/companion/generations/:generationId/adoption',guarded(c=>{const j=jobs(c),id=c.req.param('generationId');return response(c,mutation(c,null,()=>{const data=j.adopt(id,version(c));return {data,id:data.id,location:`/api/v1/companions/${data.id}`};},petId=>j.pets.getCompanion(petId),201));}));
    },
  });
}
export default createCompanionFeature();

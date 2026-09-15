import { collectAgentMessage } from './ephemeral-output.ts';
import { Codex } from '@openai/codex-sdk';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { ProviderInput } from './types.ts';
import { aiError } from './errors.ts';
import { canonicalHash, dependencies } from './registry.ts';
const require=createRequire(import.meta.url);
const cli=()=>join(dirname(require.resolve('@openai/codex/package.json')),'bin/codex.js');
export function getAiConfiguration(task='consult'){
 const model=dependencies.model(task);if(!model)throw aiError('PROVIDER_UNAVAILABLE','AIモデルが未設定です',true);
 const promptVersion='common-ai-v1';
 return {model,promptVersion,configurationVersion:canonicalHash({model,promptVersion}),timeoutMs:180000};
}
async function loggedIn(signal:AbortSignal) {
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(process.execPath,[cli(),'login','status'],{stdio:['ignore','pipe','pipe'],signal});
  let settled=false;
  const timer=setTimeout(()=>child.kill('SIGTERM'),10000);
  const done=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();};
  child.on('error',()=>done(aiError('PROVIDER_UNAVAILABLE','Codex認証状態を確認できません',true)));
  child.on('close',code=>done(code===0?undefined:aiError('PROVIDER_UNAVAILABLE','Codexへログインしてください',true)));
  // Consume without logging authentication output.
  child.stdout?.resume();child.stderr?.resume();
 });
}
async function workspace(task:string){
 const root=resolve(process.env.CODEX_AI_WORKDIR_ROOT||'.local/codex-ai');
 await mkdir(root,{recursive:true});return mkdtemp(join(root,task.replace(/[^a-zA-Z0-9_-]/g,'_')+'-'));
}
function parseOutput(text:string):unknown{
 if(Buffer.byteLength(text)>256*1024)throw aiError('OUTPUT_INVALID','AI応答が256KiBを超えました',true);
 try{return JSON.parse(text);}catch{throw aiError('OUTPUT_INVALID','AI応答がJSONではありません',true);}
}
export async function runStructured(input:ProviderInput):Promise<unknown>{
 if(!input.model?.trim())throw aiError('PROVIDER_UNAVAILABLE','AIモデルが未設定です',true);
 const timeout=AbortSignal.timeout(Math.max(1,Math.min(180000,(input.deadline??Date.now()+180000)-Date.now())));
 const signal=AbortSignal.any([input.signal,timeout]);await loggedIn(signal);
 const directory=await workspace(input.task??'run');
 try{
  const sdk=new Codex({config:{features:{shell_tool:false}}});
  const thread=sdk.startThread({model:input.model,workingDirectory:directory,skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',networkAccessEnabled:false,webSearchMode:'disabled'});
  const result=await thread.run(input.prompt,{outputSchema:input.schema,signal});
  return parseOutput(result.finalResponse);
 }catch(e){if(timeout.aborted)throw aiError('TIMEOUT','AI実行の期限を超えました',true);if(input.signal.aborted)throw aiError('CANCELLED','AI実行を取り消しました',true);throw e;}
 finally{await rm(directory,{recursive:true,force:true});}
}
export async function runEphemeral(input:ProviderInput):Promise<unknown>{
 if(!input.model?.trim())throw aiError('PROVIDER_UNAVAILABLE','AIモデルが未設定です',true);
 const timeout=AbortSignal.timeout(Math.max(1,Math.min(180000,(input.deadline??Date.now()+180000)-Date.now())));
 const signal=AbortSignal.any([input.signal,timeout]);await loggedIn(signal);
 const directory=await workspace(input.task??'consult'),schemaPath=join(directory,'schema.json');
 try{
  await writeFile(schemaPath,JSON.stringify(input.schema));
  const child=spawn(process.execPath,[cli(),'exec','--ephemeral','--json','--skip-git-repo-check','-s','read-only','--model',input.model,'--output-schema',schemaPath,'-c','features.shell_tool=false','-c','web_search="disabled"','-c','sandbox_workspace_write.network_access=false','-'],{cwd:directory,stdio:['pipe','pipe','pipe'],signal});
  const completion=new Promise<number|null>((resolve,reject)=>{
   child.on('error',()=>reject(aiError(signal.aborted?(timeout.aborted?'TIMEOUT':'CANCELLED'):'UPSTREAM_FAILED','一時AI実行を完了できませんでした',true)));
   child.on('close',resolve);
  });
  const output=collectAgentMessage(child.stdout).catch(error=>{child.kill('SIGTERM');throw error;});
  child.stderr.resume();child.stdin.on('error',()=>{});child.stdin.end(input.prompt);
  const [text,code]=await Promise.all([output,completion]);
  if(code!==0)throw aiError(timeout.aborted?'TIMEOUT':signal.aborted?'CANCELLED':'UPSTREAM_FAILED','一時AI実行を完了できませんでした',true);
  return parseOutput(text);
 }finally{await rm(directory,{recursive:true,force:true});}
}

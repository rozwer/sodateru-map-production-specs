// Read the actual catalog and version history through the unchanged product main.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const dir=mkdtempSync(join(tmpdir(),'plugins-versions-'));
const child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:root,env:{...process.env,SODATERU_PORT:'0',SODATERU_DB_PATH:join(dir,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(dir,'demo.sqlite'),SODATERU_PROFILES_PATH:join(dir,'profiles.json')},stdio:['ignore','pipe','pipe']});
try{
 const origin=await new Promise((resolve,reject)=>{
  let out='',err='';const timer=setTimeout(()=>reject(new Error('Startup timeout: '+err)),30000);
  child.stderr.on('data',b=>{err+=b;});
  child.once('exit',code=>{clearTimeout(timer);reject(new Error('main exited '+code+': '+err));});
  child.once('error',e=>{clearTimeout(timer);reject(e);});
  child.stdout.on('data',b=>{out+=b;for(const line of out.split('\n'))if(line.startsWith('{')){const event=JSON.parse(line);if(event.event==='ready'){clearTimeout(timer);resolve(event.origin);return;}}});
 });
 let cookie='';const steps=[];
 async function api(path,body){
  const headers={'X-Request-Id':randomUUID(),'X-Data-Mode':'demo',Cookie:cookie};
  if(body){headers['Content-Type']='application/json';headers['Idempotency-Key']=randomUUID();}
  const response=await fetch(origin+'/api/v1'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
  const result=await response.json();steps.push({path,status:response.status});assert.ok(response.ok,JSON.stringify(result));return result;
 }
 await api('/session',{profileKey:'self'});
 const catalog=await api('/plugins'),plugins=[];
 for(const id of ['bike','disaster','pilgrimage']){
  const published=await api('/plugins/'+id+'/versions');
  const current=catalog.items.find(item=>item.id===id);assert.ok(current);
  plugins.push({id,catalogVersion:current.pluginVersion,versions:published.items});
 }
 const report={checkedAt:new Date().toISOString(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),entrypoint:'server/app/main.ts',steps,plugins,updateRollbackAvailable:plugins.some(p=>p.versions.length>1)};
 writeFileSync(new URL('./published-releases.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({versions:plugins.map(p=>({id:p.id,versions:p.versions.map(v=>v.pluginVersion)})),updateRollbackAvailable:report.updateRollbackAvailable}));
}finally{if(child.exitCode===null){const closed=once(child,'exit');child.kill('SIGTERM');await closed;}}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const wrapper=fileURLToPath(new URL('./issue_router.mjs',import.meta.url));
async function fixture(t,origin=true){
 const dir=await mkdtemp(path.join(tmpdir(),'router-scope-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 execFileSync('git',['init','--quiet',dir]);
 if(origin)execFileSync('git',['-C',dir,'remote','add','origin','git@github.com:owner/this-repo.git']);
 const root=path.join(dir,'.git/issue-router');
 const run=(...args)=>execFileSync(process.execPath,['--input-type=module','-e',`import {projectMain} from ${JSON.stringify(wrapper)}; await projectMain(${JSON.stringify(args)},${JSON.stringify(dir)});`],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,ISSUE_ROUTER_HOME:'/unused-global-router',CODEX_THREAD_ID:'thread-testing'}});
 return {dir,root,run};
}
test('missing origin refuses registration and init; no rehearsal fallback',async t=>{
 const {run}=await fixture(t,false);
 assert.throws(()=>run('init','--repo','owner/other-repo'),/Set this repository GitHub origin/);
 assert.deepEqual(JSON.parse(run('status')),{routes:[],deliveries:[]});
});
test('other repository and root overrides are rejected before network access',async t=>{
 const {run}=await fixture(t);
 assert.throws(()=>run('init','--repo','owner/other-repo'),/must match this repository/);
 assert.throws(()=>run('status','--root','/unused-other-router'),/overrides are not allowed/);
});
test('registration uses only clone-local storage and rejects foreign config',async t=>{
 const {run,root}=await fixture(t);await mkdir(root,{recursive:true});
 const config=path.join(root,'config.json');
 await writeFile(config,JSON.stringify({login:'alice',repos:{'owner/this-repo':{senders:['alice']}}}));
 run('register','--issue','1');
 assert.equal(JSON.parse(await readFile(path.join(root,'routes/owner/this-repo/1/thread-testing.json'))).repo,'owner/this-repo');
 await writeFile(config,JSON.stringify({login:'alice',repos:{'owner/other-repo':{senders:['alice']}}}));
 assert.throws(()=>run('pending'),/does not match this repository/);
});
test('relay calls the scoped wrapper without global root overrides',async t=>{
 const {run}=await fixture(t);const prompt=run('relay-prompt');
 assert.ok(prompt.includes(wrapper));assert.ok(!prompt.includes('--root'));
 assert.ok(!prompt.includes('vendor/codex-issue-router/bin/router.mjs'));
});

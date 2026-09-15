import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Store, atomicJSON } from '../src/store.mjs';
const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/router.mjs',import.meta.url));
async function fixture(t) {
 const root=await mkdtemp(path.join(tmpdir(),'router-cli-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const s=new Store(root); const r={repo:'owner/repo',issue:1,threadId:'thread-123',registeredAt:'2026-01-01T00:00:00Z'};
 await atomicJSON(s.configPath(),{login:'alice',repos:{'owner/repo':{senders:['bob']}},reaction:false});await atomicJSON(s.routePath(r),r);
 const d={key:'test-key',...r,route:r,commentId:10,author:'bob',body:'@alice Codex: hello',createdAt:'2026-09-15T00:00:00Z',url:'https://github.com/owner/repo/issues/1',state:'pending'};await s.putDelivery(d);
 const run=async(...args)=>JSON.parse((await exec(process.execPath,[cli,...args,'--root',root])).stdout);
 return {s,r,d,run};
}
test('actual Desktop CLI begin -> sent; restart and repeated begin cannot redeliver',async t=>{
 const {run}=await fixture(t);assert.equal((await run('pending')).length,1);
 assert.equal((await run('begin','--key','test-key')).threadId,'thread-123');
 await assert.rejects(run('begin','--key','test-key'),/Already claimed/);
 await run('sent','--key','test-key','--receipt','Desktop accepted');
 assert.deepEqual(await run('pending'),[]);
 await assert.rejects(run('retry','--key','test-key'),/Only uncertain/);
});
test('actual Desktop CLI retains interrupted delivery and requires explicit retry',async t=>{
 const {run}=await fixture(t);await run('begin','--key','test-key');assert.deepEqual(await run('pending'),[]);
 assert.equal((await run('status')).deliveries[0].state,'dispatching');
 await run('failed','--key','test-key','--receipt','Disconnected after submission');
 assert.deepEqual(await run('pending'),[]);
 await run('retry','--key','test-key');assert.equal((await run('pending')).length,1);
});
test('unregistration prevents queued Desktop delivery',async t=>{
 const {s,r,run}=await fixture(t);await s.unregister(r);assert.deepEqual(await run('pending'),[]);
 await assert.rejects(run('begin','--key','test-key'),/Route changed/);
});
test('registration is offline, independent of watcher lock and unrelated broken routes; repeat has no write',async t=>{
 const {s}=await fixture(t);
 const r={repo:'owner/repo',issue:77,threadId:'thread-offline'};
 // An unreadable unrelated route would fail any whole-store scan.
 await atomicJSON(path.join(s.root,'routes','other','repo','8','broken.json'),{});
 const unlock=await s.lock();
 const args=[cli,'register','--repo',r.repo,'--issue',String(r.issue),'--root',s.root];
 // No gh or other executable can be found; node is invoked via absolute path.
 const env={...process.env,PATH:path.join(s.root,'no-executables'),CODEX_THREAD_ID:r.threadId};
 await exec(process.execPath,args,{env});
 const before=await stat(s.routePath(r),{bigint:true});
 await exec(process.execPath,args,{env});
 const after=await stat(s.routePath(r),{bigint:true});
 assert.equal(before.mtimeNs,after.mtimeNs);assert.equal(before.ino,after.ino);
 assert.deepEqual(await readdir(path.dirname(s.routePath(r))),[r.threadId+'.json']);
 assert.equal((await s.routesForIssue(r.repo,r.issue)).length,1);
 await assert.rejects(exec(process.execPath,[...args,'--thread','thread-conflict'],{env}),/Issue already registered/);
 await unlock();
});

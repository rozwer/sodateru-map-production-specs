// Disposable offline measurement; never uses the user's router state or GitHub.
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Store, atomicJSON } from '../src/store.mjs';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/router.mjs', import.meta.url));
const root = await mkdtemp(path.join(tmpdir(), 'router-bench-'));
const store = new Store(root);
const count = Number(process.env.BENCH_SAMPLES || 50);
if (!Number.isSafeInteger(count) || count < 1 || count > 1000) throw Error('Invalid BENCH_SAMPLES');
const summary = times => {
  const xs = times.toSorted((a,b) => a-b);
  return { samples: xs.length, medianMs: +xs[Math.floor(xs.length/2)].toFixed(2), p95Ms: +xs[Math.ceil(xs.length*0.95)-1].toFixed(2), maxMs: +xs.at(-1).toFixed(2) };
};
try {
  await atomicJSON(store.configPath(), {login:'offline',repos:{'owner/repo':{senders:['offline']}}});
  const env = {...process.env, PATH:path.join(root,'no-executables'), CODEX_THREAD_ID:'thread-benchmark'};
  const results=[];
  for (const existing of [0,1000]) {
    for (let i=1;i<=existing;i++) await store.register({repo:'owner/repo',issue:i,threadId:'thread-existing',hostId:'local'});
    for (const kind of ['first','repeat']) {
      const times=[];
      for (let i=0;i<count+5;i++) {
        const issue=10000+i;
        const start=performance.now();
        await exec(process.execPath,[cli,'register','--repo','owner/repo','--issue',String(issue),'--root',root],{env});
        if(i>=5) times.push(performance.now()-start);
      }
      results.push({existingUnrelatedRoutes:existing,kind,...summary(times)});
    }
    for(let i=0;i<count+5;i++) await store.unregister({repo:'owner/repo',issue:10000+i,threadId:env.CODEX_THREAD_ID});
  }
  const r={repo:'owner/repo',issue:99999,threadId:env.CODEX_THREAD_ID,hostId:'local'};
  const writeTimes=[];
  for(let i=0;i<count;i++) {await store.unregister(r).catch(e=>{if(e.code!=='ENOENT')throw e;});const start=performance.now();await store.register(r);writeTimes.push(performance.now()-start);}
  const jsonBytes=(await stat(store.routePath(r))).size;
  console.log(JSON.stringify({node:process.version,platform:process.platform,architecture:process.arch,network:'offline PATH; no gh available',cliIncludingNodeStartup:results,storeWrite:summary(writeTimes),jsonBytes},null,2));
} finally { await rm(root,{recursive:true,force:true}); }

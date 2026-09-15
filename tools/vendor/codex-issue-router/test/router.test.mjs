import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store, atomicJSON, repoName } from '../src/store.mjs';
import { addressedTo, collect, dispatch, deliveryKey } from '../src/router.mjs';

const route = { repo:'owner/repo', issue:123, threadId:'thread-123', registeredAt:'2026-09-01T00:00:00Z' };
const comment = (id, body='@alice Codex: hello', login='bob') => ({ id, body, user:{login}, created_at:'2026-09-15T00:00:00Z', html_url:`https://github.com/owner/repo/issues/123#issuecomment-${id}` });
async function setup(t) {
  const root = await mkdtemp(path.join(tmpdir(),'issue-router-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const s = new Store(root); await atomicJSON(s.configPath(), {login:'alice', repos:{'owner/repo':{senders:['bob']}},reaction:true});
  await atomicJSON(s.routePath(route),route); return s;
}
test('address syntax is exact, case insensitive, outside quotes/code',()=>{
  for (const body of ['@alice Codex: Hi','@ALICE+Codex: Hi','@alice Codex： こんにちは']) assert.equal(addressedTo(body,'alice'),true);
  for (const body of ['@aliceElse Codex: Hi','text @alice Codex: Hi','> @alice Codex: Hi','    @alice Codex: Hi','```\n@alice Codex: Hi\n```','~~~\n@alice Codex: Hi\n~~~','@alice Codex:evil']) assert.equal(addressedTo(body,'alice'),false,body);
});
test('reject traversal in repository keys',()=>{
  for(const value of ['../x','x/..','x/y/z','x/../../a']) assert.throws(()=>repoName(value));
});
test('unauthorized, old and ordinary comments ignored; repeated poll deduplicated',async t=>{
  const s=await setup(t);
  const gh={ comments:async()=>[comment(1),comment(2,'hello'),comment(3,undefined,'outsider'),{...comment(4),created_at:'2020-01-01T00:00:00Z'}] };
  assert.deepEqual(await collect(s,gh),[]); await collect(s,gh);
  assert.equal((await s.deliveries()).length,1);
});
test('comments by receiver himself can be polled without GitHub personal notifications',async t=>{
  const s=await setup(t);await atomicJSON(s.configPath(),{login:'bob',repos:{'owner/repo':{senders:['bob']}}});
  await collect(s,{comments:async()=>[comment(1,'@bob Codex: test')]});
  assert.equal((await s.deliveries()).length,1);
});
test('ambiguous issue routes fail closed',async t=>{
  const s=await setup(t);const other={...route,threadId:'thread-456'};await atomicJSON(s.routePath(other),other);
  assert.equal((await collect(s,{comments:async()=>{throw Error('must not fetch')}})).length,1);
  assert.equal((await s.deliveries()).length,0);
});
test('unavailable receiver keeps pending; failed submission becomes uncertain',async t=>{
  const s=await setup(t);const gh={comments:async()=>[comment(1)],eyes:async()=>{}};
  await collect(s,gh);
  await dispatch(s,gh,{prepare:async()=>{throw Error('offline')}});
  assert.equal((await s.deliveries())[0].state,'pending');
  await dispatch(s,gh,{prepare:async()=>({ready:true}),send:async()=>{throw Error('timeout after send')}});
  assert.equal((await s.deliveries())[0].state,'uncertain');
  await dispatch(s,gh,{prepare:async()=>{throw Error('must not retry')}});
  assert.equal((await s.deliveries())[0].state,'uncertain');
});
test('delivery survives restart; no duplicate even if reaction fails',async t=>{
  const s=await setup(t);let sends=0;
  const gh={comments:async()=>[comment(1)],eyes:async()=>{throw Error('rate limit')}};
  const receiver={prepare:async()=>({ready:true}),send:async()=>{sends++;return {accepted:true}}};
  await collect(s,gh);await dispatch(s,gh,receiver);
  const restarted=new Store(s.root);await collect(restarted,gh);await dispatch(restarted,gh,receiver);
  assert.equal(sends,1);assert.equal((await restarted.deliveries())[0].state,'sent');
});
test('removed route cannot receive pending messages',async t=>{
  const s=await setup(t);const gh={comments:async()=>[comment(1)]};await collect(s,gh);await s.unregister(route);
  await dispatch(s,gh,{prepare:async()=>{throw Error('should not prepare')}});
  assert.equal((await s.deliveries())[0].state,'pending');
});
test('interrupted dispatcher never silently resends',async t=>{
  const s=await setup(t);await collect(s,{comments:async()=>[comment(1)]});const d=await s.delivery(deliveryKey(route,comment(1)));
  await s.putDelivery({...d,state:'dispatching'});await dispatch(s,{},{});
  assert.equal((await s.deliveries())[0].state,'uncertain');
});
test('parallel watchers do not process the same queue',async t=>{
  const s=await setup(t);const unlock=await s.lock();await assert.rejects(s.lock(),/already running/);await unlock();await(await s.lock())();
});

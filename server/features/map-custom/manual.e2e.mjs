// Real HTTP verification. Run against an isolated CORE server/DB, never a user's demo DB.
// prepare saves state; verify runs after restarting that same server/DB.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const base = process.env.MAP_CUSTOM_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
const stateFile = process.env.MAP_CUSTOM_E2E_STATE ?? '/tmp/map-custom-e2e.json';
let cookie = '';
async function api(path, { method='GET', body, version, key, mode='live', status=200 } = {}) {
  const headers = { 'X-Request-Id':randomUUID(), 'X-Data-Mode':mode };
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type']='application/json';
  if (version !== undefined) headers['If-Match']=`"${version}"`;
  if (key || method === 'POST') headers['Idempotency-Key']=key ?? randomUUID();
  const response = await fetch(base+path, {method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text = await response.text();
  const value = text ? JSON.parse(text) : null;
  assert.equal(response.status,status,`${method} ${path}: ${text}`);
  const cookies=response.headers.getSetCookie();
  if(cookies.length) cookie=cookies.map(x=>x.split(';')[0]).join('; ');
  return value;
}
await api('/session', {method:'POST',body:{profileKey:'self'}});
if (process.argv[2] === 'verify') {
  const saved=JSON.parse(readFileSync(stateFile));
  const object=(await api('/map-objects/'+saved.object.id)).data;
  const settings=(await api('/map-settings')).data;
  assert.deepEqual(object,saved.object);
  assert.equal(settings.id,saved.settings.id); assert.equal(settings.version,saved.settings.version);
  assert.deepEqual(settings.style,saved.settings.style); assert.deepEqual(settings.layers,saved.settings.layers);
  await api('/map-objects/'+object.id,{method:'DELETE',version:object.version,status:204});
  await api('/map-objects/'+object.id,{status:404});
  await api('/map-objects',{method:'POST',body:saved.input,key:saved.key,status:404});
  console.log('PASS: restart/retrieval preserves object + settings; delete persists; create replay does not resurrect deleted object');
} else {
  const key=randomUUID();
  const input={name:'待ち合わせ',memo:'手動装飾E2E',color:'blue',size:'small',position:{longitude:139.7671,latitude:35.6812}};
  const created=(await api('/map-objects',{method:'POST',body:input,key,status:201})).data;
  const replay=(await api('/map-objects',{method:'POST',body:input,key,status:201})).data;
  assert.equal(replay.id,created.id);
  assert.equal((await api('/map-objects',{method:'POST',body:{...input,name:'異なる内容'},key,status:409})).error.code,'IDEMPOTENCY_CONFLICT');
  await api('/map-objects',{method:'POST',body:{...input,height:100},key:randomUUID(),status:422});
  await api('/map-objects',{method:'POST',body:{...input,color:'black'},key:randomUUID(),status:422});
  await api('/map-objects',{method:'POST',body:{...input,name:'名'.repeat(21)},key:randomUUID(),status:422});
  const edited=(await api('/map-objects/'+created.id,{method:'PATCH',version:created.version,body:{name:'移動した目印',color:'green',size:'large',position:{longitude:139.77,latitude:35.68}}})).data;
  assert.equal(edited.version,created.version+1);
  assert.equal((await api('/map-objects/'+created.id,{method:'PATCH',version:created.version,body:{memo:'古い版'},status:412})).error.code,'VERSION_CONFLICT');
  await api('/map-objects/'+created.id,{method:'PATCH',body:{memo:'版なし'},status:428});
  const before=(await api('/map-settings')).data;
  const style={...before.style,theme:'faded',lightPreset:'dusk',colors:{water:'#123456',greenspace:'#347856',roads:'#abcdef',buildings:'#987654'}};
  const settings=(await api('/map-settings',{method:'PATCH',version:before.version,body:{style,layers:{...before.layers,bike:true,plugins:{'not-installed':true}}}})).data;
  assert.equal(settings.layers.plugins['not-installed'],true);assert.equal(settings.effectiveLayers.plugins['not-installed'],false);
  assert.deepEqual(settings.style,style);
  await api('/map-settings',{method:'PATCH',version:before.version,body:{style},status:412});
  await api('/map-settings',{method:'PATCH',version:settings.version,body:{style:{...style,colors:{water:'#ffffff'}}},status:422});
  await api('/session',{method:'POST',mode:'demo',body:{profileKey:'self'}});
  await api('/map-objects/'+created.id,{mode:'demo',status:404});
  const demo=(await api('/map-settings',{mode:'demo'})).data;
  assert.notEqual(demo.id,settings.id);
  writeFileSync(stateFile,JSON.stringify({key,input,object:edited,settings},null,2));
  console.log('PASS: real HTTP create/replay/edit/version errors/validation, mode separation, wishes vs effective state. Restart same DB and run verify.');
}

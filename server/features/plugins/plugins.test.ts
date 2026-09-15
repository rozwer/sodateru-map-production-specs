import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginRegistry, PluginService, PluginStore, getPluginState } from './index.ts';
import type { PluginContext, PluginRelease, Settings } from './types.ts';

const context = (personId = 'alice', dataMode: 'live' | 'demo' = 'live'): PluginContext => ({ personId,dataMode,requestId:'test',signal:new AbortController().signal });
const release = (id: string, version = '1.0.0', color = 'red'): PluginRelease => ({
  manifest: { id,name:id,description:'Test fixture only',category:'test',author:'test',pluginVersion:version,updatedAt:1,changeLog:version,icon:'pin',usageInfo:[],sources:[],settingsSchema:{type:'object',properties:{region:{type:'string'},highways:{type:'boolean'}},required:['region','highways'],additionalProperties:false},defaultSettings:{region:'Tokyo',highways:false},trialConditions:['地域','高速道路'] },
  declarations: (settings: Settings) => [{targetKey:'layer:bike',property:'color',value:color},{targetKey:`layer:${id}`,property:'conditions',value:settings}],
  trial: (settings: Settings) => ({dataKind:'mock',label:'模擬データ（試用）',declarations:[],features:[{region:settings.region,highways:settings.highways}],warnings:['未確認道路の走行可否を示しません']}),
});
const migration = readFileSync(new URL('../../db/migrations/plugins/001-plugins.sql',import.meta.url),'utf8');
function open(path: string, fresh = false) {
  const db = new DatabaseSync(path);
  if (fresh) {
    // Minimal pre-migration fixture, not a replacement CORE runtime.
    db.exec("CREATE TABLE plugin_settings(id TEXT PRIMARY KEY); INSERT INTO plugin_settings VALUES('legacy'); CREATE TABLE places(id TEXT); INSERT INTO places VALUES('saved-place'); CREATE TABLE records(id TEXT); INSERT INTO records VALUES('experience');");
    db.exec(migration);
  }
  return db;
}

test('PLUGINS SQLite lifecycle, person/mode isolation and restart', async (t) => {
  const dir=mkdtempSync(join(tmpdir(),'plugins-test-')), livePath=join(dir,'live.sqlite');
  let db=open(livePath,true); const demo=open(join(dir,'demo.sqlite'),true);
  const registry=new PluginRegistry(); registry.register(release('bike')); registry.register(release('same')); registry.register(release('different','1.0.0','blue'));
  let service=new PluginService(new PluginStore(db,context()),registry);
  const values={region:'Tokyo',highways:false};
  const input=(id: string) => ({id,pluginVersion:'1.0.0',settings:values,enabled:true,confirmed:true as const,stateRevision:service.state().revision});
  try {
    await t.test('trial and cancelled/unconfirmed installation write nothing', async () => {
      const before=service.state(); const trial=service.trial('bike','1.0.0',{region:'Kyoto',highways:true});
      assert.equal(trial.preview.dataKind,'mock'); assert.equal(trial.preview.features[0] && (trial.preview.features[0] as any).region,'Kyoto');
      assert.deepEqual(service.state(),before);
      await assert.rejects(service.install({...input('bike'),confirmed:false} as any),{code:'CONFIRMATION_REQUIRED'});
      assert.equal(service.state().items.length,0);
    });
    await t.test('confirmed install survives connection close and reopen; identity/mode remain separate',async()=>{
      const installed=await service.install(input('bike')); assert.equal(installed.version,1);
      db.close(); db=open(livePath); service=new PluginService(new PluginStore(db,context()),registry);
      assert.equal(service.state().items[0].installId,installed.installId);
      assert.deepEqual(service.state().items[0].settings,values);
      assert.equal(getPluginState(db,context('bob')).items.length,0);
      assert.equal(getPluginState(demo,context('alice','demo')).items.length,0);
      const bob=new PluginService(new PluginStore(db,context('bob')),registry);
      await bob.install({...input('bike'),stateRevision:bob.state().revision});
      assert.notEqual(bob.state().plugins[0].ownerKey,service.state().plugins[0].ownerKey);
    });
    await t.test('same values coexist without conflict; different values require a persisted choice',async()=>{
      await service.install(input('same'));
      assert.equal(service.state().conflicts.length,0);
      const trial=service.trial('different','1.0.0',values);
      assert.equal(trial.conflicts.length,1);
      await assert.rejects(service.install(input('different')),{code:'PLUGIN_CONFLICT'});
      const resolution={key:trial.conflicts[0].key,strategy:'prefer' as const,pluginIds:['different']};
      await service.install({...input('different'),resolutions:[resolution]});
      db.close(); db=open(livePath); service=new PluginService(new PluginStore(db,context()),registry);
      assert.deepEqual(service.state().resolutions,[resolution]);
      assert.equal(service.state().appliedDeclarations.filter(d=>d.property==='color').length,1);
      assert.equal(service.state().appliedDeclarations.find(d=>d.property==='color')?.value,'blue');
    });
    await t.test('stale revisions, wrong versions and invalid settings leave saved values unchanged',async()=>{
      const before=service.state(); const item=before.items.find(x=>x.id==='bike')!;
      assert.throws(()=>service.patch('bike',99,{enabled:false}),{code:'VERSION_CONFLICT'});
      assert.throws(()=>service.patch('bike',item.version,{settings:{region:42}}),{code:'VALIDATION_FAILED'});
      await assert.rejects(service.install({...input('bike'),stateRevision:'stale'}),{code:'INPUT_CHANGED'});
      assert.deepEqual(service.state(),before);
    });
    await t.test('update adapter/schema failure preserves the current version; successful update and rollback persist',async()=>{
      registry.register({...release('bike','2.0.0'),prepare:async()=>{throw new Error('adapter unavailable');}});
      let item=service.store.get('bike'); const before=service.state();
      await assert.rejects(service.update('bike',item.version,{confirmed:true,stateRevision:before.revision,pluginVersion:'2.0.0'}),{code:'PLUGIN_PREPARATION_FAILED'});
      assert.deepEqual(service.state(),before);
      registry.register(release('bike','3.0.0'));
      // Disable the competing plugin explicitly before changing the release fingerprint.
      const other=service.store.get('different'); service.patch('different',other.version,{enabled:false});
      item=await service.update('bike',item.version,{confirmed:true,stateRevision:service.state().revision,pluginVersion:'3.0.0'});
      assert.equal(item.pluginVersion,'3.0.0'); assert.equal(item.previousVersion,'1.0.0'); assert.deepEqual(item.settings,values);
      item=service.rollback('bike',item.version,{confirmed:true,stateRevision:service.state().revision});
      assert.equal(item.pluginVersion,'1.0.0'); assert.equal(item.previousVersion,'3.0.0');
      db.close();db=open(livePath);service=new PluginService(new PluginStore(db,context()),registry);
      assert.equal(service.store.get('bike').pluginVersion,'1.0.0');
    });
    await t.test('stopping/removing retains settings, experiences, places and other people',async()=>{
      let item=service.store.get('bike'); item=service.patch('bike',item.version,{enabled:false,icon:'motorcycle'});
      assert.deepEqual(item.settings,values); assert.equal(service.state().plugins.find(p=>p.pluginId==='bike')?.resolvedDeclarations.length,0);
      service.remove('bike',item.version);
      assert.throws(()=>service.store.get('bike'),{code:'NOT_FOUND'});
      assert.deepEqual(service.store.retained('bike')?.settings,values);
      assert.equal(service.store.retained('bike')?.icon,'motorcycle');
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM records').get() as any).n,1);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM places').get() as any).n,1);
      assert.equal(getPluginState(db,context('bob')).items.length,1);
      assert.equal((db.prepare('SELECT id FROM plugin_settings_legacy').get() as any).id,'legacy');
      const reinstall=await service.install({...input('bike'),enabled:false});
      assert.equal(reinstall.installId,item.installId); assert.ok(reinstall.version>item.version);
    });
  } finally { db.close();demo.close();rmSync(dir,{recursive:true,force:true}); }
});

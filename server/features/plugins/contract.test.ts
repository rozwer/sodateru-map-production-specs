import { validateTrialPreview } from './preview.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePluginBody } from './validation.ts';
import { pluginSettingPage } from './pagination.ts';
import type { PluginContext, PluginSetting } from './types.ts';
test('PLUGINS fragment validates confirmation, conflict choice and own fields',()=>{
  const input={id:'bike',pluginVersion:'1.0.0',confirmed:true,stateRevision:'a'.repeat(64),enabled:true,settings:{region:'Tokyo'}};
  assert.deepEqual(validatePluginBody('PluginSettingCreate',input),input);
  assert.throws(()=>validatePluginBody('PluginSettingCreate',{...input,personId:'bob'}),{code:'VALIDATION_FAILED'});
  assert.throws(()=>validatePluginBody('PluginSettingCreate',{...input,confirmed:false}),{code:'VALIDATION_FAILED'});
  assert.throws(()=>validatePluginBody('PluginSettingPatch',{enabled:'false'}),{code:'VALIDATION_FAILED'});
  assert.throws(()=>validatePluginBody('PluginSettingPatch',{resolutions:[{key:'a',strategy:'coexist',pluginIds:['bike','bike']}]}),{code:'VALIDATION_FAILED'});
});
test('PLUGINS list cursor stays bound to person/mode and advances by id',()=>{
  const context:PluginContext={personId:'alice',dataMode:'live',requestId:'contract',signal:new AbortController().signal};
  const items=['a','b','c'].map(id=>({id}) as PluginSetting);
  const first=pluginSettingPage(items,context,{limit:'2'});
  assert.deepEqual(first.items.map(i=>i.id),['a','b']);assert.ok(first.nextCursor);
  assert.deepEqual(pluginSettingPage(items,context,{limit:'2',cursor:first.nextCursor!}).items.map(i=>i.id),['c']);
  assert.throws(()=>pluginSettingPage(items,{...context,personId:'bob'},{cursor:first.nextCursor!}),{code:'INVALID_CURSOR'});
  assert.throws(()=>pluginSettingPage(items,{...context,dataMode:'demo'},{cursor:first.nextCursor!}),{code:'INVALID_CURSOR'});
});

test('trial features require valid geometry, matching legend/source and mock provenance',()=>{
  const preview={dataKind:'mock',label:'試用',declarations:[],features:[{type:'Feature',id:'point',geometry:{type:'Point',coordinates:[139,35]},properties:{kind:'place',label:'模擬地点',legendId:'sample',sourceIds:['mock'],status:'unknown',value:null,unit:null}}],legends:[{id:'sample',label:'模擬',color:'#00aabb',meaning:'実在地点の確認結果ではありません'}],sources:[{id:'mock',title:'模擬データ',url:null,attribution:'試用用',dataKind:'mock',fetchedAt:null,sourceUpdatedAt:null,observedAt:null,issuedAt:null,validAt:null}],generatedAt:1,warnings:[]};
  assert.deepEqual(validateTrialPreview(preview),preview);
  assert.throws(()=>validateTrialPreview({...preview,sources:[]}),{code:'VALIDATION_FAILED'});
  assert.throws(()=>validateTrialPreview({...preview,dataKind:'live'}),{code:'VALIDATION_FAILED'});
  assert.throws(()=>validateTrialPreview({...preview,features:[{...preview.features[0],geometry:{type:'Point',coordinates:[139,100]}}]}),{code:'VALIDATION_FAILED'});
});

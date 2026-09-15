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

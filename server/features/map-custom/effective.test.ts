import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveSettings } from './effective.ts';
import type { MapSettings } from './domain.ts';
import type { PluginState } from '../plugins/types.ts';

const settings: MapSettings = {id:'settings',version:2,createdAt:1,updatedAt:2,
  style:{theme:'default',lightPreset:'day',showPedestrianRoads:true,showAdminBoundaries:false,showIndoor:false,colors:null},
  layers:{themes:true,exploration:true,friends:false,bike:true,plugins:{bike:true,missing:true}}};
const declaration={targetKey:'layer:bike',property:'visibility',value:true,pluginId:'bike',pluginVersion:'1.0.0'};
const state: PluginState={personId:'self',dataMode:'live',revision:'revision-a',items:[],appliedDeclarations:[declaration],conflicts:[],resolutions:[],
  plugins:[{pluginId:'bike',installId:'install-bike',ownerKey:'plugin:install-bike',installedVersion:'1.0.0',version:1,enabled:true,resolvedDeclarations:[declaration]}]};

test('display wishes survive plugin disable/remove/conflict without re-enabling anything',()=>{
  const before=JSON.stringify(settings);
  const enabled=effectiveSettings(settings,state);
  assert.equal(enabled.effectiveLayers.bike,true);
  assert.equal(enabled.pluginDisplays[0].ownerKey,'plugin:install-bike');
  assert.equal(enabled.effectiveLayers.plugins.missing,false);
  for(const plugins of [[],[{...state.plugins[0],enabled:false}],[{...state.plugins[0],resolvedDeclarations:[]}]]){
    const result=effectiveSettings(settings,{...state,revision:'changed',plugins});
    assert.equal(result.effectiveLayers.bike,false);
    assert.equal(result.effectiveLayers.plugins.bike,false);
    assert.equal(result.layers.plugins.bike,true);
    assert.equal(result.pluginSnapshot,'changed');
  }
  assert.equal(JSON.stringify(settings),before);
  assert.equal(state.plugins[0].enabled,true);
});

test('explicit plugin hide wins over the bike display wish',()=>{
  const result=effectiveSettings({...settings,layers:{...settings.layers,plugins:{bike:false}}},state);
  assert.equal(result.effectiveLayers.bike,false);
  assert.equal(result.pluginDisplays[0].visible,false);
  assert.deepEqual(result.pluginDisplays[0].resolvedDeclarations,[]);
});

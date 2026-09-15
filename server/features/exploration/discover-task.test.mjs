import test from 'node:test';import assert from 'node:assert/strict';import {createDiscoverTask}from'./discover-task.mjs';
test('discover task fixes anchor and fact sources and reads current references before prompt',async()=>{
 const task=createDiscoverTask({readAnchor:()=>[{type:'place',id:'p1',version:2}],assertAllowed:()=>{}});
 const input={anchor:{kind:'place',targetId:'p1',features:['白い雲']},factKeys:['jma-cloud-white']};
 const materials=await task.readMaterials({}, {personId:'me',dataMode:'live'},input,{text:'発見したい'});
 assert.equal(materials.sourceRefs[0].version,2);assert.match(task.buildPrompt(materials,{text:'発見したい'}),/general/);
 const result={anchor:input.anchor,bridge:'雲の色',knowledge:'光の散乱',observationPrompt:'空を観察',conceptIds:['cloud'],sources:[materials.context.facts[0].source]};
 task.validateResult(result,materials,{input});
 assert.throws(()=>task.validateResult({...result,anchor:{...input.anchor,targetId:'other'}},materials,{input}),{code:'OUTPUT_INVALID'});
 assert.throws(()=>task.validateResult({...result,sources:[{...result.sources[0],title:'変えたタイトル'}]},materials,{input}),{code:'OUTPUT_INVALID'});
});

test('revoked location/media permission stops prompt construction immediately before external transmission',async()=>{
 let allowed=true;
 const task=createDiscoverTask({readAnchor:()=>[],assertAllowed:()=>{if(!allowed)throw Object.assign(new Error('permission revoked'),{code:'FORBIDDEN'});}});
 const input={anchor:{kind:'photo',targetId:'photo1',features:['白い雲']},factKeys:['jma-cloud-white']};
 const materials=await task.readMaterials({}, {personId:'me',dataMode:'live'},input,{text:'説明'});
 allowed=false;assert.throws(()=>task.buildPrompt(materials,{text:'説明'}),{code:'FORBIDDEN'});
});

test('registered place facts remain place-specific and are included with their current source tuple',async()=>{
 const anchor={kind:'place',targetId:'p1',features:['入口']};
 const fact={factKey:'place-identity-1',text:'登録された名称と住所',conceptIds:['place-identity'],source:{url:'https://www.openstreetmap.org/node/1',title:'場所の取得元',claimScope:'place-specific',sourceId:'p1'},anchor:{kind:'place',targetId:'p1'}};
 const task=createDiscoverTask({readAnchor:()=>[{type:'place',id:'p1',version:3}],assertAllowed:()=>{},readFacts:()=>[fact]});
 const materials=await task.readMaterials({}, {personId:'me',dataMode:'live'}, {anchor,factKeys:[fact.factKey]}, {text:'教えて'});
 assert.equal(materials.context.facts[0].source.claimScope,'place-specific');
 task.validateResult({anchor,bridge:'入口に注目',knowledge:fact.text,observationPrompt:'表札を見てみよう',conceptIds:['place-identity'],sources:[fact.source]},materials);
});

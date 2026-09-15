import test from 'node:test';import assert from 'node:assert/strict';import {resolveDiscoveryFacts,validateDiscoverySources} from './facts.mjs';
const anchor={kind:'building',targetId:'b1',features:['白い雲']};
const general={factKey:'cloud',text:'一般的な説明',conceptIds:['cloud'],source:{url:'https://example.org/cloud',title:'出典',claimScope:'general',sourceId:null},anchor:null};
const specific={...general,factKey:'building',source:{...general.source,claimScope:'place-specific'},anchor:{kind:'building',targetId:'b1'}};
test('fact selection binds place-specific evidence to exact target and rejects invented source tuple',()=>{
 assert.equal(resolveDiscoveryFacts({anchor,factKeys:['cloud','building']},[general,specific]).length,2);
 assert.throws(()=>resolveDiscoveryFacts({anchor:{...anchor,targetId:'b2'},factKeys:['building']},[specific]),{code:'INVALID_INPUT'});
 assert.throws(()=>resolveDiscoveryFacts({anchor,factKeys:['unknown']},[general]),{code:'NOT_FOUND'});
 validateDiscoverySources({anchor,sources:[general.source]},[general]);
 assert.throws(()=>validateDiscoverySources({anchor,sources:[{...general.source,url:'https://invented.example/'}]},[general]),{code:'OUTPUT_INVALID'});
});

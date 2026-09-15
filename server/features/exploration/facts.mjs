import {readFileSync} from 'node:fs';
import {assertInput,fail} from './errors.mjs';
export const discoveryFacts=JSON.parse(readFileSync(new URL('./facts.json',import.meta.url),'utf8'));
const sourceKey=s=>JSON.stringify([s.url,s.title,s.claimScope,s.sourceId]);
const matches=(fact,anchor)=>fact.source.claimScope==='general'?fact.anchor===null:fact.anchor?.kind===anchor.kind&&fact.anchor?.targetId===anchor.targetId;
export function listDiscoveryFacts(anchor,catalog=discoveryFacts){return structuredClone(catalog.filter(f=>matches(f,anchor)));}
export function resolveDiscoveryFacts({anchor,factKeys},catalog=discoveryFacts){
 assertInput(anchor&&['place','building','photo'].includes(anchor.kind)&&typeof anchor.targetId==='string','観察対象が不正です');
 assertInput(Array.isArray(factKeys)&&factKeys.length<=50&&new Set(factKeys).size===factKeys.length,'根拠キーが不正です');
 return factKeys.map(key=>{
  const fact=catalog.find(f=>f.factKey===key);if(!fact)fail('NOT_FOUND','指定した根拠がありません');
  if(!matches(fact,anchor))fail('INVALID_INPUT','別の対象の事実は利用できません');
  return structuredClone(fact);
 });
}
export function validateDiscoverySources(result,facts){
 const allowed=new Set(facts.filter(f=>matches(f,result.anchor)).map(f=>sourceKey(f.source)));
 if(!Array.isArray(result.sources)||result.sources.some(s=>!allowed.has(sourceKey(s))))fail('OUTPUT_INVALID','取得した出典の完全な組だけを使ってください');
 if(new Set(result.sources.map(sourceKey)).size!==result.sources.length)fail('OUTPUT_INVALID','出典が重複しています');
 return result;
}

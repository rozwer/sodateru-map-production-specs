import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const schema=read(path.join(root,'page.schema.json'));
const validate=new Ajv({allErrors:true}).compile(schema);
const componentTypes=read(path.join(root,'component-types.json'));
const validateComponents=new Ajv({allErrors:true}).compile(read(path.join(root,'component.schema.json')));
const api=read(path.join(root,'../04_api/openapi.json')); 
const operations=new Map();
for(const [url,item] of Object.entries(api.paths)) for(const [method,o] of Object.entries(item)) if(o.operationId) operations.set(o.operationId,{url,method,o});
const dirs=fs.readdirSync(root).filter(d=>fs.existsSync(path.join(root,d,'page.json')));
const ids=new Set(dirs), common=read(path.join(root,'common.json'));
const gaps=read(path.join(root,'api-gaps.json')).items;
const gapIds=new Set(gaps.map(g=>g.id));
const catalog=read(path.join(root,'references/catalog.json'));
const keyed=xs=>{const m=new Map(xs.map(x=>[x.id,x]));assert.equal(xs.length,m.size,'ID重複');return m;};
let controls=0,requirements=0,cases=0,components=0;
for(const d of dirs){
 try{
  const base=path.join(root,d),p=read(path.join(base,'page.json'));
  assert(validate(p),JSON.stringify(validate.errors));assert.equal(p.id,d);
  const parts=Object.fromEntries(Object.entries(p.files).map(([k,f])=>{assert.equal(path.basename(f),f);return[k,read(path.join(base,f))];}));
  const c=keyed(parts.components),states=keyed(parts.states),actions=keyed(parts.interactions),rs=keyed(parts.requirements),cs=keyed(parts.acceptance);
  assert.equal(new Set(parts.components.map(x=>x.testId)).size,c.size,'testId重複');
  assert(validateComponents(parts.components),JSON.stringify(validateComponents.errors));
  for(const part of c.values()){
   const m=part.implementation;
   if(typeof m.valueFrom==='string')assert(!/references\/|data:image|\.png$|\.webp$/.test(m.valueFrom),'画面画像を値の取得元にできない');
   if(m.type==='group'){
    assert(m.children.length,'内部未分割のgroup');
    for(const id of m.children){assert(c.has(id),`子要素不明 ${id}`);assert.notEqual(id,part.id);}
   }
   if(part.parent)assert(c.get(part.parent)?.implementation.children?.includes(part.id),'親子関係の不一致');
   if(m.type==='list'){
    assert(componentTypes.templates[m.template],`項目template不明 ${m.template}`);
    assert.equal(m.variableLength,true,'件数固定の一覧');
    assert(m.itemKey && m.itemsFrom);
   }
   if(m.counterFor)assert(['text-input','textarea'].includes(c.get(m.counterFor)?.implementation.type),'カウンターの入力先不明');
   if(m.placement){
    const host=c.get(m.placement.in);assert(host,'配置先不明');
    if(m.placement.slot==='item-control')assert(host.implementation.itemControls?.includes(part.id),'繰返し操作の対応なし');
    if(m.placement.slot==='map-marker'||m.placement.slot==='map-gesture')assert.equal(host.implementation.type,'map');
   }
   for(const id of m.itemControls??[])assert.equal(c.get(id)?.implementation.placement?.in,part.id,'項目操作の配置先不一致');
   if(m.type==='choice-group')assert(m.options.length || m.optionsFrom,'選択肢の指定なし');
  }
  const visit=(id,parents=new Set())=>{
   assert(!parents.has(id),'コンポーネントの親子循環');
   for(const child of c.get(id).implementation.type==='group'?c.get(id).implementation.children:[])visit(child,new Set([...parents,id]));
  };
  for(const id of c.keys())visit(id);

  for(const s of states.values()){
   assert.equal(new Set([...s.visible,...s.hidden]).size,c.size,'状態の表示定義に漏れ/重複');
   for(const id of [...s.visible,...s.hidden])assert(c.has(id),'状態の要素が不明');
   for(const id of s.interactive){assert(s.visible.includes(id));assert([...actions.values()].some(a=>a.component===id&&a.from===s.id),'操作未定義');}
  }
  const bindings=new Map(parts.api.bindings.map(b=>[b.id,b]));
  for(const b of bindings.values()){
   const op=operations.get(b.id);assert(op,`API不明 ${b.id}`);assert.equal(b.path,op.url);assert.equal(b.method,op.method.toUpperCase());
   const expected='../../04_api/openapi.json#/paths/'+op.url.replaceAll('~','~0').replaceAll('/','~1')+'/'+op.method;assert.equal(b.contract,expected);
   assert.deepEqual([...b.responses].sort(),Object.keys(op.o.responses).sort());
  }
  for(const a of actions.values()){
   assert(c.has(a.component));assert(states.get(a.from)?.interactive.includes(a.component),'操作元の状態不明');assert(a.effect.length>0);
   for(const op of a.api)assert(bindings.has(op),`操作のAPI未登録 ${op}`);
   for(const g of a.apiGaps)assert(gapIds.has(g));
   if(a.destination){
    const [target,state]=a.destination.split('#');
    if(target.startsWith('$'))assert(common.navigation.destinations[target],`復帰先不明 ${target}`);
    else{assert(ids.has(target),`遷移先不明 ${target}`);if(state)assert(read(path.join(root,target,'states.json')).some(s=>s.id===state));}
   }
  }
  assert(parts.components.filter(x=>x.kind==='control').every(x=>actions.has(x.id)),'操作要素未定義');
  for(const r of rs.values()){assert(r.text.length);assert(r.acceptance.length);for(const id of r.acceptance)assert(cs.has(id));}
  for(const s of cs.values()){assert(rs.has(s.requirement));assert(s.steps.length);assert(s.expect.length);assert.equal(s.status,'not-run');for(const a of s.checkActions)assert(actions.has(a));}
  for(const g of p.apiGaps)assert(gapIds.has(g));
  for(const ref of p.references){
   assert(states.has(ref.state));assert(p.viewports.some(v=>v.id===ref.viewport));
   const f=path.resolve(base,ref.image);assert(fs.existsSync(f),'画像なし');
   const im=catalog.images.find(i=>i.file===path.basename(f));assert(im,'画像未登録');
   assert(ref.region.x>=0&&ref.region.y>=0&&ref.region.x+ref.region.width<=im.width&&ref.region.y+ref.region.height<=im.height,'画像領域外');
  }
  controls+=actions.size;requirements+=rs.size;cases+=cs.size;components+=c.size;
 }catch(e){console.error(d+': '+e.message);process.exitCode=1;}
}
for(const item of catalog.images){
 const buf=fs.readFileSync(path.join(root,'references',item.file));
 assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),item.sha256,'画像ハッシュ不一致');
 assert.equal(buf.readUInt32BE(16),item.width);assert.equal(buf.readUInt32BE(20),item.height);
}
for(const g of gaps)for(const p of g.pages)assert(ids.has(p));
const result={pages:dirs.length,images:catalog.images.length,components,actions:controls,requirements,acceptanceCases:cases,result:process.exitCode?'failed':'definition-consistent',runtime:'not-run'};
console.log(JSON.stringify(result,null,2));

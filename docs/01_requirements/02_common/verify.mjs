// 仕様例の検査。製品API・provider・ブラウザの実装検査は各確認例で行う。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const base=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const groups=['01_ai','02_places-routes','03_information'];
const ajv=new Ajv({allErrors:true,strict:true,strictTuples:true});addFormats(ajv);
const schemas=groups.map(g=>JSON.parse(read(g+'/schemas.json')));
for(const s of schemas)ajv.addSchema(s);
let definitions=0,cases=0,links=0;
for(const s of schemas)for(const n of Object.keys(s.definitions)){ajv.getSchema(s.$id+'#/definitions/'+n);definitions++;}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const rules={
 evidence:x=>new Set(x.used).size===x.used.length&&x.used.every(id=>x.allowed.includes(id)),
 completion:x=>x.status==='running'&&x.attempt===x.resultAttempt,
 disjoint:x=>!x.left.some(id=>x.right.includes(id)),
 expiry:x=>x.expiresAt>x.now,
 receipt:x=>x.receiptHash?(x.receiptHash!==x.requestHash?'REQUEST_CONFLICT':x.targetExists?'existing':'NOT_FOUND'):(x.expiresAt>x.now?'create':'RESULT_EXPIRED'),
 retention:x=>x.includes('temporary')?'temporary':'storable',
 join:x=>{let out=[];for(const segment of x){if(out.length&&!same(out.at(-1),segment[0]))return 'OUTPUT_INVALID';out.push(...(out.length?segment.slice(1):segment));}return out;},
 access:x=>x.viewer===x.owner||x.visibility==='public'||(x.visibility==='selected'&&x.sharedWith.includes(x.viewer)),
 effective:x=>x.record.visitId?{placeId:x.visit.placeId,effectiveAt:x.visit.startedAt,endedAt:x.visit.endedAt,timePrecision:x.visit.timePrecision,visitStatus:x.visit.status}:{placeId:x.record.placeId,effectiveAt:x.record.occurredAt,endedAt:x.record.endedAt,timePrecision:x.record.timePrecision,visitStatus:null},
 overlap:x=>x.start!==null&&((x.end===null||x.start===x.end)?x.start>=x.from&&x.start<x.to:x.start<x.to&&x.end>x.from),
 sort:x=>[...x].sort((a,b)=>(a.time===null)-(b.time===null)||(b.time??0)-(a.time??0)||(a.id<b.id?-1:a.id>b.id?1:0)).map(v=>v.id),
 axis:x=>{assert(x.numerator<=x.denominator);return x.denominator===0?null:x.numerator/x.denominator;},
 source:x=>!x.readable?{state:'unavailable',currentVersion:null}:{state:x.expected===x.current?'current':'changed',currentVersion:x.current}
};
for(let i=0;i<groups.length;i++){
 const examples=JSON.parse(read(groups[i]+'/examples.json'));
 const seen=new Set();
 for(const c of examples){assert(!seen.has(c.id),c.id+' duplicated');seen.add(c.id);
  if(c.schema){const validate=ajv.getSchema(schemas[i].$id+'#/definitions/'+c.schema);assert(validate,c.schema);assert.equal(validate(c.data),c.valid,c.id+' '+JSON.stringify(validate.errors));}
  else {assert(rules[c.rule],c.rule);assert.deepEqual(rules[c.rule](c.input),c.expected,c.id);}
  cases++;
 }
}
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const slug=s=>s.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu,'').replace(/ /g,'-');
for(const file of walk(base).filter(x=>x.endsWith('.md'))){
 const body=fs.readFileSync(file,'utf8');
 for(const m of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const href=m[1];if(/^(https?:|mailto:)/.test(href))continue;
  const [rel,anchor]=href.split('#');const target=path.resolve(path.dirname(file),decodeURIComponent(rel||path.basename(file)));
  assert(fs.existsSync(target),file+' -> '+href);
  if(anchor&&target.endsWith('.md')){const heads=[...fs.readFileSync(target,'utf8').matchAll(/^#{1,6} (.+)$/gm)].map(h=>slug(h[1]));assert(heads.includes(decodeURIComponent(anchor)),file+' missing anchor '+href);}
  links++;
 }
}
console.log(JSON.stringify({definitions,cases,links,status:'passed'}));

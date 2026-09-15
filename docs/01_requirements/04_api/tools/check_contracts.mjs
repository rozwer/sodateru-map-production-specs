import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rawSpec=JSON.parse(fs.readFileSync(path.join(root,'openapi.json'),'utf8'));
// HTTP Reference Objects are resolved before checking the effective operation contract.
function resolveHttp(value){
 if(Array.isArray(value))return value.map(resolveHttp);
 if(value&&typeof value==='object'){
  if(/^#\/components\/(parameters|responses)\//.test(value.$ref??'')){
   if(Object.keys(value).length!==1)throw new Error('Unexpected HTTP reference siblings');
   let target=rawSpec;
   for(const part of value.$ref.slice(2).split('/'))target=target[part.replaceAll('~1','/').replaceAll('~0','~')];
   if(!target)throw new Error(`Unresolved HTTP reference: ${value.$ref}`);
   return resolveHttp(target);
  }
  return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,resolveHttp(child)]));
 }
 return value;
}
const spec=resolveHttp(rawSpec);
const ajv=new Ajv2020({allErrors:true,strict:false,validateFormats:true});
addFormats(ajv); ajv.addFormat('binary',true);
let count=0, samples=0; const failures=[], ids=new Set(), paths=new Set();
function check(ok,msg){if(!ok) failures.push(msg);}
function compile(schema,label){
 try {return ajv.compile({...schema,components:spec.components});}
 catch(e){failures.push(`${label}: ${e.message}`); return null;}
}
function validateExample(content,label){
 for(const [mime,x] of Object.entries(content??{})){
  const v=compile(x.schema,`${label} ${mime}`);
  if('example' in x && v){samples++; check(v(x.example),`${label}: ${JSON.stringify(v.errors)}`);}
 }
}
for(const name of Object.keys(spec.components.schemas)) compile({$ref:`#/components/schemas/${name}`},name);
for(const [route,methods] of Object.entries(spec.paths)) for(const [method,op] of Object.entries(methods)) {
 count++; check(!ids.has(op.operationId),`duplicate ${op.operationId}`); ids.add(op.operationId);
 paths.add(`${method.toUpperCase()} ${route}`);
 for(const p of op.parameters){compile(p.schema,`${route} ${p.name}`); check(p.in!=='path'||p.required,`optional path ${route}`);}
 const declared=op.parameters.filter(p=>p.in==='path').map(p=>p.name).sort();
 check(JSON.stringify(declared)===JSON.stringify([...route.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]).sort()),`path parameters ${route}`);
 check(Object.keys(op.responses).some(x=>/^2/.test(x)),`success missing ${route}`);
 check(op.responses['401']&&op.responses['404'],`access errors missing ${route}`);
 validateExample(op.requestBody?.content,`${method} ${route} request`);
 for(const [code,r] of Object.entries(op.responses)) validateExample(r.content,`${method} ${route} ${code}`);
}
// Reject inputs whose ambiguity caused the first catalog to be non-reproducible.
const body=(method,p)=>spec.paths[p][method].requestBody.content['application/json'].schema;
const validRecord=spec.paths['/records'].post.requestBody.content['application/json'].example;
for(const [label,schema,value] of [
 ['record required body',body('post','/records'),Object.fromEntries(Object.entries(validRecord).filter(([k])=>k!=='body'))],
 ['record unknown field',body('post','/records'),{...validRecord,serverOwnedPerson:'other'}],
 ['empty patch',body('patch','/records/{recordId}'),{}],
 ['unknown status',body('patch','/visits/{visitId}'),{status:'visited'}],
 ['invalid longitude',{$ref:'#/components/schemas/Position'},{longitude:181,latitude:35}],
 ['missing checkin answer',{$ref:'#/components/schemas/CheckinAnswers'},{state:'',minutes:10,note:''}],
 ['malformed media body',{$ref:'#/components/schemas/MediaOrderInput'},{items:[{id:'a'}]}],
 ['unsupported route mode',body('post','/route-searches'),{...spec.paths['/route-searches'].post.requestBody.content['application/json'].example,mode:'teleport'}],
]) {const v=compile(schema,label);if(v)check(!v(value),`${label}: invalid request accepted`);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const mdFiles=walk(root).filter(p=>p.endsWith('.md'));
for(const file of mdFiles){
 const text=fs.readFileSync(file,'utf8');
 for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  const link=m[1].split('#')[0]; if(!link||/^[a-z]+:\/\//.test(link))continue;
  check(fs.existsSync(path.resolve(path.dirname(file),link)),`broken link ${path.relative(root,file)}: ${link}`);
 }
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'schemas/source-manifest.json'),'utf8'));
for(const [relative,hash] of Object.entries(manifest)) {
 const full=path.resolve(root,'..',relative);
 check(fs.existsSync(full)&&createHash('sha256').update(fs.readFileSync(full)).digest('hex')===hash,`source changed since generation: ${relative}`);
}
const documented=new Set();
for(const f of mdFiles.filter(f=>path.dirname(f)===path.join(root,'endpoints'))){
 for(const m of fs.readFileSync(f,'utf8').matchAll(/`(GET|POST|PATCH|DELETE) \/api\/v1([^`]+)`/g)) documented.add(`${m[1]} ${m[2]}`);
}
check([...paths].every(x=>documented.has(x))&&paths.size===documented.size,'OpenAPI / Markdown operation mismatch');
console.log(`${count} operations; ${Object.keys(spec.components.schemas).length} schemas; ${samples} examples; 8 rejection checks; ${mdFiles.length} Markdown files`);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log('PASS: schema compilation, examples, required fields, references, catalog agreement, and local links.');

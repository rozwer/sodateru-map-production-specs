import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
const api=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json',import.meta.url),'utf8'));
const fragment=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/THEMES.json',import.meta.url),'utf8'));
const schemas={...api.components.schemas,...fragment.schemas};
const ajv=new Ajv({strict:false,validateFormats:false});
function validator(name) { return ajv.compile({$ref:`#/components/schemas/${name}`,components:{schemas}}); }
test('theme presentation accepts seven colors, rejects oversize names and keeps patch optional',()=>{
  const check=validator('ThemeCreate');
  const value={id:'t',name:'散歩',description:'気軽に休める場所',recordIds:['r'],colorKey:'teal',coverMediaId:null};
  assert.equal(check(value),true);
  for (const colorKey of schemas.ThemeColorKey.enum) assert.equal(check({...value,colorKey}),true);
  assert.equal(check({...value,name:'あ'.repeat(21)}),false);
  assert.equal(check({...value,colorKey:'red'}),false);
  assert.equal(validator('ThemePatch')({coverMediaId:null}),true);
});
test('memo extension retains long ordinary record body while presentation memo is limited',()=>{
  const check=validator('RecordCreate');
  const record={id:'memo',kind:'memo',visitId:null,placeId:null,occurredAt:null,endedAt:null,timePrecision:'unknown',body:'あ'.repeat(300),purposes:[],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:'private',sharedWith:[]};
  assert.equal(check(record),true,JSON.stringify(check.errors));
  const memo={name:'希望',originRefs:[{type:'record',id:'r',version:1}],keywords:['休憩']};
  assert.equal(check({...record,memo}),false);
  assert.equal(check({...record,body:'休みたい',memo}),true,JSON.stringify(check.errors));
  assert.equal(check({...record,body:'休みたい',kind:'experience',memo}),false);
});
test('name adoption requires a confirmed run attempt/version and permits bounded personal edits',()=>{
  const check=validator('ThemeNameAdoption');
  assert.equal(check({runId:'run',expectedAttempt:1,expectedRunVersion:2,name:'本人の名前',description:''}),true);
  assert.equal(check({runId:'run',expectedAttempt:1}),false);
  assert.equal(check({runId:'run',expectedAttempt:1,expectedRunVersion:2,name:'あ'.repeat(21)}),false);
});

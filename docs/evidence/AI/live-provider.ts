import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { runStructured, runEphemeral, getAiConfiguration } from '../../../server/ai/provider.ts';
const definitions=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/02_common/01_ai/schemas.json',import.meta.url),'utf8')).definitions;
const schema={...definitions.mapstyleResult,definitions};
const current={theme:'default',lightPreset:'day',showPedestrianRoads:true,showAdminBoundaries:false,showIndoor:false,colors:null};
const configuration=getAiConfiguration('mapstyle'),requestId=randomUUID(),start=Date.now();
const prompt='育てる地図のmapstyle受入。これは本人データを含まない合成設定です。希望は「夜でも水辺が見やすい地図」。現在値から許可された設定だけ提案し、explanationは日本語。指定JSON schemaどおりに返す。source_payload='+JSON.stringify({request:'夜でも水辺が見やすい地図',context:{current},evidence:[]});
const input={prompt,schema,model:configuration.model,task:'mapstyle',signal:new AbortController().signal};
const adapter=process.argv.includes('--ephemeral')?'ephemeral':'sdk';
let evidence;
try{const result=await (adapter==='sdk'?runStructured:runEphemeral)(input);evidence={requestId,adapter,model:configuration.model,promptVersion:configuration.promptVersion,startedAt:start,durationMs:Date.now()-start,result,status:'complete'};}
catch(error){const e=error as any;evidence={requestId,adapter,model:configuration.model,startedAt:start,durationMs:Date.now()-start,status:'failed',error:{code:e.code??'UPSTREAM_FAILED',message:String(e.message).replace(/(?:sk-|ghp_|gho_)[A-Za-z0-9_-]+/g,'[redacted]').slice(0,3000)}};}
mkdirSync(new URL('./',import.meta.url),{recursive:true});writeFileSync(new URL('./live-'+adapter+'.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
if(evidence.status==='failed')process.exitCode=1;

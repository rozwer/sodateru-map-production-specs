import {writeFileSync} from 'node:fs';
import {configureAi} from '../../../server/ai/registry.ts';
import {runStructured} from '../../../server/ai/provider.ts';
const output=process.env.EXPLORATION_PROVIDER_DIAGNOSTIC;
configureAi({provider:async input=>{
 if(output)writeFileSync(output,JSON.stringify({stage:'provider-started',task:input.task,model:input.model}));
 try{return await runStructured(input);}catch(e){
  let parsed;try{parsed=JSON.parse(e.message);}catch{}
  const safe={stage:'provider-failed',name:e.name,status:parsed?.status??null,code:parsed?.error?.code??e.code??null,type:parsed?.error?.type??null};
  if(parsed?.error?.code==='invalid_json_schema'){safe.schemaError=parsed.error.message;safe.param=parsed.error.param;}
  if(output)writeFileSync(output,JSON.stringify(safe,null,2)+'\n');
  throw e;
 }
}});

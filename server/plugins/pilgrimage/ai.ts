import type { AiTask } from '../../ai/types.ts';
import { CommonError } from '../../core/errors.ts';
import { requestHash } from '../../core/idempotency.ts';
import type { SearchResult } from './types.ts';
const idSchema={type:'string',minLength:1,maxLength:80};
export const pilgrimageInputSchema={type:'object',additionalProperties:false,required:['searchId','relationIds','settingsVersion'],properties:{searchId:idSchema,relationIds:{type:'array',minItems:2,maxItems:10,uniqueItems:true,items:idSchema},settingsVersion:{type:'integer',minimum:1}}};
export const pilgrimageOutputSchema={type:'object',additionalProperties:false,required:['searchId','settingsVersion','orderedRelationIds','explanation','unknowns'],properties:{searchId:idSchema,settingsVersion:{type:'integer',minimum:1},orderedRelationIds:{type:'array',minItems:2,maxItems:10,uniqueItems:true,items:idSchema},explanation:{type:'string',minLength:1,maxLength:2000},unknowns:{type:'array',maxItems:20,items:{type:'string',minLength:1,maxLength:1000}}}};
export function pilgrimageTask(pluginState:(db:any,context:any)=>any):AiTask {
 return {
  task:'pilgrimage',promptVersion:'pilgrimage-1',permissionScope:{location:true},inputSchema:pilgrimageInputSchema,outputSchema:pilgrimageOutputSchema,
  readMaterials(db,context,input) {
   const row=db.prepare('SELECT result_json FROM pilgrimage_searches WHERE id=? AND person_id=? AND data_mode=?').get(input.searchId,context.personId,context.dataMode) as any;
   if(!row)throw new CommonError('NOT_FOUND','作品検索がありません。');
   const search=JSON.parse(row.result_json) as SearchResult,setting=pluginState(db,context).items.find((s:any)=>s.id==='pilgrimage');
   if(!setting?.enabled||setting.version!==input.settingsVersion)throw new CommonError('SOURCE_CHANGED','聖地巡りの設定が変更されています。');
   const relations=input.relationIds.map((id:string)=>search.relations.find(r=>r.id===id));
   if(relations.some((r:any)=>!r||r.verificationStatus!=='confirmed'))throw new CommonError('INVALID_INPUT','AIには確認済みの検索候補だけを指定してください。');
   return {context:{searchId:search.id,region:search.input.region,settingsVersion:setting.version,relations},evidence:relations.map((r:any,i:number)=>({id:`src_${i+1}`,role:'place-relation',text:JSON.stringify({id:r.id,description:r.description,sources:r.sourceRefs}),sourceRef:null})),sourceRefs:[]};
  },
  buildPrompt() {return '確認済みの作品関連地点だけを訪問する順序を提案してください。全候補IDを一度ずつ並べ、searchIdとsettingsVersionを保持します。作品と場所の関係、出典、道路形状、距離、移動時間を創作しないでください。実際の道路経路は採用前に別途取得します。説明には順序の意図、unknownsには未確認の営業時間や移動条件を記載してください。';},
  validateResult(result,materials) {
   const inputIds=materials.context.relations.map((r:any)=>r.id).sort();
   if(result.searchId!==materials.context.searchId||result.settingsVersion!==materials.context.settingsVersion||requestHash([...result.orderedRelationIds].sort())!==requestHash(inputIds))throw new CommonError('OUTPUT_INVALID','AI案が入力候補・設定と一致しません。');
  },
  toBody(result) {return result.explanation;},
 };
}

import { registerPlugin, getPluginState } from '../../features/plugins/index.ts';
import { CommonError } from '../../core/errors.ts';
import { pilgrimageTask } from './ai.ts';
import { pilgrimageRelease } from './plugin.ts';
import { createPilgrimageService } from './adapters.ts';
import { pilgrimageFeature } from './http.ts';
// Manual search/route/save remains available while the separately delivered AI module is absent.
let ai:typeof import('../../ai/index.ts')|undefined;
try { ai=await import('../../ai/index.ts'); }
catch(error:any) { if(error.code!=='ERR_MODULE_NOT_FOUND'||!String(error.url??'').endsWith('/server/ai/index.ts'))throw error; }
registerPlugin(pilgrimageRelease);
if(ai)ai.registerAiTask(pilgrimageTask(getPluginState));
const unavailable=()=>{throw new CommonError('PROVIDER_UNAVAILABLE','共通AIが未接続です。手動で選んだ地点順は保存できます。');};
export default pilgrimageFeature(db=>createPilgrimageService(db,ai?{assertRunAdoptable:ai.assertRunAdoptable,appendAppliedRef:ai.appendAppliedRef}:undefined),ai??{createConversation:unavailable,startRun:async()=>unavailable(),getRun:async()=>unavailable()});

import { registerPlugin, getPluginState } from '../../features/plugins/index.ts';
import { registerAiTask, createConversation, startRun, getRun } from '../../ai/index.ts';
import { pilgrimageTask } from './ai.ts';
import { pilgrimageRelease } from './plugin.ts';
import { createPilgrimageService } from './adapters.ts';
import { pilgrimageFeature } from './http.ts';
registerPlugin(pilgrimageRelease);
registerAiTask(pilgrimageTask(getPluginState));
export default pilgrimageFeature(createPilgrimageService,{createConversation,startRun,getRun});

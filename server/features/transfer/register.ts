import { createTransferFeature } from './http.ts';
import { createTransferDependencies } from './adapters.ts';
import { registerTransferAiTask } from './ai-task.ts';

export default createTransferFeature(createTransferDependencies,registerTransferAiTask);

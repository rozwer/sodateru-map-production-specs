import { createExplorationFeature } from './http.mjs';
import { installDiscoverTask, runtimeFor } from './runtime.mjs';
installDiscoverTask();
export default createExplorationFeature(runtimeFor);

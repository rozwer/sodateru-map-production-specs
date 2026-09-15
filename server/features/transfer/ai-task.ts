import { registerAiTask } from '../../ai/index.ts';
import { TransferStore } from './store.ts';
import { sourceMaterials } from './materials.ts';
import { buildTransferPrompt, validateProposal } from './planning.ts';
import { transferInputSchema, transferOutputSchema } from './schemas.ts';
import { TransferError } from './types.ts';
import type { Materials } from './service.ts';
import type { ModelResult } from './types.ts';

let registered = false;
export function registerTransferAiTask(): void {
  if (registered) return;
  registerAiTask({
    task:'transfer',promptVersion:'transfer-v1',permissionScope:{records:true,location:true},inputSchema:transferInputSchema,outputSchema:transferOutputSchema,
    readMaterials(db,context,input) {
      const store = new TransferStore(db);
      const planSet = store.getPlan(context.personId,(input as {planSetId:string}).planSetId);
      if (store.getRecipe(context.personId,planSet.recipeId).version !== planSet.recipeVersion) throw new TransferError('SOURCE_CHANGED','レシピが変更されています');
      const materials = sourceMaterials(db,context,planSet.sourceRefs);
      // Run status/version and adoption change independently of the generation input.
      const {id,recipe,region,start,mode,timeBudgetMinutes,preferences,candidates,generatorVersion} = planSet;
      return {...materials,context:{planSet:{id,recipe,region,start,mode,timeBudgetMinutes,preferences,candidates,generatorVersion}}};
    },
    buildPrompt(materials) { return buildTransferPrompt(materials); },
    validateResult(result,materials) {
      const {context,evidence} = materials as Materials;
      validateProposal(result,context.planSet.recipe,context.planSet.candidates,evidence);
    },
    toBody(result) { return (result as ModelResult).plans.map(p=>`${p.variant==='faithful'?'元体験に忠実な案':'本人向けの案'}: ${p.explanation}`).join('\n'); },
  });
  registered = true;
}

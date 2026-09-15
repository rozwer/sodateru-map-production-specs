import { existsSync } from 'node:fs';
import { defineFeature } from '../../core/features.ts';
import { expectedVersion, requireVersion } from '../../core/errors.ts';
import { recoverInterruptedRuns } from '../../ai/engine.ts';
import { configureAi } from '../../ai/registry.ts';
import { aiError } from '../../ai/errors.ts';
import { registerConversationRoutes } from './routes.ts';
const informationUrl=new URL('../../information/service.ts',import.meta.url);
const settingsUrl=new URL('../settings/service.ts',import.meta.url);
const information=existsSync(informationUrl)?await import(informationUrl.href):null;
const settings=existsSync(settingsUrl)?await import(settingsUrl.href):null;
export default defineFeature({
 id:'conversations',
 register(api,services){
  configureAi({
   assertSourceRefs(db,ctx,refs){
    if(!information){if(refs.length)throw aiError('PROVIDER_UNAVAILABLE','根拠の共通照合が未接続です',true);return;}
    information.createInformationService(db).assertSourcesCurrent(ctx,{refs});
   },
   assertAllowed(db,ctx,scope){
    if(!settings)throw aiError('PROVIDER_UNAVAILABLE','AI許可設定が未接続です',true);
    settings.assertAiAllowed(db,ctx.personId,scope);
   },
   assertConversationRecord(db,ctx,id){
    if(!information)throw aiError('PROVIDER_UNAVAILABLE','記録の共通読取が未接続です',true);
    information.createInformationService(db).getOwnRecord(ctx,id);
   }
  });
  for(const db of [services.databases.live,services.databases.demo])recoverInterruptedRuns(db);
  registerConversationRoutes(api,{expectedVersion,requireVersion});
 }
});

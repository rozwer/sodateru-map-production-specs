import type { DatabaseSync } from 'node:sqlite';
import { idempotentMutation, type RequestIdentity } from '../core/idempotency.ts';
import { transaction } from '../db/migrate.ts';
import type { AiContext, Run } from './types.ts';
import { messageRow, runDto } from './storage.ts';
const needsPreparation=Symbol('needsPreparation');
export function replayRun(db:DatabaseSync,ctx:AiContext,identity?:RequestIdentity):Run|undefined {
 if(!identity)return;
 let run:Run|undefined;
 try {idempotentMutation(db,identity,{execute(){throw needsPreparation;},replay(result){run=runDto(messageRow(db,ctx,result.resource!.id));return result;}});}
 catch(error){if(error!==needsPreparation)throw error;}
 return run;
}
export function withRunReceipt<T extends {run:Run;created:boolean}>(db:DatabaseSync,ctx:AiContext,identity:RequestIdentity|undefined,status:number,execute:()=>T):{run:Run;created:boolean}{
 if(!identity)return transaction(db,execute);
 let outcome:{run:Run;created:boolean}|undefined;
 idempotentMutation(db,identity,{
  execute(){outcome=execute();return {status,resource:{type:'ai-run',id:outcome.run.id}};},
  replay(result){outcome={run:runDto(messageRow(db,ctx,result.resource!.id)),created:false};return result;}
 });
 return outcome!;
}

import type { DatabaseSync } from 'node:sqlite';
export type AiContext = { personId:string; dataMode:'live'|'demo'; requestId:string; signal:AbortSignal };
export type SourceRef={type:'record'|'visit'|'place'|'checkin'|'route';id:string;version:number};
export type RunRequest={conversationId:string;userMessageId:string;assistantMessageId:string;text:string;task:string;input:any;expectedRefs:SourceRef[];model?:string;promptVersion?:string};
export type Materials={context:any;evidence:Array<{id:string;role:string;text:string;sourceRef:SourceRef|null}>;sourceRefs:SourceRef[]};
export type PermissionScope={records?:boolean;location?:boolean;media?:boolean;profile?:boolean};
export type AiTask<I=any,R=any>={
 task:string;promptVersion:string;timeoutMs?:number;inputSchema:object;outputSchema:object;permissionScope?:PermissionScope;
 readMaterials(db:DatabaseSync,context:AiContext,input:I,request:RunRequest):Materials|Promise<Materials>;
 buildPrompt(materials:Materials,request:RunRequest):string;
 validateResult(result:R,materials:Materials,request:RunRequest):void;
 toBody(result:R):string;
 persistResult?(db:DatabaseSync,context:AiContext,result:R,materials:Materials,request:RunRequest):{insightId:string|null};
};
export type RunError={code:string;message:string;retryable:boolean};
export type Run={id:string;conversationId:string;userMessageId:string;task:string;status:'pending'|'running'|'complete'|'failed'|'cancelled';attempt:number;version:number;model:string;promptVersion:string;result:any|null;error:RunError|null;sourceRefs:SourceRef[];insightId:string|null;createdAt:number;updatedAt:number};
export type AppliedRef={type:'record'|'theme'|'insight'|'discovery'|'map-settings'|'transfer-plan-set';id:string;version:number;contentHash:string};
export type ProviderInput={prompt:string;schema:object;model:string;signal:AbortSignal;deadline?:number;task?:string};
export type AiDependencies={
 provider(input:ProviderInput):Promise<unknown>;
 assertSourceRefs(db:DatabaseSync,context:AiContext,refs:SourceRef[]):void|Promise<void>;
 assertAllowed(db:DatabaseSync,context:AiContext,scope:PermissionScope):void|Promise<void>;
 model(task:string):string;
};

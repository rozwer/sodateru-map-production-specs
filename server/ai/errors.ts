import { CommonError } from '../core/errors.ts';
export function aiError(code:string,message:string,retryable=false,status?:number) {return new CommonError(code,message,retryable,{},status);}
export function asRunError(error:unknown) {
 const e=error as any;
 return {code:typeof e?.code==='string'?e.code:'UPSTREAM_FAILED',message:typeof e?.code==='string'?e.message:'AI処理に失敗しました',retryable:typeof e?.retryable==='boolean'?e.retryable:true};
}

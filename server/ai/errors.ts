export function aiError(code:string,message:string,retryable=false,status?:number) {
 return Object.assign(new Error(message),{code,retryable,status:status??({NOT_FOUND:404,INVALID_INPUT:400,SOURCE_CHANGED:409,REQUEST_CONFLICT:409,BUSY:409,INPUT_TOO_LARGE:413,OUTPUT_INVALID:422,PROVIDER_UNAVAILABLE:503,TIMEOUT:504,FORBIDDEN:403}[code]??502)});
}
export function asRunError(error:unknown) {
 const e=error as any;
 return {code:typeof e?.code==='string'?e.code:'UPSTREAM_FAILED',message:typeof e?.code==='string'?e.message:'AI処理に失敗しました',retryable:typeof e?.retryable==='boolean'?e.retryable:true};
}

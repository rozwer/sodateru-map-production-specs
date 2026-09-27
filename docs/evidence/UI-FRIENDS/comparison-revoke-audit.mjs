// Read-only audit against the isolated synthetic acceptance database API.
import {createApiClient} from '../../../packages/api-client/index.ts';
import {writeFileSync} from 'node:fs';
let cookie=''; const calls=[];
const api=createApiClient({baseUrl:'http://127.0.0.1:3115/api/v1',fetch:async(url,init)=>{
 const headers=new Headers(init.headers);if(cookie)headers.set('Cookie',cookie);
 const response=await fetch(url,{...init,headers});
 if(response.headers.getSetCookie().length)cookie=response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 calls.push({method:init.method??'GET',path:new URL(url).pathname,status:response.status,requestId:headers.get('X-Request-Id')});return response;
}});
await api.request('postSession',{body:{profileKey:'alice'},idempotencyKey:crypto.randomUUID()});
const outcomes={};
for(const [operation,path] of [
 ['getMessagesMessageId',{messageId:'11777fab-c8fa-43be-ace1-cdc7a4bb987c'}],
 ['getInsightsInsightId',{insightId:'insight_2d1a96b715f9d0686d40527cdec0aed12752905589af3561'}],
 ['getRecordsRecordId',{recordId:'ui-friends-live-record-bob'}],
]){
 try{await api.request(operation,{path});throw new Error(operation+' unexpectedly visible');}
 catch(error){if(error.status!==404)throw error;outcomes[operation]={status:error.status,code:error.code};}
}
const shared=await api.request('getSharedRecords',{query:{personIds:['friends-live-bob'],limit:20}});
if(shared.items.length)throw new Error('Revoked record still listed');
writeFileSync(new URL('./comparison-revoke-audit.json',import.meta.url),JSON.stringify({time:new Date().toISOString(),outcomes,sharedCount:shared.items.length,calls},null,2));
console.log(JSON.stringify({outcomes,sharedCount:shared.items.length}));

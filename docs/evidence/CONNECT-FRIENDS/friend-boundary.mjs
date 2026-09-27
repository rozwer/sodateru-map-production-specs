// Only the task's isolated acceptance API; never point at a personal database.
import {createApiClient} from '../../../packages/api-client/index.ts';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
function client(){let cookie='';return createApiClient({baseUrl:'http://127.0.0.1:3115/api/v1',fetch:async(url,init)=>{const headers=new Headers(init.headers);if(cookie)headers.set('Cookie',cookie);const response=await fetch(url,{...init,headers});const set=response.headers.getSetCookie();if(set.length)cookie=set.map(s=>s.split(';')[0]).join('; ');return response;}});}
const a=client(),b=client();
await a.request('postSession',{body:{profileKey:'alice'},idempotencyKey:crypto.randomUUID()});
await b.request('postSession',{body:{profileKey:'bob'},idempotencyKey:crypto.randomUUID()});
const action=process.argv[2];
if(action==='unlink'){
 const relations=await b.request('getFriendships',{});
 const relation=relations.items.find(r=>r.requesterId==='friends-live-alice'||r.recipientId==='friends-live-alice');
 if(relation)await b.request('deleteFriendshipsFriendshipId',{path:{friendshipId:relation.id},version:relation.version});
}else if(action==='restore'){
 const id=crypto.randomUUID();
 const relation=await a.request('postFriendships',{body:{id,recipientId:'friends-live-bob'},idempotencyKey:id});
 await b.request('patchFriendshipsFriendshipId',{path:{friendshipId:relation.data.id},version:relation.data.version,body:{status:'accepted'}});
}else if(action!=='inspect')throw new Error('Use unlink, restore, or inspect');
const record=(await a.request('getRecordsRecordId',{path:{recordId:'ui-friends-live-record-alice'}})).data.record;
const relationships=(await b.request('getFriendships',{})).items;
const result={action,time:new Date().toISOString(),recordId:record.id,version:record.version,visibility:record.visibility,sharedWith:record.sharedWith,friendships:relationships.map(({id,status,version})=>({id,status,version}))};
const output=new URL('./friend-boundary.json',import.meta.url);
const prior=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):[];
prior.push(result);writeFileSync(output,JSON.stringify(prior,null,2));console.log(JSON.stringify(result));

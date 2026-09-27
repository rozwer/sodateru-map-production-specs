// @vitest-environment jsdom
// Run only against this task's isolated acceptance API on port 3115.
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { createApiClient } from '../../../packages/api-client';
import { api } from '../../../src/app/api';
import { screens } from '../../../src/features/friends/screens';
import { ScreenKeyContext, ScreenStateContext } from '../../../src/app/useScreenState';
import { writeFileSync } from 'node:fs';

it.each([true, false])('verifies sharing without losing intent (concurrent=%s)', async (concurrent) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let cookie = '';
  const client = createApiClient({baseUrl:'http://127.0.0.1:3115/api/v1',fetch:async (url, init) => {
    const headers = new Headers(init?.headers); if(cookie) headers.set('Cookie',cookie);
    const response = await fetch(url,{...init,headers});
    const set = response.headers.getSetCookie(); if(set.length) cookie=set.map(s=>s.split(';')[0]).join('; ');
    return response;
  }});
  await client.request('postSession',{body:{profileKey:'alice'},idempotencyKey:crypto.randomUUID()});
  const id = `sharing-race-${crypto.randomUUID()}`;
  const created = await client.request('postRecords',{idempotencyKey:id,body:{id,kind:'experience',visitId:null,placeId:null,occurredAt:Date.now(),endedAt:null,timePrecision:'exact',body:'共有競合の検証専用記録',purposes:[],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:'private',sharedWith:[]}});
  const events: unknown[] = [];
  const request = vi.spyOn(api,'request').mockImplementation(async (operation, input) => {
    const result = await client.request(operation,input);
    if(operation === 'patchRecordsRecordId' && concurrent) {
      const written = result as {data:{version:number}};
      events.push({kind:'first-write',version:written.data.version});
      const replacement = await client.request('patchRecordsRecordId',{path:{recordId:id},version:written.data.version,body:{visibility:'private',sharedWith:[]}});
      events.push({kind:'concurrent-write',version:replacement.data.version,visibility:replacement.data.visibility});
    }
    return result;
  });
  const key=`friends-sharing:race:${id}`;
  const saved = new Map<string,unknown>([[key,{visibility:'public',sharedWith:[],version:created.data.version,dirty:true,selectedPeople:[]}]]);
  const host=document.createElement('div'); document.body.append(host);
  const root=createRoot(host), Sharing=screens.find(s=>s.id==='sharing')!.component;
  try {
    await act(async()=>root.render(<ScreenStateContext.Provider value={saved}><ScreenKeyContext.Provider value="sharing-race"><Sharing route={{pageId:'sharing',params:{recordId:id}}} scopeKey="race" navigate={vi.fn()} back={vi.fn()}/></ScreenKeyContext.Provider></ScreenStateContext.Provider>));
    await vi.waitFor(async()=>{ await act(async()=>{ await new Promise(resolve=>setTimeout(resolve,20)); }); expect([...host.querySelectorAll('button')].find(b=>b.textContent==='共有する')?.disabled).toBe(false); });
    await act(async()=>{[...host.querySelectorAll('button')].find(b=>b.textContent==='共有する')!.click();});
    await vi.waitFor(async()=>{ await act(async()=>{ await new Promise(resolve=>setTimeout(resolve,20)); }); expect(host.textContent).toMatch(/別の変更|再取得した内容を確認しました/); });
    const persisted=await client.request('getRecordsRecordId',{path:{recordId:id}});
    events.push({kind:'verification',recordId:id,version:persisted.data.record.version,visibility:persisted.data.record.visibility,screen:host.textContent,draft:saved.get(key)});
    writeFileSync(`docs/evidence/CONNECT-FRIENDS/sharing-${concurrent ? 'race' : 'normal'}-result.json`,JSON.stringify(events,null,2));
    if (!concurrent) {
      expect(persisted.data.record.visibility).toBe('public');
      expect(host.textContent).toContain('共有範囲を保存し、再取得した内容を確認しました');
      expect(saved.get(key)).toMatchObject({visibility:'public',dirty:false});
      return;
    }
    expect(persisted.data.record.visibility).toBe('private');
    expect(host.textContent).not.toContain('共有範囲を保存し、再取得した内容を確認しました');
    expect(host.textContent).toContain('別の変更');
    expect(saved.get(key)).toMatchObject({visibility:'public',dirty:true});
  } finally { await act(async()=>root.unmount()); host.remove(); request.mockRestore(); vi.unstubAllGlobals(); }
});

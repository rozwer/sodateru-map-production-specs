// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ApiError, type Visit, type Place } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import { MapBridge } from '../../app/map-bridge';
import { MapBridgeContext } from '../../app/useMapBridge';
import { ScreenStateContext, ScreenKeyContext } from '../../app/useScreenState';
import { VisitEditor } from './VisitEditor';
import { subscribeGrowthChanges } from './growth-refresh';
vi.mock('../../app/api',()=>({api:{request:vi.fn()}}));
vi.mock('../records/map-preview',()=>({RecordMapPreview:()=> <div>実地図プレビュー境界</div>}));
it('saves candidate separately and retains confirmation draft after conflict/current-version reload',async()=>{
 (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 const place={id:'place-a',name:'場所A',coordinates:[136,35]} as Place;
 let visit:Visit|undefined,conflict=true;
 const request=vi.mocked(api.request);
 request.mockImplementation(async(operation,input)=>{
  if(operation==='getPlacesPlaceId')return {data:{place}} as never;
  if(operation==='postVisits'){const body=(input as {body:Visit}).body;visit={...body,version:1,status:'candidate'};return {data:visit} as never;}
  if(operation==='getVisitsVisitId')return {data:visit} as never;
  if(operation==='getMapGrowth')return {items:[],nextCursor:null} as never;
  if(operation==='patchVisitsVisitId'){
   if(conflict){visit={...visit!,version:2};throw new ApiError(409,'VERSION_CONFLICT','競合','test');}
   visit={...visit!,status:(input as {body:{status:Visit['status']}}).body.status,version:3};return {data:visit} as never;
  }
  throw new Error(operation);
 });
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),bridge=new MapBridge('scope-a');
 const notify=vi.fn(),unsubscribe=subscribeGrowthChanges(notify);
 const click=async(text:string)=>{const button=[...host.querySelectorAll('button')].find(item=>item.textContent?.trim()===text);expect(button).toBeTruthy();await act(async()=>button!.click());};
 try{
  await act(async()=>root.render(<MapBridgeContext.Provider value={bridge}><ScreenStateContext.Provider value={new Map()}><ScreenKeyContext.Provider value="visit"><VisitEditor route={{pageId:'visit-confirm',params:{placeId:place.id}}} scopeKey="scope-a" navigate={vi.fn()} back={vi.fn()}/></ScreenKeyContext.Provider></ScreenStateContext.Provider></MapBridgeContext.Provider>));
  expect(request.mock.calls.some(([op])=>op==='postVisits')).toBe(false);
  await click('訪問候補として保存');expect(visit?.status).toBe('candidate');expect(notify).toHaveBeenCalledTimes(1);
  const radio=host.querySelector<HTMLInputElement>('input[type=radio]')!;await act(async()=>radio.click());
  const save=[...host.querySelectorAll('button')].find(item=>item.className==='records-primary')!;
  await act(async()=>save.click());expect(host.textContent).toContain('入力を保持');expect(radio.checked).toBe(true);expect(notify).toHaveBeenCalledTimes(1);
  await click('もう一度試す');expect(host.textContent).toContain('版 2');expect(host.querySelector<HTMLInputElement>('input[type=radio]')!.checked).toBe(true);
  conflict=false;await act(async()=>host.querySelector<HTMLButtonElement>('.records-primary')!.click());expect(visit?.status).toBe('confirmed');expect(notify).toHaveBeenLastCalledWith('scope-a');expect(notify).toHaveBeenCalledTimes(2);
 }finally{unsubscribe();await act(async()=>root.unmount());bridge.dispose();host.remove();}
});

// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {App} from './App';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it.each([['memo-edit','メモを書く'],['diary','日記'],['experience-compare','2つの体験を比べる'],['reflection-history','振り返りの記録']])('opens %s with the current date and returns to its menu trigger',async(id,label)=>{
 vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});
 vi.stubGlobal('requestAnimationFrame',(cb:()=>void)=>setTimeout(cb,0));
 vi.stubGlobal('cancelAnimationFrame',(id:ReturnType<typeof setTimeout>)=>clearTimeout(id));
 history.replaceState(null,'','#/navigation?mode=main&date=2026-09-27&timeZone=Asia%2FTokyo');
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<App screens={[{id:id!,title:label!,component:({route,back})=><div data-entry={id}><span>{route.params.date} {route.params.timeZone}</span><button onClick={back}>入口へ戻る</button></div>}]} />));
  const button=()=>[...host.querySelectorAll<HTMLButtonElement>('.sm-navigation__links button')].find(b=>b.textContent===label)!;
  await act(async()=>button().click());
  expect(location.hash).toContain(`#/${id}?`);
  expect(host.querySelector('[data-entry]')?.textContent).toContain('2026-09-27 Asia/Tokyo');
  await act(async()=>{host.querySelector<HTMLButtonElement>('[data-entry] button')!.click();await new Promise(resolve=>setTimeout(resolve,30));});
  expect(location.hash).toContain('#/navigation?');
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});
  expect(document.activeElement).toBe(button());
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});

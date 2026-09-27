// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { screens } from './screens';
import { api } from '../../app/api';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';

vi.mock('../../app/api', () => ({ api: { request: vi.fn() } }));
vi.mock('./atlas', () => ({ loadAtlas: async () => ({url:'blob:test',imported:{manifest:{description:'test'}}}), v2Clip: () => undefined, v2Actions: () => [] }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
URL.revokeObjectURL = vi.fn();
const props = {scopeKey:'test',navigate:vi.fn(),back:vi.fn(),route:{pageId:'companion-settings',params:{}}};

it('cancels cached import input so revisiting cannot register the cancelled file', async () => {
  const cache = new Map<string, unknown>();
  cache.set('import', {form:{file:new File(['zip'],'cancelled.zip'),register:true,makeCurrent:true},inspected:{id:'import1',requiredActions:['idle']},confirmed:true,viewed:['idle']});
  const host = document.createElement('div'); document.body.append(host); let root = createRoot(host);
  const Screen = screens.find(screen => screen.id === 'companion-import')!.component;
  const render = () => <ScreenStateContext.Provider value={cache}><ScreenKeyContext.Provider value="import"><Screen {...props} route={{pageId:'companion-import',params:{}}}/></ScreenKeyContext.Provider></ScreenStateContext.Provider>;
  await act(async () => root.render(render()));
  expect(host.textContent).toContain('cancelled.zip');
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'キャンセル')!.click());
  expect(props.back).toHaveBeenCalledOnce();
  await act(async () => root.unmount()); root = createRoot(host);
  await act(async () => root.render(render()));
  expect(host.textContent).not.toContain('cancelled.zip');
  expect([...host.querySelectorAll('button')].find(button => button.textContent === '登録する')?.disabled).toBe(true);
  expect(cache.get('import')).toMatchObject({form:{file:null,makeCurrent:false},inspected:null,confirmed:false,viewed:[]});
  await act(async () => root.unmount()); host.remove();
});

it('discards an unselection locally and only saves null selection after explicit save', async () => {
  let saved = {selectedCompanionId:'pet1' as string | null,visible:true,size:'medium',reducedMotion:false,version:1};
  const request = vi.mocked(api.request);
  request.mockReset();
  request.mockImplementation(async (operation, input: any) => {
    if (operation === 'listCompanions') return {items:[{id:'pet1',name:'Pet',importId:'import1'}],nextCursor:null} as any;
    if (operation === 'updateCompanionSettings') { saved = {...saved,...input.body,version:2}; }
    return {data:saved} as any;
  });
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  const Screen = screens.find(screen => screen.id === 'companion-settings')!.component;
  await act(async () => root.render(<Screen {...props}/>));
  const button = (text: string) => [...host.querySelectorAll('button')].find(button => button.textContent === text)!;
  await act(async () => button('現在の相棒の選択を解除').click());
  expect(host.querySelector<HTMLInputElement>('input[name=companion]')!.checked).toBe(false);
  await act(async () => button('変更を取り消す').click());
  expect(host.querySelector<HTMLInputElement>('input[name=companion]')!.checked).toBe(true);
  expect(request.mock.calls.some(([operation]) => operation === 'updateCompanionSettings')).toBe(false);
  await act(async () => button('現在の相棒の選択を解除').click());
  await act(async () => button('保存').click());
  expect(request.mock.calls.find(([operation]) => operation === 'updateCompanionSettings')?.[1]).toMatchObject({version:1,body:{selectedCompanionId:null}});
  expect(host.textContent).toContain('現在の相棒は未選択です');
  await act(async () => root.unmount()); host.remove();
});

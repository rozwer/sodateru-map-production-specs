// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { screens } from './screens';
import { api } from '../../app/api';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';

it('keeps picker changes local, rejects unavailable selections, and commits only on done', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const request = vi.spyOn(api, 'request').mockImplementation(async (operation) => {
    if (operation === 'getMe') return { data: { id: 'me' } } as never;
    if (operation === 'getFriendships') return { items: [{ requesterId: 'me', recipientId: 'friend', status: 'accepted' }], nextCursor: null } as never;
    if (operation === 'getPeoplePersonId') return { data: { id: 'friend', name: '友達', bio: '', avatarUrl: null } } as never;
    throw new Error(operation);
  });
  const key = 'friends-sharing:test:record';
  const draft = { visibility: 'selected', sharedWith: ['removed'], selectedPeople: [], version: 1, dirty: false };
  const saved = new Map<string, unknown>([[key, draft]]);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), back = vi.fn();
  const Picker = screens.find(s => s.id === 'friend-picker')!.component;
  const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent === text)!;
  try {
    await act(async () => root.render(<ScreenStateContext.Provider value={saved}><ScreenKeyContext.Provider value="picker-session"><Picker route={{pageId:'friend-picker',params:{recordId:'record'}}} scopeKey="test" navigate={vi.fn()} back={back}/></ScreenKeyContext.Provider></ScreenStateContext.Provider>));
    expect(button('完了').disabled).toBe(true);
    expect(host.textContent).toContain('現在共有できない相手');
    await act(async () => (host.querySelector('[aria-label="選択した相手の選択を外す"]') as HTMLButtonElement).click());
    await act(async () => (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
    expect(saved.get(key)).toBe(draft);
    await act(async () => button('選択を取り消して戻る').click());
    expect(back).toHaveBeenCalledOnce();
    expect(saved.get(key)).toBe(draft);
    await act(async () => button('完了').click());
    expect(saved.get(key)).toMatchObject({sharedWith:['friend'], visibility:'selected', dirty:true});
    expect(request.mock.calls.every(([operation]) => operation.startsWith('get'))).toBe(true);
  } finally { await act(async () => root.unmount()); host.remove(); request.mockRestore(); vi.unstubAllGlobals(); }
});

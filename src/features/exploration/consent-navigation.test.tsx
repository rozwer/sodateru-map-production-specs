// Controlled API boundary: this regression does not claim live AI/device acceptance.
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { screens } from './screens';
import type { ConsentDraft } from './flow';

const fixture = vi.hoisted(() => ({ draft: null as ConsentDraft | null, request: vi.fn(), setConsent: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request: fixture.request } }));
vi.mock('./screen-support', async importOriginal => {
  const original = await importOriginal<typeof import('./screen-support')>();
  return { ...original, useExplorationFlow: () => ({ state: { consent: fixture.draft }, flow: { setConsent: fixture.setConsent }, bridge: {} }) };
});

it.each(['discovery', 'experience-transfer'])('preserves %s route parameters on consent cancellation and confirmed send', async page => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const params: Record<string, string> = page === 'discovery' ? { kind: 'place', targetId: 'place-original' } : { recipeId: 'recipe-original' };
  const send = vi.fn(async () => {}), cancel = vi.fn();
  const draft: ConsentDraft = { text: '確認した本文', origin: null, place: null, returnPage: page, returnParams: params, settings: { version: 1, ai: { enabled: true, allowLocation: false, allowRecords: false } } as ConsentDraft['settings'], send, cancel };
  fixture.draft = draft;
  fixture.request.mockReset().mockResolvedValue({ data: draft.settings });
  const navigate = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const Component = screens.find(screen => screen.id === 'ai-consent')!.component;
  try {
    await act(async () => root.render(<Component route={{ pageId: 'ai-consent', params: {} }} navigate={navigate} back={() => {}} active scopeKey="test"/>));
    const buttons = [...host.querySelectorAll('footer button')];
    await act(async () => (buttons[0] as HTMLButtonElement).click());
    expect(navigate).toHaveBeenLastCalledWith(page, params);
    expect(fixture.request).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith({ text: '確認した本文', place: null, origin: null });
    await act(async () => (buttons[1] as HTMLButtonElement).click());
    expect(send).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenLastCalledWith(page, params);
  } finally { await act(async () => root.unmount()); host.remove(); }
});

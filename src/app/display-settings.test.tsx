// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useDisplaySettings } from './display-settings';
const pending = vi.hoisted(() => [] as { signal: AbortSignal; resolve: (value: unknown) => void }[]);
vi.mock('./api', () => ({ api: { request: (_operation: string, { signal }: { signal: AbortSignal }) => new Promise(resolve => pending.push({ signal, resolve })) } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function Probe({ scope }: { scope: string | null }) { useDisplaySettings(scope); return null; }
const settings = (fontSize: string, reduceMotion: boolean) => ({ data: { display: { fontSize, reduceMotion } } });
it('applies saved preferences, cancels superseded refreshes and isolates person/mode changes', async () => {
  const host = document.createElement('div'); const root = createRoot(host);
  const html = document.documentElement;
  try {
    await act(async () => root.render(<Probe scope="live:one"/>));
    await act(async () => pending.shift()!.resolve(settings('large', true)));
    expect(html.style.fontSize).toBe('20px'); expect(html.dataset.reduceMotion).toBe('true');
    await act(async () => window.dispatchEvent(new Event('sodateru:settings-changed')));
    const stale = pending.shift()!;
    await act(async () => window.dispatchEvent(new Event('sodateru:settings-changed')));
    expect(stale.signal.aborted).toBe(true);
    await act(async () => pending.shift()!.resolve(settings('extraLarge', false)));
    await act(async () => stale.resolve(settings('standard', true)));
    expect(html.style.fontSize).toBe('24px'); expect(html.dataset.reduceMotion).toBe('false');
    await act(async () => window.dispatchEvent(new Event('sodateru:settings-changed')));
    const oldPerson = pending.shift()!;
    await act(async () => root.render(<Probe scope="demo:two"/>));
    expect(html.style.fontSize).toBe('16px'); expect(oldPerson.signal.aborted).toBe(true);
    await act(async () => oldPerson.resolve(settings('extraLarge', true)));
    expect(html.dataset.reduceMotion).toBe('false');
    await act(async () => pending.shift()!.resolve(settings('large', true)));
    await act(async () => root.render(<Probe scope={null}/>));
    expect(html.style.fontSize).toBe('16px'); expect(html.dataset.reduceMotion).toBe('false');
  } finally { await act(async () => root.unmount()); }
});

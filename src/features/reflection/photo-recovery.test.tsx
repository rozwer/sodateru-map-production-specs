import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { PhotoImage } from './views';

it('shows a newly selected record photo after the previous photo failed', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<PhotoImage src="/missing.jpg" alt="前の記録"/>));
    await act(async () => host.querySelector('img')!.dispatchEvent(new Event('error')));
    expect(host.textContent).toContain('写真を表示できません');
    await act(async () => root.render(<PhotoImage src="/available.jpg" alt="次の記録"/>));
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/available.jpg');
    expect(host.querySelector('img')?.alt).toBe('次の記録');
  } finally { await act(async () => root.unmount()); }
});

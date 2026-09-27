import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { PhotoImage, ReflectionPhotoActive } from './views';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));

it('保存媒体は本人context付きclientで取得し、再表示時の拒否で旧画像を復活させない', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const create = vi.fn(() => 'blob:verified-photo');
  const revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  request.mockResolvedValueOnce(new Blob(['test'], { type: 'image/jpeg' })).mockRejectedValueOnce(new Error('FORBIDDEN'));
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const render = (active: boolean) => act(async () => root.render(
    <ReflectionPhotoActive.Provider value={active}><PhotoImage src="/api/v1/media/photo-1/content" alt="検証写真" /></ReflectionPhotoActive.Provider>,
  ));
  try {
    await render(true);
    expect(request).toHaveBeenCalledWith('getMediaMediaIdContent', expect.objectContaining({ path: { mediaId: 'photo-1' } }));
    expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:verified-photo');
    await render(false);
    expect(host.querySelector('img')).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:verified-photo');
    await render(true);
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('写真を表示できません');
    expect(request).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
  }
});

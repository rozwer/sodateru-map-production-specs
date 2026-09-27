import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {InsightPhoto} from '../insights/InsightViews';
const {request}=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../../app/api',()=>({api:{request}}));
it('saved theme photos use authenticated content transport and release the blob when removed',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const create=vi.fn(()=> 'blob:protected-photo'),revoke=vi.fn();
 vi.stubGlobal('URL',Object.assign(class extends URL {},{createObjectURL:create,revokeObjectURL:revoke}));
 request.mockResolvedValue(new Blob(['photo'],{type:'image/png'}));
 const host=document.createElement('div'),root=createRoot(host);
 try {
  await act(async()=>root.render(<InsightPhoto src="/api/v1/media/photo-id/content" alt="代表写真"/>));
  expect(request).toHaveBeenCalledWith('getMediaMediaIdContent',expect.objectContaining({path:{mediaId:'photo-id'}}));
  expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:protected-photo');
  await act(async()=>root.render(<InsightPhoto src="blob:local-draft" alt="未保存"/>));
  expect(revoke).toHaveBeenCalledWith('blob:protected-photo');
  expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:local-draft');
  expect(request).toHaveBeenCalledTimes(1);
 } finally {await act(async()=>root.unmount());vi.unstubAllGlobals();}
});

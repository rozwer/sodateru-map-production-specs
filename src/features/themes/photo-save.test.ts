import { describe, expect, it, vi } from 'vitest';
import { api } from '../../app/api';
import { ApiError } from '../../../packages/api-client/index';
import { savePhoto, type PhotoAttempt } from './data';

vi.mock('../../app/api', () => ({ api: { request: vi.fn() } }));
const request = vi.mocked(api.request);
const attempt = (): PhotoAttempt => ({ file: new File(['test'], 'photo.png', { type: 'image/png' }), recordId: 'record-a', id: 'photo-new', key: 'fixed-key' });
const detail = { data: { record: { version: 7 }, media: { status: 'ready', data: { items: [{ position: 3 }] } } } };
const ready = { data: { id: 'photo-new', recordId: 'record-a', kind: 'photo', status: 'ready', contentUrl: '/media/photo-new' } };

describe('代表写真の再送', () => {
  it('応答が失われても同じ写真ID・位置・版・キーで再送する', async () => {
    request.mockReset();
    request.mockResolvedValueOnce(detail as never).mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(ready as never);
    const value = attempt(), signal = new AbortController().signal;
    await expect(savePhoto(value, signal)).rejects.toThrow('network');
    await savePhoto(value, signal);
    const uploads = request.mock.calls.filter(([operation]) => operation === 'postRecordsRecordIdMedia');
    expect(request.mock.calls.filter(([operation]) => operation === 'getRecordsRecordId')).toHaveLength(1);
    expect(uploads).toHaveLength(2);
    for (const [, input] of uploads) {
      expect(input).toMatchObject({ version: 7, idempotencyKey: 'fixed-key', path: { recordId: 'record-a' } });
      const body = (input as { body: FormData }).body;
      expect(body.get('id')).toBe('photo-new'); expect(body.get('position')).toBe('4'); expect((body.get('file') as File).name).toBe('photo.png');
    }
  });
  it('処理待ちの再試行では写真を重複追加せずGETで準備完了を確かめる', async () => {
    request.mockReset();
    const pending = { data: { ...ready.data, status: 'pending', contentUrl: null } };
    request.mockResolvedValueOnce(detail as never).mockResolvedValueOnce(pending as never).mockResolvedValueOnce(pending as never).mockResolvedValueOnce(ready as never);
    const value = attempt(), signal = new AbortController().signal;
    await expect(savePhoto(value, signal)).rejects.toThrow('写真を処理しています');
    await expect(savePhoto(value, signal)).resolves.toMatchObject({ status: 'ready' });
    expect(request.mock.calls.map(([operation]) => operation)).toEqual(['getRecordsRecordId', 'postRecordsRecordIdMedia', 'getMediaMediaId', 'getMediaMediaId']);
  });
  it('既存写真の一覧が取得できないときは位置を推測して送信しない', async () => {
    request.mockReset(); request.mockResolvedValueOnce({ data: { record: { version: 7 }, media: { status: 'failed' } } } as never);
    await expect(savePhoto(attempt(), new AbortController().signal)).rejects.toThrow('写真の一覧を取得できません');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('親記録の版競合が確定したら次の保存で最新の版と位置を読み直す', async () => {
    request.mockReset();
    request.mockResolvedValueOnce(detail as never).mockRejectedValueOnce(new ApiError(412, 'VERSION_CONFLICT', 'updated', 'request-a'))
      .mockResolvedValueOnce({ data: { record: { version: 8 }, media: { status: 'ready', data: { items: [{ position: 4 }] } } } } as never).mockResolvedValueOnce(ready as never);
    const value = attempt(), signal = new AbortController().signal;
    await expect(savePhoto(value, signal)).rejects.toMatchObject({ status: 412 });
    await savePhoto(value, signal);
    expect(request.mock.calls[3]![1]).toMatchObject({ version: 8 });
    expect((request.mock.calls[3]![1] as { body: FormData }).body.get('position')).toBe('5');
  });
});

import { api } from '../../app/api';
import type { CompanionImport } from '../../../packages/api-client/index';
export { v2Clip, v2Actions } from './v2-renderer';

export async function loadAtlas(importId: string, signal: AbortSignal): Promise<{ imported: CompanionImport; url: string }> {
  const [response, blob] = await Promise.all([
    api.request('getCompanionImport', { path: { importId }, signal }),
    api.request('getCompanionAtlas', { path: { importId }, signal }),
  ]);
  const imported = response.data;
  if (signal.aborted) throw new DOMException('画面を閉じました。', 'AbortError');
  if (imported.manifest.spriteVersionNumber !== 2) throw new Error('この相棒の表示形式に対応していません。');
  const image = await createImageBitmap(blob);
  const correctSize = image.width === 1536 && image.height === 2288;
  image.close();
  if (!correctSize) throw new Error('相棒の画像寸法を確認できません。登録はまだ行っていません。');
  if (signal.aborted) throw new DOMException('画面を閉じました。', 'AbortError');
  return { imported, url: URL.createObjectURL(blob) };
}

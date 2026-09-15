import type { DatabaseSync } from 'node:sqlite';
import { ownedRecord, recordView, type Row } from './model.ts';
import { readMedia } from '../media/content.ts';

const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const date = (value: number | null): string => value === null ? '不明' : new Date(value).toISOString();
const answer = (value: unknown): string => value === null || value === undefined ? '未回答' : value === true ? 'はい' : value === false ? 'いいえ' : String(value);
const labels: Record<string, string> = { detour: '寄り道', newPlace: '初めての場所', rest: '休憩', alone: '一人', longStay: '長い滞在', farTrip: '遠出' };

/** Standalone, readable document: escaped original text and embedded media survive deletion. */
export function exportRecordHtml(db: DatabaseSync, personId: string, id: string, mediaRoot: string): string {
  const record = recordView(db, ownedRecord(db, personId, id));
  const place = record.effectivePlaceId ? db.prepare('SELECT name FROM places WHERE id = ?').get(record.effectivePlaceId) as Row | undefined : undefined;
  const media = db.prepare('SELECT * FROM media WHERE record_id = ? ORDER BY position, id').all(id) as Row[];
  const attachments = media.map((m, index) => {
    let body: string;
    if (m.status !== 'ready') body = `<p>実体を収録できません（状態: ${escape(m.status)}）。</p>`;
    else {
      const uri = `data:${m.mime_type};base64,${readMedia(mediaRoot, m.storage_key).toString('base64')}`;
      body = m.kind === 'photo' ? `<img src="${uri}" alt="写真 ${index + 1}">` : `<${m.kind} controls src="${uri}"></${m.kind}>`;
    }
    return `<figure><figcaption>媒体 ${index + 1} — ${escape(m.kind)} / ${escape(m.mime_type)} / ${m.byte_size} bytes / ID: ${escape(m.id)}</figcaption>${body}</figure>`;
  }).join('\n');
  const activities = record.activities.map((a: Row) => `<li><h3>${escape(a.name)}</h3><dl><dt>希望・用途</dt><dd>${escape(answer(a.purpose))}</dd><dt>結果</dt><dd>${escape(answer(a.outcome))}</dd><dt>満足度</dt><dd>${escape(a.satisfaction === 'met' ? '満たした' : a.satisfaction === 'partial' ? '一部満たした' : a.satisfaction === 'not_met' ? '満たさなかった' : '未回答')}</dd><dt>またしたい</dt><dd>${escape(answer(a.repeatIntent))}</dd></dl></li>`).join('');
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>記録の控え — ${escape(id)}</title><style>body{font:16px/1.8 system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#24322b}h1,h2{line-height:1.4}section{margin:28px 0}.original,dd{white-space:pre-wrap;overflow-wrap:anywhere}dt{font-weight:600}dd{margin:0 0 12px}img,video{max-width:100%;max-height:650px}audio{width:100%}figure{margin:24px 0}figcaption,footer{color:#526257;font-size:13px}@media print{body{margin:0}figure{break-inside:avoid}}</style><h1>記録の控え</h1><p>種類: ${escape({ experience: '体験', diary: '日記', memo: 'メモ' }[record.kind as string])} / ID: ${escape(id)} / 版: ${record.version}</p><dl><dt>場所</dt><dd>${escape(place?.name ?? record.effectivePlaceId ?? '不明')}</dd><dt>開始日時（UTC）</dt><dd>${date(record.effectiveStartedAt)}</dd><dt>終了日時（UTC）</dt><dd>${date(record.effectiveEndedAt)}</dd><dt>日時の精度</dt><dd>${escape(record.effectiveTimePrecision)}</dd><dt>公開範囲</dt><dd>${escape(record.visibility)}${record.sharedWith.length ? ` — ${escape(record.sharedWith.join(', '))}` : ''}</dd></dl><section><h2>本文（原文）</h2><div class="original">${escape(record.body)}</div></section><section><h2>用途</h2><ul>${record.purposes.map((p: string) => `<li>${escape(p)}</li>`).join('')}</ul></section><section><h2>活動</h2><ol>${activities}</ol></section><section><h2>感想（原文）</h2><div class="original">${escape(record.impression)}</div></section><section><h2>確認項目</h2><dl>${Object.entries(record.periodAnswers).map(([key, value]) => `<dt>${escape(labels[key] ?? key)}</dt><dd>${escape(answer(value))}</dd>`).join('')}<dt>しおり</dt><dd>${answer(record.bookmarked)}</dd><dt>提案での利用</dt><dd>${answer(record.useForSuggestions)}</dd></dl></section><section><h2>添付媒体（保存順）</h2>${attachments || '<p>添付なし</p>'}</section><footer>作成: ${date(record.createdAt)} / 最終更新: ${date(record.updatedAt)}<br>関連訪問: ${escape(record.visitId ?? 'なし')}。記録を削除しても訪問は保持されます。<br>このファイルは書出し時点の控えです。保存後の共有変更はこのファイルには反映されません。</footer></html>`;
}

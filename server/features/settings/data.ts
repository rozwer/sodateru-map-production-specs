import type { DatabaseSync } from 'node:sqlite';
import { readPerson, readSettings } from './service.ts';

export function ownDataSummary(db: DatabaseSync, personId: string) {
  const person = readPerson(db, personId);
  const settings = readSettings(db, personId);
  const records = Number(db.prepare('SELECT COUNT(*) AS count FROM records WHERE person_id=?').get(personId)?.count ?? 0);
  return { person, settings, categories: [
    { kind: 'profile', label: 'プロフィールとアイコン', count: 1, readUrl: '/api/v1/me', exportUrl: '/api/v1/me/settings/export', deletionPreviewUrl: null, deleteUrl: '/api/v1/me/icon', version: person.version, deletionEffect: 'アイコンだけを削除します。プロフィールの名前・紹介、記録・記録媒体は残ります。' },
    { kind: 'settings', label: '利用設定', count: 1, readUrl: '/api/v1/me/settings', exportUrl: '/api/v1/me/settings/export', deletionPreviewUrl: null, deleteUrl: '/api/v1/me/settings', version: settings.version, deletionEffect: '利用設定を初期値に戻します。AIは無効、提案停止一覧は空になります。プロフィール、記録・媒体は残ります。' },
    { kind: 'records', label: '記録と添付媒体', count: records, readUrl: '/api/v1/records', exportUrl: null, deletionPreviewUrl: null, deleteUrl: null, version: null, deletionEffect: '記録一覧で対象を選び、各記録の削除前確認と文書書出しを使います。訪問は残ります。' },
  ], recordActions: { exportTemplate: '/api/v1/records/{recordId}/export', deletionPreviewTemplate: '/api/v1/records/{recordId}/deletion-preview', deleteTemplate: '/api/v1/records/{recordId}' } };
}

const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const yes = (value: boolean) => value ? '有効' : '無効';
export function exportSettingsHtml(db: DatabaseSync, personId: string) {
  const person = readPerson(db, personId);
  const s = readSettings(db, personId);
  const rows = [
    ['表示名', person.name], ['自己紹介', person.bio], ['プロフィール公開範囲', { private: '本人のみ', friends: '友達', public: '公開' }[s.profileVisibility]],
    ['文字サイズ', { standard: '標準', large: '大きい', extraLarge: 'とても大きい' }[s.display.fontSize]], ['動きを減らす', yes(s.display.reduceMotion)],
    ['位置情報の利用', yes(s.location.enabled)], ['軌跡の保存', yes(s.location.saveTrack)], ['写真の利用', yes(s.media.photosEnabled)], ['マイクの利用', yes(s.media.microphoneEnabled)],
    ['AIの利用', yes(s.ai.enabled)], ['AIへ記録を送る', yes(s.ai.allowRecords)], ['AIへ位置を送る', yes(s.ai.allowLocation)], ['AIへ媒体を送る', yes(s.ai.allowMedia)], ['AIへプロフィールを送る', yes(s.ai.allowProfile)],
    ['通知', yes(s.notifications.enabled)], ['通知のタイミング', s.notifications.timing === 'daily' ? `毎日 ${s.notifications.dailyAt} (${s.notifications.timeZone})` : '随時'],
    ['記録の保存期間', s.retention.recordsDays === null ? '期限なし' : `${s.retention.recordsDays}日`], ['軌跡の保存期間', s.retention.trackDays === null ? '期限なし' : `${s.retention.trackDays}日`],
    ['提案', yes(s.suggestions.enabled)], ['提案のタイミング', s.suggestions.timing === 'onOpen' ? '自分で開いたとき' : '継続して受け取る'], ['まとめの対象期間', `${s.suggestions.summaryDays}日`],
  ];
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>プロフィールと利用設定の控え</title><style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;line-height:1.7;color:#24342d}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #ddd;white-space:pre-wrap}th{width:38%}h1{font-size:26px}</style><body><h1>プロフィールと利用設定の控え</h1><p>保存日時：${escape(new Date().toISOString())}<br>プロフィール版 ${person.version} ／ 設定版 ${s.version}</p><table>${rows.map(([label, value]) => `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`).join('')}</table><h2>提案を停止している対象</h2>${s.suggestions.stopped.length ? `<ul>${s.suggestions.stopped.map(stop => `<li>場所：${escape(stop.placeId ?? 'すべて')} ／ 活動：${escape(stop.activity ?? 'すべて')}</li>`).join('')}</ul>` : '<p>停止対象はありません。</p>'}<p>記録と添付媒体の控えは、記録一覧で各記録の文書書出しを使って保存できます。</p></body></html>`;
}

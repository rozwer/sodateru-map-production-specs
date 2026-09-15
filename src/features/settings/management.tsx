import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../../app/contracts';
import { api } from '../../app/api';
import type { OwnDataSummary, RecordView } from '../../../packages/api-client/index';
import { Card, Entry, Note, Toggle } from './ui';
import { useSettingsEditor, errorText } from './editor';
import { EditorFeedback, EditorSave, BrowserPermissionStatus } from './editor-ui';

export function LocationSettings({ scopeKey, active = true }: ScreenProps) {
  const editor = useSettingsEditor(scopeKey, active);
  const value = editor.draft?.settings.location;
  const [permissionError, setPermissionError] = useState('');
  return <div className="settings-screen"><EditorFeedback editor={editor}/>{value && <><fieldset disabled={editor.busy}><Card title="位置情報の利用" icon="pin"><Toggle label="位置情報を利用する" description="現在地を使う操作を許可します。" value={value.enabled} onChange={enabled => editor.updateSettings({ location: { ...value, enabled } })}/><Toggle label="移動の軌跡を保存する" description="記録する設定と端末の位置情報の許可は別です。" value={value.saveTrack} onChange={saveTrack => editor.updateSettings({ location: { ...value, saveTrack } })}/><BrowserPermissionStatus name="geolocation"/><button type="button" className="settings-pill" onClick={() => { setPermissionError(''); if (!navigator.geolocation) { setPermissionError('この端末では位置情報を利用できません。'); return; } navigator.geolocation.getCurrentPosition(() => setPermissionError('現在地を取得できました。'), e => setPermissionError(e.code === 1 ? '位置情報の権限がありません。ブラウザのサイト設定から変更できます。' : '現在地を取得できませんでした。場所を変えて再試行してください。'), { timeout: 10000 }); }}>端末の許可を確認する</button>{permissionError && <p role="status">{permissionError}</p>}</Card><Note>設定をオフにしても、保存済みの記録は削除されません。</Note></fieldset><EditorSave editor={editor} onSave={() => void editor.save({ location: value })}/></>}</div>;
}
export function MediaSettings({ scopeKey, active = true }: ScreenProps) {
  const editor = useSettingsEditor(scopeKey, active);
  const value = editor.draft?.settings.media;
  const [message, setMessage] = useState('');
  return <div className="settings-screen"><EditorFeedback editor={editor}/>{value && <><fieldset disabled={editor.busy}><Card title="写真・マイク" icon="camera"><Toggle label="写真を利用する" description="自分で選んだ写真を記録やプロフィールに使います。" value={value.photosEnabled} onChange={photosEnabled => editor.updateSettings({ media: { ...value, photosEnabled } })}/><Note>写真はファイル選択時に自分で指定します。写真ライブラリ全体の権限をアプリから確認することはできません。</Note><Toggle label="マイクを利用する" description="音声を入力するときにマイクを使います。" value={value.microphoneEnabled} onChange={microphoneEnabled => editor.updateSettings({ media: { ...value, microphoneEnabled } })}/><BrowserPermissionStatus name="microphone"/><button type="button" className="settings-pill" onClick={async () => { setMessage(''); try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(track => track.stop()); setMessage('マイクの許可を確認できました。録音はしていません。'); } catch { setMessage('マイクを利用できません。端末・ブラウザのサイト設定で権限を確認してください。'); } }}>マイクの許可を確認する</button>{message && <p role="status">{message}</p>}</Card></fieldset><EditorSave editor={editor} onSave={() => void editor.save({ media: value })}/></>}</div>;
}
export function DataSettings({ scopeKey, navigate, active = true }: ScreenProps) {
  const editor = useSettingsEditor(scopeKey, active);
  const [summary, setSummary] = useState<OwnDataSummary | null>(null);
  const [records, setRecords] = useState<RecordView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [download, setDownload] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const acting = useRef(false);
  useEffect(() => { if (!active) return; const abort = new AbortController(); controller.current = abort; setBusy(true); setError(''); Promise.all([api.request('getMeData', { signal: abort.signal }), api.request('getRecords', { query: { limit: 20, includeUndated: true }, signal: abort.signal })]).then(([data, page]) => { if (abort.signal.aborted) return; setSummary(data.data); setRecords(page.items); setCursor(page.nextCursor); }).catch(e => { if (!abort.signal.aborted) setError(errorText(e)); }).finally(() => { if (!abort.signal.aborted) setBusy(false); }); return () => abort.abort(); }, [scopeKey, refresh, active]);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download); }, [download]);
  async function exportSettings() {
    if (acting.current) return; acting.current = true; setBusy(true); setError('');
    try { const result = await api.request('exportMeSettings', { signal: controller.current?.signal }); const blob = result instanceof Blob ? result : new Blob([result], { type:'text/html' }); setDownload(URL.createObjectURL(blob)); } catch(e) { if (!controller.current?.signal.aborted) setError(errorText(e)); } finally { acting.current = false; setBusy(false); }
  }
  async function resetSettings() {
    if (!editor.savedSettings || acting.current) return; acting.current = true; setBusy(true); setError('');
    try { await api.request('resetMeSettings', { version: editor.savedSettings.version, signal: controller.current?.signal }); setConfirm(false); editor.reloadSaved(); setRefresh(x => x + 1); window.dispatchEvent(new Event('sodateru:settings-changed')); } catch(e) { if (!controller.current?.signal.aborted) setError(errorText(e)); } finally { acting.current = false; setBusy(false); }
  }
  const retention = editor.draft?.settings.retention;
  return <div className="settings-screen" onKeyDown={event => { if (confirm && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setConfirm(false); } }}><EditorFeedback editor={editor}/>{error && <div role="alert" className="settings-status">{error}<button type="button" className="settings-pill" onClick={() => setRefresh(x => x + 1)}>再取得</button></div>}{retention && <><Card title="保存期間" icon="database"><div className="settings-stack">{(['recordsDays','trackDays'] as const).map((key, i) => <label key={key}>{i ? '移動の軌跡' : '記録'}<select value={retention[key] ?? 'unlimited'} disabled={editor.busy} onChange={e => editor.updateSettings({ retention: { ...retention, [key]: e.target.value === 'unlimited' ? null : Number(e.target.value) } })}><option value="unlimited">無期限</option>{[30,90,365,...(retention[key] !== null && ![30,90,365].includes(retention[key]!) ? [retention[key]!] : [])].map(days => <option key={days} value={days}>{days}日</option>)}</select></label>)}</div><Note>保存期間の変更では、過去データをその場で一括削除しません。</Note></Card><EditorSave editor={editor} onSave={() => void editor.save({ retention })}/></>}{summary && <Card title="保存されているデータ" icon="database">{summary.categories.map(item => <div key={item.kind} className="settings-row"><div><strong>{item.label}</strong><small>{item.deletionEffect}</small></div><span>{item.count}件</span></div>)}</Card>}<Card title="書き出しと初期化" icon="settings"><div className="settings-actions"><button className="settings-pill" type="button" disabled={busy || !summary} onClick={() => void exportSettings()}>プロフィールと設定を書き出す</button><button className="settings-pill" type="button" disabled={busy || !editor.savedSettings} onClick={() => setConfirm(true)}>設定を初期値に戻す</button></div>{download && <p><a href={download} download="育てる地図-プロフィールと設定.html">作成した文書をダウンロード</a></p>}{confirm && <div className="settings-status"><p>設定を初期値へ戻します。名前・紹介・写真・記録は保持されます。</p><div className="settings-actions"><button type="button" className="settings-pill" disabled={busy} onClick={() => void resetSettings()}>初期値に戻す</button><button type="button" className="settings-pill" disabled={busy} onClick={() => setConfirm(false)}>戻る</button></div></div>}</Card><Card title="記録の確認・削除" icon="history">{records.map(record => <Entry key={record.id} label={record.body.slice(0,60) || '本文のない記録'} description={record.effectiveStartedAt === null ? '日付不明' : new Date(record.effectiveStartedAt).toLocaleDateString('ja-JP')} icon="history" onClick={() => navigate('record-detail', { recordId: record.id })}/>)}{!busy && !records.length && <Note>保存された記録はありません。</Note>}{cursor && <button type="button" className="settings-pill" disabled={busy} onClick={async () => { if (acting.current) return; acting.current = true; setBusy(true); try { const page = await api.request('getRecords', { query: { limit:20, includeUndated:true, cursor }, signal:controller.current?.signal }); setRecords(previous => [...previous, ...page.items.filter(item => !previous.some(old => old.id === item.id))]); setCursor(page.nextCursor); } catch(e) { setError(errorText(e)); } finally { acting.current = false; setBusy(false); } }}>続きを表示</button>}</Card></div>;
}

export function AISettings({ scopeKey, active = true }: ScreenProps) {
  const editor = useSettingsEditor(scopeKey, active);
  const value = editor.draft?.settings.ai;
  return <div className="settings-screen"><EditorFeedback editor={editor}/>{value && <><fieldset disabled={editor.busy}><Card title="AIの利用" icon="sparkles"><Toggle label="AIを利用する" description="地図づくりや振り返りのサポートに使います。" value={value.enabled} onChange={enabled => editor.updateSettings({ ai: { ...value, enabled } })}/>{(['allowRecords','allowLocation','allowMedia','allowProfile'] as const).map((key,index) => <Toggle key={key} label={['記録を使う','場所を使う','写真・音声を使う','プロフィールを使う'][index]!} value={value[key]} onChange={allowed => editor.updateSettings({ ai: { ...value, [key]: allowed } })}/>)}</Card><Note>この画面では利用する範囲だけを保存します。本文や参照先は、送信前の確認画面で確かめられます。変更だけで相談を送信することはありません。</Note></fieldset><EditorSave editor={editor} onSave={() => void editor.save({ ai: value })}/></>}</div>;
}

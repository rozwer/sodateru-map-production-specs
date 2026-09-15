import {useEffect,useState} from 'react';
import {Card} from './ui';
import {useSettingsEditor} from './editor';
type Editor = ReturnType<typeof useSettingsEditor>;
export function EditorFeedback({ editor }: { editor: Editor }) {
  return <>{editor.busy && <p className="settings-status" role="status">読み込み・保存中です…</p>}{editor.error && <div className="settings-status" role="alert">{editor.error}<br/><button type="button" className="settings-pill" onClick={editor.refresh} disabled={editor.busy}>現在の保存値を再取得</button></div>}{editor.conflict && <Card title="ほかの画面で変更されています"><p>入力は残っています。現在の保存値を確認してから保存してください。</p><dl>{editor.savedPerson && <div className="settings-row"><dt>現在の表示名</dt><dd>{editor.savedPerson.name}</dd></div>}{editor.savedSettings && <><div className="settings-row"><dt>現在の文字サイズ</dt><dd>{({standard:'標準',large:'大',extraLarge:'特大'})[editor.savedSettings.display.fontSize]}</dd></div><div className="settings-row"><dt>現在の提案条件</dt><dd>{editor.savedSettings.suggestions.timing === 'onOpen' ? '自分で開いたとき' : '常に受け取る'}／過去{editor.savedSettings.suggestions.summaryDays}日／停止{editor.savedSettings.suggestions.stopped.length}件</dd></div><div className="settings-row"><dt>保存値の更新</dt><dd>{new Date(editor.savedSettings.updatedAt).toLocaleString('ja-JP')}</dd></div></>}</dl><button type="button" className="settings-pill" onClick={editor.discard}>保存値を使う</button></Card>}{editor.notice && <p role="status" className="settings-status">{editor.notice}</p>}{editor.dirty && <p className="settings-dirty">未保存の変更があります</p>}</>;
}
export function EditorSave({ editor, onSave }: { editor: Editor; onSave: () => void }) { return <button type="button" className="settings-save" disabled={editor.busy || !editor.draft} onClick={onSave}>{editor.conflict ? '入力内容で保存' : '保存'}</button>; }
export function BrowserPermissionStatus({ name }: { name: 'geolocation' | 'microphone' | 'notifications' }) {
  const [status, setStatus] = useState('確認中');
  useEffect(() => { let live = true; let permission: PermissionStatus | undefined; const update = () => { if (live && permission) setStatus(({ granted:'許可済み', denied:'権限なし', prompt:'未許可（操作時に確認）' })[permission.state]); }; if (!navigator.permissions) { setStatus('このブラウザでは確認できません'); return; } navigator.permissions.query({ name: name as PermissionName }).then(p => { permission = p; update(); p.addEventListener('change', update); }).catch(() => { if (live) setStatus('このブラウザでは確認できません'); }); return () => { live = false; permission?.removeEventListener('change', update); }; }, [name]);
  return <small className="settings-permission">端末・ブラウザの権限：{status}</small>;
}

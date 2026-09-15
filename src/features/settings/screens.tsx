import { useEffect, useState } from 'react';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { api } from '../../app/api';
import { LocationSettings, MediaSettings, DataSettings, AISettings } from './management';
import { EditorFeedback, EditorSave, BrowserPermissionStatus } from './editor-ui';
import { Card, Entry, Glyph, Note, Toggle } from './ui';
import { useSettingsEditor, errorText } from './editor';
import type { Settings } from '../../../packages/api-client/index';
import './settings.css';

function SettingsScreen(props: ScreenProps) { return props.route.params.section === 'ai' ? <AISettings {...props}/> : <SettingsMenu {...props}/>; }
const onOff = (value: boolean) => value ? 'オン' : 'オフ';
function SettingsMenu({ navigate, scopeKey, active = true }: ScreenProps) {
  const editor = useSettingsEditor(scopeKey, active);
  const settings = editor.savedSettings;
  return <div className="settings-screen"><p className="settings-intro">育てる地図を、あなたらしく使うための<br/>各種設定を管理できます。</p><Card className="settings-menu">
    <Entry label="プロフィール" description="表示名や自己紹介、見た目の設定" icon="person" onClick={() => navigate('profile-settings')} testId="settings--profile"/>
    <Entry label="位置情報" description="現在地の利用と記録の設定" icon="pin" onClick={() => navigate('$location-settings')}/>
    <Entry label="写真・マイク" description="写真の保存やマイクの利用設定" icon="camera" onClick={() => navigate('$media-settings')}/>
    <Entry label="AIの利用" description="地図づくりのサポート設定" icon="sparkles" onClick={() => navigate('settings', { section: 'ai' })}/>
    <Entry label="提案とまとめ" description="おすすめや振り返りの条件" icon="sparkles" onClick={() => navigate('suggestion-settings')}/>
    <Entry label="データの管理" description="保存データの確認・削除・書き出し" icon="database" onClick={() => navigate('$data-settings')}/>
    <Entry label="表示と動き" description="文字サイズやアニメーションの設定" icon="settings" onClick={() => navigate('profile-settings')}/>
  </Card>{settings && <section className="settings-summary"><Glyph name="shield"/><div><strong>現在の設定の概要</strong><p>位置情報：{onOff(settings.location.enabled)}　写真：{onOff(settings.media.photosEnabled)}<br/>マイク：{onOff(settings.media.microphoneEnabled)}　AIの利用：{onOff(settings.ai.enabled)}<br/>提案：{onOff(settings.suggestions.enabled)}　記録の保存期間：{settings.retention.recordsDays === null ? '無期限' : `${settings.retention.recordsDays}日`}</p></div></section>}<EditorFeedback editor={editor}/></div>;
}
function ProfileScreen({ scopeKey, active = true }: ScreenProps) {
  const editor = useSettingsEditor(scopeKey, active);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const draft = editor.draft;
  useEffect(() => { if (!draft?.photo) { setPreview(null); return; } const url = URL.createObjectURL(draft.photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [draft?.photo]);
  useEffect(() => {
    setAvatar(null); setAvatarError('');
    if (!active || !draft?.person.avatarUrl) return;
    const controller = new AbortController(); let url: string | null = null;
    api.request('getMeIcon', { signal: controller.signal }).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setAvatar(url);
    }).catch(error => { if (!controller.signal.aborted) setAvatarError(errorText(error)); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [scopeKey, active, draft?.person.avatarUrl, editor.savedPerson?.version]);
  const [photoError, setPhotoError] = useState('');
  return <div className="settings-screen"><EditorFeedback editor={editor}/>{draft && <><fieldset disabled={editor.busy}><Card><div className="settings-avatar-row"><div className="settings-avatar">{(preview || (!draft.removePhoto && avatar)) ? <img src={preview || avatar!} alt="プロフィール写真"/> : <Glyph name="person"/>}<label aria-label="写真を変更"><Glyph name="camera"/><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="写真を変更" onChange={e => { const photo = e.target.files?.[0]; if (!photo) return; if (photo.size > 50 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(photo.type)) { setPhotoError('JPEG・PNG・WebPの50MiB以下の写真を選んでください。'); return; } setPhotoError(''); editor.update(d => ({ ...d, photo, removePhoto: false })); }}/></label></div><label>表示名<input value={draft.person.name} maxLength={20} onChange={e => editor.update(d => ({ ...d, person: { ...d.person, name: e.target.value } }))}/><small className="settings-count">{[...draft.person.name].length}/20</small></label></div>{avatarError && <p role="status">写真を読み込めませんでした。{avatarError}</p>}{photoError && <p role="alert">{photoError}</p>}{(draft.person.avatarUrl || draft.photo) && <button type="button" className="settings-pill" onClick={() => editor.update(d => ({ ...d, photo: null, removePhoto: true }))}>写真を外す</button>}<label><span className="settings-field-head">自分の紹介<small>{[...draft.person.bio].length}/200</small></span><textarea value={draft.person.bio} maxLength={200} onChange={e => editor.update(d => ({ ...d, person: { ...d.person, bio: e.target.value } }))}/></label></Card><Card><strong>文字サイズ</strong><small>アプリ内の文字の大きさを調整できます。</small><div className="settings-segments" aria-label="文字サイズ">{(['standard','large','extraLarge'] as const).map((size, i) => <button key={size} type="button" aria-pressed={draft.settings.display.fontSize === size} onClick={() => editor.updateSettings({ display: { ...draft.settings.display, fontSize: size } })}>{['標準','大','特大'][i]}</button>)}</div><div className="settings-divider"/><Toggle label="動きを減らす" description="地図の動きや画面のアニメーションを控えます。" value={draft.settings.display.reduceMotion} onChange={reduceMotion => editor.updateSettings({ display: { ...draft.settings.display, reduceMotion } })}/><div className="settings-divider"/><label>通知<small>地図からのお知らせを受け取るタイミングです。</small><select value={!draft.settings.notifications.enabled ? 'off' : draft.settings.notifications.timing} onChange={e => editor.updateSettings({ notifications: { ...draft.settings.notifications, enabled: e.target.value !== 'off', timing: e.target.value === 'immediate' ? 'immediate' : 'daily' } })}><option value="off">自分で開いたときだけ</option><option value="immediate">すぐに受け取る</option><option value="daily">毎日、決まった時刻</option></select></label>{draft.settings.notifications.enabled && draft.settings.notifications.timing === 'daily' && <label>通知する時刻<input type="time" value={draft.settings.notifications.dailyAt} onChange={e => editor.updateSettings({ notifications: { ...draft.settings.notifications, dailyAt: e.target.value } })}/><small>{draft.settings.notifications.timeZone}</small></label>}<BrowserPermissionStatus name="notifications"/></Card></fieldset><EditorSave editor={editor} onSave={() => void editor.save({ display: draft.settings.display, notifications: draft.settings.notifications }, true)}/></>}</div>;
}
function SuggestionsScreen({ scopeKey, active = true }: ScreenProps) {
  const editor = useSettingsEditor(scopeKey, active);
  const value = editor.draft?.settings.suggestions;
  return <div className="settings-screen"><p className="settings-intro">あなたのペースで心地よく使えるように、<br/>提案やまとめの条件を設定できます。</p><EditorFeedback editor={editor}/>{value && <><fieldset disabled={editor.busy}><Card title="提案のタイミング" icon="sparkles"><small>おすすめの場所や振り返りの提案を表示するタイミングを選びます。</small><>{!value.enabled && <div className="settings-status"><p>提案は停止中です。</p><button type="button" className="settings-pill" onClick={() => editor.updateSettings({ suggestions: { ...value, enabled: true } })}>提案を再開する</button></div>}</>{(['onOpen','continuous'] as const).map((timing, i) => <label className="settings-radio" key={timing}><input type="radio" name="suggestion-timing" checked={value.timing === timing} onChange={() => editor.updateSettings({ suggestions: { ...value, timing } })}/><span><strong>{i ? '常に受け取る' : '自分で開いたとき'}</strong><small>{i ? 'おでかけ中などにも提案を表示します。' : 'アプリを開いたときに提案を表示します。'}</small></span></label>)}</Card><Card title="まとめに使う記録の範囲" icon="history"><small>どのくらいの期間の記録をもとに、振り返りやまとめを作成するかを選びます。</small><label><span className="settings-sr-only">まとめの対象期間</span><select value={value.summaryDays} onChange={e => editor.updateSettings({ suggestions: { ...value, summaryDays: Number(e.target.value) } })}>{[7,30,90,365,...(![7,30,90,365].includes(value.summaryDays) ? [value.summaryDays] : [])].map(days => <option key={days} value={days}>{({7:'過去1週間',30:'過去1か月',90:'過去3か月',365:'過去1年'} as Record<number,string>)[days] || `過去${days}日`}</option>)}</select></label></Card><Card title="提案を止めた場所と活動" icon="stop" className="settings-stop"><small>この場所や活動では、おすすめの提案を表示しません。</small>{value.stopped.length ? value.stopped.map(item => <Stopped active={active} key={JSON.stringify(item)} item={item} remove={() => editor.updateSettings({ suggestions: { ...value, stopped: value.stopped.filter(x => x !== item) } })}/>) : <p className="settings-note">提案を停止している場所と活動はありません。</p>}</Card><Card title="感想の低評価と停止" icon="thumb" className="settings-stop"><small>気になる提案があったら、低評価でお知らせください。くり返し表示しないように調整します。</small><Note>低評価した提案は、今後表示されにくくなります。特定の提案を完全に停止するには、場所と活動ごとの停止を設定してください。停止は解除するまで続きます。</Note></Card></fieldset><EditorSave editor={editor} onSave={() => void editor.save({ suggestions: value })}/></>}</div>;
}
function Stopped({ item, remove, active }: { active: boolean; item: Settings['suggestions']['stopped'][number]; remove: () => void }) {
  const [name, setName] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{url:string; attribution:string|null} | null>(null);
  const placeId = 'placeId' in item ? item.placeId : null;
  const activity = 'activity' in item ? item.activity : null;
  useEffect(() => { setName(null); setPhoto(null); if (!active || !placeId) return; const controller = new AbortController(); api.request('getPlacesPlaceId', { path: { placeId }, signal: controller.signal }).then(r => { if (controller.signal.aborted) return; setName(r.data.place.name); const photo = r.data.photos?.find(photo => /^https?:\/\//.test(photo.url)); setPhoto(photo ? {url:photo.url,attribution:photo.attribution} : null); }).catch(() => {}); return () => controller.abort(); }, [placeId, active]);
  return <div className="settings-stopped"><span className="settings-stopped-picture">{photo ? <img src={photo.url} alt={name || '停止した場所'} title={photo.attribution || undefined} onError={() => setPhoto(null)}/> : <span aria-label="場所の写真なし"><Glyph name="pin"/></span>}</span><div><small>{placeId ? name || `場所 ${placeId}` : 'すべての場所'}</small><strong>{activity || 'すべての活動'}</strong></div><button type="button" className="settings-pill" onClick={remove}>解除する</button></div>;
}
const layout = { header: 'back', bottomNav: false, background: 'soft' } as const;
// The 08_23_29 reference shows these three pages without an outer map.
const referenceLayout = { ...layout, presentation: 'fullscreen' } as const;
export const screens: ScreenDefinition[] = [
  { id:'$location-settings', title:'位置情報', component:LocationSettings, layout },
  { id:'$media-settings', title:'写真・マイク', component:MediaSettings, layout },
  { id:'$data-settings', title:'データの管理', component:DataSettings, layout },
  { id:'settings', title:'設定', component:SettingsScreen, layout:referenceLayout },
  { id:'profile-settings', title:'プロフィールと表示', component:ProfileScreen, layout:referenceLayout },
  { id:'suggestion-settings', title:'提案とまとめの条件', component:SuggestionsScreen, layout:referenceLayout },
];

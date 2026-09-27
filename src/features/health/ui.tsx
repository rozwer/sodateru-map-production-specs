import { useState } from 'react';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { Card, Entry, Glyph, Note, Toggle } from '../settings/ui';
import { useSession } from '../../app/session';
import './health.css';

function HealthHeader({ back, parent, title }: { back: () => void; parent: string; title: string }) {
  return <header className="health-header"><button type="button" onClick={back} aria-label="戻る"><Glyph name="back"/><span>{parent}</span></button><h1>{title}</h1></header>;
}

function HealthConnect({ navigate, back }: ScreenProps) {
  const [fileError, setFileError] = useState('');
  return <div className="settings-screen health-screen"><HealthHeader back={back} parent="自分を知る" title="健康データの連携"/>
    <p className="health-intro">日々の歩き・動くデータを取り込んで、わたしの地図に反映しましょう。</p>
    <Card title="現在の連携状況" icon="shield"><div className="health-connection"><span className="health-connection-icon"><Glyph name="shield"/></span><div><strong>未連携</strong><small>まだ健康データは連携されていません。</small></div></div><button type="button" className="settings-detail-link" onClick={() => navigate('health-status')}>くわしく見る<span aria-hidden="true">›</span></button></Card>
    <h2 className="health-section-title">健康データを読み込む方法</h2>
    <Card><Entry label="対応する iPhoneアプリ" description="ヘルスケアアプリから、歩数や活動時間などのデータを連携します。" icon="shield" onClick={() => navigate('health-permissions', { source: 'app' })}/></Card>
    <Card><label className="health-file"><span className="settings-entry-icon"><Glyph name="database"/></span><span><strong>書き出したファイル</strong><small>ヘルスケアアプリから書き出したXMLファイルを選びます。</small></span><span aria-hidden="true">›</span><input type="file" accept=".xml,text/xml,application/xml" aria-label="書き出したXMLファイルを選ぶ" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!file.name.toLowerCase().endsWith('.xml')) { setFileError('XMLファイルを選んでください。'); return; } setFileError(''); navigate('health-permissions', { source: 'file', filename: file.name }); }}/></label></Card>
    {fileError && <p className="settings-status" role="alert">{fileError}</p>}
    <Note>画面確認用です。ブラウザからiPhoneの健康データへ直接アクセスせず、選択したファイルも読み込み・保存しません。</Note>
  </div>;
}

const itemLabels = ['歩数', '歩行距離', '活動時間'] as const;
function HealthPermissions({ route, navigate, back }: ScreenProps) {
  const [items, setItems] = useState<boolean[]>([true, true, true]);
  const [period, setPeriod] = useState('month');
  const [store, setStore] = useState(true);
  const [ai, setAi] = useState(false);
  const [message, setMessage] = useState('');
  const cancel = () => { setItems([true, true, true]); setPeriod('month'); setStore(true); setAi(false); setMessage(''); back(); };
  const source = route.params.source === 'file' ? '選択したXMLファイル' : '対応するiPhoneアプリ';
  return <div className="settings-screen health-screen"><HealthHeader back={back} parent="健康データの連携" title="利用する項目と期間"/>
    <p className="health-intro">地図に反映する健康データの項目と期間を選んでください。</p>
    <p className="health-preview" role="status">{source}{route.params.filename ? `（${route.params.filename}）` : ''}</p>
    <Card title="利用する項目"><small>地図に反映する項目を選択してください。</small>{itemLabels.map((label, index) => <label key={label} className="health-item"><input type="checkbox" checked={items[index]} onChange={event => setItems(current => current.map((value, at) => at === index ? event.target.checked : value))}/><span><strong>{label}</strong><small>{['1日の歩数を地図に反映します。','移動した距離を地図に反映します。','歩くなどの活動時間を地図に反映します。'][index]}</small></span></label>)}</Card>
    <Card title="対象期間"><small>取り込む期間を選んでください。</small><label className="health-period"><span className="settings-sr-only">対象期間</span><select value={period} onChange={event => setPeriod(event.target.value)}><option value="month">今月</option><option value="week">過去1週間</option><option value="three-months">過去3か月</option><option value="year">過去1年</option></select></label></Card>
    <Card><Toggle label="アプリ内に保存" description="取り込んだデータをこのアプリに保存します。" value={store} onChange={setStore}/></Card>
    <Card><Toggle label="AIへの利用（任意）" description="同意した健康データを提案などに利用します。" value={ai} onChange={setAi}/><Note>AI利用は任意で、保存とは別に選択できます。</Note></Card>
    {message && <p className="settings-status" role="alert">{message}</p>}
    <div className="health-actions"><button type="button" className="settings-pill" onClick={cancel}>今はしない</button><button type="button" className="settings-save" onClick={() => { if (!items.some(Boolean)) { setMessage('利用する項目を1つ以上選んでください。'); return; } setMessage(''); navigate('health-status', { preview: 'selected', source: route.params.source || 'app', items: items.map((selected, index) => selected ? itemLabels[index] : '').filter(Boolean).join('・'), period, store: String(store), ai: String(ai) }); }}>許可して続ける</button></div>
    <Note>選択した項目を確認できます。</Note>
  </div>;
}

function HealthStatus({ route, navigate, back }: ScreenProps) {
  const session = useSession();
  const demo = session?.dataMode === 'demo';
  const stopKey = `sodateru.health-example-stopped:${session?.session?.person.id ?? 'none'}`;
  const [stopped, setStopped] = useState(() => demo && localStorage.getItem(stopKey) === 'true');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const preview = route.params.preview === 'selected' && !deleted;
  const sampleMetric = route.params.items?.includes('歩数') ? '歩数' : route.params.items?.includes('歩行距離') ? '歩行距離' : '活動時間';
  const sampleValues = sampleMetric === '歩数' ? ['6,420', '7,150', '5,830', '8,010', '6,760', '7,490', '6,980']
    : sampleMetric === '歩行距離' ? ['4.3km', '4.8km', '3.9km', '5.4km', '4.5km', '5.0km', '4.7km']
      : ['42分', '51分', '38分', '57分', '46分', '53分', '49分'];
  return <div className="settings-screen health-screen"><HealthHeader back={back} parent="自分を知る" title="健康データの連携"/>
    <p className="health-intro">連携の状況を確認したり、取り込みの停止や保存データの削除ができます。</p>
    <p className="health-preview" role="status">{preview ? '選択した項目を表示しています。' : '現在の連携は未設定です。'}</p>
    <Card><div className="settings-row"><strong>取得元</strong><span>{preview ? route.params.source === 'file' ? '選択したXML' : 'iPhoneアプリ' : '未連携'}</span></div><div className="settings-row"><strong>最終取込み</strong><span>未取得</span></div><div className="settings-row"><strong>選択した項目</strong><span>{preview ? route.params.items : 'なし'}</span></div><button type="button" className="settings-detail-link" onClick={() => navigate('data-sources')}>データの取得元を確認<span aria-hidden="true">›</span></button></Card>
    <Card title="データの取得状況（過去7日間）"><p className="health-days">{Array.from({length: 7}, (_, index) => <span key={index}><strong>{demo && preview ? sampleValues[index] : '—'}</strong><small>{index + 1}日前<br/>{demo && preview ? sampleMetric : '未取得'}</small></span>)}</p><Note>{demo && preview ? '過去7日間の推移です。' : '未取得は0ではありません。健康データの値はありません。'}</Note></Card>
    <button type="button" className="health-danger" disabled={!preview || stopped} onClick={() => { setStopped(true); if (demo) localStorage.setItem(stopKey, 'true'); }}>新しいデータの取り込みを停止 <span aria-hidden="true">›</span></button>
    <small>停止すると新しいデータだけを取り込みません。すでに保存されたデータは残ります。{stopped && '（停止中）'}</small>
    {preview && stopped && <button type="button" className="settings-pill" onClick={() => { setStopped(false); if (demo) localStorage.removeItem(stopKey); }}>取り込みを再開</button>}
    <button type="button" className="health-danger" disabled={!preview} onClick={() => setConfirmDelete(true)}>このアプリの保存データを削除 <span aria-hidden="true">›</span></button>
    <small>iPhoneのヘルスケアアプリにある原本は削除されません。</small>
    {confirmDelete && <div className="settings-status"><p>このアプリの健康データだけを削除しますか？ 実データは保存されていません。</p><div className="settings-actions"><button type="button" className="settings-pill" onClick={() => setConfirmDelete(false)}>取消</button><button type="button" className="settings-pill" onClick={() => { setDeleted(true); setConfirmDelete(false); setStopped(false); if (demo) localStorage.removeItem(stopKey); }}>削除</button></div></div>}
    {!preview && <Note>未連携のため停止・削除はできません。実際の取込と権限確認は未接続です。</Note>}
  </div>;
}

const layout = { presentation: 'fullscreen', header: 'none', bottomNav: false, background: 'soft' } as const;
export const healthScreens: ScreenDefinition[] = [
  { id: 'health-connect', title: '健康データの連携', component: HealthConnect, layout },
  { id: 'health-permissions', title: '利用する項目と期間', component: HealthPermissions, layout },
  { id: 'health-status', title: '健康データの連携状態', component: HealthStatus, layout },
];

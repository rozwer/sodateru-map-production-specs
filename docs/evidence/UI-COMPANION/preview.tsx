import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CreationView, ImportView, SettingsView, type CreationForm, type ImportForm, type Notice, type SettingsForm } from '../../../src/features/companion/views';
import './preview.css';
import { v2Actions, v2Clip } from '../../../src/features/companion/v2-renderer';

function Preview() {
  const [page, setPage] = useState('settings');
  const [settings, setSettings] = useState<SettingsForm>({ selectedId: null, visible: true, size: 'medium', reducedMotion: false });
  const [importForm, setImport] = useState<ImportForm>({ file: null, register: true, makeCurrent: false });
  const [creation, setCreation] = useState<CreationForm>({ name: '', appearance: '', image: null });
  const [notice, setNotice] = useState<Notice>();
  const sample = new URLSearchParams(location.search).has('sample');
  const [sampleImport, setSampleImport] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const atlasUrl = new URL('./fixtures/spritesheet.png', import.meta.url).href;
  useEffect(() => {
    if (!sample) return;
    setSettings(previous => ({ ...previous, selectedId: 'test-1' }));
    void fetch(new URL('./fixtures/companion-ui-test.zip', import.meta.url)).then(response => response.blob()).then(blob => { setImport(previous => ({ ...previous, file: new File([blob], 'companion-ui-test.zip') })); setSampleImport(true); });
  }, [sample]);
  const unconnected = () => setNotice({ kind: 'error', text: 'テスト表示です。API保存は行っていません。入力はこの画面に残っています。' });
  const navigate = (next: string) => { setNotice(undefined); setPage(next); };
  return <><div className="qa-banner">UI部品のテスト表示・API未接続</div><nav>{['settings', 'import', 'create'].map((id, index) => <button key={id} onClick={() => navigate(id)}>{['管理', 'ファイル取込', '制作'][index]}</button>)}</nav><main><header className="qa-header"><button aria-label="戻る" onClick={() => navigate('settings')}>‹</button><strong>{page === 'settings' ? '相棒の管理' : page === 'import' ? 'ファイルから追加' : '相棒の制作'}</strong></header>
    {page === 'settings' && <SettingsView pets={sample ? [{ id: 'test-1', name: 'テスト相棒', description: '取込・描画の確認用データです。', clip: v2Clip(atlasUrl, 'idle') }, { id: 'test-2', name: '選択確認用の相棒', clip: v2Clip(atlasUrl, 'waving') }] : []} currentId={sample ? 'test-1' : null} form={settings} onChange={setSettings} onSave={unconnected} onImport={() => navigate('import')} onCreate={() => navigate('create')} notice={notice}/>}
    {page === 'import' && <ImportView form={importForm} onChange={setImport} onFile={file => { setSampleImport(false); setConfirmed(false); setViewedIds([]); setImport({ ...importForm, file }); setNotice(file ? { kind: 'error', text: file.size > 50_000_000 ? 'ZIPは50MB以下にしてください。' : 'テスト表示のため、ZIPの構造検査は実行していません。' } : undefined); }} actions={sampleImport ? v2Actions(atlasUrl, ['idle','waving','waiting','running-right','running-left','jumping','failed','running','review', ...Array.from({length:16}, (_,i) => `gaze-${i*22.5}`)]) : []} confirmed={confirmed} viewedCount={viewedIds.length} onViewed={id => setViewedIds(previous => previous.includes(id) ? previous : [...previous, id])} onConfirm={() => { if (viewedIds.length === 25) setConfirmed(value => !value); else setNotice({kind:'info',text:'すべての動作・視線を開いて確認してください。'}); }} onRegister={unconnected} onCancel={() => navigate('settings')} notice={notice} inspected={sampleImport}/>}
    {page === 'create' && <CreationView form={creation} onChange={setCreation} onImage={image => { if (image && (image.size > 5_000_000 || !['image/png', 'image/jpeg'].includes(image.type))) { setNotice({ kind: 'error', text: '参考画像は5MB以下のJPG・PNGを選んでください。' }); return; } setCreation({ ...creation, image }); setNotice(undefined); }} onDraft={unconnected} onExport={() => { const blob = new Blob([`相棒の制作指示\n名前：${creation.name}\n外見：${creation.appearance}\n参考画像：${creation.image?.name || 'なし'}\nCodex v2互換の相棒ZIPを制作してください。`], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'companion-instructions.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} onProvider={unconnected} onGenerate={unconnected} connected={false} notice={notice}/>}
  </main></>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);

import { useEffect, useState, type ReactNode } from 'react';
import { AtlasPreview, type AtlasClip } from './AtlasPreview';
import './companion.css';

export interface Notice { kind: 'info' | 'error' | 'success'; text: string; retry?: () => void }
export interface CompanionCard { id: string; name: string; description?: string; clip?: AtlasClip }
export interface SettingsForm { selectedId: string | null; visible: boolean; size: 'small' | 'medium'; reducedMotion: boolean }
export interface ImportForm { file: File | null; register: boolean; makeCurrent: boolean }
export interface CreationForm { name: string; appearance: string; image: File | null }
export interface PreviewAction { id: string; label: string; clip: AtlasClip }

function Glyph({ name }: { name: 'file' | 'plus' | 'image' | 'cloud' | 'eye' | 'size' | 'moon' | 'export' | 'check' | 'info' | 'next' | 'close' }) {
  const paths: Record<typeof name, ReactNode> = {
    file: <><path d="M6 2h8l5 5v15H6zM14 2v6h5"/></>,
    plus: <path d="M12 4v16M4 12h16"/>, image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 18 6-6 5 4 3-3 4 5"/></>,
    cloud: <path d="M6 19a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 0 12Z"/>,
    eye: <><path d="M2 12S6 5 12 5s10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    size: <><path d="M14 3h7v7M21 3l-7 7M10 21H3v-7M3 21l7-7"/></>,
    moon: <path d="M20 16A9 9 0 0 1 9 3a9 9 0 1 0 11 13Z"/>,
    export: <><path d="M9 4H4v17h17v-9M13 3h8v8M21 3l-11 11"/></>,
    check: <path d="m5 12 5 5L20 6"/>, info: <><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7v1"/></>,
    next: <path d="m9 5 7 7-7 7"/>, close: <path d="m5 5 14 14M19 5 5 19"/>,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Message({ notice }: { notice?: Notice }) {
  return notice ? <div className={`companion-notice companion-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}><Glyph name={notice.kind === 'success' ? 'check' : 'info'}/><div>{notice.text}{notice.retry && <button type="button" onClick={notice.retry}>再試行</button>}</div></div> : null;
}

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return <header className="companion-intro"><h2>{title}</h2><p>{children}</p></header>;
}
function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return <label className="companion-switch"><input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled}/><span/></label>;
}

export function SettingsView({ pets, currentId, currentVisible = true, form, onChange, onSave, onImport, onCreate, busy, notice, dirty, loading = false, unavailable = false, extra }: {
  pets: CompanionCard[]; currentId: string | null; form: SettingsForm; onChange: (next: SettingsForm) => void;
  onSave: () => void; onImport: () => void; onCreate?: () => void; busy?: boolean; notice?: Notice; dirty?: boolean; loading?: boolean; unavailable?: boolean; currentVisible?: boolean; extra?: ReactNode;
}) {
  const current = pets.find(pet => pet.id === currentId);
  const patch = (next: Partial<SettingsForm>) => onChange({ ...form, ...next });
  return <div className="companion-page companion-settings">
    <Intro title="いっしょに地図を歩く相棒">相棒と一緒に、見つけた場所や体験を集めて<br/>あなただけの地図を育てましょう。</Intro>
    <section className="companion-card companion-current" aria-label="現在の相棒">
      <div className="companion-heading"><h3>現在の相棒</h3><span className="companion-badge">{unavailable ? '未確認' : !current ? '未選択' : currentVisible ? '表示中' : '非表示'}</span></div>
      {current ? <div className="companion-current-body"><AtlasPreview clip={current.clip} label={current.name} reducedMotion={form.reducedMotion}/><div><h3>{current.name}</h3>{current.description && <p>{current.description}</p>}<button type="button" className="companion-button" onClick={() => document.getElementById('companion-choices')?.focus()}>見た目を変更<Glyph name="next"/></button></div></div> : <p>{loading ? '相棒を読み込んでいます…' : unavailable ? '現在の相棒を確認できていません。' : '現在の相棒は未選択です。相棒を追加して選べます。'}</p>}
    </section>
    <fieldset className="companion-choices" id="companion-choices" tabIndex={-1} disabled={busy}><legend>相棒を選ぶ</legend>
      {pets.length ? <ul>{pets.map(pet => <li key={pet.id}><label className={form.selectedId === pet.id ? 'is-selected' : ''}><input type="radio" name="companion" value={pet.id} checked={form.selectedId === pet.id} onChange={() => patch({ selectedId: pet.id })}/><AtlasPreview clip={pet.clip} label={pet.name} reducedMotion={form.reducedMotion}/><strong>{pet.name}</strong></label></li>)}</ul> : <p className="companion-muted">{loading ? '読み込み中…' : unavailable ? '相棒の一覧を読み込めていません。' : '登録済みの相棒はありません。'}</p>}
    </fieldset>
    <section className="companion-card companion-options"><h3>相棒の設定</h3>
      <div className="companion-option"><Glyph name="eye"/><span>地図上に表示する</span><Toggle label="地図上に表示する" checked={form.visible} onChange={visible => patch({ visible })} disabled={busy}/></div>
      <div className="companion-option"><Glyph name="size"/><span>サイズ</span><fieldset className="companion-segment" aria-label="サイズ" disabled={busy}>{(['small', 'medium'] as const).map((size, i) => <label key={size} className={form.size === size ? 'is-selected' : ''}><input type="radio" name="companion-size" checked={form.size === size} onChange={() => patch({ size })}/>{i === 0 ? '小' : '中'}</label>)}</fieldset></div>
      <div className="companion-option"><Glyph name="moon"/><span>動きを減らす</span><Toggle label="動きを減らす" checked={form.reducedMotion} onChange={reducedMotion => patch({ reducedMotion })} disabled={busy}/></div>
      <small>移動やリアクションの動きを控えめにします。</small>
    </section>
    <div className={`companion-actions${onCreate ? '' : ' companion-actions--single'}`}><button type="button" className="companion-button" onClick={onImport}><Glyph name="file"/>ファイルから追加</button>{onCreate && <button type="button" className="companion-button" onClick={onCreate}><Glyph name="plus"/>相棒を作る</button>}</div>
    <Message notice={notice}/>{dirty && <small role="status">未保存の変更があります。</small>}
    {extra}
    <button type="button" className="companion-button companion-primary" onClick={onSave} disabled={busy || loading || unavailable}>{busy ? '保存しています…' : '保存'}</button>
  </div>;
}

function ActionPreviews({ actions, onViewed }: { actions: PreviewAction[]; onViewed: (id: string) => void }) {
  return <div className="companion-preview-grid">{actions.map(action => <figure key={action.id}><AtlasPreview clip={action.clip} label={action.label} onViewed={() => onViewed(action.id)}/><figcaption>{action.label}</figcaption></figure>)}</div>;
}
export function ImportView({ form, onChange, onFile, actions, confirmed, onViewed, onConfirm, onRegister, onCancel, busy, notice, inspected, candidate = false, viewedCount = 0 }: {
  form: ImportForm; onChange: (next: ImportForm) => void; onFile: (file: File | null) => void;
  actions: PreviewAction[]; confirmed: boolean; onViewed: (id: string) => void; onConfirm: () => void;
  onRegister: () => void; onCancel: () => void; busy?: boolean; notice?: Notice; inspected: boolean; candidate?: boolean; viewedCount?: number;
}) {
  return <div className="companion-page companion-import">
    <Intro title={candidate ? '制作した相棒を確認する' : 'ペットのファイルを選ぶ'}>{candidate ? '候補の動きを確認して、相棒として採用できます。現在の相棒は、管理画面で別に選びます。' : <>作成したペットのファイル（.zip）を選んで<br/>相棒として追加できます。</>}</Intro>
    {!candidate && <label className="companion-file companion-card"><span className="companion-circle"><Glyph name="file"/></span><span><strong>ファイルを選択</strong><small>.zip ファイル（最大50MB）</small></span><Glyph name="next"/><input type="file" accept=".zip,application/zip" aria-label="ZIPファイルを選択（最大50MB）" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ''; }}/></label>}
    {form.file && <div className="companion-selected-file"><span className="companion-circle small"><Glyph name={inspected ? 'check' : 'file'}/></span><span><strong>{form.file.name}</strong><small>{(form.file.size / 1_000_000).toLocaleString('ja-JP', { maximumFractionDigits: form.file.size > 50_000_000 ? 6 : 2 })} MB</small></span><button type="button" aria-label="選択を外す" className="companion-icon-button" disabled={busy} onClick={() => onFile(null)}><Glyph name="close"/></button></div>}
    <section className="companion-preview-section"><h3>プレビュー</h3>{actions.length ? <><ActionPreviews actions={actions.slice(0, 3)} onViewed={onViewed}/>{actions.length > 3 && <details className="companion-more-actions"><summary>ほかの動作・視線を確認する（{actions.length - 3}）</summary><ActionPreviews actions={actions.slice(3)} onViewed={onViewed}/></details>}<small aria-live="polite">プレビュー表示済み {viewedCount} / {actions.length}</small></> : <div className="companion-preview-empty">{busy ? 'ファイルを確認しています…' : 'ファイルを選ぶと、検査後に動きを確認できます。'}</div>}</section>
    {inspected && <><Message notice={{ kind: 'success', text: 'ファイルの内容を読み込みました。すべての動きを確認してください。' }}/><label className="companion-checkbox"><input type="checkbox" checked={confirmed} onChange={onConfirm} disabled={busy}/><span><strong>動作を確認しました</strong><small>表示されたすべての動きを見て確認します。</small></span></label></>}
    <Message notice={notice}/>
    {!candidate && <fieldset className="companion-registration" disabled={busy}><legend>登録の設定</legend><label className="companion-checkbox"><input type="checkbox" checked={form.register} onChange={e => onChange({ ...form, register: e.target.checked, makeCurrent: e.target.checked && form.makeCurrent })}/><span><strong>相棒として登録する</strong><small>マイリストに保存され、いつでも選べます。</small></span></label><label className="companion-checkbox"><input type="checkbox" checked={form.makeCurrent} disabled={!form.register} onChange={e => onChange({ ...form, makeCurrent: e.target.checked })}/><span><strong>今の相棒にする</strong><small>登録後、このペットを現在の相棒に設定します。</small></span></label></fieldset>}
    <div className="companion-actions companion-footer"><button type="button" className="companion-button companion-cancel" onClick={onCancel} disabled={busy}>キャンセル</button><button type="button" className="companion-button companion-primary" onClick={onRegister} disabled={busy || !form.register || !inspected || !confirmed}>{busy ? '処理しています…' : candidate ? 'この相棒を採用する' : '登録する'}</button></div>
  </div>;
}

export function CreationView({ form, onChange, onImage, onDraft, onExport, onProvider, onGenerate, connected, providerLabel, busy, notice, extra, imageUrl }: {
  form: CreationForm; onChange: (next: CreationForm) => void; onImage: (file: File | null) => void;
  onDraft: () => void; onExport: () => void; onProvider: () => void; onGenerate: () => void;
  connected: boolean; providerLabel?: string; busy?: boolean; notice?: Notice; extra?: ReactNode; imageUrl?: string;
}) {
  const [localImage, setLocalImage] = useState<string>();
  useEffect(() => { if (!form.image) { setLocalImage(undefined); return; } const url = URL.createObjectURL(form.image); setLocalImage(url); return () => URL.revokeObjectURL(url); }, [form.image]);
  const image = localImage || imageUrl;
  return <div className="companion-page companion-create">
    <Intro title="オリジナルの相棒を作る">イメージを入力して、あなただけの相棒を作りましょう。生成には少し時間がかかります。</Intro>
    <label className="companion-field"><span><strong>相棒の名前</strong><output>{Array.from(form.name).length}/20</output></span><input aria-label="相棒の名前" value={form.name} placeholder="例）もとやまちゃん" disabled={busy} onChange={e => onChange({ ...form, name: Array.from(e.target.value).slice(0, 20).join('') })}/></label>
    <label className="companion-field"><span><strong>外見の希望</strong><output>{Array.from(form.appearance).length}/200</output></span><textarea aria-label="外見の希望" rows={4} value={form.appearance} placeholder={'例）やさしい雰囲気の三毛猫。\n名古屋・本山のまちによく似合う、親しみやすいデザインでお願いします。'} disabled={busy} onChange={e => onChange({ ...form, appearance: Array.from(e.target.value).slice(0, 200).join('') })}/></label>
    <section className="companion-reference"><h3>参考画像（任意）</h3><label className="companion-image-input"><Glyph name="image"/><span><strong>画像を追加</strong><small>JPG / PNG（最大5MB）</small></span><input type="file" accept="image/jpeg,image/png" aria-label="参考画像JPG・PNG（最大5MB）" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) onImage(file); e.target.value = ''; }}/></label>{image && <div className="companion-reference-preview"><img src={image} alt="選択した相棒の参考画像"/><button type="button" className="companion-button" onClick={() => onImage(null)} disabled={busy}>参考画像を外す</button></div>}</section>
    <section className="companion-provider"><h3>接続先の設定</h3><button type="button" className="companion-card companion-provider-button" onClick={onProvider} disabled={busy}><span className="companion-circle"><Glyph name="cloud"/></span><span><strong>{providerLabel || (connected ? '接続済み' : '未接続')}</strong><small>{connected ? 'この接続先で相棒を生成します。' : '生成を行うために接続先を設定してください。'}</small></span><Glyph name="next"/></button></section>
    {!connected && <Message notice={{ kind: 'info', text: '必要な項目を入力し、接続先を設定すると相棒を生成できます。' }}/>}<Message notice={notice}/>
    <div className="companion-actions"><button type="button" className="companion-button" onClick={onDraft} disabled={busy}>下書きを保存</button><button type="button" className="companion-button companion-export" onClick={onExport} disabled={busy}><Glyph name="export"/>制作指示を持ち出す</button></div>
    <button type="button" className="companion-button companion-primary" onClick={onGenerate} disabled={busy || !connected || !form.name.trim() || !form.appearance.trim()}>{busy ? '処理しています…' : '生成する'}</button>
    {extra}
  </div>;
}

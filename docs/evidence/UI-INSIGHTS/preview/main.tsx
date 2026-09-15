import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DiagnosisView, EvidenceView, InsightGlyph, ReviewView } from '../../../../src/features/insights/InsightViews';
import type { Period, ReviewDraft } from '../../../../src/features/insights/types';
import { ThemeEditView, ThemesView } from '../../../../src/features/themes/ThemeViews';
import type { ThemeDraft } from '../../../../src/features/themes/types';
import { diagnosis, insight, records, themes as initialThemes } from './fixtures';
import './preview.css';

const page = new URLSearchParams(location.search).get('page') ?? 'type-diagnosis';
const initialCase = new URLSearchParams(location.search).get('case') ?? 'normal';
if (new URLSearchParams(location.search).get('text') === '200') document.documentElement.dataset.textScale = '200';
function Preview() {
  const [screen, setScreen] = useState(page), [period, setPeriod] = useState<Period>('week');
  const [review, setReview] = useState<ReviewDraft>({ choice: 'disagree', note: '静かな所が好きというより、今週は仕事に集中したかったです。' });
  const [savedReview, setSavedReview] = useState<ReviewDraft>({ choice: null, note: '' });
  const [themes, setThemes] = useState(initialCase === 'empty' ? [] : initialThemes);
  const [selectedId, setSelectedId] = useState<string | null>('fixture-alone');
  const [editingId, setEditingId] = useState<string | null>('fixture-alone');
  const [draft, setDraft] = useState<ThemeDraft>({ name: initialThemes[0]!.name, description: initialThemes[0]!.description, color: 'teal', recordIds: initialThemes[0]!.recordIds, photoFile: null, photoUrl: initialThemes[0]!.photoUrl ?? null, coverMediaId: 'fixture-photo-coffee', photoRecordId: 'fixture-coffee' });
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(initialCase === 'error' ? 'テスト応答：読み込みに失敗しました。入力は保持しています。' : null), [notice, setNotice] = useState<string | null>(null);
  const [failSave, setFailSave] = useState(initialCase === 'failure');
  const showRecord = (id: string) => setNotice(`テスト遷移：record-edit / ${id}`);
  const action = (complete: () => void) => { setBusy(true); setNotice(null); setError(null); window.setTimeout(() => { setBusy(false); if (failSave) setError('テスト応答：保存に失敗しました。入力を保持しています。'); else { complete(); setNotice('テスト応答：保存しました。実APIへの保存ではありません。'); } }, 350); };
  const status = { busy, error, notice, loading: initialCase === 'loading' };
  const viewInsight = { ...insight, ...(initialCase === 'changed' ? { title: null, summary: '', alternatives: [], unknown: ['元の根拠が変わったため、古い説明と引用を外しています。'] } : {}), review: savedReview.choice, reviewNote: savedReview.note, records: initialCase === 'changed' ? insight.records.map(record => ({ ...record, sourceState: 'changed' as const })) : insight.records };
  const retry = () => { setError(null); setNotice('テスト応答を再取得しました。'); };
  const openEdit = (id: string | null) => {
    const value = themes.find(theme => theme.id === id);
    setEditingId(id); setDraft({ name: value?.name ?? '', description: value?.description ?? '', color: value?.color ?? 'teal', recordIds: value?.recordIds ?? [], photoUrl: value?.photoUrl ?? null, photoFile: null, coverMediaId: null, photoRecordId: null }); setDirty(false); setScreen('theme-edit'); setError(null); setNotice(null);
  };
  return <><nav className="preview-tools" aria-label="検査用ナビゲーション"><strong>テスト応答・画像照合専用</strong><select aria-label="検査画面" value={screen} onChange={event => { setScreen(event.target.value); setError(null); setNotice(null); }}>{['type-diagnosis','trend-evidence','trend-review','themes','theme-edit'].map(id => <option key={id}>{id}</option>)}</select><label><input type="checkbox" checked={failSave} onChange={event => setFailSave(event.target.checked)}/>保存失敗</label><span>実API未接続・再読込でテスト値へ戻ります</span></nav>
    <main className={`preview-phone preview-${screen}`}><header className="preview-header"><button type="button" aria-label="戻る" onClick={() => { setScreen(screen.startsWith('theme') ? 'themes' : 'type-diagnosis'); setError(null); setNotice(null); }}><InsightGlyph name="back"/></button>{screen === 'themes' ? <span>わたしの地図</span> : screen === 'theme-edit' ? <strong>{editingId ? 'テーマを編集' : 'テーマを作る'}</strong> : screen === 'type-diagnosis' ? <span/> : <strong>タイプ診断</strong>}</header>
      {screen === 'type-diagnosis' && <DiagnosisView value={initialCase === 'empty' ? null : { ...diagnosis, review: savedReview.choice, axes: initialCase === 'missing' ? diagnosis.axes.map((axis, index) => index === 2 ? { ...axis, numerator: 0, denominator: 0, unknownDays: 7, value: null } : axis) : diagnosis.axes }} period={period} onPeriod={setPeriod} status={status} onEvidence={() => setScreen('trend-evidence')} onRecord={showRecord} onReview={choice => { setReview({ ...review, choice }); setScreen('trend-review'); }} onExplore={() => setNotice('テスト遷移：今の希望から探す')} onRetry={retry}/>}
      {screen === 'trend-evidence' && <EvidenceView value={viewInsight} status={status} onRecord={showRecord} onReview={() => setScreen('trend-review')} onRefresh={retry} onRetry={retry}/>}
      {screen === 'trend-review' && <ReviewView value={viewInsight} draft={review} onChange={setReview} onSave={() => action(() => setSavedReview(review))} onOriginal={() => setScreen('trend-evidence')} status={status} onRetry={retry}/>}
      {screen === 'themes' && <ThemesView themes={themes} selectedId={selectedId} onSelect={setSelectedId} onCreate={() => openEdit(null)} onEdit={openEdit} onMap={id => setNotice(`テスト遷移：personal-map / themeId=${id}`)} status={status} onRetry={retry}/>}
      {screen === 'theme-edit' && <ThemeEditView draft={draft} dirty={dirty} onChange={value => { setDraft(value); setDirty(true); }} records={initialCase === 'empty' ? [] : records} status={status} onSave={() => action(() => { const id = editingId ?? `fixture-new-${Date.now()}`; setThemes(values => [...values.filter(theme => theme.id !== id), { id, version: 2, name: draft.name, description: draft.description, color: draft.color, photoUrl: draft.photoFile ? URL.createObjectURL(draft.photoFile) : draft.photoUrl, recordIds: draft.recordIds }]); setSelectedId(id); setScreen('themes'); setDirty(false); })} onCancel={() => { setScreen('themes'); setDirty(false); setError(null); }} onDelete={editingId ? () => action(() => { setThemes(values => values.filter(theme => theme.id !== editingId)); if (selectedId === editingId) setSelectedId(null); setScreen('themes'); }) : undefined} onRecord={showRecord} onRetry={retry}/>}
    </main></>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);

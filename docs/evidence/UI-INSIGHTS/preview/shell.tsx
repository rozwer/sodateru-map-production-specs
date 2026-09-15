/** Shared-shell visual fixture. No network or durable writes; never a product entry. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../../../src/app/App';
import type { ScreenDefinition } from '../../../../src/app/contracts';
import { DiagnosisView, EvidenceView, ReviewView, InsightBackHeader } from '../../../../src/features/insights/InsightViews';
import { ThemesView, ThemeEditView } from '../../../../src/features/themes/ThemeViews';
import type { ThemeDraft } from '../../../../src/features/themes/types';
import type { Period, ReviewDraft } from '../../../../src/features/insights/types';
import { diagnosis, insight, records, themes } from './fixtures';

const screens: ScreenDefinition[] = [
  { id: 'type-diagnosis', title: 'タイプ診断', layout: { header: 'none', contentPadding: 'none', bottomNav: true }, component: ({ navigate, back }) => {
    const [period, setPeriod] = useState<Period>('week');
    return <><InsightBackHeader onBack={back}/><DiagnosisView value={diagnosis} period={period} onPeriod={setPeriod} onEvidence={() => navigate('trend-evidence')} onRecord={() => {}} onReview={choice => navigate('trend-review', { choice })} onExplore={() => {}}/></>;
  } },
  { id: 'trend-evidence', title: 'タイプ診断', layout: { header: 'back', contentPadding: 'none', bottomNav: false }, component: ({ navigate }) => <EvidenceView value={insight} onRecord={() => {}} onReview={() => navigate('trend-review')}/> },
  { id: 'trend-review', title: 'タイプ診断', layout: { header: 'back', contentPadding: 'none', bottomNav: false }, component: ({ navigate }) => {
    const [draft, setDraft] = useState<ReviewDraft>({ choice: 'disagree', note: '' });
    return <ReviewView value={insight} draft={draft} onChange={setDraft} onSave={() => {}} onOriginal={() => navigate('trend-evidence')}/>;
  } },
  { id: 'themes', title: 'わたしの地図', layout: { header: 'back', contentPadding: 'none', bottomNav: false }, component: ({ navigate }) => <ThemesView themes={themes} selectedId={themes[0]!.id} onSelect={() => {}} onCreate={() => navigate('theme-edit')} onEdit={() => navigate('theme-edit')} onMap={() => {}}/> },
  { id: 'theme-edit', title: 'テーマを編集', layout: { header: 'back', contentPadding: 'none', bottomNav: false }, component: ({ back }) => {
    const [draft, setDraft] = useState<ThemeDraft>({ name: themes[0]!.name, description: themes[0]!.description, color: 'teal', recordIds: themes[0]!.recordIds, photoFile: null, photoUrl: themes[0]!.photoUrl ?? null, coverMediaId: 'fixture-photo-coffee', photoRecordId: 'fixture-coffee' });
    return <ThemeEditView draft={draft} onChange={setDraft} records={records} onSave={() => {}} onCancel={back} onDelete={() => {}}/>;
  } },
];
createRoot(document.getElementById('root')!).render(<><App screens={screens} scopeKey="ui-insights:fixture" dataMode="demo"/><div style={{ position: 'fixed', top: 0, right: 0, zIndex: 200, fontSize: 10, background: '#ffe8a0' }}>テスト応答・API未接続</div></>);

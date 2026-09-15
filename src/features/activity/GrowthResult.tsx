import type { ReactNode } from 'react';
import type { PlaceChoice } from '../records/form-types';
import { PlaceCard, RecordHeading, RecordIcon, RecordNotice } from '../records/RecordParts';
import { activityMessages as m } from './messages';
import './activity.css';

export function GrowthResult({ place, body, purposes, visitCount, preview, onBack, onOriginal, onNext, onMap, error, loading }: {
 place: PlaceChoice | null; body: string; purposes: string[]; visitCount: number; preview: ReactNode;
 onBack: () => void; onOriginal: () => void; onNext: () => void; onMap: () => void;
 error?: string; loading?: boolean;
}) {
 return <section className="records-screen activity-growth"><RecordHeading title={m.growthTitle} onBack={onBack}/><div className="records-body">
   {loading && <RecordNotice>地図への反映を確認しています…</RecordNotice>}{error && <RecordNotice error>{error}</RecordNotice>}
   <div className="activity-growth-preview">{preview}</div>
   <div className="activity-growth-message"><h3>{visitCount > 0 ? m.growthSaved : 'いまの地図の成長'}</h3><p>{visitCount > 0 ? m.growthLead : 'この場所の確認済み訪問はありません。\n保存した体験は元の記録から見返せます。'}</p></div>
   <section className="activity-growth-card"><PlaceCard place={place} detail={purposes.length > 0 ? <p className="activity-purpose-badge">{purposes.join('・')}</p> : undefined}/><blockquote><RecordIcon name="quote"/><div><p>{body || '本文なし（媒体のみの記録）'}</p><footer>― わたしの記録より</footer></div></blockquote></section>
   <div className="activity-growth-links"><button type="button" className="records-detail-row" onClick={onOriginal}><RecordIcon name="document"/><strong>{m.original}</strong><RecordIcon name="next"/></button><button type="button" className="records-detail-row" onClick={onNext}><RecordIcon name="leaf"/><strong>{m.next}</strong><RecordIcon name="next"/></button><button type="button" className="records-secondary" onClick={onMap}>{m.map}</button></div>
 </div></section>;
}

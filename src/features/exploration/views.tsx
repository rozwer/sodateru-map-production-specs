import { useRef, useState, type ReactNode } from 'react';
import { ExploreIcon } from './ExploreIcon';
import { distanceAndBearing } from './device';
import { explorationMessages as m } from './messages';
import type { HistoryPresentation, PlacePresentation, PositionReading, VoicePresentation } from './view-types';
import './exploration.css';

export function ExploreStatus({ error, busy, onRetry }: { error?: string | null; busy?: boolean; onRetry?: () => void }) {
  if (error) return <div className="explore-status explore-status--error" role="alert"><p>{error}</p>{onRetry && <button type="button" className="explore-button explore-button--outline" onClick={onRetry}>{m.retry}</button>}</div>;
  return busy ? <p role="status" className="explore-status">{m.loading}</p> : null;
}

export function PlacePhoto({ photo, className = '' }: { photo?: { url: string; alt: string }; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return photo && photo.url !== failedUrl ? <img className={`explore-photo ${className}`} src={photo.url} alt={photo.alt} onError={() => setFailedUrl(photo.url)} /> : <div className={`explore-photo explore-photo--missing ${className}`}><ExploreIcon name="image"/><span>{m.unknownPhoto}</span></div>;
}

export function ConsultationIntroduction() {
  return <div className="explore-introduction"><span className="explore-emblem"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="7" y="11" width="31" height="25" rx="9" transform="rotate(-9 23 24)"/><rect x="13" y="17" width="20" height="14" rx="6" transform="rotate(-9 23 24)"/><path d="M19 22v4m9-5v4M21 36v5m10-8 5 6m-1-18 6-3m-27 18-4 5M29 10V6m0 1c7-7 10-4 6 0h-6M18 42h8"/></svg></span><h2>{m.introduction}<span>{m.introductionAccent}</span></h2></div>;
}

export function CandidateCard({ place, index, selected, expired, busy, mapPreview, journeyTotal, onShowMap, onDetail, onSearchAgain }: {
  place: PlacePresentation; index: number; selected: boolean; expired: boolean; busy: boolean; mapPreview?: ReactNode; journeyTotal?: { walkingMinutes: number; stayMinutes: number };
  onShowMap: () => void; onDetail: () => void; onSearchAgain: () => void;
}) {
  return <article className={`explore-card explore-candidate${selected ? ' explore-candidate--selected' : ''}`} data-candidate-id={place.id}>
    <button type="button" className="explore-photo-button" onClick={onDetail} aria-label={`${place.name}の詳細`}><PlacePhoto photo={place.photos[0]} />{place.category && <span className="explore-category">{place.category}</span>}</button>
    <h3><button type="button" className="explore-text-button" onClick={onDetail}><span className="explore-candidate-number">{index + 1}.</span> {place.name}</button></h3>
    {place.description && <p className="explore-candidate-description">{place.description}</p>}
    <div className="explore-durations"><span><ExploreIcon name="walk" />{place.walkingMinutes !== undefined ? `${m.walking} ${place.walkingMinutes}${m.minute}` : m.unknownWalk}</span><span><ExploreIcon name="clock" />{place.stayMinutes !== undefined ? `${m.stay} ${place.stayMinutes}${m.minute}` : m.unknownStay}</span></div>
    {place.reason && <p className="explore-candidate-reason">{place.reason}</p>}
    {mapPreview && <div className="explore-route-map">{mapPreview}</div>}
    {journeyTotal && <output className="explore-total"><ExploreIcon name="clock"/>移動 {journeyTotal.walkingMinutes}分 ＋ 滞在 {journeyTotal.stayMinutes}分 ＝ 約{journeyTotal.walkingMinutes + journeyTotal.stayMinutes}分</output>}
    {expired ? <><p role="status" className="explore-status">{m.expired}</p><button className="explore-button explore-button--outline" onClick={onSearchAgain}>{m.searchAgain}</button></> : <div className="explore-candidate-actions"><button type="button" className="explore-button explore-button--outline" disabled={busy} onClick={onShowMap}><ExploreIcon name="pin"/>{m.showMap}<ExploreIcon name="next"/></button></div>}
  </article>;
}

export function VoiceConsultationView({ voice, onStart, onStop, onChange, onClear, onSend, onRetry }: {
  voice: VoicePresentation; onStart: () => void; onStop: () => void; onChange: (text: string) => void; onClear: () => void; onSend: () => void; onRetry: () => void;
}) {
  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const recording = voice.state === 'recording';
  const busy = ['recording', 'requesting', 'transcribing'].includes(voice.state);
  const status = recording ? m.recording : voice.state === 'requesting' ? m.requestingMicrophone : voice.state === 'transcribing' ? m.transcribing : voice.state === 'stopped' ? m.recordingStopped : m.recordingReady;
  const time = `${String(Math.floor(voice.seconds / 60)).padStart(2, '0')}:${String(voice.seconds % 60).padStart(2, '0')}`;
  return <div className="explore-screen explore-voice" data-testid="voice-consultation">
    <section className="explore-card explore-purpose"><span className="explore-emblem"><ExploreIcon name="sprout"/></span><div><h2>{m.explore}</h2><p>{m.introductionNote}</p></div></section>
    <section className="explore-card explore-recording" aria-label={m.voice}>
      <p className="explore-recording-state" role="status">{recording && <span/>}{status}</p>
      <button type="button" className="explore-microphone" onClick={recording ? onStop : onStart} disabled={voice.state === 'requesting' || voice.state === 'transcribing'} aria-label={recording ? '録音を止める' : m.startRecording}><ExploreIcon name="mic"/></button>
      <svg className="explore-waveform" viewBox="0 0 300 48" role="img" aria-label="録音波形">{voice.levels.map((level, index) => { const height = 3 + Math.min(1, Math.max(0, level)) * 40; return <line key={index} x1={8 + index * 7.3} x2={8 + index * 7.3} y1={24 - height / 2} y2={24 + height / 2}/>; })}</svg>
      <output className="explore-recording-time" data-testid="voice-consultation--main--content--recording-time">{time}</output>
      <p className="explore-muted">{recording ? m.stopHint : m.editTranscript}</p>
      <button type="button" className="explore-button explore-button--soft" onClick={recording ? onStop : onStart} disabled={voice.state === 'requesting' || voice.state === 'transcribing'}>{recording ? <ExploreIcon name="pause"/> : <ExploreIcon name="mic"/>}{recording ? m.stopRecording : m.startRecording}</button>
    </section>
    <section className="explore-card explore-transcript"><div className="explore-field-label"><label htmlFor="explore-transcript">{m.transcript}</label><output>{voice.transcript.length}/300</output></div><div className="explore-clearable"><textarea ref={transcriptRef} id="explore-transcript" rows={1} aria-label={m.transcriptLabel} value={voice.transcript} maxLength={300} onChange={e => onChange(e.target.value)} disabled={busy}/><button type="button" className="explore-icon-button" aria-label={m.transcriptClear} onClick={onClear} disabled={busy || !voice.transcript}><ExploreIcon name="close"/></button></div><button type="button" className="explore-text-action" onClick={() => transcriptRef.current?.focus()} disabled={busy}><ExploreIcon name="edit"/>{m.editTranscript}</button><ExploreStatus error={voice.error} onRetry={onRetry}/><button type="button" className="explore-button explore-button--primary" disabled={busy || !voice.transcript.trim()} onClick={onSend}><ExploreIcon name="send"/>{m.sendTranscript}<ExploreIcon name="next"/></button></section>
  </div>;
}

export function AiConsentView({ text, enabled, place, busy, error, permissions, textLimit = 300, onText, onEnable, onChangePlace, onRemovePlace, onCancel, onSend }: {
  text: string; enabled: boolean; place: PlacePresentation | null; busy: boolean; error: string | null;
  permissions?: ReactNode; textLimit?: number;
  onText: (text: string) => void; onEnable: (enabled: boolean) => void; onChangePlace: () => void; onRemovePlace: () => void; onCancel: () => void; onSend: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  return <div className="explore-screen explore-consent" data-testid="ai-consent"><section className="explore-card explore-purpose explore-ai-status"><span className="explore-emblem explore-emblem--blue"><ExploreIcon name="shield"/></span><div><h2>{enabled ? m.aiEnabled : m.aiDisabled}</h2><p>{m.providerNote}</p><button type="button" className="explore-text-action" aria-expanded={showDetails} onClick={() => setShowDetails(value => !value)}><ExploreIcon name="info"/>{m.aiDetails}</button>{showDetails && <p>{m.inputCareNote}</p>}</div></section>
    <section className="explore-card explore-consent-preview"><h2>{m.previewTitle}</h2><p className="explore-muted">{m.previewDescription}</p><div className="explore-preview-box"><div className="explore-field-label"><label htmlFor="explore-consent-text">{m.consultationBody}</label><output>{text.length}/{textLimit}</output></div><textarea id="explore-consent-text" rows={1} value={text} maxLength={textLimit} onChange={e => onText(e.target.value)} disabled={busy}/><h3>{m.selectedPlace}</h3>{place ? <div className="explore-selected-place"><PlacePhoto photo={place.photos[0]}/><div><strong>{place.name}</strong><p>{place.address ?? m.unknownAddress}</p></div><button type="button" className="explore-icon-button" onClick={onRemovePlace} aria-label={m.removePlace} disabled={busy}><ExploreIcon name="close"/></button></div> : <p>{m.noSelectedPlace}</p>}<button type="button" className="explore-button explore-button--outline" onClick={onChangePlace} disabled={busy}><ExploreIcon name="map"/>{m.changePlace}</button></div>
      <aside className="explore-input-care"><ExploreIcon name="lock"/><div><strong>{m.inputCare}</strong><p>{m.inputCareNote}</p></div></aside><label className="explore-switch"><span>{m.enableAi}</span><input type="checkbox" role="switch" checked={enabled} onChange={e => onEnable(e.target.checked)} disabled={busy}/></label></section>
    {permissions}<ExploreStatus error={error} busy={busy}/><footer className="explore-consent-actions"><button type="button" className="explore-button explore-button--soft" disabled={busy} onClick={onCancel}>{m.cancelConsent}</button><button type="button" className="explore-button explore-button--primary" disabled={busy || !enabled || !text.trim()} onClick={onSend}><ExploreIcon name="send"/>{m.enableAndSend}</button></footer></div>;
}

export function ConversationHistoryView({ conversations, query, busy, error, hasMore, loadedOnly = true, onSearch, onOpen, onNew, onMore, onRetry }: {
  conversations: HistoryPresentation[]; query: string; busy: boolean; error: string | null; hasMore: boolean; loadedOnly?: boolean;
  onSearch: (query: string) => void; onOpen: (id: string) => void; onNew: () => void; onMore: () => void; onRetry: () => void;
}) {
  const groups = new Map<string, HistoryPresentation[]>();
  for (const conversation of conversations) { const date = new Date(conversation.updatedAt).toLocaleDateString('ja-JP'); groups.set(date, [...(groups.get(date) ?? []), conversation]); }
  const today = new Date().toLocaleDateString('ja-JP');
  const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toLocaleDateString('ja-JP');
  return <div className="explore-screen explore-history" data-testid="conversation-history"><label className="explore-search"><ExploreIcon name="search"/><input type="search" aria-label="履歴を検索" placeholder={m.historySearch} value={query} onChange={e => onSearch(e.target.value)}/></label>{loadedOnly && query && <p className="explore-muted explore-search-scope">{m.searchLoadedOnly}</p>}<ExploreStatus error={error} busy={busy} onRetry={onRetry}/>{!busy && !error && !conversations.length && <p className="explore-empty">{query ? m.noHistoryMatch : m.noHistory}</p>}
    {[...groups].map(([date, items]) => <section key={date} className="explore-history-group"><h2>{date === today ? m.today : date === yesterday ? m.yesterday : ''}<time>{new Date(items[0]!.updatedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</time></h2><ul>{items.map(item => <li key={item.id}><button type="button" className="explore-history-item explore-card" onClick={() => onOpen(item.id)}><PlacePhoto photo={item.photo}/><span className="explore-history-body"><strong>{item.title}</strong>{item.preview && <span className="explore-history-preview">{item.preview}</span>}<span className="explore-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</span></span><span className="explore-history-meta"><time>{new Date(item.updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</time><ExploreIcon name="next"/></span></button></li>)}</ul></section>)}
    {hasMore && <button type="button" className="explore-button explore-button--outline" onClick={onMore} disabled={busy}>{m.moreHistory}</button>}<footer className="explore-sticky-action"><button type="button" className="explore-button explore-button--primary" onClick={onNew}><ExploreIcon name="plus"/>{m.newConversation}</button></footer></div>;
}

export function MistDetailView({ place, bookmarked, expired, busy, error, mapPreview, onBookmark, onWalk, onCompass, onSearchAgain, onRetry }: {
  place: PlacePresentation; bookmarked: boolean; expired: boolean; busy: boolean; error: string | null; mapPreview?: ReactNode;
  onBookmark: () => void; onWalk: () => void; onCompass: () => void; onSearchAgain: () => void; onRetry: () => void;
}) {
  const [gallery, setGallery] = useState<number | null>(null);
  return <div className="explore-screen explore-mist" data-testid="mist-detail">{mapPreview && <div className="explore-mist-map">{mapPreview}</div>}<section className="explore-card explore-mist-detail"><div className="explore-place-heading"><button type="button" className="explore-photo-button" onClick={() => setGallery(0)} aria-label={m.gallery} disabled={!place.photos.length}><PlacePhoto photo={place.photos[0]}/></button><div><h2>{place.name}</h2><p><ExploreIcon name="pin"/>{place.address ?? m.unknownAddress}</p></div></div>
    {place.photos.length > 1 && <div className="explore-gallery">{place.photos.slice(1, 3).map((photo, index) => <button type="button" key={photo.url} className="explore-photo-button" onClick={() => setGallery(index + 1)} aria-label={`${m.gallery} ${index + 2}`}><PlacePhoto photo={photo}/></button>)}{place.photos.length > 3 && <button type="button" className="explore-gallery-more" onClick={() => setGallery(3)}><ExploreIcon name="image"/><span>他 {place.photos.length - 3}枚</span></button>}</div>}
    {gallery !== null && place.photos[gallery] && <section className="explore-gallery-open" aria-label={m.gallery}><PlacePhoto photo={place.photos[gallery]}/><div className="explore-gallery-controls"><button className="explore-icon-button" disabled={gallery === 0} onClick={() => setGallery(gallery - 1)} aria-label="前の写真"><ExploreIcon name="back"/></button><output>{gallery + 1}/{place.photos.length}</output><button className="explore-icon-button" disabled={gallery >= place.photos.length - 1} onClick={() => setGallery(gallery + 1)} aria-label="次の写真"><ExploreIcon name="next"/></button><button className="explore-button explore-button--soft" onClick={() => setGallery(null)}>{m.closeGallery}</button></div></section>}
    <dl className="explore-place-facts"><div><dt><ExploreIcon name="entrance"/>{m.entrance}</dt><dd>{place.entrance ?? m.unknownEntrance}</dd></div><div><dt><ExploreIcon name="source"/>{m.source}</dt><dd>{place.source?.url ? <a href={place.source.url} target="_blank" rel="noreferrer">{place.source.title}</a> : place.source?.title ?? m.unknownSource}</dd></div><div><dt><ExploreIcon name="heart"/>{m.reason}</dt><dd>{place.reason ?? m.unknownReason}</dd></div></dl><p className="explore-muted">{place.facts ?? m.unknownFacts}</p>
    <ExploreStatus error={error} busy={busy} onRetry={onRetry}/>{expired ? <><p className="explore-status">{m.expired}</p><button className="explore-button explore-button--outline" onClick={onSearchAgain}>{m.searchAgain}</button></> : <div className="explore-mist-actions"><button type="button" className="explore-button explore-button--soft" disabled={busy} aria-pressed={bookmarked} onClick={onBookmark}><ExploreIcon name="heart"/>{bookmarked ? m.bookmarked : m.bookmark}</button><button type="button" className="explore-button explore-button--soft" onClick={onWalk} disabled={busy}><ExploreIcon name="walk"/>{m.walkHere}</button><button type="button" className="explore-button explore-button--primary" onClick={onCompass} disabled={busy}><ExploreIcon name="compass"/>{m.compassHere}</button></div>}<p className="explore-muted explore-unformed">{m.unformed}</p></section></div>;
}

export function QuestCompassView({ place, position, positionError, stale, heading, headingState, mapPreview, onEnableHeading, onRoute, onEnd }: {
  place: PlacePresentation; position: PositionReading | null; positionError: string | null; stale: boolean; heading: number | null; headingState: 'idle' | 'live' | 'denied' | 'unavailable'; mapPreview?: ReactNode;
  onEnableHeading: () => void; onRoute: () => void; onEnd: () => void;
}) {
  const bearing = position ? distanceAndBearing(position.coordinates, place.coordinates) : null;
  const angle = bearing ? (bearing.bearing - (heading ?? 0) + 360) % 360 : 0;
  return <div className="explore-screen explore-compass" data-testid="quest-compass"><div className="explore-compass-stage"><aside className="explore-distance"><output>{bearing ? bearing.distanceM < 1000 ? `${Math.round(bearing.distanceM)} m` : `${(bearing.distanceM / 1000).toFixed(1)} km` : '—'}</output><strong>{m.straightDistance}</strong><p>{positionError ?? (stale ? m.positionStale : position ? m.positionLive : m.positionReady)}</p>{position && <><time dateTime={new Date(position.timestamp).toISOString()}>{new Date(position.timestamp).toLocaleTimeString('ja-JP')}</time><small>精度 ±{Math.round(position.accuracy)} m</small></>}</aside>
    <div className="explore-compass-destination"><span><ExploreIcon name="book"/></span><h2>{place.name}</h2></div><svg className={`explore-compass-graphic${stale ? ' explore-compass-graphic--stale' : ''}`} viewBox="0 160 360 240" role="img" aria-label={heading === null ? m.headingNorth : m.headingDevice}><circle cx="180" cy="180" r="175" fill="currentColor" opacity=".025"/><circle cx="180" cy="180" r="134" fill="currentColor" opacity=".04"/><circle cx="180" cy="180" r="93" fill="currentColor" opacity=".045"/>{bearing && <g transform={`translate(180 230) rotate(${angle})`}><path d="M0-43 25 0 0-9-25 0Z" fill="currentColor"/><path d="M0 18v66" stroke="currentColor" strokeWidth="6" strokeDasharray="0 16" strokeLinecap="round"/></g>}<circle cx="180" cy="340" r="23" fill="currentColor" opacity=".13"/><circle cx="180" cy="340" r="13" fill="#fff"/><circle cx="180" cy="340" r="9" fill="#179ded"/><text x="180" y="374" textAnchor="middle">{m.currentLocation}</text></svg>
    {mapPreview && <div className="explore-compass-map">{mapPreview}</div>}</div>
    <div className="explore-heading-status">{headingState === 'idle' ? <button className="explore-text-action" onClick={onEnableHeading}><ExploreIcon name="compass"/>{m.headingEnable}</button> : <p role="status">{headingState === 'denied' ? m.headingDenied : headingState === 'unavailable' ? m.headingUnavailable : m.headingDevice}</p>}</div><aside className="explore-straight-note"><ExploreIcon name="info"/><p>{m.straightNote}</p></aside><footer className="explore-compass-actions"><button type="button" className="explore-button explore-button--primary" onClick={onRoute}><ExploreIcon name="map"/>{m.showRoadRoute}</button><button type="button" className="explore-button explore-button--soft" onClick={onEnd}>{m.endNavigation}</button></footer></div>;
}

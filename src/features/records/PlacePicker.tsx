import type { ReactNode } from 'react';
import type { PlaceChoice } from './form-types';
import { recordMessages as m } from './messages';
import { PlaceCard, RecordHeading, RecordIcon, RecordNotice } from './RecordParts';

export type PlacePickerProps = {
  mode: 'map' | 'search' | 'history';
  onMode: (mode: 'map' | 'search' | 'history') => void;
  query: string;
  onQuery: (query: string) => void;
  onSearch: () => void;
  items: PlaceChoice[];
  selected: PlaceChoice | null;
  onSelect: (place: PlaceChoice | null) => void;
  onUse: () => void;
  onBack: () => void;
  onLocate: () => void;
  map: ReactNode;
  busy?: boolean;
  error?: string;
  onMore?: () => void;
};

export function PlacePicker(props: PlacePickerProps) {
  const { mode,onMode,query,onQuery,onSearch,items,selected,onSelect,onUse,onBack,onLocate,map,busy,error,onMore } = props;
  return <section className="records-screen records-place-picker"><RecordHeading title={m.placeTitle} onBack={onBack} /><p className="records-lead">{m.placeLead}</p>
    <div className="records-picker-tabs" role="tablist" aria-label="場所の選び方">{(['map','search','history'] as const).map(tab => <button type="button" role="tab" aria-selected={mode === tab} key={tab} onClick={() => onMode(tab)}><RecordIcon name={tab === 'map' ? 'map' : tab === 'search' ? 'search' : 'clock'} />{m[tab]}</button>)}</div>
    {mode !== 'history' && <form className="records-search-form" onSubmit={event => {event.preventDefault();onSearch();}}><RecordIcon name="search" /><input aria-label="場所検索" placeholder="場所を検索" value={query} onChange={event => onQuery(event.target.value)} /><button type="button" aria-label={m.clearSearch} onClick={() => onQuery('')}><RecordIcon name="close" /></button><button type="submit" className="records-search-submit" disabled={busy}>{m.search}</button></form>}
    {mode === 'map' && <div className="records-picker-map">{map}<button type="button" className="records-locate" aria-label={m.locate} onClick={onLocate}><RecordIcon name="locate" /></button></div>}
    <div className="records-picker-results">
      <h3>{mode === 'history' ? m.history : '検索結果'} <span>（{items.length}件）</span></h3>
      {busy && <RecordNotice>{m.loading}</RecordNotice>}
      {error && <RecordNotice error retry={onSearch}>{error}</RecordNotice>}
      {!busy && !error && items.length === 0 && <p className="records-empty">{mode === 'history' ? m.noHistory : m.noCandidates}</p>}
      <ul>{items.map(item => <li key={`${item.source}:${item.id}`} className={selected?.id === item.id ? 'is-selected' : ''}><button type="button" aria-pressed={selected?.id === item.id} onClick={() => onSelect(item)}><div className="records-place-photo">{item.photoUrl ? <img src={item.photoUrl} alt="場所の写真" /> : <RecordIcon name="pin" />}</div><span className="records-place-copy"><strong>{item.name}</strong>{item.address && <span>{item.address}</span>}</span><span className="records-choice-dot" aria-hidden="true" /></button></li>)}</ul>
      {onMore && <button type="button" className="records-text-button" disabled={busy} onClick={onMore}>{m.more}</button>}
    </div>
    <div className="records-picker-footer">{selected && <div className="records-picked-card"><PlaceCard place={selected} /><button type="button" className="records-media-remove" aria-label={m.clearPlace} onClick={() => onSelect(null)}><RecordIcon name="close" /></button></div>}<button type="button" className="records-primary" onClick={onUse} disabled={!selected || busy}>{m.usePlace}</button><button type="button" className="records-text-button records-centered" onClick={() => {onSelect(null);onBack();}}>場所を未指定で戻る</button></div>
  </section>;
}

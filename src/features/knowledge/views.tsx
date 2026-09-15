import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { knowledgeMessages as m } from './messages';
import { KnowledgeIcon, type KnowledgeIconName } from './Icon';
import { KnowledgeAvatar, KnowledgeMediaView, type KnowledgeMediaLoader } from './Media';
import { emptyFilters, type KnowledgeAreaOption, type KnowledgeFilters, type KnowledgeKind, type KnowledgePerson, type KnowledgeRecord } from './types';
import './knowledge.css';

export function KnowledgeStatus({ loading, error, empty, retry, children }: {
  loading?: boolean; error?: string | null; empty?: boolean; retry?: () => void; children?: ReactNode;
}) {
  return <>{loading && <p className="knowledge-status" role="status">{m.loading}</p>}
    {error && <div className="knowledge-status knowledge-error" role="alert"><p>{error}</p>{retry && <button type="button" onClick={retry}>{m.retry}</button>}</div>}
    {!loading && !error && empty && <div className="knowledge-status"><h3>{m.empty}</h3><p>{m.emptyHelp}</p></div>}{children}</>;
}
function IconButton({ icon, label, onClick, testId }: { icon: KnowledgeIconName; label: string; onClick: () => void; testId?: string }) {
  return <button className="knowledge-icon-button" type="button" aria-label={label} onClick={onClick} data-testid={testId}><KnowledgeIcon name={icon} /></button>;
}
function Header({ title, subtitle, back, close = false, children }: { title: string; subtitle?: string; back: () => void; close?: boolean; children?: ReactNode }) {
  return <header className={`knowledge-header ${close ? 'is-filter' : ''}`}><IconButton icon={close ? 'close' : 'back'} label={close ? m.close : m.back} onClick={back} />
    <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{children}</header>;
}
function Choice<T extends string | number>({ label, value, options, onChange, testId }: {
  label: string; value: T | null; options: { value: T; label: string; icon?: KnowledgeIconName }[];
  onChange: (value: T) => void; testId?: string;
}) {
  const name = useId();
  return <fieldset className="knowledge-choices" data-testid={testId}><legend className="knowledge-sr-only">{label}</legend>
    {options.map(option => <label key={option.value} className={value === option.value ? 'is-selected' : ''}>
      <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
      {option.icon && <KnowledgeIcon name={option.icon} />}<span>{option.label}</span></label>)}
  </fieldset>;
}
export function formatKnowledgeDate(value: number | null, timeZone: string) {
  if (value === null) return m.noDate;
  return new Intl.DateTimeFormat('ja-JP', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
}
function distanceLabel(center: [number, number], target: [number, number]) {
  const radians = Math.PI / 180;
  const latitude = (target[1] - center[1]) * radians;
  const longitude = (target[0] - center[0]) * radians;
  const a = Math.sin(latitude / 2) ** 2 + Math.cos(center[1] * radians) * Math.cos(target[1] * radians) * Math.sin(longitude / 2) ** 2;
  const metres = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return `ここから約 ${metres < 1000 ? `${Math.round(metres / 10) * 10}m` : `${(metres / 1000).toFixed(1)}km`}`;
}
function RecordIdentity({ record, timeZone, center }: { record: KnowledgeRecord; timeZone: string; center?: [number, number] | null }) {
  return <div className="knowledge-identity"><div className="knowledge-author"><KnowledgeAvatar src={record.person.iconPath} name={record.person.displayName} /><div><span>{record.person.displayName}</span><time dateTime={record.effectiveAt === null ? undefined : new Date(record.effectiveAt).toISOString()}>{formatKnowledgeDate(record.effectiveAt, timeZone)}</time></div></div>
    <div className="knowledge-place"><KnowledgeIcon name="pin" /><span>{record.place?.name ?? m.noPlace}{record.place && center && <small>{distanceLabel(center, record.place.coordinates)}</small>}</span></div></div>;
}
function RecordTags({ record, topicLabel }: { record: KnowledgeRecord; topicLabel?: string }) {
  return <div className="knowledge-tags">{topicLabel && <span>{topicLabel}</span>}{record.purposes.map(purpose => <span key={purpose}>{purpose}</span>)}</div>;
}

export function KnowledgeListView(props: {
  query: string; onQuery: (value: string) => void; onSearch: () => void; onClear: () => void;
  kind: KnowledgeKind; onKind: (kind: KnowledgeKind) => void;
  records: KnowledgeRecord[]; people?: KnowledgePerson[]; totalCount: number; heading: string;
  timeZone: string; center?: [number, number] | null; loading?: boolean; error?: string | null; nextCursor?: string | null;
  onLoadMore: () => void; onRetry: () => void; onBack: () => void; onFilter: () => void;
  onMap: () => void; onOpen: (id: string) => void; onPerson: (id: string) => void;
  bookmarks?: Set<string>; bookmarkBusy?: Set<string>; onBookmark?: (id: string) => void;
  active?: boolean; topicLabels?: Record<string, string>; onPost?: () => void; isMock?: boolean; onRetryMedia?: (id: string) => Promise<void>; loadMedia?: KnowledgeMediaLoader;
}) {
  return <section className="knowledge-panel knowledge-list" data-testid="knowledge-list">
    <Header title={m.title} subtitle={m.subtitle} back={props.onBack} />
    {props.isMock && <p className="knowledge-mock" role="status">{m.mock}</p>}
    <form className="knowledge-search-row" onSubmit={event => { event.preventDefault(); props.onSearch(); }}>
      <label className="knowledge-search"><KnowledgeIcon name="search" /><input type="search" aria-label={m.search} value={props.query} onChange={event => props.onQuery(event.target.value)} data-testid="knowledge-list--search" />
        {props.query && <button type="button" aria-label={m.clearSearch} onClick={props.onClear}><KnowledgeIcon name="close" /></button>}</label>
      <button type="button" className="knowledge-filter-button" onClick={props.onFilter} data-testid="knowledge-list--filter"><KnowledgeIcon name="filter" /><span>{m.searchConditions}</span></button>
    </form>
    <Choice label={m.kind} value={props.kind} onChange={props.onKind} testId="knowledge-list--kind" options={[
      { value: 'rest-tip', label: m.restTip, icon: 'cup' }, { value: 'experience', label: m.experience, icon: 'meal' }, { value: 'people', label: m.people, icon: 'people' },
    ]} />
    <div className="knowledge-result-heading"><h3>{props.heading}</h3><output aria-live="polite">{props.kind === 'people' ? `${props.people?.length ?? 0}人を表示` : `${props.totalCount}件`}</output></div>
    <KnowledgeStatus loading={props.loading} error={props.error} empty={props.kind !== 'people' && !props.totalCount} retry={props.onRetry} />
    {props.kind === 'people' && !props.loading && !props.error && !props.people?.length && <p className="knowledge-status" role="status">{m.peopleEmpty}</p>}
    {props.kind === 'people' ? <ul className="knowledge-cards">{props.people?.map(person => <li key={person.id}><button className="knowledge-person-card" onClick={() => props.onPerson(person.id)}><KnowledgeAvatar name={person.name} src={person.avatarUrl} /><span><strong>{person.name}</strong><span>{person.bio}</span></span><KnowledgeIcon name="chevron" /></button></li>)}</ul>
      : <ul className="knowledge-cards">{props.records.map(record => {
        const [firstLine = '', ...bodyLines] = record.body.split('\n');
        const media = record.media.find(item => item.kind === 'photo' || item.kind === 'video');
        return <li key={record.id} className="knowledge-card" data-testid={`knowledge-list--post--${record.id}`}>
          <div className="knowledge-card-main">{media ? <KnowledgeMediaView key={media.id} media={media} description={firstLine} compact active={props.active} onRetry={props.onRetryMedia} loadMedia={props.loadMedia} /> : <div className="knowledge-media knowledge-media-state is-compact">{m.noMedia}</div>}
            <button type="button" className="knowledge-card-copy" onClick={() => props.onOpen(record.id)}><h3>{firstLine || m.experience}</h3>{bodyLines.length > 0 && <p>{bodyLines.join('\n')}</p>}</button></div>
          <RecordIdentity record={record} timeZone={props.timeZone} center={props.center} />
          <div className="knowledge-card-footer"><RecordTags record={record} topicLabel={record.topicKey ? props.topicLabels?.[record.topicKey] : undefined} />
            {props.onBookmark && <button type="button" className="knowledge-bookmark" disabled={props.bookmarkBusy?.has(record.id)} aria-label={props.bookmarks?.has(record.id) ? m.unbookmark : m.bookmark} aria-pressed={props.bookmarks?.has(record.id) ?? false} onClick={() => props.onBookmark?.(record.id)} data-testid={`knowledge-list--bookmark--${record.id}`}><KnowledgeIcon name="bookmark" /></button>}</div>
        </li>;
      })}</ul>}
    {props.nextCursor && <button className="knowledge-secondary" type="button" onClick={props.onLoadMore} disabled={props.loading}>{m.loadMore}</button>}
    <div className="knowledge-bottom"><button type="button" className="knowledge-primary" onClick={props.onMap} data-testid="knowledge-list--map"><KnowledgeIcon name="map" />{m.map}</button>
      {props.onPost && <button type="button" className="knowledge-text-button" onClick={props.onPost}>{m.post}</button>}</div>
  </section>;
}

export function KnowledgeFilterView({ initial, onApply, onClose, onAreaSearch, onUseMapBounds, map, error, busy, areas = [], areaLoading, areaError }: {
  initial: KnowledgeFilters; onApply: (filters: KnowledgeFilters) => void; onClose: () => void;
  onAreaSearch: (text: string) => void; onUseMapBounds?: () => [number, number, number, number] | null;
  map: ReactNode | ((draft: KnowledgeFilters) => ReactNode); error?: string | null; busy?: boolean;
  areas?: KnowledgeAreaOption[]; areaLoading?: boolean; areaError?: string | null;
}) {
  const [draft, setDraft] = useState<KnowledgeFilters>(() => structuredClone(initial));
  const [searchedArea, setSearchedArea] = useState<string | null>(null);
  const update = (patch: Partial<KnowledgeFilters>) => setDraft(current => ({ ...current, ...patch }));
  const cancel = () => { setDraft(structuredClone(initial)); setSearchedArea(null); onClose(); };
  const needsArea = !draft.bounds && !draft.center && (draft.radiusM !== null || Boolean(draft.areaText.trim()));
  return <section className="knowledge-panel knowledge-filter" data-testid="knowledge-filter" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
    <Header title={m.searchConditions} back={cancel} close><button className="knowledge-outline" type="button" onClick={() => setDraft(structuredClone(emptyFilters))}>{m.clearConditions}</button></Header>
    <section className="knowledge-filter-group"><h3>{m.area}</h3><p>{m.areaHelp}</p>
      <form onSubmit={event => { event.preventDefault(); setSearchedArea(draft.areaText.trim()); onAreaSearch(draft.areaText); }}><label className="knowledge-search is-outline"><KnowledgeIcon name="search" /><input aria-label={m.area} type="search" enterKeyHint="search" value={draft.areaText} onChange={event => { update({ areaText: event.target.value, center: null, bounds: null }); setSearchedArea(null); }} /><button type="button" aria-label={m.clearSearch} onClick={() => { update({ areaText: '', center: null, radiusM: null, bounds: null }); setSearchedArea(null); }}><KnowledgeIcon name="close" /></button></label></form>
      {needsArea && <p className="knowledge-area-help" role="status">{m.areaSelectionRequired}</p>}
      <KnowledgeStatus loading={areaLoading} error={areaError} />
      {!draft.center && !areaLoading && !areaError && searchedArea !== null && searchedArea === draft.areaText.trim() && areas.length === 0 && <p role="status">{m.areaEmpty}</p>}
      {!draft.center && !areaLoading && searchedArea === draft.areaText.trim() && areas.length > 0 && <ul className="knowledge-area-results" aria-label={m.areaResults}>{areas.map(area => <li key={area.id}><button type="button" onClick={() => update({ areaText: area.name, center: area.coordinates, bounds: null, radiusM: draft.radiusM ?? 1000 })}><KnowledgeIcon name="pin" /><span>{area.name}</span><KnowledgeIcon name="chevron" /></button></li>)}</ul>}
      <Choice label="検索半径" value={draft.radiusM} onChange={radiusM => update({ radiusM, bounds: null })} options={[{ value: 500, label: '500m' }, { value: 1000, label: '1km' }, { value: 3000, label: '3km' }]} testId="knowledge-filter--radius" />
      <div className="knowledge-filter-map">{typeof map === 'function' ? map(draft) : map}{onUseMapBounds && <button className="knowledge-map-area" type="button" onClick={() => { const bounds = onUseMapBounds(); if (bounds) update({ bounds, center: null, radiusM: null, areaText: '' }); }} aria-pressed={draft.bounds !== null}>{m.mapArea}</button>}</div>
    </section>
    <section className="knowledge-filter-group"><h3>{m.purpose}</h3><p>{m.purposeHelp}</p><Choice label={m.purpose} value={draft.purpose} onChange={purpose => update({ purpose })} testId="knowledge-filter--purpose" options={[{ value: 'meal', label: m.meal, icon: 'meal' }, { value: 'rest', label: m.rest, icon: 'cup' }, { value: 'walk', label: m.walk, icon: 'walk' }]} /></section>
    <section className="knowledge-filter-group"><h3>{m.period}</h3><p>{m.periodHelp}</p><Choice label={m.period} value={draft.period} onChange={period => update({ period })} testId="knowledge-filter--period" options={[{ value: 'week', label: m.week }, { value: 'month', label: m.month }]} /></section>
    <section className="knowledge-filter-group"><h3>{m.audience}</h3><p>{m.audienceHelp}</p><Choice label={m.audience} value={draft.audience} onChange={audience => update({ audience })} testId="knowledge-filter--audience" options={[{ value: 'visible', label: m.all, icon: 'globe' }, { value: 'friends', label: m.friends, icon: 'people' }, { value: 'public', label: m.public, icon: 'lock' }]} /></section>
    <KnowledgeStatus error={error} />
    <div className="knowledge-bottom"><button type="button" className="knowledge-primary" disabled={busy || needsArea} onClick={() => onApply(draft)} data-testid="knowledge-filter--apply">{busy ? m.loading : m.apply}</button></div>
  </section>;
}

export function KnowledgeDetailView({ record, timeZone, center, onBack, onPlace, onAuthor, onSource, onShare, onRetryMedia, topicLabel, loadMedia, active = true }: {
  record: KnowledgeRecord; timeZone: string; center?: [number, number] | null; onBack: () => void; onPlace: (id: string) => void;
  onAuthor: (id: string) => void; onSource: () => void; onShare?: () => void;
  onRetryMedia?: (id: string) => Promise<void>; topicLabel?: string; loadMedia?: KnowledgeMediaLoader; active?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = () => { setMenu(false); menuTrigger.current?.focus(); };
  useEffect(() => { if (!active) { setMenu(false); return; } if (!menu) return; const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setMenu(false); menuTrigger.current?.focus(); } }; document.addEventListener('keydown', keydown, true); return () => document.removeEventListener('keydown', keydown, true); }, [menu, active]);
  const [title = '', ...body] = record.body.split('\n');
  return <article className="knowledge-panel knowledge-detail" data-testid="knowledge-detail">
    <Header title={m.detail} back={onBack}><button className="knowledge-icon-button" ref={menuTrigger} type="button" aria-label={m.more} aria-expanded={menu} onClick={() => setMenu(value => !value)}><KnowledgeIcon name="more" /></button></Header>
    {menu && <div className="knowledge-inline-menu"><button type="button" onClick={onSource}>{m.source}</button>{onShare && <button type="button" onClick={onShare}>{m.share}</button>}<button type="button" onClick={closeMenu}>{m.close}</button></div>}
    <div className="knowledge-visibility"><KnowledgeIcon name={record.visibility === 'public' ? 'globe' : 'lock'} />{record.visibility === 'public' ? m.published : record.visibility === 'selected' ? m.selected : m.private}</div>
    <div className="knowledge-gallery">{[...record.media].sort((a, b) => a.position - b.position).map(media => <KnowledgeMediaView key={media.id} media={media} description={title} active={active} onRetry={onRetryMedia} loadMedia={loadMedia} />)}</div>
    <h3 className="knowledge-detail-title">{title || m.experience}</h3>{body.length > 0 && <p className="knowledge-body">{body.join('\n')}</p>}
    <RecordIdentity record={record} timeZone={timeZone} center={center} /><RecordTags record={record} topicLabel={topicLabel} />
    <nav className="knowledge-related" aria-label="投稿の関連情報">
      <button type="button" disabled={!record.place} onClick={() => record.place && onPlace(record.place.id)}><KnowledgeIcon name="map" /><span>{m.placeMap}{!record.place && <small>{m.noPlace}</small>}</span><KnowledgeIcon name="chevron" /></button>
      <button type="button" onClick={() => onAuthor(record.person.id)}><KnowledgeIcon name="person" /><span>{m.authorMap}</span><KnowledgeIcon name="chevron" /></button>
      <button type="button" onClick={onSource}><KnowledgeIcon name="source" /><span>{m.source}<small>{m.sourceHelp}</small></span><KnowledgeIcon name="chevron" /></button>
    </nav>
  </article>;
}

export function KnowledgePlaceView({ name, records, totalCount, timeZone, onClose, onVoices, onOpen, error, loadMedia, active = true }: {
  name: string; records: KnowledgeRecord[]; totalCount: number; timeZone: string;
  onClose: () => void; onVoices: () => void; onOpen: (id: string) => void; error?: string | null; loadMedia?: KnowledgeMediaLoader; active?: boolean;
}) {
  const photo = records.flatMap(record => record.media).find(media => media.kind === 'photo' && media.status === 'ready');
  return <section className="knowledge-panel knowledge-local" data-testid="local-knowledge--place-sheet">
    <div className="knowledge-place-title"><h2>{name}</h2><IconButton icon="close" label="場所シートを閉じる" onClick={onClose} /></div><p className="knowledge-voice-count">{m.voice}　<output>{totalCount}件</output></p>
    {photo && <KnowledgeMediaView media={photo} description={`${name}に投稿された写真`} active={active} loadMedia={loadMedia} />}
    <KnowledgeStatus error={error} empty={totalCount === 0} />
    <ul className="knowledge-voices">{records.slice(0, 2).map(record => <li key={record.id}><KnowledgeAvatar src={record.person.iconPath} name={record.person.displayName} /><button type="button" onClick={() => onOpen(record.id)}><span>{record.person.displayName}・{formatKnowledgeDate(record.effectiveAt, timeZone)}</span><strong>「{record.body}」</strong></button></li>)}</ul>
    <button className="knowledge-voices-button" type="button" onClick={onVoices}>{m.voicesOpen}<KnowledgeIcon name="chevron" /></button>
  </section>;
}

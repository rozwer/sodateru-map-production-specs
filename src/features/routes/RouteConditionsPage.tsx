import { useId, useState, type KeyboardEvent } from 'react';
import { RouteIcon } from './icons';
import { PlaceImage, RouteHeader, RouteNotice, TimeChoice } from './components';
import { routeMessages as m } from './messages';
import type { Notice, PlaceOption, PlaceSearchView, RequestState, RouteDraft, RouteMode } from './types';
import './routes.css';

export interface RouteConditionsPageProps {
  draft: RouteDraft;
  onChange: (draft: RouteDraft) => void;
  onBack: () => void;
  onSearch: () => void;
  onSearchPlaces: (stopKey: string, query: string) => void;
  onOpenPasses: () => void;
  placeSearch: PlaceSearchView;
  state?: RequestState;
  notice?: Notice;
  demo?: boolean;
}

export function RouteConditionsPage({ draft, onChange, onBack, onSearch, onSearchPlaces, onOpenPasses, placeSearch, state = 'idle', notice, demo }: RouteConditionsPageProps) {
  const [openStop, setOpenStop] = useState<string | null>(null);
  const [activeOption, setActiveOption] = useState(-1);
  const [submitted, setSubmitted] = useState(false);
  const [sequence, setSequence] = useState(1);
  const listId = useId();
  const busy = state === 'loading' || state === 'saving';
  const options = placeSearch.stopKey === openStop ? placeSearch.options : [];
  const update = (patch: Partial<RouteDraft>) => onChange({ ...draft, ...patch });
  const choosePlace = (key: string, place: PlaceOption) => {
    update({ stops: draft.stops.map(s => s.key === key ? { ...s, query: place.name, place } : s) });
    setOpenStop(null); setActiveOption(-1);
  };
  const keyboard = (event: KeyboardEvent<HTMLInputElement>, key: string) => {
    if (event.key === 'Escape') { event.stopPropagation(); setOpenStop(null); setActiveOption(-1); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpenStop(key);
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      setActiveOption(current => options.length ? (current + offset + options.length) % options.length : -1);
    }
    if (event.key === 'Enter' && openStop === key && activeOption >= 0 && options[activeOption]) {
      event.preventDefault(); choosePlace(key, options[activeOption]);
    }
  };
  const move = (index: number, offset: number) => {
    const stops = [...draft.stops];
    [stops[index], stops[index + offset]] = [stops[index + offset]!, stops[index]!];
    update({ stops });
  };
  const modes: RouteMode[] = draft.mode === 'driving' ? ['walking', 'cycling', 'transit', 'driving'] : ['walking', 'cycling', 'transit'];
  return <article className="routes-page routes-conditions" data-testid="route-conditions">
    {demo && <p className="routes-demo" role="status">{m.mock}</p>}
    <RouteHeader eyebrow={m.findRoute} title={m.conditions} onBack={onBack}>{m.conditionsHelp}</RouteHeader>
    <form onSubmit={event => { event.preventDefault(); setSubmitted(true); if (draft.stops.every(s => s.place)) onSearch(); }}>
      <div className="routes-form-card">
        <div className="routes-stops">
          {draft.stops.map((stop, index) => {
            const label = index === 0 ? m.origin : index === draft.stops.length - 1 ? m.destination : `${m.waypoint} ${index}`;
            const invalid = submitted && !stop.place;
            const isOpen = openStop === stop.key;
            return <div className={`routes-stop ${index === draft.stops.length - 1 ? 'routes-stop-destination' : ''}`} key={stop.key}>
              <span className="routes-icon-bubble"><RouteIcon name={index === 0 ? 'origin' : 'pin'}/></span>
              <label htmlFor={`${listId}-${stop.key}`}>{label}</label>
              <div className="routes-place-control">
                <div className="routes-place-input-wrap">
                  {stop.place && <PlaceImage key={stop.place.imageUrl} src={stop.place.imageUrl} alt=""/>}
                  <div className="routes-place-input-text"><input id={`${listId}-${stop.key}`} role="combobox" aria-autocomplete="list" aria-expanded={isOpen} aria-controls={`${listId}-options-${stop.key}`} aria-activedescendant={isOpen && options[activeOption] ? `${listId}-option-${stop.key}-${activeOption}` : undefined} aria-invalid={invalid} aria-describedby={invalid ? `${listId}-error-${stop.key}` : undefined} value={stop.query} placeholder={m.placePlaceholder} autoComplete="off" disabled={busy} onFocus={() => { setOpenStop(stop.key); setActiveOption(-1); }} onBlur={event => { if (!event.currentTarget.parentElement?.closest('.routes-place-control')?.contains(event.relatedTarget as Node | null)) setOpenStop(null); }} onChange={event => { const query = event.target.value; update({ stops: draft.stops.map(s => s.key === stop.key ? { ...s, query, place: null } : s) }); setOpenStop(stop.key); setActiveOption(-1); onSearchPlaces(stop.key, query); }} onKeyDown={event => keyboard(event, stop.key)} data-testid={index === 0 ? 'route-conditions--origin' : index === draft.stops.length - 1 ? 'route-conditions--destination' : `route-conditions--waypoint-${stop.key}`}/>{stop.place?.address && <small>{stop.place.address}</small>}</div>
                  {(stop.query || stop.place) && <button className="routes-icon-button routes-clear" type="button" disabled={busy} aria-label={`${label}の${m.clearPlace}`} onClick={() => { update({ stops: draft.stops.map(s => s.key === stop.key ? { ...s, query: '', place: null } : s) }); setOpenStop(null); }}><RouteIcon name="close"/></button>}
                </div>
                {invalid && <p className="routes-field-error" id={`${listId}-error-${stop.key}`}>{m.selectPlace}</p>}
                {isOpen && <div className="routes-place-dropdown">
                  {placeSearch.stopKey === stop.key && placeSearch.state === 'loading' && <p role="status">{m.searchingPlaces}</p>}
                  {placeSearch.stopKey === stop.key && placeSearch.error && <RouteNotice notice={placeSearch.error}/>}
                  {placeSearch.stopKey === stop.key && placeSearch.state === 'idle' && options.length === 0 && stop.query && !stop.place && <p role="status">{m.emptyPlaces}</p>}
                  <ul id={`${listId}-options-${stop.key}`} role="listbox" aria-label={`${label}の検索結果`}>{options.map((place, optionIndex) => <li key={place.id} id={`${listId}-option-${stop.key}-${optionIndex}`} role="option" aria-selected={optionIndex === activeOption} onMouseDown={event => event.preventDefault()} onClick={() => choosePlace(stop.key, place)}><PlaceImage key={place.imageUrl} src={place.imageUrl} alt=""/><span>{place.name}{place.address && <small>{place.address}</small>}</span></li>)}</ul>
                </div>}
              </div>
              {index > 0 && index < draft.stops.length - 1 && <div className="routes-stop-order"><button type="button" className="routes-icon-button" aria-label={`${label}の${m.moveUp}`} disabled={busy || index === 1} onClick={() => move(index, -1)}><RouteIcon name="up"/></button><button type="button" className="routes-icon-button" aria-label={`${label}の${m.moveDown}`} disabled={busy || index === draft.stops.length - 2} onClick={() => move(index, 1)}><RouteIcon name="down"/></button><button type="button" className="routes-icon-button" aria-label={`${label}を削除`} disabled={busy} onClick={() => update({ stops: draft.stops.filter(s => s.key !== stop.key) })}><RouteIcon name="close"/></button></div>}
            </div>;
          })}
        </div>
        <button className="routes-add-waypoint" type="button" disabled={busy || draft.stops.length >= 10} onClick={() => { let next = sequence; while (draft.stops.some(s => s.key === `waypoint-${next}`)) next++; const stops = [...draft.stops]; stops.splice(stops.length - 1, 0, { key: `waypoint-${next}`, query: '', place: null }); update({ stops }); setSequence(next + 1); }} data-testid="route-conditions--waypoint"><span className="routes-icon-bubble"><RouteIcon name="plus"/></span><span><strong>{m.addWaypoint}</strong><small>{m.waypointHelp}</small></span><RouteIcon name="next"/></button>
        <TimeChoice label={m.departure} value={draft.departure} unspecified={m.now} onChange={departure => update({ departure })} disabled={busy}/>
        <fieldset className="routes-modes" disabled={busy}><legend>{m.mode}</legend><div>{modes.map(mode => <label key={mode} className={draft.mode === mode ? 'is-selected' : ''}><input type="radio" name={`${listId}-mode`} value={mode} checked={draft.mode === mode} onChange={() => update({ mode })}/><RouteIcon name={mode}/><span>{m[mode]}</span></label>)}</div></fieldset>
        <TimeChoice label={m.returnBy} value={draft.returnBy} unspecified={m.unspecified} onChange={returnBy => update({ returnBy })} disabled={busy}/>
        <label className="routes-switch-row"><span className="routes-icon-bubble"><RouteIcon name="stairs"/></span><span><strong>{m.stairs}</strong><small>{m.stairsHelp}</small></span><input type="checkbox" role="switch" checked={draft.avoidStairs} disabled={busy} onChange={event => update({ avoidStairs: event.target.checked })}/><span className="routes-switch" aria-hidden="true"/></label>
        <label className="routes-switch-row"><span className="routes-icon-bubble"><RouteIcon name="covered"/></span><span><strong>{m.covered}</strong><small>{m.coveredHelp}</small></span><input type="checkbox" role="switch" checked={draft.preferCovered} disabled={busy} onChange={event => update({ preferCovered: event.target.checked })}/><span className="routes-switch" aria-hidden="true"/></label>
        {draft.mode === 'transit' && <button type="button" className="routes-pass-link" onClick={onOpenPasses}><RouteIcon name="transit"/>{m.passes}<RouteIcon name="next"/></button>}
      </div>
      <RouteNotice notice={notice}/>
      <footer className="routes-footer"><button className="routes-primary" type="submit" disabled={busy} data-testid="route-conditions--search"><span>{busy ? m.searching : m.search}</span><RouteIcon name="next"/></button></footer>
    </form>
  </article>;
}

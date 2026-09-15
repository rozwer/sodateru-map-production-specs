import { ConditionSummary, distance, duration, PlaceImage, RouteHeader, RouteMap, RouteNotice } from './components';
import { RouteIcon } from './icons';
import { routeMessages as m } from './messages';
import type { Notice, RequestState, RouteCandidateView, RouteDraft, RouteMapView } from './types';
import './routes.css';

export interface RouteResultsPageProps {
  draft: RouteDraft;
  candidates: RouteCandidateView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onChangeConditions: () => void;
  onAdopt: (id: string) => void;
  map: RouteMapView;
  state?: RequestState;
  notice?: Notice;
  demo?: boolean;
}

export function RouteResultsPage({ draft, candidates, selectedId, onSelect, onBack, onChangeConditions, onAdopt, map, state = 'idle', notice, demo }: RouteResultsPageProps) {
  const selected = candidates.find(c => c.id === selectedId);
  const busy = state === 'loading' || state === 'saving';
  return <article className="routes-page routes-results" data-testid="route-results">
    {demo && <p className="routes-demo" role="status">{m.mock}</p>}
    <RouteHeader eyebrow={m.results} title={m.choose} onBack={onBack}>{m.resultsHelp}</RouteHeader>
    <RouteMap view={map}/>
    {state === 'loading' && <p role="status" className="routes-loading">{m.searching}</p>}
    {candidates.length === 0 && !busy && !notice && <div className="routes-empty"><h3>{m.emptyRoutes}</h3><p>{m.emptyRoutesHelp}</p></div>}
    <fieldset className="routes-candidate-group" disabled={busy}><legend className="routes-sr-only">{m.results}</legend><ul className="routes-candidates">{candidates.map(candidate => <li key={candidate.id} className={`routes-candidate ${selectedId === candidate.id ? 'is-selected' : ''}`}>
      <label className="routes-candidate-label"><input type="radio" name="route-candidate" checked={selectedId === candidate.id} onChange={() => onSelect(candidate.id)} aria-describedby={`route-candidate-details-${candidate.id}`} data-testid={`route-results--candidate--${candidate.id}`}/><strong>{candidate.name}</strong>{candidate.badge && <span className="routes-candidate-badge">{candidate.badge}</span>}</label>
      <div className="routes-candidate-body" id={`route-candidate-details-${candidate.id}`}><PlaceImage key={candidate.imageUrl} src={candidate.imageUrl} alt=""/><div className="routes-candidate-info"><p className="routes-candidate-time"><RouteIcon name={draft.mode}/><span>{m.travel} <b>{duration(candidate.travelDurationSec)}</b>{candidate.stayDurationSec != null && <> + {m.stay} {duration(candidate.stayDurationSec)}</>}{candidate.totalDurationSec != null && <> = <strong>{duration(candidate.totalDurationSec)}</strong></>}</span></p><p><RouteIcon name="pin"/><span>{m.distance} <b>{distance(candidate.distanceM)}</b></span></p>{candidate.totalDurationSec == null && <small>{m.totalUnknown}</small>}{candidate.description && <small>{candidate.description}</small>}
      {candidate.evaluations.map((evaluation, index) => <div className={`routes-evaluation is-${evaluation.status}`} key={`${evaluation.label}-${index}`}><RouteIcon name={evaluation.status === 'satisfied' ? 'origin' : 'warning'}/><span>{evaluation.label}<small>{evaluation.detail || m[evaluation.status]}</small></span></div>)}
      </div><button type="button" className="routes-icon-button routes-candidate-select" aria-label={`${candidate.name}を選ぶ`} disabled={busy} onClick={() => onSelect(candidate.id)}><RouteIcon name="next"/></button></div>
    </li>)}</ul></fieldset>
    <ConditionSummary draft={draft}/>
    <RouteNotice notice={notice}/>
    {selected && !selected.adoptable && <p className="routes-adoption-reason" id="route-adoption-reason">{selected.adoptionReason || m.cannotAdopt}</p>}
    <footer className="routes-footer routes-footer-split"><button type="button" className="routes-secondary" onClick={onChangeConditions} disabled={busy}>{m.changeConditions}</button><button type="button" className="routes-primary" disabled={busy || !selected?.adoptable} aria-describedby={selected && !selected.adoptable ? 'route-adoption-reason' : undefined} onClick={() => { if (selected?.adoptable) onAdopt(selected.id); }} data-testid="route-results--select">{state === 'saving' ? m.saving : m.adopt}</button></footer>
  </article>;
}

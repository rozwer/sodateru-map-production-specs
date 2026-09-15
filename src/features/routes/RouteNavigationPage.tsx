import { distance, duration, RouteMap, RouteNotice } from './components';
import { RouteIcon } from './icons';
import { routeMessages as m } from './messages';
import type { NavigationView, Notice, RouteMapView } from './types';
import './routes.css';

export interface RouteNavigationPageProps {
  navigation: NavigationView;
  map: RouteMapView;
  onClose: () => void;
  onWholeRoute: () => void;
  onLocate: () => void;
  onList: () => void;
  onFinish: () => void;
  onStart?: () => void;
  ending?: boolean;
  notice?: Notice;
  demo?: boolean;
}

export function RouteNavigationPage({ navigation: nav, map, onClose, onWholeRoute, onLocate, onList, onFinish, onStart, ending, notice, demo }: RouteNavigationPageProps) {
  const locationText = nav.locationStatus === 'available' && nav.accuracyM != null ? `${m.accuracy}：±${Math.round(nav.accuracyM)}m` : nav.locationStatus === 'locating' ? m.locating : nav.locationStatus === 'denied' ? m.locationDenied : nav.locationStatus === 'unavailable' ? m.locationUnavailable : m.noPosition;
  const instruction = nav.direction && nav.turnDistanceM != null ? nav.direction === 'arrive' ? m.arrive : `${distance(nav.turnDistanceM)}${m[nav.direction]}` : nav.instruction || m.turnUnavailable;
  return <article className="routes-page routes-navigation" data-testid="route-navigation">
    {demo && <p className="routes-demo" role="status">{m.mock}</p>}
    <header className="routes-nav-header"><button type="button" className="routes-icon-button" aria-label={m.closeNavigation} onClick={onClose} data-testid="route-navigation--close"><RouteIcon name="close"/></button><h2>{m.walkingNavigation}</h2><button type="button" className="routes-icon-button routes-white-circle" aria-label={m.wholeRoute} onClick={onWholeRoute}><RouteIcon name="map"/></button></header>
    <div className="routes-navigation-stage">
      <RouteMap view={map} className="routes-navigation-map"/>
      <section className="routes-turn-card" aria-label="次の案内"><div className="routes-turn-arrow">{nav.direction && <RouteIcon name={nav.direction}/>}</div><div className="routes-turn-instruction"><h3>{instruction}</h3><p>{nav.roadName || nav.instruction}</p></div><div className="routes-remaining"><span>{m.remaining} <strong>{duration(nav.remainingDurationSec, 0)}</strong></span><span>{distance(nav.remainingDistanceM)}</span></div></section>
      <div className="routes-map-controls"><p className="routes-accuracy" role="status"><RouteIcon name="locate"/>{locationText}</p><button type="button" className="routes-current-location" aria-label={m.locate} onClick={onLocate} disabled={nav.locationStatus === 'locating'} data-testid="route-navigation--locate"><RouteIcon name="locate"/></button></div>
    </div>
    <RouteNotice notice={notice}/>
    <div className="routes-navigation-actions"><button className="routes-list-link" type="button" onClick={onList} data-testid="route-navigation--list"><span className="routes-icon-bubble"><RouteIcon name="list"/></span><span><strong>{m.list}</strong><small>{m.listHelp}</small></span><RouteIcon name="next"/></button>{nav.status === 'saved' && onStart ? <button type="button" className="routes-primary" onClick={onStart} disabled={ending}>{m.startNavigation}</button> : <button className="routes-finish" type="button" onClick={onFinish} disabled={ending || nav.status === 'finished'} data-testid="route-navigation--end"><RouteIcon name="stop"/>{nav.status === 'finished' ? m.finished : ending ? m.finishing : m.finish}</button>}</div>
    {nav.fetchedAt != null && <p className="routes-fetched-at">{m.fetchedAt}：<time dateTime={new Date(nav.fetchedAt).toISOString()}>{new Date(nav.fetchedAt).toLocaleString('ja-JP')}</time></p>}
  </article>;
}

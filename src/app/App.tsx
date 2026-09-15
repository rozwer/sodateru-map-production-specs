import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type CSSProperties } from 'react';
import { messages } from '../messages';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { Status } from '../ui/Status';
import type { ProfileView, ScreenDefinition, ScreenProps } from './contracts';
import { MapBridge, type MapRendererComponent } from './map-bridge';
import { MapBridgeContext } from './useMapBridge';
import { ScreenKeyContext, ScreenStateContext } from './useScreenState';
import { NavigationStore, parseRoute, routeHash, routeKey } from './navigation';
import { NavigationMenu } from './NavigationMenu';
import '../ui/tokens.css';
import './app.css';

export interface AppProps {
  screens?: ScreenDefinition[];
  MapRenderer?: MapRendererComponent;
  MapToolbar?: ComponentType<ScreenProps>;
  MapCompanion?: ComponentType<{ scopeKey: string; onActivate: () => void; active?: boolean }>;
  scopeKey?: string;
  profile?: ProfileView | null;
  dataMode?: 'live' | 'demo';
  onStart?: () => void;
  active?: boolean;
}
export function App({ scopeKey = 'unresolved', ...props }: AppProps) {
  // All page state and temporary map results are discarded atomically on context change.
  return <ScopedApp key={scopeKey} scopeKey={scopeKey} {...props}/>;
}
function ScopedApp({ screens = [], MapRenderer, MapToolbar, MapCompanion, scopeKey = 'unresolved', profile, dataMode, onStart, active = true }: AppProps) {
  const [bridge] = useState(() => new MapBridge(scopeKey));
  const [navigation] = useState(() => {
    const route = parseRoute(location.hash);
    return new NavigationStore(onStart && route.pageId === '$start' ? { pageId: 'map', params: {} } : route);
  });
  const entries = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot);
  const current = entries.at(-1)!;
  const [saved] = useState(() => new Map<string, unknown>());
  const [locationError, setLocationError] = useState<string | null>(null);
  const [visited, setVisited] = useState(() => new Map([[current.key, current.route]]));
  const lastDepth = useRef(entries.length);
  const contentRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(80);
  const menuMode = current.route.pageId === 'navigation' ? (current.route.params.mode || 'main') as 'main' | 'self' | 'community' : null;
  const screen = screens.find(item => item.id === current.route.pageId);
  const fullscreen = !menuMode && screen?.layout?.presentation === 'fullscreen';
  const Toolbar = screen?.toolbar ?? MapToolbar;
  const isMapPage = current.route.pageId === 'map';
  const mapPanelOpen = isMapPage && !!screen && ['state', 'placeId', 'buildingKey', 'q'].some(key => !!current.route.params[key]);
  const isMap = isMapPage && !mapPanelOpen;
  const mapControlsCovered = !isMapPage && menuMode !== 'self' && menuMode !== 'community' && !screen?.layout?.mapControls;
  const showBottomNav = menuMode !== null || screen?.layout?.bottomNav !== false;
  const title = menuMode ? messages.menu : screen?.title || ({ 'self-home': messages.self, 'community-home': messages.community, settings: messages.settings, 'plugin-store': messages.plugins, '$start': messages.start }[current.route.pageId] ?? current.route.pageId);
  const go = useCallback((pageId: string, params: Record<string, string> = {}) => {
    if (pageId === '$start' && onStart) { navigation.reset(); onStart(); return; }
    if (contentRef.current) current.scrollTop = contentRef.current.querySelector<HTMLElement>('[data-sheet-scroll]')?.scrollTop ?? 0;
    const carry: Record<string, string> = {};
    for (const key of ['date', 'from', 'to', 'timeZone']) if (current.route.params[key]) carry[key] = current.route.params[key];
    const previous = navigation.getSnapshot();
    navigation.navigate(pageId, { ...carry, ...params });
    const next = navigation.getSnapshot();
    if (next !== previous) history.pushState({ sodateruDepth: next.length }, '', routeHash(next.at(-1)!.route));
  }, [navigation, current, onStart]);
  const back = useCallback(() => {
    if (entries.length > 1) history.back();
    else { navigation.reset(); history.replaceState({ sodateruDepth: 1 }, '', '#/map'); }
  }, [entries.length, navigation]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => setNavHeight(nav.getBoundingClientRect().height + 16);
    const observer = new ResizeObserver(measure); observer.observe(nav); measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!(onStart && parseRoute(location.hash).pageId === '$start')) history.replaceState({ sodateruDepth: entries.length }, '', routeHash(current.route));
    const pop = (event: PopStateEvent) => {
      if (event.state?.sodateruDepth === navigation.getSnapshot().length - 1) navigation.back();
      else navigation.reset(parseRoute(location.hash));
    };
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('popstate', pop); bridge.dispose(); };
  }, [bridge, navigation]);
  useEffect(() => {
    setVisited(previous => new Map(previous).set(current.key, current.route));
    const movingBack = entries.length < lastDepth.current;
    lastDepth.current = entries.length;
    const frame = requestAnimationFrame(() => {
      const scroll = contentRef.current?.querySelector<HTMLElement>('[data-sheet-scroll]');
      if (scroll) scroll.scrollTop = current.scrollTop;
      const restored = current.focus?.isConnected ? current.focus : current.focusId ? document.getElementById(current.focusId) :
        [...(contentRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(button => !button.closest('[hidden]') && button.textContent === current.focusText);
      if (movingBack && restored) restored.focus({ preventScroll: true });
      else contentRef.current?.querySelector<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [current.key, entries.length]);
  const onRect = useCallback((rect: DOMRect | null) => {
    if (fullscreen) { bridge.setPadding({ top: 24, right: 24, bottom: 24, left: 24 }); return; }
    const padding = { top: 24, right: 24, bottom: (showBottomNav ? navHeight : 0) + 24, left: 24 };
    if (rect && rect.width < window.innerWidth * .85) {
      if (rect.left < window.innerWidth / 2) padding.left = rect.right + 24;
      else padding.right = window.innerWidth - rect.left + 24;
    } else if (rect) padding.bottom = window.innerHeight - rect.top + 24;
    bridge.setPadding(padding);
  }, [bridge, navHeight, showBottomNav, fullscreen]);
  const locate = () => {
    setLocationError(null);
    if (!navigator.geolocation) { setLocationError(messages.locationDenied); return; }
    navigator.geolocation.getCurrentPosition(position => {
      bridge.setView({ following: true });
      bridge.focus('map-search', { center: [position.coords.longitude, position.coords.latitude], zoom: Math.max(bridge.getSnapshot().camera.zoom, 15) });
    }, () => setLocationError(messages.locationDenied), { enableHighAccuracy: true, timeout: 10000 });
  };
  const screenProps: ScreenProps = { route: current.route, navigate: go, back, scopeKey, active: active && !mapControlsCovered };
  return <MapBridgeContext.Provider value={bridge}><ScreenStateContext.Provider value={saved}>
    <main className="sm-app" style={{ '--bottom-nav-height': `${showBottomNav ? navHeight : 0}px` } as CSSProperties} onClickCapture={event => {
      // WebKit may leave focus on the dialog after a pointer activation. Record the real trigger.
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (button && !button.disabled) button.focus({ preventScroll: true });
    }} onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented && !isMap) { event.preventDefault(); back(); } }}>
      <div className="sm-map-host" hidden={fullscreen} aria-label={messages.appName}>{MapRenderer ? <MapRenderer bridge={bridge}/> : <div className="sm-map-unavailable"><Status kind="unavailable">{messages.mapPending}</Status></div>}</div>
      {Toolbar && <div className={`sm-map-toolbar${screen?.toolbar ? ' sm-map-toolbar--page' : ''}`} hidden={mapControlsCovered}><Toolbar {...screenProps}/></div>}
      {MapCompanion && <div hidden={!active || !isMap}><MapCompanion scopeKey={scopeKey} active={active && isMap} onActivate={() => go('ai-explore')}/></div>}
      {menuMode === 'main' && <button type="button" className="sm-menu-backdrop" onClick={back} aria-label={messages.close} aria-hidden="true" tabIndex={-1}/>}
      <button type="button" hidden={mapControlsCovered || !!screen?.toolbar} className="sm-map-action sm-menu-trigger" aria-label={messages.menu} onClick={() => go('navigation', { mode: 'main' })}><Icon name="menu"/></button>
      <button type="button" hidden={mapControlsCovered || !!MapRenderer} className="sm-map-action sm-locate-trigger" aria-label={messages.locate} onClick={locate}><Icon name="locate" size={28}/></button>
      {locationError && <div className="sm-location-error"><Status kind="error" onRetry={locate}>{locationError}</Status></div>}
      {dataMode === 'demo' && <span className="sm-demo-badge">{messages.demo}</span>}
      <div ref={contentRef}>
        <Sheet open={!isMap} title={title} onClose={back} onBack={!menuMode && (entries.length > 1 || screen?.layout?.header === 'back') ? back : undefined} side={menuMode === 'main' ? 'right' : 'left'} kind={menuMode ? 'navigation' : 'screen'} presentation={fullscreen ? 'fullscreen' : 'panel'} header={screen?.layout?.header} contentPadding={screen?.layout?.contentPadding} mobileHeight={screen?.layout?.mobileHeight} background={screen?.layout?.background} onRect={onRect}>
          {menuMode && <NavigationMenu mode={menuMode} profile={profile} navigate={go}/>}
          {!menuMode && !screen && (current.route.pageId === 'self-home' || current.route.pageId === 'community-home') && <NavigationMenu mode={current.route.pageId === 'self-home' ? 'self' : 'community'} profile={profile} navigate={go}/>}
          {!menuMode && !screen && !['self-home','community-home','map'].includes(current.route.pageId) && <Status kind="unavailable">{messages.unavailable}</Status>}
          {[...visited.entries()].filter(([,route]) => screens.some(item => item.id === route.pageId)).map(([key,route]) => {
            const Component = screens.find(item => item.id === route.pageId)!.component;
            return <div key={key} hidden={key !== current.key} inert={key !== current.key} className="sm-screen-content"><ScreenKeyContext.Provider value={routeKey(route)}><Component route={route} navigate={go} back={back} scopeKey={scopeKey} active={active && key === current.key}/></ScreenKeyContext.Provider></div>;
          })}
        </Sheet>
      </div>
      <nav ref={navRef} hidden={!showBottomNav} className="sm-bottom-nav" aria-label="画面の切替">
        <button type="button" aria-pressed={menuMode === 'self' || current.route.pageId === 'self-home'} onClick={() => go('navigation', { mode: 'self' })}><Icon name="person" size={25}/><span>{messages.self}</span></button>
        <button type="button" className="sm-bottom-nav__map" aria-label={messages.map} onClick={() => go('map')}><Icon name="map" size={29}/></button>
        <button type="button" aria-pressed={menuMode === 'community' || current.route.pageId === 'community-home'} onClick={() => go('navigation', { mode: 'community' })}><Icon name="people" size={27}/><span>{messages.communityMap}</span></button>
      </nav>
    </main>
  </ScreenStateContext.Provider></MapBridgeContext.Provider>;
}

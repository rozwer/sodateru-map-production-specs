import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useMapBridge } from '../../app/useMapBridge';
import { useSession } from '../../app/session';
import { api } from '../../app/api';
import type { SceneOverlay } from '../../map/MapScene';
import type { PluginTrialResult, PluginTrialPreview } from '../../../packages/api-client';
import { useDisasterData, toDisasterMapData, createDisasterDemo } from './data';
import type { DisasterSettings, DisasterLayerId } from './types';
import { DisasterPanel, DisasterIcon, regions } from './ui/DisasterPanel';
import { disasterMapDisplay, buildDisasterMapDisplay } from './ui/map-state';
import './ui/disaster.css';

const defaults: DisasterSettings = { region: regions[0]!, layerIds: ['flood-hazard', 'terrain', 'rainfall'] };
const layerNames = { 'flood-hazard': '洪水想定', terrain: '地形', rainfall: '降水解析' };
const clock = (at: number | null | undefined) => at ? new Date(at).toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'}) : '未取得';
function validSettings(value: unknown): value is DisasterSettings {
  const s = value as DisasterSettings | undefined;
  return !!s?.region && typeof s.region.id === 'string' && Array.isArray(s.region.bounds) && s.region.bounds.length === 4 && s.region.bounds.every(Number.isFinite) && Array.isArray(s.layerIds) && s.layerIds.every(id => id in layerNames);
}
export function DisasterScreen({ scopeKey, navigate, active = true }: ScreenProps) {
  const bridge = useMapBridge();
  const session = useSession();
  const data = useDisasterData(scopeKey);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
  const previousCamera = useRef(bridge.getSnapshot().camera);
  const [settings, setSettings] = useState<DisasterSettings>(defaults);
  const [tab, setTab] = useState<'layers' | 'sources'>('layers');
  const [compact, setCompact] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [wide, setWide] = useState(false);
  const [trial, setTrial] = useState<PluginTrialResult | null>(null);
  const [preview, setPreview] = useState<PluginTrialPreview | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [opacity, setOpacity] = useState(.65);
  const current = data.view?.settings;
  const installed = !!current;
  const enabled = current?.enabled ?? false;
  const busy = data.busy || localBusy;
  const materials = useMemo(() => data.view ? toDisasterMapData(data.view) : null, [data.view]);
  const operation = useRef<AbortController | null>(null);
  const focusRegion = (value = settings) => {
    const [w,s,e,n] = value.region.bounds;
    bridge.setCamera({longitude:(w!+e!)/2,latitude:(s!+n!)/2,pitch:0,bearing:0});
    bridge.setView({dimension:'2d',lens:'physical',following:false});
    bridge.focus('plugin:disaster-ui', {bounds:[[w!,s!],[e!,n!]],padding: compact ? {top:220,bottom:wide?110:350,left:25,right:65} : {top:160,bottom:60,left:420,right:90}});
  };
  useEffect(() => {
    setToolbarHost(document.getElementById('disaster-toolbar-root'));
    const resize = () => setCompact(window.innerWidth < 768);
    resize(); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active]);
  useEffect(() => {
    const value = current?.settings;
    if (validSettings(value)) { setSettings(value); setPreview(null); }
  }, [current?.version, current?.installId]);
  useEffect(() => {
    if (!active) { operation.current?.abort(); return; }
    if (data.busy) return;
    if (!installed && session?.dataMode === 'demo' && !preview && !trial) setPreview(createDisasterDemo());
  }, [active,data.busy,installed,session?.dataMode]);
  useEffect(() => { if (active) focusRegion(); }, [active, settings.region.id]);
  useEffect(() => {
    const store = disasterMapDisplay(bridge);
    if (!active) { if (preview) store.clear(); return; }
    let cancelled = false;
    store.clear(); setRenderError(null);
    if (data.busy) return;
    if (preview && !installed) {
      const overlays = preview.features.map(feature => ({id:String(feature.id),ownerKey:'plugin:disaster-preview',geometry:feature.geometry as SceneOverlay['geometry'],label:feature.properties.label,color:preview.legends.find(legend => legend.id === feature.properties.legendId)?.color ?? '#e59745',opacity:.3}));
      store.set({ownerKey:'plugin:disaster-preview',images:[],overlays});
    } else if (materials?.action === 'apply' && materials.ownerKey) {
      void buildDisasterMapDisplay(materials.view, opacity).then(display => {
        if (!cancelled) store.set(display);
      }).catch(() => { if (!cancelled) { store.clear(); setRenderError('防災画像を地図に描画できませんでした。情報を更新して再試行してください。'); } });
    }
    return () => { cancelled = true; };
  }, [active,bridge,materials,preview,installed,opacity,data.busy]);
  useEffect(() => () => { operation.current?.abort(); }, []);
  const run = async (job: (signal: AbortSignal) => Promise<void>) => {
    operation.current?.abort(); const controller = new AbortController(); operation.current = controller;
    setLocalBusy(true); setLocalError(null);
    try { await job(controller.signal); } catch (error) { if (!controller.signal.aborted) setLocalError(error instanceof Error ? error.message : '操作を完了できませんでした。'); }
    finally { if (!controller.signal.aborted) setLocalBusy(false); }
  };
  const makeTrial = (value: DisasterSettings, confirm: boolean) => run(async signal => {
    const catalog = await api.request('getPlugins', {signal});
    const plugin = catalog.items.find(item => item.id === 'disaster');
    if (!plugin) throw new Error('防災機能が登録されていません。');
    const response = await api.request('postPluginTrial', {path:{pluginId:'disaster'},body:{pluginVersion:plugin.pluginVersion,settings:value},idempotencyKey:crypto.randomUUID(),signal});
    if (signal.aborted) return;
    setPreview(response.data.preview); if (confirm) setTrial(response.data);
  });
  const changeSettings = (value: DisasterSettings) => {
    setSettings(value); setNotice('');
    if (installed) { disasterMapDisplay(bridge).clear(); void data.saveSettings(value); }
    else void makeTrial(value,false);
  };
  const toggleLayer = (id: DisasterLayerId) => changeSettings({...settings,layerIds:settings.layerIds.includes(id) ? settings.layerIds.filter(layer => layer !== id) : [...settings.layerIds,id]});
  const install = () => run(async signal => {
    if (!trial) return;
    if (trial.conflicts.length) throw new Error('他の拡張機能との競合を解決してから導入してください。');
    await api.request('postPluginSettings', {body:{id:'disaster',pluginVersion:trial.snapshot.pluginVersion,settings:trial.snapshot.settings,icon:trial.snapshot.icon,enabled:true,confirmed:true,stateRevision:trial.stateRevision},idempotencyKey:crypto.randomUUID(),signal});
    if (signal.aborted) return;
    setTrial(null); setPreview(null); setNotice('導入しました。「防災情報を更新」で実情報を取得できます。');
    await data.load();
  });
  const leave = () => { if (preview) disasterMapDisplay(bridge).clear(); bridge.clear('plugin:disaster-ui'); bridge.setCamera(previousCamera.current); navigate('map'); };
  const viewNotice = data.view?.stale ? '保存された情報は古いか、更新に失敗しています。取得時刻と状況を確認してください。' : data.view?.map.reason === 'settingsChanged' ? '地域・レイヤー設定が変わりました。情報を更新してください。' : installed && !enabled ? '防災レイヤーは停止中です。保存された情報は保持されています。' : '';
  const toolbar = <section className="disaster-app" data-compact={compact} data-expanded={expanded} data-wide-map={wide} aria-label="防災マップ">
      <header className="disaster-header"><div className="disaster-brand"><DisasterIcon name="shield"/><div><small>わたしの街を、備える街に</small><h2>防災マップ</h2></div></div><button className="disaster-back" onClick={leave}>街の地図へ</button></header>
      <div className="disaster-area"><span><DisasterIcon name="pin"/><b>{settings.region.id}</b><small>選んだ地域の周辺</small></span><button disabled={busy} onClick={() => { const {longitude:x,latitude:y} = bridge.getSnapshot().camera; changeSettings({...settings,region:{id:'地図の中心',bounds:[x-.03,y-.025,x+.03,y+.025]}}); }}>地図の中心で調べる</button></div>
      <div className="disaster-map-mode" aria-label="防災レイヤーの切替">{(['flood-hazard','terrain','rainfall'] as const).map(id => <button key={id} disabled={busy || settings.layerIds.length === 1 && settings.layerIds.includes(id)} aria-pressed={settings.layerIds.includes(id)} onClick={() => toggleLayer(id)}>{layerNames[id]}</button>)}</div>
      <button className="disaster-live-chip" data-alert={!data.view?.result || data.view.stale} onClick={() => {setTab('sources');setWide(false);}}>{preview ? '模擬表示' : data.view?.result ? '保存された防災情報' : '防災情報は未取得'}<small>{preview ? '実情報ではありません' : `${clock(data.view?.result?.fetchedAt)} 取得`} ›</small></button>
      {preview && <div className="disaster-mode-badge">架空の範囲を示すデモです。実際の災害情報ではありません。</div>}
      <div className="disaster-map-tools"><button onClick={() => { const zoom = bridge.getSnapshot().camera.zoom; bridge.setCamera({zoom:Math.min(zoom+1,18)}); }} aria-label="地図を拡大">＋</button><button onClick={() => { const zoom = bridge.getSnapshot().camera.zoom; bridge.setCamera({zoom:Math.max(zoom-1,3)}); }} aria-label="地図を縮小">−</button></div>
      <div className="disaster-terrain-key"><b>{preview ? '模擬ハザードの凡例' : '地図の重ね合わせ'}</b>{preview ? <><span><i style={{background:'#e59745',width:24}}/>架空の範囲</span><small>実際の浸水想定ではありません</small></> : <><label style={{fontSize:11}}>濃さ<input aria-label="防災レイヤーの濃さ" type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={event => setOpacity(Number(event.target.value))}/></label><small>灰色の範囲：欠測・未確認</small><button onClick={() => {setTab('sources');setWide(false);}}>情報ごとの凡例・時点を確認 ›</button></>}</div>
    </section>;
  return <div className="disaster-screen disaster-app" data-compact={compact} data-expanded={expanded} data-wide-map={wide}>
    {active && toolbarHost && createPortal(toolbar, toolbarHost)}
      <div className="disaster-panel"><div className="disaster-panel-size"><button onClick={() => {setWide(!wide);setExpanded(false);}}>{wide ? '情報を戻す ▴' : '地図を広く ▾'}</button><button onClick={() => {setExpanded(!expanded);setWide(false);}}>{expanded ? '情報をたたむ ▾' : '情報を広く ▴'}</button></div>
        {trial ? <div className="disaster-scroll"><button className="disaster-text-button" onClick={() => setTrial(null)}>‹ 条件に戻る</button><h3>防災マップを導入する</h3><p className="disaster-caption">{settings.region.id} / {settings.layerIds.map(id => layerNames[id]).join('・')}</p><p className="disaster-message">試用中の色は模擬表示です。導入後に情報を取得します。</p><p className="disaster-caption">地域とレイヤーの設定を保存し、あなたの地図に追加します。</p>{localError && <p role="alert" className="disaster-error">{localError}</p>}<button className="disaster-primary" disabled={busy} onClick={install}>導入する</button><button className="disaster-secondary" disabled={busy} onClick={() => setTrial(null)}>キャンセル</button></div> : <DisasterPanel settings={settings} layers={materials?.layers ?? []} busy={busy} error={localError || data.error || renderError} notice={notice || viewNotice} installed={installed} enabled={enabled} demo={!!preview} demoLabel={preview?.label} demoWarnings={preview?.warnings} onSettings={changeSettings} onRefresh={() => {setNotice(''); void data.refresh();}} onEnabled={value => {disasterMapDisplay(bridge).clear();void data.setEnabled(value);}} onInstall={() => {void makeTrial(settings,true);}} onLayer={toggleLayer} onFocus={() => focusRegion()} tab={tab} setTab={setTab}/>}
      </div>
  </div>;
}
export function DisasterToolbar() { return <div id="disaster-toolbar-root" className="disaster-toolbar-root"/>; }
export const disasterScreens: ScreenDefinition[] = [{id:'disaster-map',title:'防災マップ',component:DisasterScreen,toolbar:DisasterToolbar,layout:{presentation:'panel',header:'none',contentPadding:'none',bottomNav:false,mapControls:true,mobileHeight:42}}];

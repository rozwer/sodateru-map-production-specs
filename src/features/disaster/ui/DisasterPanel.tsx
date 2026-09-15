import { useState } from 'react';
import type { DisasterLayer, DisasterLayerId, DisasterSettings, DisasterStatus } from '../types';

const labels: Record<DisasterLayerId, string> = { 'flood-hazard': '洪水の浸水想定', terrain: '地形と起伏', rainfall: '降水の状況' };
const statuses: Record<DisasterStatus, string> = { available: '取得済み', partial: '一部未取得', missing: 'データなし', outOfCoverage: '収録範囲外', providerError: '提供元から取得できません' };
const date = (at: number | null | undefined) => at ? new Date(at).toLocaleString('ja-JP') : '未確認';
export const regions = [
  { id: '江戸川周辺', bounds: [139.84,35.68,139.92,35.76] },
  { id: '名古屋・本山', bounds: [136.945,35.14,137.005,35.19] },
  { id: '京都・鴨川', bounds: [135.74,34.98,135.80,35.04] },
];
export function DisasterIcon({ name }: { name: 'shield' | 'pin' | 'rain' | 'refresh' }) {
  const paths = { shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Zm-4 9 3 3 5-6', pin: 'M12 3a7 7 0 0 0-7 7c0 6 7 11 7 11s7-5 7-11a7 7 0 0 0-7-7Zm0 5v4m-2-2h4', rain: 'M5 13a4 4 0 0 1-1-8 6 6 0 0 1 11-1 4 4 0 0 1 3 9M7 16l-2 4m7-4-2 4m7-4-2 4', refresh: 'M20 8a8 8 0 1 0 0 8m0-13v5h-5' };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;
}
export function DisasterPanel({ settings, layers, busy, error, notice, enabled, installed, demo, onSettings, onRefresh, onEnabled, onInstall, onLayer, onFocus, tab, setTab }: {
  settings: DisasterSettings; layers: DisasterLayer[]; busy: boolean; error: string | null; notice?: string; enabled: boolean; installed: boolean; demo: boolean;
  onSettings: (settings: DisasterSettings) => void; onRefresh: () => void; onEnabled: (value: boolean) => void; onInstall: () => void; onLayer: (layer: DisasterLayerId) => void; onFocus: () => void;
  tab: 'layers' | 'sources'; setTab: (tab: 'layers' | 'sources') => void;
}) {
  const [detail, setDetail] = useState<DisasterLayerId | null>(null);
  return <>
    <nav aria-label="防災メニュー"><button aria-pressed={tab === 'layers'} onClick={() => setTab('layers')}><DisasterIcon name="pin"/>地図とレイヤー</button><button aria-pressed={tab === 'sources'} onClick={() => setTab('sources')}><DisasterIcon name="rain"/>取得状況・出典</button></nav>
    <div className="disaster-scroll">
      {demo && <p className="disaster-error">模擬データの表示確認です。実際の災害情報ではありません。</p>}
      {busy && <p role="status" className="disaster-message">防災情報を更新しています…</p>}
      {error && <div role="alert" className="disaster-error">{error}<button className="disaster-secondary" disabled={busy} onClick={onRefresh}>再試行</button></div>}
      {notice && <p className="disaster-message" role="status">{notice}</p>}
      {tab === 'layers' ? <>
        <div className="disaster-section-title"><h3>わたしの街の防災</h3><button aria-label="防災情報を更新" disabled={busy || !installed || !enabled} onClick={onRefresh}><DisasterIcon name="refresh"/></button></div>
        <label className="disaster-region">地域を選ぶ<select aria-label="防災の地域" value={settings.region.id} disabled={busy} onChange={event => { const region = regions.find(item => item.id === event.target.value); if (region) onSettings({ ...settings, region }); }}>{!regions.some(region => region.id === settings.region.id) && <option value={settings.region.id}>{settings.region.id}</option>}{regions.map(region => <option key={region.id}>{region.id}</option>)}</select></label>
        <button className="disaster-text-button" onClick={onFocus}>選んだ地域を地図に表示 ↗</button>
        <p className="disaster-caption">知りたい情報を重ねて、地形と水の関係を確かめます。</p>
        {(Object.keys(labels) as DisasterLayerId[]).map(id => { const layer = layers.find(item => item.layerId === id); return <article className="disaster-layer-card" key={id}>
          <div className="disaster-layer-toggle"><label><input type="checkbox" checked={settings.layerIds.includes(id)} disabled={busy || settings.layerIds.length === 1 && settings.layerIds.includes(id)} onChange={() => onLayer(id)}/>{labels[id]}</label><button aria-label={`${labels[id]}の詳細`} onClick={() => setDetail(detail === id ? null : id)}>詳細</button></div>
          <p>{layer ? statuses[layer.status] : '未取得'}{id === 'rainfall' && layer ? ` · 解析 ${date(layer.validAt)}` : ''}</p>
          {detail === id && <div className="disaster-layer-detail">{layer ? <LayerDetails layer={layer}/> : <p>この情報はまだ取得されていません。導入・有効化後に情報を更新してください。</p>}</div>}
        </article>; })}
        <p className="disaster-caption">色のない場所や欠測範囲を、安全・浸水深0mとは判断できません。</p>
        {installed ? <button className="disaster-primary" disabled={busy} onClick={() => onEnabled(!enabled)}>{enabled ? '防災レイヤーを停止' : '防災レイヤーを有効にする'}</button> : <button className="disaster-primary" disabled={busy} onClick={onInstall}>この条件で導入へ</button>}
      </> : <>
        <div className="disaster-section-title"><h3>情報の時点と出典</h3></div>
        {!layers.length && <p className="disaster-message">取得した情報がありません。レイヤー画面から導入・更新してください。</p>}
        {layers.map(layer => <article className="disaster-layer-card" key={layer.layerId}><h3>{labels[layer.layerId]}</h3><LayerDetails layer={layer}/></article>)}
        <p className="disaster-caption">避難場所の開設情報、警報速報、津波・流域データは未接続です。</p>
      </>}
    </div>
  </>;
}
function LayerDetails({ layer }: { layer: DisasterLayer }) {
  return <><p>{layer.meaning}</p><dl><dt>取得状態</dt><dd>{statuses[layer.status]}</dd><dt>取得時刻</dt><dd>{date(layer.fetchedAt)}</dd><dt>提供元の更新時刻</dt><dd>{date(layer.sourceUpdatedAt)} · {layer.sourceUpdatedAtMeaning}</dd>{layer.validAt && <><dt>解析対象時刻</dt><dd>{date(layer.validAt)}</dd></>}<dt>収録範囲</dt><dd>{layer.coverage.description}</dd><dt>出典</dt><dd>{layer.attribution}</dd></dl><p>{layer.legend.description}</p><a href={layer.legend.url} target="_blank" rel="noreferrer">提供元の凡例 ↗</a>{layer.layerId === 'rainfall' && <img style={{maxWidth:'100%',marginTop:12}} src={layer.legend.url} alt="提供元の降水強度凡例"/>}<p><a href={layer.sourceUrl} target="_blank" rel="noreferrer">提供元で詳しく確認 ↗</a></p>{layer.unknowns.map((unknown,i) => <p className="disaster-error" key={i}>{unknown}</p>)}</>;
}

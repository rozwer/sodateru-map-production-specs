import { createRoot } from 'react-dom/client';
import { SessionRoot } from '../../../src/app/SessionRoot';
import { useSession } from '../../../src/app/session';
import { useScreenState } from '../../../src/app/useScreenState';
import type { ScreenProps } from '../../../src/app/contracts';

// Real CORE session API. Only the draft panel/map placeholder are an explicit QA fixture.
function Draft({ back, navigate, scopeKey }: ScreenProps) {
  const [draft, setDraft] = useScreenState('');
  return <section className="sm-stack" style={{ padding: 16 }}>
    <h1>セッション確認用の下書き</h1><p>検査画面・実業務フォームではありません。</p><output>{scopeKey}</output>
    <label>下書き<input aria-label="下書き" value={draft} onChange={event => setDraft(event.target.value)}/></label>
    <button className="sm-button" onClick={() => navigate('$start')}>本人とモードを変更</button><button className="sm-button" onClick={back}>戻る</button>
  </section>;
}
function SessionMap() {
  const session = useSession();
  return <div style={{ padding: '120px 24px', background: '#edf7f5', height: '100%' }}><strong>実セッション・地図は検査用表示</strong><p>{session?.session?.person.name}</p><p>{session?.dataMode}</p></div>;
}
function MapToolbar({ navigate }: ScreenProps) {
  return <button className="sm-button" onClick={() => navigate('map', { state: 'search-place-selected' })}>検索結果を開く（検査用）</button>;
}
function PlaceToolbar({ back, navigate }: ScreenProps) {
  return <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#fff' }}>
    <button className="sm-button" onClick={back}>戻る</button><h1>地域の知のヘッダー検査</h1><button className="sm-button" onClick={() => navigate('navigation', { mode: 'main' })}>メニュー</button>
  </header>;
}
createRoot(document.getElementById('root')!).render(<SessionRoot MapRenderer={SessionMap} MapToolbar={MapToolbar} screens={[
  { id: 'settings', title: 'セッション検査', component: Draft, layout: { header: 'none', contentPadding: 'none', bottomNav: false } },
  { id: 'map', title: '検索結果のSheet検査', component: () => <p>検査用の結果表示。業務検索はUI-MAPで確認します。</p>, layout: { header: 'close', mobileHeight: 45, mapControls: true } },
  { id: 'local-knowledge', title: '地域の知の枠検査', toolbar: PlaceToolbar, component: () => <p>検査用の場所シート</p>, layout: { header: 'none', contentPadding: 'none', mobileHeight: 58, mapControls: true } },
]}/>);

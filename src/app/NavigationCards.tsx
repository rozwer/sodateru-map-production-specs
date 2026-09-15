import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ScreenProps } from './contracts';
import { Icon, type IconName } from '../ui/Icon';
import { useScreenState } from './useScreenState';
import { navigationExamples, readNavigationPhotos, type NavigationPhoto } from './navigation-card-data';
import './navigation-cards.css';

type Mode = 'self' | 'community';
const options: Record<Mode, { page: string; title: string; description: string; icon: IconName; details: string[] }[]> = {
  self: [
    { page: 'daily-track', title: '今日の軌跡', description: '今日を振り返る', icon: 'clock', details: [] },
    { page: 'type-diagnosis', title: 'タイプ診断', description: '最近の自分を知る', icon: 'chart', details: ['体験から見える傾向', '気になる傾向と、その根拠へ'] },
    { page: 'personal-map', title: 'わたしの地図', description: '自分のテーマで見る', icon: 'map', details: ['好きな場所をつなぐ', '記録やテーマから街を見返す'] },
  ],
  community: [
    { page: 'local-knowledge', title: '地域の知', description: 'まちのストーリーから知る', icon: 'pin', details: [] },
    { page: 'friends-map', title: '友達の地図', description: '友達の軌跡を見てみる', icon: 'people', details: ['友達の体験に出会う', '共有された場所やルートへ'] },
  ],
};
export function NavigationCards({ mode, navigate, dataMode }: { mode: Mode; navigate: ScreenProps['navigate']; dataMode?: 'live' | 'demo' }) {
  const rows = options[mode];
  const [index, setIndex] = useScreenState(0);
  const rail = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<NavigationPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    readNavigationPhotos(mode, controller.signal).then(setPhotos).catch(() => {
      if (!controller.signal.aborted) setError('記録を読み込めませんでした');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mode, attempt]);
  const move = (next: number, behavior: ScrollBehavior = 'smooth') => {
    const node = rail.current;
    if (!node) return;
    const selected = Math.max(0, Math.min(rows.length - 1, next));
    const card = node.children[selected] as HTMLElement;
    node.scrollTo?.({ left: card.offsetLeft - (node.children[0] as HTMLElement).offsetLeft, behavior });
    setIndex(selected);
  };
  const retainedIndex = useRef(index); retainedIndex.current = index;
  useLayoutEffect(() => {
    move(index, 'instant');
    const observer = new ResizeObserver(() => move(retainedIndex.current, 'instant'));
    if (rail.current) observer.observe(rail.current);
    return () => observer.disconnect();
  }, []);
  // The observer follows the retained index without re-scrolling on every touch frame.
  useEffect(() => {
    const resize = () => move(retainedIndex.current, 'instant');
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const sample = dataMode === 'demo' && !photos.length;
  const shownPhotos = sample ? navigationExamples : photos;
  return <section className="sm-nav-cards" aria-label={mode === 'self' ? '自分を知る' : 'みんなの地図'}>
    <header className="sm-nav-cards__intro"><h1>{mode === 'self' ? '自分を知る' : 'みんなの地図'}</h1><p>{mode === 'self' ? '日々の体験から、いまの自分を見つける。' : '誰かの体験から、街の新しい一面へ。'}</p></header>
    <div className="sm-nav-cards__bottom">
      <div className="sm-nav-cards__rail" ref={rail} role="region" aria-roledescription="カルーセル" aria-label="メニューのカード" tabIndex={0}
        onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : null;
          if (next !== null) { event.preventDefault(); move(next); }
        }}
        onScroll={() => {
          const node = rail.current;
          if (!node || !node.children[1]) return;
          const step = (node.children[1] as HTMLElement).offsetLeft - (node.children[0] as HTMLElement).offsetLeft;
          setIndex(Math.max(0, Math.min(rows.length - 1, Math.round(node.scrollLeft / step))));
        }}
        onPointerDown={event => { if (event.pointerType === 'mouse') drag.current = { x: event.clientX, scroll: rail.current!.scrollLeft, moved: false }; }}
        onPointerMove={event => {
          if (!drag.current || event.buttons !== 1) return;
          const delta = event.clientX - drag.current.x;
          if (Math.abs(delta) > 8) { drag.current.moved = true; rail.current!.scrollLeft = drag.current.scroll - delta; }
        }}
        onPointerUp={() => { if (drag.current?.moved) move(index); }}
        onClickCapture={event => { if (drag.current?.moved) { event.preventDefault(); event.stopPropagation(); } drag.current = null; }}>
        {rows.map((row, position) => <button key={row.page} id={`nav-card-${row.page}`} type="button" className="sm-nav-card" aria-label={`${row.title}を開く`} onClick={() => navigate(row.page)}>
          <span className="sm-nav-card__heading"><span><strong>{row.title}</strong><span className="sm-nav-card__description">{row.description}</span></span><span className="sm-nav-card__arrow"><Icon name="chevron" size={22}/></span></span>
          {position === 0 ? <>
            <span className="sm-nav-card__photos">{[0, 1].map(photoIndex => {
              const photo = shownPhotos[photoIndex];
              return <span className="sm-nav-card__photo" key={photoIndex}>
                {photo?.photoUrl ? <img src={photo.photoUrl} alt="" draggable={false} onError={event => { event.currentTarget.hidden = true; }}/>
                  : <span className="sm-nav-card__placeholder"><Icon name={row.icon} size={34}/></span>}
                <b>{photo?.title || (loading ? '読み込み中…' : photoIndex === 0 ? mode === 'self' ? '今日の記録はまだありません' : '共有された記録はまだありません' : '体験を地図で見返す')}</b>
                <small>{photo?.detail || (photoIndex === 0 ? '記録から振り返りを始める' : '写真がある記録をここに表示')}</small>
              </span>;
            })}</span>
            {sample && <span className="sm-nav-card__sample">表示例・サンプル</span>}
          </> : <span className="sm-nav-card__summary"><span className="sm-nav-card__illustration"><Icon name={row.icon} size={66}/></span><b>{row.details[0]}</b><small>{row.details[1]}</small></span>}
        </button>)}
      </div>
      {error && <div className="sm-nav-cards__error" role="status">{error}<button type="button" onClick={() => retry(value => value + 1)}>再試行</button></div>}
      <div className="sm-nav-cards__paging">
        <button className="sm-nav-cards__previous" aria-label="前のカード" disabled={index === 0} onClick={() => move(index - 1)}><Icon name="back" size={20}/></button>
        <div><div className="sm-nav-cards__dots">{rows.map((row, position) => <button key={row.page} type="button" aria-label={`${position + 1}枚目：${row.title}`} aria-current={index === position ? 'true' : undefined} onClick={() => move(position)}/>)}</div><p>左右にスワイプ</p><span className="sm-nav-cards__sr" aria-live="polite">{index + 1} / {rows.length}：{rows[index]!.title}</span></div>
        <button className="sm-nav-cards__next" aria-label="次のカード" disabled={index === rows.length - 1} onClick={() => move(index + 1)}><Icon name="chevron" size={20}/></button>
      </div>
    </div>
  </section>;
}

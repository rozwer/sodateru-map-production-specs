import { useEffect, useRef, useState } from 'react';

/** Display coordinates supplied by the package adapter after ZIP validation. */
export interface AtlasClip {
  url: string;
  frames: readonly { x: number; y: number; width: number; height: number; durationMs: number }[];
}

export function AtlasPreview({ clip, label, reducedMotion = false, onViewed }: {
  clip?: AtlasClip; label: string; reducedMotion?: boolean; onViewed?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewed = useRef(onViewed); viewed.current = onViewed;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!clip || !clip.frames.length) return;
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const asset = new Image();
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0, stopped = false, visible = false, index = 0, acknowledged = false;
    const paint = () => {
      if (stopped || !visible || document.hidden) return;
      const frame = clip.frames[index];
      if (!frame) return;
      if (frame.x + frame.width > asset.naturalWidth || frame.y + frame.height > asset.naturalHeight) { setFailed(true); return; }
      context.clearRect(0, 0, element.width, element.height);
      const scale = Math.min(element.width / frame.width, element.height / frame.height);
      const width = frame.width * scale, height = frame.height * scale;
      context.drawImage(asset, frame.x, frame.y, frame.width, frame.height, (element.width - width) / 2, (element.height - height) / 2, width, height);
      const reduced = reducedMotion || preference.matches;
      if (!acknowledged && (reduced || index === clip.frames.length - 1)) { acknowledged = true; viewed.current?.(); }
      if (!reduced) { index = (index + 1) % clip.frames.length; timer = window.setTimeout(paint, frame.durationMs); }
    };
    asset.onload = paint;
    asset.onerror = () => { if (!stopped) setFailed(true); };
    asset.src = clip.url;
    const restart = () => { clearTimeout(timer); index = 0; if (asset.complete && asset.naturalWidth) paint(); };
    const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); restart(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', restart);
    preference.addEventListener('change', restart);
    return () => { stopped = true; clearTimeout(timer); observer.disconnect(); document.removeEventListener('visibilitychange', restart); asset.onload = null; asset.onerror = null; preference.removeEventListener('change', restart); };
  }, [clip, reducedMotion]);
  return <div className="companion-atlas">
    {clip && !failed ? <canvas ref={canvas} width={300} height={300} role="img" aria-label={label}/> : <span className="companion-empty-art">{failed ? '画像を読み込めません' : '相棒のプレビュー'}</span>}
  </div>;
}

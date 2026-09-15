import React, { useCallback, useEffect, useRef, useState } from 'react';
import { knowledgeMessages as m } from './messages';
import { KnowledgeIcon } from './Icon';
import type { KnowledgeMedia } from './types';

export type KnowledgeMediaLoader = (media: KnowledgeMedia, signal: AbortSignal) => Promise<Blob>;
export function KnowledgeMediaView({ media, description, compact = false, onRetry, loadMedia }: {
  media: KnowledgeMedia; description: string; compact?: boolean;
  onRetry?: (id: string) => Promise<void>; loadMedia?: KnowledgeMediaLoader;
}) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const attachPlayer = useCallback((element: HTMLVideoElement | HTMLAudioElement | null) => {
    const previous = player.current;
    if (previous && previous !== element) { previous.pause(); previous.removeAttribute('src'); previous.load(); }
    player.current = element;
  }, []);
  useEffect(() => { setFailed(false); setPlaying(false); }, [media.id, media.contentUrl, media.status]);
  useEffect(() => {
    setResolvedUrl(null);
    if (!loadMedia || media.status !== 'ready') return;
    const controller = new AbortController();
    let url: string | null = null;
    void loadMedia(media, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setResolvedUrl(url); setFailed(false);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [loadMedia, media.id, media.status, media.contentUrl, retry]);
  const retryMedia = async () => {
    setRetrying(true);
    try { await onRetry?.(media.id); setFailed(false); setRetry(value => value + 1); }
    catch { setFailed(true); }
    finally { setRetrying(false); }
  };
  if (failed || media.status !== 'ready' || !media.contentUrl) {
    return <div className={`knowledge-media knowledge-media-state ${compact ? 'is-compact' : ''}`} role="status">
      <span>{media.status === 'pending' && !failed ? m.mediaPending : m.mediaFailure}</span>
      <button type="button" className="knowledge-text-button" onClick={retryMedia} disabled={retrying || (!onRetry && media.status !== 'ready')}>{retrying ? m.loading : m.retry}</button>
    </div>;
  }
  if (loadMedia && !resolvedUrl) return <div className={`knowledge-media knowledge-media-state ${compact ? 'is-compact' : ''}`} role="status">{m.loading}</div>;
  const source = loadMedia ? resolvedUrl! : media.contentUrl;
  return <div className={`knowledge-media ${compact ? 'is-compact' : ''}`}>
    {media.kind === 'photo'
      ? <img key={retry} src={source} alt={description} loading="lazy" onError={() => setFailed(true)} />
      : media.kind === 'video'
        ? <><video key={retry} ref={attachPlayer} src={source} aria-label={description} controls={!compact} preload="metadata" playsInline onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />
          {!playing && !compact && <button className="knowledge-video-play" type="button" aria-label={m.play} data-testid="knowledge-detail--play" onClick={() => void player.current?.play().catch(() => setFailed(true))}><KnowledgeIcon name="play" /></button>}</>
        : <audio key={retry} ref={attachPlayer} src={source} aria-label={description} controls preload="none" onError={() => setFailed(true)} />}
  </div>;
}

export function KnowledgeAvatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? <img className="knowledge-avatar" src={src} alt="" onError={() => setFailed(true)} />
    : <span className="knowledge-avatar knowledge-avatar-fallback" aria-hidden="true">{name.slice(0, 1)}</span>;
}

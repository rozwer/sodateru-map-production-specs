import { useEffect, useState, useSyncExternalStore } from 'react';
import { api } from '../../app/api';
import { AtlasPreview, type AtlasClip } from './AtlasPreview';
import { loadAtlas, v2Clip } from './atlas';
import { companionRevision, subscribeCompanion } from './requests';
import './companion.css';

/** The shared shell mounts one instance. Hiding the companion leaves its AI entry intact. */
export function MapCompanion({ scopeKey, onActivate, active = true }: { scopeKey: string; onActivate: () => void; active?: boolean }) {
  const revision = useSyncExternalStore(subscribeCompanion, companionRevision);
  const [pet, setPet] = useState<{ name: string; clip: AtlasClip; size: 'small' | 'medium'; reducedMotion: boolean }>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController(); let url: string | undefined;
    setPet(undefined); setError(undefined);
    if (!active) return;
    void (async () => {
      const { data: settings } = await api.request('getCompanionSettings', { signal: controller.signal });
      if (!settings.visible || !settings.selectedCompanionId) return;
      const { data: companion } = await api.request('getCompanion', { path: { companionId: settings.selectedCompanionId }, signal: controller.signal });
      const atlas = await loadAtlas(companion.importId, controller.signal); url = atlas.url;
      if (controller.signal.aborted) { URL.revokeObjectURL(url); return; }
      setPet({ name: companion.name, clip: v2Clip(url, 'idle'), size: settings.size, reducedMotion: settings.reducedMotion });
    })().catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '相棒を読み込めませんでした。'); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [scopeKey, revision, active]);
  if (error) return <div className="companion-map-error" role="status">相棒を表示できません。相棒の管理から再確認できます。</div>;
  return pet ? <button type="button" className={`companion-map companion-map--${pet.size}`} aria-label={`${pet.name}と話す`} onClick={onActivate}><AtlasPreview clip={pet.clip} label={pet.name} reducedMotion={pet.reducedMotion}/></button> : null;
}

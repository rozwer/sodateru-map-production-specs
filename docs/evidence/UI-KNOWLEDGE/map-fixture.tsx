import React, { useEffect, useMemo } from 'react';
import { MapBridge } from '../../../src/app/map-bridge';
import { MapPreview } from '@knowledge-map-preview';
import type { KnowledgeFilters } from '../../../src/features/knowledge/types';

export function KnowledgeFixtureMap({ filters, onReady, full = false }: {
  filters: KnowledgeFilters; onReady?: (bridge: MapBridge) => void; full?: boolean;
}) {
  const bridge = useMemo(() => new MapBridge('knowledge-ui-fixture-map'), []);
  useEffect(() => { onReady?.(bridge); return () => bridge.dispose(); }, [bridge, onReady]);
  useEffect(() => {
    if (filters.bounds) {
      bridge.focus('knowledge', { bounds: [[filters.bounds[0], filters.bounds[1]], [filters.bounds[2], filters.bounds[3]]] });
      return;
    }
    const center = filters.center ?? [136.9638, 35.1668];
    bridge.setCamera({ longitude: center[0], latitude: center[1], zoom: full ? 15.2 : filters.radiusM === 3000 ? 11 : filters.radiusM === 500 ? 13.6 : 12.6 });
    bridge.setView({ lens: 'personal', dimension: '2d' });
    bridge.showPlaces('knowledge', { places: [{ id: 'fixture-motoyama', placeId: 'fixture-motoyama', coordinates: [136.9638, 35.1668], label: full ? '本山の小さな公園' : '本山駅' }] });
  }, [bridge, filters.center?.[0], filters.center?.[1], filters.radiusM, filters.bounds, full]);
  return <MapPreview bridge={bridge} interactive label="UI確認用の本山周辺の地図" className={full ? 'knowledge-full-map-preview' : 'knowledge-condition-map-preview'} center={filters.center ?? undefined} radiusM={full ? undefined : filters.radiusM ?? undefined} />;
}

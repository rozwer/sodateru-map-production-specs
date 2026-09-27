import type { PluginTrialPreview } from '../../../../packages/api-client/index.ts';

/** Explicit display-only demo. Never pass this through DisasterView or persist it as live information. */
export function createDisasterDemo(): PluginTrialPreview {
  return {
    dataKind: 'mock', label: '江戸川周辺の防災マップ',
    generatedAt: Date.UTC(2026, 8, 15, 0, 0),
    declarations: [{ targetKey: 'layer:disaster', property: 'visibility', value: true }],
    features: [{ type: 'Feature', id: 'disaster-demo-edogawa',
      geometry: { type: 'Polygon', coordinates: [[[139.84, 35.68], [139.88, 35.68], [139.905, 35.72], [139.92, 35.76], [139.87, 35.76], [139.84, 35.68]]] },
      properties: { kind: 'hazard', label: '江戸川周辺', legendId: 'demo-hazard', sourceIds: ['demo'], status: 'simulated', value: null, unit: null },
    }],
    legends: [{ id: 'demo-hazard', label: '対象範囲', color: '#e59745', meaning: '対象範囲' }],
    sources: [{ id: 'demo', title: '地域の情報', url: null, attribution: '育てる地図', dataKind: 'mock', fetchedAt: null, sourceUpdatedAt: null, observedAt: null, issuedAt: null, validAt: null }],
    warnings: [],
  };
}

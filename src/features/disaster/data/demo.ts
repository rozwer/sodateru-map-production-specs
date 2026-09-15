import type { PluginTrialPreview } from '../../../../packages/api-client/index.ts';

/** Explicit display-only demo. Never pass this through DisasterView or persist it as live information. */
export function createDisasterDemo(): PluginTrialPreview {
  return {
    dataKind: 'mock', label: '防災マップのデモ — 架空の表示例です。実際の災害情報ではありません。',
    generatedAt: Date.UTC(2026, 8, 15, 0, 0),
    declarations: [{ targetKey: 'layer:disaster', property: 'visibility', value: true }],
    features: [{ type: 'Feature', id: 'disaster-demo-edogawa',
      geometry: { type: 'Polygon', coordinates: [[[139.84, 35.68], [139.88, 35.68], [139.905, 35.72], [139.92, 35.76], [139.87, 35.76], [139.84, 35.68]]] },
      properties: { kind: 'hazard', label: '江戸川周辺の架空ハザード表示', legendId: 'demo-hazard', sourceIds: ['demo'], status: 'simulated', value: null, unit: null },
    }],
    legends: [{ id: 'demo-hazard', label: '模擬ハザード', color: '#e59745', meaning: '架空の範囲。実際の浸水想定・観測・安全性を示しません。' }],
    sources: [{ id: 'demo', title: '表示確認用の模擬データ', url: null, attribution: '育てる地図', dataKind: 'mock', fetchedAt: null, sourceUpdatedAt: null, observedAt: null, issuedAt: null, validAt: null }],
    warnings: ['実データは導入後に対象地域を設定して更新してください。', 'この表示例は保存されません。取得・観測・発行時刻はありません。'],
  };
}

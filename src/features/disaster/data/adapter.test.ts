import { describe, it, expect } from 'vitest';
import { createApiClient } from '../../../../packages/api-client/index.ts';
import { createDisasterDataAdapter, toDisasterMapData, disasterRasterCrop, type DisasterView } from './adapter.ts';
import { createDisasterDemo } from './demo.ts';

function savedView(): DisasterView {
  const layer: NonNullable<DisasterView['result']>['layers'][number] = {
    layerId: 'rainfall', kind: 'observation', label: '降水解析', status: 'partial',
    sourceUrl: 'https://www.jma.go.jp/bosai/nowc/', attribution: '気象庁', unit: 'mm/h',
    legend: { url: 'https://www.jma.go.jp/bosai/nowc/', description: '降水強度' }, meaning: '現在の浸水ではない',
    fetchedAt: 30, sourceUpdatedAt: null, sourceUpdatedAtMeaning: '配信更新時刻', validAt: 10, issuedAt: 5,
    bounds: [139.85, 35.7, 139.9, 35.74], coverage: { envelope: [122, 20, 154, 46], description: '日本周辺' }, unknowns: ['欠測あり'],
    tiles: [{ z: 10, x: 909, y: 403, bounds: [139.8, 35.6, 140, 35.8], role: 'data', status: 'available', sourceUrl: 'https://www.jma.go.jp/example.png', fetchedAt: 30, sourceUpdatedAt: null, sha256: 'fixture', imageDataUrl: 'data:image/png;base64,fixture', error: null }],
    noDataMask: { sourceUrl: 'https://www.jma.go.jp/example.geojson', fetchedAt: 29, sourceUpdatedAt: null, sha256: 'fixture-mask', hasNoData: true,
      geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { kind: 'missing', label: '欠測' }, geometry: { type: 'Polygon', coordinates: [[[139.85, 35.7], [139.86, 35.7], [139.86, 35.72], [139.85, 35.7]]] } }] } },
  };
  return { dataKind: 'live', settings: null, stale: true, lastAttempt: null,
    result: { resultId: 'saved', dataKind: 'live', installId: 'installed', settingsVersion: 1, pluginVersion: '1.0.0', fetchedAt: 31, expiresAt: 40, status: 'partial',
      settings: { region: { id: '江戸川周辺', bounds: layer.bounds }, layerIds: ['rainfall'] }, layers: [layer], unknowns: ['現在の浸水ではない'] },
    map: { action: 'apply', ownerKey: 'plugin:installed', pluginRevision: 'r1', settingsVersion: 1, resultId: 'saved', bounds: layer.bounds, reason: 'stale', layerIds: ['rainfall'] } };
}

describe('disaster saved-data adapter', () => {
  it('keeps original tile geography, missing mask and distinct times; clear stops all map material', () => {
    const view = savedView(), result = toDisasterMapData(view);
    expect(result.rasters).toHaveLength(1); expect(result.masks).toHaveLength(1);
    expect(result.rasters[0]!.coordinates).toEqual([[139.8, 35.8], [140, 35.8], [140, 35.6], [139.8, 35.6]]);
    expect(result.rasters[0]!.clipBounds).toEqual(view.map.bounds);
    expect(result.layers[0]!.sourceUpdatedAt).toBeNull(); expect(result.layers[0]!.validAt).toBe(10);
    for (const reason of ['disabledOrUnresolved', 'settingsChanged', 'noResult'] as const) {
      const cleared = toDisasterMapData({ ...view, map: { ...view.map, action: 'clear', reason } });
      expect(cleared.rasters).toEqual([]); expect(cleared.masks).toEqual([]); expect(cleared.view.result).toBe(view.result);
    }
    view.result!.layers[0]!.tiles[0]!.status = 'missing';
    expect(toDisasterMapData(view).rasters).toEqual([]);
  });
  it('502 refresh rereads persisted state, exposes failure and sends exact version/key/empty body', async () => {
    const view = savedView();
    view.lastAttempt = { attemptedAt: 100, status: 'failed', settings: view.result!.settings, layers: [] };
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createApiClient({ fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return init.method === 'POST'
        ? Response.json({ error: { code: 'UPSTREAM_FAILED', message: '更新失敗', requestId: 'request' } }, { status: 502 })
        : Response.json({ data: view });
    }) as typeof fetch });
    const result = await createDisasterDataAdapter(client).refresh({ version: 7, idempotencyKey: 'fixed-retry-key' });
    expect(result.error).toMatchObject({ code: 'UPSTREAM_FAILED' }); expect(result.view).toEqual(view);
    expect(calls.map(call => call.url)).toEqual(['/api/v1/disaster/refresh', '/api/v1/disaster']);
    expect(new Headers(calls[0]!.init.headers).get('If-Match')).toBe('"7"');
    expect(new Headers(calls[0]!.init.headers).get('Idempotency-Key')).toBe('fixed-retry-key');
    expect(calls[0]!.init.body).toBe('{}');
  });
  it('crops in Mercator space without stretching the complete tile; demo never invents observed time', () => {
    const raster = toDisasterMapData(savedView()).rasters[0]!;
    const crop = disasterRasterCrop(raster, 256, 256);
    expect(crop.x).toBeCloseTo(64); expect(crop.width).toBeCloseTo(64);
    expect(crop.height).toBeGreaterThan(0); expect(crop.y + crop.height).toBeLessThan(256);
    expect(crop.coordinates).toEqual([[139.85, 35.74], [139.9, 35.74], [139.9, 35.7], [139.85, 35.7]]);
    const demo = createDisasterDemo();
    expect(demo.dataKind).toBe('mock'); expect(demo.label).toContain('架空');
    expect(demo.sources.every(source => source.fetchedAt === null && source.validAt === null && source.issuedAt === null)).toBe(true);
  });
});

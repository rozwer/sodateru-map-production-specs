import { ApiError, type ApiClient, type DisasterView, type DisasterLayer, type DisasterTile, type DisasterNoDataMask, type OperationInput } from '../../../../packages/api-client/index.ts';

export type { DisasterView, DisasterLayer, DisasterTile, DisasterSettings, DisasterSnapshot, DisasterStatus, DisasterLayerId, PluginTrialPreview } from '../../../../packages/api-client/index.ts';

export type Bounds = [number, number, number, number];
type Position = [number, number];
export interface DisasterRaster {
  id: string;
  layerId: DisasterLayer['layerId'];
  tile: DisasterTile;
  imageDataUrl: string;
  /** Original tile corners, clockwise from top left. Never stretch a tile to the selected region. */
  coordinates: [Position, Position, Position, Position];
  clipBounds: Bounds;
}
export interface DisasterMapData {
  dataKind: 'live';
  view: DisasterView;
  action: DisasterView['map']['action'];
  ownerKey: string | null;
  regionId: string | null;
  bounds: Bounds | null;
  layers: DisasterLayer[];
  rasters: DisasterRaster[];
  masks: { layerId: DisasterLayer['layerId']; mask: DisasterNoDataMask }[];
}

function bounds(value: number[] | null): Bounds | null {
  if (!value || value.length !== 4 || !value.every(Number.isFinite)) return null;
  const [w, s, e, n] = value as Bounds;
  return w < e && s < n && s > -90 && n < 90 ? [w, s, e, n] : null;
}
const corners = ([w, s, e, n]: Bounds): DisasterRaster['coordinates'] => [[w, n], [e, n], [e, s], [w, s]];
const intersection = (a: Bounds, b: Bounds): Bounds | null => bounds([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);

/** Metadata remains in the generated DTO, including old snapshot times and failed-attempt diagnostics. */
export function toDisasterMapData(view: DisasterView): DisasterMapData {
  const selected = bounds(view.map.bounds);
  const output: DisasterMapData = {
    dataKind: 'live', view, action: view.map.action, ownerKey: view.map.ownerKey,
    regionId: view.result?.settings.region.id ?? null, bounds: selected,
    layers: view.result?.layers ?? [], rasters: [], masks: [],
  };
  if (view.map.action !== 'apply' || !selected || !view.result || !view.map.ownerKey) return output;
  for (const layer of output.layers) {
    if (!view.map.layerIds.includes(layer.layerId)) continue;
    for (const tile of layer.tiles) {
      const tileBounds = bounds(tile.bounds);
      const clipBounds = tileBounds && intersection(tileBounds, selected);
      if (tile.status !== 'available' || tile.role !== 'data' || !tile.imageDataUrl || !tileBounds || !clipBounds) continue;
      output.rasters.push({ id: `${layer.layerId}-${tile.z}-${tile.x}-${tile.y}`, layerId: layer.layerId,
        tile, imageDataUrl: tile.imageDataUrl, coordinates: corners(tileBounds), clipBounds });
    }
    if (layer.noDataMask) output.masks.push({ layerId: layer.layerId, mask: layer.noDataMask });
  }
  return output;
}

export function createDisasterDataAdapter(api: Pick<ApiClient, 'request'>) {
  const read = async (signal?: AbortSignal): Promise<DisasterView> => (await api.request('getDisaster', { signal })).data;
  return {
    read,
    /** Caller retains a fixed key for a logical retry; this adapter does not change mode or install settings. */
    async refresh(input: Omit<OperationInput<'postDisasterRefresh'>, 'body'>): Promise<{
      view: DisasterView | null; error: unknown | null; stateError: unknown | null;
    }> {
      try {
        const result = await api.request('postDisasterRefresh', { ...input, body: {} });
        return { view: result.data, error: null, stateError: null };
      } catch (error) {
        if (input.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
        // The provider records failedAttempt and keeps the old result before returning 502.
        // SOURCE_CHANGED also requires a fresh read to honour a concurrent stop/settings change.
        if (!(error instanceof ApiError) || !['UPSTREAM_FAILED', 'SOURCE_CHANGED', 'STATE_CONFLICT', 'VERSION_CONFLICT'].includes(error.code)) {
          return { view: null, error, stateError: null };
        }
        try { return { view: await read(input.signal), error, stateError: null }; }
        catch (stateError) {
          if (input.signal?.aborted || (stateError instanceof Error && stateError.name === 'AbortError')) throw stateError;
          return { view: null, error, stateError };
        }
      }
    },
  };
}

/** Pixel crop in Web Mercator space; return coordinates for only the visible part of a saved tile. */
export function disasterRasterCrop(raster: DisasterRaster, width: number, height: number) {
  const original = bounds(raster.tile.bounds);
  if (!original || width <= 0 || height <= 0) throw new Error('Invalid disaster image bounds or dimensions');
  const clip = intersection(original, raster.clipBounds);
  if (!clip) throw new Error('Disaster image is outside the selected region');
  const y = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const [w, s, e, n] = original;
  const x0 = (clip[0] - w) / (e - w) * width;
  const x1 = (clip[2] - w) / (e - w) * width;
  const y0 = (y(n) - y(clip[3])) / (y(n) - y(s)) * height;
  const y1 = (y(n) - y(clip[1])) / (y(n) - y(s)) * height;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0, coordinates: corners(clip) };
}

/** Browser helper for a Mapbox image source. Source DTO and timestamps remain unchanged. */
export async function clipDisasterRaster(raster: DisasterRaster): Promise<{ imageDataUrl: string; coordinates: DisasterRaster['coordinates'] }> {
  const image = new Image();
  image.src = raster.imageDataUrl;
  await image.decode();
  const crop = disasterRasterCrop(raster, image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(crop.width)); canvas.height = Math.max(1, Math.ceil(crop.height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('防災画像を描画できませんでした。');
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return { imageDataUrl: canvas.toDataURL('image/png'), coordinates: crop.coordinates };
}

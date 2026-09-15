export type Bounds = [number, number, number, number];
export type LayerId = 'flood-hazard' | 'terrain' | 'rainfall';
export interface DisasterSettings { region: { id: string; bounds: Bounds }; layerIds: LayerId[] }
export type DataStatus = 'available' | 'partial' | 'missing' | 'outOfCoverage' | 'providerError';
export interface Tile {
  z: number; x: number; y: number; bounds: Bounds;
  role: 'data' | 'noDataMask'; status: DataStatus; sourceUrl: string;
  fetchedAt: number; sourceUpdatedAt: number | null; sha256: string | null;
  imageDataUrl: string | null; error: string | null;
}
export interface Layer {
  layerId: LayerId; kind: 'hazard' | 'terrain' | 'observation'; label: string;
  status: DataStatus; sourceUrl: string; attribution: string; unit: string | null;
  legend: { url: string; description: string }; meaning: string;
  fetchedAt: number; sourceUpdatedAt: number | null; sourceUpdatedAtMeaning: string;
  validAt: number | null; issuedAt: number | null; bounds: Bounds;
  coverage: { envelope: Bounds; description: string }; tiles: Tile[]; noDataMask: NoDataMask | null; unknowns: string[];
}
export interface Snapshot {
  resultId: string; dataKind: 'live'; settings: DisasterSettings;
  installId: string; settingsVersion: number; pluginVersion: string;
  fetchedAt: number; expiresAt: number; status: DataStatus;
  layers: Layer[]; unknowns: string[];
}
export interface Attempt { attemptedAt: number; status: 'complete' | 'partial' | 'failed'; settings: DisasterSettings; layers: Layer[] }
export type Position = [number,number];
export interface MaskGeoJSON { type: 'FeatureCollection'; features: {type:'Feature'; properties: {kind:'missing';label:string}; geometry:{type:'Polygon';coordinates:Position[][]}}[] }
export interface NoDataMask { sourceUrl:string; fetchedAt:number; sourceUpdatedAt:number|null; sha256:string; hasNoData:boolean; geojson:MaskGeoJSON }

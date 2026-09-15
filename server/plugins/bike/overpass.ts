import { CommonError } from "../../core/errors.ts";
import { assessTags, inside, type BikeSettings, type BikePlace, type RoadObservation, type Source, type Position } from "./domain.ts";

export interface BikeData { places: BikePlace[]; roads: RoadObservation[]; source: Source }
export interface BikeProvider { search(settings: BikeSettings, signal: AbortSignal): Promise<BikeData> }
const position = (p: unknown): p is Position => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
export class OverpassBikeProvider implements BikeProvider {
  constructor(private endpoint = process.env.BIKE_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter", private fetcher: typeof fetch = fetch) {}
  async search(settings: BikeSettings, signal: AbortSignal): Promise<BikeData> {
    const [w, s, e, n] = settings.region.bounds, bbox = `${s},${w},${n},${e}`;
    // Query syntax contains only validated numeric coordinates. No client-supplied query fragments.
    const query = `[out:json][timeout:25];(nwr[amenity=motorcycle_parking](${bbox});nwr[amenity=fuel](${bbox});nwr[shop=motorcycle](${bbox});way[highway][motorcycle](${bbox});way[highway][moped](${bbox});way[highway][mofa](${bbox});way[highway][motorroad](${bbox});way[highway][motor_vehicle=no](${bbox});way[highway][access~"^(no|private|destination)$"](${bbox});way[highway~"^motorway(_link)?$"](${bbox}););out meta geom;`;
    let response: Response;
    try {
      response = await this.fetcher(this.endpoint, { method: "POST", body: new URLSearchParams({ data: query }), signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]), headers: { "User-Agent": "sodateru-map-bike/1.0 (+https://github.com/rozwer/sodateru-map-production-specs)", Accept: "application/json" } });
    } catch (error) {
      if (signal.aborted) throw new CommonError("STATE_CONFLICT", "検索を取り消しました。");
      throw new CommonError((error as Error)?.name === "TimeoutError" ? "TIMEOUT" : "UPSTREAM_FAILED", "道路・地点情報を取得できませんでした。明示的に再検索してください。", true);
    }
    if (response.status === 429) throw new CommonError("RATE_LIMITED", "地点・道路情報の取得制限です。時間をおいて再検索してください。", true, { retryAfter: response.headers.get("retry-after") });
    if (!response.ok) throw new CommonError("UPSTREAM_FAILED", "地点・道路情報の取得元が応答できません。", true, { providerStatus: response.status });
    let body: any;
    try { body = await response.json(); } catch { throw new CommonError("UPSTREAM_FAILED", "取得元の応答形式が不正です。", true); }
    if (body.remark || !Array.isArray(body.elements)) throw new CommonError("UPSTREAM_FAILED", "取得元が全件を返せませんでした。範囲を絞って再検索してください。", true);
    const now = Date.now();
    const source: Source = { id: "osm-overpass", name: "OpenStreetMap / Overpass", url: "https://www.openstreetmap.org/copyright", attribution: "© OpenStreetMap contributors (ODbL)", fetchedAt: now, updatedAt: timestamp(body.osm3s?.timestamp_osm_base) };
    const places: BikePlace[] = [], roads: RoadObservation[] = [];
    for (const element of body.elements) {
      if (!["node", "way", "relation"].includes(element.type) || !Number.isSafeInteger(element.id) || element.id <= 0) continue;
      const tags = Object.fromEntries(Object.entries(element.tags ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
      const id = `osm:${element.type}:${element.id}`;
      const itemSource: Source = { ...source, id, url: `https://www.openstreetmap.org/${element.type}/${element.id}`, updatedAt: timestamp(element.timestamp) };
      const vehicleAssessment = assessTags(tags, settings, id, now);
      const category = tags.amenity === "motorcycle_parking" ? "motorcycle_parking" : tags.amenity === "fuel" ? "fuel" : tags.shop === "motorcycle" ? "motorcycle_shop" : null;
      const shape = (element.geometry ?? element.members?.flatMap((m: any) => m.geometry ?? []) ?? []).map((p: any) => [p.lon, p.lat]).filter(position) as Position[];
      const point = element.type === "node" ? [element.lon, element.lat] : shape.length ? [
        (Math.min(...shape.map(p => p[0])) + Math.max(...shape.map(p => p[0]))) / 2,
        (Math.min(...shape.map(p => p[1])) + Math.max(...shape.map(p => p[1]))) / 2,
      ] : [element.center?.lon, element.center?.lat];
      if (category && position(point) && inside(point, settings.region.bounds)) places.push({ id, name: tags.name ?? tags["name:ja"] ?? (category === "motorcycle_parking" ? "二輪駐車場（名称未登録）" : category === "fuel" ? "給油所（名称未登録）" : "二輪車店（名称未登録）"), category, position: { longitude: point[0], latitude: point[1] }, tags, source: itemSource, vehicleAssessment });
      if (element.type === "way" && tags.highway && Array.isArray(element.geometry)) {
        const coordinates = element.geometry.map((p: any) => [p.lon, p.lat]);
        if (coordinates.length >= 2 && coordinates.every(position)) roads.push({ id, geometry: { type: "LineString", coordinates }, tags, source: itemSource, vehicleAssessment });
      }
    }
    return { places, roads, source };
  }
}

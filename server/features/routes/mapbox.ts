import { RouteFault, coordinate, samePoint, type Conditions, type ConditionEvaluation, type Coordinates, type Geometry, type Mode, type RouteLeg, type RouteStep } from './types.ts';

function geometry(value: any): Geometry {
  if (value?.type !== 'LineString' || !Array.isArray(value.coordinates) || value.coordinates.length < 2 || !value.coordinates.every(coordinate) || !value.coordinates.some((p: Coordinates) => !samePoint(p, value.coordinates[0]))) {
    throw new RouteFault('OUTPUT_INVALID', '道路providerの形状が不正です');
  }
  return { type: 'LineString', coordinates: value.coordinates };
}
function positive(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new RouteFault('OUTPUT_INVALID', '道路providerの距離・時間が不正です');
  return value;
}
function steps(value: any): RouteStep[] {
  if (!Array.isArray(value) || !value.length) throw new RouteFault('OUTPUT_INVALID', 'ターン案内が欠落しています');
  return value.map(s => {
    const m = s?.maneuver;
    if (!coordinate(m?.location) || typeof m.type !== 'string' || typeof m.instruction !== 'string' || !Number.isFinite(s.distance) || s.distance < 0 || !Number.isFinite(s.duration) || s.duration < 0) throw new RouteFault('OUTPUT_INVALID', 'ターン案内が不正です');
    // Arrival steps may be zero length and contain two identical coordinates.
    if (s.geometry?.type !== 'LineString' || !Array.isArray(s.geometry.coordinates) || s.geometry.coordinates.length < 2 || !s.geometry.coordinates.every(coordinate)) throw new RouteFault('OUTPUT_INVALID', '案内区間の形状が不正です');
    return { geometry: s.geometry, distanceM: s.distance, durationSec: Math.round(s.duration), location: m.location, type: m.type, modifier: m.modifier ?? null, instruction: m.instruction, name: s.name ?? '' };
  });
}
export class MapboxRoadProvider {
  constructor(private token: string, private fetcher: typeof fetch = fetch) {}
  async compare(points: Coordinates[], mode: Mode, signal?: AbortSignal, conditions?: Conditions) {
    // Three complete candidates share each provider response; one request per leg.
    const responses = new Map<string, Promise<Response>>();
    const provider = new MapboxRoadProvider(this.token, (async (url: URL, init: RequestInit) => {
      const key = url.toString();
      if (!responses.has(key)) responses.set(key, this.fetcher(url, init));
      return (await responses.get(key)!).clone();
    }) as typeof fetch);
    const candidates = await Promise.all([0, 1, 2].map(pick => provider.route(points, mode, signal, true, pick, conditions)));
    const seen = new Set<string>();
    return candidates.filter(candidate => {
      const key = JSON.stringify(candidate.geometry.coordinates);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => a.durationSec - b.durationSec || a.distanceM - b.distanceM);
  }
  async route(points: Coordinates[], mode: Mode, signal?: AbortSignal, navigation = false, comparisonPick?: number, conditions?: Conditions): Promise<{ requestedConditions?: Conditions; conditionEvaluations?: ConditionEvaluation[]; legs: RouteLeg[]; geometry: Geometry; distanceM: number; durationSec: number; provider: 'mapbox-directions'; fetchedAt: number }> {
    if (mode !== 'walking' && mode !== 'driving') throw new RouteFault('MODE_UNSUPPORTED', 'この道路契約で対応する移動手段は徒歩と自動車です', 501);
    if (!Array.isArray(points) || points.length < 2 || points.length > 10 || !points.every(coordinate) || points.some((p, i) => i > 0 && samePoint(p, points[i - 1]!))) throw new RouteFault('INVALID_INPUT', '異なる隣接地点を2〜10点指定してください');
    if (conditions?.avoidMotorways && mode !== 'driving') throw new RouteFault('MODE_UNSUPPORTED', '高速道路回避は自動車経路で指定してください', 501);
    if (!this.token) throw new RouteFault('PROVIDER_UNAVAILABLE', '道路providerの接続設定がありません', 503);
    const totalSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(60_000)]);
    const legs: RouteLeg[] = [];
    const coordinates: Coordinates[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const callSignal = AbortSignal.any([totalSignal, AbortSignal.timeout(20_000)]);
      const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${mode}/${points[i]!.join(',')};${points[i + 1]!.join(',')}`);
      url.search = new URLSearchParams({ access_token: this.token, alternatives: String(comparisonPick !== undefined), geometries: 'geojson', overview: 'full', steps: String(navigation), language: 'ja' }).toString();
      if (conditions?.avoidMotorways) url.searchParams.set('exclude', 'motorway');
      let body: any;
      try {
        callSignal.throwIfAborted();
        const response = await this.fetcher(url, { signal: callSignal });
        if (response.status === 429) throw new RouteFault('RATE_LIMITED', '道路providerの利用上限です', 429, { failedLeg: i, retryAfter: response.headers.get('retry-after') });
        if (!response.ok) throw new RouteFault('PROVIDER_UNAVAILABLE', '道路providerに接続できません', 503, { failedLeg: i, providerStatus: response.status });
        try { body = await response.json(); } catch (error) { if (callSignal.aborted) throw error; throw new RouteFault('OUTPUT_INVALID', '道路providerの応答形式が不正です'); }
      } catch (error) {
        if (error instanceof RouteFault) throw error;
        if (signal?.aborted) throw new RouteFault('CANCELLED', '経路取得を取り消しました', 409);
        if (callSignal.aborted) throw new RouteFault('TIMEOUT', '経路取得が時間切れです', 504);
        // Never include a fetch error or URL: either may contain the access token.
        throw new RouteFault('PROVIDER_UNAVAILABLE', '道路providerに接続できません', 503, { failedLeg: i });
      }
      if (body?.code === 'NoRoute' || body?.code === 'NoSegment') throw new RouteFault('ROUTE_NOT_FOUND', '指定地点間の道路経路がありません', 422, { failedLeg: i });
      if (body?.code !== 'Ok') throw new RouteFault('PROVIDER_UNAVAILABLE', '道路providerが経路を返しませんでした', 503, { failedLeg: i });
      const route = body.routes?.[comparisonPick ?? 0] ?? body.routes?.[0];
      if (conditions?.avoidMotorways) {
        const notifications = [...(route?.notifications ?? []), ...(route?.legs ?? []).flatMap((leg: any) => leg.notifications ?? [])];
        const motorway = (route?.legs ?? []).some((leg: any) => (leg.steps ?? []).some((step: any) => (step.intersections ?? []).some((intersection: any) => intersection.classes?.includes('motorway'))));
        if (motorway || notifications.some((n: any) => n.type === 'violation' && n.subtype === 'motorway')) throw new RouteFault('STATE_CONFLICT', '高速道路回避条件を満たす経路がありません', 409, { failedLeg: i, condition: 'avoidMotorways', status: 'notSatisfied' });
      }
      const line = geometry(route?.geometry);
      const leg: RouteLeg = { fromIndex: i, toIndex: i + 1, geometry: line, distanceM: positive(route.distance), durationSec: Math.round(positive(route.duration)) };
      if (navigation) leg.steps = steps(route.legs?.[0]?.steps);
      if (coordinates.length && !samePoint(coordinates[coordinates.length - 1]!, line.coordinates[0]!)) throw new RouteFault('OUTPUT_INVALID', '道路経路の区間境界が連続していません', 422, { failedLeg: i });
      coordinates.push(...(i === 0 ? line.coordinates : line.coordinates.slice(1)));
      legs.push(leg);
    }
    if (totalSignal.aborted) throw new RouteFault(signal?.aborted ? 'CANCELLED' : 'TIMEOUT', '経路取得が中断されました', signal?.aborted ? 409 : 504);
    const fetchedAt = Date.now();
    return { ...(conditions ? { requestedConditions: structuredClone(conditions), conditionEvaluations: conditions.avoidMotorways ? [{ key: 'avoidMotorways' as const, status: 'applied' as const, reason: '全区間にexclude=motorwayを指定し、providerのmotorway違反通知と道路分類を検査', provider: 'mapbox-directions', sourceUrl: 'https://docs.mapbox.com/api/navigation/directions/', fetchedAt }] : [] } : {}), legs, geometry: { type: 'LineString', coordinates }, distanceM: legs.reduce((n, l) => n + l.distanceM, 0), durationSec: legs.reduce((n, l) => n + l.durationSec, 0), provider: 'mapbox-directions', fetchedAt };
  }
}

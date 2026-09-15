import { CommonError } from "../../core/errors.ts";
import { requestHash } from "../../core/idempotency.ts";

export type Position = [number, number];
export type Bounds = [number, number, number, number];
export type BikeSettings = {
  region: { id: string; bounds: Bounds };
  vehicle: { class: "moped" | "light_motorcycle" | "motorcycle" | "electric_motorcycle"; displacementCc?: number };
  highwayPolicy: "allow" | "avoid";
};
export type Status = "verified" | "ineligible" | "unknown";
export interface Source {
  id: string; name: string; url: string; attribution: string;
  fetchedAt: number; updatedAt: number | null;
}
export interface Assessment { status: Status; reason: string; sourceRefs: string[]; checkedAt: number }
export interface BikePlace {
  id: string; name: string; position: { longitude: number; latitude: number };
  category: "motorcycle_parking" | "fuel" | "motorcycle_shop";
  tags: Record<string, string>; source: Source; vehicleAssessment: Assessment;
}
export interface RoadObservation {
  id: string; geometry: { type: "LineString"; coordinates: Position[] };
  tags: Record<string, string>; source: Source; vehicleAssessment: Assessment;
}
export const settingsSchema = {
  type: "object", additionalProperties: false, required: ["region", "vehicle", "highwayPolicy"],
  properties: {
    region: { type: "object", title: "検索地域", additionalProperties: false, required: ["id", "bounds"], properties: {
      id: { type: "string", minLength: 1, maxLength: 80, title: "地域ID" },
      bounds: { type: "array", title: "検索範囲（西・南・東・北）", minItems: 4, maxItems: 4, items: { type: "number" } },
    } },
    vehicle: { type: "object", title: "車種", additionalProperties: false, required: ["class"], properties: {
      class: { type: "string", title: "車種区分", enum: ["moped", "light_motorcycle", "motorcycle", "electric_motorcycle"] },
      displacementCc: { type: "number", title: "排気量（cc・電動車は指定しない）", exclusiveMinimum: 0, maximum: 3000 },
    } },
    highwayPolicy: { type: "string", title: "高速道路", enum: ["allow", "avoid"] },
  },
};
export const defaultSettings: BikeSettings = {
  region: { id: "JP-13-shibuya", bounds: [139.69, 35.65, 139.73, 35.69] },
  vehicle: { class: "motorcycle", displacementCc: 250 }, highwayPolicy: "avoid",
};
export function validateSettings(value: unknown): BikeSettings {
  const s = value as BikeSettings;
  const keys = (v: unknown, allowed: string[]) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k));
  if (!keys(s, ["region", "vehicle", "highwayPolicy"]) || !keys(s.region, ["id", "bounds"]) || !keys(s.vehicle, ["class", "displacementCc"]) || typeof s.region.id !== "string" || !s.region.id.trim() || s.region.id.length > 80 || !["moped", "light_motorcycle", "motorcycle", "electric_motorcycle"].includes(s.vehicle.class) || !["allow", "avoid"].includes(s.highwayPolicy)) throw new CommonError("VALIDATION_FAILED", "車種・地域・高速道路条件を確認してください。");
  const b = s.region.bounds;
  if (!Array.isArray(b) || b.length !== 4 || b.some(n => !Number.isFinite(n)) || b[0] < -180 || b[2] > 180 || b[1] < -85 || b[3] > 85 || b[0] >= b[2] || b[1] >= b[3]) throw new CommonError("VALIDATION_FAILED", "地域の範囲が不正です。");
  if (b[2] - b[0] > 0.5 || b[3] - b[1] > 0.5) throw new CommonError("RANGE_NOT_SATISFIABLE", "検索範囲を緯度・経度それぞれ0.5度以内に絞ってください。");
  const cc = s.vehicle.displacementCc;
  if (cc !== undefined && (!Number.isFinite(cc) || cc <= 0 || cc > 3000 || s.vehicle.class === "electric_motorcycle")) throw new CommonError("VALIDATION_FAILED", "排気量を確認してください。電動車には排気量を指定しません。");
  return structuredClone(s);
}
export const settingsHash = (settings: BikeSettings) => requestHash(settings);
export const geometryHash = (geometry: unknown) => requestHash(geometry);
export const inside = (p: Position, b: Bounds) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
export const NEXCO_SOURCE = "https://www.c-nexco.co.jp/safety/safety_drive/pdf/safety_drive01.pdf";
export function assessTags(tags: Record<string, string>, s: BikeSettings, sourceId: string, checkedAt: number): Assessment {
  const assessment = (status: Status, reason: string, refs = [sourceId]): Assessment => ({ status, reason, sourceRefs: refs, checkedAt });
  if (s.region.id.startsWith("JP-") && (tags.highway === "motorway" || tags.highway === "motorway_link" || tags.motorroad === "yes") && (s.vehicle.class === "moped" || s.vehicle.class === "light_motorcycle" || (s.vehicle.displacementCc !== undefined && s.vehicle.displacementCc <= 125))) return assessment("ineligible", "日本の自動車専用道路は原付・125cc以下の二輪車の対象外です。", [sourceId, NEXCO_SOURCE]);
  if (s.highwayPolicy === "avoid" && ["motorway", "motorway_link"].includes(tags.highway ?? "")) return assessment("ineligible", "高速道路を使わない設定に適合しません。");
  const key = s.vehicle.class === "moped" ? "mofa" : s.vehicle.class === "light_motorcycle" ? "moped" : "motorcycle";
  // Conditional/directional and vehicle-specific restrictions need a dedicated interpreter.
  if (Object.keys(tags).some(k => k.includes(":conditional") || k.startsWith(key + ":"))) return assessment("unknown", "時間・方向・車種の追加条件があり、通行可否は未確認です。");
  const value = tags[key] ?? tags.motor_vehicle ?? tags.vehicle ?? tags.access;
  if (["no", "private", "destination", "customers", "agricultural", "forestry"].includes(value ?? "")) return assessment("ineligible", "公開タグの通行・利用制限に該当します。");
  if (s.vehicle.class === "electric_motorcycle") return assessment("unknown", "電動車の法定区分・出力条件を確認できていません。");
  if (["yes", "designated", "permissive"].includes(tags[key] ?? "")) return assessment("verified", "この地点・道路の車種別公開タグに利用許可が明記されています。最新の現地規制は別途確認が必要です。");
  return assessment("unknown", "車種別の明示的な許可情報がありません。利用可能とは断定しません。");
}

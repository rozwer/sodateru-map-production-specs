import { defaultSettings, settingsSchema, validateSettings } from "./domain.ts";
import type { PluginRelease } from "../../features/plugins/types.ts";
const declarations = () => [{ targetKey: "layer:bike", property: "visibility", value: true }];
export const bikeRelease: PluginRelease = {
  manifest: {
    id: "bike", name: "バイク", description: "車種・地域・高速道路条件から地点と経路の根拠を確認します。",
    category: "移動", author: "育てる地図", pluginVersion: "1.0.0", updatedAt: Date.UTC(2026, 8, 15),
    changeLog: "車種設定、実地点・道路情報、経路評価の保存・再取得", icon: "motorcycle", settingsSchema,
    defaultSettings,
    usageInfo: ["道路タグ欠測・車種規制未確認の経路は採用できません。", "検索範囲は緯度・経度各0.5度以内。出典と更新時刻を表示します。"],
    sources: [{ name: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright", attribution: "© OpenStreetMap contributors (ODbL)" }, { name: "Mapbox Directions", url: "https://docs.mapbox.com/api/navigation/directions/", attribution: "© Mapbox" }],
    trialConditions: ["試用は模擬表示です。実在する駐車場・通行可能な経路を示しません。"],
  },
  declarations,
  trial(input) {
    const settings = validateSettings(input), [w,s,e,n] = settings.region.bounds;
    return {
      dataKind: "mock", label: "模擬試用：実際の地点・通行条件ではありません", declarations: declarations(), generatedAt: Date.now(),
      features: [{ type: "Feature", id: "bike-trial-place", geometry: { type: "Point", coordinates: [(w+e)/2, (s+n)/2] }, properties: { kind: "place", label: "模擬の二輪駐車場", legendId: "bike-mock", sourceIds: ["bike-mock"], status: "simulated", value: null, unit: null } }],
      legends: [{ id: "bike-mock", label: "模擬地点", color: "#8A6D3B", meaning: "表示の試用用。車種条件への適合・実在は未確認です。" }],
      sources: [{ id: "bike-mock", title: "BIKE模擬試用", url: null, attribution: "育てる地図の試用データ", dataKind: "mock", fetchedAt: null, sourceUpdatedAt: null, observedAt: null, issuedAt: null, validAt: null }],
      warnings: ["実検索は導入後のバイク検索から実行してください。模擬地点は保存・経路採用できません。"],
    };
  },
  async prepare(settings) { validateSettings(settings); },
};

/** 1.0.0 remains registered unchanged; this release enables the shipped exact-route segment evaluation. */
const segmentDeclarations = () => [
  ...declarations(),
  { targetKey: "feature:bike:segment-evidence", property: "enabled", value: true },
];
export const bikeSegmentRelease: PluginRelease = {
  ...bikeRelease,
  manifest: {
    ...structuredClone(bikeRelease.manifest),
    pluginVersion: "1.1.0",
    updatedAt: Date.UTC(2026, 8, 15, 4),
    changeLog: "同一形状の道路区間根拠を照合し、要求適用状態とmotorway部分評価を分けて保存。旧版の共通地点候補・採用は維持。",
    usageInfo: [
      ...bikeRelease.manifest.usageInfo,
      "1.1.0では共通経路から同一形状の区間根拠が渡された場合、道路クラス・方向・全区間被覆を評価して保存します。",
      "1.0.0へ戻しても共通地点候補・採用と保存済み評価の再取得は維持します。新規の区間根拠評価は1.1.0で提供します。",
      "日本の車種・排気量・時間規制の未確認はunknownを維持します。正式な二輪経路の取得口は準備中です。版変更後は新しい検索・操作IDを使用してください。",
    ],
  },
  declarations: segmentDeclarations,
  trial(settings) {
    return { ...bikeRelease.trial(settings), declarations: segmentDeclarations() };
  },
};

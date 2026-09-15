import { defaultSettings, settingsSchema, validateSettings } from "./domain.ts";
import type { PluginRelease } from "../../features/plugins/types.ts";
const declarations = () => [{ targetKey: "layer:bike", property: "visibility", value: true }];
export const bikeRelease: PluginRelease = {
  manifest: {
    id: "bike", name: "バイク", description: "車種・地域・高速道路条件から地点と経路の根拠を確認します。",
    category: "移動", author: "育てる地図", pluginVersion: "1.0.0", updatedAt: Date.UTC(2026, 8, 15),
    changeLog: "車種設定、実地点・道路情報、経路評価の保存・再取得", icon: "bike", settingsSchema,
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

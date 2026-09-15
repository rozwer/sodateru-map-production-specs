/** Explicit inspection data only. Never seed the live API or a person's saved state. */
import type { PluginCardModel, PluginConditionField, PluginKind } from "./view-model";
import type { FeatureRequestModel } from "../feature-requests/view-model";
import type {
  PluginCatalog, PluginManifest, PluginIconId, PluginSetting, PluginTrialPreview,
  PluginTrialFeature, FeatureRequest,
} from "../../../packages/api-client/types.generated";

export const referencePhotos = {
  shrine: {
    url: new URL("./assets/shrine.jpg", import.meta.url).href,
    alt: "桜と神社の参考写真（青梅市・模擬素材）",
    source: "https://unsplash.com/photos/path-leading-to-a-shrine-through-cherry-blossoms-RlMZukANJTQ",
    attribution: "kaori kubota / Unsplash",
  },
  coffee: {
    url: new URL("../feature-requests/assets/coffee.jpg", import.meta.url).href,
    alt: "コーヒーの参考写真（模擬投稿のアイコン）",
    source: "https://unsplash.com/photos/heKg-V9yHwc",
    attribution: "shche_ team / Unsplash",
  },
  park: {
    url: new URL("../feature-requests/assets/park.jpg", import.meta.url).href,
    alt: "公園の参考写真（模擬投稿のアイコン）",
    source: "https://unsplash.com/photos/lh_MesNhkbI",
    attribution: "Unsplash",
  },
};
const coffeeAvatar = referencePhotos.coffee.url;
const parkAvatar = referencePhotos.park.url;
export const referenceVersions = {
  bike: {
    current: "v1.2.0", next: "v1.3.0", previous: "v1.1.0",
    changeLog: [
      "本山・東山エリアのおすすめルートを追加",
      "休憩スポットの情報を最新化（5件追加）",
      "アイコンデザインを見やすく改善",
    ],
  },
};
const fixturePlugins: PluginCardModel[] = [
  {
    id: "fixture-bike",
    name: "バイクマップ",
    kind: "bike",
    category: "mobility",
    description: "バイクで気持ちよく走れる道を見つけよう。",
    summary:
      "車種に応じた道路条件を確認し、快適に走れるルートや注意したい区間を地図上で見つけられます。",
    author: "育てる地図チーム",
    updatedAt: "2024/4/15",
    versionLabel: "v1.2.0",
    regionLabel: "本山・東山エリア",
    installed: true,
    enabled: true,
    permissions: ["位置情報"],
    demo: true,
  },
  {
    id: "fixture-pilgrimage",
    name: "聖地マップ",
    kind: "pilgrimage",
    category: "walking",
    description: "アニメ・作品の舞台になった場所をめぐるマップです。",
    installed: true,
    enabled: false,
    regionLabel: "本山エリア",
    author: "育てる地図チーム",
    versionLabel: "v1.0.0",
    permissions: ["ネットワーク"],
    demo: true,
  },
  {
    id: "fixture-disaster",
    name: "防災マップ",
    kind: "disaster",
    category: "safety",
    description: "想定リスクと時点のある地域情報を地図で確認。",
    installed: false,
    enabled: false,
    author: "育てる地図チーム",
    versionLabel: "v1.0.0",
    permissions: ["位置情報", "ネットワーク"],
    demo: true,
  },
];
const conditionDefaults: PluginConditionField[] = [
  {
    id: "region",
    type: "select",
    label: "地域を選ぶ",
    help: "地図を表示する地域を選んでください。",
    value: "motoyama",
    options: [
      { value: "motoyama", label: "本山" },
      { value: "higashiyama", label: "東山公園" },
    ],
  },
  {
    id: "vehicle",
    type: "choice",
    label: "車種を選ぶ",
    help: "走行する車種を選んでください。",
    value: "moped",
    options: [
      { value: "moped", label: "原付", detail: "〜50cc" },
      { value: "standard", label: "普通二輪", detail: "51〜400cc" },
      { value: "large", label: "大型二輪", detail: "401cc〜" },
    ],
  },
  {
    id: "highway",
    type: "boolean",
    label: "高速道路を使う",
    help: "高速道路をルートに含めて表示します。",
    value: false,
  },
];
const fixturePosts: FeatureRequestModel[] = [
  {
    id: "fixture-own",
    name: "やまぐち",
    body: "雨の日に屋根のある道を選びたい。",
    timestampLabel: "2024/5/12 11:02",
    visibility: "public",
    liked: false,
    likeCount: 0,
    owned: true,
    tags: [
      { id: "area", label: "本山エリア", icon: "place" },
      { id: "rain", label: "雨の日", icon: "weather" },
    ],
  },
  {
    id: "fixture-sakura",
    name: "さくら",
    avatarUrl: coffeeAvatar,
    body: "雨の日に屋根のある道を選びたい。",
    timestampLabel: "2024/5/12 10:24",
    visibility: "public",
    liked: false,
    likeCount: 12,
    owned: false,
    tags: [
      { id: "area", label: "本山エリア", icon: "place" },
      { id: "mobility", label: "移動", icon: "walking" },
      { id: "rain", label: "雨の日", icon: "weather" },
    ],
  },
  {
    id: "fixture-takumi",
    name: "たくみ",
    avatarUrl: parkAvatar,
    body: "ベビーカーでも通れる道を地図で知りたい。",
    timestampLabel: "2024/5/10 18:03",
    visibility: "public",
    liked: false,
    likeCount: 8,
    owned: false,
    tags: [
      { id: "area", label: "東山公園エリア", icon: "place" },
      { id: "child", label: "子育て" },
      { id: "barrier", label: "バリアフリー" },
    ],
  },
];

/** Store artwork has no installations; management artwork has bike ON / pilgrimage OFF. */
export function createReferencePlugins(state: "store" | "manage" = "manage"): PluginCardModel[] {
  const plugins = structuredClone(fixturePlugins);
  if (state === "manage") {
    plugins[0]!.description = "ツーリングにおすすめの道や休憩スポットを表示します。";
    return plugins;
  }
  const descriptions: Record<string, string> = {
    "fixture-disaster": "想定リスクと時点のある地域情報を地図で確認",
    "fixture-bike": "確認できる走行条件と道路を地図で探す",
    "fixture-pilgrimage": "作品やテーマに関連する場所と出典を確認",
  };
  return ["fixture-disaster", "fixture-bike", "fixture-pilgrimage"].map(id => ({
    ...plugins.find(item => item.id === id)!,
    installed: false, enabled: false, author: "育てる地図", versionLabel: "v0.1",
    description: descriptions[id]!,
  }));
}

export function createReferenceConditions(kind: PluginKind = "bike"): PluginConditionField[] {
  if (kind === "bike") return structuredClone(conditionDefaults);
  if (kind === "pilgrimage") return [
    { ...structuredClone(conditionDefaults[0]!), help: "試用する地域を選んでください。" },
    { id: "work", type: "select", label: "作品を選ぶ", value: "reference-work",
      help: "画面確認用の模擬作品です。実在作品との対応は未確認です。",
      options: [{ value: "reference-work", label: "作品の舞台をめぐる（模擬）" }] },
  ];
  // Disaster settings belong to the dedicated adapter; never offer bike conditions there.
  return [];
}
export function createReferenceLayers(kind: PluginKind): { id: string; name: string; description: string }[] {
  if (kind === "bike") return [{ id: "roads", name: "道路条件のレイヤー", description: "快適な道・注意が必要な道・未確認の道を模擬表示します。" }];
  if (kind === "pilgrimage") return [{ id: "pilgrimage", name: "作品ゆかりの場所", description: "作品と場所の対応を確認するための模擬表示です。" }];
  return [];
}
export function createReferencePosts(): FeatureRequestModel[] {
  return structuredClone(fixturePosts);
}

const timestamp = Date.UTC(2024, 3, 15);
const icons: Record<string, PluginIconId> = {
  "fixture-bike": "motorcycle", "fixture-pilgrimage": "star", "fixture-disaster": "shield",
};
/** Existing transport DTOs, independent of UI and backend registration. IDs deliberately remain fixture-*. */
export function createReferenceCatalog(state: "store" | "manage" = "manage"): PluginCatalog {
  return { items: createReferencePlugins(state).map((card, order) => {
    const manifest: PluginManifest = {
      id: card.id, name: card.name, description: card.description, category: card.category,
      author: card.author!, pluginVersion: card.versionLabel!.replace(/^v/, ""),
      updatedAt: timestamp, changeLog: "参照画像のデモ状態。実リリースではありません。",
      icon: icons[card.id]!, usageInfo: card.permissions, sources: [],
      settingsSchema: card.kind === "bike" ? {
        type: "object", additionalProperties: false,
        properties: { region: { enum: ["motoyama", "higashiyama"] }, vehicle: { enum: ["moped", "standard", "large"] }, highway: { type: "boolean" } },
        required: ["region", "vehicle", "highway"],
      } : card.kind === "pilgrimage" ? {
        type: "object", additionalProperties: false,
        properties: { region: { enum: ["motoyama", "higashiyama"] }, work: { const: "reference-work" } },
        required: ["region", "work"],
      } : { type: "object", properties: {}, additionalProperties: false },
      defaultSettings: card.kind === "bike" ? { region: "motoyama", vehicle: "moped", highway: false }
        : card.kind === "pilgrimage" ? { region: "motoyama", work: "reference-work" } : {},
      trialConditions: ["UI検査用の模擬データ。API保存・実際の通行可否・防災判断には使えません。"], order,
    };
    const installed: PluginSetting | null = card.installed ? {
      id: card.id, installId: `inspection-${card.id}`, version: 1,
      createdAt: timestamp, updatedAt: timestamp, enabled: card.enabled,
      pluginVersion: manifest.pluginVersion, previousVersion: card.kind === "bike" ? "1.1.0" : null,
      settings: structuredClone(manifest.defaultSettings), icon: manifest.icon,
      declarations: [], manifest: structuredClone(manifest),
    } : null;
    const versions = card.kind === "bike" && state === "manage"
      ? ["1.1.0", "1.2.0", "1.3.0"].map(pluginVersion => ({ ...structuredClone(manifest), pluginVersion,
          changeLog: pluginVersion === "1.3.0" ? referenceVersions.bike.changeLog.join("\n") : manifest.changeLog }))
      : [structuredClone(manifest)];
    return { ...manifest, installed, versions, iconOptions: [
      { id: "pin", label: "ピン", symbol: "📍" },
      { id: "motorcycle", label: "バイク", symbol: "🏍️" },
      { id: "shield", label: "防災", symbol: "🛡️" },
      { id: "book", label: "作品", symbol: "📖" },
      { id: "star", label: "星", symbol: "⭐" },
      { id: "map", label: "地図", symbol: "🗺️" },
    ] };
  }) };
}

function referencePostTime(label: string): number {
  const [year, month, day, hour, minute] = label.split(/[/ :]/).map(Number);
  return Date.UTC(year!, month! - 1, day!, hour! - 9, minute!);
}

/** Same posts in the established transport format; ownership stays explicit in the view model. */
export function createReferenceRequestDtos(): FeatureRequest[] {
  return createReferencePosts().map(post => ({
    id: post.id, version: 1, createdAt: referencePostTime(post.timestampLabel),
    updatedAt: referencePostTime(post.timestampLabel),
    personId: post.owned ? "fixture-person-self" : `fixture-person-${post.id}`,
    title: post.body, body: post.body, visibility: post.visibility, displayName: post.name,
    regionTags: post.tags.filter(tag => tag.id === "area").map(tag => tag.label),
    purposeTags: post.tags.filter(tag => tag.id !== "area").map(tag => tag.label),
    empathyCount: post.likeCount, myEmpathy: post.liked,
  }));
}

/** Geometry overlays for the existing MapBridge/preview renderer, never a new mock runtime. */
export function createReferenceTrial(pluginId: string, phase: "before" | "after" = "after"): PluginTrialPreview {
  const features: PluginTrialFeature[] = [];
  const add = (id: string, geometry: PluginTrialFeature["geometry"], kind: PluginTrialFeature["properties"]["kind"], label: string, legendId: string) => {
    features.push({ type: "Feature", id, geometry, properties: {
      kind, label, legendId, sourceIds: ["grow-reference"], status: "simulated", value: null, unit: null,
    } });
  };
  if (phase === "after" && pluginId === "fixture-bike") {
    add("fixture-pleasant-road", { type: "LineString", coordinates: [[136.965,35.1658],[136.97,35.1658],[136.973,35.1642]] }, "route", "快適な道（模擬）", "pleasant");
    add("fixture-caution-road", { type: "LineString", coordinates: [[136.973,35.1642],[136.976,35.1608]] }, "route", "注意が必要（模擬）", "caution");
    add("fixture-unknown-road", { type: "LineString", coordinates: [[136.976,35.1608],[136.9817,35.1585]] }, "route", "未確認の道（模擬）", "unknown");
    add("fixture-coffee", { type: "Point", coordinates: [136.9637,35.1616] }, "place", "休憩スポット（模擬）", "spot");
    add("fixture-park", { type: "Point", coordinates: [136.9817,35.1585] }, "place", "東山公園周辺（模擬地点）", "spot");
  }
  if (phase === "after" && pluginId === "fixture-pilgrimage") {
    add("fixture-pilgrimage-scene", { type: "Point", coordinates: [136.9758,35.163] }, "pilgrimage", "作品ゆかりの場所の表示例（実在作品との対応未確認）", "spot");
  }
  return {
    dataKind: "mock", label: `${phase === "before" ? "導入前" : "導入後"}の表示例（模擬・未保存）`,
    declarations: [], features,
    warnings: pluginId === "fixture-disaster"
      ? ["防災表示はDISASTER-DATAの確定DTOを使用してください。このデータには災害情報を含めていません。"]
      : ["位置・道の色・作品との関連は画面確認用の模擬情報です。実際の通行条件や作品の舞台を示しません。"],
    legends: pluginId === "fixture-bike" ? [
      { id: "pleasant", label: "快適な道", color: "#11b586", meaning: "模擬の快適な道。通行可否を保証しない" },
      { id: "caution", label: "注意が必要", color: "#ed7a28", meaning: "模擬の注意表示" },
      { id: "unknown", label: "未確認", color: "#969fa5", meaning: "通行条件が未確認" },
      { id: "spot", label: "スポット", color: "#078bc8", meaning: "模擬地点" },
    ] : pluginId === "fixture-pilgrimage" ? [{ id: "spot", label: "作品ゆかりの場所", color: "#5931b4", meaning: "作品との対応を確認していない模擬地点" }] : [],
    sources: [{ id: "grow-reference", title: "承認済UI参照・既存fixture", url: null,
      attribution: "育てる地図 UI検査用", dataKind: "mock", fetchedAt: null, sourceUpdatedAt: null,
      observedAt: null, issuedAt: null, validAt: null }], generatedAt: timestamp,
  };
}

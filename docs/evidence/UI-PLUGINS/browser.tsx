/** UI-only fixture. No API client, database writes, or product entry-point import. */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@qa-app/App";
import { MapBridge } from "@qa-app/map-bridge";
import { MapPreview } from "@qa-map/MapPreview";
import type {
  PluginCardModel,
  PluginConditionField,
  PluginPreview,
} from "../../../src/features/plugins/view-model";
import { usePreviewPhase } from "../../../src/features/plugins/usePreviewPhase";
import {
  PluginConflictView,
  PluginDetailView,
  PluginInstallView,
  PluginManageView,
  PluginStoreView,
  PluginTrialView,
  PluginUpdateView,
} from "../../../src/features/plugins/views";
import {
  FeatureRequestEditorView,
  FeatureRequestListView,
} from "../../../src/features/feature-requests/views";
import type {
  FeatureRequestDraft,
  FeatureRequestModel,
} from "../../../src/features/feature-requests/view-model";

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
function Scene({
  after = true,
  extra = false,
}: {
  after?: boolean;
  extra?: boolean;
}) {
  const [bridge] = useState(
    () => new MapBridge(`plugins-visual-fixture-${Math.random()}`),
  );
  useEffect(() => {
    bridge.setCamera({
      longitude: 136.9758,
      latitude: 35.163,
      zoom: 13.4,
      bearing: 0,
      pitch: 0,
    });
    bridge.setView({ lens: "physical", dimension: "2d", following: false });
    return () => bridge.dispose();
  }, [bridge]);
  useEffect(() => {
    bridge.clear("plugin:fixture");
    if (!after) return;
    bridge.showCandidates("plugin:fixture", {
      resultId: "ui-fixture-only",
      candidates: [
        {
          id: "fixture-park",
          coordinates: [136.9817, 35.1585],
          label: "東山公園",
        },
        {
          id: "fixture-coffee",
          coordinates: [136.9637, 35.1616],
          label: "休憩スポット",
        },
        ...(extra
          ? [
              {
                id: "fixture-photo",
                coordinates: [136.978, 35.166],
                label: "写真スポット",
              },
            ]
          : []),
      ],
    });
    bridge.showRoute("plugin:fixture", {
      previewId: "ui-fixture-route",
      geometry: {
        type: "LineString",
        coordinates: [
          [136.965, 35.1658],
          [136.97, 35.1658],
          [136.973, 35.1642],
          [136.976, 35.1608],
          [136.9817, 35.1585],
        ],
      },
      waypoints: [],
    });
  }, [bridge, after, extra]);
  return (
    <MapPreview bridge={bridge} label="模擬地点を重ねた本山エリアの実地図" />
  );
}
const preview = (after = true, extra = false): PluginPreview => ({
  map: <Scene after={after} extra={extra} />,
  mock: true,
});
function PluginFixture({
  route,
  navigate,
  back,
  active = true,
}: {
  route: { pageId: string; params: Record<string, string> };
  navigate: (id: string, params?: Record<string, string>) => void;
  back: () => void;
  active?: boolean;
}) {
  const [plugins, setPlugins] = useState(fixturePlugins);
  const [fields, setFields] = useState(conditionDefaults);
  const [showPreview, setShowPreview] = useState(false);
  const phase = usePreviewPhase(showPreview ? "fixture-trial" : null, active);
  const after = phase === "after";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<
    "all" | "safety" | "mobility" | "walking"
  >("all");
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string>();
  const [notice, setNotice] = useState("");
  if (!active) return null;
  const plugin =
    plugins.find((item) => item.id === route.params.pluginId) || plugins[0];
  const go = (id: string) => navigate(id, { pluginId: plugin.id });
  const action = () =>
    setNotice("UI fixture：操作を受け付けました。API保存は実行していません。");
  const status = {
    notice,
    error: new URLSearchParams(location.search).has("failure")
      ? "UI fixture：通信失敗の表示確認です。入力を保持しています。"
      : undefined,
    onRetry: action,
  };
  switch (route.pageId) {
    case "plugin-store":
      return (
        <PluginStoreView
          plugins={plugins}
          query={query}
          category={category}
          onQuery={setQuery}
          onCategory={setCategory}
          onOpen={(id) => navigate("plugin-detail", { pluginId: id })}
          onManage={() => go("plugin-manage")}
          onRequests={() => navigate("feature-requests")}
          {...status}
        />
      );
    case "plugin-detail":
      return (
        <PluginDetailView
          plugin={plugin}
          preview={preview()}
          onTry={() => go("plugin-trial")}
          {...status}
        />
      );
    case "plugin-trial":
      return (
        <PluginTrialView
          fields={fields}
          onChange={(id, value) => {
            setFields((previous) =>
              previous.map((field) =>
                field.id === id ? { ...field, value } : field,
              ),
            );
            setShowPreview(false);
          }}
          onPreview={() => setShowPreview(true)}
          preview={showPreview ? preview(after) : undefined}
          phase={phase}
          onContinue={() => go("plugin-install")}
          {...status}
        />
      );
    case "plugin-install":
      return (
        <PluginInstallView
          conditions={[
            { label: "選んだ地域", value: "本山" },
            { label: "選んだ車種", value: "原付" },
          ]}
          preview={{
            ...preview(),
            legend: [
              { id: "pleasant", label: "快適な道", color: "#11b586" },
              { id: "caution", label: "注意が必要", color: "#ed7a28" },
              {
                id: "unknown",
                label: "未確認",
                color: "#969fa5",
                dashed: true,
              },
            ],
          }}
          layers={[
            {
              id: "roads",
              name: "道路条件のレイヤー",
              description: "快適な道・注意が必要な道・未確認の道を表示します。",
            },
          ]}
          unknownNote="データが不足している道路は「未確認」として表示されます。実際の通行可否は確認してください。"
          onInstall={action}
          onCancel={back}
          {...status}
        />
      );
    case "plugin-manage":
      return (
        <PluginManageView
          plugins={plugins.filter((item) => item.installed)}
          previews={Object.fromEntries(
            plugins.map((item) => [item.id, preview()]),
          )}
          onToggle={(id, enabled) =>
            setPlugins((previous) =>
              previous.map((item) =>
                item.id === id ? { ...item, enabled } : item,
              ),
            )
          }
          onIcon={action}
          onMap={action}
          onConditions={() => go("plugin-trial")}
          onUpdate={() => go("plugin-update")}
          onCompanion={action}
          onFind={() => go("plugin-store")}
          {...status}
        />
      );
    case "plugin-update":
      return (
        <PluginUpdateView
          plugin={plugin}
          current={{ version: "v1.2.0", preview: preview() }}
          next={{ version: "v1.3.0", preview: preview(true, true) }}
          changes={[
            "本山・東山エリアのおすすめルートを追加",
            "休憩スポットの情報を最新化（5件追加）",
            "アイコンデザインを見やすく改善",
          ]}
          onPreview={() => go("plugin-trial")}
          onUpdate={action}
          onRollback={action}
          onRemove={action}
          canRollback
          {...status}
        />
      );
    default:
      return (
        <PluginConflictView
          target="地図の色分け"
          description="同じ場所の色が異なる意味で表示されるため、判別しにくくなります。"
          sides={[
            {
              id: "fixture-bike",
              name: "バイクマップ",
              kind: "bike",
              description: "道の種類に応じて、道路を色分けします。",
              preview: preview(),
            },
            {
              id: "fixture-nature",
              name: "自然マップ",
              kind: "other",
              description: "緑の多さに応じて、エリアを色分けします。",
              preview: preview(false),
            },
          ]}
          selection={selection}
          selecting={selecting}
          onSelect={setSelection}
          onChooseDisable={() => setSelecting(true)}
          onDisable={action}
          onKeep={action}
          onBack={back}
          {...status}
        />
      );
  }
}
function RequestFixture({
  route,
  navigate,
}: {
  route: { pageId: string; params: Record<string, string> };
  navigate: (id: string, params?: Record<string, string>) => void;
}) {
  const [items, setItems] = useState(fixturePosts);
  const [tab, setTab] = useState<"public" | "drafts">("public");
  const [notice, setNotice] = useState(
    new URLSearchParams(location.search).has("submitted")
      ? "投稿しました（UI fixture・未保存）"
      : "",
  );
  const [value, setValue] = useState<FeatureRequestDraft>({
    name: "やまぐち",
    body: "雨の日に屋根のある道を選びたい。",
    visibility: "public",
  });
  if (route.pageId === "feature-request-edit")
    return (
      <FeatureRequestEditorView
        value={value}
        onChange={setValue}
        onSave={() => setNotice("UI fixture：API保存は実行していません。")}
        notice={notice}
      />
    );
  return (
    <FeatureRequestListView
      items={tab === "public" ? items : []}
      tab={tab}
      onTab={setTab}
      onWrite={() => navigate("feature-request-edit")}
      onLike={(id) =>
        setItems((previous) =>
          previous.map((item) =>
            item.id === id
              ? {
                  ...item,
                  liked: !item.liked,
                  likeCount: item.likeCount + (item.liked ? -1 : 1),
                }
              : item,
          ),
        )
      }
      onEdit={() => navigate("feature-request-edit")}
      onDelete={() => setNotice("UI fixture：削除は実行していません。")}
      onRequest={() => navigate("feature-request-edit")}
      onDismissNotice={() => setNotice("")}
      notice={notice}
    />
  );
}
const titles: Record<string, string> = {
  "plugin-store": "拡張機能を探す",
  "plugin-detail": "拡張機能の詳細",
  "plugin-trial": "バイクマップを試す",
  "plugin-install": "導入前の確認",
  "plugin-manage": "マップ機能の管理",
  "plugin-update": "バイクマップの更新",
  "plugin-conflict": "変更が重なる場合",
  "feature-requests": "育てる地図",
  "feature-request-edit": "お願いを書く",
};
const screens = Object.entries(titles).map(([id, title]) => ({
  id,
  title,
  component: id.startsWith("feature-request") ? RequestFixture : PluginFixture,
  layout: {
    header: "back" as const,
    bottomNav: ["plugin-store", "feature-requests"].includes(id),
    background: "soft" as const,
  },
}));
if (new URLSearchParams(location.search).has("font200"))
  document.documentElement.style.fontSize = "32px";
createRoot(document.getElementById("root")!).render(
  <>
    <App screens={screens} scopeKey="plugins-ui-fixture:demo" dataMode="demo" />
    <div
      style={{
        position: "fixed",
        right: 4,
        bottom: 76,
        zIndex: 60,
        background: "#fff8d9",
        color: "#705317",
        fontSize: 10,
        padding: "3px 7px",
        borderRadius: 5,
        pointerEvents: "none",
      }}
    >
      UI fixture / API未接続
    </div>
  </>,
);

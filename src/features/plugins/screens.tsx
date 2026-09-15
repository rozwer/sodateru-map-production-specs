/** Explicit UI inspection routes. No API client or persistent writes. Replace these bindings in UI-PLUGINS-CONNECT. */
import {
  useMemo,
  useSyncExternalStore,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import coffeeAvatar from "../feature-requests/assets/coffee.jpg";
import parkAvatar from "../feature-requests/assets/park.jpg";
import { PluginIconView, type PluginIconChoice } from "./PluginIconView";
import { PluginGlyph } from "./PluginGlyph";
import { PluginControlIcon } from "./views";
import { MapBridge } from "../../app/map-bridge";
import { MapPreview } from "../../map/MapPreview";
import { BridgeMap } from "../../map/MapRenderer";
import type {
  PluginCardModel,
  PluginConditionField,
  PluginPreview,
} from "./view-model";
import { usePreviewPhase } from "./usePreviewPhase";
import {
  PluginConflictView,
  PluginDetailView,
  PluginInstallView,
  PluginManageView,
  PluginRemoveConfirmation,
  PluginStoreView,
  PluginTrialView,
  PluginUpdateView,
} from "./views";
import {
  FeatureRequestEditorView,
  FeatureRequestListView,
  FeatureRequestDeleteView,
} from "../feature-requests/views";
import type {
  FeatureRequestDraft,
  FeatureRequestModel,
} from "../feature-requests/view-model";

import type { ScreenDefinition, ScreenProps } from "../../app/contracts";

type FixtureData = {
  plugins: PluginCardModel[];
  fields: Record<string, PluginConditionField[]>;
  savedFields: Record<string, PluginConditionField[]>;
  previousVersions: Record<string, string>;
  pluginNotice: string;
  icons: Record<string, string>;
  posts: FeatureRequestModel[];
  drafts: Record<string, FeatureRequestDraft>;
  requestTab: "public" | "drafts";
  requestNotice: string;
};
type InspectionStore = { data: FixtureData; listeners: Set<() => void> };
const stores = new Map<string, InspectionStore>();
function useFixture(scopeKey: string) {
  const store = useMemo(() => {
    let found = stores.get(scopeKey);
    if (!found) {
      // The shared App remounts on scope changes. Inspection drafts never cross that boundary.
      stores.clear();
      found = { data: initialFixtureData(), listeners: new Set() };
      stores.set(scopeKey, found);
    }
    return found;
  }, [scopeKey]);
  const subscribe = useMemo(
    () => (listener: () => void) => {
      store.listeners.add(listener);
      return () => {
        store.listeners.delete(listener);
      };
    },
    [store],
  );
  const data = useSyncExternalStore(subscribe, () => store.data);
  const setData: Dispatch<SetStateAction<FixtureData>> = (next) => {
    store.data = typeof next === "function" ? next(store.data) : next;
    for (const listener of store.listeners) listener();
  };
  return { data, setData };
}

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
function Scene({
  after = true,
  extra = false,
  nature = false,
}: {
  after?: boolean;
  extra?: boolean;
  nature?: boolean;
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
      candidates: nature ? [
        { id: "fixture-green-east", coordinates: [136.983, 35.159], label: "東山公園" },
        { id: "fixture-green-north", coordinates: [136.976, 35.169], label: "緑のつながり" },
      ] : [
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
                coordinates: [136.978, 35.166] as [number, number],
                label: "写真スポット",
              },
            ]
          : []),
      ],
    });
    if (nature) return;
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
  }, [bridge, after, extra, nature]);
  return (
    <MapPreview bridge={bridge} label="模擬地点を重ねた本山エリアの実地図" />
  );
}
const preview = (after = true, extra = false, nature = false): PluginPreview => ({
  map: <Scene after={after} extra={extra} nature={nature} />,
  mock: true,
});
function PluginFixture({
  route,
  navigate,
  back,
  active = true,
  scopeKey,
}: {
  route: { pageId: string; params: Record<string, string> };
  navigate: (id: string, params?: Record<string, string>) => void;
  back: () => void;
  active?: boolean;
  scopeKey: string;
}) {
  const { data, setData } = useFixture(scopeKey);
  const [showPreview, setShowPreview] = useState(false);
  const [iconDraft, setIconDraft] = useState<string>();
  const phase = usePreviewPhase(showPreview ? "fixture-trial" : null, active);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<
    "all" | "safety" | "mobility" | "walking"
  >("all");
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string>();
  const [retried, setRetried] = useState(false);
  if (!active) return null;
  const plugin =
    data.plugins.find((item) => item.id === route.params.pluginId) ||
    data.plugins[0]!;
  const fields =
    data.fields[plugin.id] || data.savedFields[plugin.id] || conditionDefaults;
  const intent =
    route.params.intent || (plugin.installed ? "settings" : "install");
  const go = (id: string, params: Record<string, string> = {}) =>
    navigate(id, { pluginId: plugin.id, intent, ...params });
  const modify = (id: string, patch: Partial<PluginCardModel>) =>
    setData((previous) => ({
      ...previous,
      plugins: previous.plugins.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  const status = {
    notice: data.pluginNotice,
    error:
      new URLSearchParams(location.search).has("failure") && !retried
        ? "UI fixture：通信失敗の表示確認です。入力を保持しています。"
        : undefined,
    onRetry: () => setRetried(true),
  };
  const confirmed = (message: string) =>
    setData((previous) => ({
      ...previous,
      pluginNotice: `${message}（UI fixture・未保存）`,
    }));
  const applyVersion = (version: string) => {
    setData((previous) => ({
      ...previous,
      previousVersions: {
        ...previous.previousVersions,
        [plugin.id]: plugin.versionLabel || "v1.2.0",
      },
      plugins: previous.plugins.map((item) =>
        item.id === plugin.id ? { ...item, versionLabel: version } : item,
      ),
      pluginNotice: `${version}に切り替えました（UI fixture・未保存）`,
    }));
    go("plugin-manage");
  };
  if (route.params.action === "remove")
    return (
      <PluginRemoveConfirmation
        name={plugin.name}
        onCancel={back}
        onRemove={() => {
          modify(plugin.id, { installed: false, enabled: false });
          confirmed("機能を地図から外しました");
          go("plugin-manage");
        }}
        {...status}
      />
    );
  switch (route.pageId) {
    case "plugin-icon": {
      const options: PluginIconChoice[] = [
        {
          id: "motorcycle",
          label: "バイク",
          icon: <PluginGlyph kind="bike" />,
        },
        { id: "pin", label: "ピン", icon: <PluginControlIcon name="pin" /> },
        { id: "map", label: "地図", icon: <PluginControlIcon name="map" /> },
      ];
      const selected = iconDraft || data.icons[plugin.id] || "motorcycle";
      return (
        <PluginIconView
          plugin={plugin}
          options={options}
          selected={selected}
          onChange={setIconDraft}
          onCancel={() => {
            setIconDraft(undefined);
            back();
          }}
          onSave={() => {
            setIconDraft(undefined);
            setData((previous) => ({
              ...previous,
              icons: { ...previous.icons, [plugin.id]: selected },
              plugins: previous.plugins.map((item) =>
                item.id === plugin.id
                  ? {
                      ...item,
                      displayIcon: options.find(
                        (option) => option.id === selected,
                      )?.icon,
                    }
                  : item,
              ),
              pluginNotice: "アイコンを変更しました（UI fixture・未保存）",
            }));
            go("plugin-manage");
          }}
          {...status}
        />
      );
    }
    case "plugin-store":
      return (
        <PluginStoreView
          plugins={data.plugins}
          query={query}
          category={category}
          onQuery={setQuery}
          onCategory={setCategory}
          onOpen={(id) => navigate("plugin-detail", { pluginId: id })}
          onManage={() => navigate("plugin-manage")}
          onRequests={() => navigate("feature-requests")}
          {...status}
        />
      );
    case "plugin-detail":
      return (
        <PluginDetailView
          plugin={plugin}
          preview={preview()}
          onTry={() => {
            setData((previous) => ({ ...previous, pluginNotice: "" }));
            go("plugin-trial");
          }}
          {...status}
        />
      );
    case "plugin-trial":
      return (
        <PluginTrialView
          fields={fields}
          onChange={(id, value) => {
            setData((previous) => ({
              ...previous,
              fields: {
                ...previous.fields,
                [plugin.id]: fields.map((field) =>
                  field.id === id ? { ...field, value } : field,
                ),
              },
            }));
            setShowPreview(false);
          }}
          onPreview={() => setShowPreview(true)}
          preview={showPreview ? preview(phase === "after") : undefined}
          phase={phase}
          onContinue={() => go("plugin-install")}
          {...status}
        />
      );
    case "plugin-install":
      return (
        <PluginInstallView
          editing={intent === "settings"}
          conditions={fields.map((field) => ({
            label: field.label,
            value:
              typeof field.value === "boolean"
                ? field.value
                  ? "使う"
                  : "使わない"
                : field.options?.find((option) => option.value === field.value)
                    ?.label || field.value,
          }))}
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
          onCancel={back}
          onInstall={() => {
            const region = fields.find((field) => field.id === "region");
            const regionLabel = region?.options?.find(
              (option) => option.value === region.value,
            )?.label;
            setData((previous) => ({
              ...previous,
              savedFields: { ...previous.savedFields, [plugin.id]: fields },
              previousVersions:
                intent === "update"
                  ? {
                      ...previous.previousVersions,
                      [plugin.id]: plugin.versionLabel || "v1.2.0",
                    }
                  : previous.previousVersions,
              plugins: previous.plugins.map((item) =>
                item.id === plugin.id
                  ? {
                      ...item,
                      installed: true,
                      enabled: plugin.installed ? item.enabled : true,
                      regionLabel: regionLabel || item.regionLabel,
                      ...(intent === "update"
                        ? { versionLabel: "v1.3.0" }
                        : {}),
                    }
                  : item,
              ),
              pluginNotice: `${intent === "settings" ? "条件を変更しました" : "導入内容を反映しました"}（UI fixture・未保存）`,
            }));
            go("plugin-manage");
          }}
          {...status}
        />
      );
    case "plugin-manage":
      return (
        <PluginManageView
          plugins={data.plugins.filter((item) => item.installed)}
          previews={Object.fromEntries(
            data.plugins.map((item) => [item.id, preview(item.enabled, false, item.kind === "nature")]),
          )}
          onToggle={(id, enabled) => modify(id, { enabled })}
          onIcon={(id) => navigate("plugin-icon", { pluginId: id })}
          onMap={(id) => navigate("map", { pluginId: id })}
          onConditions={(id) =>
            navigate("plugin-trial", { pluginId: id, intent: "settings" })
          }
          onUpdate={(id) => navigate("plugin-update", { pluginId: id })}
          onCompanion={() => navigate("companion-settings")}
          onFind={() => navigate("plugin-store")}
          {...status}
        />
      );
    case "plugin-update":
      return (
        <PluginUpdateView
          plugin={plugin}
          current={{
            version: plugin.versionLabel || "v1.2.0",
            preview: preview(),
          }}
          next={
            plugin.versionLabel === "v1.3.0"
              ? undefined
              : { version: "v1.3.0", preview: preview(true, true) }
          }
          changes={
            plugin.versionLabel === "v1.3.0"
              ? []
              : [
                  "本山・東山エリアのおすすめルートを追加",
                  "休憩スポットの情報を最新化（5件追加）",
                  "アイコンデザインを見やすく改善",
                ]
          }
          onPreview={() => go("plugin-trial", { intent: "update" })}
          onUpdate={() => applyVersion("v1.3.0")}
          onRollback={() =>
            applyVersion(data.previousVersions[plugin.id] || "v1.1.0")
          }
          onRemove={() => go("plugin-update", { action: "remove" })}
          canRollback={Boolean(data.previousVersions[plugin.id])}
          {...status}
        />
      );
    case "plugin-conflict":
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
              preview: { ...preview(), legend: [
                { id: "recommended", label: "おすすめの道", color: "#40a75c" },
                { id: "ordinary", label: "一般道", color: "#409cfa" },
                { id: "other", label: "その他の道", color: "#b9c6ce" },
              ] },
            },
            {
              id: "fixture-nature",
              name: "自然マップ",
              kind: "nature",
              description: "緑の多さに応じて、エリアを色分けします。",
              preview: { ...preview(true, false, true), legend: [
                { id: "park", label: "公園・緑地", color: "#4ea651" },
                { id: "connection", label: "緑のつながり", color: "#b2dac7" },
                { id: "other", label: "その他のエリア", color: "#e0d7b8" },
              ] },
            },
          ]}
          selection={selection}
          selecting={selecting}
          onSelect={setSelection}
          onChooseDisable={() => setSelecting(true)}
          onDisable={() => {
            if (!selection) return;
            modify(selection, { enabled: false });
            confirmed("選んだ機能を停止しました");
            go("plugin-manage");
          }}
          onKeep={() => {
            confirmed("併用の選択を反映しました");
            go("plugin-manage");
          }}
          onBack={back}
          {...status}
        />
      );
    default:
      return null;
  }
}
function RequestFixture({
  route,
  navigate,
  back,
  active = true,
  scopeKey,
}: {
  route: { pageId: string; params: Record<string, string> };
  navigate: (id: string, params?: Record<string, string>) => void;
  back: () => void;
  active?: boolean;
  scopeKey: string;
}) {
  const { data, setData } = useFixture(scopeKey);
  if (!active) return null;
  const edit = data.posts.find(
    (item) => item.id === route.params.requestId && item.owned,
  );
  const draftKey =
    route.params.draftId || route.params.requestId || "fixture-direct";
  const value =
    data.drafts[draftKey] ||
    (edit
      ? { name: edit.name, body: edit.body, visibility: edit.visibility }
      : {
          name: "やまぐち",
          body: "雨の日に屋根のある道を選びたい。",
          visibility: "public" as const,
        });
  const open = (source?: FeatureRequestModel) => {
    const draftId = source ? `request-${source.id}` : "fixture-new";
    setData((previous) => ({
      ...previous,
      drafts: {
        ...previous.drafts,
        [draftId]: previous.drafts[draftId] || {
          name: "やまぐち",
          body: source?.body || "",
          visibility: "public",
        },
      },
      requestNotice: "",
    }));
    navigate("feature-request-edit", { draftId });
  };
  const removed = data.posts.find(
    (item) => item.id === route.params.deleteId && item.owned,
  );
  if (removed)
    return (
      <FeatureRequestDeleteView
        body={removed.body}
        onCancel={back}
        onDelete={() => {
          setData((previous) => ({
            ...previous,
            posts: previous.posts.filter((item) => item.id !== removed.id),
            requestNotice: "お願いを削除しました（UI fixture・未保存）",
          }));
          navigate("feature-requests");
        }}
      />
    );
  if (route.pageId === "feature-request-edit")
    return (
      <FeatureRequestEditorView
        value={value}
        onChange={(next) =>
          setData((previous) => ({
            ...previous,
            drafts: { ...previous.drafts, [draftKey]: next },
          }))
        }
        nameLocked={Boolean(edit)}
        editing={Boolean(edit)}
        onSave={(visibility) => {
          const id = edit?.id || crypto.randomUUID();
          const post: FeatureRequestModel = {
            id,
            name: edit?.name || value.name,
            body: value.body,
            visibility,
            timestampLabel: "UI fixture・たった今",
            liked: edit?.liked || false,
            likeCount: edit?.likeCount || 0,
            owned: true,
            tags: edit?.tags || [],
          };
          setData((previous) => ({
            ...previous,
            posts: [post, ...previous.posts.filter((item) => item.id !== id)],
            drafts: Object.fromEntries(Object.entries(previous.drafts).filter(([key]) => key !== draftKey)),
            requestTab: visibility === "private" ? "drafts" : "public",
            requestNotice: `${visibility === "private" ? "下書きを保存しました" : "投稿しました"}（UI fixture・未保存）`,
          }));
          navigate("feature-requests");
        }}
      />
    );
  return (
    <FeatureRequestListView
      items={data.posts.filter((item) =>
        data.requestTab === "public"
          ? item.visibility === "public"
          : item.owned && item.visibility === "private",
      )}
      tab={data.requestTab}
      onTab={(requestTab) =>
        setData((previous) => ({ ...previous, requestTab }))
      }
      onWrite={() => open()}
      onLike={(id) =>
        setData((previous) => ({
          ...previous,
          posts: previous.posts.map((item) =>
            item.id === id
              ? {
                  ...item,
                  liked: !item.liked,
                  likeCount: item.likeCount + (item.liked ? -1 : 1),
                }
              : item,
          ),
        }))
      }
      onEdit={(requestId) => navigate("feature-request-edit", { requestId })}
      onDelete={(deleteId) => navigate("feature-requests", { deleteId })}
      onRequest={(id) => open(data.posts.find((item) => item.id === id))}
      onDismissNotice={() =>
        setData((previous) => ({ ...previous, requestNotice: "" }))
      }
      notice={data.requestNotice}
    />
  );
}
export function InspectionMainMap({ bridge }: { bridge: MapBridge }) {
  const { data } = useFixture(bridge.getSnapshot().scopeKey);
  useEffect(() => {
    for (const plugin of data.plugins) {
      const owner = `plugin:${plugin.id}` as const;
      bridge.clear(owner);
      if (!plugin.installed || !plugin.enabled) continue;
      bridge.showCandidates(owner, {
        resultId: "ui-fixture-only",
        candidates: [
          {
            id: plugin.id,
            coordinates: [136.9758, 35.163],
            label: `${plugin.name}（模擬）`,
          },
        ],
      });
    }
  }, [bridge, data.plugins]);
  return <BridgeMap bridge={bridge} label="UI fixture：導入状態の模擬表示" />;
}
const titles: Record<string, string> = {
  "plugin-icon": "アイコンを変更",
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
export const screens: ScreenDefinition[] = Object.entries(titles).map(
  ([id, title]) => ({
    id,
    title,
    component: function InspectionScreen(props: ScreenProps) {
      const View = id.startsWith("feature-request")
        ? RequestFixture
        : PluginFixture;
      if (props.active === false) return null;
      return (
        <>
          <p className="plugin-notice plugin-inspection-notice" role="status">
            UI検査・API未接続。操作は再読込で初期化されます。
          </p>
          <View {...props} />
        </>
      );
    },
    layout: {
      // These nine approved references show standalone content, without an outer map.
      presentation: id === "plugin-icon" ? "panel" as const : "fullscreen" as const,
      header: "back" as const,
      bottomNav: ["plugin-store", "feature-requests"].includes(id),
      background: "soft" as const,
    },
  }),
);
function initialFixtureData(): FixtureData {
  return {
    plugins: location.hash.startsWith("#/plugin-conflict") ? [...fixturePlugins, {
      id: "fixture-nature", name: "自然マップ", kind: "nature", category: "walking",
      description: "公園・緑地と緑のつながりを確認できます。", regionLabel: "本山・東山エリア",
      installed: true, enabled: true, permissions: [], demo: true, versionLabel: "v1.0.0",
    }] : fixturePlugins,
    fields: {},
    savedFields: {},
    previousVersions: { "fixture-bike": "v1.1.0" },
    pluginNotice: "",
    icons: {},
    posts: [
      ...fixturePosts.filter(post => post.id !== "fixture-own" || new URLSearchParams(location.search).has("submitted")),
      { ...fixturePosts[0]!, id: "fixture-draft", visibility: "private", body: "ベビーカーで休憩できる場所を地図で探したい。", timestampLabel: "2024/5/12 10:50" },
    ],
    drafts: {},
    requestTab: "public",
    requestNotice: new URLSearchParams(location.search).has("submitted")
      ? "投稿しました（UI fixture・未保存）"
      : "",
  };
}

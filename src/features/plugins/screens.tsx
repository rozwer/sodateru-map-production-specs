/** Bike, pilgrimage and request bindings are explicit unsaved UI fixtures; disaster settings use the dedicated API. */
import {
  useMemo,
  useContext,
  useSyncExternalStore,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createReferencePlugins, createReferencePosts, createReferenceConditions, createReferenceLayers, createReferenceTrial, referencePhotos, referenceVersions } from "./reference-data";
import { GrowPreview } from "./grow/GrowPreview";
import { useDisasterData } from "../disaster/data";
import { disasterScreens } from "../disaster/screens";
import { disasterMapDisplay } from "../disaster/ui/map-state";
import { api } from "../../app/api";
import { PluginIconView, type PluginIconChoice } from "./PluginIconView";
import { PluginGlyph } from "./PluginGlyph";
import { PluginControlIcon } from "./views";
import { MapBridge } from "../../app/map-bridge";
import { MapBridgeContext } from "../../app/useMapBridge";
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

const preview = (after = true, extra = false, nature = false, pluginId = "fixture-bike", region = "motoyama"): PluginPreview => ({
  map: <GrowPreview pluginId={nature ? "fixture-nature" : pluginId} after={after} extra={extra} region={region} />,
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
  const mainMap = useContext(MapBridgeContext);
  const disaster = useDisasterData(scopeKey);
  const [disasterMutation, setDisasterMutation] = useState(false);
  const [disasterError, setDisasterError] = useState<string>();
  useEffect(() => {
    if (active && route.params.pluginId === "fixture-disaster" && ["plugin-trial", "plugin-install"].includes(route.pageId)) navigate("disaster-map", { pluginId: "fixture-disaster" });
  }, [active, route.pageId, route.params.pluginId]);
  const displayPlugins = data.plugins.map(item => item.kind === "disaster" ? {
    ...item, installed: Boolean(disaster.view?.settings), enabled: disaster.view?.settings?.enabled ?? false,
    versionLabel: disaster.view?.settings ? `v${disaster.view.settings.pluginVersion}` : item.versionLabel,
    displayIcon: disaster.view?.settings?.icon === "map" ? <PluginControlIcon name="map"/> : disaster.view?.settings?.icon === "pin" ? <PluginControlIcon name="pin"/> : item.displayIcon,
  } : item);
  useEffect(() => {
    if (!mainMap) return;
    for (const item of data.plugins) {
      const owner = `plugin:grow-fixture-${item.id}` as const;
      mainMap.clear(owner);
      if (!scopeKey.startsWith("demo:") || !item.installed || !item.enabled || item.kind === "disaster") continue;
      const trial = createReferenceTrial(item.id);
      const candidates = trial.features.flatMap(feature => feature.geometry.type === "Point" ? [{ id: feature.id, coordinates: feature.geometry.coordinates, label: feature.properties.label }] : []);
      if (item.kind === "bike" && item.versionLabel === referenceVersions.bike.next) candidates.push({ id: "fixture-photo", coordinates: [136.978,35.166], label: "更新後の写真スポット（模擬）" });
      mainMap.showCandidates(owner, { resultId: "grow-ui-mock-unsaved", candidates });
      const coordinates = trial.features.flatMap(feature => feature.geometry.type === "LineString" ? feature.geometry.coordinates : []);
      if (coordinates.length) mainMap.showRoute(owner, { previewId: "grow-ui-mock-unsaved", geometry: { type: "LineString", coordinates }, waypoints: [] });
    }
  }, [mainMap, data.plugins, scopeKey]);
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
    displayPlugins.find((item) => item.id === route.params.pluginId) ||
    displayPlugins[0]!;
  const fields =
    data.fields[plugin.id] || data.savedFields[plugin.id] || createReferenceConditions(plugin.kind);
  const region = String(fields.find(field => field.id === "region")?.value || "motoyama");
  const appPreview = (after = true, extra = plugin.kind === "bike" && plugin.versionLabel === referenceVersions.bike.next): PluginPreview => plugin.kind === "disaster" ? {
    map: <div className="plugin-disaster-entry"><PluginGlyph kind="disaster"/><strong>避難先・想定リスク・時点のある地域情報</strong><button type="button" className="plugin-button" onClick={() => navigate("disaster-map", { pluginId: plugin.id, intent: "trial" })}>防災マップを開く</button></div>,
    mock: true,
  } : preview(after, extra, plugin.kind === "nature", plugin.id, region);
  const nextVersion = plugin.kind === "bike" && plugin.versionLabel !== referenceVersions.bike.next ? referenceVersions.bike.next : undefined;
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
    busyLabel: disasterMutation ? "保存しています…" : "導入状態を読み込み中…",
    busy: (plugin.kind === "disaster" || route.pageId === "plugin-manage") && (disaster.busy || disasterMutation),
    notice: data.pluginNotice,
    error:
      new URLSearchParams(location.search).has("failure") && !retried
        ? "UI fixture：通信失敗の表示確認です。入力を保持しています。"
        : disasterError || (route.pageId === "plugin-manage" ? disaster.error || undefined : undefined),
    onRetry: () => { setRetried(true); setDisasterError(undefined); if (plugin.kind === "disaster" || route.pageId === "plugin-manage") void disaster.load(); },
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
        onRemove={async () => {
          if (plugin.kind === "disaster") {
            const version = disaster.view?.settings?.version;
            if (!version) return;
            setDisasterMutation(true); setDisasterError(undefined);
            try {
              await api.request("deletePluginSettingsPluginId", { path: { pluginId: "disaster" }, version });
              if (mainMap) disasterMapDisplay(mainMap).clear();
              await disaster.load();
              go("plugin-manage");
            } catch (error) { setDisasterError(error instanceof Error ? error.message : "防災機能を外せませんでした。"); }
            finally { setDisasterMutation(false); }
            return;
          }
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
          id: plugin.kind === "disaster" ? "shield" : plugin.kind === "pilgrimage" ? "star" : "motorcycle",
          label: plugin.name,
          icon: <PluginGlyph kind={plugin.kind} />,
        },
        { id: "pin", label: "ピン", icon: <PluginControlIcon name="pin" /> },
        { id: "map", label: "地図", icon: <PluginControlIcon name="map" /> },
      ];
      const selected = iconDraft || (plugin.kind === "disaster" ? disaster.view?.settings?.icon : data.icons[plugin.id]) || options[0]!.id;
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
          onSave={async () => {
            if (plugin.kind === "disaster") {
              const version = disaster.view?.settings?.version;
              if (!version) return;
              setDisasterMutation(true); setDisasterError(undefined);
              try {
                await api.request("patchPluginSettingsPluginId", { path: { pluginId: "disaster" }, body: { icon: selected as "shield" | "pin" | "map" }, version });
                await disaster.load();
                setIconDraft(undefined);
                go("plugin-manage");
              } catch (error) { setDisasterError(error instanceof Error ? error.message : "アイコンを変更できませんでした。"); }
              finally { setDisasterMutation(false); }
              return;
            }
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
          plugins={displayPlugins}
          guideUrl="http://127.0.0.1:5284/guide"
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
          preview={appPreview()}
          onTry={() => {
            setData((previous) => ({ ...previous, pluginNotice: "" }));
            if (plugin.kind === "disaster") navigate("disaster-map", { pluginId: plugin.id, intent: "trial" });
            else go("plugin-trial");
          }}
          {...status}
        />
      );
    case "plugin-trial":
      return (
        <PluginTrialView
          plugin={plugin}
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
          preview={showPreview ? appPreview(phase === "after", intent === "update") : undefined}
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
          preview={{ ...appPreview(), legend: plugin.kind === "bike" ? [
            { id: "pleasant", label: "快適な道", color: "#11b586" },
            { id: "caution", label: "注意が必要", color: "#ed7a28" },
            { id: "unknown", label: "未確認", color: "#969fa5", dashed: true },
          ] : undefined }}
          layers={plugin.kind === "disaster" ? [{ id: "disaster", name: "防災の専用地図", description: "避難先・想定リスク・地域情報を専用画面で確認します。デモと実情報の区別、出典と時点を表示します。" }] : createReferenceLayers(plugin.kind)}
          unknownNote={plugin.kind === "bike" ? "データが不足している道路は「未確認」として表示されます。実際の通行可否は確認してください。" : undefined}
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
                        ? { versionLabel: nextVersion || item.versionLabel }
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
          plugins={displayPlugins.filter((item) => item.installed)}
          previews={Object.fromEntries(
            displayPlugins.map((item) => [item.id, item.kind === "pilgrimage" ? {
              map: <img className="plugin-sample-photo" src={referencePhotos.shrine.url} alt={referencePhotos.shrine.alt} />,
              mock: true,
            } : item.kind === "disaster" ? { map: <div className="plugin-disaster-entry"><PluginGlyph kind="disaster"/><strong>避難先・想定リスクを確認</strong></div>, mock: true } : preview(item.enabled, item.kind === "bike" && item.versionLabel === referenceVersions.bike.next, item.kind === "nature", item.id, String(data.savedFields[item.id]?.find(field => field.id === "region")?.value || "motoyama"))]),
          )}
          onToggle={(id, enabled) => { if (id === "fixture-disaster") { if (mainMap) disasterMapDisplay(mainMap).clear(); void disaster.setEnabled(enabled); } else modify(id, { enabled }); }}
          onIcon={(id) => navigate("plugin-icon", { pluginId: id })}
          onMap={(id) => {
            if (id !== "fixture-disaster") {
              const east = data.savedFields[id]?.find(field => field.id === "region")?.value === "higashiyama";
              mainMap?.focus(`plugin:grow-fixture-${id}`, { center: east ? [136.9817, 35.1585] : [136.973, 35.163], zoom: east ? 14.2 : 13.3 });
            }
            navigate(id === "fixture-disaster" ? "disaster-map" : "map", { pluginId: id });
          }}
          onConditions={(id) => navigate(id === "fixture-disaster" ? "disaster-map" : "plugin-trial", { pluginId: id, intent: "settings" })}
          onUpdate={(id) => navigate(id === "fixture-disaster" ? "disaster-map" : "plugin-update", { pluginId: id })}
          onCompanion={() => navigate("companion-settings")}
          onFind={() => navigate("plugin-store")}
          onRemove={(id) => navigate("plugin-update", { pluginId: id, action: "remove" })}
          onRequests={() => navigate("feature-requests")}
          {...status}
        />
      );
    case "plugin-update":
      return (
        <PluginUpdateView
          plugin={plugin}
          current={{
            version: plugin.versionLabel || "v1.2.0",
            preview: appPreview(),
          }}
          next={nextVersion ? { version: nextVersion, preview: appPreview(true, true) } : undefined}
          changes={nextVersion ? referenceVersions.bike.changeLog : []}
          onPreview={() => go("plugin-trial", { intent: "update" })}
          onUpdate={() => { if (nextVersion) applyVersion(nextVersion); }}
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
              preview: { ...preview(true, false, false, "fixture-bike-conflict"), legend: [
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
  "plugin-trial": "拡張機能を試す",
  "plugin-install": "導入前の確認",
  "plugin-manage": "マップ機能の管理",
  "plugin-update": "拡張機能の更新",
  "plugin-conflict": "変更が重なる場合",
  "feature-requests": "育てる地図",
  "feature-request-edit": "お願いを書く",
};
export const screens: ScreenDefinition[] = Object.entries(titles).map<ScreenDefinition>(
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
            バイク・聖地・お願いは模擬操作（未保存）。防災は専用画面で設定を保存します。
          </p>
          <View {...props} />
        </>
      );
    },
    layout: {
      // These nine approved references show standalone content, without an outer map.
      presentation: id === "plugin-icon" ? "panel" as const : "fullscreen" as const,
      header: id === "plugin-store" ? "none" as const : "back" as const,
      bottomNav: ["plugin-store", "feature-requests"].includes(id),
      background: "soft" as const,
    },
  }),
).concat(disasterScreens);
function initialFixtureData(): FixtureData {
  const fixturePlugins = createReferencePlugins(location.hash.startsWith("#/plugin-store") ? "store" : "manage");
  const fixturePosts = createReferencePosts();
  return {
    plugins: location.hash.startsWith("#/plugin-conflict") ? [...fixturePlugins, {
      id: "fixture-nature", name: "自然マップ", kind: "nature", category: "walking",
      description: "公園・緑地と緑のつながりを確認できます。", regionLabel: "本山・東山エリア",
      installed: true, enabled: true, permissions: [], demo: true, versionLabel: "v1.0.0",
    }] : fixturePlugins,
    fields: {},
    savedFields: {},
    previousVersions: fixturePlugins.find(plugin => plugin.id === "fixture-bike")?.installed ? { "fixture-bike": referenceVersions.bike.previous } : {},
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

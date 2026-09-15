import React, { useEffect, useState, type ComponentType } from "react";
import type { ScreenDefinition, ScreenProps } from "../../app/contracts";
import { useMapBridge } from "../../app/useMapBridge";
import type { MapBridge } from "../../app/map-bridge";
import { api } from "../../app/api";
import { DiaryScreen } from "./DiaryScreen";
import { QuestionsScreen, HistoryScreen } from "./QuestionsScreen";
import { CompareScreen } from "./CompareScreen";
import { MemoScreen } from "./MemoScreen";
import { SelfHomeView, type RecordCardData, type Notice } from "./views";
import { deviceTimeZone, errorNotice, recordCard, today } from "./records";
const mapModules = import.meta.glob<{
  MapPreview: ComponentType<{
    bridge: MapBridge;
    label?: string;
    className?: string;
  }>;
}>("../../map/MapPreview.tsx", { eager: true });
const MapPreview = Object.values(mapModules)[0]?.MapPreview;
function SelfHomeScreen({
  navigate,
  route,
  scopeKey,
  active = true,
}: ScreenProps) {
  const bridge = useMapBridge();
  const [recent, setRecent] = useState<RecordCardData>();
  const [notice, setNotice] = useState<Notice>();
  const timeZone = route.params.timeZone || deviceTimeZone();
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    void (async () => {
      try {
        const day = (
          await api.request("getReflectionDaysDate", {
            path: { date: today(timeZone) },
            query: { timeZone },
            signal: c.signal,
          })
        ).data;
        const records = await api.request("getRecords", {
          query: { from: day.from, to: day.to, kind: "experience", limit: 1 },
          signal: c.signal,
        });
        const latest = records.items[0];
        setRecent(
          latest ? await recordCard(latest, timeZone, c.signal) : undefined,
        );
      } catch (error) {
        if (!c.signal.aborted) setNotice(errorNotice(error));
      }
    })();
    return () => c.abort();
  }, [scopeKey, timeZone, active]);
  return (
    <SelfHomeView
      map={
        MapPreview && active ? (
          <MapPreview
            bridge={bridge}
            label="今日の地図"
            className="rf-map-preview"
          />
        ) : (
          <p className="rf-muted">地図を表示できません</p>
        )
      }
      miniMap={
        MapPreview && active ? (
          <MapPreview
            bridge={bridge}
            label="わたしの地図のプレビュー"
            className="rf-mini-map"
          />
        ) : (
          <p className="rf-muted">地図を表示できません</p>
        )
      }
      recent={recent}
      navigate={(page) => navigate(page, { date: today(timeZone), timeZone })}
      notice={notice}
    />
  );
}
const definitions: ScreenDefinition[] = [
  { id: "self-home", title: "自分を知る", component: SelfHomeScreen },
  { id: "diary", title: "日記", component: DiaryScreen },
  {
    id: "reflection-question",
    title: "今日の軌跡",
    component: QuestionsScreen,
  },
  {
    id: "reflection-history",
    title: "振り返りの記録",
    component: HistoryScreen,
  },
  {
    id: "experience-compare",
    title: "2つの体験を比べる",
    component: CompareScreen,
  },
  { id: "memo-edit", title: "メモを編集", component: MemoScreen },
];

export const screens: ScreenDefinition[] = definitions.map((screen) => ({
  ...screen,
  layout: {
    header: screen.id === "self-home" ? "none" : "back",
    contentPadding: "none",
    bottomNav: screen.id === "self-home",
    background: screen.id === "experience-compare" ? "surface" : "soft",
  },
}));

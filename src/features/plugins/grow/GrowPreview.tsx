import { useEffect, useMemo, useRef, useState } from "react";
import { MapBridge } from "../../../app/map-bridge";
import { MapPreview } from "../../../map/MapPreview";
import { createReferenceTrial } from "../reference-data";

/** Fixed, non-interactive excerpt: geographic overlays share the real map's Mercator camera. */
export function GrowPreview({ pluginId, after = true, extra = false, region = "motoyama" }: {
  pluginId: string; after?: boolean; extra?: boolean; region?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 350, height: 230 });
  const [bridge] = useState(() => new MapBridge(`grow-preview-${crypto.randomUUID()}`));
  const east = region === "higashiyama";
  const center: [number, number] = east ? [136.9817, 35.1585] : [136.973, 35.163];
  const zoom = east ? 14.2 : 13.3;
  const trial = useMemo(() => createReferenceTrial(pluginId === "fixture-bike-conflict" ? "fixture-bike" : pluginId, after ? "after" : "before"), [pluginId, after]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    bridge.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    bridge.setView({ lens: "physical", dimension: "2d", following: false });
    bridge.setCamera({ longitude: center[0], latitude: center[1], zoom, bearing: 0, pitch: 0 });
  }, [bridge, east]);
  useEffect(() => () => bridge.dispose(), [bridge]);
  const world = (point: number[]) => {
    const sin = Math.sin(point[1]! * Math.PI / 180);
    const scale = 512 * 2 ** zoom;
    return [(point[0]! + 180) / 360 * scale, (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale];
  };
  const origin = world(center);
  const project = (point: number[]) => {
    const pos = world(point);
    return [size.width / 2 + pos[0]! - origin[0]!, size.height / 2 + pos[1]! - origin[1]!];
  };
  return <div ref={container} className="grow-preview" data-phase={after ? "after" : "before"} data-region={region}>
    <MapPreview bridge={bridge} label={`${east ? "東山公園" : "本山"}エリアの実地図・重ねる情報は模擬`} />
    <svg className="grow-preview-overlays" viewBox={`0 0 ${size.width} ${size.height}`} aria-label="模擬情報の地図表示">
      {after && pluginId === "fixture-nature" && <g fill="#5dad64" fillOpacity=".42" stroke="#3f9955" strokeWidth="2">
        {[[[136.978,35.162],[136.986,35.162],[136.988,35.155],[136.98,35.155]],[[136.967,35.172],[136.974,35.171],[136.975,35.167],[136.969,35.167]]].map((polygon,i) => <polygon key={i} fill={i === 0 ? "#4ea651" : "#b2dac7"} points={polygon.map(p => project(p).join(",")).join(" ")}><title>緑地の塗り分け例（模擬）</title></polygon>)}
      </g>}
      {trial.features.map(feature => {
        const color = pluginId === "fixture-bike-conflict" ? (({ pleasant: "#40a75c", caution: "#409cfa", unknown: "#b9c6ce" } as Record<string, string>)[feature.properties.legendId] || "#078bc8") : trial.legends.find(item => item.id === feature.properties.legendId)?.color || "#0e9da3";
        if (feature.geometry.type === "LineString") return <polyline key={feature.id} points={feature.geometry.coordinates.map(p => project(p).join(",")).join(" ")} stroke={color} strokeWidth="5" strokeDasharray={feature.properties.legendId === "unknown" ? "7 5" : undefined} strokeLinecap="round" strokeLinejoin="round" fill="none"><title>{feature.properties.label}</title></polyline>;
        if (feature.geometry.type !== "Point") return null;
        const [x,y] = project(feature.geometry.coordinates);
        return <g key={feature.id} transform={`translate(${x},${y})`}><title>{feature.properties.label}</title><circle r="15" fill={color} stroke="white" strokeWidth="3"/><text textAnchor="middle" dy="5" fill="white" fontSize="15">{feature.properties.kind === "pilgrimage" ? "★" : feature.id.includes("coffee") ? "☕" : "♧"}</text></g>;
      })}
      {after && extra && <g transform={`translate(${project([136.978,35.166]).join(",")})`}><title>更新後に追加される写真スポット（模擬）</title><circle r="15" fill="#f3962c" stroke="white" strokeWidth="3"/><text textAnchor="middle" dy="5" fill="white">▣</text></g>}
    </svg>
  </div>;
}

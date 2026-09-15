import type { MapBridge } from '../app/map-bridge';
import { BridgeMap } from './MapRenderer';
import type { ScenePadding } from './MapScene';
export function MapPreview({ bridge, label, className = '', interactive = false, padding, center, radiusM }: { bridge: MapBridge; label?: string; className?: string; interactive?: boolean; padding?: ScenePadding; center?: [number, number]; radiusM?: number }) {
  return <div className={`map-preview ${className}`}><BridgeMap bridge={bridge} interactive={interactive} preview label={label} padding={padding} radius={center && radiusM ? { center, meters: radiusM } : undefined}/></div>;
}

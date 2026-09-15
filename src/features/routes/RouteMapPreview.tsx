import type { ComponentType } from 'react';
import type { MapBridge, MapPadding } from '../../app/map-bridge';
import { routeMessages as m } from './messages';

interface PreviewProps {
  bridge: MapBridge;
  label: string;
  interactive?: boolean;
  padding?: MapPadding;
}
// Match the application registration boundary while UI-MAP is integrated independently.
const modules = import.meta.glob<{ MapPreview: ComponentType<PreviewProps> }>('../../map/MapPreview.tsx', { eager: true });
const Preview = Object.values(modules)[0]?.MapPreview;
export function RouteMapPreview(props: PreviewProps) {
  return Preview ? <Preview {...props}/> : <p className="routes-map-pending" role="status">{m.mapUnavailable}</p>;
}

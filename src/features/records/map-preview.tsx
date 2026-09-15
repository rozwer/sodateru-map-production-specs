import type { ComponentType } from 'react';
import type { MapBridge, MapPadding } from '../../app/map-bridge';
import type { GrowthItem } from '../../../packages/api-client/index';

type PreviewProps={bridge:MapBridge;label:string;interactive?:boolean;className?:string;padding?:MapPadding};
// BASE also discovers providers through glob. An absent provider must not crash record input.
const previews=import.meta.glob<{MapPreview:ComponentType<PreviewProps>}>('../../map/MapPreview.tsx',{eager:true});
const displays=import.meta.glob<{showGrowth:(bridge:MapBridge,items:GrowthItem[])=>void}>('../../map/display-state.ts',{eager:true});
export function RecordMapPreview(props:PreviewProps) {
 const Preview=Object.values(previews)[0]?.MapPreview;
 return Preview?<Preview {...props} className={`records-map-preview ${props.className??''}`}/>:<div className="records-map-pending" role="status">地図表示をまだ利用できません。記録の入力は続けられます。</div>;
}
export function showRecordGrowth(bridge:MapBridge,items:GrowthItem[]) {
 const show=Object.values(displays)[0]?.showGrowth;
 show?.(bridge,items);
 return Boolean(show);
}

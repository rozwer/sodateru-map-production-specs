import type { DisasterSettings, LayerId, Bounds } from './types.ts';
import { CommonError } from '../../core/errors.ts';
export const pluginId = 'disaster';
export const JAPAN: Bounds = [122, 20, 154, 46];
export const layerIds: LayerId[] = ['flood-hazard', 'terrain', 'rainfall'];
export const settingsSchema = {
  type: 'object', title: '防災情報の設定', additionalProperties: false, required: ['region', 'layerIds'],
  properties: {
    region: {title:'対象地域',type:'object',additionalProperties:false,required:['id','bounds'],properties:{
      id:{title:'地域名・識別子',type:'string',minLength:1,maxLength:200},
      bounds:{title:'経緯度範囲 [西,南,東,北]',type:'array',minItems:4,maxItems:4,items:{type:'number',minimum:-180,maximum:180}},
    }},
    layerIds: {title:'表示する情報',type:'array',minItems:1,maxItems:3,uniqueItems:true,items:{enum:layerIds}},
  },
};
export function validateSettings(value: unknown): DisasterSettings {
  const s = value as DisasterSettings;
  const b = s?.region?.bounds;
  if (!s || Object.keys(s).some(k => !['region','layerIds'].includes(k)) ||
      !s.region || Object.keys(s.region).some(k => !['id','bounds'].includes(k)) ||
      typeof s.region.id !== 'string' || !s.region.id.trim() || s.region.id.length > 200 ||
      !Array.isArray(b) || b.length !== 4 || !b.every(Number.isFinite) ||
      b[0] < -180 || b[2] > 180 || b[1] < -85 || b[3] > 85 || b[0] >= b[2] || b[1] >= b[3] ||
      !Array.isArray(s.layerIds) || !s.layerIds.length || s.layerIds.length > 3 ||
      new Set(s.layerIds).size !== s.layerIds.length || !s.layerIds.every(id => layerIds.includes(id))) {
    throw new CommonError('VALIDATION_FAILED','対象地域の経緯度範囲と防災レイヤーを確認してください。');
  }
  return structuredClone(s);
}
export const defaultSettings: DisasterSettings = {region:{id:'江戸川周辺',bounds:[139.84,35.68,139.92,35.76]},layerIds:[...layerIds]};
export const definitions = {
  'flood-hazard': {
    kind:'hazard',label:'洪水浸水想定（想定最大規模）',unit:'m',
    sourceUrl:'https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html',
    attribution:'国土交通省各地方整備局等・都道府県／国土地理院 重ねるハザードマップ',
    legend:{url:'https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html',description:'提供元の洪水浸水想定区域（想定最大規模）の浸水深凡例を参照'},
    meaning:'想定条件に基づくハザード。現在の浸水や避難の可否を示す観測ではありません。未着色は安全や浸水深0mを意味しません。',
    template:'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png',
  },
  terrain: {
    kind:'terrain',label:'地形（陰影起伏図）',unit:null,
    sourceUrl:'https://maps.gsi.go.jp/development/ichiran.html#hillshademap',
    attribution:'国土地理院 地理院タイル',
    legend:{url:'https://maps.gsi.go.jp/development/ichiran.html#hillshademap',description:'陰影は標高モデルから表現した起伏。色から浸水深や降水量は求めません。'},
    meaning:'標高モデル由来の地形表現。現在の水面や浸水深は計算しません。',
    template:'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png',
  },
  rainfall: {
    kind:'observation',label:'降水強度（気象庁の解析時点）',unit:'mm/h',
    sourceUrl:'https://www.jma.go.jp/bosai/nowc/',attribution:'気象庁 高解像度降水ナウキャスト',
    legend:{url:'https://www.jma.go.jp/bosai/nowc/images/legend_jp_normal_hrpns.svg',description:'降水強度mm/h。気象庁の凡例を参照。noDataMaskを重ねて欠測を表示し、透明部分を安全と判定しません。'},
    meaning:'basetimeとvalidtimeが一致する降水解析のみ。積算雨量・将来予測・現在の浸水深ではありません。',
    template:'',
  },
} as const;

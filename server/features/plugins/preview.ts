import { PluginError, type TrialGeometry, type TrialPreview } from './types.ts';
import { validatePluginBody } from './validation.ts';
export function validateTrialPreview(input: unknown): TrialPreview {
  const preview=validatePluginBody<TrialPreview>('PluginTrialPreview',input);
  const legends=new Set(preview.legends.map(x=>x.id)), sources=new Set(preview.sources.map(x=>x.id));
  if (legends.size!==preview.legends.length || sources.size!==preview.sources.length || new Set(preview.features.map(x=>x.id)).size!==preview.features.length) throw new PluginError(422,'VALIDATION_FAILED','試用データの識別子が重複しています');
  for (const feature of preview.features) {
    if (!legends.has(feature.properties.legendId) || feature.properties.sourceIds.some(id=>!sources.has(id))) throw new PluginError(422,'VALIDATION_FAILED','試用データの凡例または出典がありません');
    const g:TrialGeometry=feature.geometry;
    const rings=g.type==='Polygon' ? g.coordinates : g.type==='MultiPolygon' ? g.coordinates.flat() : [];
    if (rings.some(r=>r[0]![0]!==r.at(-1)![0] || r[0]![1]!==r.at(-1)![1])) throw new PluginError(422,'VALIDATION_FAILED','試用領域の外周が閉じていません');
  }
  return structuredClone(preview);
}

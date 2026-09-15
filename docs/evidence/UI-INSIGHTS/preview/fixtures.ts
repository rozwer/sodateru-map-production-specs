import type { EvidenceRecordView, InsightView } from '../../../../src/features/insights/types';
import type { ThemeView } from '../../../../src/features/themes/types';

// Independent photographs, never cropped from the reference screen images.
export const photos = {
  coffee: 'https://images.unsplash.com/photo-1530632308350-e96d55f00e4a?auto=format&fit=crop&w=600&q=85',
  books: 'https://images.unsplash.com/photo-1588580000645-4562a6d2c839?auto=format&fit=crop&w=600&q=85',
  park: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=85',
};
export const records: EvidenceRecordView[] = [
  { id: 'fixture-coffee', version: 1, title: 'カフェでひと息', dateLabel: '10月8日（水）10:24', placeLabel: '本山', quote: '窓際の席で、コーヒーを飲みながら読書。とても落ち着けた。', photoUrl: photos.coffee, photoMediaId: 'fixture-photo-coffee', photos: [{id:'fixture-photo-coffee',url:photos.coffee}], icon: 'coffee', sourceState: 'current' },
  { id: 'fixture-books', version: 1, title: '図書館で勉強', dateLabel: '10月10日（金）14:15', placeLabel: '本山', quote: '静かな閲覧室で調べもの。集中して取り組めた。', photoUrl: photos.books, photoMediaId: 'fixture-photo-books', photos: [{id:'fixture-photo-books',url:photos.books}], icon: 'book', sourceState: 'current' },
  { id: 'fixture-park', version: 1, title: '緑の中を散歩', dateLabel: '10月11日（土）15:30', placeLabel: '東山公園', quote: '園内をゆっくり歩いた。リフレッシュできて、すっきりした。', photoUrl: photos.park, photoMediaId: 'fixture-photo-park', photos: [{id:'fixture-photo-park',url:photos.park}], icon: 'tree', sourceState: 'current' },
];
export const insight: InsightView = {
  id: 'fixture-analysis', version: 1, title: '静かな場所での時間が多かった',
  summary: '今週の記録の中で、静かなカフェや図書館など\n落ち着いて過ごせる場所での時間が多く見られました。',
  periodLabel: '今週（10月7日〜10月13日）', provisional: true, icon: 'leaf',
  axes: [
    { key: 'fixture-nature', label: '自然', numerator: 2, denominator: 3, value: 2 / 3, unknownDays: 4 },
    { key: 'fixture-books', label: '本', numerator: 3, denominator: 5, value: .6, unknownDays: 2 },
    { key: 'fixture-cafe', label: 'カフェ', numerator: 4, denominator: 5, value: .8, unknownDays: 2 },
    { key: 'fixture-walk', label: '散歩', numerator: 2, denominator: 3, value: 2 / 3, unknownDays: 4 },
    { key: 'fixture-people', label: '人との時間', numerator: 2, denominator: 3, value: 2 / 3, unknownDays: 4 },
  ], records: records.slice(0, 2), alternatives: [{ id: 'fixture-alternative', title: '混雑を避けたかった可能性', text: '静かな場所を選んだのは、落ち着きたい気持ちだけでなく、混雑を避けたかった可能性も考えられます。' }],
  unknown: ['今週は記録のない日もあり、その日の過ごし方は分かりません。継続して記録することで、より正確に傾向を把握できます。'], review: null, reviewNote: '',
};
export const diagnosis: InsightView = { ...insight, title: '穏やかな寄り道探検家', summary: '新しい場所と、落ち着ける\n時間を大切にした一週間。', records: records.map((record, index) => ({ ...record, dateLabel: ['4月16日（水）', '4月18日（金）', '4月20日（日）'][index]!, title: ['カフェで過ごした', '本を見つけた', '公園を歩いた'][index]!, placeLabel: ['本山・コーヒーショップ', '本山・書店', '平和公園'][index]! })) };
export const themes: ThemeView[] = [
  { id: 'fixture-alone', version: 1, name: 'ひとり時間', description: 'ひとりでゆっくり過ごせる\nカフェや場所を見つけたい。', color: 'teal', photoUrl: photos.coffee, photoLabel: 'カフェでひと息', placeLabel: '本山エリア', recordIds: records.map(record => record.id), icon: 'coffee' },
  { id: 'fixture-books', version: 1, name: '本と出会う', description: '落ち着いて本が読める場所や\n本にまつわるスポットを集めたい。', color: 'orange', photoUrl: photos.books, photoLabel: '静かな図書館', placeLabel: '覚王山エリア', recordIds: ['fixture-books'], icon: 'book' },
  { id: 'fixture-nature', version: 1, name: '自然', description: '緑にふれられる公園や、\n気持ちのよい散歩コースを歩きたい。', color: 'green', photoUrl: photos.park, photoLabel: '緑の中を散歩', placeLabel: '東山公園エリア', recordIds: ['fixture-park'], icon: 'tree' },
];

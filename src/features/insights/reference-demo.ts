import type { InsightView } from './types';
import coffee from './assets/coffee.jpg';
import books from './assets/books.jpg';
import park from './assets/park.jpg';

/** User-requested reference reproduction, confined to the visibly marked demo. */
export function referenceDemo(view: InsightView): InsightView {
  const samples = [
    { title: 'カフェで過ごした', dateLabel: '4月16日（水）', placeLabel: '本山・コーヒーショップ', photoUrl: coffee, icon: 'coffee' as const },
    { title: '本を見つけた', dateLabel: '4月18日（金）', placeLabel: '本山・書店', photoUrl: books, icon: 'book' as const },
    { title: '公園を歩いた', dateLabel: '4月20日（日）', placeLabel: '平和公園', photoUrl: park, icon: 'leaf' as const },
  ];
  return { ...view, title: '穏やかな寄り道探検家',
    summary: '新しい場所と、落ち着ける\n時間を大切にした一週間。',
    axes: [ ['nature', '自然', .65], ['books', '本', .60], ['cafe', 'カフェ', .78], ['walk', '散歩', .66], ['social', '人との時間', .64] ].map(([key,label,value]) => ({ key: String(key), label: String(label), value: Number(value), numerator: Number(value)*100, denominator: 100, unknownDays: 0 })),
    records: samples.map((sample,index) => ({ id: view.records[index]?.id ?? '', version: view.records[index]?.version ?? 1, ...sample, sourceState: 'current', quote: '参照画像の表示サンプル（デモ）。本人の実体験ではありません。' })),
  };
}

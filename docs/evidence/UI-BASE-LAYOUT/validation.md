# UI-BASE-LAYOUT / Issue #300 実画面確認

- 基点: `origin/develop` `385bfd10c0544298481afedb66cbbbde056dd445`
- 修正 commit: `04f0816ea791b30d15092ea1d1e138be608b3263`
- 環境: macOS、agent-browser 0.38.1 の Chromium、ローカル Vite `http://127.0.0.1:5173/` と API `http://127.0.0.1:3001/`。API はこの専用 worktree の `.local/` DB を使用。地図は `.env.example` の公開 Mapbox token だけを未追跡 `.env` に設定し、既存の地図データ/API/DBを置換していない。一部タイル取得エラーは表示されたが Mapbox canvas は起動し、配置点を確認できた。
- 対象URL: `http://127.0.0.1:5173/#/map-layers`、`http://127.0.0.1:5173/#/object-place?objectId=new`。直接起動に加え、画面上のボタン遷移も確認した。
- 原本幅: [UI-MAP 監査](../UI-MAP/responsive-audit-2026-09-24.md) の 512×1024 画像を参照。

## 変更前と原因

| 512×1024 | 変更前画像 | 実測 |
| --- | --- | --- |
| map-layers | [変更前](before-layers-512.png) | 戻るボタン y=920.3–969.1、下部ナビ y=929–1016。ナビがボタンの下部に重なる。 |
| object-place | [変更前](before-object-place-512.png) | Sheet が左端から430pxを占め、配置吹き出し x=390–552。右端40pxが画面外。 |

共通 Sheet は 512px 幅でも 430px の左側パネルになっていた。地図の配置点はパネル右側の残り幅を基準に移動するため、吹き出しが画面外へ出た。高さ指定 Sheet は画面下端まで伸び、下部ナビと重なっていた。

## 修正後

| 幅 | map-layers | object-place |
| --- | --- | --- |
| 320×740 | [末尾スクロール](after-layers-320-bottom.png)。戻る y=559.4–608.2、ナビ上端645、クリック可能。 | [画像](after-object-place-320.png)。吹き出し x=79–241、確定・取消 y=647.9–696.7。 |
| 390×844 | [末尾スクロール](after-layers-390-bottom.png)。戻る y=663.9–712.7、ナビ上端749。 | [画像](after-object-place-390.png)。吹き出し x=114–276、確定・取消 y=754.5–803.3。 |
| 512×1024 | [変更後](after-layers-512.png)・[実地図](after-layers-512-mapbox.png)。戻る y=779.6–828.4、ナビ上端929。 | [変更後](after-object-place-512.png)・[実地図](after-object-place-512-mapbox.png)。吹き出し x=175–337、確定・取消 y=871.5–920.3。 |
| 1440×900 | [画像](after-layers-1440.png)。戻る x=41–429、ナビ x=490–950 で重なりなし。 | [画像](after-object-place-1440.png)。吹き出し x=864–1026、確定・取消 x=41–429。 |

512px の地図可視領域は x=0–512、y=0–665.6。配置点の中心は x=256、y≈333 で可視領域中央に対応する。1440px では Sheet 右端450 と画面右端1440 の間の中央 x=945 に配置点がある。Sheet 幅と地図 padding が同じ実測レイアウトを参照する。

## 操作と検査

- map-layers: 320px で末尾スクロール後の戻るボタンをクリックし `#/map` に遷移。再表示後に同ボタンへフォーカスして Enter でも `#/map` に遷移。
- object-place: キャンセルで `#/map`、ここに置くで座標を引き継いだ `#/object-edit`、編集画面の戻るで `#/object-place?objectId=new` を確認。320pxの実Mapboxで拡大・縮小をクリックし、縮尺表示 300m→100m→300m、配置点の中央維持を確認。
- `src/app/presentation.test.tsx`: 2 tests passed。`vite build`: 成功。`git diff --check`: 成功。
- `bun run typecheck`: 未変更の `server/core/core.test.ts`、`src/features/exploration/flow.ts`、`src/features/friends/screens.tsx`、`src/features/reflection/DiaryScreen.tsx`、`tools/local/dev.ts` に既存の型エラーがあり失敗。変更した2ファイルのエラーは出ていない。
- reduced motion: Chromium の `set media light reduced-motion` で `matchMedia('(prefers-reduced-motion: reduce)').matches === true` を確認し、512px map-layers の末尾ボタンとナビが重ならないことを再確認。
- 文字倍率の代替確認: 512pxで root font を 16px→32px にした CSS 模擬では、[map-layers末尾](after-layers-512-root-font-200.png) の戻るボタン y=843.4–892.2、ナビ上端929。[object-place](after-object-place-512-root-font-200.png) は吹き出し x=175–337、末尾スクロール後の確定・取消 y=949.3–998.1 で操作可能。ブラウザ/OSの実際の文字200%設定としては未確認。
- 実ソフトキーボード開閉、実機 safe area はこの環境では未確認。safe area は下部ナビの実測上端と CSS `env(safe-area-inset-bottom)` を使って考慮した。

写真、地図データ、API、DB の契約には変更を加えていない。#297 の詳細カード内部も変更していない。

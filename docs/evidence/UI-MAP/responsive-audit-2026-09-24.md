# UI-MAP 追加表示監査（2026-09-24）

ローカル API + Vite、隔離 `.local/app.sqlite` の本人データ（保存場所2件、記録2件、テーマ2件）を使用。参照画像の `853×1844` は表示幅を約426px、3画面組の各 `512×1024` は表示幅512pxとして実画面と並べて確認した。

| 画面 | 同幅画像 | 確認結果 |
| --- | --- | --- |
| map | [426px](reference-width-map.png) | 実Mapbox、検索・レイヤー入口・カメラ・現在地・ナビ操作を表示。参照の装飾済み建物・写真とは実データが異なる。 |
| personal-map | [426px](reference-width-personal.png) | テーマ選択・本人の場所1点・詳細・元記録・テーマ編集を表示。写真なし時は明示する。 |
| map-layers | [512px](reference-width-layers-512.png) | 4レイヤーと切替・未接続理由を表示。検索マーカーが個人マーカーと重なる問題を修正し、テーマONで2点、OFFで0点を確認。512pxでは下端の「地図に戻る」が共通ナビと重なる。 |
| object-edit | [512px](reference-width-object-edit-512.png) | 名前・メモ・6色・3サイズ・場所・preview・取消/保存を表示。保存は実CRUD未接続としてdisabled。 |
| object-place | [512px](reference-width-object-place-512.png) | 実地図の中央位置・移動案内・確定/取消・ズーム操作を表示。512pxでは共通Sheetが左側配置になり、配置吹き出しの右端が画面外へ出る。320/390pxでは既存証拠の通り中央に収まる。 |

入力表示の代理確認: デスクトップのin-app Browserで `320×440` に表示領域を縮め、[検索](keyboard-viewport-map.png)はフォーカス時に上端24–56px、[目印メモ](keyboard-viewport-object-edit.png)は205–300pxに収まり、横スクロールは0。実OSのソフトキーボードはこのブラウザで生成できず、開閉によるvisual viewport変化は未確認。

文字200%: ブラウザの拡大ショートカットを送っても `rem=16px`、viewport scale=1のままで、文字だけを200%にする設定をこのブラウザでは確認できなかった。実機または文字倍率を設定できるブラウザでの確認が必要。reduced motion: このブラウザの `matchMedia('(prefers-reduced-motion: reduce)')` はfalseで、設定を切り替えられなかった。再生処理・カメラ移動・バッジ・ボタンにはreduce分岐があることをコードで確認したが、端末設定ONの実操作は未確認。

512pxのSheet/ナビ配置は共通Shell #172、原本の装飾済み建物・写真・全状態の差分は #174、実保存・レイヤー設定・バイクデータは #134/#27/#123 の作業範囲。UI-MAP単独ではこれらを完了扱いしない。

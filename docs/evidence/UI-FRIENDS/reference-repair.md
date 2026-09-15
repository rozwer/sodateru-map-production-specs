# 友達地図の参照差分修復（2026-09-15）

UI-FRIENDS #14。branch `rozwer/14-friends-reference`。取得範囲 `src/features/friends/` と本証拠フォルダ。今回の担当は友達地図の修復差分を統合して終了する。#14全体は未完のためopenを維持する。

## 修正

- 07_41_08の853×1844原本を実際に開き、検索欄・丸い友達写真列・広い地図・共有記録シートの順序と寸法を修復。
- 人物説明とオレンジの共有badge、実要素strongに対する記録見出しサイズ、写真比率、住所アイコンの改行、比較/ルート操作を修復。
- MapPreviewのpaddingを呼出側から渡して端のpin/ラベル切れを抑制。友達pinをオレンジの白背景ラベルに変更し、本人overlayの青緑は維持。
- 全screenを読み込んだ際にMapbox CSSが地図canvasのpositionを上書きして高さ0にする問題を友達配下で修復。共通地図担当には #222 のコメント5674815960で連絡済み。
- server、Schema、生成client、DB、共通map/navファイルは変更なし。

## 実行環境と証拠

専用worktree `/Users/roz/.codex/worktrees/friends-reference/sodateru-map-production-specs`。Vite 5314、現在の実App/Shellと全screenを読み込む `reference.html`。主入口は `#/community-home` の「友達の地図」。写真付き2人のデータは既存fixtureを拡張した**UIテスト応答**で、画面にも明示。実API/DB保存成功の証拠ではない。人物写真はUnsplashの表示例で、実在の友達とは主張しない。製品entryはfixtureをimportしない。

```sh
mise exec -- bunx vite --host 127.0.0.1 --port 5314 --strictPort
# /docs/evidence/UI-FRIENDS/reference.html#/community-home
```

- 853×1844：原本のheader約355pxに対し359px、共有sheet開始997pxに対し990px。Mapbox実描画、原本幅の写真・カード・操作配置を目視。`reference-853-after.jpg`。
- 390×844：入口→友達地図、名前検索「はるか」→カード詳細→戻るで検索保持、プロフィール→比較実行→戻る、スクロール→おすすめルート→行程を操作。`reference-390-after.jpg`。
- はるか→こうたで人物名・地図pin・原文の2組が同期。みなみへ切替で記録0・pin0、前の友達の情報は消え、活動がないと断定しない案内を表示。
- 08_17_57原本を開き、プロフィール/比較/共有ルートを実画面で目視。比較の元記録と共通点/違い/不明を表示。ルートの地点順・実地図を表示し、滞在など未提供項目を未提供のまま保持。
- 08_17_53原本を開き、共有→友達選択で2人を選択→完了で下書きに2人と未保存を表示。`sharing-reference-390.jpg`、`picker-reference-390.jpg`。共有確定は今回実施していない。
- Vite production build成功。全体typecheckは既存のserver/coreテスト、exploration、recordsテスト、reflection、tools/local/devのエラーで停止。friendsファイルの型エラーなし。

## 残件と再開条件

- #14：プロフィールのテーマ配置、比較カードの原本レイアウト、shared-routeの作者コメント/写真/滞在/元記録導線、sharing/pickerの細部。今回の通常遷移目視で全表示状態の一致を主張しない。
- #14：320×740・1440×900・文字200%・ソフトキーボード・reduced motion、全loading/error/conflict/遅着/取消の網羅は今回未実施。
- #142 CONNECT-FRIENDS：実本人/live-demo分離、実AI比較、実API保存・再取得・共有取消と元記録の現在権限の同一build受入。既存API呼出は変更していない。
- ROUTES #25の既存未提供契約（作者の言葉、媒体、滞在、元recordId）の提供を待ち、提供commit/契約に基づいてshared-routeを仕上げる。新しい契約依頼を重複投稿しない。
- 原本の書店/公園別pinアイコン、地図style/ラベル詳細と下部共通navの完全一致は未完。写真/人物/地点はfixture表示例のため原本画像と同一ピクセルではない。
- 再開時は #14 の最新boardを正式claimし、統合済み本差分を起点に上記残受入を続行する。未達のままtask:finishは実行しない。

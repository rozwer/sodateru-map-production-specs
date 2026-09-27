# #19 操作仕様とCONNECT開始条件（2026-09-27）

起点 develop `86769d114fd5048650b73bef4d26d4bd4062768d`、正規UI-COMPANION claim。親の指示により2画面のinteractions.jsonをadd-lock取得した。

## 変更

既存実装screens.tsxで使う設定保存、ZIP検査、登録の既存operationを画面仕様へ対応付けた。25動作表示後の明示確認は既存confirmCompanionImportへ対応する操作として追記。新API・生成物変更・新規制作はない。connect-handoff.jsonは既に統合されたREADME.mdの#350/#362実ZIP・設定・再読込証拠と同じ版のOpenAPI本文digestを参照する。対象範囲はsrc/features/companion/。

## 追加の実操作確認

専用companion19.localhost:5197（strictPort）/API3027、PID4528/4618両cwdはcompanion-19-completion。live/demo DBとprofiles bindingを以前の自分の検証DBから専用コピー。Mapbox設定も親指定の既存keyだけ利用し値は証拠に保存しない。

同一本人のタブAでサイズ小・動き軽減ONを未保存にし、別タブBで表示ONを保存。Aの保存は版競合になり、入力は維持された。Aで「最新の保存値を確認」は保存済み表示をONへ更新しながら下書きOFF/小/動き軽減ONを維持。改めて明示保存・再読込するとOFF/小/動き軽減ONとなった。画面の実DOMで確認。これは実API通信であり、mockレスポンスではない。

## 残件

#19/#147全体の完了証拠ではない。二本人/live-demo、実通信の失敗・応答不明再送、全指定画像・2データ・200%等は継続する。plugin-manageが導入0件時に相棒入口を表示しない問題を親とGROW担当へ通知し、担当から修復開始の回答あり。直接既存routeで行った上記確認を通常入口の証拠にはしない。背景地図は一部取得失敗を表示している。

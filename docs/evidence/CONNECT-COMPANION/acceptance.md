# CONNECT-COMPANION #147 実接続受入

2026-09-27。正規claim `rozwer/147-companion-connection`、worktree `companion-147-connect`。取得範囲src/features/companion/と本証拠。

## 修復

登録＋現在選択のPOSTが成功して確認GETだけが失敗した際、再試行が設定版を再取得して別のidempotency inputになる問題を修正。最初の明示登録操作で確定したimport版・settingsVersion・本文を同じactionの再試行に保持する。利用者が新たに登録操作する場合は新しいactionとして現在版を取得する。読込中の現在相棒は未確認、保存ボタンは読込中と表示し、保存通信と混同しない。

## 環境

`companion19.localhost:5197` strictPort、Vite PID6562、API3027初回PID1521/再起動32206。lsof両cwdを本worktreeと照合。専用`.local/app.sqlite`/`demo.sqlite`/`profiles.json`を以前の自己検証DBからbackupコピー。テスト専用の別本人を追加した。Mapbox keyは親指定の既存設定から必要keyだけコピー、値は保存しない。通常実APIの前に本ディレクトリfault-proxy.mjsを3028で起動し、明示した失敗/遅延だけ注入。成功JSONを偽造しない。制作/生成は依頼対象外。

## 実操作と通信

- 既存ZIP/25動作確認/登録と選択の独立/設定保存/通常地図の同じatlas/表示OFFでもAIは、統合済み#350/#362とUI-COMPANION/README.mdの証拠を再利用。今回の第二ZIPは同じ原創作atlasのmanifest ID/displayNameを変えた技術データ。作画品質の証拠ではない。
- 取込POST `/api/v1/companion/imports` 201（1回）、ID `1da6bf28-9a85-4505-8b37-8d5511db3fd4`。GET importとatlas各200。実chooser/実PNG decode/25動作を表示、明示確認PATCH `/confirmation` 200（1回）、If-Match 1、9動作+16視線のactions本文。
- 登録POST `/registration` 201、If-Match 2、本文`{"selectCurrent":true,"settingsVersion":7}`、key `90d51750-565a-475f-b3fa-86612b091ceb`。登録後GET `/api/v1/companions/a9ab4c92-db90-4d67-93a8-532748ba13e1` をproxyで一度502にし、画面に「検証用: 登録後の確認通信を一度遮断」を明示。
- 再試行は上記と同じkey/version/bodyのPOST（2回目）200。同じIDへの確認GET200。画面は二匹だけ、二番目が現在選択。DBのcompanionsは元1件+新1件、重複なし。登録の再送時にsettingsVersionを再取得しない。
- 最初の試作ZIPに余分なmanifest keyを入れたケースは422。画面に形式不正、登録無効。既存登録と現在相棒は変更されなかった。50,000,001bytesの拒否はUI-COMPANION既存実chooser証拠、50MB/展開100MB上限・構造/CRC・再起動APIはCOMPANION/import-validation.mdと既存archive/http-import試験を再利用（変更なし）。
- 実二タブ版競合: UI-COMPANION/connection-ready.md（#370）。Aの小/動き軽減ONの入力を維持、Bの保存後Aは競合を表示、最新保存値GET→入力維持→明示保存→reloadで反映。
- スタート画面から別本人へ切替→相棒管理で登録0件/未選択・既定設定。デモONの自分も0件。デモの表示OFF保存はlive二匹/選択/小/動き軽減ONを変更しない。SQLite両DBも照合。
- APIプロセスを停止してデモの動き軽減ON保存→実通信失敗・入力保持・未保存表示。APIを同じDBで再起動→再試行で保存成功。その後live/元本人へ戻り、二匹/二番目選択/非表示/小/動き軽減ONを再取得。DB/settingsはlive本人version8、別本人version1、demo本人version3、独立。
- atlas一つだけproxy502→一部画像取得失敗を明示し、二匹の名前と保存設定は残る。再試行で両atlas復帰。
- listCompanions実200応答を10秒遅延、読込中に戻る→通常地図へ。proxyは遅延解放時clientClosed=true、相棒画面/古い値を復活させない。保存済み相棒は変化なし。
- 明示取込取消/再訪でファイル消去、選択解除の取消では書込なしは#350の実UI・回帰テストを再利用。相棒には共有・削除operationが存在せず、その未定義操作を模擬で追加しない。

## チェックと境界

screens.test.tsx 3件PASS（既存取消/選択解除、今回の登録再送）、対象strict TypeScript PASS、diff --check PASS。本証拠は#147実接続の受入。#19/#184の全画像比較・文字200%等の視覚条件は別途継続し、本件完了でそれらを閉じない。新規制作は除外済み。#371通常入口修復はGROW担当が独立review・通常App実操作済み。

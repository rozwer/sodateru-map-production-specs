# DISASTER｜防災情報の取得・根拠と地図表示

<!-- task-id: DISASTER -->

初期担当枠：C。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

指定地域の防災情報を出典・時点・意味付きで確認し、地図へ表示できる。

## 実装範囲

- 固有条件、必要な地形/雨量等の提供元・計算・取得時刻・保存/更新を契約化する。
- ハザードと現在状況の違い、欠測/範囲外/取得失敗を返す。

## 通過条件

- 実取得した情報の出典・更新時刻・対象地域と地図範囲が一致する。
- 過去ハザードを現在の浸水等と表示せず、取得失敗を模擬成功へ置換しない。
- 設定と結果の再取得・更新・無効化が通常地図へ反映される。

## 参照と契約

[README.md](../../01_requirements/02_common/03_information/README.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[PLUGINS](PLUGINS.md)、[PLACES](PLACES.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/plugins/disaster/`、`server/db/migrations/disaster/`、`docs/evidence/DISASTER/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

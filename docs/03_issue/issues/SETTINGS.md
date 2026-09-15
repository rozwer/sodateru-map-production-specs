# SETTINGS｜プロフィール・利用設定・本人データ管理

<!-- task-id: SETTINGS -->

初期担当枠：B。担当者：koshiro。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

プロフィール・表示・権限に関する本人設定と提案停止対象を保存して再取得できる。

## 実装範囲

- patchMe、アイコン、表示/位置/媒体/AI/通知/保存期間/提案停止・解除の構造化契約を追加する。
- 初回本人・公開範囲はCORE/INFORMATIONへ接続し、共通データ一覧・書出し・削除の入口をRECORDS/HEALTHと揃える。

## 通過条件

- 本人を切替えて設定が混ざらず、再起動後も同じ値を返す。
- AIへ送る範囲と提案停止/解除が実際の呼出し条件へ使える。
- アイコン変更とデータ削除で対象外の記録/媒体を消さず、版競合を返す。

## 参照と契約

[設定](../../01_requirements/03_pages/settings/README.md)、[プロフィールと表示](../../01_requirements/03_pages/profile-settings/README.md)、[提案とまとめの条件](../../01_requirements/03_pages/suggestion-settings/README.md)、[AIへ送る内容の確認](../../01_requirements/03_pages/ai-consent/README.md)。

[00_people.json](../../01_requirements/01_DB/00_people.json)、[requirements.md](../../01_requirements/03_pages/profile-settings/requirements.md)。

実装する既存operationId：`patchMe`。

契約補完の担当：`settings`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)、[RECORDS](RECORDS.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/settings/`、`server/db/migrations/settings/`、`docs/evidence/SETTINGS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

# UI-SETTINGS｜設定・健康取込・取得元と活動統計

<!-- task-id: UI-SETTINGS -->

初期担当枠：A。担当者：rozwer。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

利用設定と健康データの範囲を管理し、取得元を確かめて活動量を見られる。

## 実装範囲

- プロフィール/表示/位置/媒体/AI/通知/保存期間/停止対象の設定を接続する。
- XMLと対応アプリの連携、許可項目/期間、取込状況、停止/保存分削除、活動統計を実装する。

## 通過条件

- 再起動後も本人設定が残り、権限状態と設定値の違いを表示する。
- 取込項目/期間が実データに反映され、停止と過去データ削除の結果を区別できる。
- 取得元・期間・欠測が数値に対応し、GPS距離を歩数へ置換しない。

## 参照と契約

[設定](../../01_requirements/03_pages/settings/README.md)、[プロフィールと表示](../../01_requirements/03_pages/profile-settings/README.md)、[提案とまとめの条件](../../01_requirements/03_pages/suggestion-settings/README.md)、[健康データの連携](../../01_requirements/03_pages/health-connect/README.md)、[健康データの項目と期間](../../01_requirements/03_pages/health-permissions/README.md)、[健康データの連携状態](../../01_requirements/03_pages/health-status/README.md)、[活動の統計](../../01_requirements/03_pages/activity-stats/README.md)、[データの取得元](../../01_requirements/03_pages/data-sources/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[SETTINGS](SETTINGS.md)、[HEALTH](HEALTH.md)、[ACTIVITY](ACTIVITY.md)、[INSIGHTS](INSIGHTS.md)、[CORE](CORE.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/settings/`、`src/features/health/`、`docs/evidence/UI-SETTINGS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

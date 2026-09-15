# UI-INSIGHTS｜傾向・根拠の訂正とテーマ管理

<!-- task-id: UI-INSIGHTS -->

初期担当枠：A。担当者：rozwer。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

期間ごとの傾向を根拠付きで見て判断を残し、自分のテーマを編集できる。

## 実装範囲

- 期間・グラフ・欠測・反例・仮説/確認済みの区別と訂正を扱う。
- テーマの名前・色・写真・所属記録の作成/更新/削除と地図への復帰を接続する。

## 通過条件

- 期間変更で数値と根拠が一致し、不明日を分母に加えない。
- 「合う/違う/不明」と理由を保存し、元記録変更時は古い引用を更新対象として表示する。
- テーマの所属変更が再読込後の地図絞込へ同じIDで反映される。

## 参照と契約

[タイプ診断](../../01_requirements/03_pages/type-diagnosis/README.md)、[傾向の根拠](../../01_requirements/03_pages/trend-evidence/README.md)、[傾向の確認・訂正](../../01_requirements/03_pages/trend-review/README.md)、[自分のテーマ](../../01_requirements/03_pages/themes/README.md)、[テーマを編集](../../01_requirements/03_pages/theme-edit/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[INSIGHTS](INSIGHTS.md)、[THEMES](THEMES.md)、[INFORMATION](INFORMATION.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/insights/`、`src/features/themes/`、`docs/evidence/UI-INSIGHTS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

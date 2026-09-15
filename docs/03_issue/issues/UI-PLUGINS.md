# UI-PLUGINS｜拡張機能の試用・導入・更新と機能要望

<!-- task-id: UI-PLUGINS -->

初期担当枠：A。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

機能を探して同じ地図で試し、導入後も停止・更新・削除でき、欲しい機能を投稿できる。

## 実装範囲

- 試用条件と自動before/after、導入確認、ON/OFF・設定・版戻し・競合解決を実装する。
- バイク・防災・聖地の固有条件/出典/結果を共通地図へ接続する。
- 要望一覧・本文投稿・共感・タグ・公開範囲・アプリ内依頼フォームを実装する。

## 通過条件

- 試用は模擬と明示し、導入操作で初めて設定を保存して通常地図へ反映する。
- 更新失敗時に旧版が残り、無効化/削除で体験や保存場所が消えない。
- 3種の実データ経路と要望投稿→再表示→編集/削除を確認する。

## 参照と契約

[拡張機能を探す](../../01_requirements/03_pages/plugin-store/README.md)、[拡張機能の詳細](../../01_requirements/03_pages/plugin-detail/README.md)、[拡張機能を試す](../../01_requirements/03_pages/plugin-trial/README.md)、[導入前の確認](../../01_requirements/03_pages/plugin-install/README.md)、[導入済みの機能](../../01_requirements/03_pages/plugin-manage/README.md)、[機能の更新](../../01_requirements/03_pages/plugin-update/README.md)、[変更が重なる場合](../../01_requirements/03_pages/plugin-conflict/README.md)、[みんなの欲しい機能](../../01_requirements/03_pages/feature-requests/README.md)、[お願いを書く](../../01_requirements/03_pages/feature-request-edit/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[PLUGINS](PLUGINS.md)、[BIKE](BIKE.md)、[DISASTER](DISASTER.md)、[PILGRIMAGE](PILGRIMAGE.md)、[FEATURE-REQUESTS](FEATURE-REQUESTS.md)、[CORE](CORE.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/plugins/`、`src/features/feature-requests/`、`docs/evidence/UI-PLUGINS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

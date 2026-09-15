# MAP-CUSTOM｜手動装飾・レイヤー設定とAI地図設定

<!-- task-id: MAP-CUSTOM -->

初期担当枠：C。担当者：kaiya。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

本人が追加した飾りや表示設定を保存し、AIから得た地図設定案を確認後に適用できる。

## 実装範囲

- 飾りのCRUD/配置と本人領域、レイヤー保存先、プラグインON/OFFとの区別を定める。
- mapstyle固有入力/プロンプト/検証/採用、4色を含む設定をUIの描画へ渡す。

## 通過条件

- 飾りの位置/色/名前を保存・編集・削除し、成長建物のデータを変更しない。
- AI提案だけでは設定を変えず、採用・取消・版競合を区別する。
- 再読込で表示設定が戻り、無効プラグインの表示を勝手に再有効化しない。

## 参照と契約

[地図の表示設定](../../01_requirements/03_pages/map-layers/README.md)、[地図オブジェクトを編集](../../01_requirements/03_pages/object-edit/README.md)、[地図に配置](../../01_requirements/03_pages/object-place/README.md)。

[01_contract.md](../../01_requirements/02_common/01_ai/01_contract.md)、[03_map-ui.md](../../01_requirements/02_common/02_places-routes/03_map-ui.md)。

契約補完の担当：`object`、`layers`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)、[AI](AI.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/map-custom/`、`server/db/migrations/map-custom/`、`docs/evidence/MAP-CUSTOM/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

# TRANSFER｜別の街へ体験を移す二案比較と採用

<!-- task-id: TRANSFER -->

初期担当枠：D。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

元の体験から残したい意味と順序を指定し、別地域の忠実案/本人向け案を比較して選べる。

## 実装範囲

- 共通場所・経路要件にあるレシピ/二案/選択結果の画面入口・API・保存契約を具体化する。
- 機能固有のAI入力/結果検証、地域候補と経路取得、採用結果の再表示を実装する。

## 通過条件

- 元記録の意味/順序と移転条件を保存し、二案の共通点/相違/不足情報を比較できる。
- 採用した地点列を共通経路へ渡し、再起動後に同じ計画を取得できる。
- Q10の保存・画面契約が未解消の間は完了扱いせず、元体験を上書きしない。

## 参照と契約

[README.md](../../01_requirements/02_common/02_places-routes/README.md)、[03_open-questions.md](../../01_requirements/04_api/conventions/03_open-questions.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[AI](AI.md)、[PLACES](PLACES.md)、[ROUTES](ROUTES.md)、[INFORMATION](INFORMATION.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/transfer/`、`server/db/migrations/transfer/`、`docs/evidence/TRANSFER/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

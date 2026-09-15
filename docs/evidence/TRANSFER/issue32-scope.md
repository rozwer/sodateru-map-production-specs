## デモ期限に伴う承認済み範囲変更（2026-09-15）

今回の先行提供は固有SQLite保存、CORE HTTP/再送境界、二案構造/根拠/順序/時間検査、共通adapter、Q10 API断片です。独立レビューと8件の固有/境界検証、実アプリ起動・本人セッションを確認しました。

実INFORMATION/AI/PLACES/ROUTES結合、採用後OS再起動GET、共通生成・UI受入は後続 #109 に移管します。詳細: docs/evidence/TRANSFER/completion-scope.md / PR #94。以下の元要件は保存し、#109で継続します。元TRANSFER.completeの達成を意味しません。

---

# TRANSFER｜別の街へ体験を移す二案比較と採用

<!-- task-id: TRANSFER -->

初期担当枠：D。担当者：mattsun。[GitHub #32](https://github.com/rozwer/sodateru-map-production-specs/issues/32)。[一覧](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/README.md) · [共通完了条件](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/execution.md#完了の扱い)。

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

[README.md](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/02_common/02_places-routes/README.md)、[03_open-questions.md](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/04_api/conventions/03_open-questions.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[AI](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/AI.md)、[PLACES](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/PLACES.md)、[ROUTES](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/ROUTES.md)、[INFORMATION](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/INFORMATION.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **TRANSFER.complete**：別の街への体験移転・二案比較・採用。実在の場所/経路と元体験の根拠を持つ二案を比較し、採用結果を保存/再取得する。

### 接続に必要な提供物

- [AI](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/AI.md)：`AI.engine`、`AI.refs`。
- [PLACES](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/PLACES.md)：`PLACES.search`、`PLACES.detail`。
- [ROUTES](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/ROUTES.md)：`ROUTES.basic`。
- [INFORMATION](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/delivery.md)。

## 編集範囲

提案path：`server/features/transfer/`、`server/db/migrations/transfer/`、`docs/01_requirements/04_api/fragments/TRANSFER.json`、`docs/evidence/TRANSFER/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

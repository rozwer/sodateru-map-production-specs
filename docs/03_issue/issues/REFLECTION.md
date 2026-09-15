# REFLECTION｜体験整理・日記・振り返り質問と比較

<!-- task-id: REFLECTION -->

初期担当枠：D。担当者：mattsun。[GitHub #33](https://github.com/rozwer/sodateru-map-production-specs/issues/33)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

原文を保って用途案・日記・比較を生成し、本人の回答や判断を固有の保存先に残せる。

## 実装範囲

- extract/diary/compareの材料・プロンプト・出力検証・採用を共通AIとrecords/insightsへ接続する。
- 質問IDと回答済み/あとで/スキップ、回答原文、二体験/友達比較の生成・保存・訂正契約を追加する。

## 通過条件

- 原文を保持して用途だけを採用し、日記生成中の本人編集を上書きしない。
- 質問状態と回答・比較結果と本人の「違う」を再起動後も同じIDで取得する。
- 共有取消/根拠訂正後は古い比較引用を返さず、再生成へつなぐ。

## 参照と契約

[日記](../../01_requirements/03_pages/diary/README.md)、[振り返りの質問](../../01_requirements/03_pages/reflection-question/README.md)、[振り返りの記録](../../01_requirements/03_pages/reflection-history/README.md)、[二つの体験を比較](../../01_requirements/03_pages/experience-compare/README.md)、[友達との共通点](../../01_requirements/03_pages/friend-compare/README.md)、[解釈を訂正](../../01_requirements/03_pages/interpretation-correction/README.md)。

[01_contract.md](../../01_requirements/02_common/01_ai/01_contract.md)、[03_storage-ui.md](../../01_requirements/02_common/01_ai/03_storage-ui.md)。

契約補完の担当：`comparison`、`question-state`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[AI](AI.md)、[RECORDS](RECORDS.md)、[INFORMATION](INFORMATION.md)、[INSIGHTS](INSIGHTS.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **REFLECTION.record**：体験整理・日記・質問/回答。原文を保持した整理/日記の採用と質問状態/回答を保存・再取得する。
- **REFLECTION.compare**：体験/友達比較と本人判断。比較固有の判断を作り、共通insights保存処理へ渡す。根拠の現在権限を守る。

### 接続に必要な提供物

- [AI](AI.md)：`AI.engine`、`AI.refs`。
- [RECORDS](RECORDS.md)：`RECORDS.save`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。
- [INSIGHTS](INSIGHTS.md)：`INSIGHTS.evidence`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/reflection/`、`server/db/migrations/reflection/`、`docs/01_requirements/04_api/fragments/REFLECTION.json`、`docs/evidence/REFLECTION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

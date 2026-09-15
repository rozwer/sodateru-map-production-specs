# EXPLORATION｜街歩きの相談ループ・候補採用・発見

<!-- task-id: EXPLORATION -->

初期担当枠：D。担当者：mattsun。[GitHub #26](https://github.com/rozwer/sodateru-map-production-specs/issues/26)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

会話の続きから同じ候補を選び、地図と経路へ渡し、発見と反応を保存できる。

## 実装範囲

- 一時CLIによる相談、起点・直近4往復・検索/経路/判断上限・取消/期限を共通AIで実装する。
- 一時resultIdと保存会話の対応、retentionを守る履歴、発見カード/出典/反応を実装する。

## 通過条件

- 「2番目」の選択で同じ候補ID/起点を経路へ渡し、別本人/モード/期限切れを拒否する。
- 取消や古い試行の遅着を保存せず、入力と再試行状態を返す。
- 発見の保存→再読込→非表示と根拠変更を確認し、場所固有の事実と一般説明を区別する。

## 参照と契約

[Codexと探索](../../01_requirements/03_pages/ai-explore/README.md)、[相談履歴](../../01_requirements/03_pages/conversation-history/README.md)、[もやの探索候補](../../01_requirements/03_pages/mist-detail/README.md)、[探索コンパス](../../01_requirements/03_pages/quest-compass/README.md)。

[04_map-dialogue.md](../../01_requirements/02_common/01_ai/04_map-dialogue.md)、[03_evidence.md](../../01_requirements/02_common/03_information/03_evidence.md)。

実装する既存operationId：`postMapDialogues`、`postMapDialoguesSelect`、`postMapDialoguesCancel`、`getMapDialoguesResultsResultId`、`postDiscoveryCards`、`getDiscoveryCards`、`getDiscoveryCardsCardId`、`deleteDiscoveryCardsCardId`、`postDiscoveryCardsCardIdReactions`、`getDiscoveryCardsCardIdReactions`、`getDiscoveryCardsCardIdReactionsReactionId`。

契約補完の担当：`consult-history`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[AI](AI.md)、[PLACES](PLACES.md)、[ROUTES](ROUTES.md)、[INFORMATION](INFORMATION.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **EXPLORATION.dialogue**：街歩きの相談・候補選択・履歴。相談→候補の選択→経路を同じIDでつなぎ、取消/期限/履歴復帰を確認する。
- **EXPLORATION.discovery**：発見カードと反応・保存。発見の由来を保って保存/反応/再取得する。

### 接続に必要な提供物

- [AI](AI.md)：`AI.engine`、`AI.refs`、`AI.voice`。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。
- [ROUTES](ROUTES.md)：`ROUTES.basic`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/exploration/`、`server/db/migrations/exploration/`、`docs/01_requirements/04_api/fragments/EXPLORATION.json`、`docs/evidence/EXPLORATION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

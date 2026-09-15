# EXPLORATION｜街歩きの相談ループ・候補採用・発見

<!-- task-id: EXPLORATION -->

初期担当枠：D。担当者：mattsun。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/exploration/`、`server/db/migrations/exploration/`、`docs/evidence/EXPLORATION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

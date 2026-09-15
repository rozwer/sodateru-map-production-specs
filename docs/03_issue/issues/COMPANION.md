# COMPANION｜既存相棒のZIP取込・保存・表示管理と選択

<!-- task-id: COMPANION -->

初期担当枠：D。担当者：mattsun。[GitHub #35](https://github.com/rozwer/sodateru-map-production-specs/issues/35)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

正しい既存Codexペットを取り込み、動作確認して登録・表示管理・選択できる。

## 実装範囲

- ZIP構造/50MBと展開上限、媒体保存、登録一覧・表示設定・選択の契約を追加する。
- 新規相棒制作/生成は今回対象外。制作入口・画面・下書き/指示持出し・生成/採用はuser-excludedとして原条件を保持し、未実施を完成扱いしない。

## 通過条件

- 有効ZIPの全必要動作を確認して登録し、不正ZIPが既存相棒を変えない。
- 既存ペットの登録と現在選択を分離し、表示ON/OFF・サイズ・動きを減らす設定を保存/再取得する。
- 再起動後に登録物・表示設定・現在選択が一致する。

## 参照と契約

[相棒の管理](../../01_requirements/03_pages/companion-settings/README.md)、[相棒をファイルから追加](../../01_requirements/03_pages/companion-import/README.md)、[相棒の制作](../../01_requirements/03_pages/companion-create/README.md)。

[requirements.md](../../01_requirements/03_pages/companion-import/requirements.md)、[requirements.md](../../01_requirements/03_pages/companion-create/requirements.md)。

契約補完の担当：`pet`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **COMPANION.import**：相棒ZIPの取込・一覧・選択。有効ZIPを保存/再取得し、不正ZIPが既存登録物を変えない。
- **COMPANION.create**：今回user-excluded。原条件は[明示スコープ記録](../ui-connections.json#/user_exclusions/companion-create)に保持し、提供済みとは扱わない。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/companion/`、`server/db/migrations/companion/`、`docs/01_requirements/04_api/fragments/COMPANION.json`、`docs/evidence/COMPANION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

## 明示スコープ変更

Aオーケストレーター経由のユーザー承認により、新規制作/生成を入口・画面ごと今回対象外とする。原要件/受入は削除しない。既存実装・Taskの担当/paths/claim/提出・完了状態はこの定義変更で書き換えない。接続は[CONNECT-COMPANION](CONNECT-COMPANION.md)、画面は[UI-COMPANION](UI-COMPANION.md)で確認する。

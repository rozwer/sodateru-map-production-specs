# COMPANION｜相棒のZIP取込・制作・保存と選択

<!-- task-id: COMPANION -->

初期担当枠：D。担当者：mattsun。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

正しい相棒ファイルを登録し、制作下書きから生成/動作確認/採用を経て選択できる。

## 実装範囲

- ZIP構造/50MBと展開上限、媒体保存、登録一覧・表示設定・選択の契約を追加する。
- 生成先の実接続・制作入力/参照画像・進捗/再開/取消・結果採用、下書き/制作指示持出しを実装する。

## 通過条件

- 有効ZIPの全必要動作を確認して登録し、不正ZIPが既存相棒を変えない。
- 実接続した生成先で入力→生成→採用→選択を保存し、未接続時は仕様どおり下書きを保持する。
- 再起動後に登録物・生成状態・現在選択が一致する。

## 参照と契約

[相棒の管理](../../01_requirements/03_pages/companion-settings/README.md)、[相棒をファイルから追加](../../01_requirements/03_pages/companion-import/README.md)、[相棒の制作](../../01_requirements/03_pages/companion-create/README.md)。

[requirements.md](../../01_requirements/03_pages/companion-import/requirements.md)、[requirements.md](../../01_requirements/03_pages/companion-create/requirements.md)。

契約補完の担当：`pet`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/companion/`、`server/db/migrations/companion/`、`docs/evidence/COMPANION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

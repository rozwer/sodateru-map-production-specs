# INFORMATION｜記録・共有検索と根拠の共通取得

<!-- task-id: INFORMATION -->

初期担当枠：B。担当者：koshiro。[GitHub #6](https://github.com/rozwer/sodateru-map-production-specs/issues/6)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

同じ本人・期間・閲覧条件から一覧・地図・場所詳細の材料と現在の根拠を返せる。

## 実装範囲

- 実効日時/場所、Unicode検索、条件適用後のcursor、共有地図、媒体閲覧権限とSourceRefを実装する。
- 共通の記録/共有検索と根拠取得を先に提供する。人物・友達関係の操作、共有テーマ/ルート一覧はCOMMUNITYが担当する。

## 通過条件

- 101件目以降だけが一致する検索で一覧・地図・総数が揃う。
- private/selected/public・友人状態・共有先の組合せを二本人で照合し、本文と媒体に同じ条件を適用する。状態変更のAPIを使う一連の確認はCOMMUNITYで行う。
- 訂正/削除/権限変更後のsource-checksがchanged/unavailableを返し、再起動後にも判定が同じ。

## 参照と契約

[友達の地図](../../01_requirements/03_pages/friends-map/README.md)、[友達のプロフィール](../../01_requirements/03_pages/friend-profile/README.md)、[共有する友達](../../01_requirements/03_pages/friend-picker/README.md)、[共有範囲の確認](../../01_requirements/03_pages/sharing/README.md)。

[README.md](../../01_requirements/02_common/03_information/README.md)、[04_acceptance.md](../../01_requirements/02_common/03_information/04_acceptance.md)。

実装する既存operationId：`getRecords`、`postSourceChecks`、`getSharedRecords`、`getSharedRecordsMap`。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

先行提供：RecordQuery・閲覧判定・source-checks・場所詳細の読取を最初に完成させ、PLACES・RECORDS・INSIGHTS・AIへ提供する。AIの材料読取と生成前/保存直前の根拠再検査もこの共通処理を使う。AI側で閲覧判定や版照合を複製しない。友達申請や地域投稿の管理はCOMMUNITYが続ける。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **INFORMATION.read**：記録検索・実効日時/場所・現在の閲覧条件。本人/モード/期間/閲覧条件を適用した一覧と単体の読取が実DBで一致する。
- **INFORMATION.refs**：根拠解決・閲覧判定・版/更新/削除照合。生成前と完了直前に同じ共通処理で根拠を検査し、変更と閲覧不可を区別する。
- **INFORMATION.sharing**：共有検索・地図検索・媒体閲覧。条件適用後のページ分割と共有地図が一致し、本文と媒体に同じ閲覧条件が掛かる。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/information/`、`server/db/migrations/information/`、`docs/01_requirements/04_api/fragments/INFORMATION.json`、`docs/evidence/INFORMATION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

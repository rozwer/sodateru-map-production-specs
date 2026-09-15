# INFORMATION｜記録・共有検索と根拠の共通取得

<!-- task-id: INFORMATION -->

初期担当枠：B。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

先行提供：RecordQuery・閲覧判定・source-checks・場所詳細の読取を最初に完成させ、PLACES・RECORDS・INSIGHTSへ提供する。友達申請や地域投稿の管理はCOMMUNITYが続ける。

## 編集範囲

提案path：`server/information/`、`server/db/migrations/information/`、`docs/evidence/INFORMATION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

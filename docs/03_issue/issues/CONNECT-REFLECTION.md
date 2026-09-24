# CONNECT-REFLECTION｜実接続：日記・振り返り回答・体験比較とメモ

<!-- task-id: CONNECT-REFLECTION -->

初期担当枠：A。担当者：rozwer。[GitHub #139](https://github.com/rozwer/sodateru-map-production-specs/issues/139)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-REFLECTION](UI-REFLECTION.md)の対象操作が整った画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### self-home

getMe/getRecordsの本人データから対象日・期間・記録/テーマIDを各接続済み画面へ渡す。

取消・失敗：最近の記録0件を架空データで埋めず、本人切替/閲覧拒否で旧記録を表示しない。

既存binding：`getRecords`、`getMe`。

### diary

日付/kindで読取、初回postRecords/以後同じIDのPATCHと媒体処理、REFLECTIONの日記案を接続して保存再取得する。

取消・失敗：別日の下書きを混ぜず、AI案を自動公開/保存しない。AI失敗や媒体一部失敗で本人の本文を失わない。

既存binding：`getRecords`、`postRecords`、`patchRecordsRecordId`、`getRecordsRecordIdMedia`、`postRecordsRecordIdMedia`、`deleteMediaMediaId`。

### reflection-question

REFLECTION.recordの質問/回答状態を接続し、原文を版付きprivate records(kind=memo)と固定answerRecordIdへ保存、questionの参照/状態と既存SourceRef recordを再取得で照合する。

取消・失敗：AI失敗でも独立回答を保ち、根拠変更/閲覧不可では古いquestionTextを非表示にする。expectedAttempt等の確定版を確認し、提案段階の契約を提供済みにしない。

既存binding：`getConversations`、`postConversations`、`getConversationsConversationIdMessages`、`postConversationsConversationIdMessages`。契約補完：question-state。

### reflection-history

保存済み回答/状態/参照を取得し、本人の更新操作だけで同じ回答を根拠に解釈を更新・再表示する。

取消・失敗：フィルターで状態を戻さず、元根拠の変更/削除後も独立回答を保持する。失敗時に古い質問引用を復活させない。

既存binding：`getConversations`、`getConversationsConversationIdMessages`。契約補完：question-state。

### experience-compare

comparison補完と共通保存へ対象2ID・比較文・本人判断を保存し、同じ組合せを再取得する。

取消・失敗：元記録訂正/削除/共有取消を参照状態で示し、比較対象を別記録へ入れ替えない。共通用途だけで場所/好みを同一視しない。

既存binding：`getRecordsRecordId`。契約補完：comparison。

### memo-edit

THEMES.manual/RECORDSのpresentation補完を使い、同じメモの原文/由来/利用設定を保存再取得する。

取消・失敗：由来削除と独立本文削除を分け、取消/失敗で本文を失わず、由来が非公開化したとき古い引用を出さない。

既存binding：`getRecordsRecordId`、`postRecords`、`patchRecordsRecordId`、`deleteRecordsRecordId`。契約補完：presentation。

## 通過条件

- 対象操作のUI証拠・既存API契約版・統合commitを引継ぎ、必要pathのlockが空いた範囲だけ取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-REFLECTION)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [self-home](../../01_requirements/03_pages/self-home/README.md) | `self-home-R1`, `self-home-R2`, `self-home-F01`, `self-home-F02`, `self-home-F03` | `self-home-C1`, `self-home-C2`, `self-home-FC01`, `self-home-FC02`, `self-home-FC03` |
| [diary](../../01_requirements/03_pages/diary/README.md) | `diary-R1`, `diary-R2`, `diary-F01`, `diary-F02`, `diary-F03` | `diary-C1`, `diary-C2`, `diary-FC01`, `diary-FC02`, `diary-FC03` |
| [reflection-question](../../01_requirements/03_pages/reflection-question/README.md) | `reflection-question-R1`, `reflection-question-R2`, `reflection-question-F01`, `reflection-question-F02`, `reflection-question-F03` | `reflection-question-C1`, `reflection-question-C2`, `reflection-question-FC01`, `reflection-question-FC02`, `reflection-question-FC03` |
| [reflection-history](../../01_requirements/03_pages/reflection-history/README.md) | `reflection-history-R1`, `reflection-history-F01`, `reflection-history-F02`, `reflection-history-F03` | `reflection-history-C1`, `reflection-history-FC01`, `reflection-history-FC02`, `reflection-history-FC03` |
| [experience-compare](../../01_requirements/03_pages/experience-compare/README.md) | `experience-compare-R1`, `experience-compare-F01`, `experience-compare-F02`, `experience-compare-F03` | `experience-compare-C1`, `experience-compare-FC01`, `experience-compare-FC02`, `experience-compare-FC03` |
| [memo-edit](../../01_requirements/03_pages/memo-edit/README.md) | `memo-edit-R1`, `memo-edit-F01`, `memo-edit-F02`, `memo-edit-F03`, `memo-edit-F04` | `memo-edit-C1`, `memo-edit-FC01`, `memo-edit-FC02`, `memo-edit-FC03`, `memo-edit-FC04` |

## 依存と提供物

- 着手前：元UI全体のdoneは不要。[UI-REFLECTION](UI-REFLECTION.md)の対象操作について[接続handoff](../connect-start.md)の統合済み証拠を揃え、必要pathだけ取得する。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[REFLECTION](REFLECTION.md)、[THEMES](THEMES.md)、[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[SETTINGS](SETTINGS.md)、[CORE](CORE.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [REFLECTION](REFLECTION.md)：`REFLECTION.record`、`REFLECTION.compare`。体験整理・日記・質問/回答／体験/友達比較と本人判断。
- [THEMES](THEMES.md)：`THEMES.manual`。テーマ所属・表示属性・由来付きメモの保存。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。記録検索・実効日時/場所・現在の閲覧条件／根拠解決・閲覧判定・版/更新/削除照合。
- [RECORDS](RECORDS.md)：`RECORDS.save`、`RECORDS.media`。記録の作成・単体取得・編集・削除。
- [SETTINGS](SETTINGS.md)：`SETTINGS.preferences`。プロフィール・利用設定・AI送信範囲・提案停止。
- [CORE](CORE.md)：`CORE.runtime`。同一origin起動・本人context・DB・再送/版。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/reflection/`、`docs/evidence/CONNECT-REFLECTION/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。

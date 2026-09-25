# CONNECT-COMPANION｜実接続：既存相棒の取込・管理・動作確認と選択

<!-- task-id: CONNECT-COMPANION -->

初期担当枠：A。担当者：rozwer。[GitHub #147](https://github.com/rozwer/sodateru-map-production-specs/issues/147)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-COMPANION](UI-COMPANION.md)の対象操作が整った画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### companion-settings

COMPANION.importの登録一覧/本人設定を接続し、同じpet ID・表示設定を保存再取得して実地図上に描画する。

取消・失敗：取込と選択を区別し、非表示/取消で登録物を消さない。新規制作はuser-excludedであり実装済みではない。

既存binding：ページ定義に既存bindingなし。契約補完：pet。

### companion-import

確定したZIP上限・展開制限でCOMPANION.importへ取込み、登録済み媒体と一覧/選択を保存再取得する。

取消・失敗：不正ZIP/途中失敗/取消で現在のペットや登録物を壊さず、再送で重複登録しない。50MB/旧6MiB差分は確定契約を照合する。

既存binding：ページ定義に既存bindingなし。契約補完：pet。

## 通過条件

- 対象操作のUI証拠・既存API契約版・統合commitを引継ぎ、必要pathのlockが空いた範囲だけ取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。

## ユーザー指定の今回対象外

新規相棒の制作・生成は、制作入口/画面・下書き・指示持出し・生成先設定・生成/採用ごと今回対象外（`user-excluded`）。元5要件/5受入とcompanion-settings-F03の制作部分は原文を保持する。既存Codexペットの取込・実atlas表示・管理・選択は対象。対象外は未実施であり実装済みではない。[承認と対応](../ui-connections.json#/user_exclusions/companion-create)。

## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-COMPANION)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [companion-settings](../../01_requirements/03_pages/companion-settings/README.md) | `companion-settings-R1`, `companion-settings-F01`, `companion-settings-F02`, `companion-settings-F03`, `companion-settings-F04` | `companion-settings-C1`, `companion-settings-FC01`, `companion-settings-FC02`, `companion-settings-FC03`, `companion-settings-FC04` |
| [companion-import](../../01_requirements/03_pages/companion-import/README.md) | `companion-import-R1`, `companion-import-F01`, `companion-import-F02`, `companion-import-F03` | `companion-import-C1`, `companion-import-FC01`, `companion-import-FC02`, `companion-import-FC03` |
| [companion-create](../../01_requirements/03_pages/companion-create/README.md) | `companion-create-R1`, `companion-create-F01`, `companion-create-F02`, `companion-create-F03`, `companion-create-F04` | `companion-create-C1`, `companion-create-FC01`, `companion-create-FC02`, `companion-create-FC03`, `companion-create-FC04` |

## 依存と提供物

- 着手前：元UI全体のdoneは不要。[UI-COMPANION](UI-COMPANION.md)の対象操作について[接続handoff](../connect-start.md)の統合済み証拠を揃え、必要pathだけ取得する。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[COMPANION](COMPANION.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [COMPANION](COMPANION.md)：`COMPANION.import`。既存CodexペットのZIP取込・保存・一覧・表示管理・選択。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/companion/`、`docs/evidence/CONNECT-COMPANION/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。

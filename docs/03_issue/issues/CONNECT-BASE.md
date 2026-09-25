# CONNECT-BASE｜実接続：共通UI・ナビゲーションと画面復帰

<!-- task-id: CONNECT-BASE -->

初期担当枠：A。担当者：rozwer。[GitHub #137](https://github.com/rozwer/sodateru-map-production-specs/issues/137)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-BASE](UI-BASE.md)の対象操作が整った画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### navigation

CORE本人contextと同一originの共通clientを接続し、本人/live/demo切替で旧要求を中断、遅着を破棄する。閲覧/戻るによる保存mutationがないことを通信で確認する。

取消・失敗：401/未開始、切替中の旧本人応答、再起動復帰を区別し、画面移動だけでは記録/案内を終了しない。

既存binding：ページ定義に既存bindingなし。

### ページをまたぐ受入・現状の残件

- CORE.runtime/integrationの本人開始・同一origin・共通型/通信を実shellへ接続し、CONNECT-BASE.integrationとして後続へ提供する。

## 通過条件

- 対象操作のUI証拠・既存API契約版・統合commitを引継ぎ、必要pathのlockが空いた範囲だけ取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-BASE)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [navigation](../../01_requirements/03_pages/navigation/README.md) | `navigation-R1`, `navigation-R2`, `navigation-F01`, `navigation-F02`, `navigation-F03` | `navigation-C1`, `navigation-C2`, `navigation-FC01`, `navigation-FC02`, `navigation-FC03` |

## 依存と提供物

- 着手前：元UI全体のdoneは不要。[UI-BASE](UI-BASE.md)の対象操作について[接続handoff](../connect-start.md)の統合済み証拠を揃え、必要pathだけ取得する。
- 実接続・完了前：[CORE](CORE.md)。

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。同一origin起動・本人context・DB・再送/版／機能登録入口・契約生成・型付き共通クライアント。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/app/`、`src/ui/`、`src/messages.ts`、`index.html`、`vite.config.ts`、`docs/evidence/CONNECT-BASE/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。

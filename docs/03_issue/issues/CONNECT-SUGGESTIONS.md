# CONNECT-SUGGESTIONS｜実接続：今日の希望から候補選択・行き先へ

<!-- task-id: CONNECT-SUGGESTIONS -->

初期担当枠：A。担当者：rozwer。[GitHub #141](https://github.com/rozwer/sodateru-map-production-specs/issues/141)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-SUGGESTIONS](UI-SUGGESTIONS.md)で完成した画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### self-checkin

self-checkinsの作成/更新とsuggestion-batchesを条件付きで接続し、対象日/期限/構造化条件を保存再取得して候補計算へ渡す。

取消・失敗：120分以上を上限120にせず、過去希望を当日へ自動適用しない。回答のみは候補/選択/訪問を作らず取消を保存しない。

既存binding：`getSelfCheckins`、`postSelfCheckins`、`patchSelfCheckinsCheckinId`、`postSuggestionBatches`。契約補完：checkin。

### suggestions

batchIdを保持して候補一覧/詳細を取得し、presented/viewed/selected/visitedを別に保存する。viewed:trueとviewedAtは提供された確定生成clientで接続する。

取消・失敗：条件変更後の遅着を混ぜず、GET閲覧で選択しない。viewed再送で初回時刻を変えず、表示と訪問を同一視しない。

既存binding：`getSuggestions`、`getSuggestionsSuggestionId`、`patchSuggestionsSuggestionId`。契約補完：checkin。

### suggestion-detail

suggestion PATCH/source-checks・COMMUNITYしおりを接続し、選択/保留/メモを保存再取得して同じ場所を地図/経路へ渡す。ACTIVITYの本人確認訪問と取消で達成状態を照合する。

取消・失敗：詳細閲覧だけで選択/訪問を確定しない。停止設定・候補期限・根拠変更を守り、実HTTP失敗で採用成功にしない。

既存binding：`getSuggestionsSuggestionId`、`patchSuggestionsSuggestionId`、`postSourceChecks`。契約補完：bookmark。

## 通過条件

- 元UIのdoneとlock返却後に同じfeature pathを取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-SUGGESTIONS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [self-checkin](../../01_requirements/03_pages/self-checkin/README.md) | `self-checkin-R1`, `self-checkin-R2`, `self-checkin-F01`, `self-checkin-F02`, `self-checkin-F03`, `self-checkin-F04`, `self-checkin-F05` | `self-checkin-C1`, `self-checkin-C2`, `self-checkin-FC01`, `self-checkin-FC02`, `self-checkin-FC03`, `self-checkin-FC04`, `self-checkin-FC05` |
| [suggestions](../../01_requirements/03_pages/suggestions/README.md) | `suggestions-R1`, `suggestions-R2`, `suggestions-F01`, `suggestions-F02`, `suggestions-F03` | `suggestions-C1`, `suggestions-C2`, `suggestions-FC01`, `suggestions-FC02`, `suggestions-FC03` |
| [suggestion-detail](../../01_requirements/03_pages/suggestion-detail/README.md) | `suggestion-detail-R1`, `suggestion-detail-F01`, `suggestion-detail-F02`, `suggestion-detail-F03`, `suggestion-detail-F04` | `suggestion-detail-C1`, `suggestion-detail-FC01`, `suggestion-detail-FC02`, `suggestion-detail-FC03`, `suggestion-detail-FC04` |

## 依存と提供物

- 着手前：[UI-SUGGESTIONS](UI-SUGGESTIONS.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[SUGGESTIONS](SUGGESTIONS.md)、[COMMUNITY](COMMUNITY.md)、[ROUTES](ROUTES.md)、[ACTIVITY](ACTIVITY.md)、[SETTINGS](SETTINGS.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [SUGGESTIONS](SUGGESTIONS.md)：`SUGGESTIONS.complete`。今日の条件・候補生成・選択・達成。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.knowledge`。地域の声・分類/範囲・しおり・共有単体。
- [ROUTES](ROUTES.md)：`ROUTES.basic`。基本道路経路の取得・保存・再取得。
- [ACTIVITY](ACTIVITY.md)：`ACTIVITY.growth`。訪問確認・訂正・地図の成長材料。
- [SETTINGS](SETTINGS.md)：`SETTINGS.preferences`。プロフィール・利用設定・AI送信範囲・提案停止。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/suggestions/`、`docs/evidence/CONNECT-SUGGESTIONS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。

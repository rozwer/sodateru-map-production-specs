# CONNECT-INSIGHTS｜実接続：傾向・根拠の訂正とテーマ管理

<!-- task-id: CONNECT-INSIGHTS -->

初期担当枠：A。担当者：rozwer。[GitHub #140](https://github.com/rozwer/sodateru-map-production-specs/issues/140)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-INSIGHTS](UI-INSIGHTS.md)の対象操作が整った画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### type-diagnosis

reflection summary/insightsを同期間/timeZoneで実取得し、実記録に基づく数値・根拠・reviewを同じIDで保存再取得する。

取消・失敗：欠測を0/分母に混ぜず、2体験仮説を検証済み傾向や固定人格・偉人比較・根拠なし点数として出さない。

既存binding：`getReflectionSummary`、`getInsights`、`postInsights`、`patchInsightsInsightId`。

### trend-evidence

insight/getRecord/source-checksを接続し、取得版と現在の根拠を照合して元体験を開く。

取消・失敗：更新/削除/共有取消の根拠をcurrentとして引用せず、閲覧不可本文をキャッシュから表示しない。

既存binding：`getInsightsInsightId`、`postSourceChecks`、`getRecordsRecordId`。

### trend-review

同じinsightのreviewと理由をPATCHし、再読込・再生成後の判断保持を確認する。

取消・失敗：否定した解釈を同じ根拠で復活させず、訪問事実/確認済み用途を変更しない。版競合で保存成功にしない。

既存binding：`getInsightsInsightId`、`patchInsightsInsightId`。

### themes

getThemes/getThemeとTHEMES.manualの保存結果を接続し、同一記録の複数所属と地図へのthemeId受渡しを確認する。

取消・失敗：名称/件数だけで同一テーマを推定せず、閲覧で所属を変えない。削除/失敗したテーマの旧表示を混ぜない。

既存binding：`getThemes`、`getThemesThemeId`。

### theme-edit

post/patchThemesとpresentation補完を接続し、名称/色/写真/所属を再取得して一覧と地図を更新する。

取消・失敗：取消で保存値を維持し、他テーマの同じ記録を外さない。競合時は現行版と入力を比較する。

既存binding：`getThemesThemeId`、`getRecords`、`postThemes`、`patchThemesThemeId`。契約補完：presentation。

## 通過条件

- 対象操作のUI証拠・既存API契約版・統合commitを引継ぎ、必要pathのlockが空いた範囲だけ取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-INSIGHTS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [type-diagnosis](../../01_requirements/03_pages/type-diagnosis/README.md) | `type-diagnosis-R1`, `type-diagnosis-R2`, `type-diagnosis-F01`, `type-diagnosis-F02`, `type-diagnosis-F03`, `type-diagnosis-F04` | `type-diagnosis-C1`, `type-diagnosis-C2`, `type-diagnosis-FC01`, `type-diagnosis-FC02`, `type-diagnosis-FC03`, `type-diagnosis-FC04` |
| [trend-evidence](../../01_requirements/03_pages/trend-evidence/README.md) | `trend-evidence-R1`, `trend-evidence-F01`, `trend-evidence-F02`, `trend-evidence-F03` | `trend-evidence-C1`, `trend-evidence-FC01`, `trend-evidence-FC02`, `trend-evidence-FC03` |
| [trend-review](../../01_requirements/03_pages/trend-review/README.md) | `trend-review-R1`, `trend-review-F01`, `trend-review-F02`, `trend-review-F03` | `trend-review-C1`, `trend-review-FC01`, `trend-review-FC02`, `trend-review-FC03` |
| [themes](../../01_requirements/03_pages/themes/README.md) | `themes-R1`, `themes-F01`, `themes-F02`, `themes-F03` | `themes-C1`, `themes-FC01`, `themes-FC02`, `themes-FC03` |
| [theme-edit](../../01_requirements/03_pages/theme-edit/README.md) | `theme-edit-R1`, `theme-edit-F01`, `theme-edit-F02`, `theme-edit-F03`, `theme-edit-F04` | `theme-edit-C1`, `theme-edit-FC01`, `theme-edit-FC02`, `theme-edit-FC03`, `theme-edit-FC04` |

## 依存と提供物

- 着手前：元UI全体のdoneは不要。[UI-INSIGHTS](UI-INSIGHTS.md)の対象操作について[接続handoff](../connect-start.md)の統合済み証拠を揃え、必要pathだけ取得する。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[INSIGHTS](INSIGHTS.md)、[THEMES](THEMES.md)、[INFORMATION](INFORMATION.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [INSIGHTS](INSIGHTS.md)：`INSIGHTS.summary`、`INSIGHTS.evidence`。記録/訪問に基づく期間集計／傾向・評価・根拠付き結果の保存。
- [THEMES](THEMES.md)：`THEMES.manual`、`THEMES.ai`。テーマ所属・表示属性・由来付きメモの保存／AI命名・提案の採用。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`、`INFORMATION.sharing`。記録検索・実効日時/場所・現在の閲覧条件／根拠解決・閲覧判定・版/更新/削除照合／共有検索・地図検索・媒体閲覧。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/insights/`、`src/features/themes/`、`docs/evidence/CONNECT-INSIGHTS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。

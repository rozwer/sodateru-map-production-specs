# CONNECT-EXPLORE｜実接続：街歩き相談・履歴・音声と探索候補

<!-- task-id: CONNECT-EXPLORE -->

初期担当枠：A。担当者：rozwer。[GitHub #136](https://github.com/rozwer/sodateru-map-production-specs/issues/136)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-EXPLORE](UI-EXPLORE.md)で完成した画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### ai-explore

postMapDialogues→select→結果取得/経路へつなぎ、「近くのカフェ→2番目まで歩く」で起点/candidate/result/conversation IDを一致させて保存履歴から復帰する。

取消・失敗：cancel実行後の遅着を採用せず、候補期限・0件・生成失敗を区別する。入力と同じ再送IDを保ちCodex以外へ自動切替しない。

既存binding：`postMapDialogues`、`postMapDialoguesSelect`、`postMapDialoguesCancel`、`getMapDialoguesResultsResultId`。契約補完：consult-history。

### voice-consultation

AI.voiceの実文字起こしへ録音を渡し、送信時に本人が確認した本文だけを相談API・履歴へ保存する。

取消・失敗：拒否/録音失敗/文字起こし失敗を分ける。消去/取消後は相談を送信せず、録音原本の不要な永続保存をしない。

既存binding：ページ定義に既存bindingなし。契約補完：voice。

### ai-consent

SETTINGS.preferencesのAI利用選択を接続し、明示同意時だけ確認済み本文/参照を呼出元の送信へ一度渡す。

取消・失敗：同意取消は実送信0回。古い確認内容や未確認参照を送らず、未接続時に別providerへ切り替えない。

既存binding：ページ定義に既存bindingなし。契約補完：voice。

### conversation-history

getConversations/messagesとEXPLORATIONのconsult-history補完を接続し、保存済み会話を再読込して同じ発言/結果へ復帰する。

取消・失敗：新規相談で既存会話を上書きせず、期限切れ・取消・読取失敗を区別し旧会話の遅着を混ぜない。

既存binding：`getConversations`、`getConversationsConversationIdMessages`。契約補完：consult-history。

### mist-detail

suggestion/place詳細とCOMMUNITYのしおりを実接続し、同じ候補の保存/再取得とROUTESへの受渡しを確認する。

取消・失敗：閲覧・保存・接近だけでは訪問/成長を確定せず、失効/非公開化した候補の古い説明を復活させない。

既存binding：`getSuggestionsSuggestionId`、`getPlacesPlaceId`。契約補完：bookmark。

### quest-compass

実候補/場所の座標を既存コンパス境界へ渡し、道路経路への切替に同じ対象IDを使用する。

取消・失敗：測位停止中の距離を更新したように見せず、方向拒否/取得不能を表示する。コンパス終了や接近で訪問を保存しない。

既存binding：ページ定義に既存bindingなし。

### ページをまたぐ受入・現状の残件

- TRANSFER.completeの実在場所/経路/根拠付き二案を比較・採用し、保存再取得する。先行操作に必要なPLACES.detailも接続する。

## 通過条件

- 元UIのdoneとlock返却後に同じfeature pathを取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-EXPLORE)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [ai-explore](../../01_requirements/03_pages/ai-explore/README.md) | `ai-explore-R1`, `ai-explore-R2`, `ai-explore-F01`, `ai-explore-F02`, `ai-explore-F03`, `ai-explore-F04` | `ai-explore-C1`, `ai-explore-C2`, `ai-explore-FC01`, `ai-explore-FC02`, `ai-explore-FC03`, `ai-explore-FC04` |
| [voice-consultation](../../01_requirements/03_pages/voice-consultation/README.md) | `voice-consultation-R1`, `voice-consultation-F01`, `voice-consultation-F02`, `voice-consultation-F03` | `voice-consultation-C1`, `voice-consultation-FC01`, `voice-consultation-FC02`, `voice-consultation-FC03` |
| [ai-consent](../../01_requirements/03_pages/ai-consent/README.md) | `ai-consent-R1`, `ai-consent-F01`, `ai-consent-F02`, `ai-consent-F03` | `ai-consent-C1`, `ai-consent-FC01`, `ai-consent-FC02`, `ai-consent-FC03` |
| [conversation-history](../../01_requirements/03_pages/conversation-history/README.md) | `conversation-history-R1`, `conversation-history-F01`, `conversation-history-F02`, `conversation-history-F03` | `conversation-history-C1`, `conversation-history-FC01`, `conversation-history-FC02`, `conversation-history-FC03` |
| [mist-detail](../../01_requirements/03_pages/mist-detail/README.md) | `mist-detail-R1`, `mist-detail-F01`, `mist-detail-F02`, `mist-detail-F03` | `mist-detail-C1`, `mist-detail-FC01`, `mist-detail-FC02`, `mist-detail-FC03` |
| [quest-compass](../../01_requirements/03_pages/quest-compass/README.md) | `quest-compass-R1`, `quest-compass-F01`, `quest-compass-F02`, `quest-compass-F03` | `quest-compass-C1`, `quest-compass-FC01`, `quest-compass-FC02`, `quest-compass-FC03` |

## 依存と提供物

- 着手前：[UI-EXPLORE](UI-EXPLORE.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[AI](AI.md)、[EXPLORATION](EXPLORATION.md)、[ROUTES](ROUTES.md)、[COMMUNITY](COMMUNITY.md)、[SETTINGS](SETTINGS.md)、[TRANSFER](TRANSFER.md)、[CONNECT-BASE](CONNECT-BASE.md)、[PLACES](PLACES.md)、[SUGGESTIONS](SUGGESTIONS.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [AI](AI.md)：`AI.engine`、`AI.refs`、`AI.voice`。用途登録・実行・保存・取消・結果取得／共通根拠照合を使う生成・再試行／音声文字起こし・送信確認への接続。
- [EXPLORATION](EXPLORATION.md)：`EXPLORATION.dialogue`、`EXPLORATION.discovery`。街歩きの相談・候補選択・履歴／発見カードと反応・保存。
- [ROUTES](ROUTES.md)：`ROUTES.basic`。基本道路経路の取得・保存・再取得。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.knowledge`。地域の声・分類/範囲・しおり・共有単体。
- [SETTINGS](SETTINGS.md)：`SETTINGS.preferences`。プロフィール・利用設定・AI送信範囲・提案停止。
- [TRANSFER](TRANSFER.md)：`TRANSFER.complete`。別の街への体験移転・二案比較・採用。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。
- [PLACES](PLACES.md)：`PLACES.detail`。場所詳細と本人/共有記録の合成。
- [SUGGESTIONS](SUGGESTIONS.md)：`SUGGESTIONS.complete`。今日の条件・候補生成・選択・達成。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/exploration/`、`src/features/transfer/`、`docs/evidence/CONNECT-EXPLORE/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。

# 提供と接続

[一覧](README.md) · [完了と着手](execution.md)

提供者は提供物ID・統合commit・契約版・呼出例・実API/保存/再取得証拠・残条件をIssueにまとめる。branch上の提案やmoduleテストだけを統合提供済みにしない。受け手は同じdevelop・起動/DB/本人/dataModeで実接続する。

UI-BASE.shellは実画面の部品/地図/チャット境界とshell操作。COREの実接続はCONNECT-BASE.integrationで別に提供する。UI-INTEGRATION #98の登録/組込みとAPI接続を混同せず、全体doneを新しいhard gateにしない。

## 機能別接続

| 元UI | 実接続 | source要件/受入 |
|---|---|---|
| [UI-BASE](issues/UI-BASE.md) #4 | [CONNECT-BASE](issues/CONNECT-BASE.md) #137 | 5 / 5 |
| [UI-MAP](issues/UI-MAP.md) #8 | [CONNECT-MAP](issues/CONNECT-MAP.md) #134 | 28 / 28 |
| [UI-RECORDS](issues/UI-RECORDS.md) #11 | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) #135 | 38 / 38 |
| [UI-EXPLORE](issues/UI-EXPLORE.md) #10 | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) #136 | 26 / 26 |
| [UI-ROUTES](issues/UI-ROUTES.md) #9 | [CONNECT-ROUTES](issues/CONNECT-ROUTES.md) #138 | 14 / 14 |
| [UI-REFLECTION](issues/UI-REFLECTION.md) #12 | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) #139 | 28 / 28 |
| [UI-INSIGHTS](issues/UI-INSIGHTS.md) #13 | [CONNECT-INSIGHTS](issues/CONNECT-INSIGHTS.md) #140 | 23 / 23 |
| [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) #15 | [CONNECT-SUGGESTIONS](issues/CONNECT-SUGGESTIONS.md) #141 | 17 / 17 |
| [UI-FRIENDS](issues/UI-FRIENDS.md) #14 | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) #142 | 32 / 32 |
| [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) #16 | [CONNECT-KNOWLEDGE](issues/CONNECT-KNOWLEDGE.md) #143 | 17 / 17 |
| [UI-PLUGINS](issues/UI-PLUGINS.md) #18 | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) #144 | 41 / 41 |
| [UI-SETTINGS](issues/UI-SETTINGS.md) #17 | [CONNECT-SETTINGS](issues/CONNECT-SETTINGS.md) #145 | 34 / 34 |
| [UI-COMPANION](issues/UI-COMPANION.md) #19 | [CONNECT-COMPANION](issues/CONNECT-COMPANION.md) #147 | 14 / 14 |

## 最初に通す実操作

| 操作 | 担当 | 必要提供物 |
|---|---|---|
| 検索→場所採用→再読込 | [CONNECT-MAP](issues/CONNECT-MAP.md) | `UI-BASE.shell`, `PLACES.search` |
| 手入力記録→保存→再取得/編集 | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | `UI-BASE.shell`, `RECORDS.save`, `INFORMATION.read`, `PLACES.search` |
| 基本経路の検索→保存→再表示 | [CONNECT-ROUTES](issues/CONNECT-ROUTES.md) | `UI-BASE.shell`, `PLACES.search`, `ROUTES.basic` |
| 訪問確認/取消・訂正→成長と軌跡の再表示 | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | `RECORDS.save`, `ACTIVITY.growth`, `ACTIVITY.track` |
| 手動表示/装飾の保存→再表示→AI案の採用 | [CONNECT-MAP](issues/CONNECT-MAP.md) | `MAP-CUSTOM.manual`, `MAP-CUSTOM.adopt`, `PLUGINS.state` |
| 相談→候補選択→経路→履歴復帰 | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) | `AI.refs`, `EXPLORATION.dialogue`, `PLACES.detail`, `ROUTES.basic`, `SETTINGS.preferences` |

提供元の全体完了を待たず該当出力から接続する。部分操作成功はCONNECT全体完了ではなく、残る音声/共有/媒体/条件等を同じIssueの受入に残す。

## 正本と例外の状態

共通Schema/生成clientはkoshiro、機能固有SQL/DTO/APIは各domain、地図設定の保存正本とAI採用はkaiyaのMAP-CUSTOM API/SQLite、Aは実描画/下書き/画面接続を持つ。共通処理を複製しない。

- SUGGESTIONS viewed:true/viewedAtはfragment v1.2の担当push・SQLite確認報告があるが、合成clientと統合commitの提供確認が必要（#15 comment5673934530）。GET/提示/選択/訪問を分ける。
- REFLECTIONの根拠変更時questionText非表示と独立回答保持は次版提案として受領。統合/生成確認前は提供済みとしない（#12 comment5673930982）。
- PLUGINSの6 glyph ID/iconOptionsは担当決定、次fragment v3の共通反映/統合を確認する（#18 comment5673927735）。
- HEALTH.completeと健康UI/接続は時間が余れば着手するdeferred。新規相棒COMPANION.createはuser-excluded。どちらも実装済みとしない。

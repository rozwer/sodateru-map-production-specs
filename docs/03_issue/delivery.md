# 提供と接続

[担当とIssue一覧](README.md) · [着手順と依存](execution.md)

## 引渡しの単位

Issueは36件を維持する。索引の `deliveries` はIssue内の提供チェック項目であり、別のTaskや独立した進捗台帳ではない。現時点はすべて計画。必要な提供物だけを先に統合し、元Issueの残る受入を保持する。

提供側は担当Issueコメントに「提供物ID、統合commit、契約版、呼出し例、実API・保存・再取得の証拠、残る条件」を一度まとめる。未統合branchやテスト応答だけを接続可能としない。利用側は同じdevelopの内容・起動/DB/本人/dataModeで呼び、成功済み確認は変更や具体的懸念がなければ繰り返さない。

## 最初に接続する操作

優先順であり、全員の一斉待ち合わせではない。準備済みの操作から進める。

| 利用操作 | UI担当Issue | 先に必要な提供物 |
|---|---|---|
| 検索→場所採用→再読込 | [UI-MAP](issues/UI-MAP.md) | `UI-BASE.shell`、`PLACES.search` |
| 手入力記録→保存→再取得/編集 | [UI-RECORDS](issues/UI-RECORDS.md) | `UI-BASE.shell`、`RECORDS.save`、`INFORMATION.read`、`PLACES.search` |
| 基本経路の検索→保存→再表示 | [UI-ROUTES](issues/UI-ROUTES.md) | `UI-BASE.shell`、`PLACES.search`、`ROUTES.basic` |
| 訪問確認/取消・訂正→成長と軌跡の再表示 | [UI-RECORDS](issues/UI-RECORDS.md) | `RECORDS.save`、`ACTIVITY.growth`、`ACTIVITY.track` |
| 手動表示/装飾の保存→再表示→AI案の採用 | [UI-MAP](issues/UI-MAP.md) | `MAP-CUSTOM.manual`、`MAP-CUSTOM.adopt`、`PLUGINS.state` |
| 相談→候補選択→経路→履歴復帰 | [UI-EXPLORE](issues/UI-EXPLORE.md) | `AI.refs`、`EXPLORATION.dialogue`、`PLACES.detail`、`ROUTES.basic`、`SETTINGS.preferences` |

UI-MAPとUI-RECORDSは6提供元すべてを待って最初の接続を始める構造にしない。一方、部分操作が成功しても元の画面要件・失敗/取消・再表示の受入を減らして完了扱いしない。

ROUTES.basicをAの経路UIとDの探索/提案/体験移転へ先に渡す。案内・交通・定期券・追加条件はROUTESの残項目として続け、基本経路の利用者へ不要な完了待ちを課さない。

## 役割と共通ファイル

| 担当 | 持つもの | 持たないもの |
|---|---|---|
| rozwer | 全画面・描画・端末操作・画面状態・共通クライアントの呼出し・実画面受入 | サーバーの業務判定、機能別DTO変換、地図設定の永続化 |
| koshiro | 共通Schema/API生成器の反映、共通型/通信処理、起動/登録入口、根拠の取得/権限/版照合、自担当機能 | C/Dの固有API/SQL/プロンプトの実装 |
| kaiya | 地理/経路/拡張の業務処理とAPI/保存、地図設定の保存/採用/実効表示 | 地図の描画、共通AIの実行器 |
| mattsun | AI実行/取消/結果、探索/分析等の固有処理とAPI/保存 | 根拠の閲覧判定の複製、地図設定の直接保存 |

COREで機能ごとのrouter/migration/契約断片の登録入口を一度用意する。通常の機能追加は担当の登録ファイルで完結させ、起動ファイルやAI中央分岐を機能のたびに手直ししない。動的プラグイン基盤や新しい実行基盤を増設することは求めない。

共通Schema・API生成器の反映担当は**koshiroに固定**する。既存生成器へ機能別 `fragments/<Task-ID>.json` を取り込む入口をCOREで用意し、合成OpenAPIと型/共通クライアントは生成物にする。各機能担当は固有の断片・DTO変換・SQL・実API検証を持つ。共通変更はIssueコメントで利用者と合意してからkoshiroが反映する。共有pathを一括して長期保有せず、変更単位の統合後に返す。

## 待ちと作業量

各実装セッションの実行中1件と次候補2件を、次にUIへ必要な提供物から選ぶ。提供物の統合とUI受入を開発中から進め、終盤に接続だけを集積させない。再割当は未着手の非UI機能を優先し、引継ぎコストを掛けて頻繁に担当を入れ替えない。

毎回の状態確認では、実行中の具体的作業、未提供の物、残る非UI/UIの作業量を見る。UIだけ残った場合に4人常時稼働を保証したことにはしない。空のIssue、不要な再検査、故意の提供遅延で人数を埋めない。

## 地図設定

保存正本・AI採用・プラグイン照合は[MAP-CUSTOM](issues/MAP-CUSTOM.md#地図設定の保存責任)に従う。端末には描画中の状態と下書きだけを持ち、本人/モード別の保存設定はkaiyaのAPIから取得する。共通AI仕様の採用先も同じ保存へ統一する。

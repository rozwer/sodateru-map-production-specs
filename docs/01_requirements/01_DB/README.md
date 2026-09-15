# DB索引

SQLiteの単一ファイルを使う。共通列・保存規約・更新削除の関係は [common.json](common.json)、各テーブルの定義は以下を参照する。

| テーブル | 保存する内容 | 主な操作 |
|---|---|---|
| [people](00_people.json) | 人物の表示名・紹介・アイコン | プロフィール編集 |
| [places](01_places.json) | 場所の名称・座標・建物との対応・出典 | 場所の登録・外部情報の更新 |
| [visits](15_visits.json) | 訪問先・日時・確認状態 | 訪問の登録・確認・訂正・取消 |
| [track_points](09_track_points.json) | 測位した座標・時刻・精度 | 位置観測の追加・区間削除 |
| [records](02_records.json) | 体験の文章・日記・メモ・用途・感想 | 記録の保存・編集・削除・共有 |
| [media](03_media.json) | 記録に添付した媒体の保存先・種類・順序 | 媒体の追加・並べ替え・削除 |
| [conversations](04_conversations.json) | 会話の題名・利用目的・対象 | 会話の作成・一覧・削除 |
| [messages](05_messages.json) | 会話内の発言・送受信状態 | 送信・応答保存・取消・再試行 |
| [insights](16_insights.json) | 分析・比較の結果・根拠・内容への判断 | 結果の保存・取得・評価・削除 |
| [self_checkins](11_self_checkins.json) | その時点の状態・希望の回答 | 回答の保存・訂正・削除 |
| [themes](13_themes.json) | テーマの名前と含める記録 | テーマ編集・記録の追加解除 |
| [suggestions](12_suggestions.json) | 提案の条件と選択・保留・達成状態 | 提案の保存・選択・見送り・達成確認 |
| [saved_routes](06_saved_routes.json) | 保存した地点列・経路と案内状態 | ルート編集・案内開始終了・共有 |
| [transit_passes](10_transit_passes.json) | 定期券の区間と有効期間 | 定期券の登録・編集・削除 |
| [friendships](14_friendships.json) | 二人の関係と申請状態 | 申請・承認・解除 |
| [plugin_settings](07_plugin_settings.json) | プラグインの導入・有効状態と設定 | 導入・設定変更・無効化・削除 |
| [feature_requests](08_feature_requests.json) | 機能要望の文章と公開範囲 | 投稿・編集・公開変更・削除 |

関連：[CONTEXT.md](../02_common/CONTEXT.md)／[storage-additions.sql](../02_common/references/storage-additions.sql)／[03_storage-ui.md](../02_common/01_ai/03_storage-ui.md)／[README.md](../00_stacks/README.md)。

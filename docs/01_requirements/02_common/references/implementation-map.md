# リハーサル実装との対応

照合対象はsodateru-map-rehearsal、commit 39638eacd5ccb7bfec3a11fc0c5e683d7c73999d。
以下のパスは照合したリポジトリ内の位置。処理・値・失敗条件は本仕様の本文へ展開している。

| 処理 | 照合した実装 | 継承した動作 | 本番仕様で定め直した点 |
|---|---|---|---|
| AI共通実行 | server/ai/adapter/index.ts | 材料解決、隔離ディレクトリ、SDK、構造検査、意味検査、終了時の片付け | 固定モデル設定、messagesの状態・再試行・結果保存へ統一 |
| 用途別出力 | server/ai/prompts/{extract,diary,compare,discover}.ts、server/ai-tasks/{consult,map-style}/prompt.ts | 整理・日記・比較・発見・候補・地図設定の結果構造 | 参照をrecordへ対応。analysisとthemeの出力・採用先も定義 |
| 実際のローカル地図相談 | src/app/MapConsultation.tsx、src/integrations/successor-local/map-conversation.ts | 300文字、検索2回・経路3回・判断6回、180秒、15分、候補IDで選択 | 出発点を画面で確定。4往復の履歴、本人・モード別の保持。SDKの永続実行と一時CLIを区別 |
| 名前検索 | server/features/places/{handlers,live-search}.ts | 保存済み優先、Nominatim、1,100ms間隔、OSM ID・座標の変換 | 検索中の自動INSERTを採用時INSERTへ変更。再送受付を保存 |
| 道路経路 | server/adapters/mapbox-directions/index.ts | 地点間のDirections、LineString、距離・時間、haversine比の辺配分 | 道路形状へ施設座標を追加しない。移動種別と辺属性を対応。区間geometryを保存 |
| 場所詳細 | src/features/place-detail/entry.tsx | 場所・本人記録・共有・訪問、媒体の順。部分失敗とObject URL解放 | visits経由の日時・場所、全件条件適用後のページ分割、現在権限で再読出し |
| 地域の声 | src/features/social/local-knowledge.tsx | 話題の記録と元の根拠を取得 | records.topic_keyへ対応。live/demoはDB単位で分離 |

ローカル起動はtools/local/dev.tsからVITE_LOCAL_UIを有効にし、successor-local/server.tsへ接続する。
したがって地図相談の基準経路は上表のローカル処理であり、旧AIジョブ経路だけを基準にしない。

## 保存の追加

messagesの再実行入力・構造化結果・採用先は[AI保存](../01_ai/03_storage-ui.md)、場所分類は[場所採用](../02_places-routes/01_places.md)、発見のカード・反応は[根拠保存](../03_information/03_evidence.md)に全項目を定めた。
既存DBへつなぐ追加DDLは[storage-additions.sql](storage-additions.sql)にまとめる。

## 検査の読み方

verify.mjsは形式定義と具体例、文書内リンク、参照判定や状態遷移の例を検査する。
外部接続とブラウザで確認する操作は各基盤の確認例に分けて記す。

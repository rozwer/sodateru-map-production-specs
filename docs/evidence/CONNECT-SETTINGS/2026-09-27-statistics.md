# 非健康統計・取得元の正式接続（#145）

基点445531c。CORE PR338の正式生成client（統合eceba47、getReflectionActivityStatistics/ActivityStatistics）を使用し、統計controller、DTOから既存表示値へのmapping、本番2画面登録だけ追加。集計処理・独自API・DTOをUIへ複製しない。日付境界は既存ACTIVITY localDayを再利用。

- activity-stats / data-sourcesをfullscreen登録。期間選択から正式GETを実行し、from/to/timeZoneを取得元へ保持。
- 訪問回数と場所数を区別。GPS nullは未取得、0は0 m。各取得元の状態・取得時点・最終更新・日時不明の除外を表示。
- 活動の元recordIdはAPIのdaily日付とともにdaily-trackへ渡す。取得元の日付別リンクも同一日付/timeZoneを保持。
- 期間/本人変更・非active時はAbortControllerで取消。異なるrequest keyの旧データは表示しない。失敗では0を表示せず再取得を提供。
- 既存VISUAL-SETTINGS previewの二重登録を防ぐ1行修正のため、公式add-lockで同preview/main.tsxだけ取得して修正した。

## 確認

担当専用 http://settings-145.localhost:5198、Vite --strictPort、API3195、cwd=/Users/roz/Documents/sodateru-settings-145 の隔離SQLite。CORE更新後APIを再起動。fixture fetch差替えなし。

1. 空DBの本番activity-statsで訪問0か所/GPS未取得/活動なしを表示（statistics-empty.json）。
2. 同隔離本人へ正式APIで合成記録1件（読書）・同位置GPS2点を作成（statistics-observed.json、生成clientのmethod/path/status含む）。今日へ切替で記録1/GPS2点/0 m/読書1件を表示。
3. 統計→取得元はfrom=1790434800000,to=1790521200000,timeZone=Asia/Tokyo,period=todayを保持。取得元→2026-09-27→daily-trackで同日を表示、展開して「統計接続確認の合成記録」本文を確認。戻ると今日の選択を保持。
4. 自分のAPIのみ停止し月へ切替。通信失敗＋再取得、旧数値を表示しない。API再起動→再取得で月選択を保持し2026/9/1〜9/27の実集計を再表示。
5. vitest statistics.test.ts 3件PASS（回数/場所数・null/0・元記録/日付・DST23/25時間・週/年境界・不正期間）。設定/previewからのstrict TypeScript検査PASS。

## 未達

通常メニューからactivity-statsへの起点は未接続（共通/SELF担当へ共有済み）。参照08_08_01中央・右は実見したが起点リンクは描かれておらず、新造しない。本確認は本番route以降であり通常の入口からの全導線PASSではない。全viewport/参照差分・グラフ・写真・二本人切替・遅着の実通信試験は未完。Mapbox鍵なしのためdaily-track地図は未描画。元記録IDリンクの個別クリックは未確認。#145/#17/#191を閉じない。5分締切指示により現在差分を保全してreleaseする。

## 最小の次タスク（新Issueは作らない）

1. **入口不足**: src全体検索でactivity-statsへの通常入口がなく、原本08_08_01にも起点は描かれていない。統計APIは提供済みで、追加のAPI設計は不要。次は共通/SELF担当の既存メニューにnavigate('activity-stats')を1か所接続する（境界: SELF側src/features/reflection/views.tsx等、設定側2画面は再実装しない）。確認は「通常入口→統計→戻る」1往復。
2. **写真の検証不足と環境誤認**: filechooser待機失敗と初回ポート誤認の復旧で実写真保存を確認できなかった。汎用アップロード基盤や追加スキーマは不要。次は専用hostname/strictPortで既存profile-settingsのPNG選択→保存を1回行い、reload後に同写真が表示されることを確認する（境界: src/features/settings/screens.tsxの既存写真操作、問題が再現した行だけ修正）。

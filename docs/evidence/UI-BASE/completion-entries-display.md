# 共通入口と表示設定の接続（2026-09-27）

対象 #4 / #137。変更前HEADはconnect-handoff.jsonのui_commitに記録。

- 共通メニュー既存行に日記・2つの体験を比べる・振り返りの記録を追加。初期params不要をREFLECTION担当と確認。自分を知る3カードは変更なし。
- getMeSettingsを本人/dataMode別に取得しroot文字サイズ16/20/24px、data-reduce-motionへ反映。settings-changedで再取得。切替/再取得時Abortで古い応答を棄却。getMeプロフィール再取得は既存session.tsx処理を使用。
- JS地図アニメーションは地図担当へdataset.reduceMotionとdisplay-settings-applied契約を伝達（本PRの変更外）。CSSアニメーション/transition/scrollは共有適用。
- Sheetのレイアウト再計測とfocusを分離。bottom nav高さ再計測で復元focusが失われていた実ブラウザ不具合を修正。
- fullscreen見出し上にデモ表示の領域を確保。
- CONNECT-BASEの正式開始用handoffを追加。既存証拠/契約commit固定。navigation操作はAPI非呼出のためoperation IDsなし。

## 検証

独立DB .local/app.sqlite / demo.sqlite、専用URL http://base4.localhost:3248、実API + production build、Codex IAB。既存Mapboxキーはignored envだけで使用。

- 390x844: 通常start→地図→menu→日記/比較/履歴。各実画面表示、戻るで元menu行へのfocus復元。日記既定日2026-09-27、比較レコード選択、履歴空状態を確認。
- live profile-settingsで特大/動きを減らす保存→root24px/true。320x740へ変更・reload後も24px/true、横幅320でoverflowなし。スクロールでmenu最下段start到達。
- start→demo切替で16px/falseにリセット。demo設定画面ではbadge bottom28.59px、h1 top54.20pxで非重複。
- vitest navigation-entry 3件（date/timeZone維持とback focus）、display-settings 1件（保存更新・競合refresh・本人mode切替・logout）、session-http 1件（実HTTP）全5件PASS。
- tsc --noEmit PASS、vite build PASS（既存large chunk warningのみ）。

## 残条件

#4全件完了とはしない。地図一部取得失敗表示が残る（地図担当へ共有済み）。実端末ソフトキーボード、全画面/全状態画像一致等は本変更だけで検証完了とはしない。JS地図motionは担当PR待ち。本PR後もIssue open。

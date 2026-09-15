# VISUAL-PLUGINS #186

## 基点・範囲

専用worktree `/Users/roz/.codex/worktrees/visual-plugins-186`、branch `rozwer/186-visual-plugins`。先行 #173 の `0b0d02a` を `34885ad` として保全取込。共通Shellは #172 の `presentation` を利用。APIは未接続で、操作はメモリ内のUI fixture。live保存の受入ではない。

原本: `docs/01_requirements/03_pages/<page>/{page,components,states,requirements,acceptance}.json` と `common.json`。3枚の実画像を開いた。ストアは先行担当が確認した承認画像 `/Users/roz/Desktop/sodateru-map-rehearsal/docs/requirements/mockups/grow-app-store-v1.png`（853×1844）。他は1536×1024のレビューシート内の端末領域（約400px幅）。番号・端末時計は再現対象外。

## 画面別照合

|画面|参照|実状態|差分|修正|未確認・残差|
|---|---|---|---|---|---|
|plugin-store|grow-app-store-v1.png|既存3アプリ・検索・分類|通常データあり、外側mapあり|原本根拠でfullscreen登録|最終幅別照合、開発ガイドURL未確定|
|plugin-detail|08_23_14 左|バイク・説明・プレビュー|未接続注記の高さが大きい|先行注記圧縮を保全、fullscreen|400×882で説明・CTA確認。地図は実Mapbox、原本の道路/マーカー一致は未完|
|plugin-trial|08_23_14 中|本山・原付が選択済み|通常条件データあり|fullscreen|400×882で本山/原付→東山公園/普通二輪→プレビュー→確認への引継ぎ確認|
|plugin-install|08_23_14 右|使用情報・レイヤー・凡例|既存条件引継ぎあり|fullscreen|400×882で実Mapbox・東山公園/普通二輪の表示確認。取消はHMR再読込を挟んだため判定保留|
|plugin-manage|08_23_21 左|バイクON・聖地OFFの2カード|注記が2カード目を押し下げる|注記圧縮を保全、fullscreen|独立した神社写真へ修正。地図・全操作の最終照合は未完|
|plugin-update|08_23_21 中|v1.2.0→v1.3.0|版データあり|fullscreen|400×882でv1.2.0→v1.3.0、再表示後の更新無効化、前の版へ→v1.2.0を実操作確認|
|plugin-conflict|08_23_21 右|元はバイク/聖地・凡例なし|原本はバイク/自然|自然glyph・通常fixture・3凡例ずつ、fullscreen|緑面積の塗分けは未実装、実map確認|
|feature-requests|feature-request-flow-v2 左/右|公開2投稿、本人下書き1件|写真なし、通常状態でも投稿後の本人カードあり|独立写真2点、submittedだけ本人公開カード、下書きfixture|390px実ブラウザ確認。開発ガイドURL未確定|
|feature-request-edit|feature-request-flow-v2 中|表示名・本文・公開範囲|戻る→お願いを書くで新draft IDになり入力消失|同じ作成/依頼元draft IDで再開、保存後のみ編集buffer除去|390pxの入力→戻る→再開→下書き保存→編集で本文保持を確認|

## 検証

- ローカル Vite `http://localhost:5196`、API proxy `http://127.0.0.1:3002`、デモON。UIに「UI検査・API未接続。操作は再読込で初期化されます。」を維持。
- 390×844: 公開2投稿、写真2点、下書きタブ、作成本文の戻る保持、下書き保存後のprivate選択と再編集を実操作で確認。
- 本文 `雨の日に屋根のある道を選びたい。戻る確認。` は21文字表示と同じ値で再表示。
- 全体typecheckは対象外の既存エラー（core test displayName、exploration requestId、records test unknown、reflection expectedAttempt/null）で失敗。担当featureへの診断なし。
- 既存5173の公開Mapbox設定をローカルQAへ再利用し、詳細/確認/管理/更新で実地図描画を確認。描画成功だけで原本の道路・アイコン・色面一致とは判定しない。

## 独立写真素材

参照画面の切抜きは使用していない。写真は表示用サンプルで本人/実在投稿の媒体ではない。

- coffee.jpg: [shche_ team / Unsplash](https://unsplash.com/photos/heKg-V9yHwc)、配信asset photo-1660144102328-68974117f580。
- park.jpg: [Unsplash](https://unsplash.com/photos/lh_MesNhkbI)、配信asset photo-1749686795592-0f9c83af288c。

- shrine.jpg: [kaori kubota / Unsplash](https://unsplash.com/photos/path-leading-to-a-shrine-through-cherry-blossoms-RlMZukANJTQ)、配信asset photo-1776039871465-33669931f310。青梅市の独立した参考写真で、本山の実スポット写真ではない（altに明示）。

## 締切時の引継ぎ

ユーザーの今回一回の緊急統合指示で追加磨き込み/全件待ちを終了。PR #203 の確認済み差分を提出commit保持で通常mergeする。残件: 9画面すべての原本幅＋390px最終照合、store専用原本の構図完全一致、3車種glyphの差別化、自然エリア面塗分け、各地図の原本に沿った道路/marker、開発ガイドURL、live API保存と再読込証拠。原本画像を製品画像として貼っていない。今回のモック成功をliveの受入条件完了に置換しない。

使用ポート5196（本worktree Vite）/API3002（既存QA）。最終統合commitをQAへ一度直接渡し、通常release/受信解除して終了する。残作業は本Issueで保持する。

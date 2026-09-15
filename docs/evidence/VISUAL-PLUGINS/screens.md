# VISUAL-PLUGINS #186

## 基点・範囲

専用worktree `/Users/roz/.codex/worktrees/visual-plugins-186`、branch `rozwer/186-visual-plugins`。先行 #173 の `0b0d02a` を `34885ad` として保全取込。共通Shellは #172 の `presentation` を利用。APIは未接続で、操作はメモリ内のUI fixture。live保存の受入ではない。

原本: `docs/01_requirements/03_pages/<page>/{page,components,states,requirements,acceptance}.json` と `common.json`。3枚の実画像を開いた。ストアは先行担当が確認した承認画像 `/Users/roz/Desktop/sodateru-map-rehearsal/docs/requirements/mockups/grow-app-store-v1.png`（853×1844）。他は1536×1024のレビューシート内の端末領域（約400px幅）。番号・端末時計は再現対象外。

## 画面別照合

|画面|参照|実状態|差分|修正|未確認・残差|
|---|---|---|---|---|---|
|plugin-store|grow-app-store-v1.png|既存3アプリ・検索・分類|通常データあり、外側mapあり|原本根拠でfullscreen登録|最終幅別照合、開発ガイドURL未確定|
|plugin-detail|08_23_14 左|バイク・説明・プレビュー|未接続注記の高さが大きい|先行注記圧縮を保全、fullscreen|地図描画の最終照合|
|plugin-trial|08_23_14 中|本山・原付が選択済み|通常条件データあり|fullscreen|クリックと条件保持の最終確認|
|plugin-install|08_23_14 右|使用情報・レイヤー・凡例|既存条件引継ぎあり|fullscreen|地図とキャンセルの最終確認|
|plugin-manage|08_23_21 左|バイクON・聖地OFFの2カード|注記が2カード目を押し下げる|注記圧縮を保全、fullscreen|聖地写真はまだ実map、地図最終照合|
|plugin-update|08_23_21 中|v1.2.0→v1.3.0|版データあり|fullscreen|更新・戻し操作の最終確認|
|plugin-conflict|08_23_21 右|元はバイク/聖地・凡例なし|原本はバイク/自然|自然glyph・通常fixture・3凡例ずつ、fullscreen|緑面積の塗分けは未実装、実map確認|
|feature-requests|feature-request-flow-v2 左/右|公開2投稿、本人下書き1件|写真なし、通常状態でも投稿後の本人カードあり|独立写真2点、submittedだけ本人公開カード、下書きfixture|390px実ブラウザ確認。開発ガイドURL未確定|
|feature-request-edit|feature-request-flow-v2 中|表示名・本文・公開範囲|戻る→お願いを書くで新draft IDになり入力消失|同じ作成/依頼元draft IDで再開、保存後のみ編集buffer除去|390pxの入力→戻る→再開→下書き保存→編集で本文保持を確認|

## 検証

- ローカル Vite `http://localhost:5196`、API proxy `http://127.0.0.1:3002`、デモON。UIに「UI検査・API未接続。操作は再読込で初期化されます。」を維持。
- 390×844: 公開2投稿、写真2点、下書きタブ、作成本文の戻る保持、下書き保存後のprivate選択と再編集を実操作で確認。
- 本文 `雨の日に屋根のある道を選びたい。戻る確認。` は21文字表示と同じ値で再表示。
- 全体typecheckは対象外の既存エラー（core test displayName、exploration requestId、records test unknown、reflection expectedAttempt/null）で失敗。担当featureへの診断なし。
- 本worktreeのMapboxキー未設定。地図一致は未検証として残し、統合後5173で確認する。既存5173ではMapbox描画を確認可能。

## 独立写真素材

参照画面の切抜きは使用していない。写真は表示用サンプルで本人/実在投稿の媒体ではない。

- coffee.jpg: [shche_ team / Unsplash](https://unsplash.com/photos/heKg-V9yHwc)、配信asset photo-1660144102328-68974117f580。
- park.jpg: [Unsplash](https://unsplash.com/photos/lh_MesNhkbI)、配信asset photo-1749686795592-0f9c83af288c。

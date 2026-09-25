# VISUAL-SELF 最終引継ぎ（#176 → #185 / #189）

## 成果と境界

- PR188: 5b39f2dad0cf669808adf283902a80d282712848。地図撮影媒体の受取・draft保持と写真付き提案fixture。通常merge14b5b2e。記録担当#189へ引継ぎ済み。
- PR201: cc8b1f31ac2da70c256b1196228efdad13feb0cc。振り返り6画面の通常fixture、写真失敗後の別画像回復、AI採用expectedAttemptとnull質問の明示。通常merge7928dce。
- 最終差分: self-homeのMapPreview共通初期高さ220pxによるhero内空白を、featureの290px領域へ追従する指定で修復。miniMapを100pxに固定。原本にない重複「この記録を見る」はself-homeプレビューだけ除き、今日の軌跡への見出しボタンを保持。候補カード390pxだけ写真幅36%/本文12pxになる縮小指定を外し、原本比率41%/14pxを維持。テーマ説明を14px、件数12px、写真高104pxへ調整。
- 原本12画像を実際に開いて目視。全画面画像一致済みとはしていない。健康3ページは余力未実装、新規相棒制作は対象外。
- fixtureは表示用/API未接続を明示。写真は既存UI-INSIGHTS/UI-SUGGESTIONSの独立素材であり参照画像の切抜きではない。レーダー・座標・履歴も表示テストデータ。

## 1画面1行の確認表

QA報告commit: A=d264c1552b62be08729f8d2857dff25a677cf101、B=9c608b23ace7d19ef8438f23c7f547f6ce1c4ae0。A/Bはいずれも既存5173/API3002。最終CSS差分は下記目視より後で、build確認のみ。スクリーンショットは本作業のブラウザ出力に記録。

|画面|参照原本/状態|実ブラウザURL・commit・幅・状態|差分/修正/未確認|
|---|---|---|---|
|record-create|08_07_53.png editor / 08_07_53.png place-picker / 08_07_53.png confirmation|この担当では実画面未確認 → #189|原本目視済み。records/activityはPR188を保持して#189へ引継ぎ。媒体受取2テスト成功、実機撮影・OS拒否・live保存は未確認。|
|record-edit|08_07_57.png editor|この担当では実画面未確認 → #189|原本目視済み。records/activityはPR188を保持して#189へ引継ぎ。媒体受取2テスト成功、実機撮影・OS拒否・live保存は未確認。|
|visit-confirm|08_07_57.png not-visited-selected|この担当では実画面未確認 → #189|原本目視済み。records/activityはPR188を保持して#189へ引継ぎ。媒体受取2テスト成功、実機撮影・OS拒否・live保存は未確認。|
|interpretation-correction|08_07_57.png editor|この担当では実画面未確認 → #189|原本目視済み。records/activityはPR188を保持して#189へ引継ぎ。媒体受取2テスト成功、実機撮影・OS拒否・live保存は未確認。|
|record-delete|08_17_53.png main|この担当では実画面未確認 → #189|原本目視済み。records/activityはPR188を保持して#189へ引継ぎ。媒体受取2テスト成功、実機撮影・OS拒否・live保存は未確認。|
|growth-result|08_12_03.png main|この担当では実画面未確認 → #189|原本目視済み。records/activityはPR188を保持して#189へ引継ぎ。媒体受取2テスト成功、実機撮影・OS拒否・live保存は未確認。|
|daily-track|07_40_51.png expanded-record / 08_08_01.png calendar|この担当では実画面未確認 → #189|原本目視済み。records/activityはPR188を保持して#189へ引継ぎ。媒体受取2テスト成功、実機撮影・OS拒否・live保存は未確認。|
|self-home|07_40_36.png home|http://localhost:5173/docs/evidence/VISUAL-SELF/reflection.html?page=self-home · B · 390×844 · 通常fixture|2地点/1経路の実Mapbox読み込み後と4軸レーダーを目視。地図下部の空白を最終差分で修復。修復後目視/原本853×1844/live4軸は未確認。|
|diary|08_08_05.png editor|http://localhost:5173/docs/evidence/VISUAL-SELF/reflection.html?page=diary · B · 390×844 · 通常fixture|写真3枚/入力本文を目視。実日記保存・新規AI採用・原本463×913は未確認。|
|reflection-question|08_08_05.png answering|http://localhost:5173/docs/evidence/VISUAL-SELF/reflection.html?page=question · B · 390×844 · 通常fixture|写真付き通常状態を目視。原本寸法での確認・live保存は未確認。|
|reflection-history|08_08_05.png answer-expanded|http://localhost:5173/docs/evidence/VISUAL-SELF/reflection.html?page=history · B · 390×844 · 通常fixture|回答展開/回答済み・あとで・スキップのカードを目視、4件目は下方。原本463×913とlive保存は未確認。|
|experience-compare|08_11_42.png main|http://localhost:5173/docs/evidence/VISUAL-SELF/reflection.html?page=compare · B · 390×844 · 通常fixture|写真付き通常状態を目視。原本寸法での確認・live保存は未確認。|
|memo-edit|08_11_58.png main|http://localhost:5173/docs/evidence/VISUAL-SELF/reflection.html?page=memo · B · 390×844 · 通常fixture|写真付き通常状態を目視。原本寸法での確認・live保存は未確認。|
|type-diagnosis|07_40_47.png week|http://localhost:5173/docs/evidence/UI-INSIGHTS/preview/index.html?page=type-diagnosis · A/B · 390×844 · 通常fixture|5軸/根拠写真3枚の構成を390px目視。原本853×1844未確認。正式6軸Schemaと原本5軸は異なりlive側axes=[]を保持。|
|trend-evidence|08_11_42.png main|http://localhost:5173/docs/evidence/UI-INSIGHTS/preview/index.html?page=trend-evidence · A/B · 390×844 / 512×1024 · 通常fixture|原本の主要カード/選択状態を目視。独立写真のため同一画像ではない。liveデータ/保存は未確認。|
|trend-review|08_11_42.png main|http://localhost:5173/docs/evidence/UI-INSIGHTS/preview/index.html?page=trend-review · A/B · 390×844 / 512×1024 · 通常fixture|原本の主要カード/選択状態を目視。独立写真のため同一画像ではない。liveデータ/保存は未確認。|
|themes|08_11_58.png main|http://localhost:5173/docs/evidence/UI-INSIGHTS/preview/index.html?page=themes · A/B · 390×844 / 512×1024 · 通常fixture|原本の主要カード/選択状態を目視。独立写真のため同一画像ではない。liveデータ/保存は未確認。 最終文字/写真寸法変更後の目視は未確認。|
|theme-edit|08_11_58.png main|http://localhost:5173/docs/evidence/UI-INSIGHTS/preview/index.html?page=theme-edit · A/B · 390×844 / 512×1024 · 通常fixture|原本の主要カード/選択状態を目視。独立写真のため同一画像ではない。liveデータ/保存は未確認。|
|self-checkin|08_11_47.png main|http://localhost:5173/#/self-checkin · 当時QA448a857報告 · 390×844 · demo/空入力|原本は入力済み。選択済みfixtureは作成済みだがこの状態の実ブラウザ目視/保存は未確認。|
|suggestions|08_11_47.png main|http://localhost:5173/docs/evidence/VISUAL-SELF/suggestions.html · A · 390×844 · 写真付き通常fixture|2候補→詳細へ実際に移動し、写真/時間/確認事項を目視。live候補/API保存・原本512×1024は未確認。 最終写真比率/本文サイズ変更後目視は未確認。|
|suggestion-detail|08_11_47.png main|http://localhost:5173/docs/evidence/VISUAL-SELF/suggestions.html · A · 390×844 · 写真付き通常fixture|2候補→詳細へ実際に移動し、写真/時間/確認事項を目視。live候補/API保存・原本512×1024は未確認。|

## 検証

- capture-handoff.test.tsx: StrictMode/確認→編集/再mountでFile保持、scope分離/空入力の2件成功。
- photo-recovery.test.tsx: 前の画像エラー→別URL表示の1件成功。
- 製品入口、reflection.html、suggestions.htmlをまとめてVite build成功。最終CSS変更後も同じ対象をbuild。
- 全体typecheckは既存CORE/companion/exploration/friends/records試験の型差分と新規AI日記のIf-Match必須問題で未完。新規AI採用問題はserver/features/reflection/integration.test.tsにも既存境界として記録されている。

## 未着データ索引（Shell #172からの引継ぎ）

- 参照索引: docs/evidence/VISUAL-SHELL/screens.md、最終commit bea2b70eec48a2c7f8339391436d04c6bb8510eb。
- 受領済C: ROUTES PR194 / 3f1678d、visual-fixture.{mjs,md}の3地点2区間2候補。#174へ転送済み。PLUGINS所在は#172コメント5674438674→#186コメント5674452599へ転送済み。
- 未着B #22 / D #34: 元返信先#172。追加催促しない。SELF: 本人の写真/原本4・5軸/提案2候補。正式AnalysisAxisはdetour/newPlace/rest/alone/longStay/farTripで、原本5軸へ勝手に改名しない。
- SETTINGS #191: profile通常値/icon/停止place photos/非健康統計operation。RECORDS #189: Place/Visit/Track/Growth/Insight対応ID・写真・複数地点。
- #189からShellへの報告ではdemo写真保存→再表示→編集を確認。これは他担当の報告であり本担当の実測ではない。実機撮影・OS拒否・live保存は未確認。
- 締切指示により未着分を待たず公開してclaimを通常返却。未確認項目は再開担当が現行QA/Scopeで確認する。

## 2026-09-25 再開確認（#185）

基点は取得済み `origin/develop` の専用 worktree `mattsun/185-visual-self-continue`、修正 commit `16704c6`。390×844 Chromium、製品 URL `http://127.0.0.1:5173/#/<画面>`、ローカル API `127.0.0.1:3001` のデモ本人で確認した。画面別の製品画像は [product-captures-2026-09-25](product-captures-2026-09-25/manifest.json)、表示確認用の通常 fixture は [captures-2026-09-25](captures-2026-09-25/manifest.json)。後者は **API 未接続** であり、製品の保存・再取得の証拠ではない。両撮影スクリプトは同ディレクトリに保存した。製品直接 URL は必要 ID や日付を与えない状態も含むため、到達だけで受入完了とはしない。

|画面|390px製品 / fixture|今回の実施と残件|
|---|---|---|
|self-home|[製品](product-captures-2026-09-25/self-home-390.png) / [fixture](captures-2026-09-25/self-home-390.png)|原本853×1844を再目視。製品は共通 `NavigationCards` に置換され feature の `SelfHomeScreen` が mount されない。Mapbox接続設定なし。#300の[記録](https://github.com/rozwer/sodateru-map-production-specs/issues/300#issuecomment-5830836984)と共通Shell #4へ[連絡](https://github.com/rozwer/sodateru-map-production-specs/issues/4#issuecomment-5830867736)。3入口はカード表示のみで原本の地図/診断プレビュー受入は未達。|
|diary|[製品](product-captures-2026-09-25/diary-390.png) / [fixture](captures-2026-09-25/diary-390.png)|当日の空状態と写真3枚の表示fixtureを撮影。実写真選択/削除、AI採用、保存再取得、原本幅は未確認。|
|reflection-question|[製品](product-captures-2026-09-25/reflection-question-390.png) / [fixture](captures-2026-09-25/reflection-question-390.png)|製品0問と回答済み表示fixtureを撮影。本人回答・あとで・スキップ・元記録の実API再取得は未確認。|
|reflection-history|[製品](product-captures-2026-09-25/reflection-history-390.png) / [fixture](captures-2026-09-25/reflection-history-390.png)|製品0件と複数件fixtureを撮影。実データfilter/展開・原本幅は未確認。|
|experience-compare|[製品](product-captures-2026-09-25/experience-compare-390.png) / [fixture](captures-2026-09-25/experience-compare-390.png)|製品の未選択と2件fixtureを撮影。異なる実recordIdでの保存・再取得は未確認。|
|memo-edit|[製品](product-captures-2026-09-25/memo-edit-390.png) / [fixture](captures-2026-09-25/memo-edit-390.png)|デモAPIで新規保存→ `recordId` 付きURL→reload後に名前/本文を再表示。[reload画像](memo-edit-product-reload-390.png)。由来/キーワード/削除/競合/原本幅は未確認。|
|type-diagnosis|[製品](product-captures-2026-09-25/type-diagnosis-390.png) / [fixture](captures-2026-09-25/type-diagnosis-390.png)|製品デモの5軸表示と根拠3件を[スクロール後](type-diagnosis-product-390.png)に撮影。原本853×1844、別本人データ、正式結果の軸契約は未確認。|
|trend-evidence|[製品](product-captures-2026-09-25/trend-evidence-390.png) / [fixture](captures-2026-09-25/trend-evidence-390.png)|IDなし直接URLは通信失敗を表示。fixture通常状態を撮影。実結果ID・元記録の保存/閲覧権限喪失は未確認。|
|trend-review|[製品](product-captures-2026-09-25/trend-review-390.png) / [fixture](captures-2026-09-25/trend-review-390.png)|タイプ診断から `choice=unsure` で遷移し、理由をデモAPI保存→reload後に同文を確認。[reload画像](trend-review-product-reload-390.png)。他の選択/競合/原本幅は未確認。|
|themes|[製品](product-captures-2026-09-25/themes-390.png) / [fixture](captures-2026-09-25/themes-390.png)|製品0件と通常fixtureを撮影。同じthemeIdで一覧/地図を往復する実データ確認は未実施。|
|theme-edit|[製品](product-captures-2026-09-25/theme-edit-390.png) / [fixture](captures-2026-09-25/theme-edit-390.png)|新規空フォームと通常fixtureを撮影。実写真/AI命名採用/取消/保存/競合は未確認。|
|self-checkin|[製品](product-captures-2026-09-25/self-checkin-390.png) / [fixture](captures-2026-09-25/self-checkin-390.png)|製品空フォームと入力済fixtureを撮影。デモAPIでの回答のみ保存は限定テスト2件成功、実ブラウザでは未実施。|
|suggestions|[製品](product-captures-2026-09-25/suggestions-390.png) / [fixture](captures-2026-09-25/suggestions-390.png)|条件なし0件と写真付き2候補fixtureを撮影。条件変更→実候補の一連操作は未確認。|
|suggestion-detail|[製品](product-captures-2026-09-25/suggestion-detail-390.png) / [fixture](captures-2026-09-25/suggestion-detail-390.png)|IDなし直接URLと通常fixtureを撮影。実候補からの選択/保留/見送り/メモ/地図placeId引継ぎは未確認。|

### 今回の限定検証と明示した未達

- `MemoScreen` は新規保存後に `recordId` をURLへ残す。`MemoScreen.test.tsx` 1件成功、製品デモAPIで保存→reload後の同一ID本文再表示を目視。
- `ReviewScreen` はrouteの `choice=unsure` と保存済み理由を同時に復元する。`screens.test.tsx` 1件成功、製品デモAPIで理由保存→reloadを目視。
- 既存 `suggestions/screens.test.tsx` は jsdom 指定で2件成功。全体 `bun run typecheck` は scope外の CORE/exploration/friends/tools と、既報の diary AI採用 `If-Match` 型契約で失敗。今回変更ファイルの型エラーは出ていない。
- 本worktreeには Mapbox 接続設定がなく、製品・fixtureとも実地図は表示できなかった。原本幅、PC幅、異なる2組の通常データ、空/読込/写真失敗/権限喪失/長文/競合、文字200%、ソフトキーボード、戻りscroll/focus、全14画面の実API保存・取消・再取得は未達。スクリーンショットの画面到達を完成扱いしない。

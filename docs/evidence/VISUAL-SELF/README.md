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

## 2026-09-25 追加確認（#185）

`mattsun/185-visual-self-followup` の Chromium で、14画面の**表示fixture/API未接続**を各 `page.json` の参照原本サイズとPC 1440×900で撮影した。撮影条件・参照元・結果28枚は[manifest](captures-widths-2026-09-25/manifest.json)、再実行手順は[capture-widths.mjs](capture-widths.mjs)。原本は複数端末を並べたレビューシートであるため、1536×1024のfixtureは中央の単一端末表示となる。構成の照合は可能だが、キャンバス全体の画像一致ではない。独立した写真素材も同一ではない。地図表示はMapbox設定不足で失敗した。

|画面|原本寸法のfixture / PC 1440×900|原本との目視差分・範囲|
|---|---|---|
|self-home|[853×1844](captures-widths-2026-09-25/reference/self-home.png) / [PC](captures-widths-2026-09-25/desktop/self-home.png)|入口とレーダーの構成は表示。原本の実地図、4軸の実データ、製品のfeature画面到達は未達。|
|diary|[463×913](captures-widths-2026-09-25/reference/diary.png) / [PC](captures-widths-2026-09-25/desktop/diary.png)|写真付きfixture本文を表示。原本写真と異なる。|
|reflection-question|[463×913](captures-widths-2026-09-25/reference/reflection-question.png) / [PC](captures-widths-2026-09-25/desktop/reflection-question.png)|回答中の主要構成を表示。本人回答の実保存は未確認。|
|reflection-history|[463×913](captures-widths-2026-09-25/reference/reflection-history.png) / [PC](captures-widths-2026-09-25/desktop/reflection-history.png)|複数カードを表示。実履歴の絞込・展開は未確認。|
|experience-compare|[1536×1024](captures-widths-2026-09-25/reference/experience-compare.png) / [PC](captures-widths-2026-09-25/desktop/experience-compare.png)|中央1画面表示。異なる実記録2件の保存は未確認。|
|memo-edit|[1536×1024](captures-widths-2026-09-25/reference/memo-edit.png) / [PC](captures-widths-2026-09-25/desktop/memo-edit.png)|中央1画面表示。原本写真と異なる。|
|type-diagnosis|[853×1844](captures-widths-2026-09-25/reference/type-diagnosis.png) / [PC](captures-widths-2026-09-25/desktop/type-diagnosis.png)|5軸と根拠カードを表示。正式6軸契約との照合は残る。|
|trend-evidence|[1536×1024](captures-widths-2026-09-25/reference/trend-evidence.png) / [PC](captures-widths-2026-09-25/desktop/trend-evidence.png)|中央1画面表示。実結果IDでの閲覧は未確認。|
|trend-review|[1536×1024](captures-widths-2026-09-25/reference/trend-review.png) / [PC](captures-widths-2026-09-25/desktop/trend-review.png)|中央1画面表示。fixtureの選択内容は原本と同一データではない。|
|themes|[1536×1024](captures-widths-2026-09-25/reference/themes.png) / [PC](captures-widths-2026-09-25/desktop/themes.png)|3テーマのカード構成を表示。原本と異なる写真、中央1画面表示。|
|theme-edit|[1536×1024](captures-widths-2026-09-25/reference/theme-edit.png) / [PC](captures-widths-2026-09-25/desktop/theme-edit.png)|入力・色・関連記録・写真の構成を表示。原本写真と異なる。|
|self-checkin|[1536×1024](captures-widths-2026-09-25/reference/self-checkin.png) / [PC](captures-widths-2026-09-25/desktop/self-checkin.png)|入力済みの選択状態を表示。原本は複数端末のレビューシート。|
|suggestions|[1536×1024](captures-widths-2026-09-25/reference/suggestions.png) / [PC](captures-widths-2026-09-25/desktop/suggestions.png)|写真付き2候補fixture。実候補取得は下記provider設定で停止。|
|suggestion-detail|[1536×1024](captures-widths-2026-09-25/reference/suggestion-detail.png) / [PC](captures-widths-2026-09-25/desktop/suggestion-detail.png)|fixture詳細を表示。実候補IDでの保存・再取得は未確認。|

製品デモAPI（127.0.0.1:3001）でも次の操作を実施した。fixture撮影と区別する。

- 日記: 2026-09-25の本文保存→再読み込み→9/24へ移動→9/25へ戻って同文を確認。[390px](diary-product-reload-390-2026-09-25.png)、[320px](diary-product-320.png)。写真追加・AI下書き採用は未確認。
- テーマ: 名称・説明・関連記録1件を新規保存し、`themeId` 付き一覧を再読み込みして同文・件数を確認。編集画面にも同内容を復元。名称を一時変更してキャンセルすると保存済み名称が残った。[390px](themes-product-reload-390.png)、[1440px](themes-product-1440.png)。写真選択・削除・競合は未確認。
- セルフチェックイン: 「今の状態」を保存し、POST 201→同じIDのGET 200→再読み込み後の復元を確認。[390px](self-checkin-product-reload-390.png)、[512px](self-checkin-product-512.png)。回答から「この条件で探す」は「道路providerの接続設定がありません」を表示し、実候補生成・詳細操作は未達。初回の画面外ボタンクリックはAPI要求が出ず、スクロールして再操作後に保存できたため、初回の入力は保存済みとは扱わない。

今回の追加は撮影スクリプトと証拠のみ。製品コードは変更していない。既存の全体typecheck失敗は上記のままで、追加の受入完了を宣言しない。

## 2026-09-25 feature再開（#185）

テーマ編集を一度開き、未編集のまま別画面へ移動して同じテーマへ戻ると、APIが更新後のテーマを返していても古いフォームが残ることを再現した。`ThemeEditScreen` が取得後に `draft` の存在だけで再読込を捨てていた。**未保存の入力がある場合だけ**その下書きを保持し、未編集時は取得結果と版をフォームへ反映するよう修正。`src/features/themes/screens.test.tsx` は画面の非表示→再表示とAPIの版更新を再現し、修正前は旧名が残って失敗、修正後は更新後の名前を表示して成功した。テーマの保存・キャンセルの実デモAPI確認は上記PR #315に記録済み。

限定確認: 新規テスト1件成功、`bun run typecheck` 成功、`bunx vite build` 成功。以前のtypecheck失敗はこの基点 `cb32b24` では再現しなかった。

環境の一度限りの照合: 元cloneの既存 `.env` からMapboxトークンを**値を出さずread-onlyでプロセス環境に渡して**390px製品を再確認した。地図領域は表示されたが「地図の一部を取得できませんでした」となった。同じ既存値をサーバーが要求する `MAPBOX_ACCESS_TOKEN` にも渡すと「道路providerの接続設定がありません」は解消したが、デフォルト地点の候補生成は「指定地点間の道路経路がありません」で失敗した。実候補・詳細・地図引継ぎの成功確認には至っていない。設定ファイル・秘密値・provider実装は変更していない。

## 2026-09-25 比較2件の保存経路（#185）

`origin/develop` の `d6f8d91` から専用worktreeで着手。390×844の製品デモ本人で `#/record-create` から本文の異なる体験記録2件（海辺・図書館）を保存した後、`#/experience-compare` に**直接到達**して比較を作成した。共通入口からの通常導線受入ではない。修正前はPOST/GETで比較保存成功を表示してもURLが `#/experience-compare` のままで、reload後に2件の選択・共通点・違いが空になった。

`CompareScreen` は保存後のGETで得た `comparisonId` を経路に残すよう修正。再保存では既存IDを保つ。`CompareScreen.test.tsx` の再現テストは修正前に失敗、修正後に成功。実デモAPIでは異なる2件を再選択して保存→URL `comparisonId` 付与→reload後に同じ2件と両本文を再表示した。2件目のカードから本人の `recordId` 付き記録編集へ移動し、画面の戻る操作で同じ比較ID・本文へ復帰した。

|幅・状態|製品画像|観察|
|---|---|---|
|390×844・保存再読込後の上部|[390px上部](compare-product-saved-390-top.png)|2件の実記録、写真なし・場所なしをそのまま表示。|
|390×844・保存再読込後の下部|[390px下部](compare-product-saved-390-bottom.png)|保存済み共通点・違いと元記録の操作を表示。|
|参照原本1536×1024|[製品1536px](compare-product-saved-reference-1536.png)|原本は複数端末のレビューシート、製品は左側の単一画面。実地図は設定なし。|
|PC 1440×900|[製品1440px](compare-product-saved-pc-1440.png)|左側パネルを撮影。下部操作はスクロール領域の下方。|

限定確認: `bunx vitest run src/features/reflection/CompareScreen.test.tsx --environment jsdom` 1件成功、`bun run typecheck` 成功、`bunx vite build` 成功。今回は比較保存・元記録往復に限定し、原本写真付きデータ、権限喪失・競合、共通入口、他13画面の受入は未達のまま。

## 2026-09-25 メモのキャンセル状態（#185）

メモのキャンセルは保存済みの名前・本文などのフォームだけを戻していた。画面は経路から離れても保持されるため、未確定キーワード入力欄・入力値と削除確認が同じ経路へ戻った際に残る。新規/既存メモとも未確定のキーワードを消し、入力欄と削除確認を閉じるよう修正した。保存済みキーワードはフォームとともに復元する。新規作成中の失敗済み要求もキャンセル時に破棄し、次の作成では新しいIDと冪等キーを使う。

`MemoScreen.test.tsx` に既存メモの入力途中・削除確認→キャンセルと、新規メモの失敗済み作成要求→キャンセルの回帰テストを追加し、各テストの修正前の失敗、修正後の成功を確認した。390×844の製品デモ画面でも `#/memo-edit` へ直接到達し、未確定キーワードを入力→キャンセル→同一タブで同じ経路を再表示し、入力欄が閉じて値が消えた状態を[撮影](memo-cancel-reopen-390-2026-09-25.png)した。直接経路での確認であり、共通入口からの到達・保存済みメモの削除・キャンセル後の実API再取得は今回のブラウザ確認に含まない。

限定確認: `MemoScreen.test.tsx` 3件、`CompareScreen.test.tsx` 1件成功、`bunx vite build` 成功。比較テストの部分的なrecord fixture型宣言を修正した。全体 `bun run typecheck` は `server/core/core.test.ts`、`exploration/flow.ts`、`friends/screens.tsx`、`reflection/DiaryScreen.tsx`、`tools/local/dev.ts` の既存型差分で失敗し、今回変更したメモ/比較ファイルのエラーは出ていない。

## 2026-09-25 傾向レビューの再表示（#185）

未編集の傾向レビューを離れた後、同じ経路へ戻るとAPIが新しい判断・理由を返しても古い下書きが表示された。画面が保持される設計に対し、取得後の初期化が `draft` の存在だけで再取得内容を捨てていた。本人が編集中のときは入力を保持し、未編集または保存済みのときはAPIの判断・理由を再表示するよう修正した。競合後に同じ判断が既に保存されていた場合も保存済みとして扱う。

`screens.test.tsx` の再表示テストは修正前に旧理由が残って失敗し、修正後に最新値を表示した。入力途中の理由を保持するケースと、理由の保存後に別経路から更新された値を再取得するケースも通過した。

製品デモ本人・390×844で、2026/9/21〜9/25の同一傾向を使い、選択・理由を保存後、異なる `choice` 付きの直接経路で判断を更新した。APIの同一 `insightId` のPATCH 200→GETで `review=agree`、更新後の理由、版5を確認し、同一タブで元の `choice` なし経路へ戻ると[最新値を表示](trend-review-return-latest-390-2026-09-25.png)した。経路の切替はブラウザ自動操作で行ったため、共通入口からの通常導線全体の受入ではない。Mapbox設定がなく実地図は表示していない。

限定確認: `screens.test.tsx` 3件成功、`bunx vite build` 成功。全体 `bun run typecheck` は上記と同じ別箇所の型差分で失敗し、今回変更したinsightsファイルの型エラーは出ていない。残り13画面を含む#185の受入は継続中。

## 2026-09-25 メモ削除後の同一経路（#185）

保存済みメモを削除して地図へ移動した後、保持された編集画面に戻ると、APIが同じ `recordId` を見つけられなくても削除前の名前・本文と削除操作が残った。削除成功時に保持画面の記録・フォーム・候補・削除確認を破棄し、再取得できない編集画面では保存を無効にした。別のメモや由来の元記録は削除しない。

`MemoScreen.test.tsx` に削除→画面非表示→同じ経路の再表示を追加。修正前は削除前本文が残って失敗し、修正後は本文なし・削除操作なし・保存無効で成功した。製品デモ本人でも `#/memo-edit` の直接経路から新規メモを保存し、`recordId` 付き経路で削除→ `#/personal-map` へ遷移→同一IDの編集経路へ再到達した。GETは「記録が見つかりません」を返し、[390×844画面](memo-deleted-return-390-2026-09-25.png)は旧本文を表示せず、再試行案内と保存無効を表示した。共通入口からの通常導線確認ではない。

限定確認: `MemoScreen.test.tsx` 4件成功、`bunx vite build` 成功。全体 `bun run typecheck` は上記と同じ別箇所の型差分で失敗し、今回変更したメモファイルの型エラーは出ていない。地図はMapbox設定がなく表示不可。全14画面の受入完了は宣言しない。

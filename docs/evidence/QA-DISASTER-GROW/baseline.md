# 防災・アプリ育成の独立UI検証 — 2026-09-15 初回

## 判定

現配信の防災導線は未成立。導入後の「地図で使う」は通常地図に戻り、防災の地域・layer・凡例・更新へ到達できない。アプリの試用・導入・OFF・更新・削除はUI fixture内で操作できるが、再読込後の保存は成立しない。これは製品の合格報告ではない。

## 対象と分離

- 配信checkout: `/Users/roz/.codex/worktrees/qa-visual-40`、branch `rozwer/40-visual-qa`、HEAD `2155430f137a69964d58d96a8507b192d2e7f15f`（運用担当から確認）。
- UI `http://127.0.0.1:5173/`、API `http://127.0.0.1:3002/`。独立iabタブ。1536×1024、390×844。
- 既存デモ本人「さやか」。`X-Data-Mode: demo` + `sodateru_session_demo`、profileKey=self、DB `/Users/roz/.codex/worktrees/qa-visual-40/.local/demo.sqlite`。live DBは変更しない。
- ストアには「UI検査・API未接続。操作は再読込で初期化されます。」、地図には「模擬プレビュー・実データではありません」を表示。基盤地図はMapbox、重ねる地点は模擬。
- 証拠作業base HEAD `55a6ff215ceaf15e48729b06a08562c099e01324`。Task QA-DISASTER-GROW / Issue #217。編集は本ディレクトリのみ。共有サーバー起動停止なし。

## 原本と比較条件

- `docs/01_requirements/03_pages/plugin-detail/page.json`、plugin-trial、plugin-install：原本 `references/Codex 画像 2026年9月15日 08_23_14.png`、1536×1024内の各512×1024 region。実画像を目視確認。
- plugin-manage、plugin-update：原本 `references/Codex 画像 2026年9月15日 08_23_21.png`、各512×1024 region。
- 現配信を1536×1024にすると一つの試用フォームが全幅に伸びる。原本の独立した縦パネルの密度・余白とは異なる。390pxでは管理画面のdocument scrollWidth=390、innerWidth=390。
- リハーサルcheckout HEAD `39638eacd5ccb7bfec3a11fc0c5e683d7c73999d`。`src/features/extensions/DisasterApp.tsx` と `docs/evidence/R-THEMES/disaster-basin-390.png` を照合。390×844の既存証拠には山・川・流域／街・避難場所、地形凡例、雨雲、取得時点、街の地図へ復帰がある。本配信には対応入口がない。
- リハーサルの既存URLは運用担当が確認できず、同時刻・同状態の再実操作比較は未確認。保存済み画像・ソースを現時点の実行成功とは扱わない。`ia-installed-390.png` は導入0件の既存画像であり、今回の2〜3件状態との画像一致判定には使用しない。

## 実操作結果

| 導線・状態 | 幅 | 結果 |
|---|---:|---|
| 地図→メニュー→アプリを育てる |1536| ストア到達。バイクON、聖地OFF、防災未導入の3件。 |
| 防災詳細→試してみる |1536| URLはfixture-disasterのまま「バイクマップを試す」。車種・高速道路が混入。 |
| 地域を東山公園へ変更→プレビュー→導入確認 |1536| 東山公園の文字は引継ぐ。地図は本山エリアの模擬2地点1経路、道路条件の凡例・レイヤー。防災固有表示なし。 |
| 導入する→管理 |1536| 防災がONとして追加、東山公園表示。「UI fixture・未保存」を明示。 |
| 防災の地図で使う |1536| `#/map?pluginId=fixture-disaster` の0地点の通常地図。地域/layer/凡例/更新は未到達。 |
| 戻る→防災OFF |390| checkbox OFF、0地点、地図で使うdisabled。データ削除の操作ではない。 |
| バイク更新 v1.2.0→v1.3.0 |390| 管理へ戻りv1.3.0への切替通知。UI fixture内の結果。 |
| 防災更新→削除→確認 |390| 確認は導入設定だけの削除と明示。実行後、防災が管理一覧から消える。更新画面見出しと版説明にはバイク用情報が残る。 |
| 再読込→バイク更新 |390| 現在版がv1.2.0に初期化。API/DB保存を合格にできない。 |

## 具体再現を送付した担当

- GROW-UI #215: [防災へのバイク条件混入・幅・地域プレビュー](https://github.com/rozwer/sodateru-map-production-specs/issues/215#issuecomment-5674694222)
- DISASTER-UI #219: [導入後に通常地図へ戻る](https://github.com/rozwer/sodateru-map-production-specs/issues/219#issuecomment-5674697710)

両件は既存修復担当の範囲。重複Issueを増やさない。以後は確定commitの共有配信反映時だけ差分を検証する。

## 未確認

専用防災の地域選択・layer・凡例・更新・取得失敗・戻る、実データとの重ね合わせ、API/DB保存再表示、リハーサルの現時点再実操作、多数データ状態、全画面の原本一致。fixtureの成功や本証拠PRの統合を、これらの機能完成に数えない。

## 画像

- `baseline-disaster-install-1536.png`: 防災IDの導入確認に道路条件を表示。
- `baseline-disaster-open-normal-map-1536.png`: 防災を使う後の通常地図。
- `baseline-manage-390.png`: 解除・再読込後の管理画面。
- `baseline-update-reset-390.png`: 再読込後にv1.2.0へ戻った更新画面。

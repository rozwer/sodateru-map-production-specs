# 防災画面の接続・検証

## 第1提出

- src/features/disaster/screens.tsx: disasterScreens / DisasterScreen、id disaster-map、既存fullscreen composition。
- data #214の生成DTO/hookを使用。地域/レイヤー変更は既存PluginSettings、導入はtrial→確認→create、有効停止は既存version付きpatch。
- 保存結果の画像はclipDisasterRasterで選択地域にcrop後、ui/map-state.tsへ渡す。停止・変更中・scope変更でclearし、遅着cropは破棄する。
- 模擬trialは明示表示しlive DisasterViewへ変換しない。live画像の出典/取得時刻/提供時刻/解析時点と欠測を分ける。
- リハーサルCSSとshield等アイコン/地図中心構図を流用。元のmap-hostへの全体CSS副作用は取り込まない。

## 確認済み

- DOM操作テスト1件: providerErrorでも詳細/出典/未知時点を確認でき、地域選択・最後のlayer維持・停止・再試行が動く。
- 対象strict型検査成功（screens/panel/map-state）。
- Vite build成功。ただしこの時点ではplugins入口未登録のため全体導線の証拠ではない。
- 全体typecheckは既存core/record/reflection/exploration/devの型診断18件。防災対象の型診断なし。

## 未確認・連携中

- #215: plugins export配列へdisasterScreens追加、ストア/管理からdisaster-mapへ接続。
- #222: BridgeMap/MapRendererがuseDisasterMapDisplayの画像/geometryをMapSceneへ渡す。専任pathのため本PRで編集していない。
- 390/1536px実ブラウザ・導入/更新/停止/戻る・再読込の実確認は上記統合後に実施。現時点ではUI全体完了としていない。
- 避難所/流域/警報/雨雲時間軸の最小差分をC #30へ相談済み（comment 5674714669）。既存DTO外の機能は未接続。

## 第2差分とローカル実操作

- 既存panel+toolbarへ変更。共通常駐Mapboxを背景に使い、専用Mapboxインスタンスを削除。共通Schema追加なし。防災のactive panelだけを局所CSSで配置する。
- 担当限定のVite5187/API3017と独立.local SQLite/本人領域で、ブラウザから試用→導入確認→設定保存→情報更新を操作。GSI/JMAの洪水/地形/降水が取得済み、降水解析時点2026-09-15 13:35 JST、取得13:37 JSTを別表示。
- 390x844で実canvas 1個、横overflowなし、下panel幅390/高さ354.48。再表示で保存された3layerと取得時点を復元。
- この確認は専用exportをSessionRootへ渡す担当検査入口。通常plugins入口は#215の次差分反映待ち。
- demo fixtureのlabel/warningsを省略せず表示。live DisasterViewへ変換しない。

## 収束時の最終引継ぎ

ユーザーの収束指示により追加実装を停止する。UI全体の完了とはしない。

- PR #243: 提出1b43202369e74d5470ad43457a6c55cc464a56a5 → 通常統合18cd9dfef440c3db74f8392082a18af2bc180845。
- PR #250: 提出8ed56ee1bce1c28414de35a771ef320460fc9814 → 通常統合04bdbceec67f76dabee5b945a1e317f8c6e5e4fa。panel/toolbarとhydrateを含む。
- #215はストア/管理の登録・実導入状態/停止を接続する。export disasterScreens / DisasterScreen、route disaster-mapは確定。
- #222はBridgeMapでuseDisasterMapDisplayを読む接続を提供済み。通常MapRendererだけhydrate=trueを渡す追加は依頼済み。BridgeMapの各previewではfalseを維持する。
- #217が通常入口→表示→停止/解除→戻る→再読込を統合commitで一度確認する。今回の担当ブラウザは専用exportをSessionRootへ渡す入口であり、通常plugins導線の合格証拠ではない。
- 地図の実画像/欠測の最終統合描画、停止/解除後の消去・再読込hydrateは最終QAへ引継ぎ。ローカルSQLiteには実提供元画像6枚/3layerと時点の保存を確認した（local-saved-summary.json）。
- desktop-source-1536.pngは出典詳細/配置の証拠。共有画像接続前のためレイヤー描画の証拠ではない。
- 避難所/警報速報/雨雲時間軸/流域は#30 comment5674714669の最小契約案および#144へ未完条件として継続。今回は新C担当を探さず、追加APIを待たない。

### 再開場所

worktree /Users/roz/.codex/worktrees/disaster-ui-223、branch rozwer/223-disaster-screen。
CODEX_OWNER=rozwer。共有5173/3002は操作していない。
担当検査はVite5187/API3017、独立.local DB。127.0.0.1を複数サーバーで共有するとCookieがportを区別しないため、後半はdisaster-ui.localhostへ分離した。個人データ/秘密値は証拠に含めない。


## 2026-09-27 再開: 更新失敗と停止状態の修復

起点 `origin/develop 30128ad`。専用worktree `disaster-223-followup`、branch `rozwer/223-disaster-screen-followup`。提出commitは本節を含むcommit（PR head）で特定する。

- 生成DTO `lastAttempt` があるのに画面が無視していたため、失敗/部分取得の試行時刻・対象地域・各レイヤーの取得状態/理由を表示。保存済み結果と同じ取得として見せない。
- 初回読込や設定保存失敗でviewがnullになった場合、「再試行」は更新APIではなく状態読込を行い、既存導入を復元する。
- 停止/地域変更の通知をstaleより優先し、正常な停止を更新失敗と誤表示しない。
- 地域boundsと画面幅・パネル幅が変わったときもfocusを再実行。「地図の中心」を繰り返す場合とresponsive切替に追従する。

### 確認結果

- `mise exec -- node node_modules/vitest/vitest.mjs run src/features/disaster/ui/DisasterPanel.test.tsx`: PASS。保存済みavailableと別地域のfailed attemptの併存、失敗理由、初回partial/保存情報なし、地域変更・停止・再試行をDOM操作で確認。失敗結果の表示は制御fixtureによる検証で、外部提供元の障害再現ではない。
- `mise exec -- node node_modules/vite/bin/vite.js build`: PASS。
- `mise exec -- bun run typecheck`: FAIL（担当外12診断: server/core/core.test.ts 6、exploration/flow.ts 1、friends/screens.tsx 1、reflection/DiaryScreen.tsx 1、tools/local/dev.ts 3）。今回変更した防災ファイルの診断なし。全体型検査成功とは扱わない。
- 独立Vite5197/API3027、独立.local SQLiteで通常入口→地図→メニュー→アプリを育てる→防災詳細→防災画面→試用→導入を実操作。公開済み.env.exampleのMapbox設定を使用し、共有サーバーは未変更。
- 「防災情報を更新」で実提供元3layerが取得済み。取得時刻2026-09-27 17:04:58 JST、降水解析17:00 JST。390×844で江戸川の地図画像、出典・凡例・解析時刻を目視。canvas 1個、document.scrollWidth=390。
- 防災停止→1536×960へ変更→再読込で停止中と保存済み情報を復元。地図の防災画像が消えたことを目視。canvas 1個、document.scrollWidth=1536。京都へ地域切替も操作。
- 担当APIプロセスだけを停止→レイヤー保存で「通信に失敗しました」→担当API再起動→「再試行」で停止中の既存導入設定を復元。未保存のチェック変更はサーバー状態へ戻ることを確認。
- 「街の地図へ」で通常mapへ復帰。検証用viewport overrideは解除。

### 残件・判定

施設詳細/避難先、警報速報、雨雲時間軸、流域・津波は現行生成DTOにもない。既存不足表の未完条件を継続し、本Issueは閉じない。#217の独立QA・#222の共通描画検証を代行した扱いにしない。

Mapbox背景地図の一部取得失敗表示がローカル実操作中に出た（背景地図そのものは表示された）。全タイル健全性と全欠測maskの見え方は今回の合格範囲外。最初の幅ではfitBounds padding警告も観測し、responsive変化時のfocus再計算を追加した。全体型検査と独立レビューが未充足のためマージしない。

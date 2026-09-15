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

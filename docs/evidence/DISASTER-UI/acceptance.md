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

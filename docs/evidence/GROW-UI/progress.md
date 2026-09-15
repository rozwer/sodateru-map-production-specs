# GROW-UI #215

## 初回差分
- 基点 origin/develop 2155430以降の標準worktree。取得はplugins明示8ファイル/grow、feature-requests、当証拠のみ。
- 参照: rehearsal/docs/requirements/mockups/grow-app-store-v1.png（853×1844）と原本08_23_14/08_23_21（各1536×1024の約400px端末領域）。画像を実見。rehearsal InstallPreview.tsxの同一地図before/after自動遷移を参照。
- ストア見出し、2タブ、開発ガイド入口、お願い導線。管理に版/状態/解除導線。desktopでも本文最大440pxで原本の端末構成を保つ。
- 独立Vite5198/API proxy3002、390×844、デモON。ストア→導入済み→バイクを外す→削除→管理からバイク消失をブラウザ実操作確認。UI fixture・未保存の表示を維持。
- typecheck: 担当ファイル診断なし。既存server/core、exploration、records、reflection、tools/local/devの診断により全体は不合格。

## 継続・未完
データ#216の参照exportと防災#219の専用exportを接続する。全アプリ共用バイク条件、地点/版/レイヤー、試用の自動変化を後続修復。現在の独立ViteはMapbox設定未投入で地図描画の合格証拠ではない。API/DB永続化はUI fixture範囲で未接続、live保存完了にはしない。共有5173/3002は操作していない。

# UI-BASE｜共通UI・ナビゲーションと画面復帰

<!-- task-id: UI-BASE -->

初期担当枠：A。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

共通メニューから目的の面へ移動し、戻ると元の地図・入力・フォーカスへ戻れる。

## 実装範囲

- React/Viteの画面入口、共通トークン・messages.ts・APIクライアント・単一Sheet/side panel・チャット部品の受渡しを整える。
- 共通地図の生成・破棄と選択イベントの入口を用意し、機能側から地点・線を渡す境界を固定する。

## 通過条件

- メニュー・モード切替・戻る・Escapeで呼出元の状態が復元される。
- 320px・390px・広い画面・文字200%・キーボード表示で共通操作へ到達できる。
- live/demo切替で旧要求を取消し、旧本人の結果を表示しない。

## 参照と契約

[共通メニュー・モード切替](../../01_requirements/03_pages/navigation/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：なし。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

先行提供：共通部品・クライアント・機能登録の署名と最小起動画面を先に統合し、共有ファイルのロックを返す。

## 編集範囲

提案path：`src/app/`、`src/ui/`、`src/lib/api/`、`src/messages.ts`、`index.html`、`vite.config.ts`、`docs/evidence/UI-BASE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

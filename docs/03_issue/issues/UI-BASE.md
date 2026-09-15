# UI-BASE｜共通UI・ナビゲーションと画面復帰

<!-- task-id: UI-BASE -->

初期担当枠：A。担当者：rozwer。[GitHub #4](https://github.com/rozwer/sodateru-map-production-specs/issues/4)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

共通メニューから目的の面へ移動し、戻ると元の地図・入力・フォーカスへ戻れる。

## 実装範囲

- React/Viteの画面入口、共通トークン・messages.ts・単一Sheet/side panel・チャット部品の受渡しを整える。APIの型・通信処理はkoshiroのCOREから受け取り、画面からの呼出しだけを接続する。
- 共通地図の生成・破棄と選択イベントの入口を用意し、機能側から地点・線を渡す境界を固定する。

## 通過条件

- メニュー・モード切替・戻る・Escapeで呼出元の状態が復元される。
- 320px・390px・広い画面・文字200%・キーボード表示で共通操作へ到達できる。
- live/demo切替で旧要求を取消し、旧本人の結果を表示しない。

## 参照と契約

[共通メニュー・モード切替](../../01_requirements/03_pages/navigation/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

先行提供：共通部品・地図/チャットの受渡しと最小起動画面を先に統合し、共有ファイルのロックを返す。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **UI-BASE.shell**：共通画面・地図/チャットの受渡し。同じ起動環境で共通画面を開き、本人切替で旧要求を取消。地点/経路/選択を既存の地図境界へ渡せる。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`src/app/`、`src/ui/`、`src/messages.ts`、`index.html`、`vite.config.ts`、`docs/evidence/UI-BASE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。

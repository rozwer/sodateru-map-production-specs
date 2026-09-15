# UI-MAP 画面・成長表示の引継ぎ

## 提供物

- 先行 renderer PR #70、共有表示状態 PR #131 は develop に統合済み。
- 今回は `src/features/map/` の5画面・検索ツールバー・一時候補管理、`src/map/` の成長表示とThree.js飾り、配置中プレビュー、面/線/画像を描くrenderer側の入口を提出する。
- 共通API clientと共通MapBridgeを使う。装飾・成長・検索候補は別の表示状態。訪問閾値はUIで計算せずACTIVITYのstageを読む。
- 表示設定と装飾の保存/削除は未接続で、画面では利用できない旨を表示する。完成とは扱わない。

## 今回の確認

- `mise exec -- bunx tsc -p .local/tsconfig.delivery.json` 成功。対象は `src/map/**/*.{ts,tsx}` と `src/features/map/**/*.{ts,tsx}`、root tsconfigのstrict/noUncheckedIndexedAccessを継承。最後の詳細再試行のforce引数修正後は終了指示に従い再実行なし。
- 全体型検査は他機能と生成契約の未統合エラーが残るため、製品全体の成功とはしない。
- ブラウザーは `http://localhost:5198/docs/evidence/UI-MAP/browser.html`、APIは専用DBの3108。本人を選択して名古屋大学を実検索し4候補、候補詳細→保存を操作した。APIレスポンス差替えなし。
- 候補閲覧後: places=0、visits=0、records=0。保存後: places=1、visits=0、records=0。
- 保存placeId: `0877b295-84ce-4058-8936-1b7fcb988b6b`。APIを再起動し新規ブラウザータブから同IDで名古屋大学を再取得・表示した。本人の記録取得は部分失敗表示が残った。
- 保存済み画面390pxは `saved-place-390.png`。基礎rendererの390/320pxと独立状態確認は `delivery.md` を参照。
- `details.html` は成長・用途・飾り・面/線を明示した模擬入力の可視確認用。実Mapboxの建物を選んでbuildingKey、実形状、heightを取得し成長バッジと独立した飾りを表示できた。直近の成長色の重なり順修正後の見え方は再確認未実施。
- 127.0.0.1の別APIと同名cookieが衝突したため、確認ブラウザーはlocalhostへ分離した。統合先でもDB・cookie・本人を同一で確認すること。

## 必須の未完受入と引継ぎ先

以下は機能を削らず、統合担当 UI-INTEGRATION #98（task 01a0a305-c796-7653-8dfe-b0aa1cdf858c）へ引き継ぐ。後続CONNECTの正式な範囲整理は調整担当の定義に従う。

1. MAP-CUSTOM.manual/adopt契約との接続: レイヤー希望値/実効値、プラグイン停止時のownerだけの除去、装飾CRUD・競合・再表示・取消・削除確認、AI提案/採用画面。契約fragmentは提出時HEADにまだ存在しない。
2. PLACES詳細の新しい写真/紹介文契約を生成型更新後に表示へ反映し、本人の記録の部分失敗を修復する。候補由来と保存placeIdを混同しない。
3. 全参照画像の全状態、390px・320px・200%比較。現在は基礎rendererと保存詳細の確認までであり全画面一致ではない。
4. ACTIVITYの新生成型を使った実API成長の再取得・建物の用途/成長表現、同一建物の複数place、装飾の視認性を確認する。建物形状や高さを捏造しない。
5. Bridgeの確定したoverlay契約から面/線/PNG画像へのアダプターを追加する。knowledgeの用途色キューブ、試用/災害/巡礼overlayは未接続。renderer側props `overlays`/`images` は存在する。
6. 建物詳細から保存/記録への遷移、UI-ROUTESとの候補/保存済みplace引数、共有導線、本人/モード変更・取消で古い状態が残らないことを統合画面で確認する。
7. 実サーバー/統合アプリ全体での操作・保存・再取得・再起動確認。fixtureの成功で全受入を完了にしない。

## 保持する作業場所

- worktree: `/Users/roz/.codex/worktrees/ui-map-8`
- branch: `rozwer/8-map-ui`
- 取得path: `src/features/map/`、`src/map/`、`docs/evidence/UI-MAP/`
- ローカル確認DB: `.local/map-qa-live.sqlite` / `.local/map-qa-demo.sqlite`。DB・環境ファイルはgitへ追加しない。
- 確認サーバーは引継ぎ時に停止。再開は `.local/vite.map-qa.mjs` と `.local/map-qa.env` を使う。秘密値は文書へ転記しない。

ユーザーの終了指示により追加実装・追加確認・統合待ちを停止する。現行Issue全受入は未完なので通常finishではなく通常releaseし、成果をPRとworktreeに残す。

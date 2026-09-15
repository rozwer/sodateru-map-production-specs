# 締切引継ぎ — #174

## 公開内容

- PR187: 場所住所pin、390px保存/共有/三点一行、写真なし文言溢れ修正。共有QAへ反映済み。
- 最終バッチ: 主写真の固定240pxを原本の縦横比に修正。幅に応じた場所詳細/周辺カードの文字サイズ。探索ヘッダー5件を原本へ。生成写真3点と既存由来の比較fixture。経路比較APIの全候補を保持し選択したgeometry/resultIdを使用。不確定保存後に別候補へ切替えても元の固定ID/keyで確認し重複作成しない。
- 実検証: map生成写真390/853px、explore候補390px、既存compass390px。routes11件テスト成功。

## 未完

全ページ同状態の実ブラウザ照合、MAP保存/再表示、route比較の実API保存、写真を実APIデータへ接続、探索の候補別滞在/徒歩/合計（現在CommonAIDialogueResult候補DTOに値なし）、各画面内MapPreviewとwide共通背景の見せ方。map-layers/object保存は既存API接続待ち表示のまま。健康は余力未実装・別担当。TRANSFER/発見のリハーサル由来参照画像作成は未実施。

原本の写真とデザインを手がかりにimagegenで生成した架空のカフェ/書店/公園をassets/へ保存。全利用入口にモック/生成写真/通信なしを表示。実店舗写真・live保存実証ではない。元生成ファイルも保持。

作業場所 /Users/roz/.codex/worktrees/visual-map-explore、branch rozwer/174-visual-map-explore。ユーザーの締切指示により残件を保持してclaimを通常releaseする。Issue174は残件境界としてopen。

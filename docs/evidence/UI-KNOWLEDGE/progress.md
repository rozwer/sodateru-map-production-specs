# UI-KNOWLEDGE #16 — 接続前の表示確認

2026-09-15。未完了。業務API、DB保存、公開取消、画像一致の合格報告ではない。

## 対象と取得

- branch: `rozwer/16-knowledge-ui`
- worktree: `/Users/roz/.codex/worktrees/ui-knowledge-production`
- 開始commit: `26a25329111af5e72ee42c3120c06993adbeae91`
- claim: UI-KNOWLEDGE、rozwer、generation 1。取得pathは `src/features/knowledge/` と本証拠directory。
- `task:worktree` は末尾の旧module参照で失敗したが、作成済worktreeで通常の `CODEX_OWNER=rozwer mise run task:verify` が成功。共通toolの修正・検証迂回なし。

## 画像との対応

実装前に次の参照を実際に開いた。参照画像を製品素材に使用していない。

| 画面 | 参照 | 対応 |
|---|---|---|
| knowledge-list | `03_pages/references/Codex 画像 2026年9月15日 08_12_07.png` 左 | 検索欄、3分類、写真中心カード、作者/場所/日時、しおり、地図ボタン |
| knowledge-filter | 同上 中央 | 検索地域、3半径、地図、目的、期間、表示対象、適用 |
| knowledge-detail | 同上 右 | 公開表示、媒体、原文、作者/場所/日時、関連3操作 |
| local-knowledge | `03_pages/references/Codex 画像 2026年9月15日 07_41_04.png` | 地図上の場所シート、写真、声2件のpreview、全件への遷移 |

画像の本文・人数・日付・媒体は例示。DTOの値からDOMを構成する。見出しは原文の先頭行、その後の行を本文として表示し、保存原文を改変しない。

## 実行した確認

- scoped TypeScript: `mise exec -- bunx tsc --noEmit --strict --jsx react-jsx --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --types react,react-dom src/features/knowledge/views.tsx src/features/knowledge/Media.tsx src/features/knowledge/Icon.tsx` 成功。
- Vite 5186、`/docs/evidence/UI-KNOWLEDGE/preview.html`。明示したテスト応答。person/dataMode/DBは未接続。
- 実ブラウザ1536×1024で3画面を表示。初回に見出し/文字/余白差を見つけ修正。写真・Mapbox未接続のため画像一致判定は未実施。
- 320×740で写真枠の最小高さによる本文への重なりを発見し修正。写真枠右端133.59px、本文左端143.59pxで非重複を確認。横overflowなし。
- 390×844で一覧→条件を開く→3kmへ変更→適用→一覧見出しが3kmへ変わることを確認。横overflowは390pxで0。
- 320pxで3kmへ未適用変更→閉じる→検索条件再表示を行い、適用済み1kmへ復元することを確認。保持される画面同士のradio groupもuseIdで分離。
- 期間変換はAsia/Tokyoの週境界とAmerica/Los_Angelesの夏時間移行週（167時間）を確認。
- 媒体失敗状態で本文・日時・関連操作が残り、媒体単位で再試行を表示。

## 提供待ち・残る通過条件

- UI-BASE: screens登録、共通clientの本人/dataMode利用、Sheet/Mapの接続。Mapの保存済投稿地点と埋込previewを#4に依頼。
- COMMUNITY: 分類辞書、bbox、他者投稿しおり、単体共有詳細の正式契約/実装。
- INFORMATION: 同条件のcursor一覧/totalCount/全件地図。101件目以降、場所不明件数、2,000件超過を実APIで確認する。
- RECORDS/UI-RECORDS: 投稿→保存→確認後公開→別本人で同じ原文を取得→公開取消→再表示不可。
- PLACES: 地域検索/選択と場所詳細、共通Mapboxでの中心/半径/範囲を接続。
- 写真/動画/地図が実接続した同じ状態で、参照と配置・余白・文字・色・アイコン・カード・地図を照合する。320px、390px、広い画面、200%文字、キーボード、reduced motionの操作到達性を確認する。

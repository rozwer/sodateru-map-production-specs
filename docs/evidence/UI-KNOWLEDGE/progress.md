# UI-KNOWLEDGE #16 — UI確認と接続引継ぎ

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
- 390px・文字200%（root 32px）で一覧と条件画面の文字が拡大・折返しされ、横overflowがないことを確認。文字サイズをremへ統一した。
- 詳細のメニューをEscapeで閉じ、投稿メニューボタンへfocusが戻ることを確認。
- 軽いレビューのP2を修正。地域名「本山」を「栄」に編集すると既存center/boundsが解除され、候補選択まで適用が無効。「栄」のテスト候補を選ぶと適用でき、一覧の地域見出しが変わることを390pxのブラウザで確認。実地域検索APIは未接続。
- 上記修正後、index.tsからのscoped TypeScript検査が成功。
- 明示した媒体テスト入口media-preview.htmlで30秒WAVのnative再生（paused=false、duration=30）→active=false→audio要素0・AbortSignal中断1を確認。1.2秒の遅着応答も中断し、非表示後にaudioが復活しない。MediaViewはactive=falseでDOM媒体を外し、pause/src解除/loadとObject URL revokeを実行する。実APIでの取消後閲覧確認は別途必要。

## 提出状況

- Draft PR #45は表示部品の先行提出。Issueは未完了。
- 共通guardのfixed base誤判定はPR #63の正規取込で解消。stage/unstagedのbinary patchと未追跡全fileのhashを保全し、stash後の通常merge、stash apply --indexでbyte/hash一致を確認。task:verify成功、保持していたstageのcommit 40ab771が正規hookで成功。バックアップ・stashは保持した。

## 提供待ち・残る通過条件

- UI-BASE: screens登録、共通clientの本人/dataMode利用、Sheet/Mapの接続。Mapの保存済投稿地点と埋込previewを#4に依頼。
- COMMUNITY: 分類辞書、bbox、他者投稿しおり、単体共有詳細の正式契約/実装。
- INFORMATION: 同条件のcursor一覧/totalCount/全件地図。101件目以降、場所不明件数、2,000件超過を実APIで確認する。
- RECORDS/UI-RECORDS: 投稿→保存→確認後公開→別本人で同じ原文を取得→公開取消→再表示不可。
- PLACES: 地域検索/選択と場所詳細、共通Mapboxでの中心/半径/範囲を接続。
- 写真/動画/地図が実接続した同じ状態で、参照と配置・余白・文字・色・アイコン・カード・地図を照合する。320px、390px、広い画面、200%文字、キーボード、reduced motionの操作到達性を確認する。

## 確定した接続境界と準備中のコード

- BASEのScreenProps.active、MapBridge.showPlaces、MapPreviewのcenter/radiusMを受領。header/contentPadding無しの追加署名は提供待ち。PR #47はこのworktreeへ取込済み。local-knowledgeのbottom sheet指定は別途依頼中。
- CORE getMediaMediaIdContentはBlob出力で、共有api singletonからmodeヘッダー付きで取得できる署名を確認した。
- COMMUNITY #22の2026-09-15 02:36 UTCコメントでcategory=tips/experiencesとpeople別検索、目的辞書、bbox、単体共有詳細としおりの契約を受領。公開済みfragment v1.0.0を読んだ。変更予定v1.1.0と生成clientは未反映。
- connection-draft/のuseKnowledgeResults.ts.txtとuseKnowledgeBookmarks.ts.txtは上記確定operationへの接続準備。UI/API分割方針に合わせ、未検証コードを破棄せず引継ぎ下書きへ移動した。100件単位の一覧追加とcursorを含めない全件地図、別resourceのしおり作成/削除・同じ作成keyでの再試行、active/scope変更時の中断を実装した。共通api importと生成型の取込前なので、この2hookは型検査・実APIの合格対象に含めない。screens登録と地図への配線も残る。
- bboxとcategoryのquery変換、地図queryでcursor/limitだけを除外して同じ条件を保つ確認は成功。

## 追加UI確認

- 写真・動画と実Mapboxを含む3画面を1536×1024で照合し、カード余白/文字と177px地図枠を調整。詳細はvisual-review.md。
- 調整後の390pxで媒体と本文の非重複、横overflow0を確認。該当しない検索の0件案内、人物の0人案内を区別した。
- 実Mapboxの現在boundsを選ぶと地域/半径が解除され、bboxだけが下書きへ入り、選択表示が変わることを確認。
- 統合後の正式なbun run typecheckに適合するようnoUncheckedIndexedAccessでの期間parts/本文先頭行を扱い、全体型検査成功。
- 元UI Issueのfinish/closeは、UI残項目と正式なAPI後続Issue対応が確定してから行う。

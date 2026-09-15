# UI先行統合とQA入口

Task: UI-INTEGRATION #98。担当: rozwer。編集境界: src/integration/ と docs/integration/。

## 方針と所有

共通 `src/app/main.tsx` の既存globで各機能の `screens.tsx` を収集する。追加registryは不要。BASEがsrc/app/とsrc/ui/を継続所有し、機能画面は各UI担当が継続する。

13担当へ各Issueから一度、提供commit/PR・提出阻害・登録export・残る実接続を問い合わせた。返答先は #98。公開済みの提供単位を通常mergeで統合し、UI担当Issueの完了処理は行わない。

## 統合済み提供

[ui-deliveries.json](ui-deliveries.json) に現時点のPR状態、提出HEAD、merge commitを記録。12 UI PRを取り込み済み。SETTINGS #17 はこの時点で公開PRなし。

画面部品のみの先行提供は EXPLORE #74、PLUGINS #73、KNOWLEDGE #45。MAP #70 は共通描画器。これらの機能固有screensは担当の後続提供待ちであり、統合だけでは全メニュー到達を意味しない。

## 自動登録のソース

| ソース | 登録ID |
| --- | --- |
| `src/features/activity/screens.tsx` | `visit-confirm`, `growth-result`, `daily-track` |
| `src/features/companion/screens.tsx` | `companion-settings`, `companion-import` |
| `src/features/friends/screens.tsx` | `community-home`, `friends-map`, `friend-profile`, `friend-compare`, `shared-route`, `sharing`, `friend-picker` |
| `src/features/insights/screens.tsx` | `type-diagnosis`, `trend-evidence`, `trend-review` |
| `src/features/records/screens.tsx` | `record-create`, `record-edit`, `interpretation-correction`, `record-delete` |
| `src/features/reflection/screens.tsx` | `self-home`, `diary`, `reflection-question`, `reflection-history`, `experience-compare`, `memo-edit` |
| `src/features/routes/screens.tsx` | `route-conditions`, `route-results`, `route-navigation` |
| `src/features/suggestions/screens.tsx` | `self-checkin`, `suggestions`, `suggestion-detail` |
| `src/features/themes/screens.tsx` | `themes`, `theme-edit` |

## 同じQA入口への反映

- URL: http://127.0.0.1:5173/
- checkout: /Users/roz/.codex/worktrees/qa-visual-40
- API: http://127.0.0.1:3002/
- live DB: checkout内 .local/app.sqlite
- demo DB: checkout内 .local/demo.sqlite
- 更新操作はQA担当 #40 へ一本化。組込み担当はこのcheckout/runnerを変更していない。
- QA runner停止後、fetch origin develop → ff-only merge → bun install --frozen-lockfile → SODATERU_PORT=3002 SODATERU_API_ORIGIN=http://127.0.0.1:3002 mise exec -- bun qa/manual/run.mjs。画面reloadで反映する。

## 最初の統合確認

- BASE #81 + MAP #70 を含む ca88f2e で Vite production build成功。
- 後続RECORDS #75を含む統合で activity/screens.tsx が ../../map/display-state を参照し、未提供moduleによりbuild停止を検出。
- MAP担当の未commit実装に同moduleが存在することを確認し、取得範囲の担当へ即時提出を依頼。共有pathを他担当が直接変更して迂回しない。
- 実API保存/再取得、参照画像の最終一致は各担当の残件。部品fixture・build成功を実接続完了とはしない。

## 先行登録の追補

- PR131でdisplay-state欠落を解消し、139 modulesの製品build成功。
- QA担当がa7c50b4で本人→地図→メニュー→自分を知る→軌跡→体験入力を実確認。Mapbox設定は同製品のMAP担当環境からQAへキーだけ同期、値は記録しない。
- KNOWLEDGE担当の通常release/明示引継ぎ後、#98へsrc/features/knowledge/をadd-lock。4既存Viewをscreens.tsxで共通入口へ登録。
- 地域の声は既存の共通getSharedRecordsで検索/再試行/追加取得し、現在閲覧可能な実記録のみ表示。媒体は同clientのBlob取得。地域条件は既存変換を使用。人物/チップ分類・地域検索・目的辞書・しおり・出典確認の未接続は明示し、成功の模擬応答を作らない。
- KNOWLEDGE登録コードは限定strict/noUnchecked検査成功。実画面到達と最終API受入を区別する。

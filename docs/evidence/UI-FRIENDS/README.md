# UI-FRIENDS 実装・接続状況

2026-09-15。Issue #14。Draft PR #89。7画面の先行提供。意味比較の実AI・共有ルート再計算等の全受入は未完了。

## 実装範囲

`src/features/friends/` の7 screensを共通Shellへ登録する。人物検索、友達申請/承認/解除、共有記録/地図、プロフィール、意味比較、共有ルート、共有下書き/相手選択を対象とする。
通信は `src/app/api.ts` の共通インスタンスから、CORE生成型のoperationを呼ぶ。本人はサーバーsessionから解決し、URLのpersonIdは表示対象だけに使う。友達解除はfriendshipだけを削除し、記録の指定共有を変更しない。

## 確認済み（UIテスト応答）

390×844の共通Shellで手動操作した。

- 共有範囲をselectedにすると0人では保存不可。友達選択で2人を選び完了すると共有下書きへ戻る。この時点の通信はGETのみ。
- 共有確定で `PATCH /records/{id}` を1回送信。本文はvisibility/sharedWithのみ、If-Matchは取得版。続くGETとブラウザー再読込でselected/2人を表示した。
- 比較の左右をfromRecordIds/toRecordIds、expectedRefsで送る。会話作成→メッセージ送信→結果GET→insight GETから左右の記録、用途、理由、共通点/違い/不明を表示した。
- 既存Mapbox公開設定を専用worktreeのignored `.env.local`へ読み、MapPreviewで実地図を描画した。友達のオレンジ地点と共有カードを照合した。地点・記録の値と経路形状は明示したテスト応答であり、実APIの保存証拠ではない。
- CORE/BASEとUI-MAP先行ソースを組み合わせたstrict型検査は通過。

- BASE先行header:none/contentPadding:noneでhome/friends-mapの二重見出しを解消し、ホームに共有地点3件と写真3枚を表示。
- 320px・文字200%（本文28px）で共有画面の子要素に横はみ出しなし。共有確定と再取得成功表示に到達。
- 保存503でもpublicの下書きを保持。読取503では記録カード0・媒体0、再試行操作を表示。
- 友達解除でDELETE friendshipsだけを送り、元のselected/2人は共有画面で保持。これはfixtureの挙動で、実DBの分離検証は残る。
- 媒体はgetMediaMediaIdContentのBlobを表示し、本人/mode共通ヘッダーを使用。unmount時に取得中断・objectURL解放。

画像：`sharing-390-fixture.png`、`compare-390-fixture.png`、`community-home-390-fixture.png`、`sharing-320-text200-fixture.png`。
参照は03_pages/referencesの07_41_00、07_41_08、08_17_53、08_17_57を実際に開いて確認した。参照画像やその切抜きを製品assetには使っていない。

## 確認用ページ

`stage-preview.py` はCOREの統合済みソース、UI-BASE/UI-MAPの先行読取ソース、担当範囲を `/private/tmp/ui-friends-qa-14` へコピーする。元の担当ファイルは編集しない。

```sh
mise exec -- python3 docs/evidence/UI-FRIENDS/stage-preview.py
mise exec -- /Users/roz/Desktop/sodateru-worktrees/koshiro-3-core/node_modules/.bin/vite --config /private/tmp/ui-friends-qa-14/vite.config.mjs /private/tmp/ui-friends-qa-14
```

[共有確認](http://127.0.0.1:5214/#/sharing?recordId=fixture-record-0)、[友達地図](http://127.0.0.1:5214/#/friends-map?personId=fixture-person-1)、[プロフィール](http://127.0.0.1:5214/#/friend-profile?personId=fixture-person-1)、[比較](http://127.0.0.1:5214/#/friend-compare?personId=fixture-person-1)、[共有ルート](http://127.0.0.1:5214/#/shared-route?routeId=fixture-route-0)、[ホーム](http://127.0.0.1:5214/#/community-home)。

ページ上に「UIテスト応答・実API/DB未接続」を明示。fixtureの保存値はこのタブの専用sessionStorageだけに置く。`?failure=read`、`?failure=save`、`?empty=1`、`?fontScale=2` で確認条件を選べる。製品エントリはfixtureをimportしない。

独立したテスト写真：[shche\_ teamのコーヒー写真](https://unsplash.com/ko/%EC%82%AC%EC%A7%84/%EC%A0%91%EC%8B%9C%EC%97%90-%EC%BB%A4%ED%94%BC-%ED%95%9C%EC%9E%94-heKg-V9yHwc)、[qian zhuiの公園写真](https://unsplash.com/photos/a-pathway-in-a-park-with-lots-of-trees-MiKI-lXv9JI)。外部写真はfixtureだけで参照し、実在の名古屋の場所の写真とは主張しない。

## 実API・SQLite・実画面確認

`live-audit.json` と `sharing-live-selected-390.png` が証拠。`live-seed.json` は専用の検証入力ID。テスト媒体は明示した1ピクセルPNGで、実写真ではない。

- 専用DB `.local/live-acceptance/live.sqlite`、API 3114、Vite 5214 `/live.html`。
- 二人の本人で公開プロフィール検索 → 友達申請 → 相手本人の承認をブラウザー操作。
- 承認だけではprivate記録0件。共有選択 → 確定PATCH → GET → 相手で本文・地点・Blob媒体を確認。
- API OSプロセス20519を終了、35192で同じDBを再起動。record版3、同じfriendship ID/版2、指定相手、媒体68bytesが一致。ブラウザー再読込でも共有記録を表示。
- 友達解除をブラウザー操作。friendship0件でもselected/版3を保持し、相手の本文・媒体は200。
- ブラウザーからpublic/版4へ変更。関係なしの相手も本文・媒体200。
- ブラウザーからprivate/版5へ変更。相手の一覧0、記録詳細404、媒体404。相手画面の記録カード0・媒体要素0。

### 組合せた提供ソース

- 自分のbranchに統合したdevelop `364f8ef`（RECORDS、SETTINGS、ROUTES、THEMES、PLACESを含む）。
- COMMUNITY `ca562f44f1c20804413869f244b2651871a217d1`、INFORMATION `d2201571fe47012f909ddf9ed2be548aec5cb245` は提供branchから確認環境へコピー。担当worktreeのソースは編集していない。
- UI-BASE/UI-MAPは `stage-preview.py` の提供worktreeからコピー。header:none/contentPadding:noneとMapPreviewを利用。
- 共通OpenAPIに提供fragmentを確認環境だけで合成した。通常の共通生成物への反映・develop上での同一確認は未完。

```sh
mise exec -- python3 docs/evidence/UI-FRIENDS/stage-live.py
mise exec -- node --experimental-transform-types /private/tmp/ui-friends-qa-14/docs/evidence/UI-FRIENDS/live-server.ts
# 別ターミナル、初期データ作成
mise exec -- node --experimental-transform-types /private/tmp/ui-friends-qa-14/docs/evidence/UI-FRIENDS/live-seed.mjs
```

live.htmlの本人切替は実session APIを呼ぶ検証専用入口。HTTP応答を差し替えない。製品はこの入口をimportしない。

## 統合・後続の必要条件

- PR #89 の7 screensを共通自動登録で取り込む。UI-BASE `header:none/contentPadding:none` とUI-MAP `src/map/MapPreview.tsx` が必要。
- COMMUNITY v1.1.0 の `CommunitySharedTheme/getSharedThemes/getSharedThemesThemeId` をCORE共通clientへ生成する。プロフィールのテーマカード→themeId付きfriends-mapで同じ閲覧可能なrecordsを表示。fixture操作・strict型検査済み。
- REFLECTION/AI: 比較の会話作成/送信/取得/insight照合UIは接続。実AI成功・取消後の比較引用404を含む同一build検証は未完。
- ROUTES/UI-ROUTES: sharedRouteId→自分用条件は #9 と合意済み。実経路取得と元ルート不変のUI検証は未完。滞在/作者の言葉・媒体/元記録関連の正式DTO補完が必要。
- 本番相当の共通Shell・生成client・提供APIが同じdevelopへ揃った時点の受入を #72 の後続CONNECTへ移す予定。正式移管の反映前にIssue #14を閉じない。
- boardはsubmitted。未完の機能を完成扱いせず、通常のclaim整理によって引き継ぐ。

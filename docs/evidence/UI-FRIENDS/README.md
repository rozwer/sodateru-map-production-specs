# UI-FRIENDS 実装・接続状況

2026-09-15。Issue #14。作業途中であり、live受入は未完了。

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

## 接続待ち・残る確認

- COMMUNITYの共有テーマoperation/DTOは提供済みだが、共通生成型と実HTTP統合待ち。友人地図の用途は現在共有記録から、成長表現はACTIVITY境界に従う。
- 意味比較の共通API送信は接続済み。REFLECTION/AIの実実行と共有取消後の引用再検証を待つ。
- sharedRouteId→UI-ROUTESの自分用条件は#9と合意済み。滞在・合計・作者の言葉/写真・元記録の関連はROUTESの正式DTO補完待ち。
- BASEのheader:none/contentPadding:none、UI-MAPのMapPreviewは先行提供ソースで接続済み。develop統合待ち。
- 1440px・二人のprivate/selected/public・共有解除後の本文/媒体/比較引用・自分用経路取得の実API検査は未完了。
- PR、develop統合、board done/lock解放、Issue closeは未実施。部分提供だけでは完了しない。

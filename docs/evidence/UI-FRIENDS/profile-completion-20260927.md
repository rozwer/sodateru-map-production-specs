# 友達の申請承認とプロフィール配置

## 実APIの追加受入（#106 / #14 / #142）

比較検査と同じ専用DB・通常main/共通client、デモOFF。実行ソースは `86769d114fd5048650b73bef4d26d4bd4062768d`（証拠commit931d858時点も製品差分なし）。

1. alice: `friends-connect.localhost:5292/#/friends-map` で「ひなた」を検索し、公開人物「共有確認・ひなた」を選択。プロフィールから「友達申請を送る」→申請中。閲覧や送信だけで友達とは表示しない。
2. bob: 別Cookie領域 `friends-viewer.localhost:5292/#/friend-profile?personId=friends-live-alice` で申請到着→「友達申請を承認する」→友達。
3. 独立Cookieの通常API clientから両本人とfriendshipsを読み、同じID `7b85047f-f121-4e2d-b8ea-4fc94e2056ce`、accepted、version2を確認。
4. cwd確認済み専用API PID98620を停止、同じmain/DB/port3115でPID3034へ再起動。
5. 両本人を再認証した独立API clientでfriendships全値が再起動前と完全一致。両ブラウザをreloadしてともに「友達」を確認。

[再起動前後の値](friendship-restart-20260927.json)。記録共有の解除と関係解除の分離はPR343/364を参照し再実行していない。#106のknowledge/bookmark部分、#107の共有ルート/候補期限は今回の成功範囲外。

## 原本照合と修正（#14 / #184）

原本 `Codex 画像 2026年9月15日 08_17_57.png` を実見。プロフィールの公開テーマが原本の小さい横並びカードに対し大きい縦並びで、最近の体験を押し下げていた。名前と件数を横並びへ変更し、すべて見るではテーマ説明も表示。実際のcoverMediaを小さい丸形で表示し、未取得は既存leafアイコン。原本の架空分類アイコンを実テーマの意味と断定しない。最近の体験写真は94px高として本文行数に引き伸ばされないようにした。

- 実API空状態: 390×844のプロフィールで友達/紹介未入力/テーマ0/共有記録0を表示。未公開を活動なしと断定しない。
- 明示fixture `/docs/evidence/VISUAL-COMMUNITY/friends-preview.html#/friend-profile?personId=fixture-person-1`：390×844、512×1024（原本の一画面領域）、1536×1024（原本全幅）で画像とレイアウトを目視。テーマ2枚が同じy座標、390pxで各170px幅。写真2記録と文字・地図/比較/共有ボタンを保持、文書横overflowなし。
- 同fixtureの比較結果：390×844で2つの比較カード/4画像/左右原文・根拠操作を目視、横overflowなし。実モデル受入はPR376を参照しfixtureと混同しない。
- 320×740 + `?fontScale=2`：root32pxをDOM確認、横overflowなし、縦スクロールで「すべて見る」を操作し全文説明を表示。公園テーマを開くと `personId=fixture-person-1&themeId=fixture-theme-1` と同じ原文1件/地点1件を表示。
- 型検査: 最新統合起点792885dで探索担当の既存 `consent-navigation.test.tsx:19/20` の2型エラーを検出。friendsのエラーなし。共通担当へ通知済み。
- 最終差分のproduction `bunx vite build` 成功。

## 未完の境界

原本の人物・分類アイコン・写真と検査データは異なる。全7画面の全状態完全一致や実写真データの保存受入は主張しない。共有ルートの作者文/写真/滞在/元記録は正式DTO待ち。ソフトキーボード/reduced motionは今回未確認。#184全体には別担当のknowledge/companion受入も必要。fixtureは「UIテスト応答・実API/DB未接続」を維持している。

# 友達比較の実モデル生成と共有取消

2026-09-27。#14 / #142 / #107 の比較引用に関する部分受入。Issue全体の完了ではない。

## 環境

- 統合起点 `86769d114fd5048650b73bef4d26d4bd4062768d`、通常 `server/app/main.ts` と製品 `index.html`、生成済み共通API client。fixture/HTTP差替えなし。
- cwd `/Users/roz/Documents/sodateru-friends-completion`。API PID98620/3115、Vite PID99388/5292（strictPort）。両PIDのcwdとLISTENをlsofで照合。
- 専用DB `/Users/roz/Documents/sodateru-connect-friends-0927/.local/friends-acceptance/live.sqlite`。以前の合成受入データを再利用し、個人DBには接続しない。
- 別Cookie領域の `friends-connect.localhost:5292`（alice）と `friends-viewer.localhost:5292`（bob）、どちらもデモOFF。本人名は「共有確認・あかり」「共有確認・ひなた」。
- `CODEX_AI_MODEL=gpt-5.6-luna`、標準provider。本人AI設定の未許可時は403を画面表示。合成記録・検証用地点等の許可を通常settings APIへ保存し、同じ比較IDで再試行。新しい比較を作り直してはいない。

## 実画面の操作と観測

1. `#/friend-compare?personId=friends-live-bob&from=1789398000000&to=1789570800000&timeZone=Asia%2FTokyo` で9/15の双方の受入用記録に限定。
2. 「ふたりの体験を比較する」→未許可エラー→許可後「同じ記録で再試行」→「用途と理由を比較しています」→完了。
3. 左にあかり、右にひなたの原文「木陰のベンチで本を読みました。」とそれぞれの媒体を表示。媒体は以前から明示した1pixel検証PNGで、実写真の一致証拠ではない。関係「別の場所・同じ役割」、モデルによる共通点、違い/不明の見出しを表示。
4. 「共有確認・ひなたの根拠」からknowledge-detailへ遷移。同じrecordId/原文/作者/場所を確認。
5. 別hostnameのbob本人で `#/sharing?recordId=ui-friends-live-record-bob` →自分だけ→保存。保存後再取得成功の表示を確認。
6. alice側は根拠詳細の「戻る」でキャッシュ済みの元比較へ戻る。原文・写真・比較文は0件となり、「比較できる記録が足りません。情報不足は『共通点なし』という意味ではありません。」およびNOT_FOUNDの再試行を表示。古いAI結果や媒体を残さない。
7. 通常APIで同じmessage/insight/recordを再取得すると全て404 NOT_FOUND、bobの共有一覧0件。

## IDと証拠

- message `11777fab-c8fa-43be-ace1-cdc7a4bb987c`、insight `insight_2d1a96b715f9d0686d40527cdec0aed12752905589af3561`。
- [生成完了時のDB読取](comparison-live-before-revoke.json)：model/attempt3/message版9、左右recordIdとsource version、実生成result。設定拒否を含む試行であり、3回生成成功した意味ではない。
- [撤回後API結果](comparison-revoke-audit.json)、[読取スクリプト](comparison-revoke-audit.mjs)。Cookieは保存しない。
- 再実行は同じ専用DB/API3115があるときのみ `mise exec -- node --experimental-transform-types docs/evidence/UI-FRIENDS/comparison-revoke-audit.mjs`。成功済みのモデル生成は繰り返さない。

## 残件と証拠の再利用

- #107の比較引用取消は今回追加で確認。shared-route取消/PLACES候補期限は別受入で未完。
- #106の独立二人UI申請承認→再起動は未完。旧UI-FRIENDSの混成API環境や同host異portの証拠を代用しない。
- #184は既存 `docs/evidence/VISUAL-COMMUNITY/screens.md` の単一地図/入力保持/fixtureの複数カード証拠と、今回の実API比較/原文往復を参照。全画面の原本幅/390px一致、実写真の複数カードはまだ未確認。
- 地図はMapbox実地図が表示されるが共通成長layer警告あり。#222担当が修正中、こちらの比較成功を完全描画の成功と扱わない。
- shared-routeの作者の言葉/写真/滞在/元記録DTO不足は[ROUTESへの相談](https://github.com/rozwer/sodateru-map-production-specs/issues/25#issuecomment-5854748479)。未入力を捏造しない。
- 確認済み共有境界はPR343/346/364の証拠を再利用し、今回繰り返していない。

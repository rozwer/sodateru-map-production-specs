# 13提供の統合と通常入口の照合（#98）

検証日: 2026-09-27。検証HEAD: db1e338a83fb71e7dccf8111ec8303f954cc34ae。
担当worktree: /Users/roz/.codex/worktrees/ui-integration-98-entries。

## 実際に起動した環境

- 事前に5173 listenerなしを確認。公式claim後の専用worktreeでVite PID7552 / 127.0.0.1:5173、実API PID7554 / 127.0.0.1:3246を新規起動。既存QA checkout/DB/runtimeは未変更。
- 通常入口URLは `http://integration98.localhost:5173/`。127.0.0.1:5173と同じlistenerへ到達するが、並行検証のcookie干渉を避け専用hostnameを使う。portだけではcookieを分離しない。
- live DBは本worktreeの `.local/app.sqlite`、demoは `.local/demo.sqlite`。Mapbox設定なし、新規本人「自分」、記録・友達・投稿0件。
- API起動: `SODATERU_PORT=3246 mise exec -- node --experimental-transform-types server/app/main.ts`
- Vite起動: `SODATERU_API_ORIGIN=http://127.0.0.1:3246 mise exec -- bunx vite --host 127.0.0.1 --port 5173 --strictPort`
- 再現時は空きportを確認し、既存listenerを奪わない。検証HEADを含む専用checkoutでbun install --frozen-lockfileを実行する。APIは専用DBを指定し、共有DBを使わない。

## 提供と到達の対応

13先行提供PRをghで再取得し、全提出HEADに `git merge-base --is-ancestor <head> db1e338` が成功。全件MERGED。[提出/merge commitの一覧](../ui-deliveries.json)。主要画面の操作はURL直打ちではなく、開始→地図から辿った。

| 担当/先行PR | 実操作した通常経路 | 確認結果と限界 |
|---|---|---|
| BASE #81 | 本人「自分」→地図をのぞく→下部ナビ/メニュー | 表示・画面切替成功。地図は接続設定なし |
| MAP #70 | 開始→地図、下部ナビから地図復帰 | 検索欄・探索・レイヤーを表示。タイル未確認 |
| ROUTES #71 | 通常候補→経路の経路はコードに存在 | 今回は候補データ未作成で実操作未確認。登録済みを到達成功にしない |
| EXPLORE #74 | 地図→Codexと探索 | ai-exploreのメッセージ入力・声・履歴を表示。送信/外部AI成功は未確認 |
| RECORDS #75 | 自分を知る→今日の軌跡→体験を残す | record-createへ到達。閉じるでdaily-trackへ復帰。保存未実施 |
| REFLECTION #92 | 下部自分を知る | self-home本体を表示。記録0件。以前のtimeZone400はこのHEADでは出ない |
| INSIGHTS #69 | 自分を知る→タイプ診断 | 記録不足を明示する5軸/期間/根拠欄を表示。診断成功とはしない |
| FRIENDS #89 | みんなの地図→友達の地図 | friends-mapの検索と0件表示。共有地点・比較・ルートは未確認 |
| SUGGESTIONS #66 | タイプ診断→今の希望から探す | self-checkinの希望入力・条件・地図復帰へ到達。候補生成未実施 |
| KNOWLEDGE #45 | みんなの地図→地域の知 | local-knowledgeで投稿0件と絞込案内を表示 |
| PLUGINS #73 | 主メニュー→アプリを育てる→導入済み | plugin-store/plugin-manageへ到達。画面の「模擬操作（未保存）」表示を保持。実導入とみなさない |
| COMPANION #64 | 登録とplugin-icon内のnavigate境界を確認 | 今回の未導入状態では相棒管理まで実操作未確認。Hinataモック表示を登録済み相棒とみなさない |
| SETTINGS #167 | 主メニュー→設定→プロフィール | profile-settingsで実本人「自分」と設定値を表示。保存未実施 |

画像: [記録作成](records-entry-390.png)、[プロフィール](profile-entry-390.png)。原本一致の受入ではなく到達の証拠。

## 最新統合での検証

- `mise exec -- bunx tsc --noEmit`: exit0。
- `mise exec -- bunx vitest run src/app/session-http.test.tsx src/app/presentation.test.tsx`: 2file/4test PASS。
- #338のCORE修復後の結果であり、#341の旧基点で記録した全体typecheck失敗とは区別する。
- Viteの全HTML走査は既存UI-PLUGINS fixtureの未設定alias @qa-app/Appを警告する。製品indexと上記通常導線は開けた。fixture警告を製品完成や未確認画面の成功へ読み替えない。

## 残件と担当境界

#98はcloseしない。ROUTES/COMPANIONの通常導線到達と全13担当の実接続/画像完成は未確認。登録exportは存在しており、独自registryや新UIで迂回しない。

#145担当との調整: 正式追加予定IDはactivity-stats / data-sources。基点HEADには未登録。設定担当が原本 `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_08_01.png` を確認したが、活動の統計/取得元の画面のみで起点リンクはないと報告。SELF担当もself-home/reflection-historyの仕様・実装に入口を確認できないと報告。新しい設定/SELFリンクを発明せず、通常入口未接続を残す。screens.tsx exportが統合されれば既存globで登録できる。

UI原本・Mapbox・端末操作・全データ状態・業務保存の受入は元UI/CONNECTに保持。旧提供数の訂正、到達確認、型検査成功だけでは完了扱いしない。

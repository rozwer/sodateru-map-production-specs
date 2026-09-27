# 活動統計の通常入口（#4 / #352）

基点: ed225d9c5e7d15e9a4a316d354c9b67863b690e9。共通メニューの「自分を知る」直下に、既存行部品でactivity-statsへのリンクを1行追加。入口位置を完全指定する原本はないが、第2周のユーザー指示に従い既存メニュー内で配置判断した。画面・階層・CSS・APIの追加なし。

`mise exec -- bunx vite build` 成功。専用worktree ui-base-4-stats-entry、専用.local DB、`SODATERU_PORT=3247 mise exec -- node --experimental-transform-types server/app/main.ts`、固有origin http://stats4.localhost:3247/ で確認。APIは固定portで起動し、使用中なら失敗する。

Chrome 390×844で通常本人開始→地図→メニュー→活動の統計→戻るを実操作。activity-statsで当週・訪問0か所・GPS未取得を実APIから表示し、戻るで元メニューへ復帰。
[メニュー](stats-entry-menu-390.png) / [統計画面](stats-entry-screen-390.png)。

今回割当ての入口1本は完了。#4全体の原本照合・実Mapbox・端末操作等は今回対象外で未達を保持し、Issue全体を閉じない。次の機能へ広げない。

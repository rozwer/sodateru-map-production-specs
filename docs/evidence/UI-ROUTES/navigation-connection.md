# 条件入力と案内接続

出発/帰着・階段/屋根入力の旧一律拒否を外し、既存RouteConditionsを通常postRouteComparisonsへ送る。provider非対応時は入力を保持して未対応を表示する。対話select経由は条件を送れないため明示的に拒否する。

案内は保存済みcurrentLegの実steps形状へ端末位置を射影し、次maneuver・残距離/予定時間・測位精度を表示。30秒超/50m超の精度/経路外では残値を未確認とする。区間末尾かつ精度20m以内で次区間のみ既存PATCH/versionを使い保存。終点でも自動終了/訪問作成はしない。位置取得は現在地ボタン、画面を閉じるとwatchを解放し、保存statusは維持。

変更箇所14試験PASS（条件伝達と拒否時保持、同ID/version区間更新、実形状の進行/距離、古い位置/低精度/経路外、非徒歩/自動終了禁止）。明示fixtureであり端末実測位成功と混同しない。

実通常HTTPからMapbox徒歩821.855m/8stepsを取得し保存・navigating化。通常live UIで開く→地図へ戻る→同routeId再表示、終了ボタン維持。SQLiteのstatus=navigating/current_leg=0/version=2が不変。live-navigation-route.json/navigation-return.json。

未達: この端末で経路上の実測位を取得して移動する確認、全参照画像・全幅の一致。renderer既知警告は共通担当の修正取り込みで確認する。#9/#138全体をcloseしない。

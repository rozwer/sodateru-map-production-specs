# 通常HTTPの都営直通接続

ROUTES_TOEI_FEED_PATH と ROUTES_TOEI_METADATA_PATH を設定すると、通常createRoutesServiceがtransitを既存ToeiDirectBusProviderへ渡す。walking/driving/cyclingは既存providerのまま。入力・保存契約の変更なし。

`mise exec -- node --experimental-transform-types --test server/features/routes/transit-http.test.ts` PASS。現行実feed20260927_030901で通常HTTP比較2便210円→採用した全行程保存→別OSプロセス再起動→同じsnapshotと保存再送を確認。専用DB/PID、固定43225、routes25.localhost Host境界。証拠transit-http.json。provider単体の再試験なし。

これは通常入口の直通接続の修復。乗継DTO接続、初終端徒歩、定期券/鉄道、階段/屋根等は未完了で#25/#88は閉じない。

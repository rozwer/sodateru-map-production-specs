# ROUTES.transit: 実都営GTFSの直通バス先行接続

親#25 / 子#88。全公共交通の受入は維持し、この差分は直通バスの実時刻表・shape・通常運賃を既存保存へ通す最初の単位。

## 正式server入口

`server/features/routes/index.ts`:

- `searchToeiBusStops({feedPath,metadataPath,payment?}, q, signal?)`で実乗り場候補を取得。親停留所と乗り場ID/座標を区別し、parentIdを保持。
- `createDirectBusRoutesService(db, {feedPath,metadataPath,payment?:'cash'|'ic'})`から既存`previewRoute`/`compareRoutes`/`revalidatePreview`/同期`saveRoute`/`getSavedRoute`を使用。
- 入力はRouteInput、mode=transit、実乗り場と小数6桁で一致する順序付きwaypoints、conditions.departAt（出発可能な最早UTCms）/timeZone=Asia/Tokyo、任意returnBy。最早時刻と実乗車時刻を分け、待ち時間をdurationSecへ含める。
- 任意地点→乗り場の徒歩を未確認の直線で補わない。乗り場と一致しない点、定期券、階段/屋根/滞在条件は未接続として拒否。default factory/通常HTTP検索のprovider切替は追加しない。

## 実データ処理

新DB・ダウンロードなし。Python標準zipfile/csvで提供済みZIPを読み、metadataのSHA256・安定sourceUrlを照合する。対象feedは東京都交通局、Asia/Tokyo。150路線を収録する版20260915_030753、有効日20260915〜20290914。

運行日calendarとcalendar_datesの追加/除外、サービス日前後と24時超の時刻、stop_sequence、乗降可否を照合。順序付き全停留所を同一便で通る2候補を予定到着順に返す。循環便で同じ停留所を再訪する場合も出発候補を検査。出発候補の探索は最早時刻から24時間以内。

運賃は当該route/乗降zone/全contains範囲に一致するfare_rulesをfare_attributesへ結び付け、一意の金額だけを採用。fare_idの文字列から価格を推測しない。今回の現金210円の行はIC値が欠測で、ICは未評価。乗継割引や定期券は適用しない。transfers/transfer_durationの元規則も保持する。

当該tripのshape_idと全stop_sequenceを用い、shape_dist_traveled未収録のため停留所を元shape線分上へ単調順序で射影（最大60m）。推定手法・位置をtransitEvidenceへ明記。別道路形状や架空の接続線へ置換しない。元shapeの区間を結合し距離・時間を全legから合算する。

## 実動作証拠

`toei-connection.json` / `toei.test.ts`:

- 実提供ZIPから、2026-09-16の東京駅丸の内南口0966-03→築地六丁目0946-02→晴海埠頭1249-01の全2区間を比較。
- 都05-1の10:02発/10:33着と10:09発/10:40着、現金210円。最早10:00からの待ち時間を含め1980秒/2400秒。
- 正式factory→同じCORE SQLiteへ2候補保存→別OSプロセスの通常`server/app/main.ts`でsession開始/保存GET/保存再送が全snapshot一致。
- 定期券要求とfeed有効期間外は拒否、業務行の増加なし。DTOをC固有fragmentの正式Schemaに照合し成功。
- Pythonの固有3検査で運行日例外/25時/不正分、origin/destination/contains適用、線分途中の停留所と形状外拒否を確認。

外部再取得0回。fetchedAtとsource.loadedAtはローカルfeedを読んだ時刻で、原リモートGETの日時ではない。元配信更新時刻はsource.lastModified、版/hash/有効日を別に保持する。時刻表の予定であり、リアルタイム遅延/実到着を保証しない。

## 利用と保存再表示

公式dataset: https://ckan.odpt.org/dataset/b_bus_gtfs_jp-toei
CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
提供者「東京都交通局・公共交通オープンデータ協議会」、安定取得URL、ライセンス、加工（便/区間/運賃の抽出とshape照合）、版/hash/有効日/読込時刻をsnapshot保存。UI再表示時にも出典・ライセンス・加工表示を渡す。短期署名URLは記録しない。

## 未達

C固有fragment v1.5.0のみ、共通生成はroot判断保留。通常HTTP検索でのprovider選択・生成client・UIの新入力は未接続。乗継・鉄道・他地域・道路徒歩・定期券・滞在・階段/屋根は未達のまま。#88全体/#25のclose、task:finishは行わない。

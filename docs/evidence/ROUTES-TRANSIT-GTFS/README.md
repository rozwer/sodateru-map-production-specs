# ROUTES-TRANSIT-GTFS #268

取得: kaiya/268-transit-gtfs、起点c849b4c。取得pathはserver/features/routes-transit/と本証拠のみ。DISASTER #30は完了のまま。

## 先行提供

#25の既存Toei GTFS読込/運行日/時刻/運賃/shape照合を再利用し、乗継と実道路徒歩の受渡し境界を追加する。独立importerの初期案は/private/tmp/sodateru-c-transit-268-initialへ保持し、提出しない。

- Python `search_transfers(loaded,request)`、TS `searchToeiTransfers({feedPath,metadataPath},request,signal?)`。
- request: fromStopIds/toStopIds（乗り場ID、各1〜30）、earliestDepartureAt（epoch ms）、latestArrivalAt任意、maxTransfers（0〜2）、maxJourneySec（1〜86400、既定21600）、minTransferSec（0〜3600、既定120）、payment（cash/ic）、transferWalks。
- 異なる停留所は、ROUTESの実道路providerが取得したdurationSec/geometry/sourceUrl/fetchedAt付きtransferWalksだけで接続する。親停留所名や直線距離で徒歩を捏造しない。初終端徒歩はROUTES担当が接続する。
- 結果はstatus=ok/partial/no_service/no_trip/out_of_period、journeys（bus/歩行leg、予定時刻、GTFS根拠ID、fare/shape）を返す。fare不明/shape不明はpartial、運賃null・形状null。待ち時間と乗継時間を全durationに含む。
- 同一便を途中で降りて乗り直す偽乗継を除外。pickup/drop_offの通常乗降以外を候補の乗降点にせず、乗車中は通過可能。

## 確認

`test_transfer_search.py`の4ケースは明示fixture。予定便の乗継順序/現金・IC/乗車禁止・降車禁止、calendar_dates加除・24時超・feed末日翌朝、実道路形状注入/時間不足/到着期限、不明運賃/乗継割引/不明shapeを検査する。実feedに24時超時刻がないため、この境界を実feed成功と混同しない。

TSのstrict/noUncheckedIndexedAccess型検査成功。既存成功テストや追加provider通信は再実行しない。

## 実feedと公開TS入口の証拠

- `live_check.py` / `live-check.json`: 実feedの東京駅丸の内南口→豊洲駅前は直通なし。乗継1回420円、2回630円の5候補がready。各便のroute/trip/service/shape ID、全使用停留所の元時刻/順序、乗降、同一乗り場で120秒以上の余裕、区間運賃と合計を照合。9月15日の29-171追加/29-170除外、23:59から30秒以内の便なしを確認。
- `bridge_check.ts` / `bridge-check.json`: `searchToeiTransfers`→Python別プロセス→既存loader→実feedで0966-02→0939-01→1025-09の2便・420円を確認。pre-abortは新しい子プロセスを起動しない。
- 当初bridge確認で0966-03/1025-02等の別乗り場を指定するとno_tripとなったため、上記実候補の乗り場に合わせた。停留所名だけで別方向の乗り場へ置換していない。
- 検証環境はmise Node22.22.1/Python標準lib。依存loaderは#25 worktreeの`f6d9ac0`とファイル差分なしを確認した。先行確認時だけ`PYTHONPATH=/Users/shimurakaiya/3_Workspace/sodateru-map-production-specs-worktrees/kaiya-25-routes`を指定してread-only利用。共有load_feedの統合後はこの設定不要。
- 再現: `mise exec -- env PYTHONDONTWRITEBYTECODE=1 python3 docs/evidence/ROUTES-TRANSIT-GTFS/live_check.py`、`mise exec -- node --experimental-transform-types docs/evidence/ROUTES-TRANSIT-GTFS/bridge_check.ts`。上記の二重成功を再実行する必要はない。


## 出典・利用条件

- [GTFS Schedule仕様](https://gtfs.org/documentation/schedule/reference/)のservice day、乗降、運賃を参照。運行日はAsia/Tokyo。24時超は前の運行日を保持する。
- [都営GTFS安定URL](https://api-public.odpt.org/api/v4/files/Toei/data/ToeiBus-GTFS.zip)、[ODPTの東京都交通局CC BY 4.0適用告知](https://www.odpt.org/2021/06/01/news20210601_1/)、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。東京都交通局・公共交通オープンデータ協議会の表示と加工内容、出典/ライセンスをDTOに保持する。署名付リダイレクトURLは保存/転載しない。
- 取得済ZIPのSHA256 c5154ec76c7d125d34ee12aafa1b2ca437a798bdbb50987dbcaba85043806bc8。版20260915_030753、適用20260915〜20290914。再ダウンロードなし。
- 取得metadataに正確なfetchedAtがない場合はnull。ロード時刻loadedAtとLast-Modifiedを分離し、取得時刻を捏造しない。

## 未完了条件

既存loaderは#25の`f6d9ac0`（共有path）を使用。直通提供PR #271の494a9b8とloader追補は依存として先に統合が必要。自身の実feed/公開入口確認は完了しており、依存統合・短い独立レビュー・通常merge後に正式finishする。依存の確認前にこのTaskを完成扱いしない。

全体のHTTP/保存/通常再取得、鉄道/他地域/定期券は#25/#88に残し、UIはA #138。本Taskは乗継provider提供の完了だけを扱う。

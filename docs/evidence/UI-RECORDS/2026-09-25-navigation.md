# UI-RECORDS #11 日々の記録の操作修復（2026-09-25）

## 対象と判定

原ID別の今回確認/未確認/実装未達は[棚卸し](acceptance-inventory.md)に整理した。

`origin/develop 6eace54`から取得した`mattsun/11-ui-records`、claimReceiptの3 path内で修正した。日々の記録の390px展開カードで「訪問の確認・訂正」が下部ナビの背後に入る問題を修正した。記録7画面の全受入は未達であり、Issue #11を完了扱いにしない。

- モバイルのスクロール領域を下部ナビの上で終える。カード手動展開や日付切替に自動scrollは追加しない。
- 記録編集・振り返り・訪問確認、通常地図を経由して戻ったとき、データ再読込後に元のscroll位置を復元する。選択済みカードと日付は保持する。

## 実画面

隔離したAPI`http://127.0.0.1:3284`と同じoriginのビルド済み製品UI、データモードdemo、独立した`.local/capture-284-demo.sqlite`を使用。ブラウザはChromium（agent-browser 0.20.12）。URLは`http://127.0.0.1:3284/#/daily-track?date=2026-09-15`。#284の撮影用seedを実APIで実行し、場所4件・確認済み訪問4件・対応記録4件を保存した。時刻・本文は合成データであり、個人の実測GPSやlive領域ではない。初回は専用worktreeに.envがなく、フロントの地図接続設定が空、経路providerは401で止まり、軌跡segmentは0件だった。元cloneの.envにはVITE_MAPBOX_ACCESS_TOKEN設定がある（値は記録しない）。そのファイルをread-onlyのenv入力にして同じ隔離DB・API/ビルドを再起動した後、同seedはMapbox Directionsから3区間を保存し、Mapboxの実rendererに4地点・線・始終点が表示された。初回失敗は環境設定差が原因で、今回の範囲で新たな地図実装不具合とは確認されなかった。地図の一部タイル取得警告は残る。

| 幅 | 実画面結果 | 画像 |
| --- | --- | --- |
| 390×844 | 修正前はボタン上端807px、下部ナビ上端749pxで重なった。修正後はscroll領域下端733px、ナビ上端749px。手動scroll後にボタン全体がナビ上へ出て、タップで`visitId=capture277-hotel-visit`の画面へ遷移した。 | [修正前](daily-track-390-before.png)・[修正後](daily-track-390-after.png) |
| 320×740 | 横幅320pxで横はみ出しなし。scroll領域下端629px、ナビ上端645px。訪問ボタンまで操作可能。 | [画像](daily-track-320-after.png) |
| 1440×900 | 地図とカードの2列、展開カードの操作を確認。横幅1440pxで横はみ出しなし。 | [画像](daily-track-1440-after.png) |

地図設定を揃えた追加検証では、[390pxの実Mapbox表示](daily-track-390-mapbox.png)、[4番選択後](daily-track-390-mapbox-selected.png)、[1440pxの4番選択後](daily-track-1440-mapbox-selected.png)を撮影した。390pxの4番を実ポインターで選ぶと対応カードが展開し、訪問ボタンは674–710pxでナビ上端749pxより上に表示された。タップで`visitId=capture277-venue-visit`の訪問確認画面へ移り、その地図もMapboxで表示した。戻り後は4番と`scrollTop=365`を保持した。

390pxでは訪問確認からの戻りで、展開カードと`scrollTop=200`を保持した。下部ナビで通常地図へ移り、ブラウザの戻る操作で今日の軌跡へ戻った場合も、同じカードと`scrollTop=200`を保持した。実APIの読み直し完了後に復元されることを確認した。

## 検証と未達

変更前の既存関連テスト4ファイル13件成功。最終変更後は軌跡関連テスト2ファイル5件と`vite build`成功。`git diff --check`成功。全体`bun run typecheck`は既存のCORE・exploration・friends・reflection・tools/local/dev.tsの型エラーで未通過。今回編集したactivityファイルの診断は出ていない。

#11の全体受入では、次が残る。

- record-create: 実機の撮影・OS拒否、動画、媒体部分失敗、Mapbox地図候補操作、ソフトキーボード。
- record-edit: 気分の正式保存/再表示、訪問付き滞在時刻、媒体編集時の失敗・競合。
- visit-confirm: 実Mapboxでの候補地点と場所訂正、失敗/競合、複数データの全状態。
- interpretation-correction: 実AI insightありの理由訂正、失敗/競合。
- record-delete: 個別削除preview・HTML書出しの正式提供、処理中/失敗の実操作。
- growth-result: 実地図の建物変化と用途別表示、元体験・次候補の通し検証。
- daily-track: 390/1440pxの実Mapbox描画と番号4選択は確認済み。残るのは別データ組・欠測・320pxの地図操作、文字200%、ソフトキーボード、reduced motionの実端末確認。部分的な地図タイル取得警告も解決判定していない。#277/#284の既存成功を保持する。
- 全7画面: 指定画像と異なる2組の実データ・全状態の最終照合、loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の制御確認。#189はOPENのまま。

後続は「地図・成長の実renderer/二組データ照合」と「端末媒体・キーボード/200%/reduced motion・状態網羅」をUI子作業として分け、非UIの契約/保存・書出し・削除preview・気分/訪問時刻・insight理由はCONNECT-RECORDS #135および提供担当の正式契約と照合する。各子作業が揃うまで#11のfinish/closeは行わない。

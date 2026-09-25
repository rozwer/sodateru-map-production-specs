# UI-RECORDS #11 原ID別の受入棚卸し（2026-09-25）

この一覧はUI面の観察と実装状態を整理する。元受入IDは`docs/03_issue/ui-connections.json`の対応を用いた。`今回一部`は本PRの実画面で該当操作の一部分だけ確認、`既存一部`は#189等の先行証拠だけ、`未確認`は実装の有無を含め通し操作未確認、`実装未達`は製品画面の無効化・一般案内または正式提供物不足が判明したもの。どの行も元live受入全体をPASSとはしない。通信・保存側はCONNECT-RECORDS #135と元source IDで照合する。

参照: [今回の画面・操作証拠](2026-09-25-navigation.md)、[同日再読込の失敗表示](2026-09-25-reload-error.md)、[写真/7画面の#189実API証拠](../VISUAL-RECORDS-CAMERA/2026-09-25-verification.md)、[#284地図番号証拠](../DAILY-TRACK-MARKER-REVEAL/README.md)。

| 原要件 / 元受入 | 判定 | 確認済み範囲と未達・必要成果物 |
| --- | --- | --- |
| record-create-R1 / record-create-C1 | 既存一部 | #189で本文のみ・写真のみ・場所日時未指定を実保存。動画と実機撮影、OS拒否は未確認。媒体UIは`src/features/records/`、端末検証は#189と連携。 |
| record-create-R2 / record-create-C2 | 既存一部 | #189で写真のみ確認面・検索候補・訪問チェックを操作。地図上候補タップ、訪問履歴から選ぶ状態は未確認。UI-BASE/MapPreview・PLACES候補が先行。 |
| record-create-R3 / record-create-C3 | 既存一部 | 写真2枚の順番、private既定は#189で確認。媒体部分失敗と成功分保持/再送の画面操作未確認。RECORDS.media/#135が先行。 |
| record-create-F01 / record-create-FC01 | 既存一部 | 本文のみ・写真のみ入力/保存は#189。動画のみ、下書き取消と端末許可状態は未確認。 |
| record-create-F02 / record-create-FC02 | 既存一部 | 検索と未指定保存は#189。Mapbox上の候補選択・訪問履歴は未確認。PLACES・実地図データが必要。 |
| record-create-F03 / record-create-FC03 | 既存一部 | 写真のみ確認面と訪問チェックを#189で確認。本文/動画/媒体失敗を含む別データ組の確認面は未確認。 |
| record-create-F04 / record-create-FC04 | 既存一部 | #189の同一recordId再取得は確認。全媒体の部分失敗・再送と公開状態の網羅は#135接続証拠待ち。 |
| record-edit-R1 / record-edit-C1 | 実装未達 | #189で本文・用途・公開範囲を同IDで保存。気分は画面で「未取得」、訪問付き時刻は正式binding未提供。`src/features/records/`とRECORDS/ACTIVITY/#135の契約が必要。 |
| record-edit-R2 / record-edit-C2 | 未確認 | 媒体追加/削除/並替えUIはあるが、選んだmediaIdだけの実保存・再取得は未確認。RECORDS.media/#135が必要。 |
| record-edit-F01 / record-edit-FC01 | 実装未達 | 本文は#189で保存、感想は旧証拠、気分と訪問付き滞在時刻は未提供。気分fieldとvisit版付き時刻更新が先行。 |
| record-edit-F02 / record-edit-FC02 | 既存一部 | #189で用途変更を同ID再取得。複数用途と成長への反映は未確認。ACTIVITY.growthが必要。 |
| record-edit-F03 / record-edit-FC03 | 未確認 | 写真の追加・削除・並替え後の同ID再取得、媒体部分失敗は未確認。RECORDS.media/#135が必要。 |
| record-edit-F04 / record-edit-FC04 | 既存一部 | #189で本文/用途/公開範囲の保存・reload。地図関連表示への反映と取消/競合は未確認。 |
| visit-confirm-R1 / visit-confirm-C1 | 既存一部 | #189で同一visitIdのconfirmed→rejected→candidate→confirmed保存・reload。候補を開くだけで自動confirmedにしないことを別データで確認する。 |
| visit-confirm-R2 / visit-confirm-C2 | 未確認 | 否定・場所訂正後の訪問数/建物成長再集計、本文保持の通し操作なし。ACTIVITY.growth・PLACES・#135の対応IDが必要。 |
| visit-confirm-F01 / visit-confirm-FC01 | 今回一部 | 今回、Mapboxの実地図とTHE BEACH YOKOHAMAの詳細を表示。別候補の場所訂正と2組データ照合は未確認。 |
| visit-confirm-F02 / visit-confirm-FC02 | 既存一部 | #189で3状態の選択・保存。今回の地図選択からconfirmedの画面へ到達。 |
| visit-confirm-F03 / visit-confirm-FC03 | 既存一部 | #189で状態保存・reload。訪問数と建物成長への反映は未確認。ACTIVITY.growthが必要。 |
| interpretation-correction-R1 / interpretation-correction-C1 | 未確認 | #189の実データにAI insightなし。原文は保持し「未取得」を表示。推定文ありの対応IDで用途と理由の編集先を実画面比較する必要がある。INSIGHTS.evidenceが先行。 |
| interpretation-correction-R2 / interpretation-correction-C2 | 実装未達 | #189でpurposes変更を同ID再取得。insight reviewNoteの理由保存は未提供/未確認。INSIGHTS/#135と正式対応IDが必要。 |
| interpretation-correction-F01 / interpretation-correction-FC01 | 未確認 | 原文表示のみ実証、AI推定との並列はfixtureのみ。実insightが必要。 |
| interpretation-correction-F02 / interpretation-correction-FC02 | 既存一部 | #189で用途「読書」→「休憩」を保存・reload。複数用途・競合は未確認。 |
| interpretation-correction-F03 / interpretation-correction-FC03 | 実装未達 | 実insightがない場合は理由保存を無効化。理由の保存/取消/再取得・誤解再利用防止は未提供。INSIGHTS/#135が必要。 |
| record-delete-R1 / record-delete-C1 | 実装未達 | #189で一般案内のみ。対象recordの個別削除previewがない。RECORDS.lifecycle/#135の正式previewと`src/features/records/`表示が必要。 |
| record-delete-R2 / record-delete-C2 | 未確認 | 実削除後の一覧/詳細/地図/共有消去、処理中/失敗を未操作。RECORDS.lifecycle/#135と別データでの安全な通し検証が必要。 |
| record-delete-F01 / record-delete-FC01 | 実装未達 | 削除/残存は一般案内で個別previewなし。上記preview提供が必要。 |
| record-delete-F02 / record-delete-FC02 | 実装未達 | 書出しボタンは準備中で無効。HTML exportの正式提供と画面接続が必要。 |
| record-delete-F03 / record-delete-FC03 | 未確認 | 取消UIはあるが、削除確定と4表示面からの消去/失敗は未確認。RECORDS.lifecycle/#135が必要。 |
| growth-result-R1 / growth-result-C1 | 未確認 | #189で実record・place表示、場所なしの未取得表示。建物変化と訂正/削除後の再集計は未確認。ACTIVITY.growth・実Mapbox建物が必要。 |
| growth-result-F01 / growth-result-FC01 | 未確認 | 確認済み訪問/用途の実建物3D変化を現データで未操作。BUILDING-GROWTH・Mapbox rendererと対応IDが必要。 |
| growth-result-F02 / growth-result-FC02 | 未確認 | 元体験導線は実装されているが、保存済み対応IDで往復未確認。 |
| growth-result-F03 / growth-result-FC03 | 未確認 | 次候補/通常地図導線は実装されているが、保存済み対応IDで往復未確認。 |
| daily-track-R1 / daily-track-C1 | 今回一部 | 今回はdemo実API4地点・3経路区間と390/1440実Mapbox描画を確認。候補/否定/欠測の別データ組は未確認。#277の欠測を線で補わない既存証拠は維持。 |
| daily-track-R2 / daily-track-C2 | 今回一部 | 今回、地図4番→カード展開、訪問確認/通常地図往復で日付・選択・scroll復元を確認。同日再表示の通信断で取得済み4件・選択カード保持を追加確認。編集/振り返り往復、カレンダー変更後は未確認。#284証拠と連続。 |
| daily-track-F01 / daily-track-FC01 | 今回一部 | 9月15日の4件から通信断中に14日へ切替、前日データを混ぜずエラー/再試行を表示。実API別日データでの前後日・カレンダー操作は未確認。 |
| daily-track-F02 / daily-track-FC02 | 今回一部 | 実座標3区間/4地点を地図と時系列で表示。候補/否定/欠測、別データ組、320pxの地図ポインターは未確認。 |
| daily-track-F03 / daily-track-FC03 | 今回一部 | 今回、対応カードの場所・本文を展開。写真は#189の同一ID実API証拠。二組データでの時系列/媒体表示は未確認。 |
| daily-track-F04 / daily-track-FC04 | 未確認 | 編集/振り返りボタン表示は確認。選択IDを渡す実往復と再取得は未操作。REFLECTION.recordが必要。 |

## 後続を分けるための成果物と編集範囲

1. **地図・成長/7画面視覚**: `src/features/records/`、`src/features/activity/`、`docs/evidence/UI-RECORDS/`で、指定画像と異なる2組の実データ・全表示状態を照合。growth-resultの建物3D、訪問訂正後の成長、daily-trackの候補/否定/欠測、320px地図操作を通す。共有`src/map/`や`src/app/`の変更は当該担当のclaim・Issue連絡が先行。#284の4地点/実ポインター成功、今回の環境差分と地図タイル警告を基準にする。
2. **媒体・端末・状態網羅**: 同じUI 3 pathで写真/動画、実機OS許可拒否、媒体順序/部分失敗、ソフトキーボード、文字200%、reduced motion、戻りfocus、loading/empty/editing/saving/error/conflict/unavailableと遅着・取消を実shellで確認する。#189のlive同ID証拠を再利用し、未達だけ検証する。媒体API・削除preview/export・気分/訪問時刻/insight理由は#135およびRECORDS/ACTIVITY/INSIGHTS側の正式提供後に接続する。
3. **統合判定**: 両UI成果物と#135の同一source IDの再取得・失敗証拠を照合し、#11の受入を縮退させず最終判定する。#189は未達があるためOPENを保持する。今回の小PRはdaily-trackの操作修復のみで、#11はfinish/closeしない。

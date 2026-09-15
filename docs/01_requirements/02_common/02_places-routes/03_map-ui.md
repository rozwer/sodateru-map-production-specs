# 地図・画面への受渡し

検索欄、相談、投稿、提案、拡張機能から同じ地図へ候補や道順を渡す。
誰が表示した内容かをownerKeyで分ける。

## 地図へ渡すデータ

| 操作 | 入力 | 地図側の動作 |
|---|---|---|
| showCandidates | ownerKey、resultId、候補、selectedCandidateId | 番号付きピンを描く |
| selectCandidate | ownerKey、candidateId | 強調し、選択イベントを返す |
| showRoute | ownerKey、previewId、geometry、地点列 | 線と出発・目的地を描く |
| focus | ownerKey、boundsまたは中心、padding | 対象がパネルに隠れない範囲へ動く |
| clear | ownerKey | その所有者の表示を外す |

ownerKeyはmap-search / map-dialogue / record-place-picker / suggestion / plugin:{installId}。
resultIdとpreviewIdは要求の識別に使う。
選択イベントは同じownerKeyと対象IDを呼出し元へ返す。

## 検索と詳細

検索を始めたらgenerationを1増やし、前のAbortControllerを止める。
{generation,query,personId,dataMode,ownerKey}を固定して送信する。
応答時にすべて一致する場合だけ候補を置き換える。

候補選択後の動作は呼出し元で決める。
map-searchは場所詳細、record-place-pickerは投稿の確認欄、map-dialogueは会話の候補強調へ返す。
登録前候補の詳細はPlaceCandidateの情報を表示し、本人記録の保存時にstorableの場所を採用する。

## カメラとパネル

一候補はその座標を中心にし、ズーム16を上限として現在ズームと比較する。
複数候補・経路は全座標のboundsへ合わせる。
paddingは画面端24pxに、開いているパネルの占有幅・高さを加える。
パネル寸法が確定してからカメラを動かす。

地図詳細、相談、記録、写真、案内の主パネルは一つを前面にする。
切替時は元の入力・選択・スクロールを保持する。
案内の線と進行状態は、相談パネルの開閉とは独立して保持する。

## 表示の寿命

検索を閉じたらmap-searchの候補を外す。
候補が期限切れになったらピンを外し、呼出し元に再検索を表示する。
記録・訪問に結び付いた保存済みの地図表示は残す。

拡張機能を無効化したらplugin:{installId}だけをclearする。
本人・モードを切り替えたら、旧contextの一時表示をすべてclearし、旧要求を取り消す。
写真用に作ったObject URLも解放する。

## 再表示

地図カメラと表示中タブは本人・モード別のブラウザ設定で復元する。
保存済みルートはIDからDBを読む。
一時候補・一時previewは期限内のメモリだけを使い、再読込後は検索からやり直す。
下書きの文字と条件は保持し、実行ボタンから再取得する。

390×844、1440×900で、候補選択・再試行・閉じる・本文入力へ到達できることを確認する。
長い名前は折り返し、番号と操作ボタンを残す。
背景地図の取得失敗時も候補一覧と詳細本文を表示し、地図欄に再読込を置く。

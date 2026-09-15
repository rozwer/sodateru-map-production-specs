# AI.voice v1
## 既存経路
UI-EXPLORE #10が確認したリハーサルのSpeechRecognition/webkitSpeechRecognitionを利用する。lang=ja-JP, continuous=true, interimResults=true。録音blobをCodex SDKへ入力しない。新しいprovider/HTTP endpointは追加しない。
ブラウザ提供の認識であり端末内処理とは断定しない。認識開始前に利用者へ説明し、マイク許可を得る。
## 責務
#10: マイク許可、録音時間/波形、認識開始/結果受信、停止/取消/破棄、文字起こしの編集/消去、送信内容の確認。
#7: 確認済み本文を既存の会話/Runへ受付・保存し、設定許可と参照を外部送信直前に確認する。
MediaRecorderだけで録音したblobを後からSpeechRecognitionへ渡す形にはしない。認識は録音開始に合わせて開始し、停止後に最終結果を編集可能な下書きへ固定する。
## Binding
確認済み文章→MessageSend.body。選択・解除後の対象→MessageSend.context/expectedRefs。IDとIdempotency-Keyは送信確定時に固定。未確認のinterim文字列や録音原本をRunへ送らない。
取消・消去・マイク拒否・認識失敗で相談APIを呼ばない。取消は確認前の本人の下書きを保持する。
SETTINGSのAI有効化後も、外部送信直前のassertAiAllowedが現在の許可を強制する。本人/モード切替で録音と認識を止め、旧イベントを破棄する。
## 受入と未達
#10の実マイク録音→認識→停止後編集→確認送信→保存本文一致、取消時無送信を実操作で確認する。現時点は接続契約の提供であり、実マイク/文字起こしの受入は未達。

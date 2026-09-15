# AI #7 接続状況
## 対象
起点26a2532、engine先行6275ac1、UTF-8修正b3d50d8。CORE.runtime統合413598bを6edb1f9で取り込み。
## 確認済み
- 7試験成功: CORE実HTTP/実SQLiteの受付再送・異入力409・取消再送・再試行再送・旧遅着拒否・再起動後結果再取得・削除後404。状態遷移・参照変更時拒否・モデル未設定・UTF-8分割・未使用schema定義除外。
- リポジトリ標準 `mise exec -- bun run typecheck` 成功。以前の独立nodenext指定のCORE型エラーは標準設定では再現せず、CORE担当へ訂正連絡。
- 固定SDK 0.153.4 + gpt-5.6-lunaによる実mapstyle応答取得: live-sdk.json、16,732ms。
- 同版一時CLI + gpt-5.6-lunaによる実mapstyle応答取得: live-ephemeral.json、41,757ms。
- model決定: model-decision.md。独立役レビューのP2 UTF-8分割破損は再現→修正→成功。モデル変更なし。
## 実装接続
共通transaction/CommonError/canonical JSON/hashをCOREへ集約。core_requestsの同一transaction受付へ接続。会話機能登録時に両mode DBのpending/runningをINTERRUPTEDへ回復してからAPI受付。
INFORMATION/SETTINGSが実在する場合は登録時に公開serviceを接続し、不在時は必要な処理をPROVIDER_UNAVAILABLE。参照SQL・設定コピーは持たない。
## 未達
- SETTINGS/INFORMATIONの統合と実サービスを使う許可/参照境界の受入。
- MAP-CUSTOMの本番mapstyle登録による実AI→Run保存→再起動取得。
- AI.voice: #10の既存ブラウザ認識を使う契約（voice-binding.md）を合意。実マイク認識/停止後編集/送信本文一致は未達。
- q/dateFrom/dateToのAI.jsonをCORE生成物へ反映。
- 全Issue完了/board終了は行わない。

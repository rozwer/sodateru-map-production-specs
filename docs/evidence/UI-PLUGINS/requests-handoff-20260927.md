# お願い操作のCONNECT引継ぎ（#18 → #144）

対象は `feature-requests` / `feature-request-edit` の一覧切替・作成・編集・削除。
全9画面のUI完成やAPI接続成功を示すものではない。表示修復の窓口は引き続き#215。

## 提供済み画面と実操作

実装はPR #73、参照・入力状態は後続PR #203/#259、画面復帰修復はPR #332で統合済み。
2026-09-27、PR #332の提出e346ce6を配信する専用5195（#18取得基点とお願い実装同一）で
Chrome通常App、デモON、未保存fixture表示を確認して以下を実クリックした。

1. 公開一覧→お願いを書く。本文空では保存ボタン無効。
2. 「お願い接続の確認用下書き」を入力→戻る→再入場で本文12文字と表示名を保持。
3. 下書きを保存→自分の下書きタブに表示（UI fixture・未保存の通知）。
4. 編集で同じrequestId `e284186a-cd36-4fcf-ba39-dfe30fc18333` を引継ぎ、表示名は読み取り専用。
5. 公開に切り替えて変更を保存→公開一覧に同じ本文を表示。
6. 削除→確認→キャンセルで投稿を保持。
7. 再度削除→確定で今回の模擬投稿だけ消え、さくら・たくみの既存投稿が残る。

上記はメモリ内fixtureでありAPI/SQLiteの保存証拠ではない。試験用模擬投稿は削除済み。
設定担当による別件のlive試験値混入は正式APIで復旧済みで、このUI確認の証拠に使わない。

## CONNECTで差し替える境界

- `src/features/plugins/screens.tsx` のRequestFixtureと画面登録を既存APIを使うbindingへ差し替える。
- `src/features/feature-requests/` の既存List/Editor/Delete Viewを再利用する。
- 既存の生成済みgetFeatureRequests、getFeatureRequestsRequestId、postFeatureRequests、
  patchFeatureRequestsRequestId、deleteFeatureRequestsRequestIdを使用する。
  共感/開発guideは生成済みpatchFeatureRequestEmpathy/getFeatureRequestDevelopmentGuideを照合して接続する。
- POSTはid/displayName/body/visibility、更新・削除は取得versionを使う。
  名前20文字、本文200文字。POSTの同一ID・再送keyを保持し、応答不明で二重作成しない。
- 本人/live/demo分離、実保存→再取得→再起動、privateの二本人分離、取消・競合・失敗で入力保持を#144で検証する。

契約はhandoff JSONに記録した統合済みOpenAPI本文/sha256に固定する。
編集範囲は台帳が認めるplugins/、feature-requests/とCONNECT証拠のみ。backend/共通Shell/契約は変更しない。

## 未完を維持する条件

全9画面の原本照合、地図実描画、端末別状態、バイク/聖地保存と防災固有の残件は#18/#215/#144に残る。
既存UIのAPIエラー/遅着/二本人表示は未検証。画像・API保存未達をhandoffだけでPASSにしない。
この変更は引継ぎ証拠とmanifestのみで、UI/API実装は変更していない。

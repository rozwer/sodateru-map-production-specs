# UI-EXPLORE 共通画面への接続

2026-09-15 12:16 JST。専用worktree、UI-BASE/MapPreview/AIを含むdevelop ca88f2eを通常mergeして作業。取得外のtransport・生成型・API/SQLは編集していない。

## 登録

- exploration/screens.tsx: ai-explore、voice-consultation、ai-consent、conversation-history、mist-detail、quest-compass、discovery。
- transfer/screens.tsx: experience-transfer。
- 共通api、Chat、ScreenDefinition、useScreenState、MapBridge、MapPreviewを使用。SheetのcontentPadding=noneで二重余白を避ける。

## 接続した動作

- 確認本文と固定originで候補を取得、同じresultId/candidateIdで選択。15分後は候補を破棄する。
- 永続化可能な場所IDのみでconsult会話を保存し、一時候補と会話を既定history endpointで関連付ける。履歴は保存メッセージを再取得する。
- マイク録音と同時のブラウザ認識、停止後の本文確定、編集/消去。AI無効時は設定の版を保持して明示確認する。場所の選び直しは保存済み場所APIを読むだけでAIを呼ばない。
- もやの場所詳細、しおり保存/解除、実測コンパス。経路入口はroute-conditionsのdialogueResultId/candidateId。採用経路はroute-navigationのrouteId。
- 発見の根拠取得、discovery Run、カード保存/反応/保存済み再読込。
- 体験レシピの元記録/意味/順序/条件を保存。転用二案はpollして未達・未確認・移動/滞在を表示。条件やレシピが変わると採用を止め、採用後のsavedRouteIdへ渡す。

## 確認の範囲

端末8件に加え、相談の本文/永続参照、通信失敗後の同じID/キーでの再送、実requestIdでの取消と遅着破棄、期限後の会話再表示を確認する4件のcontrollerテストPASS（12:16）。これはAPI境界のunit検証で、実HTTP/DBの通し完了ではない。

発行済みSETTINGS/COMMUNITY/EXPLORATION/TRANSFER/AI fragmentを一時ディレクトリに合成し、147操作の生成型で接続形を照合した。UI側の残る型エラーは共通clientのrequestId指定（#3へ依頼済み）。合成自体にはAIのcompact parameter参照と共通header不一致があり各担当へ報告済み。型を緩めたり独自transportを作って解消した扱いにはしていない。

## 受入の残件

1. 共通生成型とrequestId指定がdevelopへ統合された同一buildで、相談/発見/転用の実HTTP・保存・再読込を確認する。
2. 指定画像の独立した場所写真・候補説明・滞在情報と、Mapbox表示を含む実画面照合。
3. 実マイク/端末方位、本人・mode切替、参照変更/期限切れ、一般AI設定との境界を短い主要導線で確認する。
4. UI/INTEGRATION #98へ先行提供し、Issue #10は全受入または正式な残件引継ぎが終わるまで閉じない。

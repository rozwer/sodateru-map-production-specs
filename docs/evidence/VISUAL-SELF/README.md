# VISUAL-SELF 参照照合

基点: 28f3bf672084ef72b51888d6178fe4493497bd41。原本11画像は全て実際に開いて目視した。下表は通常状態の一致完了を意味しない。健康3ページは余力未実装、新規相棒制作は対象外。

|画面|参照画像・原本状態|ブラウザURL・commit・幅・状態|差分・修正・未確認|
|---|---|---|---|
|record-create|Codex 画像 2026年9月15日 08_07_53.png (editor) / Codex 画像 2026年9月15日 08_07_53.png (place-picker) / Codex 画像 2026年9月15日 08_07_53.png (confirmation)|未確認|captureIdからFileを受け取りdraft保持を追加。StrictMode/確認→編集/再マウントとscope分離の2テスト成功。Shell撮影入口・実ブラウザ・実API保存は未確認、後継担当へ引継ぎ。|
|record-edit|Codex 画像 2026年9月15日 08_07_57.png (editor)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|visit-confirm|Codex 画像 2026年9月15日 08_07_57.png (not-visited-selected)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|interpretation-correction|Codex 画像 2026年9月15日 08_07_57.png (editor)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|record-delete|Codex 画像 2026年9月15日 08_17_53.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|growth-result|Codex 画像 2026年9月15日 08_12_03.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|daily-track|Codex 画像 2026年9月15日 07_40_51.png (expanded-record) / Codex 画像 2026年9月15日 08_08_01.png (calendar)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|self-home|Codex 画像 2026年9月15日 07_40_36.png (home)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|diary|Codex 画像 2026年9月15日 08_08_05.png (editor)|http://localhost:5173/docs/evidence/UI-REFLECTION/index.html · QA報告448a857 · 390×844 · fixture/API未接続|写真0枚、原本は3枚。独立写真サンプルの追加が必要。|
|reflection-question|Codex 画像 2026年9月15日 08_08_05.png (answering)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|reflection-history|Codex 画像 2026年9月15日 08_08_05.png (answer-expanded)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|experience-compare|Codex 画像 2026年9月15日 08_11_42.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|memo-edit|Codex 画像 2026年9月15日 08_11_58.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|type-diagnosis|Codex 画像 2026年9月15日 07_40_47.png (week)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|trend-evidence|Codex 画像 2026年9月15日 08_11_42.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|trend-review|Codex 画像 2026年9月15日 08_11_42.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|themes|Codex 画像 2026年9月15日 08_11_58.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|theme-edit|Codex 画像 2026年9月15日 08_11_58.png (main)|未確認|原本目視済み。実画面の通常データと配置は未照合。|
|self-checkin|Codex 画像 2026年9月15日 08_11_47.png (main)|http://localhost:5173/#/self-checkin · QA報告448a857 · 390×844 · デモ/空入力|初期条件が空。入力済み原本と比較未了。Shell由来primary色差を#172へ報告。|
|suggestions|Codex 画像 2026年9月15日 08_11_47.png (main)|未確認|原本は写真付き2候補。新suggestions.htmlに既存独立写真を追加。変更後の実ブラウザは未確認。|
|suggestion-detail|Codex 画像 2026年9月15日 08_11_47.png (main)|未確認|原本は写真付き2候補。新suggestions.htmlに既存独立写真を追加。変更後の実ブラウザは未確認。|

## 最初の引継ぎ

- src/features/records/capture-handoff.ts: stageRecordCapture(files,scopeKey) / takeRecordCapture(id,scopeKey) / discardRecordCapture(id)。Shell #172と合意済み。Fileはメモリだけ、captureIdのみroute params。
- 新しいsuggestions.htmlは既存UI-SUGGESTIONS previewを基に、写真付き通常候補2件を初期表示。表示fixture/API未接続ラベルを維持。
- typecheckは既存のCORE/companion/exploration/friends/record-flow.test/reflectionの型差分で失敗。今回追加・変更したcameraファイルの診断なし。
- 受取テスト: mise exec -- bunx vitest run --environment jsdom src/features/records/capture-handoff.test.tsx → 2件成功。
- 受渡し後の戻る、キャンセル、端末許可拒否、実機撮影、実保存は後継担当とShell側の確認が必要。

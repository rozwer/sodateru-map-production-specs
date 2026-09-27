# 保存成功後の共有範囲競合を下書き消失として再現・修復

- Issue #142、基点 develop `ab0cf90`（CORE #338 と前回 #343 統合後）。
- 対象: `src/features/friends/screens.tsx` の共有PATCH後の再取得判定。

## 新規欠陥

publicを保存してPATCHがv2を返した直後、別編集でprivate v3に変更されると、再取得したv3はv2以上なので従来コードが成功として採用していた。画面は「共有範囲を保存し、再取得した内容を確認しました」と表示し、利用者のpublic下書きもprivate/dirty=falseで上書きしていた。

通常API3115・この担当の専用DBへ本物のHTTP要求を送り、Sharingコンポーネントをjsdomにmountして再現。API requestの委譲箇所でPATCH完了直後に競合する本物のPATCHを差し込み、HTTP応答内容は偽装していない。これは実API＋DOMの制御再現であり、ブラウザ全shell上の自然発生タイミングを観測したという主張ではない。各回UUIDの専用記録を作り、前回の二本人検証記録は変更しない。

修正前の失敗: `sharing-race-before.json`。保存public v2→並行private v3→誤った成功表示とprivate下書きが確認できる。

## 最小修復

再取得した版番号、visibility、sharedWith（順序非依存）をPATCH結果と照合する。不一致なら成功扱いせず、元の共有下書きをdirty=trueで保持し、現在の保存範囲との差と競合メッセージを出す。既存の「この版で下書きを保存する準備」から本人が再保存を選べる。自動で新しい版へ上書き再送しない。

一致する通常保存の成功表示は維持する。

## 確認

- 修正前: 実API raceテストで成功表示禁止assertionがFAIL。
- 修正後: `mise exec -- bunx vitest run docs/evidence/CONNECT-FRIENDS/sharing-race.test.tsx` 2ケースPASS（並行編集、競合なし）。修正後raceは保存private v3、下書きpublic v2/dirty=true、競合表示。`sharing-race-result.json` / `sharing-normal-result.json`。
- `src/features/friends/picker.test.tsx` PASS。
- CORE #338統合後の `mise exec -- bunx tsc --noEmit` 全体PASS。
- `mise exec -- bunx vite build` PASS（既存の大きいchunk警告のみ）。

専用API/DBの起動はREADME.md参照。raceテストは実API必須であり通常のオフライン単体テスト集へ含めない。初期化済みalice本人を使い、テスト実行ごとに新しい検証記録が残る。

#142全体は未完。友達解除/再承認、AI比較引用、共有ルート、Mapbox、全失敗条件等は引き続き残す。

# 導入管理の接続handoffと相棒入口

既存 `docs/evidence/GROW-UI/progress.md` の試用→確認→導入、ON/OFF/解除、版変更、競合の模擬UI操作証拠を再利用。
契約は本branch基点に統合された正式OpenAPIとdigestを指定。install/enabled/delete/conflictの操作単位を追加し、CONNECT-PLUGINSが既存表示componentから正式APIへ接続できるようにする。
fixtureの操作成功を実保存完了とはしない。画像最終照合の未達は#215に保持。

## 相棒管理入口

バイク導入カード内にしか入口がなく、導入0件では相棒管理へ進めなかった。
バイクカードがない場合に既存ラベル/様式/同じonCompanion callbackを表示する。バイク導入時は既存入口を維持して重複しない。
専用Chrome plugin-handoff.localhost:45199、390px、UI検査入口でストア→導入済み0件→相棒を管理をクリックし、#/companion-settings遷移を確認。
検査entryには相棒画面を登録していないため遷移先内容は本証拠の対象外。相棒担当へ通常App側の確認を依頼する。
型チェック成功。既存成功試験の反復はしていない。

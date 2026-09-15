# AI.engine v1 — 先行実装
## 状態
コードの先行提供。実AI・CORE HTTP・INFORMATION実DB・SETTINGS・voiceの受入は未達。
## 公開口
server/ai/index.ts: registerAiTask / startRun / getRun / cancelRun / retryRun / createConversation / getConversation / patchConversation / deleteConversation / listConversations / listMessages / readAppliedRefs / appendAppliedRef / assertRunAdoptable / canonicalHash。
型はserver/ai/types.ts。
各用途はinput/outputSchema, readMaterials, buildPrompt, validateResult, toBodyを登録する。必要な許可scopeをpermissionScopeに宣言。分析保存は任意の同期persistResultで行い、外側のAI transactionへ追随する。request.model/promptVersionはpersistResultでは実行時固定値。
SourceRefの権限/版をAIで判定しない。INFORMATION assertSourcesCurrentをconfigureAiのassertSourceRefsへ接続する。assertAllowedにはSETTINGSの現在許可を接続。未接続はPROVIDER_UNAVAILABLE。
## 採用
await getRunの現在根拠検査後、呼出側同期transaction内でassertRunAdoptable(db,context,id,{expectedAttempt,expectedVersion?})→対象保存→appendAppliedRef。
内部BEGIN/COMMITを持たない。refはtype/id/version/contentHash。type=record/theme/insight/discovery/map-settings/transfer-plan-set。type+id+contentHash重複は追記しない。
## 一時CLI
server/ai/provider.ts: runEphemeral({prompt,schema,model,signal,deadline?,task?}), getAiConfiguration(task)。用途側が材料をJSONとしてpromptへ含める。録音データの入力ではない。
## 確認
node --experimental-strip-types --test server/ai/engine.test.ts: 4/4成功。
node node_modules/typescript/bin/tsc --noEmit --allowImportingTsExtensions --module nodenext --target es2022 --esModuleInterop --skipLibCheck server/ai/index.ts server/ai/provider.ts: 成功。
試験providerは明示した代替であり実AIの証拠ではない。固定Codex 0.153.4のlogin statusはChatGPTログイン成功、製品モデルは未設定。
## 残件
CORE統合で共通transaction/CommonError/登録/起動復帰/HTTP再送とDTOへ接続する。用途定義は各担当が提供。実AI一用途保存/再取得、実refs/設定許可、voiceの実取得/文字起こし/確認、独立実装役レビューを行い、全受入前にIssueを閉じない。

独立レビュー: 6275ac1でUTF-8 chunk境界破損P2を指摘。collectAgentMessageへ収集を分離しsetEncoding(utf8)で修正。日本語1byte分割・最終未改行のテストは修正前失敗→修正後成功。provider/routes型チェック成功。

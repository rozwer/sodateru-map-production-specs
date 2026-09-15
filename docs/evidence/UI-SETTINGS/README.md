# UI-SETTINGS #17 引継ぎ

## 提供したもの

`src/features/settings/screens.tsx` は `screens: ScreenDefinition[]` をexportする。

- `settings`：設定一覧・現在値。`section=ai` で一般AI利用設定を同じ面に表示する。AI送信確認はUI-EXPLORE #10が所有し、設定変更では相談を送信しない（#10回答に合意）。
- `profile-settings`：写真、表示名20文字、紹介200文字、文字サイズ、動きを減らす、通知。
- `suggestion-settings`：提案タイミング、対象日数、停止した場所と活動の解除。低評価と停止の違いを表示する。
- `$location-settings`、`$media-settings`、`$data-settings`：利用設定と実ブラウザ権限を分離。保存期間、設定文書の書出し、設定初期化、記録詳細への入口。
- `statistics-view.tsx`：活動統計と取得元の表示部品。正式statistics DTO待ちのため、**画面登録とAPI接続は未実施**。

共有ファイルは編集していない。共通`src/app/api`、`useScreenState`、`ScreenProps.active`、`layout={header:back,bottomNav:false,background:soft}`を利用。プロフィールと設定は別versionを使用し、保存後にGETで再取得する。写真は`getMeIcon`のBlobをobject URLへ変換する。本人/画面離脱の要求をabortし、未保存入力を画面単位で保持する。

## 契約・検査の範囲

- SETTINGS: aa172f2、`fragments/SETTINGS.json` v1.0.0。停止項目、AI許可、画像操作をこの契約から接続した。
- UI-BASE: c6b73e3のshell契約を読取。作業branchはdevelop 2332231まで取得済み。
- 08_23_29の指定画像を開き、共通Shellの390×844表示でカード・余白・色を比較した。健康の入口は最新の優先順位により未実施。
- 390px検査用応答で表示名「操作確認さやか」、文字サイズ「大」、動きを減らすを変更→保存→再GET結果の表示を確認した。
- `suggestion-settings-390-fixture.png` は検査応答の画面。API/DBの証拠ではない。
- 限定strict TypeScript検査は成功（`noUncheckedIndexedAccess`含む）。`.local/visual-qa` に公開CORE client生成器・SETTINGS断片・BASEの読取コピーを置いた検査であり、統合develop全体の型検査ではない。
- `preview/` は検査専用。実装からimportされない。通常APIをモックへ自動切替しない。

## 未完了・次担当

**Issue #17は未完了。finishせず、成果を保持してclaimを返却する。**

1. UI-INTEGRATION #98／統合担当: 本PRの登録画面を共通QA入口に取り込む。CORE生成client・OpenAPIへSETTINGS断片が反映された版を使用する。統合版での実API保存→再GET→再起動後表示、写真差替え/削除、通信失敗、競合、320px/200%/キーボード確認は未実施。
2. CORE #3: generatorがobjectとanyOfの兄弟propertiesを落とす問題は #3 comment 5673773115へ報告済み。UIは停止項目をinガードで扱う。共通生成物は本PRから編集しない。
3. UI-BASE #4: 保存成功後の`sodateru:settings-changed`イベントを受け、本人プロフィールとSettings.displayを再取得し、全アプリの文字サイズ/動きへ適用する依頼を #4 comment 5673725524へ送信済み。接続確認は未実施。
4. INSIGHTS #34／ACTIVITY #21: #34回答では`getReflectionSummary`へstatisticsを追加予定。confirmed訪問数・新しい場所数・活動内訳/対象recordId・取得元/欠測とGPS距離の正規出力を補完中。`ActivityStatsView`/`SourcesView`への変換と`activity-stats`/`data-sources`登録は後続。UIに業務集計は追加しない。
5. 健康3画面と健康導線は「時間が余れば着手」の最新方針で未実施。恒久対象外・合格扱いにしない。
6. 停止対象の写真と個別更新時刻はSETTINGS応答にないため、写真なしの場所アイコンを表示し架空値を追加していない。
7. 機能内文言のmessages断片への整理は未実施。

2026-09-15の緊急終了指示に従い、追加実装・検査を止めて最小成果を公開した。残受入は#72のCONNECT移管と#98の組込みで調整する。

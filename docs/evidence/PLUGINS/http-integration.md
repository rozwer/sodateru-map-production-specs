# PLUGINS 実CORE HTTP確認

2026-09-15、正式CORE 0.3.0をdevelopから担当branchへmergeして実施。

## 再現

`mise exec -- node --experimental-transform-types --test server/features/plugins/http.test.ts`

localhostの実HTTPサーバーを起動し、COREのcreateApp / openDatabases / seedProfiles / contractValidation / idempotentMutationをそのまま使用。DBと本人設定は一時ディレクトリの実ファイル。保存後にHTTPサーバーとDBを閉じ、同じファイルで再起動する。mode別cookieのまま保存状態を取得する。

共通の生成済みOpenAPIはPLUGINS v2未反映のため、`compose-contract.py` が**共有生成器**を呼んで一時ファイルへ合成した契約をcreateAppへ渡す。共有pathの編集や共通基盤の複製はしていない。テスト登録はHTTP検証用と明示したpluginで、製品BIKE等の登録証拠ではない。

## 結果

PASS（1 HTTPシナリオ、fail 0）。

|操作|確認|
|本人開始/live・demo|201、mode別cookie/DB|
|state→試用|200、mock明示、導入設定は0件|
|確認後導入|201、settingsを保存|
|同一キー/同一入力の再送|200、現在の資源を再取得|
|同一キー/異なるenabled|409|
|If-Match欠落/古い版|428 / 412|
|HTTPサーバー+DB終了→再起動|保存DTOが一致、再送も200|
|demo導入一覧|live保存と分離して0件|
|更新準備失敗|502、旧DTOを保持|
|版更新→版戻し|200、2→1へ復帰|
|停止|200、適用宣言0件|
|削除→再取得/元導入要求再送|204→404/404|
|削除後SQL|保存settingsのregion=Kyotoを保持|

## 独立レビュー指摘

非選択プラグインBを除くとA/Cの競合hashが変わり選択が消える問題を修正。残る版と宣言が全て一致する場合だけ、prefer/coexistを新しい部分集合へ引き継ぐ。選択された機能を除いて未解決競合が残る場合は削除前に409、保存は変更しない。

`mise exec -- node --experimental-transform-types --test --test-name-pattern 'removing or stopping' server/features/plugins/plugins.test.ts`：1件PASS。

## 未達

PLUGINS fragment v2の共通生成物への正式反映、実プラグインの登録と固有API、UI-MAP/通常地図の実操作E2Eは未完了。Issueを閉じない。

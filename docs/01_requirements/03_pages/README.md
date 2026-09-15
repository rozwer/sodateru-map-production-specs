# ページ仕様

[各ページでできること・機能要件の一覧](functions.md)。

[コンポーネント指定の見直し](component-audit.md)。実装時は各components.jsonのimplementationと[部品型](component-types.json)を使う。参照画像を製品画面へ貼る実装はしない。

追加画像を統合し、画面と表示モードを機能単位で分割した。
添付画像は配置・操作要素の正本、元リポジトリは動作・保存・受入の根拠、本番OpenAPIは通信契約の正本とする。
採用画像33枚、67画面・表示モード（うちストア入口1件は元仕様から補完）、投稿完了状態を含む操作定義、225の利用者向け機能と既存の成立条件。
重複7枚と旧メニュー1枚を吸収した。Downloadsの原本は変更していない。

## 分割

| ファイル | 内容 |
|---|---|
| `<page>/page.json` | 画面名・参照画像・画像内領域・CSS画面サイズ・分割先 |
| `<page>/components.json` | 部品型・描画形式・値の取得元・子要素・操作名・testId |
| `<page>/states.json` | 画像の各モードで表示/非表示/操作可能な要素 |
| `<page>/interactions.json` | 各操作の結果・遷移・入力引継ぎ・呼ぶAPI |
| `<page>/api.json` | operationId・method/path・入力元・OpenAPI参照 |
| `<page>/requirements.json` | 機能要件と受入条件の対応 |
| `<page>/acceptance.json` | 実装後に実施する受入シナリオ |

[共通の状態・保存・失敗時・レイアウト検査](common.json)、[元仕様と採用方針](sources.json)、[画像の採用と吸収](references/catalog.json)、[API不足一覧](api-gaps.json)。

## 読み方

ページIDは画像内の表示モードを含む論理画面であり、独立したURLや67個のルート・モーダルを作る指示ではない。
詳細・編集・確認は同じ面を切り替え、呼出元の地図範囲・日付・条件へ戻す。
各画面のREADMEから機能・保存・成立条件へ進み、実装対象のinteractionsとapiで接続先を確認する。共通条件は本書を参照し、各画面には固有の条件を置く。
API不足は機能の削除理由にせず、本番契約へ追加すべき要件として残す。
元リポの旧4タブ、静的入口のみのIssue制限、古いAPI名は移植しない。

## 画面一覧

| 画面 | 画像の表示モード |
|---|---|
| [活動の統計](activity-stats/README.md) | week |
| [AIへ送る内容の確認](ai-consent/README.md) | main |
| [Codexと探索](ai-explore/README.md) | candidates |
| [みんなを知る](community-home/README.md) | home |
| [相棒の制作](companion-create/README.md) | main |
| [相棒をファイルから追加](companion-import/README.md) | main |
| [相棒の管理](companion-settings/README.md) | main |
| [相談履歴](conversation-history/README.md) | main |
| [今日の軌跡](daily-track/README.md) | expanded-record / calendar |
| [データの取得元](data-sources/README.md) | sources |
| [日記](diary/README.md) | editor |
| [二つの体験を比較](experience-compare/README.md) | main |
| [お願いを書く](feature-request-edit/README.md) | main |
| [みんなの欲しい機能](feature-requests/README.md) | main |
| [友達との共通点](friend-compare/README.md) | main |
| [共有する友達](friend-picker/README.md) | main |
| [友達のプロフィール](friend-profile/README.md) | main |
| [友達の地図](friends-map/README.md) | friend-selected |
| [体験で地図が育った](growth-result/README.md) | main |
| [健康データの連携](health-connect/README.md) | main |
| [健康データの項目と期間](health-permissions/README.md) | main |
| [健康データの連携状態](health-status/README.md) | main |
| [解釈を訂正](interpretation-correction/README.md) | editor |
| [地域投稿の詳細](knowledge-detail/README.md) | main |
| [地域の知の絞り込み](knowledge-filter/README.md) | main |
| [地域の知を探す](knowledge-list/README.md) | main |
| [地域の知](local-knowledge/README.md) | place-selected |
| [地図](map/README.md) | place-selected / area-info / search-place-selected |
| [地図の表示設定](map-layers/README.md) | main |
| [メモを編集](memo-edit/README.md) | main |
| [もやの探索候補](mist-detail/README.md) | main |
| [共通メニュー・モード切替](navigation/README.md) | main-menu / self-mode / community-mode |
| [地図オブジェクトを編集](object-edit/README.md) | main |
| [地図に配置](object-place/README.md) | main |
| [わたしの地図](personal-map/README.md) | place-selected |
| [変更が重なる場合](plugin-conflict/README.md) | main |
| [拡張機能の詳細](plugin-detail/README.md) | main |
| [導入前の確認](plugin-install/README.md) | main |
| [導入済みの機能](plugin-manage/README.md) | main |
| [拡張機能を探す](plugin-store/README.md) | main |
| [拡張機能を試す](plugin-trial/README.md) | main |
| [機能の更新](plugin-update/README.md) | main |
| [プロフィールと表示](profile-settings/README.md) | main |
| [探索コンパス](quest-compass/README.md) | main |
| [体験を残す](record-create/README.md) | editor / place-picker / confirmation |
| [記録を削除](record-delete/README.md) | main |
| [体験を編集](record-edit/README.md) | editor |
| [振り返りの記録](reflection-history/README.md) | answer-expanded |
| [振り返りの質問](reflection-question/README.md) | answering |
| [経路の条件](route-conditions/README.md) | main |
| [徒歩ナビゲーション](route-navigation/README.md) | main |
| [経路の候補](route-results/README.md) | main |
| [今日はどう過ごしたい？](self-checkin/README.md) | main |
| [自分を知る](self-home/README.md) | home |
| [設定](settings/README.md) | main |
| [友達のおすすめルート](shared-route/README.md) | main |
| [共有範囲の確認](sharing/README.md) | main |
| [提案候補の詳細](suggestion-detail/README.md) | main |
| [提案とまとめの条件](suggestion-settings/README.md) | main |
| [提案候補一覧](suggestions/README.md) | main |
| [テーマを編集](theme-edit/README.md) | main |
| [自分のテーマ](themes/README.md) | main |
| [傾向の根拠](trend-evidence/README.md) | main |
| [傾向の確認・訂正](trend-review/README.md) | main |
| [タイプ診断](type-diagnosis/README.md) | week |
| [訪問の確認](visit-confirm/README.md) | not-visited-selected |
| [音声で相談](voice-consultation/README.md) | main |

## 共通の成立条件

全画面に適用する。

- 対象データがない場合は、その対象の0件状態と次にできる操作を表示する。取得できない状態を0件と同一視しない。
- 保存や取得に失敗した場合は入力と対象を保持し、処理結果が分かる状態で再試行できる。
- [共通要件](common.json)の画面サイズ・文字拡大・メニュー開閉時の操作可能性を満たす。

受入条件は未実行。機能の完了は表示だけでなく、必要な保存・再表示を含めて判断する。

### 閲覧のみの画面

各ページの「保存と再表示」から参照する場合は、次を適用する。

このページでの閲覧・検索・選択だけでは、保存済みの体験や相手の情報を変更しない。選択した対象・日付・条件を遷移先へ渡し、戻ったときに元の文脈を再表示する。

## 検査

`mise exec -- node docs/01_requirements/03_pages/verify.mjs`

検査対象は分割ファイル、要素/操作/状態/受入の参照、遷移先、operationIdとmethod/path、画像ハッシュと領域。
ブラウザ動作・実API・DB保存・画像再現の検証はまだ実施していない。受入シナリオはすべてnot-run。
実装時には320px・390px・広い画面・文字200%・キーボード表示で、各操作後の開閉/遷移/通信と保存後の再表示を確認する。
個別要素の画像矩形と実ルーターへのURL接続は、画像と実DOMを照合する段階で確定する。

[依頼フォームの画面画像](references/feature-request-flow-v2.png)。

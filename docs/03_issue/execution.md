# 4人の着手順と依存

[担当一覧](README.md)へ戻る。

## 運用の前提

A（rozwer）が全UIを実装する。B（koshiro）・C（kaiya）・D（mattsun）は非UIの機能を完結させ、API・保存・固有処理の提供でAを支える。画面群をB〜Dへ移す運用は行わない。

実装はorigin/develop起点の専用worktreeとGitHub Issue/board・担当登録を使う。全機能の契約補完完了は全員の着手条件にしない。共通の本人context・通信・登録の境界を先に合わせ、固有の未決契約を使う実装/接続だけを該当箇所で止める。登録/claim/契約準備/実接続の状態を区別する。

## 最初の4件と次の候補

| 担当 | 初手で進めること | 次の候補 | 提供待ちで進める独立作業 |
|---|---|---|---|
| A（rozwer） | UI-BASE：共通画面・通信・地図/チャットの受渡し | UI-MAP / UI-RECORDS | 契約が決まった相棒・地域・設定の構成/状態/端末操作 |
| B（koshiro） | CORE：起動・本人context・DB・機能登録 | INFORMATION / RECORDS | HEALTHのXML解析、FEATURE-REQUESTSの投稿保存 |
| C（kaiya） | PLACES：検索・候補・採用・場所詳細 | ROUTES / PLUGINS | PLUGINSの版/競合、MAP-CUSTOMの手動装飾 |
| D（mattsun） | AI：実行・保存・取消/再試行 | INSIGHTS / COMPANION | COMPANIONのZIP検査/保存、THEMESの所属/メモ保存 |

4件の提案pathは互いに重ならない。CとDはBの起動基盤を待つ間、固定した契約に沿ってadapter・固有処理・保存SQLを進め、基盤提供後に実接続する。Aはkoshiroが提供する同じ型付きクライアントを使う。テスト応答は明示し、機能側で整形した契約どおりの応答へ接続する。

次候補は次にUIへ必要な提供物から選び、予約だけにして先にclaimしてpathを塞がない。完了・待ち・競合が発生した時に、次の実作業と候補2件を更新する。全員が一緒に段階を終える待ち合わせは置かない。

## 早く渡す共通処理

| 提供元 | 完成させて渡すもの | 主な利用先 |
|---|---|---|
| B：CORE | 起動・本人context・DB・再送/版・router/migration登録 | 全処理側 |
| A：UI-BASE | 部品・文言・画面登録・地図/チャットの境界 | Aの全画面群 |
| B：CORE | 共通Schema/API生成器の反映・型付き共通クライアント | 全担当 |
| B：INFORMATION | 実効日時/場所、現在の閲覧条件、記録/共有検索、source-checks | PLACES / RECORDS / INSIGHTS / AI |
| C：PLACES | 保存場所・期限/retention付き候補・採用・詳細 | ROUTES / EXPLORATION / SUGGESTIONS |
| C：ROUTES | 基本経路の実取得・全行程保存・再取得を先行提供 | UI-ROUTES / EXPLORATION / SUGGESTIONS / TRANSFER |
| D：AI | 用途登録・材料/参照版・実行/取消/結果 | REFLECTION / INSIGHTS / EXPLORATION / MAP-CUSTOM |

BはCORE→INFORMATIONを優先する。INFORMATIONは検索と根拠の共通処理に絞り、人物/友達操作・共有テーマ/ルート・地域の声はCOMMUNITYで続ける。これにより、場所検索・記録・分析へ必要な共通読取を早く渡せる。

INSIGHTSは記録/訪問の実効日時をINFORMATIONから読み、期間集計と結果保存を提供する。現行Summaryは健康取込を要求しないため、HEALTH全体やGPS取得の完成は前提にしない。健康由来の数値はHEALTHが実装し、UI-SETTINGSが両者の実接続を受け入れる。

## 依存表の読み方

- **着手前依存** `hard_dependencies`：指定した場合だけ提供元Issueが完了するまで着手しない。UI-BASEの利用は提供物の実接続依存で扱い、独立画面の着手を止めない。
- **実接続・完了依存** `connect_after`：先行作業はできるが、このIssueの完了までに提供と接続確認が必要。
- **契約/外部設定の不足**：該当Issueに残し、[契約補完表](contract-gates.md)で解消する。テスト応答の成功で埋めない。

`index.json` の `connect_inputs.outputs` に必要な提供物ID、`deliveries` に利用操作と確認条件を記録している。[先行提供とUI接続の順](delivery.md)に従い、提供元Issue全体の完了を待たず必要な提供物の統合と実接続証拠を確認する。途中統合があっても、残る受入があればIssue全体は完了にしない。起動基盤のコピー、別のAI実行器、独自API fieldで依存を回避しない。

### B〜Dの実接続・完了依存

| 担当 | Issue | 必要な提供元 |
|---|---|---|
| B | [CORE](issues/CORE.md) | なし |
| B | [INFORMATION](issues/INFORMATION.md) | [CORE](issues/CORE.md) |
| B | [RECORDS](issues/RECORDS.md) | [CORE](issues/CORE.md)、[INFORMATION](issues/INFORMATION.md) |
| B | [ACTIVITY](issues/ACTIVITY.md) | [CORE](issues/CORE.md)、[RECORDS](issues/RECORDS.md)、[INFORMATION](issues/INFORMATION.md) |
| B | [SETTINGS](issues/SETTINGS.md) | [CORE](issues/CORE.md)、[RECORDS](issues/RECORDS.md) |
| B | [COMMUNITY](issues/COMMUNITY.md) | [INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md) |
| B | [HEALTH](issues/HEALTH.md) | [CORE](issues/CORE.md) |
| B | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | [CORE](issues/CORE.md) |
| C | [PLACES](issues/PLACES.md) | [CORE](issues/CORE.md)、[INFORMATION](issues/INFORMATION.md) |
| C | [ROUTES](issues/ROUTES.md) | [CORE](issues/CORE.md)、[PLACES](issues/PLACES.md) |
| C | [PLUGINS](issues/PLUGINS.md) | [CORE](issues/CORE.md) |
| C | [MAP-CUSTOM](issues/MAP-CUSTOM.md) | [CORE](issues/CORE.md)、[AI](issues/AI.md)、[PLUGINS](issues/PLUGINS.md) |
| C | [BIKE](issues/BIKE.md) | [PLUGINS](issues/PLUGINS.md)、[ROUTES](issues/ROUTES.md) |
| C | [DISASTER](issues/DISASTER.md) | [PLUGINS](issues/PLUGINS.md)、[PLACES](issues/PLACES.md) |
| C | [PILGRIMAGE](issues/PILGRIMAGE.md) | [PLUGINS](issues/PLUGINS.md)、[ROUTES](issues/ROUTES.md)、[AI](issues/AI.md) |
| D | [AI](issues/AI.md) | [CORE](issues/CORE.md)、[INFORMATION](issues/INFORMATION.md) |
| D | [INSIGHTS](issues/INSIGHTS.md) | [AI](issues/AI.md)、[INFORMATION](issues/INFORMATION.md) |
| D | [REFLECTION](issues/REFLECTION.md) | [AI](issues/AI.md)、[RECORDS](issues/RECORDS.md)、[INFORMATION](issues/INFORMATION.md)、[INSIGHTS](issues/INSIGHTS.md) |
| D | [THEMES](issues/THEMES.md) | [AI](issues/AI.md)、[RECORDS](issues/RECORDS.md)、[INFORMATION](issues/INFORMATION.md) |
| D | [EXPLORATION](issues/EXPLORATION.md) | [AI](issues/AI.md)、[PLACES](issues/PLACES.md)、[ROUTES](issues/ROUTES.md)、[INFORMATION](issues/INFORMATION.md) |
| D | [SUGGESTIONS](issues/SUGGESTIONS.md) | [AI](issues/AI.md)、[PLACES](issues/PLACES.md)、[ROUTES](issues/ROUTES.md)、[INFORMATION](issues/INFORMATION.md)、[ACTIVITY](issues/ACTIVITY.md)、[SETTINGS](issues/SETTINGS.md) |
| D | [TRANSFER](issues/TRANSFER.md) | [AI](issues/AI.md)、[PLACES](issues/PLACES.md)、[ROUTES](issues/ROUTES.md)、[INFORMATION](issues/INFORMATION.md) |
| D | [COMPANION](issues/COMPANION.md) | [CORE](issues/CORE.md) |

### Aの実接続・完了依存

Aの担当内は独立セッションで画面群へ並列着手できる。中央messages/tokens/routerはUI-BASE専任とし、未提供の共通部品は合意済みの境界を使う。画面内の入力・表示・状態は先に進め、各APIの提供後に実接続する。リンク先の機能全体が完成するまで、現在画面の独立作業を止めない。

| Issue | 必要な提供元 |
|---|---|
| [UI-BASE](issues/UI-BASE.md) | [CORE](issues/CORE.md) |
| [UI-MAP](issues/UI-MAP.md) | [UI-BASE](issues/UI-BASE.md)、[PLACES](issues/PLACES.md)、[ACTIVITY](issues/ACTIVITY.md)、[THEMES](issues/THEMES.md)、[MAP-CUSTOM](issues/MAP-CUSTOM.md)、[PLUGINS](issues/PLUGINS.md)、[COMMUNITY](issues/COMMUNITY.md) |
| [UI-RECORDS](issues/UI-RECORDS.md) | [UI-BASE](issues/UI-BASE.md)、[RECORDS](issues/RECORDS.md)、[ACTIVITY](issues/ACTIVITY.md)、[INFORMATION](issues/INFORMATION.md)、[PLACES](issues/PLACES.md)、[REFLECTION](issues/REFLECTION.md)、[INSIGHTS](issues/INSIGHTS.md) |
| [UI-EXPLORE](issues/UI-EXPLORE.md) | [UI-BASE](issues/UI-BASE.md)、[AI](issues/AI.md)、[EXPLORATION](issues/EXPLORATION.md)、[ROUTES](issues/ROUTES.md)、[COMMUNITY](issues/COMMUNITY.md)、[SETTINGS](issues/SETTINGS.md)、[TRANSFER](issues/TRANSFER.md) |
| [UI-ROUTES](issues/UI-ROUTES.md) | [UI-BASE](issues/UI-BASE.md)、[PLACES](issues/PLACES.md)、[ROUTES](issues/ROUTES.md) |
| [UI-REFLECTION](issues/UI-REFLECTION.md) | [UI-BASE](issues/UI-BASE.md)、[REFLECTION](issues/REFLECTION.md)、[THEMES](issues/THEMES.md)、[INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md)、[SETTINGS](issues/SETTINGS.md)、[CORE](issues/CORE.md) |
| [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [UI-BASE](issues/UI-BASE.md)、[INSIGHTS](issues/INSIGHTS.md)、[THEMES](issues/THEMES.md)、[INFORMATION](issues/INFORMATION.md) |
| [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | [UI-BASE](issues/UI-BASE.md)、[SUGGESTIONS](issues/SUGGESTIONS.md)、[COMMUNITY](issues/COMMUNITY.md)、[ROUTES](issues/ROUTES.md)、[ACTIVITY](issues/ACTIVITY.md)、[SETTINGS](issues/SETTINGS.md) |
| [UI-FRIENDS](issues/UI-FRIENDS.md) | [UI-BASE](issues/UI-BASE.md)、[INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md)、[REFLECTION](issues/REFLECTION.md)、[THEMES](issues/THEMES.md)、[ROUTES](issues/ROUTES.md)、[COMMUNITY](issues/COMMUNITY.md) |
| [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [UI-BASE](issues/UI-BASE.md)、[COMMUNITY](issues/COMMUNITY.md)、[INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md)、[PLACES](issues/PLACES.md) |
| [UI-PLUGINS](issues/UI-PLUGINS.md) | [UI-BASE](issues/UI-BASE.md)、[PLUGINS](issues/PLUGINS.md)、[BIKE](issues/BIKE.md)、[DISASTER](issues/DISASTER.md)、[PILGRIMAGE](issues/PILGRIMAGE.md)、[FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md)、[CORE](issues/CORE.md) |
| [UI-SETTINGS](issues/UI-SETTINGS.md) | [UI-BASE](issues/UI-BASE.md)、[SETTINGS](issues/SETTINGS.md)、[HEALTH](issues/HEALTH.md)、[ACTIVITY](issues/ACTIVITY.md)、[INSIGHTS](issues/INSIGHTS.md)、[CORE](issues/CORE.md) |
| [UI-COMPANION](issues/UI-COMPANION.md) | [UI-BASE](issues/UI-BASE.md)、[COMPANION](issues/COMPANION.md) |

## 待ちが発生したとき

1. 自分のIssueに独立した固有処理・保存・失敗確認が残るなら進める。
2. なければ次候補から着手し、待ち項目・入力契約・提供元・証拠を元Issueへ残す。不要な共有pathは正式に返す。
3. B〜Dの候補が尽きたら、他の処理側担当から未着手の完結した機能を移管する。UIのpathと実装はAに固定する。
4. 終盤はBが保存/共有取消/再起動、Cが外部データと経路、DがAI/参照変更/提案の未達受入と接続不具合を持ち、Aの実画面確認へ結果を返す。

「担当Issueがある」だけで稼働中に数えず、次に行う実作業があるかを確認する。成功済み確認の反復や空のIssueを作業確保の手段にしない。全員の非UI残作業が先に尽きる偏りを避けるため、Aに必要な契約/応答例/保存結果を早期に提供し、画面受入も開発中から進める。

## 共通pathと担当の境界

| 対象 | 担当 | 渡すもの |
|---|---|---|
| UI・文言・画面router・Mapbox/Three.js・端末操作 | rozwer | 共通クライアントとB〜Dの表示材料を受け取り、画面へ接続 |
| 起動・共通HTTP/DB・基本migration | CORE担当 | 機能router/migrationを登録する入口 |
| API生成器・共通Schema・共通型/通信処理・基本DDLの後続変更 | koshiro | 各機能の断片と入出力差分を反映。登録入口を先に作り、変更単位の統合後に共有pathを返す |
| 固有API・SQL・外部adapter・プロンプト・結果採用 | 各非UI Issue担当 | 実API/保存/再取得と固有失敗の結果 |

担当変更はB〜D間の非UI単位で行い、名前・Issue・path・残作業を揃える。[Task Skill](../../.agents/skills/sodateru-task/SKILL.md)に従い、取得範囲外の編集や他担当の無断ロック解除をしない。

## 大きさを調整するタイミング

着手時に、最初に統合できる成果と、完了までに残る利用操作を確認する。別の利用目的・保存結果が単独で使えるなら分割候補、同じ保存を往復しないと確認できず調整が増えるなら統合候補にする。

本案は36件を維持し、Issue内の提供単位と利用操作を具体化した。工数は初回の実作業から補正する。移管・分割後も要件ID/受入IDを残し、機能を減らして小さくしない。

## 完了の扱い

処理側は担当API・業務処理・保存・再取得・固有の失敗を確認する。外部接続が必要な成功条件は実providerで確認し、UI接続が残ることを明記して提供する。

Aは対象ページの全要件/受入と共通画面条件、参照画像との一致を実画面で確認する。独自デザインへ変更しない。操作→API→DB→再読込、空/失敗/取消、共有解除/削除を含む。処理側の提供とAの実画面受入が揃って、利用者向け機能を完了とする。

証拠は `docs/evidence/<ID>/`。ビルド、DB、本人、dataMode、入力/対象ID、操作、通信、再表示を残す。成功後は変更・不具合・具体的懸念がなければ検査を繰り返さない。

GitHub導入後の完了は、統合branchへの反映、証拠、board done、ロック解除、Issue closeまで揃える。オーケストレーターは調整と状態把握を行う。

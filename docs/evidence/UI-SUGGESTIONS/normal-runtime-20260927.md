# 通常構成の希望保存と候補生成

2026-09-27、Issue #15/#141。専用worktree suggestions-finish-15、起点 cb73c9d4d6696430a9fa07619ac87c3293644700。正式 server/app/main.ts / 生成client / SQLite、API3188、suggestions-finish.localhost:5288（strictPort）。DBは .local/acceptance.sqlite / acceptance-demo.sqlite、共有DBは未変更。

## 実画面で確認

本人self/live、保存受入の検証という人工入力で「静かな公園を歩きたい」「2時間以上」「徒歩」「子どもと」「無理しない距離」→回答だけ残す。checkinId c3f0a610-2c63-4837-b4be-b31fdb3b2c0a version1を正式POST→GETで表示。

実DBのanswersはtimeBudget={kind:atLeast,minutes:120}、minutes=null、companion=children、effort=easy、mode=walking。suggestions=0、visits=0。API PID44399を停止、PID50929で同じDBを開き、同URLをreloadすると本文と全選択が復元した。共通型を別途合成せず通常構成だけを使った。

同じ条件から候補検索すると空batch eaeeccf6-b111-4bf0-9c2a-45bfe1119fb1が返り、0件と理由を表示。条件変更から同じcheckinへ戻り、希望と構造化条件を保持した。

## 実不具合と修正

希望を「白川公園」、1時間/ひとり/少し歩いてもよいへ変更して通常生成するとINPUT_TOO_LARGE（候補・記録がAI入力上限）になった。入力は保持、再試行を表示。原因はexplanationPromptへ候補routeEvidenceの全geometry/legs/stepsを複製し、128KiB上限を超えること。

説明AIへ渡すrouteEvidenceだけを実測時間・距離・mode・provider・previewId・期限・条件評価に限定。候補そのものは変更せず、経路保存/順位/再検証の根拠は完全保持する。12,000点の経路を含む回帰では元入力128KiB超、修正後8KiB未満、時間/provider/sourceRefs/滞在未確認を保持し候補を非変更。generation.test.mjs 3件PASS、全体typecheck PASS。

実AIは既存OAuth + gpt-5.6-luna。本人設定画面でAI/場所利用だけを明示保存し、修正したAPIをPID74638で再起動して通常UIから新しい条件版の候補生成を開始。結果は以下に追記。

## 未完了

候補の詳細/選択/しおり/経路/訪問取消、実媒体権限、全viewport/参照照合は確認済みとはしない。既存API側の実provider/達成取消/再起動証拠は docs/evidence/SUGGESTIONS/runtime-checks.md とlive-smoke.jsonを再利用する。地図の一部取得失敗表示あり。Issue全体は閉じない。

## 修正後の実生成・表示・再起動

- 実Luna呼出し1回でbatch 9c5e6203-6664-48b9-b652-8684e8ede459がcomplete、3候補が通常UIに表示。generatorはgpt-5.6-luna/common-ai-v1。失敗batch a0446c58-86eb-4994-9d8c-ff819a9765a6はINPUT_TOO_LARGEのまま保持。
- suggestion d3b7c5c4-c352-42b2-a389-c07785252143 / place a68dc108-cf72-4284-9f62-2b1bed836df2を詳細で開き、理由・実OpenStreetMap出典・未知条件を表示。実DBでpresented_atとviewed_atが別時点、selected_at=null/status=offered、visits=0。
- UIでしおり保存と本人メモ保存→GET成功。「ここまでの経路を探す」は同じdestinationPlaceId/suggestionId/mode=walkingをroute-conditionsへ渡し、目的地名と住所を表示。
- APIをPID25633へ再起動し、詳細URLをreload。しおりON、同じ理由/出典、メモ「実API保存・再起動確認用メモ」を再表示。AI再生成なし。
- この生成で、滞在不明なら徒歩80分でもexact60分条件に残る別不具合を発見。既知の移動＋滞在の下限がexact上限を超える場合は除外するようdomainを修正。滞在不明で移動20分はunknownのまま残し、atLeast120を上限にはしない。domain.test.mjs 7件PASS。
- 保存済みの上記batchは下限修正前の結果であり、時間条件適合の成功証拠にはしない。旧snapshotを手編集せず保持。下限修正は独立回帰で確認し、成功したAI生成を反復していない。

統合済み同意復帰テストの型エラー2件も修正（paramsをRecord<string,string>、nullable共有fixtureの前に型付きローカルdraft）。このファイルを正式追加claimして編集した。最新develop取り込み後の全体typecheck成功。

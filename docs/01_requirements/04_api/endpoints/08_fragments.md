# 機能別契約断片

自動生成。契約の存在と機能の実装・接続完了は別。

## getConversations

`GET /api/v1/conversations`

会話一覧

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

## getBikeState

`GET /api/v1/bike/state`

設定・保存結果・停止状態に応じた表示

ownerKeyはplugin:{installId}。停止・削除後はclearOwnerKeysだけを解除し、他の共通地図表示を残す。保存結果は削除しない。

## postBikeSearch

`POST /api/v1/bike/searches`

導入設定で実地点・道路検索し保存

実取得はdataKind=real。PLUGINS trialのdataKind=mockとは別。設定正本はPLUGINS。時点のない出典はupdatedAt=null。検索失敗・中断後は新しいIdempotency-Keyで明示再検索する。

## getBikeResult

`GET /api/v1/bike/results/{resultId}`

本人・モード別の保存snapshot再取得



## postBikeRouteAssessment

`POST /api/v1/bike/route-assessments`

共通driving経路と車種条件の根拠を評価

検索結果と経路形状hash・設定hash/versionを固定。周辺道路タグをMapbox全区間通行根拠には転用しない。unknown/ineligibleはadoptable=false。

## postBikeAdoption

`POST /api/v1/bike/adoptions`

確認済み経路だけ共通保存へ採用



## getBookmarks

`GET /api/v1/bookmarks`





## postBookmarks

`POST /api/v1/bookmarks`



対象一意。元の閲覧権限/期限を再確認。同じ対象は既存の一件を返し場所採用は行わない。

## getBookmarksBookmarkId

`GET /api/v1/bookmarks/{bookmarkId}`





## deleteBookmarksBookmarkId

`DELETE /api/v1/bookmarks/{bookmarkId}`





## getKnowledgeTopics

`GET /api/v1/knowledge/topics`





## getKnowledge

`GET /api/v1/knowledge`



分類辞書で正規化後INFORMATIONの同じ条件で検索。全条件適用後にページ分割。

## getKnowledgeMap

`GET /api/v1/knowledge/map`



一覧と同じ条件。最大2000件、超過413。場所なしはtotalCountのみ。

## getSharedRecordsRecordId

`GET /api/v1/shared-records/{recordId}`





## getSharedThemes

`GET /api/v1/shared-themes`





## getSharedThemesThemeId

`GET /api/v1/shared-themes/{themeId}`





## getThemesThemeIdSharing

`GET /api/v1/themes/{themeId}/sharing`





## patchThemesThemeIdSharing

`PATCH /api/v1/themes/{themeId}/sharing`





## importCompanionZip

`POST /api/v1/companion/imports`



multipartのfileに50,000,000 bytes以下のv2 ZIPを指定。展開100,000,000 bytes/厳密2file/73使用セルと未使用透明を検査し、25動作・視線確認を返す。登録/現在選択は変更しない。

## getCompanionImport

`GET /api/v1/companion/imports/{importId}`





## getCompanionAtlas

`GET /api/v1/companion/imports/{importId}/atlas`





## confirmCompanionImport

`PATCH /api/v1/companion/imports/{importId}/confirmation`





## registerCompanionImport

`POST /api/v1/companion/imports/{importId}/registration`



全requiredActions確認後に登録。selectCurrent=true時のみsettingsVersionを必須として同じtransactionで現在選択を更新。

## listCompanions

`GET /api/v1/companions`





## getCompanion

`GET /api/v1/companions/{companionId}`





## getCompanionSettings

`GET /api/v1/companion/settings`





## updateCompanionSettings

`PATCH /api/v1/companion/settings`





## createCompanionDraft

`POST /api/v1/companion/drafts`





## listCompanionDrafts

`GET /api/v1/companion/drafts`





## getCompanionDraft

`GET /api/v1/companion/drafts/{draftId}`





## updateCompanionDraft

`PATCH /api/v1/companion/drafts/{draftId}`





## exportCompanionInstructions

`GET /api/v1/companion/drafts/{draftId}/instructions`





## uploadCompanionReferenceImage

`POST /api/v1/companion/reference-images`





## getCompanionReferenceImage

`GET /api/v1/companion/reference-images/{mediaId}`





## getCompanionProvider

`GET /api/v1/companion/provider`





## createCompanionGeneration

`POST /api/v1/companion/generations`





## listCompanionGenerations

`GET /api/v1/companion/generations`





## getCompanionGeneration

`GET /api/v1/companion/generations/{generationId}`





## refreshCompanionGeneration

`POST /api/v1/companion/generations/{generationId}/refresh`





## cancelCompanionGeneration

`POST /api/v1/companion/generations/{generationId}/cancellation`





## adoptCompanionGeneration

`POST /api/v1/companion/generations/{generationId}/adoption`



成功候補の全動作を確認して明示採用。現在選択は変更しない。

## getSessionProfiles

`GET /api/v1/session/profiles`

ローカルで選択できる本人

サーバー設定で許可したprofileKeyと名前のみ。人物検索や公開プロフィールとは別。

## postSession

`POST /api/v1/session`

ローカル本人セッション開始

登録済みprofileKeyから本人を解決し、X-Data-Modeに対応するHttpOnly cookieを発行する。Idempotency-Keyは初回から固定し、終了後の同じキーは404。

## getSession

`GET /api/v1/session`

現在の本人セッション



## deleteSession

`DELETE /api/v1/session`

本人セッション終了



## getDisaster

`GET /api/v1/disaster`

防災設定と保存済み結果を再取得



## postDisasterRefresh

`POST /api/v1/disaster/refresh`

導入済み地域の防災情報を実提供元から更新

PLUGINSの最新設定を利用。If-MatchはPluginSetting.version。全取得失敗は502（GETで旧結果と失敗を再取得）。一部失敗はpartialとして明示し旧snapshotを保持。停止・設定変更中の遅着結果は409。

## postMapDialoguesResultsResultIdHistory

`POST /api/v1/map-dialogues/results/{resultId}/history`

期限内の一時候補を既存の保存相談へ関連付ける



## getConversationsConversationIdMapDialogue

`GET /api/v1/conversations/{conversationId}/map-dialogue`

保存相談から期限内の同じ候補へ復帰する



## getDiscoveryFacts

`GET /api/v1/discovery-facts`

観察対象で利用可能な出典付き根拠を読む



## getFeatureRequests

`GET /api/v1/feature-requests`

機能要望一覧

権限: 本人または公開閲覧者。保存先: なし。本人またはpublicのみ。personId/visibilityで絞り込む。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

## postFeatureRequests

`POST /api/v1/feature-requests`

機能要望投稿

表示名は投稿時の入力を固定保存しプロフィールへ追随しない。明示PATCHでのみ変更。本文は原文200文字以内、公開時は空白のみ不可。titleは最初の空でない行をtrimして生成、空の非公開下書きは「下書き」。互換入力titleは保存値へ使用しない。regionTags/purposeTagsは本人入力を各5件・各1〜20文字・重複なしで保存する。

## getFeatureRequestsRequestId

`GET /api/v1/feature-requests/{requestId}`

機能要望詳細

権限: 本人または公開閲覧者。保存先: なし。本人またはpublicのみ。

## patchFeatureRequestsRequestId

`PATCH /api/v1/feature-requests/{requestId}`

機能要望編集・公開変更

表示名は投稿時の入力を固定保存しプロフィールへ追随しない。明示PATCHでのみ変更。本文は原文200文字以内、公開時は空白のみ不可。titleは最初の空でない行をtrimして生成、空の非公開下書きは「下書き」。互換入力titleは保存値へ使用しない。regionTags/purposeTagsは本人入力を各5件・各1〜20文字・重複なしで保存する。

## deleteFeatureRequestsRequestId

`DELETE /api/v1/feature-requests/{requestId}`

機能要望削除

権限: 本人。保存先: feature_requests。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

## patchFeatureRequestEmpathy

`PATCH /api/v1/feature-requests/{requestId}/empathy`

共感の追加・解除

本人×投稿一意の望む状態指定。If-Match必須。既に指定状態なら再送として現在値を返し件数と版を増やさない。実際に変更する場合は最新投稿versionを照合する。非公開は本人のみ。

## getFeatureRequestDevelopmentGuide

`GET /api/v1/feature-requests/development-guide`

本番リポジトリの開発ガイド



## getRecords

`GET /api/v1/records`

本人記録一覧

権限: 本人。保存先: なし。本人の記録だけ。共通RecordQueryと同じ期間重なり条件を使いfrom/to/timeZoneを一組で指定。日時不明は期間なし、またはincludeUndated=trueなら含む。placeIdは実効場所、themeIdは本人テーマの所属でAND。返却は編集用RecordView。 rangeMatchはoverlapが既定。startsWithinではeffectiveStartedAtがfrom以上to未満の記録に限定してからページ分割し、cursorにもこの条件を束縛する。

## getInsights

`GET /api/v1/insights`

分析・比較一覧

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 from/toはcreatedAtへ適用。 読取/本人評価の前にSourceRefを照合。変更済みはSOURCE_CHANGED、削除/権限なしはNOT_FOUND。一覧は現在有効な結果のみ返す。

## getInsightsInsightId

`GET /api/v1/insights/{insightId}`

分析・比較詳細

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。 元の入力版が変更済みなら409 INPUT_CHANGED、削除・非公開化なら404。 読取/本人評価の前にSourceRefを照合。変更済みはSOURCE_CHANGED、削除/権限なしはNOT_FOUND。一覧は現在有効な結果のみ返す。

## patchInsightsInsightId

`PATCH /api/v1/insights/{insightId}`

分析への判断・訂正

権限: 本人。保存先: insights。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。 review非nullならreviewedAtをサーバー時刻へ。review=nullならreviewNote/reviewedAtもnull。判断は同じ結果IDへ保存し元の記録を変更しない。 読取/本人評価の前にSourceRefを照合。変更済みはSOURCE_CHANGED、削除/権限なしはNOT_FOUND。一覧は現在有効な結果のみ返す。

## deleteInsightsInsightId

`DELETE /api/v1/insights/{insightId}`

分析結果削除

権限: 本人。保存先: insights削除、messagesの参照解除。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 messages.insightIdをnullにする。 読取/本人評価の前にSourceRefを照合。変更済みはSOURCE_CHANGED、削除/権限なしはNOT_FOUND。一覧は現在有効な結果のみ返す。

## getPlaces

`GET /api/v1/places`

保存済み場所一覧

権限: 本人。保存先: なし。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

## postPlaces

`POST /api/v1/places`

候補採用・手動登録

権限: 本人。保存先: places。candidateでは本人・期限を確認しprovider+externalIdで照合。既存なら200でそのPlaceを返す。manualはprovider=manual、externalId/sourceUrl/fetchedAt=null、attributionは空文字。要求IDと既存IDが異なる場合も返却されたIDを使う。 候補のretention=storableを必須としtemporaryは409 REQUEST_CONFLICT。creation_receiptsを期限照合より先に確認し、同じ要求は現在の場所を返す。削除済みなら404で復活させない。categoriesもコピーする。

## getPlaceCandidates

`GET /api/v1/place-candidates`

場所候補検索

権限: 本人。保存先: なし。qまたはcategoryの一方を必須。qはtrim/NFKC/小文字化して保存場所を検索し、0件ならNominatim。categoryではlongitude/latitudeの両方を必須とし緯度±85。categoryは5件固定のためlimit指定不可。候補は15分、本人・dataModeで分離。temporaryは閲覧だけで保存不可。共通の場所検索仕様を適用。

## getPlacesPlaceId

`GET /api/v1/places/{placeId}`

場所詳細

権限: 本人。保存先: なし。共通getPlaceDetailのPlaceDetailをdataへ返す。colocatedは同じ非nullのbuildingKeyで名前・ID順。本人訪問は全ページ取得し、ownRecords/sharedRecords/visitsを領域別状態で返す。主対象なしは404。schemaのerrorは共通Errorとして保持する。

## patchPlacesPlaceId

`PATCH /api/v1/places/{placeId}`

場所情報・建物対応の訂正

同じdataModeの本人セッションによる共有場所の共同訂正。If-Match必須。手動fieldは外部refreshより優先しresetFieldsで最新外部値へ戻す。外部取得失敗時は旧値と訂正を保持する。

## getPlugins

`GET /api/v1/plugins`





## getPluginSettings

`GET /api/v1/plugin-settings`





## postPluginSettings

`POST /api/v1/plugin-settings`





## getPluginSettingsPluginId

`GET /api/v1/plugin-settings/{pluginId}`





## patchPluginSettingsPluginId

`PATCH /api/v1/plugin-settings/{pluginId}`





## deletePluginSettingsPluginId

`DELETE /api/v1/plugin-settings/{pluginId}`





## getPluginState

`GET /api/v1/plugin-state`





## getPluginVersions

`GET /api/v1/plugins/{pluginId}/versions`





## postPluginTrial

`POST /api/v1/plugins/{pluginId}/trial`





## postPluginUpdate

`POST /api/v1/plugin-settings/{pluginId}/update`





## postPluginRollback

`POST /api/v1/plugin-settings/{pluginId}/rollback`





## getRecordsRecordIdDeletionPreview

`GET /api/v1/records/{recordId}/deletion-preview`

記録削除の影響を確認

本人のみ。返されたversionを既存DELETEのIf-Matchへ渡す。確認後の編集・媒体変更は412となり再確認する。本文/媒体/テーマ所属を削除、訪問/独立メモを保持。

## getRecordsRecordIdExport

`GET /api/v1/records/{recordId}/export`

記録を人が読めるHTML文書で書出し

本人のみ。原文・場所日時・用途活動感想・確認項目・公開範囲と全媒体を保存順に含む単体HTML。ready媒体はdata URIで内包し削除後もファイル内で閲覧できる。pending/failedは未収録状態を明示。ready実体が失われていれば503で書出し失敗とし成功扱いしない。Cache-Control: private,no-store。Content-Disposition: attachment。ダウンロード完了は削除操作とは独立。

## getReflectionQuestions

`GET /api/v1/reflection/questions`

本人の質問履歴を状態で絞り再取得する

本人の質問履歴を状態で絞り再取得する。回答は版付きmemo正本から読む。

## postReflectionQuestions

`POST /api/v1/reflection/questions`

完了extractから保存済み質問を取得する

完了extractから保存済み質問を取得する。新しい根拠なしに質問を追加しない。質問なしは404。

## getReflectionQuestionsQuestionId

`GET /api/v1/reflection/questions/{questionId}`

質問と回答原文を同じIDで再取得する

質問と回答原文を同じIDで再取得する。

## patchReflectionQuestionsQuestionId

`PATCH /api/v1/reflection/questions/{questionId}`

回答と状態を保存する

回答と状態を保存する。AI実行から独立したtransactionで原文を確定し、訂正は同じ回答recordIdを更新する。

## postReflectionComparisons

`POST /api/v1/reflection/comparisons`

異なる二記録と本人の共通点・違い各100文字を保存する

異なる二記録と本人の共通点・違い各100文字を保存する。AI成功を条件にしない。

## getReflectionComparisonsComparisonId

`GET /api/v1/reflection/comparisons/{comparisonId}`

手動比較を再取得する

手動比較を再取得する。根拠変更は本人入力のみ保持しinsight=null/changed、共有取消は404で引用を返さない。

## patchReflectionComparisonsComparisonId

`PATCH /api/v1/reflection/comparisons/{comparisonId}`

同じ比較IDの本人入力を訂正する

同じ比較IDの本人入力を訂正する。左右IDは固定し新しい根拠版へ再照合。本人の違うは共通patchInsightsInsightIdへ保存する。

## postReflectionAdoptions

`POST /api/v1/reflection/adoptions`

extract用途・理由または本人確認済み日記を明示採用する

extract用途・理由または本人確認済み日記を明示採用する。既存記録版が変われば412で本人編集を保持する。

## postRouteSearches

`POST /api/v1/route-searches`

経路取得

権限: 本人。保存先: なし。共通previewRouteへRouteRequestを渡す。2〜10地点、walking/drivingのみ実接続。cycling/transitは501 MODE_UNSUPPORTED。隣接同座標は400。区間数=地点数−1、形状・距離・時間は全区間成功時に返す。返却previewIdをresultIdへ改名しretentionを保持。temporary候補を含む経路は保存不可。

## getSavedRoutes

`GET /api/v1/saved-routes`

本人の保存ルート一覧

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

## postSavedRoutes

`POST /api/v1/saved-routes`

ルート保存

権限: 本人。保存先: saved_routes。resultId→previewId。共通saveRouteがcreation_receiptsを先に照合し、未保存なら本人・dataMode・期限・参照版・retention=storableを検査する。private/sharedWith=[]/saved/currentLeg=0で保存。既存の同じ作成は200、違う入力は409。

## getSavedRoutesRouteId

`GET /api/v1/saved-routes/{routeId}`

保存ルート詳細

権限: 本人または現在の共有先・公開閲覧者。保存先: なし。現在の共有権限を確認し保存した地点順・経路・状態を返す。

## patchSavedRoutesRouteId

`PATCH /api/v1/saved-routes/{routeId}`

ルート編集・案内・共有

権限: 本人。保存先: saved_routes。visibility=selectedはsharedWithが1人以上。private/publicは空配列。人物の存在と重複を検査する。 resultId指定時は本人の有効な結果で地点・経路を一緒に置換、status=saved,currentLeg=0へ。status/currentLegとの同時指定は422。案内開始は経路がありfetchedAtから15分以内。currentLegはlegsの添字。状態遷移表に従う。 共通RouteUpdateへ渡す場合はresultId→previewId、If-Match→expectedVersion。title省略時は現行titleを渡す。temporaryは409。区間geometryもDBへ保存する。

## deleteSavedRoutesRouteId

`DELETE /api/v1/saved-routes/{routeId}`

ルート削除

権限: 本人。保存先: saved_routes削除、suggestions更新。該当suggestions.routeIdをnullへ変更。

## postRouteComparisons

`POST /api/v1/route-comparisons`

同じ地点順の全行程を最大3候補で比較

各provider応答の代替経路を全区間結合し形状の重複を除く。各項目のresultIdを既存ルート保存へ渡す。候補が1件しかない場合も水増ししない。未対応条件は501で拒否する。

## patchMe

`PATCH /api/v1/me`

本人プロフィール編集

本人プロフィール編集。表示名1〜20文字・紹介200文字以内。変更しない項目は省略、avatarUrl=nullでアイコン参照解除。If-MatchはPerson.version。

## getMeSettings

`GET /api/v1/me/settings`

本人の利用設定

本人contextとmode別DBから取得。未保存は明記した既定値とversion=1。ブラウザ権限の実際の状態とは分離。

## patchMeSettings

`PATCH /api/v1/me/settings`

本人の利用設定を保存

If-MatchはSettings.version。トップレベル省略は維持、内部オブジェクト・配列は全置換。AI許可は次の外部送信直前に再取得、提案停止は生成/現在候補表示に適用。履歴は削除しない。保存期間変更は方針の保存で、過去データの即時一括削除を行わない。

## resetMeSettings

`DELETE /api/v1/me/settings`

本人設定を初期値へ戻す



## getMeData

`GET /api/v1/me/data`

本人データ一覧と管理入口



## exportMeSettings

`GET /api/v1/me/settings/export`

プロフィールと設定を文書へ書出す



## getMeIcon

`GET /api/v1/me/icon`

本人アイコンの画像取得



## patchMeIcon

`PATCH /api/v1/me/icon`

本人アイコンを変更

If-MatchはPerson.version。1枚50MiBまで。元画像は本人/モード別の専用ファイルとして保存。差替えは古い本人アイコンだけ清掃し、記録mediaは削除しない。

## deleteMeIcon

`DELETE /api/v1/me/icon`

本人アイコンだけを削除



## getSelfCheckins

`GET /api/v1/self-checkins`

SelfCheckin一覧

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 dateはlocalDateと一致。

## postSelfCheckins

`POST /api/v1/self-checkins`

SelfCheckin作成

権限: 本人。保存先: 11_self_checkins。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。validUntilは作成日時より後。同じ時点の訂正は同じID、新しい回答は新ID。

## getSelfCheckinsCheckinId

`GET /api/v1/self-checkins/{checkinId}`

SelfCheckin単体取得

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

## patchSelfCheckinsCheckinId

`PATCH /api/v1/self-checkins/{checkinId}`

SelfCheckin編集

権限: 本人。保存先: 11_self_checkins。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。validUntilは作成日時より後。同じ時点の訂正は同じID、新しい回答は新ID。

## deleteSelfCheckinsCheckinId

`DELETE /api/v1/self-checkins/{checkinId}`

SelfCheckin削除

権限: 本人。保存先: 11_self_checkins。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。提案のcheckinIdをnullにする。依存結果は根拠照合で無効化。

## postSuggestionBatches

`POST /api/v1/suggestion-batches`

提案候補生成

権限: 本人。保存先: suggestions。checkin非nullならtype=checkinで本人・version・validUntilを照合。expiresAtは処理時刻より後。候補はoffered、未提示、completedVisitId=nullで保存。全候補を一括保存し空ならitems=[]。候補の適合・順序・処理期限はQ05。再取得はsuggestionsのbatchId条件。

## getSuggestions

`GET /api/v1/suggestions`

提案一覧

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

## getSuggestionsSuggestionId

`GET /api/v1/suggestions/{suggestionId}`

提案詳細

権限: 本人。保存先: なし。参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。

## patchSuggestionsSuggestionId

`PATCH /api/v1/suggestions/{suggestionId}`

提案の提示・選択・達成

権限: 本人。保存先: suggestions。状態遷移表に従う。presented=trueで初回presentedAtのみ保存。selectedへ初遷移した時刻をselectedAtへ。completedは同じ本人・場所のconfirmed訪問を指定。それ以外はcompletedVisitId=null。routeIdは本人ルートのみ。期限後の新規選択・達成は409。

## createTransferRecipe

`POST /api/v1/transfer/recipes`





## listTransferRecipes

`GET /api/v1/transfer/recipes`





## getTransferRecipe

`GET /api/v1/transfer/recipes/{recipeId}`





## replaceTransferRecipe

`PATCH /api/v1/transfer/recipes/{recipeId}`





## createTransferPlanSet

`POST /api/v1/transfer/plan-sets`





## listTransferPlanSets

`GET /api/v1/transfer/plan-sets`





## getTransferPlanSet

`GET /api/v1/transfer/plan-sets/{planSetId}`





## adoptTransferPlan

`POST /api/v1/transfer/plan-sets/{planSetId}/adoption`





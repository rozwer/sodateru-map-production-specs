# 要件とIssueの対応

[Issue一覧](README.md)へ戻る。

対象は現在の画面JSON・OpenAPI・API不足一覧。317件の画面要件（225件の機能を含む）を、UI担当Issueへ一度ずつ割り当てる。共通処理の受入は各処理側Issueから参照する。API104操作は実装担当を一つずつ割り当てた。これは文書の対応確認で、実装済みの件数ではない。

## 画面

| 画面 | 要件数 | UIの完成担当 | 既存APIの実装担当 | 契約補完 |
|---|---:|---|---|---|
| [活動の統計](../01_requirements/03_pages/activity-stats/README.md) | 5 | [UI-SETTINGS](issues/UI-SETTINGS.md) | [INSIGHTS](issues/INSIGHTS.md)、[INFORMATION](issues/INFORMATION.md) | [HEALTH](issues/HEALTH.md) |
| [AIへ送る内容の確認](../01_requirements/03_pages/ai-consent/README.md) | 4 | [UI-EXPLORE](issues/UI-EXPLORE.md) | 端末内/画面内 | [AI](issues/AI.md) |
| [Codexと探索](../01_requirements/03_pages/ai-explore/README.md) | 6 | [UI-EXPLORE](issues/UI-EXPLORE.md) | [EXPLORATION](issues/EXPLORATION.md) | [EXPLORATION](issues/EXPLORATION.md) |
| [みんなを知る](../01_requirements/03_pages/community-home/README.md) | 3 | [UI-FRIENDS](issues/UI-FRIENDS.md) | 端末内/画面内 | — |
| [相棒の制作](../01_requirements/03_pages/companion-create/README.md) | 5 | [UI-COMPANION](issues/UI-COMPANION.md) | 端末内/画面内 | [COMPANION](issues/COMPANION.md) |
| [相棒をファイルから追加](../01_requirements/03_pages/companion-import/README.md) | 4 | [UI-COMPANION](issues/UI-COMPANION.md) | 端末内/画面内 | [COMPANION](issues/COMPANION.md) |
| [相棒の管理](../01_requirements/03_pages/companion-settings/README.md) | 5 | [UI-COMPANION](issues/UI-COMPANION.md) | 端末内/画面内 | [COMPANION](issues/COMPANION.md) |
| [相談履歴](../01_requirements/03_pages/conversation-history/README.md) | 4 | [UI-EXPLORE](issues/UI-EXPLORE.md) | [AI](issues/AI.md) | [EXPLORATION](issues/EXPLORATION.md) |
| [今日の軌跡](../01_requirements/03_pages/daily-track/README.md) | 6 | [UI-RECORDS](issues/UI-RECORDS.md) | [ACTIVITY](issues/ACTIVITY.md)、[INFORMATION](issues/INFORMATION.md) | — |
| [データの取得元](../01_requirements/03_pages/data-sources/README.md) | 4 | [UI-SETTINGS](issues/UI-SETTINGS.md) | [ACTIVITY](issues/ACTIVITY.md) | [HEALTH](issues/HEALTH.md) |
| [日記](../01_requirements/03_pages/diary/README.md) | 5 | [UI-REFLECTION](issues/UI-REFLECTION.md) | [INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md) | — |
| [二つの体験を比較](../01_requirements/03_pages/experience-compare/README.md) | 4 | [UI-REFLECTION](issues/UI-REFLECTION.md) | [RECORDS](issues/RECORDS.md) | [REFLECTION](issues/REFLECTION.md) |
| [お願いを書く](../01_requirements/03_pages/feature-request-edit/README.md) | 5 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CORE](issues/CORE.md)、[FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| [みんなの欲しい機能](../01_requirements/03_pages/feature-requests/README.md) | 6 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| [友達との共通点](../01_requirements/03_pages/friend-compare/README.md) | 4 | [UI-FRIENDS](issues/UI-FRIENDS.md) | [INFORMATION](issues/INFORMATION.md) | [REFLECTION](issues/REFLECTION.md) |
| [共有する友達](../01_requirements/03_pages/friend-picker/README.md) | 4 | [UI-FRIENDS](issues/UI-FRIENDS.md) | [COMMUNITY](issues/COMMUNITY.md) | — |
| [友達のプロフィール](../01_requirements/03_pages/friend-profile/README.md) | 5 | [UI-FRIENDS](issues/UI-FRIENDS.md) | [COMMUNITY](issues/COMMUNITY.md)、[INFORMATION](issues/INFORMATION.md) | [COMMUNITY](issues/COMMUNITY.md) |
| [友達の地図](../01_requirements/03_pages/friends-map/README.md) | 6 | [UI-FRIENDS](issues/UI-FRIENDS.md) | [COMMUNITY](issues/COMMUNITY.md)、[INFORMATION](issues/INFORMATION.md) | — |
| [体験で地図が育った](../01_requirements/03_pages/growth-result/README.md) | 4 | [UI-RECORDS](issues/UI-RECORDS.md) | [ACTIVITY](issues/ACTIVITY.md)、[RECORDS](issues/RECORDS.md) | — |
| [健康データの連携](../01_requirements/03_pages/health-connect/README.md) | 4 | [UI-SETTINGS](issues/UI-SETTINGS.md) | 端末内/画面内 | [HEALTH](issues/HEALTH.md) |
| [健康データの項目と期間](../01_requirements/03_pages/health-permissions/README.md) | 5 | [UI-SETTINGS](issues/UI-SETTINGS.md) | 端末内/画面内 | [HEALTH](issues/HEALTH.md) |
| [健康データの連携状態](../01_requirements/03_pages/health-status/README.md) | 4 | [UI-SETTINGS](issues/UI-SETTINGS.md) | 端末内/画面内 | [HEALTH](issues/HEALTH.md) |
| [解釈を訂正](../01_requirements/03_pages/interpretation-correction/README.md) | 5 | [UI-RECORDS](issues/UI-RECORDS.md) | [RECORDS](issues/RECORDS.md)、[INSIGHTS](issues/INSIGHTS.md) | — |
| [地域投稿の詳細](../01_requirements/03_pages/knowledge-detail/README.md) | 4 | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md) | [COMMUNITY](issues/COMMUNITY.md) |
| [地域の知の絞り込み](../01_requirements/03_pages/knowledge-filter/README.md) | 4 | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | 端末内/画面内 | [COMMUNITY](issues/COMMUNITY.md) |
| [地域の知を探す](../01_requirements/03_pages/knowledge-list/README.md) | 5 | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [INFORMATION](issues/INFORMATION.md)、[COMMUNITY](issues/COMMUNITY.md) | [COMMUNITY](issues/COMMUNITY.md) |
| [地域の知](../01_requirements/03_pages/local-knowledge/README.md) | 4 | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [PLACES](issues/PLACES.md)、[COMMUNITY](issues/COMMUNITY.md) | — |
| [地図](../01_requirements/03_pages/map/README.md) | 8 | [UI-MAP](issues/UI-MAP.md) | [PLACES](issues/PLACES.md)、[ACTIVITY](issues/ACTIVITY.md) | [COMMUNITY](issues/COMMUNITY.md) |
| [地図の表示設定](../01_requirements/03_pages/map-layers/README.md) | 4 | [UI-MAP](issues/UI-MAP.md) | [PLUGINS](issues/PLUGINS.md) | [MAP-CUSTOM](issues/MAP-CUSTOM.md) |
| [メモを編集](../01_requirements/03_pages/memo-edit/README.md) | 5 | [UI-REFLECTION](issues/UI-REFLECTION.md) | [RECORDS](issues/RECORDS.md) | [THEMES](issues/THEMES.md) |
| [もやの探索候補](../01_requirements/03_pages/mist-detail/README.md) | 4 | [UI-EXPLORE](issues/UI-EXPLORE.md) | [SUGGESTIONS](issues/SUGGESTIONS.md)、[PLACES](issues/PLACES.md) | [COMMUNITY](issues/COMMUNITY.md) |
| [共通メニュー・モード切替](../01_requirements/03_pages/navigation/README.md) | 5 | [UI-BASE](issues/UI-BASE.md) | 端末内/画面内 | — |
| [地図オブジェクトを編集](../01_requirements/03_pages/object-edit/README.md) | 6 | [UI-MAP](issues/UI-MAP.md) | 端末内/画面内 | [MAP-CUSTOM](issues/MAP-CUSTOM.md) |
| [地図に配置](../01_requirements/03_pages/object-place/README.md) | 5 | [UI-MAP](issues/UI-MAP.md) | 端末内/画面内 | [MAP-CUSTOM](issues/MAP-CUSTOM.md) |
| [わたしの地図](../01_requirements/03_pages/personal-map/README.md) | 5 | [UI-MAP](issues/UI-MAP.md) | [THEMES](issues/THEMES.md)、[INFORMATION](issues/INFORMATION.md)、[PLACES](issues/PLACES.md)、[ACTIVITY](issues/ACTIVITY.md) | — |
| [変更が重なる場合](../01_requirements/03_pages/plugin-conflict/README.md) | 4 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) |
| [拡張機能の詳細](../01_requirements/03_pages/plugin-detail/README.md) | 3 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) | — |
| [導入前の確認](../01_requirements/03_pages/plugin-install/README.md) | 4 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) | — |
| [導入済みの機能](../01_requirements/03_pages/plugin-manage/README.md) | 5 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) |
| [拡張機能を探す](../01_requirements/03_pages/plugin-store/README.md) | 5 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) | — |
| [拡張機能を試す](../01_requirements/03_pages/plugin-trial/README.md) | 4 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) |
| [機能の更新](../01_requirements/03_pages/plugin-update/README.md) | 5 | [UI-PLUGINS](issues/UI-PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) | [PLUGINS](issues/PLUGINS.md) |
| [プロフィールと表示](../01_requirements/03_pages/profile-settings/README.md) | 5 | [UI-SETTINGS](issues/UI-SETTINGS.md) | [CORE](issues/CORE.md)、[SETTINGS](issues/SETTINGS.md) | [SETTINGS](issues/SETTINGS.md) |
| [探索コンパス](../01_requirements/03_pages/quest-compass/README.md) | 4 | [UI-EXPLORE](issues/UI-EXPLORE.md) | 端末内/画面内 | — |
| [体験を残す](../01_requirements/03_pages/record-create/README.md) | 7 | [UI-RECORDS](issues/UI-RECORDS.md) | [PLACES](issues/PLACES.md)、[ACTIVITY](issues/ACTIVITY.md)、[RECORDS](issues/RECORDS.md) | — |
| [記録を削除](../01_requirements/03_pages/record-delete/README.md) | 5 | [UI-RECORDS](issues/UI-RECORDS.md) | [RECORDS](issues/RECORDS.md) | [RECORDS](issues/RECORDS.md) |
| [体験を編集](../01_requirements/03_pages/record-edit/README.md) | 6 | [UI-RECORDS](issues/UI-RECORDS.md) | [RECORDS](issues/RECORDS.md) | — |
| [振り返りの記録](../01_requirements/03_pages/reflection-history/README.md) | 4 | [UI-REFLECTION](issues/UI-REFLECTION.md) | [AI](issues/AI.md) | [REFLECTION](issues/REFLECTION.md) |
| [振り返りの質問](../01_requirements/03_pages/reflection-question/README.md) | 5 | [UI-REFLECTION](issues/UI-REFLECTION.md) | [AI](issues/AI.md) | [REFLECTION](issues/REFLECTION.md) |
| [経路の条件](../01_requirements/03_pages/route-conditions/README.md) | 4 | [UI-ROUTES](issues/UI-ROUTES.md) | [PLACES](issues/PLACES.md)、[ROUTES](issues/ROUTES.md) | [ROUTES](issues/ROUTES.md) |
| [徒歩ナビゲーション](../01_requirements/03_pages/route-navigation/README.md) | 5 | [UI-ROUTES](issues/UI-ROUTES.md) | [ROUTES](issues/ROUTES.md) | [ROUTES](issues/ROUTES.md) |
| [経路の候補](../01_requirements/03_pages/route-results/README.md) | 5 | [UI-ROUTES](issues/UI-ROUTES.md) | [ROUTES](issues/ROUTES.md) | [ROUTES](issues/ROUTES.md) |
| [今日はどう過ごしたい？](../01_requirements/03_pages/self-checkin/README.md) | 7 | [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | [SUGGESTIONS](issues/SUGGESTIONS.md) | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| [自分を知る](../01_requirements/03_pages/self-home/README.md) | 5 | [UI-REFLECTION](issues/UI-REFLECTION.md) | [INFORMATION](issues/INFORMATION.md)、[CORE](issues/CORE.md) | — |
| [設定](../01_requirements/03_pages/settings/README.md) | 3 | [UI-SETTINGS](issues/UI-SETTINGS.md) | [CORE](issues/CORE.md) | [SETTINGS](issues/SETTINGS.md) |
| [友達のおすすめルート](../01_requirements/03_pages/shared-route/README.md) | 4 | [UI-FRIENDS](issues/UI-FRIENDS.md) | [COMMUNITY](issues/COMMUNITY.md)、[ROUTES](issues/ROUTES.md) | — |
| [共有範囲の確認](../01_requirements/03_pages/sharing/README.md) | 6 | [UI-FRIENDS](issues/UI-FRIENDS.md) | [RECORDS](issues/RECORDS.md) | — |
| [提案候補の詳細](../01_requirements/03_pages/suggestion-detail/README.md) | 5 | [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | [SUGGESTIONS](issues/SUGGESTIONS.md)、[INFORMATION](issues/INFORMATION.md) | [COMMUNITY](issues/COMMUNITY.md) |
| [提案とまとめの条件](../01_requirements/03_pages/suggestion-settings/README.md) | 4 | [UI-SETTINGS](issues/UI-SETTINGS.md) | 端末内/画面内 | [SETTINGS](issues/SETTINGS.md) |
| [提案候補一覧](../01_requirements/03_pages/suggestions/README.md) | 5 | [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | [SUGGESTIONS](issues/SUGGESTIONS.md) | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| [テーマを編集](../01_requirements/03_pages/theme-edit/README.md) | 5 | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [THEMES](issues/THEMES.md)、[INFORMATION](issues/INFORMATION.md) | [THEMES](issues/THEMES.md) |
| [自分のテーマ](../01_requirements/03_pages/themes/README.md) | 4 | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [THEMES](issues/THEMES.md) | — |
| [傾向の根拠](../01_requirements/03_pages/trend-evidence/README.md) | 4 | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [INSIGHTS](issues/INSIGHTS.md)、[INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md) | — |
| [傾向の確認・訂正](../01_requirements/03_pages/trend-review/README.md) | 4 | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [INSIGHTS](issues/INSIGHTS.md) | — |
| [タイプ診断](../01_requirements/03_pages/type-diagnosis/README.md) | 6 | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [INSIGHTS](issues/INSIGHTS.md) | — |
| [訪問の確認](../01_requirements/03_pages/visit-confirm/README.md) | 5 | [UI-RECORDS](issues/UI-RECORDS.md) | [ACTIVITY](issues/ACTIVITY.md) | — |
| [音声で相談](../01_requirements/03_pages/voice-consultation/README.md) | 4 | [UI-EXPLORE](issues/UI-EXPLORE.md) | 端末内/画面内 | [AI](issues/AI.md) |

各UI Issueは表の対象ページについて、requirements/acceptanceの全ID、interactionsの条件・渡す値、statesの全状態、参照画像を持つ。API担当列は実装所有であり、そのすべてが着手前依存という意味ではない。

## 既存API

| operationId | HTTP | 実装担当 |
|---|---|---|
| `getPlaces` | `GET /places` | [PLACES](issues/PLACES.md) |
| `postPlaces` | `POST /places` | [PLACES](issues/PLACES.md) |
| `getPlaceCandidates` | `GET /place-candidates` | [PLACES](issues/PLACES.md) |
| `getPlacesPlaceId` | `GET /places/{placeId}` | [PLACES](issues/PLACES.md) |
| `patchPlacesPlaceId` | `PATCH /places/{placeId}` | [PLACES](issues/PLACES.md) |
| `getMapGrowth` | `GET /map/growth` | [ACTIVITY](issues/ACTIVITY.md) |
| `getVisits` | `GET /visits` | [ACTIVITY](issues/ACTIVITY.md) |
| `postVisits` | `POST /visits` | [ACTIVITY](issues/ACTIVITY.md) |
| `getVisitsVisitId` | `GET /visits/{visitId}` | [ACTIVITY](issues/ACTIVITY.md) |
| `patchVisitsVisitId` | `PATCH /visits/{visitId}` | [ACTIVITY](issues/ACTIVITY.md) |
| `deleteVisitsVisitId` | `DELETE /visits/{visitId}` | [ACTIVITY](issues/ACTIVITY.md) |
| `getRecords` | `GET /records` | [INFORMATION](issues/INFORMATION.md) |
| `postRecords` | `POST /records` | [RECORDS](issues/RECORDS.md) |
| `getRecordsRecordId` | `GET /records/{recordId}` | [RECORDS](issues/RECORDS.md) |
| `patchRecordsRecordId` | `PATCH /records/{recordId}` | [RECORDS](issues/RECORDS.md) |
| `deleteRecordsRecordId` | `DELETE /records/{recordId}` | [RECORDS](issues/RECORDS.md) |
| `getRecordsRecordIdMedia` | `GET /records/{recordId}/media` | [RECORDS](issues/RECORDS.md) |
| `postRecordsRecordIdMedia` | `POST /records/{recordId}/media` | [RECORDS](issues/RECORDS.md) |
| `postRecordsRecordIdMediaReorder` | `POST /records/{recordId}/media/reorder` | [RECORDS](issues/RECORDS.md) |
| `getMediaMediaId` | `GET /media/{mediaId}` | [RECORDS](issues/RECORDS.md) |
| `deleteMediaMediaId` | `DELETE /media/{mediaId}` | [RECORDS](issues/RECORDS.md) |
| `getMediaMediaIdContent` | `GET /media/{mediaId}/content` | [RECORDS](issues/RECORDS.md) |
| `getTrackPoints` | `GET /track-points` | [ACTIVITY](issues/ACTIVITY.md) |
| `postTrackPoints` | `POST /track-points` | [ACTIVITY](issues/ACTIVITY.md) |
| `getTrackPointsPointId` | `GET /track-points/{pointId}` | [ACTIVITY](issues/ACTIVITY.md) |
| `postTrackPointsDeleteRange` | `POST /track-points/delete-range` | [ACTIVITY](issues/ACTIVITY.md) |
| `getConversations` | `GET /conversations` | [AI](issues/AI.md) |
| `postConversations` | `POST /conversations` | [AI](issues/AI.md) |
| `getConversationsConversationId` | `GET /conversations/{conversationId}` | [AI](issues/AI.md) |
| `patchConversationsConversationId` | `PATCH /conversations/{conversationId}` | [AI](issues/AI.md) |
| `deleteConversationsConversationId` | `DELETE /conversations/{conversationId}` | [AI](issues/AI.md) |
| `getConversationsConversationIdMessages` | `GET /conversations/{conversationId}/messages` | [AI](issues/AI.md) |
| `postConversationsConversationIdMessages` | `POST /conversations/{conversationId}/messages` | [AI](issues/AI.md) |
| `getMessagesMessageId` | `GET /messages/{messageId}` | [AI](issues/AI.md) |
| `postMessagesMessageIdCancel` | `POST /messages/{messageId}/cancel` | [AI](issues/AI.md) |
| `postMessagesMessageIdRetry` | `POST /messages/{messageId}/retry` | [AI](issues/AI.md) |
| `getReflectionDaysDate` | `GET /reflection/days/{date}` | [ACTIVITY](issues/ACTIVITY.md) |
| `getSelfCheckins` | `GET /self-checkins` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `postSelfCheckins` | `POST /self-checkins` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `getSelfCheckinsCheckinId` | `GET /self-checkins/{checkinId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `patchSelfCheckinsCheckinId` | `PATCH /self-checkins/{checkinId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `deleteSelfCheckinsCheckinId` | `DELETE /self-checkins/{checkinId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `getThemes` | `GET /themes` | [THEMES](issues/THEMES.md) |
| `postThemes` | `POST /themes` | [THEMES](issues/THEMES.md) |
| `getThemesThemeId` | `GET /themes/{themeId}` | [THEMES](issues/THEMES.md) |
| `patchThemesThemeId` | `PATCH /themes/{themeId}` | [THEMES](issues/THEMES.md) |
| `deleteThemesThemeId` | `DELETE /themes/{themeId}` | [THEMES](issues/THEMES.md) |
| `getReflectionSummary` | `GET /reflection/summary` | [INSIGHTS](issues/INSIGHTS.md) |
| `getInsights` | `GET /insights` | [INSIGHTS](issues/INSIGHTS.md) |
| `postInsights` | `POST /insights` | [INSIGHTS](issues/INSIGHTS.md) |
| `getInsightsInsightId` | `GET /insights/{insightId}` | [INSIGHTS](issues/INSIGHTS.md) |
| `patchInsightsInsightId` | `PATCH /insights/{insightId}` | [INSIGHTS](issues/INSIGHTS.md) |
| `deleteInsightsInsightId` | `DELETE /insights/{insightId}` | [INSIGHTS](issues/INSIGHTS.md) |
| `postSourceChecks` | `POST /source-checks` | [INFORMATION](issues/INFORMATION.md) |
| `postSuggestionBatches` | `POST /suggestion-batches` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `getSuggestions` | `GET /suggestions` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `getSuggestionsSuggestionId` | `GET /suggestions/{suggestionId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `patchSuggestionsSuggestionId` | `PATCH /suggestions/{suggestionId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| `postRouteSearches` | `POST /route-searches` | [ROUTES](issues/ROUTES.md) |
| `getSavedRoutes` | `GET /saved-routes` | [ROUTES](issues/ROUTES.md) |
| `postSavedRoutes` | `POST /saved-routes` | [ROUTES](issues/ROUTES.md) |
| `getSavedRoutesRouteId` | `GET /saved-routes/{routeId}` | [ROUTES](issues/ROUTES.md) |
| `patchSavedRoutesRouteId` | `PATCH /saved-routes/{routeId}` | [ROUTES](issues/ROUTES.md) |
| `deleteSavedRoutesRouteId` | `DELETE /saved-routes/{routeId}` | [ROUTES](issues/ROUTES.md) |
| `getTransitPasses` | `GET /transit-passes` | [ROUTES](issues/ROUTES.md) |
| `postTransitPasses` | `POST /transit-passes` | [ROUTES](issues/ROUTES.md) |
| `getTransitPassesPassId` | `GET /transit-passes/{passId}` | [ROUTES](issues/ROUTES.md) |
| `patchTransitPassesPassId` | `PATCH /transit-passes/{passId}` | [ROUTES](issues/ROUTES.md) |
| `deleteTransitPassesPassId` | `DELETE /transit-passes/{passId}` | [ROUTES](issues/ROUTES.md) |
| `getMe` | `GET /me` | [CORE](issues/CORE.md) |
| `patchMe` | `PATCH /me` | [SETTINGS](issues/SETTINGS.md) |
| `getPeople` | `GET /people` | [COMMUNITY](issues/COMMUNITY.md) |
| `getPeoplePersonId` | `GET /people/{personId}` | [COMMUNITY](issues/COMMUNITY.md) |
| `getFriendships` | `GET /friendships` | [COMMUNITY](issues/COMMUNITY.md) |
| `postFriendships` | `POST /friendships` | [COMMUNITY](issues/COMMUNITY.md) |
| `getFriendshipsFriendshipId` | `GET /friendships/{friendshipId}` | [COMMUNITY](issues/COMMUNITY.md) |
| `patchFriendshipsFriendshipId` | `PATCH /friendships/{friendshipId}` | [COMMUNITY](issues/COMMUNITY.md) |
| `deleteFriendshipsFriendshipId` | `DELETE /friendships/{friendshipId}` | [COMMUNITY](issues/COMMUNITY.md) |
| `getSharedRecords` | `GET /shared-records` | [INFORMATION](issues/INFORMATION.md) |
| `getSharedRecordsMap` | `GET /shared-records/map` | [INFORMATION](issues/INFORMATION.md) |
| `getPlacesPlaceIdVoices` | `GET /places/{placeId}/voices` | [COMMUNITY](issues/COMMUNITY.md) |
| `getSharedRoutes` | `GET /shared-routes` | [COMMUNITY](issues/COMMUNITY.md) |
| `getPlugins` | `GET /plugins` | [PLUGINS](issues/PLUGINS.md) |
| `getPluginSettings` | `GET /plugin-settings` | [PLUGINS](issues/PLUGINS.md) |
| `postPluginSettings` | `POST /plugin-settings` | [PLUGINS](issues/PLUGINS.md) |
| `getPluginSettingsPluginId` | `GET /plugin-settings/{pluginId}` | [PLUGINS](issues/PLUGINS.md) |
| `patchPluginSettingsPluginId` | `PATCH /plugin-settings/{pluginId}` | [PLUGINS](issues/PLUGINS.md) |
| `deletePluginSettingsPluginId` | `DELETE /plugin-settings/{pluginId}` | [PLUGINS](issues/PLUGINS.md) |
| `getFeatureRequests` | `GET /feature-requests` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| `postFeatureRequests` | `POST /feature-requests` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| `getFeatureRequestsRequestId` | `GET /feature-requests/{requestId}` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| `patchFeatureRequestsRequestId` | `PATCH /feature-requests/{requestId}` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| `deleteFeatureRequestsRequestId` | `DELETE /feature-requests/{requestId}` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| `postMapDialogues` | `POST /map-dialogues` | [EXPLORATION](issues/EXPLORATION.md) |
| `postMapDialoguesSelect` | `POST /map-dialogues/select` | [EXPLORATION](issues/EXPLORATION.md) |
| `postMapDialoguesCancel` | `POST /map-dialogues/cancel` | [EXPLORATION](issues/EXPLORATION.md) |
| `getMapDialoguesResultsResultId` | `GET /map-dialogues/results/{resultId}` | [EXPLORATION](issues/EXPLORATION.md) |
| `postDiscoveryCards` | `POST /discovery-cards` | [EXPLORATION](issues/EXPLORATION.md) |
| `getDiscoveryCards` | `GET /discovery-cards` | [EXPLORATION](issues/EXPLORATION.md) |
| `getDiscoveryCardsCardId` | `GET /discovery-cards/{cardId}` | [EXPLORATION](issues/EXPLORATION.md) |
| `deleteDiscoveryCardsCardId` | `DELETE /discovery-cards/{cardId}` | [EXPLORATION](issues/EXPLORATION.md) |
| `postDiscoveryCardsCardIdReactions` | `POST /discovery-cards/{cardId}/reactions` | [EXPLORATION](issues/EXPLORATION.md) |
| `getDiscoveryCardsCardIdReactions` | `GET /discovery-cards/{cardId}/reactions` | [EXPLORATION](issues/EXPLORATION.md) |
| `getDiscoveryCardsCardIdReactionsReactionId` | `GET /discovery-cards/{cardId}/reactions/{reactionId}` | [EXPLORATION](issues/EXPLORATION.md) |

## 画面数だけでは数えない範囲

| 要件の根拠 | 担当 |
|---|---|
| 技術スタック、共通通信、DB17表と既存追加DDL | COREが起動/登録/初期適用。各機能が固有SQL・更新規則 |
| 共通AI8用途 | AIが実行。REFLECTION / INSIGHTS / THEMES / EXPLORATION / MAP-CUSTOM / SUGGESTIONSが固有処理 |
| 共通場所/経路、保存可能性、取得元/期限 | PLACES / ROUTES |
| 情報取得、媒体閲覧、SourceRef、実効日時 | INFORMATION / RECORDS / ACTIVITY |
| 体験移転の二案・採用（API資料Q10） | TRANSFER / UI-EXPLORE |
| バイク・防災・聖地の固有データ | BIKE / DISASTER / PILGRIMAGE / UI-PLUGINS |
| 画面画像のない共通設定入口 | UI-SETTINGS / SETTINGS / CORE、生成先はCOMPANION |
| 提出・実デモの再現と開示 | 各担当が利用元・ライセンス・取得時点を証拠へ記録し、最後に調整担当が提出物へ集約 |

健康・相棒・装飾など新APIが必要な範囲は[契約補完表](contract-gates.md)に残している。旧リハーサルのIssueや台帳は本番の所有/進捗として引き継がない。

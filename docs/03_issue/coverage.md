# 画面・元ID・実接続・APIの対応

[一覧](README.md) · [原文を保持した機械可読対応](ui-connections.json)

67ページ/317要件/317受入の原条件を保持する。同じIDのUI面と実接続面が両方必要。sourceのmode/liveや原文を変更せず、画面単体の証拠はUIのscopeだけを満たす。

| ページ | UI | 接続 | 元要件/受入 | API担当 | 不足担当 |
|---|---|---|---|---|---|
| activity-stats | [UI-SETTINGS](issues/UI-SETTINGS.md) | [CONNECT-SETTINGS](issues/CONNECT-SETTINGS.md) | 5/5 | INSIGHTS, INFORMATION | HEALTH |
| ai-consent | [UI-EXPLORE](issues/UI-EXPLORE.md) | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) | 4/4 |  | AI |
| ai-explore | [UI-EXPLORE](issues/UI-EXPLORE.md) | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) | 6/6 | EXPLORATION | EXPLORATION |
| community-home | [UI-FRIENDS](issues/UI-FRIENDS.md) | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) | 3/3 |  |  |
| companion-create | [UI-COMPANION](issues/UI-COMPANION.md) | [CONNECT-COMPANION](issues/CONNECT-COMPANION.md) | 5/5 |  | COMPANION |
| companion-import | [UI-COMPANION](issues/UI-COMPANION.md) | [CONNECT-COMPANION](issues/CONNECT-COMPANION.md) | 4/4 |  | COMPANION |
| companion-settings | [UI-COMPANION](issues/UI-COMPANION.md) | [CONNECT-COMPANION](issues/CONNECT-COMPANION.md) | 5/5 |  | COMPANION |
| conversation-history | [UI-EXPLORE](issues/UI-EXPLORE.md) | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) | 4/4 | AI | EXPLORATION |
| daily-track | [UI-RECORDS](issues/UI-RECORDS.md) | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | 6/6 | ACTIVITY, INFORMATION |  |
| data-sources | [UI-SETTINGS](issues/UI-SETTINGS.md) | [CONNECT-SETTINGS](issues/CONNECT-SETTINGS.md) | 4/4 | ACTIVITY | HEALTH |
| diary | [UI-REFLECTION](issues/UI-REFLECTION.md) | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) | 5/5 | INFORMATION, RECORDS |  |
| experience-compare | [UI-REFLECTION](issues/UI-REFLECTION.md) | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) | 4/4 | RECORDS | REFLECTION |
| feature-request-edit | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 5/5 | CORE, FEATURE-REQUESTS | FEATURE-REQUESTS |
| feature-requests | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 6/6 | FEATURE-REQUESTS | FEATURE-REQUESTS |
| friend-compare | [UI-FRIENDS](issues/UI-FRIENDS.md) | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) | 4/4 | INFORMATION | REFLECTION |
| friend-picker | [UI-FRIENDS](issues/UI-FRIENDS.md) | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) | 4/4 | COMMUNITY |  |
| friend-profile | [UI-FRIENDS](issues/UI-FRIENDS.md) | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) | 5/5 | COMMUNITY, INFORMATION | COMMUNITY |
| friends-map | [UI-FRIENDS](issues/UI-FRIENDS.md) | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) | 6/6 | COMMUNITY, INFORMATION |  |
| growth-result | [UI-RECORDS](issues/UI-RECORDS.md) | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | 4/4 | ACTIVITY, RECORDS |  |
| health-connect | [UI-HEALTH](issues/UI-HEALTH.md) | [CONNECT-HEALTH](issues/CONNECT-HEALTH.md) | 4/4 |  | HEALTH |
| health-permissions | [UI-HEALTH](issues/UI-HEALTH.md) | [CONNECT-HEALTH](issues/CONNECT-HEALTH.md) | 5/5 |  | HEALTH |
| health-status | [UI-HEALTH](issues/UI-HEALTH.md) | [CONNECT-HEALTH](issues/CONNECT-HEALTH.md) | 4/4 |  | HEALTH |
| interpretation-correction | [UI-RECORDS](issues/UI-RECORDS.md) | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | 5/5 | RECORDS, INSIGHTS |  |
| knowledge-detail | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [CONNECT-KNOWLEDGE](issues/CONNECT-KNOWLEDGE.md) | 4/4 | INFORMATION, RECORDS | COMMUNITY |
| knowledge-filter | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [CONNECT-KNOWLEDGE](issues/CONNECT-KNOWLEDGE.md) | 4/4 |  | COMMUNITY |
| knowledge-list | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [CONNECT-KNOWLEDGE](issues/CONNECT-KNOWLEDGE.md) | 5/5 | INFORMATION, COMMUNITY | COMMUNITY |
| local-knowledge | [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | [CONNECT-KNOWLEDGE](issues/CONNECT-KNOWLEDGE.md) | 4/4 | PLACES, COMMUNITY |  |
| map | [UI-MAP](issues/UI-MAP.md) | [CONNECT-MAP](issues/CONNECT-MAP.md) | 8/8 | PLACES, ACTIVITY | COMMUNITY |
| map-layers | [UI-MAP](issues/UI-MAP.md) | [CONNECT-MAP](issues/CONNECT-MAP.md) | 4/4 | PLUGINS | MAP-CUSTOM |
| memo-edit | [UI-REFLECTION](issues/UI-REFLECTION.md) | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) | 5/5 | RECORDS | THEMES |
| mist-detail | [UI-EXPLORE](issues/UI-EXPLORE.md) | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) | 4/4 | SUGGESTIONS, PLACES | COMMUNITY |
| navigation | [UI-BASE](issues/UI-BASE.md) | [CONNECT-BASE](issues/CONNECT-BASE.md) | 5/5 |  |  |
| object-edit | [UI-MAP](issues/UI-MAP.md) | [CONNECT-MAP](issues/CONNECT-MAP.md) | 6/6 |  | MAP-CUSTOM |
| object-place | [UI-MAP](issues/UI-MAP.md) | [CONNECT-MAP](issues/CONNECT-MAP.md) | 5/5 |  | MAP-CUSTOM |
| personal-map | [UI-MAP](issues/UI-MAP.md) | [CONNECT-MAP](issues/CONNECT-MAP.md) | 5/5 | THEMES, INFORMATION, PLACES, ACTIVITY |  |
| plugin-conflict | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 4/4 | PLUGINS | PLUGINS |
| plugin-detail | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 3/3 | PLUGINS |  |
| plugin-install | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 4/4 | PLUGINS |  |
| plugin-manage | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 5/5 | PLUGINS | PLUGINS |
| plugin-store | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 5/5 | PLUGINS |  |
| plugin-trial | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 4/4 | PLUGINS | PLUGINS |
| plugin-update | [UI-PLUGINS](issues/UI-PLUGINS.md) | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) | 5/5 | PLUGINS | PLUGINS |
| profile-settings | [UI-SETTINGS](issues/UI-SETTINGS.md) | [CONNECT-SETTINGS](issues/CONNECT-SETTINGS.md) | 5/5 | CORE, SETTINGS | SETTINGS |
| quest-compass | [UI-EXPLORE](issues/UI-EXPLORE.md) | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) | 4/4 |  |  |
| record-create | [UI-RECORDS](issues/UI-RECORDS.md) | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | 7/7 | PLACES, ACTIVITY, RECORDS |  |
| record-delete | [UI-RECORDS](issues/UI-RECORDS.md) | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | 5/5 | RECORDS | RECORDS |
| record-edit | [UI-RECORDS](issues/UI-RECORDS.md) | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | 6/6 | RECORDS |  |
| reflection-history | [UI-REFLECTION](issues/UI-REFLECTION.md) | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) | 4/4 | AI | REFLECTION |
| reflection-question | [UI-REFLECTION](issues/UI-REFLECTION.md) | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) | 5/5 | AI | REFLECTION |
| route-conditions | [UI-ROUTES](issues/UI-ROUTES.md) | [CONNECT-ROUTES](issues/CONNECT-ROUTES.md) | 4/4 | PLACES, ROUTES | ROUTES |
| route-navigation | [UI-ROUTES](issues/UI-ROUTES.md) | [CONNECT-ROUTES](issues/CONNECT-ROUTES.md) | 5/5 | ROUTES | ROUTES |
| route-results | [UI-ROUTES](issues/UI-ROUTES.md) | [CONNECT-ROUTES](issues/CONNECT-ROUTES.md) | 5/5 | ROUTES | ROUTES |
| self-checkin | [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | [CONNECT-SUGGESTIONS](issues/CONNECT-SUGGESTIONS.md) | 7/7 | SUGGESTIONS | SUGGESTIONS |
| self-home | [UI-REFLECTION](issues/UI-REFLECTION.md) | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) | 5/5 | INFORMATION, CORE |  |
| settings | [UI-SETTINGS](issues/UI-SETTINGS.md) | [CONNECT-SETTINGS](issues/CONNECT-SETTINGS.md) | 3/3 | CORE | SETTINGS |
| shared-route | [UI-FRIENDS](issues/UI-FRIENDS.md) | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) | 4/4 | COMMUNITY, ROUTES |  |
| sharing | [UI-FRIENDS](issues/UI-FRIENDS.md) | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) | 6/6 | RECORDS |  |
| suggestion-detail | [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | [CONNECT-SUGGESTIONS](issues/CONNECT-SUGGESTIONS.md) | 5/5 | SUGGESTIONS, INFORMATION | COMMUNITY |
| suggestion-settings | [UI-SETTINGS](issues/UI-SETTINGS.md) | [CONNECT-SETTINGS](issues/CONNECT-SETTINGS.md) | 4/4 |  | SETTINGS |
| suggestions | [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | [CONNECT-SUGGESTIONS](issues/CONNECT-SUGGESTIONS.md) | 5/5 | SUGGESTIONS | SUGGESTIONS |
| theme-edit | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [CONNECT-INSIGHTS](issues/CONNECT-INSIGHTS.md) | 5/5 | THEMES, INFORMATION | THEMES |
| themes | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [CONNECT-INSIGHTS](issues/CONNECT-INSIGHTS.md) | 4/4 | THEMES |  |
| trend-evidence | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [CONNECT-INSIGHTS](issues/CONNECT-INSIGHTS.md) | 4/4 | INSIGHTS, INFORMATION, RECORDS |  |
| trend-review | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [CONNECT-INSIGHTS](issues/CONNECT-INSIGHTS.md) | 4/4 | INSIGHTS |  |
| type-diagnosis | [UI-INSIGHTS](issues/UI-INSIGHTS.md) | [CONNECT-INSIGHTS](issues/CONNECT-INSIGHTS.md) | 6/6 | INSIGHTS |  |
| visit-confirm | [UI-RECORDS](issues/UI-RECORDS.md) | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) | 5/5 | ACTIVITY |  |
| voice-consultation | [UI-EXPLORE](issues/UI-EXPLORE.md) | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) | 4/4 |  | AI |

健康3ページはdeferred。settings/activity-stats/data-sourcesは健康面だけUI-HEALTH/CONNECT-HEALTHに対応し、非健康面を上表の元担当に残す。companion-create 5要件/5受入とcompanion-settings-F03の制作部分はuser-excluded。原文は保持する。

## 既存APIと追加の統合済操作

当初104操作の割当は変更しない。現在108操作との差4件をCORE所有として別登録し、COREのactive定義を変更しない。

| operationId | method/path | 所有Task | 登録 |
|---|---|---|---|
| `getPlaces` | `GET /places` | [PLACES](issues/PLACES.md) | 当初 |
| `postPlaces` | `POST /places` | [PLACES](issues/PLACES.md) | 当初 |
| `getPlaceCandidates` | `GET /place-candidates` | [PLACES](issues/PLACES.md) | 当初 |
| `getPlacesPlaceId` | `GET /places/{placeId}` | [PLACES](issues/PLACES.md) | 当初 |
| `patchPlacesPlaceId` | `PATCH /places/{placeId}` | [PLACES](issues/PLACES.md) | 当初 |
| `getMapGrowth` | `GET /map/growth` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `getVisits` | `GET /visits` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `postVisits` | `POST /visits` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `getVisitsVisitId` | `GET /visits/{visitId}` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `patchVisitsVisitId` | `PATCH /visits/{visitId}` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `deleteVisitsVisitId` | `DELETE /visits/{visitId}` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `getRecords` | `GET /records` | [INFORMATION](issues/INFORMATION.md) | 当初 |
| `postRecords` | `POST /records` | [RECORDS](issues/RECORDS.md) | 当初 |
| `getRecordsRecordId` | `GET /records/{recordId}` | [RECORDS](issues/RECORDS.md) | 当初 |
| `patchRecordsRecordId` | `PATCH /records/{recordId}` | [RECORDS](issues/RECORDS.md) | 当初 |
| `deleteRecordsRecordId` | `DELETE /records/{recordId}` | [RECORDS](issues/RECORDS.md) | 当初 |
| `getRecordsRecordIdMedia` | `GET /records/{recordId}/media` | [RECORDS](issues/RECORDS.md) | 当初 |
| `postRecordsRecordIdMedia` | `POST /records/{recordId}/media` | [RECORDS](issues/RECORDS.md) | 当初 |
| `postRecordsRecordIdMediaReorder` | `POST /records/{recordId}/media/reorder` | [RECORDS](issues/RECORDS.md) | 当初 |
| `getMediaMediaId` | `GET /media/{mediaId}` | [RECORDS](issues/RECORDS.md) | 当初 |
| `deleteMediaMediaId` | `DELETE /media/{mediaId}` | [RECORDS](issues/RECORDS.md) | 当初 |
| `getMediaMediaIdContent` | `GET /media/{mediaId}/content` | [RECORDS](issues/RECORDS.md) | 当初 |
| `getTrackPoints` | `GET /track-points` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `postTrackPoints` | `POST /track-points` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `getTrackPointsPointId` | `GET /track-points/{pointId}` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `postTrackPointsDeleteRange` | `POST /track-points/delete-range` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `getConversations` | `GET /conversations` | [AI](issues/AI.md) | 当初 |
| `postConversations` | `POST /conversations` | [AI](issues/AI.md) | 当初 |
| `getConversationsConversationId` | `GET /conversations/{conversationId}` | [AI](issues/AI.md) | 当初 |
| `patchConversationsConversationId` | `PATCH /conversations/{conversationId}` | [AI](issues/AI.md) | 当初 |
| `deleteConversationsConversationId` | `DELETE /conversations/{conversationId}` | [AI](issues/AI.md) | 当初 |
| `getConversationsConversationIdMessages` | `GET /conversations/{conversationId}/messages` | [AI](issues/AI.md) | 当初 |
| `postConversationsConversationIdMessages` | `POST /conversations/{conversationId}/messages` | [AI](issues/AI.md) | 当初 |
| `getMessagesMessageId` | `GET /messages/{messageId}` | [AI](issues/AI.md) | 当初 |
| `postMessagesMessageIdCancel` | `POST /messages/{messageId}/cancel` | [AI](issues/AI.md) | 当初 |
| `postMessagesMessageIdRetry` | `POST /messages/{messageId}/retry` | [AI](issues/AI.md) | 当初 |
| `getReflectionDaysDate` | `GET /reflection/days/{date}` | [ACTIVITY](issues/ACTIVITY.md) | 当初 |
| `getSelfCheckins` | `GET /self-checkins` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `postSelfCheckins` | `POST /self-checkins` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `getSelfCheckinsCheckinId` | `GET /self-checkins/{checkinId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `patchSelfCheckinsCheckinId` | `PATCH /self-checkins/{checkinId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `deleteSelfCheckinsCheckinId` | `DELETE /self-checkins/{checkinId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `getThemes` | `GET /themes` | [THEMES](issues/THEMES.md) | 当初 |
| `postThemes` | `POST /themes` | [THEMES](issues/THEMES.md) | 当初 |
| `getThemesThemeId` | `GET /themes/{themeId}` | [THEMES](issues/THEMES.md) | 当初 |
| `patchThemesThemeId` | `PATCH /themes/{themeId}` | [THEMES](issues/THEMES.md) | 当初 |
| `deleteThemesThemeId` | `DELETE /themes/{themeId}` | [THEMES](issues/THEMES.md) | 当初 |
| `getReflectionSummary` | `GET /reflection/summary` | [INSIGHTS](issues/INSIGHTS.md) | 当初 |
| `getInsights` | `GET /insights` | [INSIGHTS](issues/INSIGHTS.md) | 当初 |
| `postInsights` | `POST /insights` | [INSIGHTS](issues/INSIGHTS.md) | 当初 |
| `getInsightsInsightId` | `GET /insights/{insightId}` | [INSIGHTS](issues/INSIGHTS.md) | 当初 |
| `patchInsightsInsightId` | `PATCH /insights/{insightId}` | [INSIGHTS](issues/INSIGHTS.md) | 当初 |
| `deleteInsightsInsightId` | `DELETE /insights/{insightId}` | [INSIGHTS](issues/INSIGHTS.md) | 当初 |
| `postSourceChecks` | `POST /source-checks` | [INFORMATION](issues/INFORMATION.md) | 当初 |
| `postSuggestionBatches` | `POST /suggestion-batches` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `getSuggestions` | `GET /suggestions` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `getSuggestionsSuggestionId` | `GET /suggestions/{suggestionId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `patchSuggestionsSuggestionId` | `PATCH /suggestions/{suggestionId}` | [SUGGESTIONS](issues/SUGGESTIONS.md) | 当初 |
| `postRouteSearches` | `POST /route-searches` | [ROUTES](issues/ROUTES.md) | 当初 |
| `getSavedRoutes` | `GET /saved-routes` | [ROUTES](issues/ROUTES.md) | 当初 |
| `postSavedRoutes` | `POST /saved-routes` | [ROUTES](issues/ROUTES.md) | 当初 |
| `getSavedRoutesRouteId` | `GET /saved-routes/{routeId}` | [ROUTES](issues/ROUTES.md) | 当初 |
| `patchSavedRoutesRouteId` | `PATCH /saved-routes/{routeId}` | [ROUTES](issues/ROUTES.md) | 当初 |
| `deleteSavedRoutesRouteId` | `DELETE /saved-routes/{routeId}` | [ROUTES](issues/ROUTES.md) | 当初 |
| `getTransitPasses` | `GET /transit-passes` | [ROUTES](issues/ROUTES.md) | 当初 |
| `postTransitPasses` | `POST /transit-passes` | [ROUTES](issues/ROUTES.md) | 当初 |
| `getTransitPassesPassId` | `GET /transit-passes/{passId}` | [ROUTES](issues/ROUTES.md) | 当初 |
| `patchTransitPassesPassId` | `PATCH /transit-passes/{passId}` | [ROUTES](issues/ROUTES.md) | 当初 |
| `deleteTransitPassesPassId` | `DELETE /transit-passes/{passId}` | [ROUTES](issues/ROUTES.md) | 当初 |
| `getMe` | `GET /me` | [CORE](issues/CORE.md) | 当初 |
| `patchMe` | `PATCH /me` | [SETTINGS](issues/SETTINGS.md) | 当初 |
| `getPeople` | `GET /people` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `getPeoplePersonId` | `GET /people/{personId}` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `getFriendships` | `GET /friendships` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `postFriendships` | `POST /friendships` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `getFriendshipsFriendshipId` | `GET /friendships/{friendshipId}` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `patchFriendshipsFriendshipId` | `PATCH /friendships/{friendshipId}` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `deleteFriendshipsFriendshipId` | `DELETE /friendships/{friendshipId}` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `getSharedRecords` | `GET /shared-records` | [INFORMATION](issues/INFORMATION.md) | 当初 |
| `getSharedRecordsMap` | `GET /shared-records/map` | [INFORMATION](issues/INFORMATION.md) | 当初 |
| `getPlacesPlaceIdVoices` | `GET /places/{placeId}/voices` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `getSharedRoutes` | `GET /shared-routes` | [COMMUNITY](issues/COMMUNITY.md) | 当初 |
| `getPlugins` | `GET /plugins` | [PLUGINS](issues/PLUGINS.md) | 当初 |
| `getPluginSettings` | `GET /plugin-settings` | [PLUGINS](issues/PLUGINS.md) | 当初 |
| `postPluginSettings` | `POST /plugin-settings` | [PLUGINS](issues/PLUGINS.md) | 当初 |
| `getPluginSettingsPluginId` | `GET /plugin-settings/{pluginId}` | [PLUGINS](issues/PLUGINS.md) | 当初 |
| `patchPluginSettingsPluginId` | `PATCH /plugin-settings/{pluginId}` | [PLUGINS](issues/PLUGINS.md) | 当初 |
| `deletePluginSettingsPluginId` | `DELETE /plugin-settings/{pluginId}` | [PLUGINS](issues/PLUGINS.md) | 当初 |
| `getFeatureRequests` | `GET /feature-requests` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | 当初 |
| `postFeatureRequests` | `POST /feature-requests` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | 当初 |
| `getFeatureRequestsRequestId` | `GET /feature-requests/{requestId}` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | 当初 |
| `patchFeatureRequestsRequestId` | `PATCH /feature-requests/{requestId}` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | 当初 |
| `deleteFeatureRequestsRequestId` | `DELETE /feature-requests/{requestId}` | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | 当初 |
| `postMapDialogues` | `POST /map-dialogues` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `postMapDialoguesSelect` | `POST /map-dialogues/select` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `postMapDialoguesCancel` | `POST /map-dialogues/cancel` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `getMapDialoguesResultsResultId` | `GET /map-dialogues/results/{resultId}` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `postDiscoveryCards` | `POST /discovery-cards` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `getDiscoveryCards` | `GET /discovery-cards` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `getDiscoveryCardsCardId` | `GET /discovery-cards/{cardId}` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `deleteDiscoveryCardsCardId` | `DELETE /discovery-cards/{cardId}` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `postDiscoveryCardsCardIdReactions` | `POST /discovery-cards/{cardId}/reactions` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `getDiscoveryCardsCardIdReactions` | `GET /discovery-cards/{cardId}/reactions` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `getDiscoveryCardsCardIdReactionsReactionId` | `GET /discovery-cards/{cardId}/reactions/{reactionId}` | [EXPLORATION](issues/EXPLORATION.md) | 当初 |
| `getSessionProfiles` | `GET /session/profiles` | [CORE](issues/CORE.md) | 統合済CORE追加 |
| `postSession` | `POST /session` | [CORE](issues/CORE.md) | 統合済CORE追加 |
| `getSession` | `GET /session` | [CORE](issues/CORE.md) | 統合済CORE追加 |
| `deleteSession` | `DELETE /session` | [CORE](issues/CORE.md) | 統合済CORE追加 |

API不足20項目の所有は[契約補完](contract-gates.md)とindex.gap_ownersのまま維持する。API bindingの原method/path/inputFrom/responsesを各pageの対応に保持し、具体的な接続チェックと失敗条件を列挙する。

// Generated from composed OpenAPI.
export const operations = {
  "getPlaces": {
    "method": "GET",
    "path": "/places",
    "query": [
      {
        "name": "q",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      {
        "name": "bbox",
        "required": false,
        "schema": {
          "type": "string",
          "pattern": "^-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?$",
          "description": "west,south,east,north。経度±180、緯度±90、west<east、south<north。日付変更線をまたぐ場合は二要求へ分ける。"
        }
      },
      {
        "name": "buildingKey",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 400
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postPlaces": {
    "method": "POST",
    "path": "/places",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getPlaceCandidates": {
    "method": "GET",
    "path": "/place-candidates",
    "query": [
      {
        "name": "q",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      {
        "name": "longitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -180,
          "maximum": 180
        }
      },
      {
        "name": "latitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "coffee",
            "restaurant",
            "bakery",
            "park"
          ]
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10,
          "default": 10
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getPlacesPlaceId": {
    "method": "GET",
    "path": "/places/{placeId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchPlacesPlaceId": {
    "method": "PATCH",
    "path": "/places/{placeId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getMapGrowth": {
    "method": "GET",
    "path": "/map/growth",
    "query": [
      {
        "name": "bbox",
        "required": false,
        "schema": {
          "type": "string",
          "pattern": "^-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?$",
          "description": "west,south,east,north。経度±180、緯度±90、west<east、south<north。日付変更線をまたぐ場合は二要求へ分ける。"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getVisits": {
    "method": "GET",
    "path": "/visits",
    "query": [
      {
        "name": "placeId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "from",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "status",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "candidate",
            "confirmed",
            "rejected"
          ]
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postVisits": {
    "method": "POST",
    "path": "/visits",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getVisitsVisitId": {
    "method": "GET",
    "path": "/visits/{visitId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchVisitsVisitId": {
    "method": "PATCH",
    "path": "/visits/{visitId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteVisitsVisitId": {
    "method": "DELETE",
    "path": "/visits/{visitId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getRecords": {
    "method": "GET",
    "path": "/records",
    "query": [
      {
        "name": "placeId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "themeId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "from",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "kind",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "experience",
            "diary",
            "memo"
          ]
        }
      },
      {
        "name": "timeZone",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/TimeZone"
        }
      },
      {
        "name": "includeUndated",
        "required": false,
        "schema": {
          "type": "boolean",
          "default": false
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postRecords": {
    "method": "POST",
    "path": "/records",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getRecordsRecordId": {
    "method": "GET",
    "path": "/records/{recordId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchRecordsRecordId": {
    "method": "PATCH",
    "path": "/records/{recordId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteRecordsRecordId": {
    "method": "DELETE",
    "path": "/records/{recordId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getRecordsRecordIdMedia": {
    "method": "GET",
    "path": "/records/{recordId}/media",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postRecordsRecordIdMedia": {
    "method": "POST",
    "path": "/records/{recordId}/media",
    "query": [],
    "hasBody": true,
    "multipart": true,
    "requiresVersion": true,
    "requiresKey": true
  },
  "postRecordsRecordIdMediaReorder": {
    "method": "POST",
    "path": "/records/{recordId}/media/reorder",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": true
  },
  "getMediaMediaId": {
    "method": "GET",
    "path": "/media/{mediaId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "deleteMediaMediaId": {
    "method": "DELETE",
    "path": "/media/{mediaId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getMediaMediaIdContent": {
    "method": "GET",
    "path": "/media/{mediaId}/content",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getTrackPoints": {
    "method": "GET",
    "path": "/track-points",
    "query": [
      {
        "name": "segmentId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "from",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postTrackPoints": {
    "method": "POST",
    "path": "/track-points",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getTrackPointsPointId": {
    "method": "GET",
    "path": "/track-points/{pointId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postTrackPointsDeleteRange": {
    "method": "POST",
    "path": "/track-points/delete-range",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getConversations": {
    "method": "GET",
    "path": "/conversations",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "purpose",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "consult",
            "reflection",
            "analysis",
            "comparison"
          ]
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postConversations": {
    "method": "POST",
    "path": "/conversations",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getConversationsConversationId": {
    "method": "GET",
    "path": "/conversations/{conversationId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchConversationsConversationId": {
    "method": "PATCH",
    "path": "/conversations/{conversationId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteConversationsConversationId": {
    "method": "DELETE",
    "path": "/conversations/{conversationId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getConversationsConversationIdMessages": {
    "method": "GET",
    "path": "/conversations/{conversationId}/messages",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postConversationsConversationIdMessages": {
    "method": "POST",
    "path": "/conversations/{conversationId}/messages",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getMessagesMessageId": {
    "method": "GET",
    "path": "/messages/{messageId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postMessagesMessageIdCancel": {
    "method": "POST",
    "path": "/messages/{messageId}/cancel",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": true
  },
  "postMessagesMessageIdRetry": {
    "method": "POST",
    "path": "/messages/{messageId}/retry",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": true
  },
  "getReflectionDaysDate": {
    "method": "GET",
    "path": "/reflection/days/{date}",
    "query": [
      {
        "name": "timeZone",
        "required": true,
        "schema": {
          "$ref": "#/components/schemas/TimeZone"
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getSelfCheckins": {
    "method": "GET",
    "path": "/self-checkins",
    "query": [
      {
        "name": "date",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Date"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postSelfCheckins": {
    "method": "POST",
    "path": "/self-checkins",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getSelfCheckinsCheckinId": {
    "method": "GET",
    "path": "/self-checkins/{checkinId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchSelfCheckinsCheckinId": {
    "method": "PATCH",
    "path": "/self-checkins/{checkinId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteSelfCheckinsCheckinId": {
    "method": "DELETE",
    "path": "/self-checkins/{checkinId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getThemes": {
    "method": "GET",
    "path": "/themes",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postThemes": {
    "method": "POST",
    "path": "/themes",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getThemesThemeId": {
    "method": "GET",
    "path": "/themes/{themeId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchThemesThemeId": {
    "method": "PATCH",
    "path": "/themes/{themeId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteThemesThemeId": {
    "method": "DELETE",
    "path": "/themes/{themeId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getReflectionSummary": {
    "method": "GET",
    "path": "/reflection/summary",
    "query": [
      {
        "name": "from",
        "required": true,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": true,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "timeZone",
        "required": true,
        "schema": {
          "$ref": "#/components/schemas/TimeZone"
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getInsights": {
    "method": "GET",
    "path": "/insights",
    "query": [
      {
        "name": "from",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "kind",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "analysis",
            "comparison"
          ]
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postInsights": {
    "method": "POST",
    "path": "/insights",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getInsightsInsightId": {
    "method": "GET",
    "path": "/insights/{insightId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchInsightsInsightId": {
    "method": "PATCH",
    "path": "/insights/{insightId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteInsightsInsightId": {
    "method": "DELETE",
    "path": "/insights/{insightId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "postSourceChecks": {
    "method": "POST",
    "path": "/source-checks",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "postSuggestionBatches": {
    "method": "POST",
    "path": "/suggestion-batches",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getSuggestions": {
    "method": "GET",
    "path": "/suggestions",
    "query": [
      {
        "name": "batchId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "status",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "offered",
            "later",
            "dismissed",
            "selected",
            "completed",
            "not_done"
          ]
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getSuggestionsSuggestionId": {
    "method": "GET",
    "path": "/suggestions/{suggestionId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchSuggestionsSuggestionId": {
    "method": "PATCH",
    "path": "/suggestions/{suggestionId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "postRouteSearches": {
    "method": "POST",
    "path": "/route-searches",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getSavedRoutes": {
    "method": "GET",
    "path": "/saved-routes",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postSavedRoutes": {
    "method": "POST",
    "path": "/saved-routes",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getSavedRoutesRouteId": {
    "method": "GET",
    "path": "/saved-routes/{routeId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchSavedRoutesRouteId": {
    "method": "PATCH",
    "path": "/saved-routes/{routeId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteSavedRoutesRouteId": {
    "method": "DELETE",
    "path": "/saved-routes/{routeId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getTransitPasses": {
    "method": "GET",
    "path": "/transit-passes",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postTransitPasses": {
    "method": "POST",
    "path": "/transit-passes",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getTransitPassesPassId": {
    "method": "GET",
    "path": "/transit-passes/{passId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchTransitPassesPassId": {
    "method": "PATCH",
    "path": "/transit-passes/{passId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteTransitPassesPassId": {
    "method": "DELETE",
    "path": "/transit-passes/{passId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getMe": {
    "method": "GET",
    "path": "/me",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchMe": {
    "method": "PATCH",
    "path": "/me",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getPeople": {
    "method": "GET",
    "path": "/people",
    "query": [
      {
        "name": "q",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getPeoplePersonId": {
    "method": "GET",
    "path": "/people/{personId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getFriendships": {
    "method": "GET",
    "path": "/friendships",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "status",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "pending",
            "accepted"
          ]
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postFriendships": {
    "method": "POST",
    "path": "/friendships",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getFriendshipsFriendshipId": {
    "method": "GET",
    "path": "/friendships/{friendshipId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchFriendshipsFriendshipId": {
    "method": "PATCH",
    "path": "/friendships/{friendshipId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteFriendshipsFriendshipId": {
    "method": "DELETE",
    "path": "/friendships/{friendshipId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getSharedRecords": {
    "method": "GET",
    "path": "/shared-records",
    "query": [
      {
        "name": "q",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      {
        "name": "placeId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "longitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -180,
          "maximum": 180
        }
      },
      {
        "name": "latitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        }
      },
      {
        "name": "radiusM",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": 1,
          "maximum": 100000
        }
      },
      {
        "name": "from",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "timeZone",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/TimeZone"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "audience",
        "required": false,
        "schema": {
          "enum": [
            "own",
            "visible",
            "public",
            "selected",
            "friends"
          ],
          "default": "visible"
        }
      },
      {
        "name": "personIds",
        "required": false,
        "schema": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80,
            "pattern": "\\S"
          },
          "minItems": 0,
          "maxItems": 100,
          "uniqueItems": true,
          "default": []
        }
      },
      {
        "name": "purposes",
        "required": false,
        "schema": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 500
          },
          "minItems": 0,
          "maxItems": 20,
          "uniqueItems": true,
          "default": []
        }
      },
      {
        "name": "topicKey",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            {
              "type": "null"
            }
          ],
          "default": null
        }
      },
      {
        "name": "includeUndated",
        "required": false,
        "schema": {
          "type": "boolean",
          "default": false
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getSharedRecordsMap": {
    "method": "GET",
    "path": "/shared-records/map",
    "query": [
      {
        "name": "q",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      {
        "name": "placeId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "longitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -180,
          "maximum": 180
        }
      },
      {
        "name": "latitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        }
      },
      {
        "name": "radiusM",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": 1,
          "maximum": 100000
        }
      },
      {
        "name": "from",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "timeZone",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/TimeZone"
        }
      },
      {
        "name": "audience",
        "required": false,
        "schema": {
          "enum": [
            "own",
            "visible",
            "public",
            "selected",
            "friends"
          ],
          "default": "visible"
        }
      },
      {
        "name": "personIds",
        "required": false,
        "schema": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80,
            "pattern": "\\S"
          },
          "minItems": 0,
          "maxItems": 100,
          "uniqueItems": true,
          "default": []
        }
      },
      {
        "name": "purposes",
        "required": false,
        "schema": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 500
          },
          "minItems": 0,
          "maxItems": 20,
          "uniqueItems": true,
          "default": []
        }
      },
      {
        "name": "topicKey",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            {
              "type": "null"
            }
          ],
          "default": null
        }
      },
      {
        "name": "includeUndated",
        "required": false,
        "schema": {
          "type": "boolean",
          "default": false
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getPlacesPlaceIdVoices": {
    "method": "GET",
    "path": "/places/{placeId}/voices",
    "query": [
      {
        "name": "q",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      {
        "name": "longitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -180,
          "maximum": 180
        }
      },
      {
        "name": "latitude",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        }
      },
      {
        "name": "radiusM",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": 1,
          "maximum": 100000
        }
      },
      {
        "name": "from",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "to",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Timestamp"
        }
      },
      {
        "name": "timeZone",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/TimeZone"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "audience",
        "required": false,
        "schema": {
          "enum": [
            "own",
            "visible",
            "public",
            "selected",
            "friends"
          ],
          "default": "visible"
        }
      },
      {
        "name": "personIds",
        "required": false,
        "schema": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80,
            "pattern": "\\S"
          },
          "minItems": 0,
          "maxItems": 100,
          "uniqueItems": true,
          "default": []
        }
      },
      {
        "name": "purposes",
        "required": false,
        "schema": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 500
          },
          "minItems": 0,
          "maxItems": 20,
          "uniqueItems": true,
          "default": []
        }
      },
      {
        "name": "topicKey",
        "required": true,
        "schema": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            {
              "type": "null"
            }
          ],
          "default": null
        }
      },
      {
        "name": "includeUndated",
        "required": false,
        "schema": {
          "type": "boolean",
          "default": false
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getSharedRoutes": {
    "method": "GET",
    "path": "/shared-routes",
    "query": [
      {
        "name": "personId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "visibility",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "private",
            "selected",
            "public"
          ]
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getPlugins": {
    "method": "GET",
    "path": "/plugins",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getPluginSettings": {
    "method": "GET",
    "path": "/plugin-settings",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postPluginSettings": {
    "method": "POST",
    "path": "/plugin-settings",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getPluginSettingsPluginId": {
    "method": "GET",
    "path": "/plugin-settings/{pluginId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchPluginSettingsPluginId": {
    "method": "PATCH",
    "path": "/plugin-settings/{pluginId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deletePluginSettingsPluginId": {
    "method": "DELETE",
    "path": "/plugin-settings/{pluginId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "getFeatureRequests": {
    "method": "GET",
    "path": "/feature-requests",
    "query": [
      {
        "name": "personId",
        "required": false,
        "schema": {
          "$ref": "#/components/schemas/Id"
        }
      },
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "visibility",
        "required": false,
        "schema": {
          "type": "string",
          "enum": [
            "private",
            "public"
          ]
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postFeatureRequests": {
    "method": "POST",
    "path": "/feature-requests",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getFeatureRequestsRequestId": {
    "method": "GET",
    "path": "/feature-requests/{requestId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "patchFeatureRequestsRequestId": {
    "method": "PATCH",
    "path": "/feature-requests/{requestId}",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "deleteFeatureRequestsRequestId": {
    "method": "DELETE",
    "path": "/feature-requests/{requestId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "postMapDialogues": {
    "method": "POST",
    "path": "/map-dialogues",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "postMapDialoguesSelect": {
    "method": "POST",
    "path": "/map-dialogues/select",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "postMapDialoguesCancel": {
    "method": "POST",
    "path": "/map-dialogues/cancel",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getMapDialoguesResultsResultId": {
    "method": "GET",
    "path": "/map-dialogues/results/{resultId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postDiscoveryCards": {
    "method": "POST",
    "path": "/discovery-cards",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getDiscoveryCards": {
    "method": "GET",
    "path": "/discovery-cards",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      },
      {
        "name": "savedOnly",
        "required": false,
        "schema": {
          "type": "boolean",
          "default": false
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getDiscoveryCardsCardId": {
    "method": "GET",
    "path": "/discovery-cards/{cardId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "deleteDiscoveryCardsCardId": {
    "method": "DELETE",
    "path": "/discovery-cards/{cardId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  },
  "postDiscoveryCardsCardIdReactions": {
    "method": "POST",
    "path": "/discovery-cards/{cardId}/reactions",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getDiscoveryCardsCardIdReactions": {
    "method": "GET",
    "path": "/discovery-cards/{cardId}/reactions",
    "query": [
      {
        "name": "cursor",
        "required": false,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        }
      }
    ],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getDiscoveryCardsCardIdReactionsReactionId": {
    "method": "GET",
    "path": "/discovery-cards/{cardId}/reactions/{reactionId}",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "getSessionProfiles": {
    "method": "GET",
    "path": "/session/profiles",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "postSession": {
    "method": "POST",
    "path": "/session",
    "query": [],
    "hasBody": true,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": true
  },
  "getSession": {
    "method": "GET",
    "path": "/session",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": false,
    "requiresKey": false
  },
  "deleteSession": {
    "method": "DELETE",
    "path": "/session",
    "query": [],
    "hasBody": false,
    "multipart": false,
    "requiresVersion": true,
    "requiresKey": false
  }
} as const;

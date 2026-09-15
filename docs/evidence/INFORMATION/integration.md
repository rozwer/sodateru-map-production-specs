# INFORMATION integration contract

Status: implemented, awaiting CORE runtime integration and database/HTTP verification.

## Imports and lifetime

`server/information/service.ts` exports `createInformationService(db: DatabaseSync)`, `SourceRef`, `SourceCheck`, `InformationRecordView`, `canReadShared` and `readableSql`.
`server/information/query.ts` exports `RecordQuery` and `queryFromUrl`.
Construct the service with the mode-specific database supplied by CORE; pass CORE `RequestContext` to every read. No singleton database or person cache is used.

| Method | Result |
| --- | --- |
| `searchRecords(context, query)` | Common information RecordPage: items, nextCursor, totalCount |
| `allRecords(context, query)` | All matching CommonInfoRecordView records; no cursor |
| `ownMaterials(context, query)` | All own records with sourceRefs, activities, periodAnswers, useForSuggestions, bookmarked; no cursor |
| `ownRecordsPage(context, query)` | Existing editable RecordViewPage for GET /records |
| `getRecord(context, id)` | Currently readable CommonInfoRecordView with media and sourceRefs |
| `getOwnRecord(context, id)` | Own editable RecordView with stored and effective fields |
| `ownVisits(context, placeId)` | All own VisitView rows, including rejected visits |
| `mapRecords(context, query)` | CommonInfoRecordMap; all located matches, max 2,000 |
| `searchTopics(context, query)` | RecordPage; topicKey required |
| `canReadRecord(context, id)` | Current record visibility, boolean |
| `requireReadableMedia(context, mediaId)` | Current authorized media database row; throws NOT_FOUND otherwise |
| `checkSources(context, {refs})` | Input-order `{ref,state,currentVersion}[]` |
| `assertSourcesCurrent(context, {refs})` | Same checks; throws NOT_FOUND for unavailable, SOURCE_CHANGED for changed |

The public HTTP CommonInfoRecordView remains distinct from the editable RecordView. `ownMaterials` is an internal DTO for INSIGHTS and other own-data processors, not a shared-data HTTP shape.

## Search and permissions

Visibility is enforced in SQL before reading rows, including source checks and media access. Explicit selected sharing does not require accepted friendship. `friends` narrows the authorized rows to an accepted relationship in either direction; `selected` narrows them to explicit recipients.

RecordQuery uses UTC millisecond range endpoints and a validated IANA timezone. Unicode search normalizes both query and values with NFKC/trim/lowercase. Visit fields override record location/time when visit_id exists, including unknown/rejected visits. All filters run before cursor pagination; cursors bind person, mode and normalized conditions. Equal timestamps use ID order, unknown dates sort last. Total count uses all matching records; map items omit unknown locations.

Internal `kind`, `themeId` and `bbox: [minLon,minLat,maxLon,maxLat]` narrow the query before pagination. Bbox uses exact inclusive coordinate bounds and requires min <= max. COMMUNITY owns its HTTP bbox contract. GET /records forces audience own and preserves the existing no-totalCount response shape.

`rangeMatch: 'startsWithin'` selects by start date before pagination for ACTIVITY's day detail; the default remains interval overlap. GET /records accepts the same optional query so the day-detail cursor can retrieve subsequent pages with unchanged conditions. The INFORMATION fragment adds this parameter to the existing operation. It participates in cursor condition binding. `ownMaterials` has typed Activity and PeriodAnswers fields for aggregation.

`canReadShared(context,{personId,visibility,sharedWith})` is for current database values in feature-owned sharing tables. Do not pass user-provided claims of ownership or sharing. Theme persistence/listing remains COMMUNITY/THEMES-owned. Transient candidate resolution remains PLACES-owned.

## References

SourceRef retains the five existing types: record, visit, place, checkin, route. Record reads include record + effective visit + place references, sorted by type/id. Duplicate type/id references are rejected even with differing versions.

`checkSources` returns current for equal versions, changed for a readable different version, and unavailable/null for missing or unreadable data. A non-owned visit is version-checkable only when an authorized record in the same request references it. That does not grant direct visit/history read permission. No source-check cache survives permission changes. Call immediately before returning generated results and immediately before committing them (in the feature's synchronous transaction).

## Ownership and outstanding integration

RECORDS owns media HTTP delivery and Range/file handling. It must call `requireReadableMedia` on every request, including Range requests. INFORMATION does not duplicate its content route. EXPLORATION owns its fact catalogue/provider provenance; INFORMATION checks persisted record/visit/place/checkin/route sources.

Pending: CORE's read-only POST receipt wrapper, actual base-schema/HTTP tests, integrated commit and media connection evidence. No runtime/API completion is claimed yet.

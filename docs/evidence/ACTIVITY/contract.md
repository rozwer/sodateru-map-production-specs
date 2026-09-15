# ACTIVITY v1 contract

Status: implementation in progress; CORE runtime/integration and end-to-end evidence are not yet available.

## Visits and growth

- Existing eleven operation IDs, paths, request bodies and status transitions are retained.
- POST /visits always creates candidate. PATCH is the explicit confirmation, rejection or correction operation. Searching, bookmarking, recording GPS points and route completion never confirm a visit.
- Only distinct confirmed visit IDs count. Multiple records on one visit do not multiply the visit count; separate explicitly confirmed IDs count separately even on the same date.
- Growth stage is 1 for one visit, 2 for 2–4 visits, 3 for 5 or more. Zero confirmed visits means the place is absent from growth results. This intentionally small rule provides material for the UI; sophisticated growth animation is low priority per the user.
- Purposes are the sorted union from current records attached to confirmed visits. All purposes coexist, without inventing a preferred purpose. Purposes can have 500 characters, matching RecordView. Current place, visit and record versions are sourceRefs.
- Record purpose correction/deletion is reflected by the next growth GET. Removing a record does not remove its visit. Rejection, cancellation or visit deletion reduces the count and recalculates stage immediately.
- Suggestion completion remains an explicit SUGGESTIONS operation. ACTIVITY updates only the reverse relationship: non-confirmed visit, different place or deletion returns linked suggestions to selected, clears completedVisitId and increments their version in the same transaction.
- Visit deletion unlinks records and leaves body/media intact. Their direct place and time remain null/unknown, and record version increases. Confirmation/rejection does not delete observations or records.

## Track points

- Observations are ordered observedAt ascending then id ascending. Only points in the same segment may connect.
- `TrackPoint.breakBefore` is true for the first point in a segment and where deleted observations interrupt the retained points. The UI must also break the line at a segment change and must never connect across `breakBefore=true`, including page boundaries.
- Range deletion checks every selected ID/version/person/segment/half-open time interval before deleting. Unselected points, including newly uploaded ones, are retained.
- Deleted sourcePointIds are tombstoned within the mode's SQLite DB; delayed duplicate uploads return NOT_FOUND instead of restoring removed positions. Tombstones retain only person/sourcePointId/segment/time, no coordinates.
- No location point changes visit confirmation or growth.

## Dates and pagination

- Millisecond UTC instants; from inclusive, to exclusive, both required together.
- Daily reflection converts an actual YYYY-MM-DD and IANA timeZone into local-day bounds, including DST short/long days. A date skipped entirely by a time-zone transition is rejected.
- Visits use startedAt; linked records use visit time, direct records use occurredAt. Unknown dates are excluded from a selected day, and remain visible in unbounded lists.
- Visit pages sort startedAt descending/null last, id descending. Track pages sort observedAt ascending, id ascending. Growth pages sort place ID ascending.
- Signed keyset cursors bind person, dataMode, operation and normalized filters. Cursor signing keys persist per mode DB. Changed conditions or edited cursors fail instead of displaying a different search.

## Integration exports

- `server/features/activity/service.ts`: getVisit(db, context, visitId), getPoint(db, context, pointId); mutation functions require the caller's CORE transaction.
- `server/features/activity/queries.ts`: listVisits(db, context, query), listPoints(db, context, query), getGrowth(db, context, query).
- context requires personId and dataMode. No body field can select another person.
- `server/features/activity/register.ts` is the feature entry point; common CORE files are not copied or edited.

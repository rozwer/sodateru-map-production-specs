# INFORMATION.read / refs / sharing acceptance

2026-09-15, Windows, Node 22.22.1 via mise. Worktree: `C:/Users/koshi/sodateru-worktrees/koshiro-6-information`, branch `koshiro/6-information`, PR #48. CORE runtime dependency: develop integration `413598b9379be040be6d4ddbe3d802485911a716`, contract v0.3.0.

## Executed verification

`mise exec -- node --experimental-transform-types --test server/information/service.test.ts`

PASS: 5 tests, no skips, 0 failures. The actual CORE base migration, Node DatabaseSync, Hono app, generated api-client and 127.0.0.1 HTTP server are used. Fixture records are inserted into isolated test SQLite files, not user data; this is read/query evidence, not a claim that RECORDS write UI was exercised.

`mise exec -- bun run typecheck`: PASS (strict TypeScript). After replacing the cursor hash implementation with CORE requestHash, the affected pagination/filter test was rerun alone and passed; unrelated successful tests were not repeated.

1. **Pagination after filtering:** 130 records; only indices 120–129 match NFKC-normalized SPECIAL text and purpose 休憩. One matching record has no location. Total 11, all 11 unique across pages of 3, map has 10 items and total 11. Place/person NFKC search, exact bbox and distance conditions checked. Cursor rejects another text/person/dataMode.
2. **Effective fields and time:** linked rejected visit supplies location, approximate time 1000–2000 and visitStatus=rejected while body remains readable. At range 2000–3000, a record ending at 2000 is excluded and point at 2000 included. Equal timestamp ordering is ID ascending, unknown date last; limit=1 traversal returns d,a,b,c once. startsWithin is applied before own-record pagination.
3. **Two-person permissions and media lookup:** person-a owns private/public/selected records; person-b reads public and selected only. pending friendship gives no friends results; accepted friendship returns 2, deletion returns 0 while explicitly selected record/media remains readable. Removing explicit sharing denies both text and media. No storage_key appears in shared DTOs.
4. **Current sources and persistent reopening:** place/record/visit refs initially current; visit and record updates become changed with current versions. Shared record enables only its matching visit's version check; visit alone is unavailable. Revocation gives record/visit unavailable with null versions. Reopening the same live.sqlite yields identical results; deletion remains unavailable. checkin is own-only and public route is readable by the other person. Duplicate type/id refs are rejected.
5. **Real HTTP/generated client:** CORE creates two independent sessions. Shared search of 125 persisted records finds 5 matching the tail; limit=2 reports total 5 and map reports 5. Same source-check Idempotency-Key returns current, then changed after correction, then unavailable after revocation. Stored receipt contains no currentVersion/verdict body. Different input on the same key returns IDEMPOTENCY_CONFLICT. Server and database connections close/reopen on the same paths and cookies; source result persists correctly. The same refs in a separate demo.sqlite are all unavailable and search total is 0. Unauthenticated HTTP returns 401.

Temporary paths are created under the OS temp directory as `information-*` and `information-http-*`, with `live.sqlite` and `demo.sqlite` separate. Person IDs are `person-a`/`person-b` in direct SQL cases; HTTP self uses CORE's generated profile ID and other uses person-b. Test scopes remove only their own temp directories after closing connections.

## Remaining integration

- CORE must compose `fragments/INFORMATION.json` v1.0.0 (rangeMatch on GET /records) into the generated common API. Existing shared search/source-check routes were exercised using the already integrated contract.
- RECORDS must call requireReadableMedia on each content/Range request and verify missing-file/Range/revocation behavior in its media route. INFORMATION provides the common check and direct database acceptance; it does not own a duplicate content route.
- PLACES/ACTIVITY/AI use the imports documented in integration.md. Their complete UI flows remain their acceptance scope.
- The user-approved split moves these unfinished consumer connections to #100. #6 closes after the verified delivery in PR #48 is integrated, without claiming the moved work complete; see completion-scope.md.

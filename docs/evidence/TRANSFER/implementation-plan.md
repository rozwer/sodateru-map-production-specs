# TRANSFER Q10 implementation plan

Goal: preserve a source experience as a versioned recipe, compare faithful and personalized plans in another region, and persist the adopted common route for restart retrieval.

Scope: server/features/transfer, server/db/migrations/transfer, TRANSFER.json, this evidence directory. UI belongs to #10; CORE/AI/PLACES/ROUTES/INFORMATION belong to their owners. No source record updates or subagents.

## Design

Recipe stores title, meaning, ordered steps with record references and stay durations, required conditions and permitted changes. Editing creates a new recipe version. Plan sets retain the recipe version/snapshot, target region, start, movement mode, time budget and personal preferences. Source references are checked before generation, response and adoption.

Common PLACES resolves real storable candidates. Common AI task `transfer` selects only provided place IDs, supplies two variants in original step order and describes commonalities, differences, unmet requirements and unknowns. TRANSFER verifies all links and uses common ROUTES for road geometry and elapsed travel. Duration is travel plus stay, never an AI estimate. Missing steps/requirements or budget excess prevent adoption and remain explicit in the comparison.

Adoption reserves a stable route ID and variant before calling common saveRoute. A retry resumes that ID; persistence of the final selection happens only after route save succeeds. GET returns the persisted plan and route ID without regenerating. Original records remain unchanged.

## Deliverables and verification

- [ ] Recipe DTO validation and SQL persistence: create, versioned replace, GET, owner isolation, ordered roundtrip, reopen SQLite.
- [ ] Plan result validation: two distinct variants, source-step links, real candidate membership, missing conditions, durations and budget.
- [ ] Common adapters and HTTP routes: registration via CORE, AI task preparation/inspection, reference checks and common route saving.
- [ ] Q10 OpenAPI fragment and #10 binding: exact operation schemas, response fields, pending/failure/expired/version behavior.
- [ ] Real API verification: source→recipe→two plans→adopt→restart GET; common external and DB evidence, required failure cases.
- [ ] Submit develop PR and report to commander for independent review. Complete board/locks/Issue only after integrated acceptance.

The tests target ordering, visibility, invalid model output, stale references, duration conditions, restart and retry boundaries. No mock result constitutes product completion.

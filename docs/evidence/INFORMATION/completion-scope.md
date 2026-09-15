# INFORMATION #6 completion scope

The user approved splitting verified delivery from unfinished integration on 2026-09-15 to prioritize the demo. This supersedes the earlier plan to keep #6 open until every consumer connection was finished.

## Completed delivery

PR #48 provides common record query, effective date/place, Unicode search, post-filter cursor/total/map, current visibility, media authorization helper, five SourceRef types, own-material reads, and current source-check replay. Five real SQLite/HTTP tests passed; strict TypeScript passed. See acceptance.md and integration.md.

## Explicitly moved to #100

[INFORMATION connection follow-up](https://github.com/rozwer/sodateru-map-production-specs/issues/100), assignee koshiroucl (koshiro), contains:

- Generated rangeMatch contract plus ACTIVITY day-detail cursor connection.
- RECORDS content/Range common authorization connection and end-to-end revocation/missing-file evidence.
- THEMES memo presentation in the editable record DTO after the common contract update.

#100 distinguishes demo-dependent requirements from later work and records minimum acceptance and dependencies. These are not claimed complete by closing #6. The current claim ends after PR #48 reaches develop; follow-up work requires its own registered task/claim/worktree.

# BIKE candidate integration and requested rerun

- Reviewed implementation HEAD: `2a382d33f4046e846944ebaaf3a63ce2da099d23`.
- PR #166 independent review found no integration blocker; merged with that commit retained at `8ea26a06a6d9fbda2b9f10bc59df197dc3589e2f` (2026-09-15T03:50:46Z).
- The orchestrator-requested rerun used exactly that implementation HEAD. No additional implementation push was made during review. This followup contains only evidence after merge.

`live-http-sqlite-rerun.json` records one initial Overpass 504 and a successful explicit retry. Actual Overpass returned 10 points / 51 roads in the stated small region. Common PLACES candidate registration/adoption, same-place/source retrieval after stopping the server and spawning a new OS process against the same SQLite files, stale candidate replay 410, fresh registration, canonical identity reuse, stop/re-enable and unknown-route adoption rejection all passed. The previous successful `live-http-sqlite.json` remains unchanged.

The rerun still uses the shared composer to provide the current fragments to actual CORE/production features. Shared develop `d264c15` had BIKE v1.0.0 and no `/bike/place-candidates`; production v1.1 generation and UI acceptance remain separate. No mock provider/service replacement was used in the rerun. The #91 whole-route motorcycle eligibility/adoption requirement remains unmet.

Keep #90, #91 and #29 open until their respective remaining acceptance conditions pass. The claim and receiver remain active; task:finish has not run.

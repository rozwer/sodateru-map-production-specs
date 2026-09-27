# UI-DEMO-ALL acceptance

Target: issue #395, branch `rozwer/395-all-demo`. The common mock is enabled only when the user selects demo mode. Live mode uses the existing API client. The mock keeps example edits per demo person in browser local storage; it does not call real AI or claim to check opening hours, roads, or other regions.

Dedicated verification: `http://127.0.0.1:5173/` with API `127.0.0.1:3327`, isolated demo and live SQLite files in this worktree, Mapbox token from the existing local development environment. The user's `5317` demo was left running separately for parent integration.

Normal demo UI checks on 2026-09-27:

- Map → self home: two example places and photographed records. Daily track shows both places and photos. Reflection question → answer → history, diary draft → adopt → save → reload, theme edit → reload, and record comparison → save → reload were exercised.
- Check-in → two suggestions → detail → later/selected → reload and map place detail were exercised. Map → Codex exploration → consent → example conversation and two selectable candidates was exercised.
- Community: friend map has an example friend and two shared records; knowledge map/list/detail has two example posts. Discovery example card generation → save → reopen was exercised. Transfer recipe → two example plans → adoption → saved route was exercised.
- Friend comparison displayed a linked pair of records plus common points, differences and unknowns. Companion example displayed its sprite and retained visibility/size after reload; the existing v2 ZIP went through 25/25 preview actions, registration and reload with the imported pet selected.
- A newly created photographed record retained the same record ID, body and photo in daily track after browser reload. Removing its photo in the editor and saving kept the photo removed after reload; reopening the editor showed no related-data warning. Health displayed explicitly labeled seven-day example values, then stop → restart → reload retained the selected example state.
- After merging #397 into this branch, the normal store path showed a request draft and its list entry, a bike trial preview, and disaster trial → mock install → stop → enable with the mock map layer visible again.

`mise exec -- bunx tsc --noEmit`, `mise exec -- bunx vite build`, and `git diff --check` passed after #397 integration. The displayed transfer plans explicitly say they are fixed Motoyama area examples; entering another region does not perform a place search. Health values are labeled UI examples and no health data is imported. Plugin changes are in-memory UI examples. Real provider and production API behavior are outside this demo issue.

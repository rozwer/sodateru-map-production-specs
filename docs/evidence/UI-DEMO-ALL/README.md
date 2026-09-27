# UI-DEMO-ALL acceptance

Target: issue #395, branch `rozwer/395-all-demo`. The common mock is enabled only when the user selects demo mode. Live mode uses the existing API client. The mock keeps example edits per demo person in browser local storage; it does not call real AI or claim to check opening hours, roads, or other regions.

Dedicated verification: `http://127.0.0.1:5173/` with API `127.0.0.1:3327`, isolated demo and live SQLite files in this worktree, Mapbox token from the existing local development environment. The user's `5317` demo was left running separately for parent integration.

Normal demo UI checks on 2026-09-27:

- Map → self home: two example places and photographed records. Daily track shows both places and photos. Reflection question → answer → history, diary draft → adopt → save → reload, theme edit → reload, and record comparison → save → reload were exercised.
- Check-in → two suggestions → detail → later/selected → reload and map place detail were exercised. Map → Codex exploration → consent → example conversation and two selectable candidates was exercised.
- Community: friend map has an example friend and two shared records; knowledge map/list/detail has two example posts. Discovery example card generation → save → reopen was exercised. Transfer recipe → two example plans → adoption → saved route was exercised.
- Companion example, plugin store/disaster and final friend comparison: see final verification notes below before closing the issue.

`mise exec -- bunx tsc --noEmit`, `mise exec -- bunx vite build`, and `git diff --check` passed after the shared demo implementation. The displayed transfer plans explicitly say they are fixed Motoyama area examples; entering another region does not perform a place search. The health connection screen remains an explicitly labeled UI example without imported values. Real provider and production API behavior are outside this demo issue.

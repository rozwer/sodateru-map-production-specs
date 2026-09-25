# UI-MAP #8: search flow check (2026-09-25)

## Scope

- Checked the map search flow at a 390 × 844 viewport with the local app and its existing API. No API or saved data was changed.
- The search API's `q` parameter has a maximum length of 200. Previously a 300-character query reached the API and returned a query contract error. The error panel then appeared alongside the unrelated home content. The search input and stored draft are now bounded to 200 characters, and the home content stays hidden during search or detail errors and saved-place loading.

## Browser observations

| Action | Observed result |
| --- | --- |
| Search `名古屋大学` | Four live candidates appeared in the results tab and on the map. [Results screenshot](map-results-390.png). |
| Open the first candidate | The detail showed its name, address, source, Save, Route, and a back button. [Detail screenshot](map-detail-390.png). |
| Return from the detail | The four-result list reappeared. |
| Search `sodateru-nonexistent-place-260925` | The results tab showed 0 items and the explicit empty message. [Empty screenshot](map-empty-390.png). |
| Enter 300 Japanese characters | The field and rendered value stopped at 200; the DOM `maxLength` was 200. |
| Before the fix, submit 300 characters | The API contract error and retry appeared together with home heading and buttons; after isolating error rendering, only the error and retry remained. |

The map displayed its own partial tile-loading warning in these captures. Search candidates, result selection, and detail content still appeared. Map tile delivery was not changed in this work.

## Checks

- `git diff --check`: passed.
- `mise exec -- bunx vite build`: passed.
- `mise exec -- bun run typecheck`: failed on existing errors outside `src/features/map/` (server core test fixtures, exploration, friends, reflection, local dev tool). No error pointed at the changed map files.

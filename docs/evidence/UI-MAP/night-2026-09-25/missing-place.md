# UI-MAP #8: missing saved-place detail (2026-09-25)

At 390 × 844, opening `#/map?placeId=00000000-0000-4000-8000-000000000000` against the existing API produced “場所が見つかりません。” with Retry. The home panel did not appear underneath the error. Previously this failed deep link had no in-sheet exit action.

The sheet now includes “地図へ戻る” while a saved place has no detail, including loading and failure. Retry returned the same not-found message; Back returned to `#/map`. The search draft `名古屋大学` remained in the toolbar. [Failure screenshot](missing-place-390.png).

No place was created or changed. This checks the missing-place response, not a transient network failure or a valid saved-place detail. The map sometimes showed its independent partial tile-loading warning.

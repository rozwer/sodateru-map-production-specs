# UI-MAP #8: search after a saved-place error (2026-09-25)

At 320 × 740, an existing API request for a missing saved place produced “場所が見つかりません。” with Retry and Back. Starting a new `名古屋大学` search returned four live results, but before this fix the old detail error remained below the result list.

Starting a search now aborts any pending detail request and clears its loading and error state along with the prior selection. Repeating the same failure → search sequence showed only the four results and no stale error. The input value remained `名古屋大学`. [320px screenshot](search-after-missing-320.png).

This used only read requests. A successful saved-place detail, an in-flight slow detail response, and external map tile delivery were not changed or independently verified here.

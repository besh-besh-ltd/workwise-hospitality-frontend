# FE follow-up: score vendors recovered on pre-reopen-rule locked evals

Changes
- hooks/useTechEvalWorkflow.js: is_complete no longer yields COMPLETED when bid_window_open===false and eligible_unscored_vendors is non-empty; returns EVALUATING (same as reopened). Absent fields => unchanged.
- TechEvalReopenParts.js: "New vendors ready for evaluation" banner no longer requires `reopened`.
- Tests: hooks/useTechEvalWorkflow.test.js (+4: L2 EVALUATING, empty list COMPLETED, fields absent COMPLETED, window open COMPLETED); ClauseProductItem.reopen.test.js (+1 mounted L2: banner + Round 2, "Click to score", verified cell locked).

RED (impl reverted): Tests: 2 failed, 7 passed, 9 total (L2 hook + L2 mount).
GREEN: npm test -- technical-evaluation approval rfq => 55 suites / 499 tests pass; npm run lint clean.

# Project Manager Task Assignment Plan

## Task Assignment Plan

**Workflow:** nightly (default)
**Cycle Date:** 2026-08-08
**Priority Level:** medium

### Verified Environment State (this cycle)

| Metric | Status |
|--------|--------|
| Lint | 0 errors, 5 warnings (`react-hooks/exhaustive-deps`) |
| Tests | 13/13 passing (2 test files: FinalizationPipeline 4, OlympicWeightliftingEngine 9) |
| Build | PASS (chunk-size + PWA precache 1566 KiB warnings only) |
| Git | Clean, `main`, HEAD `3206635` (8/2/26 update) |
| Critical bugs | None active (DEBUG artifact resolved) |

### Tasks for Downstream Agents

| Agent | Task | Priority | Context | Dependencies |
|-------|------|----------|---------|--------------|
| App Engineer | Fix 5 `react-hooks/exhaustive-deps` lint warnings (stable callbacks / correct deps) | 2 | `AISuggestionModal.jsx:20` (`handleAnalyze`), `TimerWidget.jsx:56` (`setPhaseTimePassed`), `DataContext.jsx:180` (`showToast`), `CoachDashboard.jsx:22` (`fetchAthletes`), `Programs.jsx:37` (`loadTemplates`). Runtime stale-closure risk; QA-recommended. | none |
| QA Engineer | Validate lint fixes (0 errors, warnings reduced) + regression-check | 3 | Run `npm run lint`, `npm test`, `npm run build`; verify WorkoutLog set-entry flow and engine surfaces unaffected. | App Engineer |
| Documentation Engineer | Update CHANGELOG for 8/8 cycle | 6 | Record lint-warning resolution; note any new findings. | QA Engineer |

### Known Issues to Track
- 5 `react-hooks/exhaustive-deps` lint warnings (this cycle's App Engineer target).
- Test coverage 2 files / 13 tests — engine & service pure functions only; no component tests.
- Test infra gap: no `jsdom` / `@testing-library/react` configured (QA rec. #2 from 8/2).
- 30-day e1RM filter timezone edge (minor): `new Date('YYYY-MM-DD')` is UTC midnight vs local cutoff — QA rec. #3, non-blocking.
- Build chunk-size / PWA precache warnings — pre-existing, not this cycle's scope.

### Previous Cycle Findings
- 2026-08-02 (sunday/weeklyUX): commit `dd486e4` verified (30-day e1RM filter, competition squat handling, bar-position tracking). QA: all 3 surfaces consistent; 9 new engine tests added.
- 2026-07-25 App Engineer pipeline step FAILED on ANSI stderr (`ERROR: [0m`) — fixed by `ae55a27` (`ErrorActionPreference=Continue`); pipeline stable since.
- Next scheduled: `sunday`/`weeklyUX` on 2026-08-09 — UX Engineer + QA Engineer.

### Notes for Downstream Agents
- **App Engineer:** One task this cycle (lint warnings). Do not add features; keep fixes minimal. The 5 warnings are all stale-closure risks from missing stable deps — prefer `useCallback`/`useMemo` or include the dep per React guidance.
- **QA Engineer:** Focus on validating the lint fixes and confirming zero regressions. Component-test infra (jsdom) is deferred unless the App Engineer adds it — not required this cycle.

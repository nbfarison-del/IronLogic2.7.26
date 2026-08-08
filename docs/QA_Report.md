# QA Report

**Cycle:** Saturday 2026-08-08 (pipeline: PM → App Engineer → QA Engineer)
**Scope:** Verify 5 `react-hooks/exhaustive-deps` fixes (AISuggestionModal, TimerWidget, DataContext, CoachDashboard, Programs)
**Branch:** `main` (working tree with uncommitted changes)

## Verification Suite

| Check | Result | Detail |
|-------|--------|--------|
| `npm run lint` | **PASS (0 errors, 0 warnings)** | All 5 previously-tracked `react-hooks/exhaustive-deps` warnings resolved |
| `npm test` | PASS (13/13) | 2 test files: FinalizationPipeline (4), OlympicWeightliftingEngine (9); unchanged by this cycle |
| `npm run build` | PASS | 925 modules, built in ~16s; only pre-existing chunk-size/firestore dynamic-import warnings |

## Hook-Fix Regression Validation (2026-08-08)

All 5 fixes verified safe against dependency-identity stability — no re-run loops, no stale closures:

| Fix | Change | Identity check |
|-----|--------|----------------|
| `AISuggestionModal.jsx` | `handleAnalyze` wrapped in `useCallback([athlete])`; effect deps `[athlete, handleAnalyze]` | `athlete` = `selectedAthleteForAI` state (CoachDashboard.jsx:16), stable while modal open |
| `TimerWidget.jsx` | Added `setPhaseTimePassed` to deps | State setter — referentially stable |
| `DataContext.jsx` | Added `showToast` to deps | `useCallback([], ...)` (ToastContext.jsx:20) — stable |
| `CoachDashboard.jsx` | `fetchAthletes` wrapped in `useCallback([user, showToast])`; effect deps include it | `user` = React state (AuthContext.jsx:20), stable |
| `Programs.jsx` | `loadTemplates` wrapped in `useCallback([systemTemplates, showToast, user])`; effect deps include it | `systemTemplates` = `useMemo([], ...)` (Programs.jsx:28) — stable |

No behavior changes introduced; the modal effect ordering (analyze on athlete change) preserved in AISuggestionModal.

## New Feature Validation (dd486e4)

### Bar-position tracking (WorkoutLog.jsx)
- `barType` state defaults to `High Bar`; selector renders only for `bb_squat`. Verified in code.
- Saved to `modifiers.bar` on every strength set (`WorkoutLog.jsx:472`).
- Reused from last entry via `workouts.find(w => w.exerciseId === id)` (`WorkoutLog.jsx:595-601`) — safe because `subscribeToWorkouts` orders by `date desc` (`firestoreService.js:260`), so `.find()` returns the most recent entry.
- Non-squat exercises reset to `High Bar`; legacy entries without `modifiers.bar` are treated as High Bar (competition) by intent.

### Competition squat handling (Progress.jsx, OlympicWeightliftingEngine.js)
- DOTS max (`Progress.jsx:123`) and engine back-squat trend/weak-point analysis (`OlympicWeightliftingEngine.js:91,209`) exclude `modifiers.bar === 'Low Bar'`. Consistent across all three surfaces. **Covered by new tests.**

### 30-day e1RM filter (Progress.jsx:71-83)
- `e1rmData` filtered to `date >= now - 30 days`; chart title updated to "Last 30 Days". Verified.

## Findings / Known Issues

1. ~~**5 lint warnings**~~ **RESOLVED 2026-08-08**: all `react-hooks/exhaustive-deps` warnings eliminated (see table above).
2. **30-day filter timezone edge (minor, open):** `new Date('YYYY-MM-DD')` parses as UTC midnight while the cutoff is computed in local time. In US timezones, a workout logged exactly 30 days ago is dropped (window is effectively ~29-30 days). Not a blocker; recommend date-only comparison if precision matters.
3. **Test infra gap (open):** No jsdom / React Testing Library configured, so component-level surfaces (hook fixes, bar-position selector, 30-day filter) are covered only by code review, not automated tests. Pure-function engine surfaces are unit-tested.
4. **Test coverage (open):** 2 files/13 tests cover only service-level pure functions. Recommend adding `jsdom` + `@testing-library/react` in a future cycle for component coverage.

## Coverage Gap Analysis

| Surface | Automated? | Notes |
|---------|-----------|-------|
| Olympic engine back-squat exclusion (dashboard + weak points) | Yes (9 tests) | New `src/tests/OlympicWeightliftingEngine.test.js` |
| Sync finalization pipeline | Yes (4 tests) | Existing |
| Bar-position selector + persistence | No | Requires component test infra |
| 30-day e1RM filter | No | Requires component test infra |

## Regression Check
- WorkoutLog set-entry flow (weight/RPE autoadjustment, rest timer, sync enqueue) — reviewed, unchanged paths intact.
- Snatch/cleanJerk/frontSquat dashboards unaffected by bar filtering — covered by new test.

## Recommendations
1. ~~Address the 5 lint warnings~~ **DONE 2026-08-08** (App Engineer cycle).
2. Add `jsdom` + `@testing-library/react` to enable component tests for WorkoutLog and Progress (and to lock in the hook fixes against regression).
3. Optionally normalize 30-day cutoff to date-only arithmetic to avoid the timezone edge.

# QA Report

**Cycle:** Saturday 2026-08-15 (pipeline: PM → App Engineer → QA Engineer)
**Scope:** Verify 30-day e1RM filter timezone fix (`Progress.jsx` + new `dateUtils.isWithinRecentDays`)
**Branch:** `main` (working tree with uncommitted changes)

## Verification Suite (2026-08-15)

| Check | Result | Detail |
|-------|--------|--------|
| `npm run lint` | **PASS (0 errors, 0 warnings)** | Clean |
| `npm test` | **PASS (21/21)** | 3 test files: FinalizationPipeline (4), OlympicWeightliftingEngine (9), dateUtils (8 new) |
| `npm run build` | **PASS** | 925 modules, built in ~10.5s; only pre-existing chunk-size / firestore dynamic-import warnings |
| TZ-independence | **PASS** | Suite passes identically under `TZ=America/Los_Angeles`, `TZ=UTC`, and local (America/Phoenix) |

## Timezone-Fix Validation (2026-08-15)

**Bug reproduced and fix confirmed** in a US timezone (America/Phoenix, UTC-7), with `now = 2026-08-15`:

| Case | Old filter (`new Date(dateStr) >= cutoff`) | New filter (`isWithinRecentDays`) | Expected |
|------|--------------------------------------------|-----------------------------------|----------|
| Workout exactly 30 days ago (`2026-07-16`, date-only) | `false` (DROPPED — the bug) | `true` | `true` |
| Workout 31 days ago (`2026-07-15`) | `false` | `false` | `false` |
| Legacy full timestamp 29 days ago (`2026-07-17T23:59:59.000Z`) | `true` | `true` | `true` |

Root cause confirmed: `new Date('YYYY-MM-DD')` parses as UTC midnight, which lands in the *previous* local evening in negative-offset zones, so the local midnight cutoff compared greater and the boundary workout fell out of the window. `isWithinRecentDays` (src/utils/dateUtils.js:12) builds the cutoff with local date components (`getDateStr`) and compares `YYYY-MM-DD` strings after stripping any timestamp, so the window is a true inclusive local-calendar window.

**Engine surfaces untouched:** DMAIC algorithm, OlympicWeightliftingEngine, and the DOTS/tonnage logic in `Progress.jsx` are unchanged. The only modified consumption path is `e1rmData` (src/pages/Progress.jsx:75), plus the new shared helper and its tests.

## Findings / Known Issues

1. ~~**30-day filter timezone edge**~~ **RESOLVED 2026-08-15**: date-only window comparison via `isWithinRecentDays`. Boundary day 30 is now inclusive in all timezones (see table above).
2. **Residual minor edge (open, legacy-only):** For *legacy full-UTC-timestamp* entries, the UTC date is used (`split('T')[0]`), so when UTC date differs from the local date (timestamp near UTC midnight) the boundary can shift by ±1 day. Modern entries are stored as date-only strings via `toDateStr` (firestoreService.js:758), so the standard path is exact. Not a blocker.
3. **Test infra gap (open):** No jsdom / React Testing Library configured; component-level rendering of the filter (chart) is still only code-reviewed. The filter logic itself is now unit-tested.
4. **Test coverage:** 3 files / 21 tests. dateUtils (8) now covers the 30-day filter boundary and timezone safety; engine surfaces (9) and finalization pipeline (4) unchanged.

## Coverage Gap Analysis

| Surface | Automated? | Notes |
|---------|-----------|-------|
| 30-day e1RM filter logic (`isWithinRecentDays`) | **Yes (6 tests)** | New `src/tests/dateUtils.test.js` |
| `parseWorkoutDate` timezone safety | **Yes (2 tests)** | New |
| Olympic engine back-squat exclusion (dashboard + weak points) | Yes (9 tests) | Existing |
| Sync finalization pipeline | Yes (4 tests) | Existing |
| Chart rendering / component integration | No | Requires jsdom + RTL |

## Regression Check
- `e1rmData` sort (`new Date(a.date)`) still UTC-based — acceptable, it only orders points; correctness of *inclusion* is now local-calendar based.
- Non-squat exercises, DOTS, tonnage, recommendations: no path changes this cycle.

## Recommendations
1. ~~Address the 30-day timezone edge~~ **DONE 2026-08-15** (App Engineer + QA verified).
2. Add `jsdom` + `@testing-library/react` to lock in component-level behavior (30-day chart, hook fixes, bar-position selector).
3. Optional: normalize legacy UTC timestamps to local date at read time to close the residual ±1-day edge for old entries.

---

## Previous Cycle (2026-08-08): Hook-Fix Regression Validation

**Scope:** Verify 5 `react-hooks/exhaustive-deps` fixes (AISuggestionModal, TimerWidget, DataContext, CoachDashboard, Programs)

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

# Future Recommendations — Week 28

## Based on Current Analysis

### 1. Bundle Size Optimization (Performance)

| File | Size | Recommendation |
|------|------|---------------|
| `assets/index-BQMo0G4c.js` | **750 kB** | Split into smaller chunks via `build.rollupOptions.output.manualChunks` in `vite.config.js`. Consider dynamic imports for heavy deps (Recharts, Firebase). |
| `assets/logo-CUG6PATm.png` | **590 kB** | Optimize with `imagemin` or convert to WebP. This is a PNG logo that shouldn't exceed 100 kB. |
| `assets/dashboard_hero-BESTRYg_.png` | **708 kB** | Same — compress or lazy-load as background image. |
| `assets/mobility_hero-DDgyeQWO.png` | **574 kB** | Same. |

### 2. Test Coverage Gaps

- **SyncService** has 4 tests (good coverage of core logic)
- **No tests for**: DMAICService, GeminiService, ILMService, OlympicWeightliftingEngine, firestoreService, or any React component
- **Recommendation**: Add unit tests for critical services in priority order:
  1. `calculator.js` (pure functions, easy to test)
  2. `OlympicWeightliftingEngine.js` (high business value)
  3. `DMAICService.js` (core decision engine)

### 3. Lint Warnings

10 warnings, all `react-hooks/exhaustive-deps`. Fix in priority order:
- `WorkoutLog.jsx:340` — missing `loadPlannedExercise` and `selectedExerciseId` (potential stale closure bug)
- `CalendarView.jsx:180` / `MobilityTab.jsx:102` — missing `showToast` (likely intentional, but should suppress via comment)
- `Profile.jsx:43` — missing `loadInitialData`

### 4. Olympic Lifting — Next Features

Per `olympic-weightlifting-architecture.md`:
- **Video analysis** infrastructure (store URLs, bar path placeholders)
- **AI technical scoring** from video
- **Competition prep dashboards** (snatch/C&J totals, PR timeline)

### 5. Critical Bug: `console.log` Leaks

The test file mocks `logger` but there are ~5 `console.error` calls in production code that bypass the logger. These should route through `logger.error()` for consistency.

### Priority Roadmap

1. **Critical**: Fix missing dep warnings that could cause stale closures (WorkoutLog.jsx:340)
2. **Performance**: Split 750 kB main chunk
3. **Tests**: Add pure-function tests for calculator.js
4. **UX**: Optimize hero images (WebP + lazy loading)
5. **Feature**: Video analysis storage schema

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Competition squat handling** — DOTS max (`Progress.jsx`), back-squat dashboard trend, and weak-point analysis (`OlympicWeightliftingEngine.js`) now exclude `bb_squat` entries logged with `modifiers.bar === 'Low Bar'`. Only High Bar and unspecified (legacy) entries count toward the competition squat. (#dd486e4)
- **Bar-position tracking** — `WorkoutLog.jsx` gains a High Bar / Low Bar selector for `bb_squat`. The choice is saved to `modifiers.bar` on every strength set, reused from the most recent entry of the same exercise, and reset to High Bar for non-squat exercises. (#dd486e4)
- **30-day e1RM filter** — the lift intensity chart on `Progress.jsx` now shows only the last 30 days of estimated 1RM data, with the title updated to "Last 30 Days". (#dd486e4)
- **Unit tests for the Olympic engine** — `src/tests/OlympicWeightliftingEngine.test.js` adds 9 tests covering low-bar exclusion on the back-squat dashboard, weak-point analysis, profile fallback, total regression, and competition-phase behavior.

### Changed
- `latestByExercise` and `buildTrend` in `OlympicWeightliftingEngine.js` accept an optional predicate to filter workouts by bar position.
- Test suite grows from 1 file / 4 tests to 2 files / 13 tests.

### Fixed
- Pipeline automation now sets `ErrorActionPreference=Continue` so opencode ANSI stderr output no longer terminates pipeline steps. (#ae55a27)

### Known Issues
- 5 `react-hooks/exhaustive-deps` lint warnings (0 errors): `AISuggestionModal.jsx:20`, `TimerWidget.jsx:56`, `DataContext.jsx:180`, `CoachDashboard.jsx:22`, `Programs.jsx:37`.
- Minor: the 30-day e1RM filter parses `YYYY-MM-DD` dates as UTC midnight while the cutoff uses local time; in US timezones a workout exactly 30 days old can be dropped.
- No `jsdom` / React Testing Library configured, so component-level surfaces are covered by code review rather than automated tests.

## [2026-07-19] — AI Automation Pipeline Framework

### Added
- `IronLogicHQ/AI/` automation framework: prompt role definitions, `ai-runner.ps1`, `master-runner.ps1`, report generation, and session logging.
- Pipeline definitions for `default`, `nightly`, `weekly`, `sunday`, `monthly`, `weeklyUX`, `weeklyIronLogic`, and `monthlyResearch` workflows.
- Windows Task Scheduler integration via `master-launcher.bat`; results are committed to an `ai-reports/*` branch for human review.

## [2026-06-28] — Olympic Weightlifting Feature Set

### Added
- Olympic Weightlifting onboarding, movement catalog, and schema (`docs/olympic-weightlifting-architecture.md`).
- `OlympicWeightliftingEngine.js`: weak-point analysis, competition phase selection, recovery adjustment, session builder, substitutions, and smart recommendations.
- Olympic dashboards for snatch, clean and jerk, total, front squat, and back squat.
- `OlympicSetLogger.jsx` fast set entry with load jumps, percentage shortcuts, and quick RPE controls.
- Video analysis metadata placeholders for future AI analysis.

## [2026-05-17] — DMAIC Decision Engine

### Added
- `DMAICService.js` decision engine (Define → Measure → Analyze → Improve → Control).
- Firestore-backed workout logging, session finalization, offline queue, and batched sync.
- Mobility, competition peaking, and planner surfaces.

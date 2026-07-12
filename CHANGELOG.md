# CHANGELOG

All notable changes to IronLogic are documented in this file.

## [2.7.26] — 2026-07-12

### Added
- AdaptiveCoach.jsx — AI-adaptive coaching page with role overlay and athlete plan viewing
- CompetitionPeaking.jsx — Competition peaking phase calendar view
- WeeklyCheckIn.jsx — Weekly readiness and recovery check-in page
- Olympic weightlifting engine (`OlympicWeightliftingEngine.js`) — Weak-point analysis, periodization phases, recovery adjustment
- Olympic set logger (`OlympicSetLogger.jsx`) — Specialized set entry for snatch/C&J with technical quality scoring
- Olympic weightlifting analytics (`analytics/olympicWeightlifting.js`)
- Olympic weightlifting utility functions (`utils/olympicWeightlifting.js`)
- Olympic weightlifting data catalog (`data/olympicWeightlifting.js`)
- ProgramGenerator.js — AI-assisted program generation from questionnaire data
- Advanced exercise templates (`data/advancedTemplates.js`)
- Mobility path system (`data/mobilityPaths.js`, `data/mobilityExercises.js`)
- Qualifying totals reference data (`data/qualifyingTotals.js`)
- ILM service and hook (`ILMService.js`, `useILM.js`)
- DMAIC decision engine (`DMAICService.js`) — Full Define-Measure-Analyze-Improve-Control cycle
- SyncService — Offline sync queue with retry, idempotency, localStorage persistence
- GeminiService — Google Gemini AI chat wrapper with retry/timeout logic
- MetricsService — Training metrics calculations (ACWR, fatigue, adherence, e1RM trends)
- ErrorBoundary — Class-component error boundary with friendly messages and stack trace toggle
- TimerWidget + TimerContext — Stopwatch, countdown, Tabata, EMOM modes
- Toast notification system (`ToastContext.jsx`)
- PWA support via `vite-plugin-pwa` with auto-updating service worker
- Firestore persistence with multi-tab support (`persistentMultipleTabManager`)
- Coach dashboard, ProPlanner, coach/athlete routes with access guards
- Subscription guard with trial period support
- Questionnaire and onboarding wizard pages
- Video analysis schema in Firestore (`liftVideos` collection)
- AI automation infrastructure (`ai/` directory) — code review, issue detection, cleanup agents
- Windows Task Scheduler integration for automated agents

### Changed
- Test framework migrated from Jest to Vitest (v4.1.0)
  - `FinalizationPipeline.test.js` ported from `@jest/globals` to `vitest` API
  - `package.json` updated with `"test": "vitest run"` script
- ESLint upgraded to v9 flat config
- React updated to v19.2.0
- React Router upgraded to v7.13.0
- Vite upgraded to v7.2.4
- Firebase upgraded to v12.9.0
- Browserslist database updated (was 6 months stale)
- Firestore persistence migrated from `enableMultiTabIndexedDbPersistence` to `persistentLocalCache` API

### Fixed
- Build test script working (Vitest, not Jest)
- ESLint: 0 errors, 10 warnings (all pre-existing react-hooks/exhaustive-deps)
- **XSS vulnerability**: `Steps.jsx:114` — replaced `document.write()` with `textContent` assignment to prevent AI content injection
- **Memory leak**: `DataContext.jsx:56-80` — added `clearInterval(pendingInterval)` to the logout cleanup path
### Known Issues

- 10 ESLint warnings (missing dependency arrays across 8 files)
- 3 images > 500KB (logo 591KB, dashboard_hero 709KB, mobility_hero 575KB)
- Main bundle index.js > 500KB (733KB raw, 231KB gzipped)
- ToastContext timeout leak on unmount (setTimeout IDs not tracked)
- Only 1 test file exists (critical coverage gap)
- 65 `console.error` calls — no centralized error reporting
- 11 `console.log` calls in production — debug leftovers
- 7 icon-only buttons missing `aria-label`
- No CSP, no SEO/social meta tags in index.html
- `/programs` route has no navbar link (no user discovery path)
- `isActivePath` uses exact match — coach sub-routes never highlight
- Hardcoded admin email (`nbfarison@gmail.com`) in 5 files instead of importing from constants.js

## [2.7.25] — 2026-06-28

- Migrated Firestore rules to v2
- Added `program_templates` collection with visibility-based access
- Registered_users collection with self-create rules
- Coach write access to athletePrograms, coaching, programCompliance, comments, ilm subcollections

## [2.7.24] — 2026-06-14

- Initial Olympic weightlifting schema and migration plan
- Competition peaking calendar integration
- Enhanced workout document schema with optional namespaced fields

## [2.7.23] — 2026-05-31

- Authentication system with email/password
- Basic workout logging (WorkoutLog.jsx)
- Home dashboard with hero panel, weekly stats, today's session
- Calendar view with training log entries
- Progress page with basic analytics
- Profile page with settings
- Administrator panel
- Mobile-responsive navbar with bottom tabs
- Initial dark-theme CSS framework

## [0.0.0] — Initial scaffold

- Vite + React template
- Basic project structure

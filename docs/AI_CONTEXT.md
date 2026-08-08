# AI Context — IronLogic 2.7.26

## Project Overview

IronLogic is a fitness coaching web application built with React + Vite + Firebase. It features AI-powered workout programming via Google Gemini, a DMAIC decision engine, Olympic weightlifting support, and real-time Firestore data sync.

## Tech Stack

- **Frontend**: React 19, React Router v7, Vite 7
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **AI**: Google Gemini 1.5 Flash (`@google/generative-ai`)
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa
- **Language**: JavaScript (JSX), ES Modules

## Project Structure

```
IronLogic2.7.26/
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/          # React context providers (Auth, Data, Settings, Timer, Toast)
│   ├── config/           # Firebase config, constants
│   ├── data/             # Static data (exercises, mobility paths, qualifying totals)
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Route pages (Home, WorkoutLog, Calendar, Progress, etc.)
│   ├── services/         # Business logic (Firestore, Gemini, DMAIC, ILM, Sync)
│   └── utils/            # Utility functions (calculator, date, logger, error messages)
├── IronLogicHQ/
│   └── AI/
│       ├── prompts/      # Role definitions for AI agents (project_manager, application_engineer, etc.)
│       ├── reports/      # Generated pipeline reports
│       ├── logs/         # Execution logs (session.log + per-step logs)
│       ├── context/      # Persistent context / memory files
│       └── scripts/      # ai-runner.ps1, master-runner.ps1
├── docs/                 # Documentation
├── firestore.rules       # Firestore security rules
└── package.json
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component, routing, provider tree |
| `src/services/DMAICService.js` | DMAIC decision engine (Define → Measure → Analyze → Improve → Control) |
| `src/services/GeminiService.js` | Gemini AI chat wrapper with retry/timeout |
| `src/services/firestoreService.js` | All Firestore CRUD operations |
| `src/services/OlympicWeightliftingEngine.js` | Olympic weak points, competition phase, recovery adjustment, session builder, dashboards |
| `src/pages/WorkoutLog.jsx` | Main workout logging page (~1300 lines); bar-position selector for `bb_squat` |
| `src/pages/Progress.jsx` | Progress charts; 30-day e1RM filter; DOTS max excludes low-bar squats |
| `src/context/DataContext.jsx` | Central data state with Firestore subscriptions |
| `src/config/constants.js` | `SUPER_ADMIN_EMAIL` and app constants |
| `src/tests/` | Vitest unit tests (FinalizationPipeline, OlympicWeightliftingEngine) |
| `vite.config.js` | Build configuration, PWA settings |

## Pipeline (Run Agent)

The default pipeline is:
```
Project Manager → Application Engineer → QA Engineer → Documentation Engineer → Executive Summary
```

Each step passes its report as context to the next. If any step fails, the pipeline stops and produces a summary with failure details.

## Agent Roles (IronLogicHQ/AI/prompts/)

| Prompt | Responsibility |
|--------|---------------|
| `project_manager` | Task assignment, priority management, cross-role coordination |
| `application_engineer` | Feature development, API integration, state management, architecture |
| `qa_engineer` | Test writing, verification (lint/test/build), regression checking |
| `documentation_engineer` | README, changelog, API references, architecture docs, AI context |
| `automation_engineer` | CI/CD pipelines, build tooling, test infrastructure |
| `ux_engineer` | Mobile responsiveness, accessibility (WCAG), usability |
| `ironlogic_engineer` | Generalist bug fixes, code review, embedded QA |
| `research_engineer` | Deep investigation, framework audits, architecture analysis |

## Known Issues

| ID | Issue | Status |
|----|-------|--------|
| P3 | Toast timeout leak on unmount | ✅ RESOLVED |
| P2 | TimerContext missing useMemo | 🔴 Open |
| S2 | Admin email hardcoded in 5 files | 🔴 Open |
| L1 | 5 `react-hooks/exhaustive-deps` warnings (0 errors) | ✅ RESOLVED 2026-08-08 |
| L2 | 30-day e1RM filter UTC-vs-local cutoff edge (minor) | 🔴 Open |
| L3 | No jsdom / React Testing Library (component surfaces review-only) | 🔴 Open |

### L1 resolution (2026-08-08) — lint now 0 errors / 0 warnings

All 5 `react-hooks/exhaustive-deps` warnings were resolved by wrapping async handlers in `useCallback` and adding missing (referentially stable) deps:

| File | Fix |
|------|-----|
| `AISuggestionModal.jsx` | `handleAnalyze` wrapped in `useCallback([athlete])`; effect deps `[athlete, handleAnalyze]` |
| `TimerWidget.jsx` | Added `setPhaseTimePassed` (state setter) to effect deps |
| `DataContext.jsx` | Added `showToast` (`useCallback([])`, stable) to effect deps |
| `CoachDashboard.jsx` | `fetchAthletes` wrapped in `useCallback([user, showToast])`; effect deps include it |
| `Programs.jsx` | `loadTemplates` wrapped in `useCallback([systemTemplates, showToast, user])`; effect deps include it |

No re-run-loop or stale-closure risk — `user` (state), `showToast` (`useCallback([])`), `systemTemplates` (`useMemo([])`), and the `athlete` prop (state) are all referentially stable. QA-verified 2026-08-08 (lint/test/build PASS).

## Recent Features (dd486e4, 2026-08-01)

- **Competition squat handling** — `bb_squat` entries with `modifiers.bar === 'Low Bar'` are excluded from DOTS max (`Progress.jsx:123`), back-squat dashboard trend, and weak-point analysis (`OlympicWeightliftingEngine.js:91,209`). High Bar and unspecified (legacy) entries count.
- **Bar-position tracking** — High Bar / Low Bar selector for `bb_squat` in `WorkoutLog.jsx`; saved to `modifiers.bar` (line 472), reused from the most recent entry (lines 597-601), reset to High Bar for other exercises.
- **30-day e1RM filter** — Progress chart shows only the last 30 days of e1RM data (`Progress.jsx:71-83`).

## Verification Commands

```bash
npm run lint    # 0 errors required (0 warnings as of 2026-08-08)
npm test        # 100% pass rate (13 tests / 2 files)
npm run build   # Must succeed
```

# AI Context — IronLogic 2.7.26

## Project Overview

IronLogic is a fitness coaching web application built with React + Vite + Firebase. It features AI-powered workout programming via Google Gemini, a DMAIC decision engine, Olympic weightlifting support, and real-time Firestore data sync.

## Tech Stack

- **Frontend**: React 19, React Router v7, Vite 7
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **AI**: Google Gemini 1.5 Flash (`@google/generative-ai`)
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa
- **Testing**: Vitest
- **Language**: JavaScript (JSX), ES Modules

## Project Structure

```
IronLogic2.7.26/
├── src/
│   ├── analytics/         # Sport-specific analytics modules
│   ├── components/        # Reusable UI components (18 files)
│   │   ├── DMAIC/         # DMAIC-related components
│   │   └── ILM/           # ILM-related components
│   ├── config/            # Firebase config, constants
│   ├── context/           # React context providers (Auth, Data, Settings, Timer, Toast)
│   ├── data/              # Static data (exercises, mobility paths, qualifying totals)
│   ├── hooks/             # Custom React hooks (useILM)
│   ├── pages/             # Route pages (19 pages)
│   ├── services/          # Business logic (8 services)
│   ├── tests/             # Test files (1 file, 4 tests)
│   └── utils/             # Utility functions (7 modules)
├── ai/                    # Local AI automation infrastructure
│   ├── prompts/           # Agent prompt templates
│   ├── logs/              # Automation execution logs
│   ├── reports/           # Generated markdown reports
│   ├── agents/            # Agent runner scripts
│   └── memory/            # Persistent memory / context files
├── scripts/               # Scheduler and launcher scripts
├── config/                # Automation configuration
├── docs/                  # Documentation (all docs except CHANGELOG + RELEASE_NOTES)
├── firestore.rules        # Firestore security rules
├── README.md              # Project overview and setup
├── CHANGELOG.md           # Version history
├── RELEASE_NOTES.md       # Current release notes
└── package.json
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component, routing, provider tree |
| `src/services/DMAICService.js` | DMAIC decision engine (Define → Measure → Analyze → Improve → Control) |
| `src/services/GeminiService.js` | Gemini AI chat wrapper with retry/timeout |
| `src/services/firestoreService.js` | All Firestore CRUD operations (1107 lines) |
| `src/services/SyncService.js` | Offline sync queue with retry and idempotency |
| `src/pages/WorkoutLog.jsx` | Main workout logging page (~1300 lines) |
| `src/context/DataContext.jsx` | Central data state with Firestore subscriptions |
| `src/config/constants.js` | `SUPER_ADMIN_EMAIL` and app constants |
| `vite.config.js` | Build configuration, PWA settings |

## Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LandingPage / Home | Public / Auth |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Various | Public |
| `/log`, `/olympic-lifting`, `/progress`, `/programs` | Various | Auth |
| `/profile`, `/calendar`, `/questionnaire`, `/onboarding`, `/peaking` | Various | Auth |
| `/checkin` | WeeklyCheckIn | Auth + Subscription |
| `/coach`, `/coach/plan/:athleteId`, `/coach/adaptive/:athleteId`, etc. | Various | Coach/Admin |
| `/admin` | Admin | Admin only |

## Documentation Index

| Document | Path | Purpose |
|----------|------|---------|
| Project Overview | `README.md` | Setup, features, tech stack, structure |
| Architecture | `docs/ARCHITECTURE.md` | System architecture, data flow, provider hierarchy |
| API Reference | `docs/API_REFERENCE.md` | Internal API surfaces and interfaces |
| Developer Guide | `docs/DEVELOPER_GUIDE.md` | Code conventions, patterns, workflows |
| Changelog | `CHANGELOG.md` | Version history |
| Release Notes | `RELEASE_NOTES.md` | Current release details |
| IronLogic Method | `docs/IRONLOGIC_MANUSCRIPT.md` | DMAIC framework manuscript |
| Olympic Architecture | `docs/olympic-weightlifting-architecture.md` | Oly lifting schema and engine |
| QA Report | `docs/QA_Report.md` | QA audit findings |
| UX Report | `docs/UX_Report.md` | UX audit recommendations |
| Algorithm Audit | `docs/IronLogic_Report.md` | DMAIC algorithm consistency audit |
| Research Review | `docs/Research_Report.md` | Monthly literature review |
| Automation Guide | `docs/README_AUTOMATION.md` | AI automation setup |
| AI Context | `docs/AI_CONTEXT.md` | Context for AI automation agents |

## Agent Responsibilities

- **code_review**: Scan source files for lint errors, dead code, and anti-patterns
- **issue_detector**: Analyze logs and reports for recurring errors, performance issues
- **cleanup**: Archive old logs, trim memory files, remove stale artifacts

## Automation Rules

1. Never modify application source files (`src/`, `vite.config.js`, `package.json`)
2. All automation artifacts live under `ai/`, `scripts/`, `config/`, `docs/`
3. Logs rotate automatically after 90 days (configurable)
4. Reports are retained for up to 52 weeks
5. Schedule changes are made in `config/automation_config.json` only

## Known Issues

- Memory leak: ToastContext timeouts on unmount (unresolved)
- 65 `console.error` calls with no centralized error monitoring
- 65 `console.error` calls with no centralized error monitoring
- 11 `console.log` calls in production code
- Only 1 test file (critical coverage gap)
- 733KB main bundle (exceeds 500KB warning)
- 7 icon buttons missing `aria-label`
- `/programs` route has no nav link

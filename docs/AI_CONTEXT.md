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
├── IronLogicHQ/AI/        # AI automation framework
│   ├── automation_config.json   # Schedule definitions
│   ├── execution_history.json   # Run tracking
│   ├── prompts/                 # Agent role definitions (7 prompt files)
│   ├── scripts/                 # Runner scripts
│   │   ├── master-runner.ps1    # Orchestrator with catch-up logic
│   │   └── ai-runner.ps1        # Single-step agent executor
│   ├── reports/                 # Generated markdown reports
│   └── logs/                    # Execution logs
├── master-launcher.bat    # Single Task Scheduler entry point
├── docs/                  # Documentation
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
| Automation Guide | `docs/README_AUTOMATION.md` | AI automation setup and workflow reference |
| AI Context | `docs/AI_CONTEXT.md` | Context for AI automation agents |

## AI Agent Roles

| Role | Workflows | Responsibility |
|------|-----------|---------------|
| **project_manager** | All | Decision-maker: determines tasks, assigns work, tracks progress |
| **application_engineer** | nightly | Feature development, API integration, state management |
| **qa_engineer** | nightly, weekly_ux | Test writing, verification, quality assurance |
| **documentation_engineer** | nightly | Documentation, changelogs, API references |
| **ux_engineer** | weekly_ux | Accessibility, responsive design, usability |
| **ironlogic_engineer** | weekly_ironlogic, monthly_research | Bug fixes, code review, performance (review only in IronLogic workflows) |
| **research_engineer** | monthly_research | Deep investigation, framework audits, architectural analysis |

## Pipelines

| Workflow | Steps | Frequency | Output |
|----------|-------|-----------|--------|
| **nightly** | PM -> App Engineer -> QA -> Documentation Engineer | Daily | ExecutiveSummary.md |
| **weekly_ux** | PM -> UX Engineer -> QA | Weekly | UX_Report.md |
| **weekly_ironlogic** | PM -> IronLogic Engineer (review only) | Weekly | IronLogic_Report.md |
| **monthly_research** | PM -> Research Engineer -> IronLogic Engineer (review) | Monthly | Research_Report.md |

## Automation Rules

1. Never modify application source files (`src/`, `vite.config.js`, `package.json`)
2. IronLogic Engineer reviews only -- never modifies the DMAIC algorithm automatically
3. All automation artifacts live under `IronLogicHQ/AI/`
4. Schedule changes are made in `automation_config.json` only
5. Workflows stop on first failure
6. Feature branches require user approval before any code changes

## Known Issues

- Memory leak: ToastContext timeouts on unmount (unresolved)
- 65 `console.error` calls with no centralized error monitoring
- 11 `console.log` calls in production code
- Only 1 test file (critical coverage gap)
- 733KB main bundle (exceeds 500KB warning)
- 7 icon buttons missing `aria-label`
- `/programs` route has no nav link

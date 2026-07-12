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
├── ai/                   # Local AI automation infrastructure
│   ├── prompts/          # Agent prompt templates
│   ├── logs/             # Automation execution logs
│   ├── reports/          # Generated markdown reports
│   ├── agents/           # Agent runner scripts
│   └── memory/           # Persistent memory / context files
├── scripts/              # Scheduler and launcher scripts
├── config/               # Automation configuration
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
| `src/pages/WorkoutLog.jsx` | Main workout logging page (~1300 lines) |
| `src/context/DataContext.jsx` | Central data state with Firestore subscriptions |
| `src/config/constants.js` | `SUPER_ADMIN_EMAIL` and app constants |
| `vite.config.js` | Build configuration, PWA settings |

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

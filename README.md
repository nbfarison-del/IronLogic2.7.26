# IronLogic

AI-powered fitness coaching web application built with React + Vite + Firebase.

IronLogic programs strength, powerlifting, and Olympic weightlifting athletes through a DMAIC decision engine (Define → Measure → Analyze → Improve → Control), adaptive session building, and real-time Firestore data sync.

## Features

- **DMAIC decision engine** — every recommendation maps to Define / Measure / Analyze / Improve / Control with evidence.
- **Olympic Weightlifting** — onboarding, competition phase planning (Accumulation → Intensification → Peaking → Taper), weak-point analysis, accessory selection, and dedicated dashboards for snatch, clean and jerk, total, front squat, and back squat.
- **Competition squat handling** — High Bar / Low Bar tracking; only High Bar (and legacy) `bb_squat` entries count toward the competition squat, DOTS max, and weak-point analysis.
- **30-day e1RM trends** — lift intensity charts show the last 30 days of estimated 1RM data, filtered with a timezone-safe local-calendar window.
- **Workout logging** — fast set entry, RPE autoadjustment, rest timer, bar-position selector, offline queue, and batched session finalization.
- **AI coach chat** — Google Gemini integration with retry/timeout handling.
- **PWA** — installable with offline persistence via multi-tab Firestore cache.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router v7, Vite 7 |
| Backend | Firebase (Firestore, Auth, Hosting) |
| AI | Google Gemini (`@google/generative-ai`) |
| Charts | Recharts |
| PWA | vite-plugin-pwa |
| Testing | Vitest |

## Getting Started

### Prerequisites

- Node.js 18+ (Vite 7 requirement)
- npm

### Install

```bash
npm install
```

### Environment variables

Firebase config is read from environment variables. Create a `.env` file at the project root (or set these in your hosting platform):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_GEMINI_API_KEY=
```

> If `VITE_FIREBASE_API_KEY` is missing, the app renders the error boundary instead of crashing (see `src/config/firebaseConfig.js`).

### Run locally

```bash
npm run dev      # start dev server (--host)
npm run build    # production build
npm run preview  # preview the production build
```

### Verification

```bash
npm run lint    # 0 errors, 0 warnings
npm test        # Vitest suite (21 tests / 3 files)
npm run build   # must succeed
```

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
│   ├── services/         # Business logic (Firestore, Gemini, DMAIC, Olympic engine, Sync)
│   ├── tests/            # Vitest unit tests
│   ├── utils/            # Utility functions (calculator, date, logger, error messages)
│   └── analytics/        # Session summaries (olympic weightlifting)
├── IronLogicHQ/AI/       # AI agent pipeline (prompts, reports, logs, scripts)
├── docs/                 # Documentation
├── firestore.rules       # Firestore security rules
├── CHANGELOG.md
└── package.json
```

## Documentation

- [AI Context](docs/AI_CONTEXT.md) — project overview for AI agents and contributors
- [Olympic Weightlifting Architecture](docs/olympic-weightlifting-architecture.md) — schema and component architecture
- [QA Report](docs/QA_Report.md) — latest verification results
- [AI Automation](docs/README_AUTOMATION.md) — scheduled AI pipeline setup
- [Changelog](CHANGELOG.md)

## AI Automation

The repo includes an AI agent pipeline (`IronLogicHQ/AI/`) that runs scheduled health checks, UX audits, and code review. See [docs/README_AUTOMATION.md](docs/README_AUTOMATION.md) for setup. Reports are pushed to an `ai-reports/*` branch for human review.

## Known Issues

- No `jsdom` / React Testing Library configured — component-level surfaces are review-only.
- Full issue list in [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md).

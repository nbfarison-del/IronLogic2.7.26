# IronLogic HQ

**Train Smarter, Perform Stronger** — AI-powered fitness coaching application.

IronLogic is a progressive web application (PWA) for athletes and coaches to plan, log, analyze, and adapt training using the IronLogic Method — a DMAIC-based decision-support framework for individualized exercise prescription.

## Features

- **Workout Logging** — Log strength, Olympic weightlifting, and cardio sessions with RPE autoregulation
- **Olympic Weightlifting** — Specialized logging with snatch/C&J variants, technique notes, bar speed, video analysis placeholders
- **AI-Powered Coaching** — Gemini-assisted recommendations via DMAIC decision engine
- **Program Builder** — Generate and manage training programs with ProPlanner and AI templates
- **Calendar** — Visual training calendar with session finalization, recovery tracking, competition peaking
- **Progress Analytics** — e1RM trends, volume, intensity, ACWR, adherence tracking
- **Readiness & Recovery** — Daily check-ins, sleep/motivation/soreness tracking, recovery scores
- **Coach Dashboard** — Multi-athlete management, program assignment, coaching notes
- **Offline-First Sync** — Queue-based sync engine with retry, idempotency, and localStorage persistence
- **Timer** — Stopwatch, countdown, Tabata, EMOM modes
- **PWA** — Installable, auto-updating service worker

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Vite 7 |
| **Backend** | Firebase (Firestore, Auth, Hosting) |
| **AI** | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| **Charts** | Recharts |
| **PWA** | vite-plugin-pwa |
| **Testing** | Vitest |
| **Lint** | ESLint 9 |
| **Language** | JavaScript (JSX), ES Modules |
| **Font** | Outfit (Google Fonts) |

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPER_ADMIN_EMAIL=admin@example.com
```

### Install & Run

```bash
npm install
npm run dev       # Development server with HMR
npm run build     # Production build
npm run preview   # Preview production build
npm test          # Run test suite (Vitest)
npm run lint      # ESLint
```

## Project Structure

```
IronLogic2.7.26/
├── src/
│   ├── analytics/          # Sport-specific analytics modules
│   │   └── olympicWeightlifting.js
│   ├── assets/             # Static images (logo, hero, etc.)
│   ├── components/         # Reusable UI components
│   │   ├── DMAIC/          # DMAIC-related components
│   │   ├── ILM/            # ILM-related components
│   │   ├── Layout.jsx      # App shell with Navbar + Outlet
│   │   ├── Navbar.jsx      # Desktop nav + mobile bottom tabs
│   │   ├── TimerWidget.jsx # Floating timer panel
│   │   ├── ErrorBoundary.jsx
│   │   └── ...
│   ├── config/             # App configuration
│   │   ├── constants.js    # SUPER_ADMIN_EMAIL
│   │   └── firebaseConfig.js # Firebase init
│   ├── context/            # React context providers
│   │   ├── AuthContext.jsx      # Auth state + methods
│   │   ├── DataContext.jsx      # Central data + Firestore subs
│   │   ├── SettingsContext.jsx  # Unit preferences
│   │   ├── TimerContext.jsx     # Timer state machine
│   │   └── ToastContext.jsx     # Toast notification system
│   ├── data/               # Static data catalogs
│   │   ├── exercises.js         # Exercise database
│   │   ├── olympicWeightlifting.js # Oly movement catalog
│   │   ├── mobilityExercises.js
│   │   ├── mobilityPaths.js
│   │   ├── qualifyingTotals.js
│   │   └── advancedTemplates.js
│   ├── hooks/              # Custom React hooks
│   │   └── useILM.js
│   ├── pages/              # Route-level page components (19)
│   │   ├── Home.jsx, WorkoutLog.jsx, Progress.jsx, ...
│   │   └── CoachDashboard.jsx, AdaptiveCoach.jsx, ...
│   ├── services/           # Business logic & data access
│   │   ├── firestoreService.js  # All Firestore CRUD (1107 lines)
│   │   ├── DMAICService.js      # DMAIC decision engine
│   │   ├── GeminiService.js     # Gemini AI chat wrapper
│   │   ├── SyncService.js       # Offline sync queue
│   │   ├── OlympicWeightliftingEngine.js # Oly engine
│   │   ├── ProgramGenerator.js  # Template program generator
│   │   ├── MetricsService.js    # Metrics calculations
│   │   └── ILMService.js        # ILM logic
│   ├── tests/              # Test files
│   │   └── FinalizationPipeline.test.js
│   └── utils/              # Utility functions
│       ├── calculator.js        # e1RM formulas (Epley)
│       ├── dateUtils.js
│       ├── logger.js
│       ├── errorMessages.js
│       ├── olympicWeightlifting.js
│       ├── programValidation.js
│       └── randomUtils.js
├── ai/                     # AI automation infrastructure
│   ├── agents/
│   ├── logs/
│   ├── memory/
│   ├── prompts/
│   └── reports/
├── config/                 # Automation config
├── docs/                   # Documentation
├── scripts/                # Automation launcher scripts
├── firestore.rules         # Firestore security rules
├── vite.config.js          # Vite + PWA config
└── package.json
```

## Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LandingPage / Home | Public / Auth |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/forgot-password` | ForgotPassword | Public |
| `/reset-password` | ResetPassword | Public |
| `/log` | WorkoutLog | Auth |
| `/olympic-lifting` | WorkoutLog | Auth |
| `/progress` | Progress | Auth |
| `/programs` | Programs | Auth |
| `/profile` | Profile | Auth |
| `/calendar` | CalendarView | Auth |
| `/checkin` | WeeklyCheckIn | Auth + Subscription |
| `/questionnaire` | Questionnaire | Auth |
| `/onboarding` | OnboardingWizard | Auth |
| `/peaking` | CompetitionPeaking | Auth |
| `/coach` | CoachDashboard | Coach/Admin + Subscription |
| `/coach/plan/:athleteId` | ProPlanner | Coach/Admin |
| `/coach/adaptive/:athleteId` | AdaptiveCoach | Coach/Admin |
| `/coach/athlete/:athleteId` | WorkoutLog | Coach/Admin |
| `/calendar/:athleteId` | CalendarView | Coach/Admin |
| `/coach/checkin/:athleteId` | WeeklyCheckIn | Coach/Admin |
| `/admin` | Admin | Admin only |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (host network) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest test suite |
| `npm run lint` | ESLint check |

## Documentation

| Document | Description |
|----------|-------------|
| `docs/ARCHITECTURE.md` | System architecture, data flow, provider hierarchy |
| `docs/API_REFERENCE.md` | Internal API surfaces and interfaces |
| `docs/DEVELOPER_GUIDE.md` | Code conventions, patterns, workflows |
| `docs/IRONLOGIC_MANUSCRIPT.md` | IronLogic Method — DMAIC framework manuscript |
| `docs/AI_CONTEXT.md` | AI agent context for automation |
| `docs/olympic-weightlifting-architecture.md` | Oly lifting schema and engine design |
| `docs/QA_Report.md` | Latest QA audit findings |
| `docs/UX_Report.md` | UX audit and recommendations |
| `docs/Research_Report.md` | Monthly research literature review |
| `docs/IronLogic_Report.md` | DMAIC algorithm audit |
| `CHANGELOG.md` | Version history |
| `RELEASE_NOTES.md` | Release notes for current version |

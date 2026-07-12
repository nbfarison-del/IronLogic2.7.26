# Developer Guide — IronLogic

## Development Environment

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn
- Firebase project with Firestore + Auth enabled
- Google Gemini API key (free tier available)

### Quick Start
```bash
git clone <repo>
cd IronLogic2.7.26
npm install
cp .env.example .env.local   # Fill in your Firebase + Gemini keys
npm run dev                   # → http://localhost:5173
```

## Code Conventions

### JavaScript Style
- **ES Modules** — `import`/`export`, no CommonJS
- **JSX** — `.jsx` extension for React components, `.js` for non-component modules
- **No TypeScript** — Pure JavaScript with JSDoc comments where helpful
- **Semicolons** — Used (consistent with existing code)
- **Quotes** — Single quotes for strings, backticks for template literals
- **Indentation** — 2 spaces (JSX) / 4 spaces (some files)

### Component Patterns
- **Functional components only** — No class components (except `ErrorBoundary`)
- **Hooks** — Use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`)
- **Context** — Every provider file exports both the Provider component and a `useXxx()` hook
- **Lazy loading** — All page components use `React.lazy()` + `Suspense`
- **CSS** — Global CSS via `index.css` (949 lines). No CSS modules, no CSS-in-JS.

### Naming Conventions
| Entity | Convention | Example |
|--------|-----------|---------|
| Files | PascalCase for components, camelCase for services/utils | `WorkoutLog.jsx`, `firestoreService.js` |
| Components | PascalCase | `const OlympicSetLogger = () => {}` |
| Functions | camelCase | `calculateMetrics`, `runDMAICCycle` |
| Constants | UPPER_SNAKE_CASE | `SUPER_ADMIN_EMAIL`, `QUEUE_STORAGE_KEY` |
| Context hooks | `use` + PascalCase | `useAuth()`, `useData()`, `useTimer()` |
| CSS classes | kebab-case | `.nav-brand`, `.bottom-tab-label`, `.status-pill` |

## Working with Context

### Adding State to DataContext
1. Add a `useState` line in `DataProvider`
2. Add a Firestore subscription in the main `useEffect` (if real-time)
3. Add the value to the context object in the return
4. Import `useData()` in consumer components

### Creating a New Context
1. Create file in `src/context/` as `.jsx`
2. Follow the pattern: `createContext` → export hook → Provider component
3. Nest in the correct order in `App.jsx:304-323`

## Service Layer

### firestoreService — Data Access
- Single file (1107 lines) with all Firestore operations
- Re-exports Firebase Firestore functions for convenience
- All functions take `userId` as first parameter
- Errors are caught and logged, then re-thrown for caller handling

### Adding a Firestore Function
1. Add function to `firestoreService.js`
2. Use existing `collection()`, `doc()`, `query()` patterns
3. Export for use by services or UI components

### SyncService — Offline Resilience
- Singleton instance exported as `syncService`
- Queue persisted in `localStorage['ironlogic_sync_queue']`
- Tasks are processed when app detects `navigator.onLine === true`
- Max 5 retries with exponential backoff (1s base)

## Testing

### Test Runner
- **Vitest v4.1.10** — configured in `vite.config.js`
- Run: `npm test` or `vitest`
- Single test file: `src/tests/FinalizationPipeline.test.js`

### Writing Tests
- Place tests in `src/tests/` directory
- Use `import { describe, test, expect, vi, beforeEach } from 'vitest'`
- Mock Firestore with `vi.mock()` (hoisted)
- Mock `localStorage` with `vi.stubGlobal()`

### Test Coverage Status
- **Critical gap**: Only 1 test file, 4 tests
- No component tests, no service tests, no integration tests
- No E2E automation (Playwright/Cypress)

## Build & Deploy

### Vite Configuration
- `vite.config.js` defines plugins, PWA settings
- No code-splitting `manualChunks` configured (recommended for perf)
- No proxy configuration (API calls go directly to Firebase/Gemini)

### PWA
- Service worker auto-updates on new build
- Precache includes 36 entries (~1.5MB)
- Manifest: standalone display, black background

### Hosting
- Designed for Firebase Hosting or Vercel
- Environment variables must be set on hosting platform:
  - `VITE_FIREBASE_*` (7 variables)
  - `VITE_GEMINI_API_KEY`
  - `VITE_SUPER_ADMIN_EMAIL`

### Build Commands
```bash
npm run build      # Production build → dist/
npm run preview    # Preview build locally
npm run lint       # ESLint check
```

## Automation Infrastructure

The `ai/` directory contains local automation agents run via Windows Task Scheduler:

- **Monday 9 AM**: `code_review` — ESLint scan, dead code detection
- **Wednesday 9 AM**: `issue_detection` — Log/report analysis
- **Friday 9 AM**: `cleanup` — Log rotation, memory trim

### Key Rule
Automation never modifies `src/`, `vite.config.js`, or `package.json`. It only writes to `ai/`, `scripts/`, `config/`, `docs/`.

## Database

### Firestore Security Rules
Located in `firestore.rules`. Key testing patterns:
- Always test with `!signedIn()` for unauthenticated access
- Test `isAdminRoleRequest()` for role escalation prevention
- Test coach scoped write collections

### Indexes
Required composite indexes for Olympic weightlifting queries. See `docs/olympic-weightlifting-architecture.md`.

## Known Technical Debt

| Area | Issue | Impact |
|------|-------|--------|
| Test coverage | 1 test file, no CI | Regressions undetected |
| Bundle size | 733KB main chunk, 375KB Progress | Slow initial load |
| Error handling | 65 console.error calls, no Sentry | Production errors invisible |
| console.log | 11 debug logs in production | Privacy risk |
| Memory | Interval/timeout leaks on unmount | App slowdown on long sessions |
| Security | document.write XSS vector | AI content injection risk |
| Accessibility | 7 icon buttons missing aria-label | Screen reader users blocked |
| Navigation | /programs has no nav link | Feature undiscoverable |
| Code duplication | Admin email spread across 5 files | Maintenance hazard |
| CSS | 949-line global file, no modules | Style conflicts on growth |

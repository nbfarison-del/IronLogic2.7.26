# Application Engineer Report

**Date**: 2026-07-12  
**Engineer**: Application Engineer  
**Scope**: Full-stack architecture review — pages, context, services, hooks, components, routing, state management, data flow

---

## 1. Architecture Overview

### Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React (SPA) | 19.2.0 |
| Routing | React Router | 7.13.0 |
| State | React Context + hooks | Built-in |
| Backend | Firebase (Firestore, Auth) | 12.9.0 |
| AI | Gemini (`@google/generative-ai`) | 0.24.1 |
| Build | Vite | 7.2.4 |
| PWA | vite-plugin-pwa | 1.2.0 |
| Charts | Recharts | 3.7.0 |
| Test | Vitest | 4.1.0 |
| Lint | ESLint 9 flat config | 9.39.1 |

### App Shell
```
App.jsx (AuthProvider → DataProvider → SettingsProvider → ToastProvider → TimerProvider → Router → Layout)
```
Five context providers wrap the entire application. The Router renders 23 routes across public, protected, role-gated, and coach-athlete-gated paths.

---

## 2. Routing Architecture

### Route Guard Hierarchy
```
Public routes       (no guard)             — /login, /register, /forgot-password, /reset-password
Authenticated routes (ProtectedRoute)       — /log, /progress, /programs, /profile, /calendar, etc.
Coach/Admin routes   (RoleProtectedRoute)   — /coach, /coach/plan/:athleteId, /coach/adaptive/:athleteId
Admin-only route     (RoleProtectedRoute)   — /admin
Catch-all            (no guard)             — * → NotFound
```

**Three guard components exist:**
1. `ProtectedRoute` — redirects to `/login` if no user
2. `RoleProtectedRoute` — checks user.role against allowed roles
3. `CoachAthleteAccessGuard` — verifies coach-athlete relationship
4. `SubscriptionGuard` — checks subscription status before rendering

**Note**: `/programs` route has no visible nav link in the UI (identified in QA report). Users must know the URL to access program templates.

---

## 3. State Management

### Context Architecture

| Context | Data | Update Pattern | Persistence |
|---------|------|----------------|-------------|
| AuthContext | User object, auth state | login/register/logout | Firebase Auth + Firestore |
| DataContext | 14 collections (workouts, weights, recovery, goals, profile, custom exercises, coaching, planned workouts, notes, mobility, sessions, settings, training maxes) | SyncService → firestoreService | Firestore realtime + offline queue |
| SettingsContext | Unit preference (kg/lbs) | toggleUnit | Firestore |
| TimerContext | Timer mode, duration, phase, active state | start/pause/reset/setType | In-memory only |
| ToastContext | Notification queue | showToast | In-memory only (3s auto-dismiss) |

### Observations
- **No external state library** — consistent use of React Context + hooks, matching the stated principle
- **DataContext is a monolith** — manages 14+ collections in a single provider with a single `useEffect` for Firestore listeners
- **TimerContext** lacks `useMemo` on consumer-facing values, causing all timer consumers to re-render on every tick (QA finding P2)
- **ToastContext** has a known `setTimeout` leak on unmount (QA finding P3)

---

## 4. Service Layer

### Service Dependency Graph
```
Components/Pages
  ↓
firestoreService.js  ←──── SyncService.js (offline queue)
  ↓
Firebase SDK
```

```
GeminiService.js  ←──── DMAICService.js ←── ILMService.js
                           ↓
                        MetricsService.js
```

```
ProgramGenerator.js  — standalone, no service dependencies
OlympicWeightliftingEngine.js  — depends on MetricsService
```

### Service Design Patterns
- **firestoreService.js** — thin CRUD wrapper around Firestore with ~70 exported functions. Re-exports `db`, `doc`, `collection` etc. from Firebase. Mixes query concerns (getX, setX, updateX, deleteX patterns).
- **SyncService.js** — offline queue using `localStorage` with exponential backoff (max 5 retries). Idempotent task IDs. Processes on `online` event.
- **GeminiService.js** — single `sendMessage` function with system prompt injection. Parses AI JSON responses with regex fallback.
- **MetricsService.js** — pure functions, no side effects. Exports 8 calculation functions.

---

## 5. Component Architecture

### Component Hierarchy Patterns
```
Layout
  └── Navbar (7 desktop links, 5 mobile tabs, sync indicator, timer toggle)
  └── Outlet (route-dependent)
       └── Page Component
            └── Widget Components (RecoveryTracker, WeightTracker, GoalTracker, etc.)
            └── Tool Components (ExerciseTools, TimerWidget)
            └── DMAIC Sub-components (Dashboard, InsightsCard, AdjustmentFeed)
```

### Key Component Patterns Found
- **Inline styles** heavily used alongside CSS classes (mixed pattern throughout WorkoutLog, ProPlanner)
- **`useMemo`/`useCallback`** used inconsistently — some heavy computations wrapped, others not
- **Refs** used for input focus management (`weightInputRef.current` pattern in WorkoutLog)
- **Compound components** in DMAIC directory (Dashboard + InsightsCard + AdjustmentFeed)
- **No TypeScript** — all JSX with JSDoc-style comments in some places

---

## 6. Data Flow

### Write Path
```
User Action
  → Page/Component state (useState)
  → firestoreService.setX() / updateX()
  → SyncService.enqueue() (for offline support)
  → Firebase SDK write
  → Firestore realtime listener triggers DataContext update
  → All subscribers re-render
```

### Read Path
```
Page mount
  → DataContext provides data (from Firestore listeners)
  → Component filters/maps data locally
  → Re-renders on data change
```

### AI Flow
```
User message
  → GeminiService.sendMessage()
  → Gemini API
  → Parse response (JSON + regex fallback)
  → Display in chat UI (AIAgentTab) or extract program JSON (OnboardingWizard, CompetitionPeaking)
```

---

## 7. Findings & Recommendations

### Architecture

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| A1 | DataContext monolithic — 14 collections in one provider | Medium | Split into domain contexts (WorkoutDataContext, ProfileDataContext, etc.) or use a lightweight store |
| A2 | Route guard logic duplicated across guards | Low | Extract `useAuthGate` hook — `{ requireAuth, allowedRoles, requireCoachAccess }` |
| A3 | `/programs` route unreachable from nav | High (UX) | Add nav link or redirect from an existing page |
| A4 | Olympic lifting routes (`/olympic-lifting`) reuse WorkoutLog without parameter differentiation | Low | Consider a separate component if Olympic-specific features diverge further |

### State Management

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| S1 | DataContext re-fetches all collections on any auth change | High | Add cache-with-staleness check before re-fetching |
| S2 | TimerContext missing useMemo on consumer values | High | Wrap returned object in useMemo (QA P2) |
| S3 | Toast setTimeout leak on unmount | Critical | Store timeout IDs in ref and clear on cleanup (QA P3) |
| S4 | SettingsContext only holds unit — worthwhile to extend for all user preferences | Low | Consolidate theme, locale, and other display prefs |

### Service Layer

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| L1 | firestoreService exports individual CRUD functions per collection — ~70 exports | Medium | Group by domain (e.g., `WorkoutService.getByDate`, `ProfileService.update`) |
| L2 | SyncService backoff is fixed (exponential but no jitter) | Low | Add random jitter to prevent thundering herd on reconnect |
| L3 | GeminiService JSON parsing has no schema validation | Medium | Validate AI output against a Zod schema before use |
| L4 | MetricsService is pure but tightly coupled — all exports are standalone | Low | Consider a class-based `MetricsCalculator` for testability |

### Component Patterns

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| C1 | Inline styles mixed with CSS classes — no consistent approach | Medium | Adopt CSS modules or CSS-in-JS convention; audit and migrate incrementally |
| C2 | No loading skeletons anywhere — all async states show either spinner or nothing | Medium | Add skeleton components for each page layout |
| C3 | Empty states inconsistent — some pages show "No data", others show blank | Medium | Create a reusable `EmptyState` component |
| C4 | Error boundaries only at app level — no per-page or per-widget fallbacks | Medium | Add granular ErrorBoundary wrappers for coach dashboard, calendar, progress |

### Testing

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| T1 | Only 1 test file (4 tests) for 72+ source files | Critical | Prioritize test coverage for services (MetricsService, SyncService) and critical UI flows |
| T2 | No component tests exist | High | Add Vitest + React Testing Library for key components (Navbar, WorkoutLog set rows) |
| T3 | No integration tests for Firestore read/write | Medium | Add integration tests with Firestore emulator |

---

## 8. Summary

The application follows a consistent **React Context + Service Layer** architecture with offline-first data flow. The most impactful improvements are:

1. **Fix critical/known bugs** — Toast timeout leak (S3), TimerContext useMemo (S2)
2. **Split DataContext** — reduce unnecessary re-renders from monolithic state (A1)
3. **Add test coverage** — 1 test file for 72+ source files is a critical gap (T1)
4. **Standardize component patterns** — CSS convention, loading states, empty states (C1-C4)
5. **Add nav link for /programs** — unreachable from UI (A3)

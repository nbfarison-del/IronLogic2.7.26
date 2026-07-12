# IronLogic Architecture

## System Overview

IronLogic is a single-page application (SPA) with a Firebase backend. The frontend is a React 19 app built with Vite 7. Data is stored in Firestore with local persistence for offline access. AI features use Google Gemini 1.5 Flash for recommendation generation.

```
Browser (PWA)
    │
    ├── React 19 SPA ──────── Vite 7 ────────► Firebase Hosting
    │       │                                        │
    │       ├── Firestore (real-time listeners) ─────► Firestore Database
    │       ├── Firebase Auth ───────────────────────► Firebase Auth
    │       ├── Google Gemini API ───────────────────► Gemini 1.5 Flash
    │       └── Service Worker (vite-plugin-pwa) ────► Cache assets
    │
    └── localStorage ──── Sync Queue (offline tasks)
```

## Provider Hierarchy

The app wraps content in providers that must be nested in dependency order:

```
BrowserRouter
  └── ErrorBoundary (top-level catch)
      └── AuthProvider              ← Depends on: nothing
          └── ToastProvider          ← Depends on: nothing
              └── DataProvider       ← Depends on: AuthContext, ToastContext
                  └── SettingsProvider ← Depends on: AuthContext, DataContext, ToastContext
                      └── TimerProvider ← Depends on: nothing
                          └── AppContent (Routes + Layout)
```

### Provider Responsibilities

| Provider | State | Exposes | Dependencies |
|----------|-------|---------|--------------|
| `AuthProvider` | `user`, `loading` | `login()`, `register()`, `logout()`, `resetPassword()` | Firebase Auth |
| `ToastProvider` | `toasts[]` | `showToast(message, type)` | None |
| `DataProvider` | `workouts`, `weights`, `recovery`, `goals`, `profile`, `coaching`, `plannedWorkouts`, `mobilityLogs`, `sessions`, `syncStatus`, `pendingSyncCount` | Subscriptions to 11+ Firestore collections | AuthContext, ToastContext |
| `SettingsProvider` | `unit` | `toggleUnit()` | AuthContext, DataContext, ToastContext |
| `TimerProvider` | `isOpen`, `type`, `duration`, `isActive`, `timePassed`, `phase`, `currentRound` | `start()`, `pause()`, `reset()`, `toggleTimer()`, `formatTime()` | None |

## Routing Architecture

Routes are defined in `App.jsx` under `AppContent`. Lazy-loaded pages use `React.lazy()` + `Suspense`. Route guards compose:

```
Route definitions in App.jsx:

Public routes:  /login, /register, /forgot-password, /reset-password
Hybrid route:   / (LandingPage if !user, Home if user)
Protected:      /log, /progress, /programs, /profile, /calendar, /olympic-lifting,
                /questionnaire, /onboarding, /peaking
Subscription:   /checkin
Coach routes:   /coach, /coach/plan/:athleteId, /coach/adaptive/:athleteId,
                /coach/athlete/:athleteId, /calendar/:athleteId, /coach/checkin/:athleteId
Admin:          /admin
Catch-all:      * (NotFound)
```

### Route Guards

| Guard | Purpose | Logic |
|-------|---------|-------|
| `ProtectedRoute` | Requires auth | If `loading` → spinner; if `!user` → redirect `/`; else → children |
| `RoleProtectedRoute` | Requires role | Checks `allowedRoles.includes(user.role)`. Extra check: admin route double-confirms `SUPER_ADMIN_EMAIL` |
| `SubscriptionGuard` | Requires active sub | Checks `subscriptionStatus` (beta/active), `role === 'admin'`, or `trialExpiresAt > now` |
| `CoachAthleteAccessGuard` | Coach-athlete relation | Fetches athlete profile, checks `coach_id` / `coachId` matches current user. Admins bypass. |

## Data Flow

### Firestore Collections

```
/registered_users/{userId}              — Public signup tracking
/program_templates/{templateId}         — Shared program templates
/users/{userId}/profile/data            — User profile, role, subscription
/users/{userId}/workouts/{workoutId}    — Individual set entries
/users/{userId}/sessions/{YYYY-MM-DD}   — Finalized session metadata
/users/{userId}/recovery/{date}         — Recovery/sleep/soreness logs
/users/{userId}/weights/{date}          — Body weight logs
/users/{userId}/goals/{goalId}          — Goal tracking
/users/{userId}/mobilityLogs/{date}     — Mobility session logs
/users/{userId}/athletePrograms/...     — Coach-assigned programs
/users/{userId}/coaching/...            — Coach notes/feedback
/users/{userId}/programCompliance/...   — Program adherence tracking
/users/{userId}/ilm/{logId}             — ILM logs
/users/{userId}/liftVideos/{videoId}    — Video analysis (future)
```

### Offline Sync Queue

```
localStorage['ironlogic_sync_queue']
  └── Array<Task>
      ├── id: string (idempotency key)
      ├── type: 'finalize_session' | 'add_set'
      ├── payload: object
      ├── attempts: number
      └── lastError: string | null

SyncService:
  enqueue() → saveQueue() → [offline] → processQueue() → [online] → execute()
     ↑                                                        ↓
     └──── retry with backoff (max 5) ←── on failure ────────┘
```

### Auth Flow

```
Sign Up:  createUserWithEmailAndPassword → recordUserSignup() → set role='athlete'
Login:    signInWithEmailAndPassword → onAuthStateChanged → getUserProfile() → setUser()
Logout:   signOut() → setUser(null) → navigate('/')
```

## DMAIC Cycle

The DMAIC decision engine runs as a serverless function in the browser:

```
runDMAICCycle(athleteId)
  │
  ├── Define:  createDefinePhase(profile)
  │            Sets goals, constraints, priorities from profile
  │
  ├── Measure: calculateMetrics(athleteId)
  │            Gathers workouts, recovery, body weight from Firestore
  │            Computes acute/chronic volume, ACWR, fatigue, adherence, e1RM, recovery
  │
  ├── Analyze: createScoreBreakdown(metrics)
  │            6 factors → adaptation score [0-100]
  │            Classification: Adaptive ≥65 | Functional Overreaching 50-64
  │                            Watch Status 45-49 | Maladapted <45
  │            Confidence score [35-95] with data-quality penalties
  │
  ├── Improve: generatePrescription(athleteId, define, metrics, analysis)
  │            Gemini AI generates recommendation text
  │            Derived adjustments based on score factors
  │
  └── Control: createControlPlan(baseline)
               Saves DMAIC snapshot → Firestore
               Sets monitoring frequency, triggers, success criteria
```

## Firestore Security Rules

Rules are in `firestore.rules` (v2). Key patterns:

| Pattern | Rule |
|---------|------|
| User data access | Owner + assigned coach + admin can **read**. Owner + admin can **write**. |
| Role escalation | Any non-admin write to `role` field is denied. |
| Coach write scope | Coaches can write to `athletePrograms`, `coaching`, `programCompliance`, `workouts/*/comments`, `ilm`. |
| Templates | Read: public + own + admin. Create: any auth user. Update/delete: author + admin. |

## PWA Architecture

Configured in `vite.config.js` via `vite-plugin-pwa`:

- **registerType**: `'autoUpdate'` — service worker updates silently on new deployment
- **manifest**: name "IronLogic HQ", standalone display, black theme
- **precached**: 36 entries, 1,565 KB
- **icons**: 512x512 (standard), 192x192 (maskable)

# API Reference — IronLogic Internal Interfaces

## Context APIs

### AuthContext (`useAuth()`)

| Method/Property | Returns | Description |
|----------------|---------|-------------|
| `user` | `object \| null` | `{ id, email, name, role, coachId, subscriptionStatus }` |
| `loading` | `boolean` | True while auth state is resolving |
| `login(email, password)` | `Promise<boolean>` | Firebase email/password sign-in |
| `register(email, password)` | `Promise<UserCredential>` | Create account |
| `logout()` | `Promise<void>` | Sign out, navigate to `/` |
| `resetPassword(email)` | `Promise<void>` | Send password reset email |

### ToastContext (`useToast()`)

| Method/Property | Returns | Description |
|----------------|---------|-------------|
| `showToast(message, type)` | `void` | Show toast. Types: `'info'`, `'success'`, `'error'`. Auto-dismiss after 3s. |

### DataContext (`useData()`)

| Property | Type | Description |
|----------|------|-------------|
| `workouts` | `Array` | All logged workout sets |
| `weights` | `Array` | Body weight logs |
| `recovery` | `Array` | Recovery scores per date |
| `goals` | `Array` | User goals |
| `profile` | `object \| null` | User profile from Firestore |
| `customExercises` | `Array` | User-created exercises |
| `coaching` | `object` | `{ program, questionnaire }` |
| `plannedWorkouts` | `Array` | Programmed workout plans |
| `notesHistory` | `Array` | Coach notes |
| `mobilityLogs` | `Array` | Mobility session logs |
| `sessions` | `Array` | Finalized session summaries |
| `syncStatus` | `'online' \| 'offline'` | Current connectivity |
| `syncTimestamps` | `object` | Per-collection last sync times |
| `syncError` | `string \| null` | Last sync error message |
| `pendingSyncCount` | `number` | Tasks awaiting sync |
| `isLoading` | `boolean` | True during initial data load |

### SettingsContext (`useSettings()`)

| Method/Property | Returns | Description |
|----------------|---------|-------------|
| `unit` | `'kg' \| 'lbs'` | Current weight unit |
| `toggleUnit()` | `Promise<void>` | Toggle kg ↔ lbs, persist to Firestore |

### TimerContext (`useTimer()`)

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Timer panel visibility |
| `type` | `'stopwatch' \| 'countdown' \| 'tabata' \| 'emom'` | Timer mode |
| `duration` | `number` | Countdown duration in seconds |
| `focusTime` | `number` | Tabata work duration |
| `restTime` | `number` | Tabata rest duration |
| `rounds` | `number` | Tabata/EMOM round count |
| `emomInterval` | `number` | EMOM interval in seconds |
| `isActive` | `boolean` | Timer running state |
| `timePassed` | `number` | Total elapsed seconds |
| `phaseTimePassed` | `number` | Current phase elapsed seconds |
| `currentRound` | `number` | Current round number |
| `phase` | `'focus' \| 'rest' \| 'complete'` | Tabata phase |
| `start()` | `void` | Start timer |
| `pause()` | `void` | Pause timer |
| `reset()` | `void` | Reset to initial state |
| `toggleTimer()` | `void` | Toggle panel open/closed |
| `formatTime(secs)` | `string` | Format as `HH:MM:SS` or `MM:SS` |

## Service APIs

### firestoreService

All Firestore CRUD operations. Re-exports Firebase Firestore functions:

**Exports**: `collection`, `doc`, `getDoc`, `getDocs`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `query`, `where`, `orderBy`, `limit`, `onSnapshot`, `db`

**User Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `recordUserSignup(userId, email)` | `Promise<void>` | Create user in `registered_users` + `users/{id}/profile/data` |
| `getAllRegisteredUsers()` | `Promise<Array>` | All registered users (admin) |
| `getUserProfile(userId)` | `Promise<object>` | Profile from `users/{id}/profile/data` |
| `updateUserProfile(userId, data)` | `Promise<void>` | Merge profile fields |
| `updateUserRole(userId, role)` | `Promise<void>` | Update role (admin only) |
| `getRegisteredUserByEmail(email)` | `Promise<object \| null>` | Find user by email |

**Athlete Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `getAthletesByCoachId(coachId)` | `Promise<Array>` | Athletes assigned to coach |
| `assignCoach(userId, coachId)` | `Promise<void>` | Set `coach_id` on athlete profile |
| `getUserSettings(userId)` | `Promise<object>` | Settings document |
| `updateSettings(userId, settings)` | `Promise<void>` | Update settings document |

**Workout & Metrics Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `getWorkouts(userId, filters)` | `Promise<Array>` | Workout sets with optional date/exercise filters |
| `getWorkoutsByDateRange(userId, start, end)` | `Promise<Array>` | Workouts in date range |
| `getWorkoutsForExercise(userId, exerciseId)` | `Promise<Array>` | Historical sets for one exercise |
| `addWorkout(userId, workout)` | `Promise<string>` | Add single set |
| `addWorkoutsBatch(userId, workouts)` | `Promise<void>` | Batch add multiple sets |
| `getRecoveryHistory(userId)` | `Promise<Array>` | All recovery logs |
| `getRecoveryByDate(userId, date)` | `Promise<object \| null>` | Recovery for specific date |
| `saveRecovery(userId, date, data)` | `Promise<void>` | Save recovery log |
| `getBodyWeightHistory(userId)` | `Promise<Array>` | All body weight entries |

**Session Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `finalizeSession(userId, date, data)` | `Promise<void>` | Finalize training session with metadata |
| `getFinalizedSessions(userId)` | `Promise<Array>` | All finalized sessions |
| `getAthleteSessions(athleteId)` | `Promise<Array>` | Coach-facing session history |

**Program Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `getPlannedWorkouts(userId)` | `Promise<Array>` | Planned/programmed workouts |
| `saveProgram(userId, program)` | `Promise<void>` | Save athlete program |
| `getProgramTemplates()` | `Promise<Array>` | All visible templates |
| `saveProgramTemplate(template)` | `Promise<string>` | Create new template |

**Coach Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `getCoachingData(userId)` | `Promise<Array>` | Coach notes for athlete |
| `saveCoachingNote(userId, note)` | `Promise<void>` | Add coaching note |
| `getAthleteProgramData(athleteId)` | `Promise<object>` | Athlete's current program |
| `saveAthleteProgram(athleteId, program)` | `Promise<void>` | Update athlete program |

**Goal & Mobility Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `getGoals(userId)` | `Promise<Array>` | All goals |
| `saveGoal(userId, goal)` | `Promise<void>` | Create/update goal |
| `getMobilityLogs(userId)` | `Promise<Array>` | Mobility session logs |
| `saveMobilityLog(userId, date, data)` | `Promise<void>` | Log mobility session |

**Admin Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `getAllUsers()` | `Promise<Array>` | All user profiles |
| `getUserByEmail(email)` | `Promise<object \| null>` | User lookup by email |
| `getCoachList()` | `Promise<Array>` | All users with `role === 'coach'` |

### SyncService

| Method | Returns | Description |
|--------|---------|-------------|
| `enqueue(type, payload, taskId?)` | `string` | Add task to queue (idempotent) |
| `processQueue()` | `Promise<void>` | Process all queued tasks |
| `getQueueStatus()` | `{ pendingCount, lastProcessed }` | Queue diagnostics |

### GeminiService

| Method | Returns | Description |
|--------|---------|-------------|
| `chatWithAI(messages)` | `Promise<string>` | Send chat to Gemini, return text response |
| `generateProgramFromAI(data)` | `Promise<object>` | Generate structured program from questionnaire |

### DMAICService

| Method | Returns | Description |
|--------|---------|-------------|
| `runDMAICCycle(athleteId)` | `Promise<object>` | Execute full DMAIC cycle |
| `getDMAICRecommendations(athleteId)` | `Promise<object>` | Get latest recommendations |

### OlympicWeightliftingEngine

| Method | Returns | Description |
|--------|---------|-------------|
| `analyzeWeakPoints(athleteId)` | `Promise<Array>` | Classify weak points from historical data |
| `getPeriodizationPhase(meetDate)` | `string` | Determine current phase from meet date |
| `getRecoveryAdjustment(athleteId)` | `Promise<object>` | Volume/intensity multipliers |
| `generateOlympicSession(athleteId)` | `Promise<object>` | Generate session structure |

### MetricsService

| Method | Returns | Description |
|--------|---------|-------------|
| `calculateMetrics(athleteId)` | `Promise<object>` | Full metrics calculation |
| `calculateAdherence(planned, actual)` | `object` | Adherence percentage |

## Component Props

### Layout
- No props. Uses `<Outlet />` for nested routes. Conditionally renders `<Navbar />`.

### Navbar
- No props. Reads auth, data, and timer contexts.

### TimerWidget
- No props. Reads TimerContext.

### ErrorBoundary
- Props: `children` — wraps components. Catches render errors.

### OlympicSetLogger
- Props: `exerciseId`, `exerciseName`, `coachingSettings`, `onAddSet`

### AIAgentTab / IronLogicTab / MobilityTab
- Tab components rendered in Home dashboard.
- Props vary by context (read from DataContext/AuthContext).

## Route Parameters

| Route Pattern | Param | Description |
|---------------|-------|-------------|
| `/coach/plan/:athleteId` | `athleteId` | Athlete ID for program planning |
| `/coach/adaptive/:athleteId` | `athleteId` | Athlete ID for adaptive coaching |
| `/coach/athlete/:athleteId` | `athleteId` | Athlete workout log |
| `/calendar/:athleteId` | `athleteId` | Athlete calendar |
| `/coach/checkin/:athleteId` | `athleteId` | Athlete weekly check-in |

## Constants

| Export | Value | Description |
|--------|-------|-------------|
| `SUPER_ADMIN_EMAIL` | Env var or `'nbfarison@gmail.com'` | Admin email override |

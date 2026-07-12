# QA Report — July 2026

**Auditor**: QA Engineer  
**Date**: 2026-07-12  
**Scope**: Full-stack audit of IronLogic fitness application  
**Methods**: Static code analysis, test execution, build analysis, lint audit, dependency analysis

---

## 1. Test Suite Results

### Unit Tests
| Test File | Status | Tests | Duration |
|-----------|--------|-------|----------|
| `src/tests/FinalizationPipeline.test.js` | **PASS** | 4/4 | 9ms |

### Integration Tests
| Framework | Status | Files | Notes |
|-----------|--------|-------|-------|
| Vitest | **NONE FOUND** | 0 | No integration tests exist in the repository |
| Playwright | **NONE FOUND** | 0 | No Playwright config or spec files |
| Cypress | **NONE FOUND** | 0 | No Cypress config or spec files |

### Test Coverage Gaps
| Missing Coverage | Impact |
|-----------------|--------|
| No component tests | Every React component is untested |
| No service tests | `DMAICService.js`, `MetricsService.js`, `firestoreService.js`, `GeminiService.js`, `SyncService.js`, `ILMService.js` are all untested |
| No hook tests | `useILM.js` and any other custom hooks are untested |
| No context tests | All 5 context providers are untested |
| No E2E tests | No UI automation exists |
| No API/integration tests | Firestore and Gemini interactions are untested |
| Only 1 test file exists | `FinalizationPipeline.test.js` covers a single happy path |

**Risk**: **Critical** — single test file provides near-zero coverage. Any code change can break any feature without detection.

---

## 2. Lint Results

| Metric | Value |
|--------|-------|
| Errors | **0** |
| Warnings | **10** |
| Files scanned | 72 |
| Fixable warnings | 1 |

### Warning Details (all pre-existing)
| File | Line | Warning |
|------|------|---------|
| `AISuggestionModal.jsx` | 20 | Missing `handleAnalyze` dep |
| `TimerWidget.jsx` | 56 | Missing `setPhaseTimePassed` dep |
| `DataContext.jsx` | 180 | Missing `showToast` dep |
| `CalendarView.jsx` | 102 | Missing `showToast` dep |
| `CalendarView.jsx` | 122 | Unused eslint-disable directive |
| `CoachDashboard.jsx` | 22 | Missing `fetchAthletes` dep |
| `ProPlanner.jsx` | 43 | Missing `loadInitialData` dep |
| `Programs.jsx` | 37 | Missing `loadTemplates` dep |
| `WorkoutLog.jsx` | 114 | Missing `showToast` dep |
| `WorkoutLog.jsx` | 340 | Missing `loadPlannedExercise`, `selectedExerciseId` deps |

**Assessment**: All are `react-hooks/exhaustive-deps` warnings. They suppress legitimate lint rules rather than fixing the underlying stale-closure risk. 9/10 are missing function dependencies that should be wrapped in `useCallback` or included in dep arrays.

---

## 3. Build & Bundle Analysis

### Build Statistics
| Metric | Value |
|--------|-------|
| Build status | **SUCCESS** |
| Modules transformed | 925 |
| Build time | 7.57s |
| Total bundle size | **4,230 KB** (42 files) |
| Service worker precache | 36 entries, 1,565 KB |

### Largest Chunks
| Chunk | Raw Size | Gzipped | Notes |
|-------|----------|---------|-------|
| `index.js` (main) | **733 KB** | 231 KB | ⚠️ Exceeds 500KB warning; contains all core libs |
| `Progress.js` | **375 KB** | 113 KB | ⚠️ Likely includes full recharts lib |
| `WeeklyCheckIn.js` | **125 KB** | 40 KB | |
| `Home.js` | **74 KB** | 20 KB | |
| `WorkoutLog.js` | **37 KB** | 11 KB | |
| `GeminiService.js` | **25 KB** | 9 KB | |
| `DMAICService.js` | **15 KB** | 6 KB | |

### Build Warnings
| Warning | Severity | Recommendation |
|---------|----------|---------------|
| `index.js` > 500KB | **HIGH** | Code-split large dependencies. Move recharts to dynamic import. Consider manual chunks for firebase. |
| `firestore.js` dual import (static + dynamic) | **MEDIUM** | Decide: either always static or always dynamic. Mixed defeats code-splitting. |
| `firestoreService.js` dual import | **MEDIUM** | Same issue — imported statically in 20+ files AND dynamically in App.jsx/AuthContext.jsx |
| `caniuse-lite` was 6 months old | **LOW** | Now updated |

---

## 4. Security Findings

### Critical (Fix Immediately)

| # | Finding | File | Detail |
|---|---------|------|--------|
| S1 | **XSS via `document.write()`** | `Steps.jsx:114` | AI-generated content (`detailedRecommendation`) is injected into a new window via `document.write()` with only newline escaping. AI response could contain `<script>` tags. Use `textContent` assignment instead. |
| S2 | **Admin email hardcoded in 5 files** | Multiple | `nbfarison@gmail.com` appears in `constants.js`, `Admin.jsx`, `CalendarView.jsx`, `ProPlanner.jsx`, `ProgramPlanner.jsx`. 4 of 5 repeat the definition instead of importing from `constants.js`. Change admin email → update 5 files. |

### High

| # | Finding | File | Detail |
|---|---------|------|--------|
| S3 | **program_templates open create** | `firestore.rules:71` | Any signed-in user can create templates with no author validation (`allow create: if signedIn()`). Malicious user can flood the collection. |
| S4 | **Broad coach read access on subcollections** | `firestore.rules:43` | Coach can read ALL subcollections under `/users/{userId}/{document=**}`. No per-subcollection read scoping. |

### Medium

| # | Finding | File | Detail |
|---|---------|------|--------|
| S5 | **No Content-Security-Policy** | `index.html` | No CSP meta tag. Relies entirely on server headers which may not be configured. |
| S6 | **Sensitive data in console.log** | Multiple | User emails, auth responses, and API data logged to console. See §6. |
| S7 | **Admin email in source code** | `constants.js:1` | Hardcoded fallback value means the email is committed to Git. If repo is public, this is a phishing vector. |

---

## 5. Memory & Performance

### Critical

| # | Finding | File | Detail |
|---|---------|------|--------|
| P1 | **DataContext interval leak on logout** | `DataContext.jsx:56-80` | `pendingInterval` (setInterval 2s) is never cleared when `user` becomes null due to early return. Interval runs forever after logout, calling `setPendingSyncCount` on unmounted path. |

### High

| # | Finding | File | Detail |
|---|---------|------|--------|
| P2 | **TimerContext no useMemo** | `TimerContext.jsx:80-91` | Context value recreated every render; all consumers re-render unnecessarily. |
| P3 | **Toast timeout leak on unmount** | `ToastContext.jsx:14-16` | `setTimeout` IDs not tracked or cleared; fires `setToasts` on unmounted component. |

### Medium

| # | Finding | File | Detail |
|---|---------|------|--------|
| P4 | **11 simultaneous Firestore listeners** | `DataContext.jsx:103-161` | Every subscription starts on login. Most pages don't need all collections. Lazy-loading would reduce startup time and Firestore costs. |
| P5 | **733KB main bundle** | Build output | Firebase, react-router, recharts, and all shared code in one chunk. Use `manualChunks` to split by vendor. |
| P6 | **375KB Progress chunk** | Build output | Recharts likely bundled into this page chunk. Consider lazy-loading charting library. |

---

## 6. Console Logging in Production

### Summary Stats
| Type | Count | Files |
|------|-------|-------|
| `console.error` | **65** | 30 files |
| `console.warn` | 3 | 3 files |
| `console.log` | **11** | 6 files |

### `console.log` Calls (Debug Leftovers)
| File | Line | Content | Risk |
|------|------|---------|------|
| `AuthContext.jsx` | 104 | `"Firebase Auth: Requesting password reset"` + user email | **MEDIUM** — leaks email |
| `AuthContext.jsx` | 110 | `"Firebase Auth: Password reset email response"` + response | **MEDIUM** — leaks API response |
| `Admin.jsx` | 110 | `"coaches list:"` + emails | **MEDIUM** — leaks user emails |
| `ForgotPassword.jsx` | 22 | `"submitting request for:"` + email | **MEDIUM** — leaks email |
| `ForgotPassword.jsx` | 24 | `"backend response:"` + response | **LOW** |
| `ResetPassword.jsx` | 35 | `"valid reset code for:"` + email | **MEDIUM** — leaks email |
| `ResetPassword.jsx` | 77 | `"confirm reset response:"` + response | **LOW** |
| `Programs.jsx` | 77 | `"Template import response:"` + result | **LOW** |
| `Programs.jsx` | 219 | `"Previewing:"` + template name (inside onClick) | **LOW** |
| `logger.js` | 32 | Centralized logger writes everything to `console.log` | **LOW** — design decision |

### `console.error` Pattern
All 65 calls use `console.error()` directly rather than a centralized error reporting service (Sentry, LogRocket, etc.). This means:
- Production errors are invisible to developers
- No error aggregation or alerting
- No stack trace capture in production

---

## 7. Accessibility

### Critical
| # | Issue | File | Detail |
|---|-------|------|--------|
| A1 | Timer close button: `&times;` only | `TimerWidget.jsx:109` | No `aria-label` on close button |
| A2 | Delete goal button: `&times;` only | `GoalTracker.jsx:190` | No `aria-label` on delete button |

### High
| # | Issue | File | Detail |
|---|-------|------|--------|
| A3 | Remove exercise button: `✕` only | `ProgramPlanner.jsx:342` | No `aria-label="Remove exercise"` |
| A4 | Remove set button: `✕` only | `ProgramPlanner.jsx:356` | No `aria-label="Remove set"` |
| A5 | Send message: SVG icon only | `AIAgentTab.jsx:355` | 48px circular icon button with no `aria-label` |
| A6 | No `aria-live` on toasts | `ToastContext.jsx:22-37` | Screen readers will not announce toast messages |

### Medium
| # | Issue | File | Detail |
|---|-------|------|--------|
| A7 | Prev/next month: `<` `>` only | `CalendarView.jsx:353,355` | No `aria-label="Previous month"` |
| A8 | No `role="alert"` on toast | `ToastContext.jsx` | Accessibility pattern violation |
| A9 | No `<noscript>` tag | `index.html` | Users without JS see blank white page |

### Good
| Item | Status |
|------|--------|
| All `<img>` tags have `alt` attributes | **PASS** (5/5) |
| `lang="en"` on `<html>` | **PASS** |
| Viewport meta tag | **PASS** |

---

## 8. Navigation & Routing

### Missing Navigation Links (Routes With No Nav Discovery)
| Route | Component | Severity | Notes |
|-------|-----------|----------|-------|
| `/programs` | Programs | **HIGH** | No nav link exists. Only reachable via direct URL. Users cannot discover this page. |
| `/questionnaire` | Questionnaire | MEDIUM | No nav link. Only reachable from Home.jsx contextual link. |
| `/onboarding` | OnboardingWizard | MEDIUM | No nav link. Only reachable conditionally from Home. |
| `/peaking` | CompetitionPeaking | MEDIUM | No nav link. Only reachable from CalendarView. |
| `/admin` | Admin | LOW | Intentional — admin-only route. |

### Navbar Routing Bugs
| Bug | File | Severity | Detail |
|-----|------|----------|--------|
| `isActivePath` exact-match | `Navbar.jsx:41` | **MEDIUM** | `location.pathname === path` never matches `/coach/plan/abc123` to `/coach` nav link. Coach sub-routes never highlight. |
| Mobile vs desktop nav mismatch | `Navbar.jsx:8-24` | LOW | Bottom tabs show 5 items (Home, Log, Olympic, Calendar, Analytics). Desktop shows 7 (adds Readiness, Profile). Mobile users cannot discover Readiness or Profile tabs. |

### `/olympic-lifting` Route
| Issue | Detail |
|-------|--------|
| Route at `/olympic-lifting` | Reuses `WorkoutLog` component. Component may not render correctly at this alternate path if it checks `location.pathname`. |

---

## 9. Firestore Security Rules

| Rule | Status | Issue |
|------|--------|-------|
| Role escalation protection | **PASS** | Users cannot write `role` to own profile |
| Coach write scoping | **PASS** | Scoped to 5 subcollections |
| Admin role checks | **PASS** | Proper `isAdminRoleRequest` on writes |
| `program_templates` create | **FAIL** | No author validation on create |
| Coach read access | **FAIL** | Wildcard `{document=**}` reads all subcollections |
| Default deny | **PASS** | Implicit deny for undefined collections |
| `registered_users` self-create | **PASS** | User can create own record (necessary for signup flow) |

---

## 10. Context Provider Analysis

| Provider | Issue | Severity |
|----------|-------|----------|
| `AuthProvider` | `useAuth()` returns undefined if used outside provider (no guard) | LOW |
| `ToastProvider` | `setTimeout` IDs not cleared on unmount | **HIGH** |
| `DataProvider` | `pendingInterval` never cleared when user is null | **CRITICAL** |
| `DataProvider` | 11 simultaneous Firestore listeners at startup | MEDIUM |
| `TimerProvider` | No `useMemo` on context value → all consumers re-render | **HIGH** |
| `SettingsProvider` | `toggleUnit` silently fails when user is null | LOW |

Provider nesting order: `AuthProvider → ToastProvider → DataProvider → SettingsProvider → TimerProvider` — **CORRECT** (matches dependency graph).

---

## 11. Code Quality

### Positive
- Zero `TODO`, `FIXME`, or `HACK` comments found
- Zero `eval()` calls
- Zero broken imports (100+ relative imports verified)
- All `<img>` tags have proper `alt` text
- Consistent error toast pattern in catch blocks
- Good use of lazy-loaded pages (code splitting)

### Negatives
| Issue | Count | Severity |
|-------|-------|----------|
| `console.error` calls (non-Sentry) | **65** | MEDIUM |
| `console.log` in production | **11** | MEDIUM |
| Empty catch blocks (parameterless) | **10** | LOW |
| Hardcoded admin email (duplicate definitions) | **5** | **HIGH** |
| No route constants file | N/A | MEDIUM |
| `document.write` for XSS vector | **1** | **CRITICAL** |
| Magic number 180 (rest timer) | **1** | LOW |
| Hardcoded AI model name (`gemini-1.5-flash`) | **1** | LOW |

---

## 12. Summary Matrix

| Category | Critical | High | Medium | Low | Info |
|----------|----------|------|--------|-----|------|
| Security | 2 | 2 | 3 | — | — |
| Performance/Memory | 1 | 2 | 3 | — | — |
| Accessibility | — | 2 | 4 | 3 | — |
| Navigation | — | 1 | 2 | 1 | — |
| Console Leaks | — | — | 6 | 5 | — |
| Code Quality | 1 | 1 | 2 | 2 | — |
| Test Coverage | — | — | — | — | 1 (only 1 test file) |
| Firestore Rules | — | 2 | — | 2 | — |
| Context Providers | 1 | 2 | 2 | 3 | — |
| **Totals** | **5** | **12** | **22** | **16** | **1** |

---

## 13. Top Priority Fixes

### Fix Immediately (Critical)

| Priority | Finding | Category | Effort | Status |
|----------|---------|----------|--------|--------|
| 1 | `document.write()` XSS in Steps.jsx:114 | **Security** | 15 min | ✅ **RESOLVED** |
| 2 | DataContext interval leak on logout | **Memory** | 10 min | ✅ **RESOLVED** |
| 3 | Hardcoded admin email — consolidate into constants.js import | **Security** | 20 min |
| 4 | Toast timeout leak on unmount | **Memory** | 10 min |
| 5 | TimerContext add useMemo | **Perf** | 5 min |

### Fix This Week (High)

| Priority | Finding | Category | Effort |
|----------|---------|----------|--------|
| 6 | Add `aria-label` to 7 icon-only buttons | **A11y** | 15 min |
| 7 | `/programs` route needs nav link | **UX** | 30 min |
| 8 | `isActivePath` exact-match → `startsWith` | **UX** | 5 min |
| 9 | Add `aria-live="polite"` to ToastContainer | **A11y** | 5 min |
| 10 | Remove 11 `console.log` calls from production code | **Privacy** | 10 min |

### Plan For Sprint (Medium)

| Priority | Finding | Category | Effort |
|----------|---------|----------|--------|
| 11 | Add test coverage (start with DMAICService) | **Quality** | 2-3 days |
| 12 | Split main bundle with `manualChunks` | **Perf** | 1 day |
| 13 | Lazy-load Firestore subscriptions per page | **Perf** | 1 day |
| 14 | Add Content-Security-Policy | **Security** | 2 hours |
| 15 | Create route constants file | **Arch** | 1 hour |
| 16 | Add `<noscript>` tag to index.html | **UX** | 5 min |
| 17 | Add SEO/social meta tags | **SEO** | 30 min |
| 18 | `program_templates` create-author validation | **Security** | 30 min |
| 19 | Scoped coach read rules per subcollection | **Security** | 1 hour |

---

## 14. Infrastructure Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No CI/CD pipeline | Every deploy is manual | **High** |
| No automated testing in pipeline | Regressions go undetected | **Critical** |
| No error monitoring (Sentry) | Production errors invisible | **High** |
| No performance monitoring | Bundle regressions invisible | **Medium** |
| No accessibility CI (axe-core) | A11y regressions undetected | **Medium** |
| Browserslist updated | ✅ Resolved during this audit | — |

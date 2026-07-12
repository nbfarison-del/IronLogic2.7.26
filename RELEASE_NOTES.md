# Release Notes — IronLogic 2.7.26

**Release Date**: 2026-07-12  
**Version**: 2.7.26  
**Status**: Development

---

## Overview

IronLogic 2.7.26 delivers the Olympic weightlifting module, DMAIC decision engine, AI-powered coaching recommendations, offline sync reliability, and PWA support. This release establishes the IronLogic Method as a computational framework for individualized exercise prescription.

---

## New Features

### Olympic Weightlifting Module
- Specialized set logger with snatch/C&J variants, percentage-based loading, technical quality scoring
- Weak-point analysis and accessory substitution engine
- Competition phase management (Accumulation → Intensification → Peaking → Taper)
- Recovery-adjusted training based on readiness, sleep, and fatigue
- Video analysis schema for future AI technique analysis

### DMAIC Decision Engine
- Full Define-Measure-Analyze-Improve-Control cycle implementation
- Six-factor adaptation score (Performance, Recovery, Adherence, Fatigue, Readiness, ACWR)
- Classification system: Adaptive / Functional Overreaching / Watch Status / Maladapted
- Confidence scoring with data-quality penalties
- Gemini AI integration for recommendation text generation

### Offline Sync Reliability
- Queue-based sync engine with localStorage persistence
- Idempotent task enqueue (no duplicate session finalizations)
- Retry with exponential backoff (max 5 attempts)
- Online/offline status detection with automatic queue processing

### Coach Features
- Coach dashboard for multi-athlete management
- ProPlanner for program design and assignment
- AdaptiveCoach for AI-assisted coaching views
- Athlete-specific calendar, workout log, and check-in views

### PWA
- Installable with service worker
- Auto-update on new deployment
- 512px and 192px icons
- Offline-capable via Firestore local cache

---

## Technical Highlights

| Metric | Value |
|--------|-------|
| React | 19.2.0 |
| Firebase | 12.9.0 |
| Vite | 7.2.4 |
| Build modules | 925 |
| Build time | 7.57s |
| Bundle size | 4.23 MB (42 assets) |
| Test coverage | 4 tests, 1 file |
| Lint | 0 errors, 10 warnings |
| Languages | JavaScript (JSX), ES Modules |

---

## Upgrade Notes

### Environment Variables
All new deployments require these environment variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase auth |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firestore project |
| `VITE_FIREBASE_STORAGE_BUCKET` | No | Storage (future) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | No | Messaging (future) |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Analytics (future) |
| `VITE_GEMINI_API_KEY` | Yes | AI recommendations |
| `VITE_SUPER_ADMIN_EMAIL` | No | Admin access override (falls back to `nbfarison@gmail.com`) |

### Firestore Indexes
Required composite indexes for Olympic weightlifting:
- `users/{userId}/workouts`: `sport ASC, date DESC`
- `users/{userId}/workouts`: `exerciseId ASC, date DESC`
- `users/{userId}/workouts`: `movementType ASC, date DESC`

### Breaking Changes
- None. All new features are additive. Existing workout documents remain valid.

---

## Known Issues

### Critical
- **XSS vector**: `Steps.jsx:114` uses `document.write()` to inject AI-generated content into a new window. Only newlines are escaped. AI response could contain `<script>` tags. Use `textContent` instead.
- **Memory leak**: `DataContext.jsx:56-80` — `pendingInterval` not cleared when `user` becomes null. Runs forever after logout.
- **Memory leak**: `ToastContext.jsx:14-16` — `setTimeout` IDs not tracked or cleared. Fires on unmounted component.

### High
- 5 files hardcode admin email `nbfarison@gmail.com` instead of importing from `constants.js`
- TimerContext missing `useMemo` — all consumers re-render unnecessarily
- 7 icon-only buttons missing `aria-label`
- `/programs` route has no navbar link — users cannot discover it
- `isActivePath` uses exact match — coach sub-routes never highlight active state
- Toast container missing `aria-live` — screen readers miss notifications
- 11 `console.log` calls in production code

### Medium
- Main bundle 733KB raw (231KB gzipped) — exceeds 500KB warning
- Progress chunk 375KB — likely includes full recharts library
- 65 `console.error` calls — no centralized error monitoring
- 11 simultaneous Firestore listeners on login
- No Content-Security-Policy header or meta tag
- No integration, component, or E2E tests
- 3 images > 500KB each

---

## Documentation Index

| Document | Path |
|----------|------|
| Setup & Overview | `README.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| API Reference | `docs/API_REFERENCE.md` |
| Developer Guide | `docs/DEVELOPER_GUIDE.md` |
| Changelog | `CHANGELOG.md` |
| QA Report | `docs/QA_Report.md` |
| UX Report | `docs/UX_Report.md` |
| Algorithm Audit | `docs/IronLogic_Report.md` |
| Research Review | `docs/Research_Report.md` |
| Olympic Architecture | `docs/olympic-weightlifting-architecture.md` |
| IronLogic Method | `docs/IRONLOGIC_MANUSCRIPT.md` |
| AI Context | `docs/AI_CONTEXT.md` |
| Automation Docs | `docs/README_AUTOMATION.md` |

# IronLogic — Chunk 0 Recon (2026-09-26)

## Repo
- github.com/nbfarison-del/IronLogic2.7.26 — public, cloned to ~/workspace/ironlogic-app
- Latest commit: "Update Progress.jsx" (4f77fff)
- Deploy key added by user is now redundant (SSH blocked in this env; repo is public so HTTPS works)

## Stack
- React 19 + Vite 7 + Firebase/Firestore + React Router 7 + Recharts + vite-plugin-pwa + Vitest
- Client-side SPA, no backend. Deploy targets: Vercel (vercel.json), Firebase hosting (firebase.json)
- AI coach via @google/generative-ai (Gemini)
- Firestore collections: users/{uid}/profile, workouts, goals, bodyWeight, recovery, plannedWorkouts (+ mobility logs via DataContext)

## Secrets scan
Clean — no private keys, no serviceAccountKey, no .env secrets. Safe as a public repo.

## Mobility — already exists (better than expected)
- src/components/MobilityTab.jsx (512 lines) — rendered as a tab on Home (src/pages/Home.jsx)
- src/data/mobilityExercises.js (146 lines) — exercise library
- src/data/mobilityPaths.js (174 lines) — 4 paths, all ~10 min:
  - Traditional (timer, 5×2min passive holds)
  - IronLogic General (reps, Knee Ability Zero: tibialis/patrick/KOT/split squat)
  - IronLogic Jump Training (reps, plyometrics)
  - Maternal Prep (timer, prenatal)
- Already link-style demos (youtubeQuery per exercise — no hosted video, matches user's "link only" call)
- Two session players: TimerSession (countdown) and RepsSession (checklist)
- Logs persisted via DataContext → firestoreService (mobilityLogs); last path in localStorage

## Gaps vs mobility-first vision
1. Mobility is a tab, not the home/hero
2. No prescription engine — user picks path manually; nothing maps day's lifts → mobility
3. No run/cardio paths
4. No streaks (has recent history only)
5. No social sharing
6. Trial/paywall gating still present (LandingPage "Start Your Trial") — user wants free
7. No RTS import
8. No adherence↔performance correlation insights

## Refined chunk plan (file-mapped)
- C1 data model: extend src/data/mobilityPaths.js (run/cardio paths, demoUrl link field); new src/data/mobilityPrescriptions.js rules table
- C2 prescription engine: new src/services/MobilityPrescription.js (plannedWorkouts → prescribed session); wire into MobilityTab
- C3 home flip: src/pages/Home.jsx — mobility default/hero; "Today's prescription" first in MobilityTab
- C4 session player polish: MobilityTab.jsx TimerSession/RepsSession — gym-floor tap targets, demo link-outs (small)
- C5 adherence: new src/hooks/useMobilityStreak.js; streak display on MobilityTab/Home
- C6 social sharing: new src/components/MobilityShareCard.jsx (canvas image + Web Share API)
- C7 run/cardio paths: data + rules (small, may merge into C1/C2)
- C8 free cleanup: remove trial gating (LandingPage/Register/OnboardingWizard)
- C9 RTS import: new src/services/RTSImport.js (CSV → workouts) + UI entry point
- C10 correlations: mobility adherence vs session feel/performance insights component

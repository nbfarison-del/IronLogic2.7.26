# Olympic Weightlifting Architecture

## Updated Schema

### Profile Document

Olympic onboarding writes to `users/{userId}/profile/data`:

```json
{
  "sport": "Olympic Weightlifting",
  "primaryGoal": "Increase competition total",
  "trainingAge": "1-3 years",
  "daysAvailable": 4,
  "equipment": ["Platform", "Bumper plates", "Blocks"],
  "injuryHistory": "Right shoulder sensitive overhead",
  "maxes": {
    "oly_snatch": "95",
    "oly_clean_and_jerk": "125",
    "oly_front_squat": "145",
    "bb_squat": "170",
    "oly_push_press": "95"
  },
  "olympicWeightliftingProfile": {
    "snatch1RM": "95",
    "cleanJerk1RM": "125",
    "frontSquat1RM": "145",
    "backSquat1RM": "170",
    "pushPress1RM": "95",
    "trainingAge": "1-3 years",
    "competitionExperience": "Local meets",
    "weeklyTrainingAvailability": 4,
    "upcomingMeetDate": "2026-09-12",
    "mockMeetDate": "2026-08-22",
    "testingDate": "2026-08-01",
    "equipmentAvailability": ["Platform", "Blocks"],
    "injuryLimitations": "",
    "goals": "Qualify for state meet",
    "schemaVersion": 1
  }
}
```

Existing workout documents remain valid. Olympic entries add optional fields under stable namespaces:

```json
{
  "date": "2026-05-30",
  "exerciseId": "oly_snatch",
  "exerciseName": "Snatch",
  "category": "Olympic Lifts",
  "type": "strength",
  "weight": "90",
  "reps": "1",
  "actualRpe": "8",
  "sport": "olympic_weightlifting",
  "movementType": "full_lift",
  "modifiers": {
    "bar": "High Bar"
  },
  "exerciseMetadata": {
    "technicalComplexity": 10,
    "primaryMuscleGroups": ["quads", "glutes", "hamstrings", "traps", "shoulders", "core"],
    "skillClassification": "competition_lift",
    "mobilityRequirements": ["ankles", "hips", "thoracic_spine", "shoulders", "wrists"],
    "recommendedRepRange": "1-3",
    "recommendedIntensityRange": "70-100% 1RM",
    "technicalEmphasisTags": ["first_pull", "turnover", "pull_under", "overhead_catch", "bar_path"]
  },
  "olympicSet": {
    "barbellLoad": "90",
    "percentageOf1RM": "85",
    "rpe": "8",
    "technicalQualityScore": "8",
    "barSpeedRating": "crisp",
    "missedLift": false
  },
  "olympicSession": {
    "sessionReadiness": "8",
    "mobilityReadiness": "7"
  },
  "technicalNotes": {
    "timingIssues": "A little early with the arm bend.",
    "catchPosition": "Stable, slightly forward.",
    "pullMechanics": "Good off floor; finish taller.",
    "balanceObservations": "Weight drifted to toes.",
    "coachCues": "Stay over the bar longer.",
    "mobilityLimitations": "Left ankle felt restricted."
  },
  "videoAnalysis": {
    "videoUrl": "https://example.com/video",
    "uploadStatus": "linked",
    "frameAnalysis": [],
    "poseEstimation": null,
    "barPathTracking": null,
    "aiTechnicalScoring": null,
    "schemaVersion": 1
  }
}
```

### Session Finalization Document

Finalized sessions write recovery and reliability metadata to `users/{userId}/sessions/{YYYY-MM-DD}`:

```json
{
  "isComplete": true,
  "sessionRpe": 8,
  "recoveryScore": 7,
  "sleepQuality": 6,
  "motivationLevel": 8,
  "painScore": 2,
  "trainingMode": "olympic_weightlifting",
  "recoveryAdjustment": {
    "volumeMultiplier": 1,
    "intensityMultiplier": 1,
    "note": "Readiness is acceptable: keep the planned dose stable."
  },
  "dmaic": {
    "define": "Increase competition total",
    "measure": "Session RPE, recovery, sleep, motivation, pain, logged sets, volume, intensity, and readiness.",
    "analyze": "Session feedback updates recovery adjustment and weak point monitoring.",
    "improve": "Next session volume, intensity, and exercise selection adapt from these responses.",
    "control": "Persist session completion through offline queue and batched server finalization."
  },
  "reliability": {
    "saveMode": "offline_queue_batch",
    "transactionSafe": true,
    "retryEnabled": true,
    "schemaVersion": 1
  }
}
```

### Video Analysis Collection

Future AI video analysis stores metadata at `users/{userId}/liftVideos/{videoId}`:

```json
{
  "liftDate": "2026-06-02",
  "exerciseId": "oly_snatch",
  "exerciseName": "Snatch",
  "videoUrl": "https://example.com/snatch.mp4",
  "sport": "olympic_weightlifting",
  "setMetadata": [],
  "technicalNotes": {},
  "barPathData": null,
  "coachFeedback": "",
  "aiAnalysisStatus": "pending_future_model",
  "schemaVersion": 1
}
```

## Competition Squat (Bar Position) Handling

Since commit `dd486e4` (2026-08-01), back-squat strength surfaces distinguish High Bar from Low Bar training. Only **High Bar** and unspecified (legacy) `bb_squat` entries count toward the competition squat:

- `WorkoutLog.jsx` shows a High Bar / Low Bar selector **only** for `bb_squat`. The value is saved to `modifiers.bar` on every strength set (`WorkoutLog.jsx:472`) and reused from the most recent entry of the same exercise (`WorkoutLog.jsx:597-601`). Non-squat exercises reset to `High Bar`.
- `Progress.jsx` DOTS max excludes entries where `modifiers.bar === 'Low Bar'` (`Progress.jsx:123`).
- `OlympicWeightliftingEngine.js` back-squat dashboard trend and weak-point analysis filter out low-bar entries via a predicate (`OlympicWeightliftingEngine.js:91,209`).

```js
// Predicate used for back-squat surfaces
w => w.modifiers?.bar !== 'Low Bar'
```

This behavior is unit-tested in `src/tests/OlympicWeightliftingEngine.test.js`.

## 30-Day e1RM Filter

The lift intensity chart on `Progress.jsx` (`e1rmData`, `Progress.jsx:71-83`) filters workout entries to `date >= now - 30 days` and updates the chart title to "Last 30 Days".

> Minor known issue: `new Date('YYYY-MM-DD')` parses as UTC midnight while the cutoff is local time, so in US timezones a workout logged exactly 30 days ago can be dropped. Not a blocker; a date-only comparison would remove the edge.

## Component Architecture

- `src/data/olympicWeightlifting.js`: movement catalog, categories, metadata, and video-analysis placeholders.
- `src/utils/olympicWeightlifting.js`: percentage calculator, Olympic exercise detection, set/session metadata builders.
- `src/services/OlympicWeightliftingEngine.js`: weak-point analysis, competition phase selection, recovery adjustment, substitutions, session generation, smart recommendations, and competition-squat (bar-position) filtering.
- `src/components/OlympicSetLogger.jsx`: fast set entry, duplicate set, load jumps, percentage shortcuts, quick RPE controls.
- `src/analytics/olympicWeightlifting.js`: session summaries such as misses, success percentage, and average technical quality.
- `src/pages/WorkoutLog.jsx`: generic logging shell that delegates Olympic-specific fields only for Olympic movements; hosts the bar-position selector for `bb_squat`.
- `src/pages/Progress.jsx`: Olympic dashboards and general progress; applies the 30-day e1RM filter and low-bar exclusion to DOTS/back-squat surfaces.
- `src/tests/OlympicWeightliftingEngine.test.js`: Vitest coverage for bar-position exclusion, weak-point analysis, profile fallback, and total regression.

## Migration Plan

1. Deploy additive catalog and UI changes. No existing documents are rewritten.
2. New Olympic workout documents write optional namespaced fields: `sport`, `movementType`, `exerciseMetadata`, `olympicSet`, `olympicSession`, `technicalNotes`, and `videoAnalysis`.
3. Existing users keep their current profile. When they complete Olympic onboarding, `olympicWeightliftingProfile` and Olympic `maxes` are merged into the existing profile document.
4. Deploy the included composite Firestore indexes for server-side filtering:
   - `users/{userId}/workouts`: `sport ASC, date DESC`
   - `users/{userId}/workouts`: `exerciseId ASC, date DESC`
   - `users/{userId}/workouts`: `movementType ASC, date DESC`
5. Backfill is optional. If needed later, a safe batch job can tag historical `Front Squat` records where `exerciseId` is `bb_front_squat` without changing their original fields.
6. Keep the offline sync queue durable. Failed tasks remain in local storage after max retry attempts instead of being discarded.
7. For existing Olympic lifters, derive initial weak points from historical exercise IDs, e1RMs, missed-lift metadata, and technical notes when explicit profile fields are missing.

## Implementation Plan

1. Onboarding: route Olympic Weightlifting athletes through maxes, training age, meet dates, equipment, and injury constraints.
2. Adaptive engine: use lift ratios, technical notes, misses, readiness, and recovery to classify weak points and generate accessories.
3. Session builder: create sessions in priority order: snatch variation, clean and jerk variation, squat, pull, press, accessories.
4. Competition prep: calculate Accumulation, Intensification, Peaking, and Taper from meet date, with automatic volume and intensity adjustments.
5. Dashboard: dedicated Olympic dashboards for snatch, clean and jerk, total, front squat, and back squat with e1RM, volume, intensity, readiness, and PR timeline.
6. Coach intelligence: display recommendations that explicitly map Define, Measure, Analyze, Improve, and Control.
7. Reliability: preserve local-first set logging, transaction-safe session finalization, retry queue, background sync, error logs, and durable failed tasks.
8. Video infrastructure: store video URLs, lift metadata, bar path placeholders, and coach feedback so future AI analysis can attach cleanly.

## Folder Organization

```text
src/
  analytics/
    olympicWeightlifting.js
  components/
    OlympicSetLogger.jsx
  data/
    olympicWeightlifting.js
  utils/
    olympicWeightlifting.js
  pages/
    WorkoutLog.jsx
docs/
  olympic-weightlifting-architecture.md
```

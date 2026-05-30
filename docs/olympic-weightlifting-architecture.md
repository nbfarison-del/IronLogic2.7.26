# Olympic Weightlifting Architecture

## Updated Schema

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

## Component Architecture

- `src/data/olympicWeightlifting.js`: movement catalog, categories, metadata, and video-analysis placeholders.
- `src/utils/olympicWeightlifting.js`: percentage calculator, Olympic exercise detection, set/session metadata builders.
- `src/components/OlympicSetLogger.jsx`: fast set entry, duplicate set, load jumps, percentage shortcuts, quick RPE controls.
- `src/analytics/olympicWeightlifting.js`: session summaries such as misses, success percentage, and average technical quality.
- `src/pages/WorkoutLog.jsx`: generic logging shell that delegates Olympic-specific fields only for Olympic movements.

## Migration Plan

1. Deploy additive catalog and UI changes. No existing documents are rewritten.
2. New Olympic workout documents write optional namespaced fields: `sport`, `movementType`, `exerciseMetadata`, `olympicSet`, `olympicSession`, `technicalNotes`, and `videoAnalysis`.
3. Keep Firestore rules unchanged because user workout documents already permit flexible per-user records.
4. Deploy the included composite Firestore indexes for server-side filtering:
   - `users/{userId}/workouts`: `sport ASC, date DESC`
   - `users/{userId}/workouts`: `exerciseId ASC, date DESC`
   - `users/{userId}/workouts`: `movementType ASC, date DESC`
5. Backfill is optional. If needed later, a safe batch job can tag historical `Front Squat` records where `exerciseId` is `bb_front_squat` without changing their original fields.

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

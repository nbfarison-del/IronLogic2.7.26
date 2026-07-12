# IronLogic Framework Report — Algorithm Audit

**Auditor**: IronLogic Framework Engineer  
**Scope**: DMAIC algorithm consistency, transparency, and scientific integrity  
**Sources**: DMAICService.js, MetricsService.js, OlympicWeightliftingEngine.js, calculator.js, IronLogicTab.jsx, AI_CONTEXT.md  

**Note**: No canonical manuscript document was found. `DMAICService.js:2` references "the IronLogic manuscript" but it is not in the repository. Findings are based on implementation vs. exercise science principles.

---

## Finding 1 — ACWR False Positive on New Athletes

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:189` |
| **Evidence** | `chronicWeeklyVolume > 0 ? acuteVolume / chronicWeeklyVolume : acuteVolume > 0 ? 1.5 : 1` |
| **Issue** | When chronic volume is 0 (new user), ACWR hardcodes to **1.5** — immediately triggering "Caution Threshold" (`> 1.30`) and applying a **-5 to -12 penalty**. A brand-new athlete with zero history gets penalized as if overreaching. |
| **Reasoning** | Opaque fallback. The 1.5 was likely chosen as a "safe max" but misleads: the athlete sees "Acute workload is 50% above chronic workload" when no chronic workload exists. |
| **Confidence** | **High** — deterministic, verifiable at registration. |
| **Expected Impact** | Medium — new users lose 5-12 adaptation points immediately. |

### Recommendation
Set ACWR to `null` when `chronicWeeklyVolume === 0`. Skip the ACWR factor entirely in `createScoreBreakdown`. Display "Insufficient history" instead of a misleading ratio.

---

## Finding 2 — Fatigue Index Weights Are Unnormalized

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:190-194` |
| **Evidence** | Three sub-scores with coefficients 0.65 (RPE), 0.70 (soreness), 0.35 (recovery inverse). Raw max = 17.0, clamped silently to 10. Coefficients sum to 1.7, not 1.0. No source documented. |
| **Issue** | The `Math.min(10, ...)` clamp hides which fatigue profile overshoots. Two different athletes could both show "10/10" when one is barely over the threshold and the other far exceeds it. |
| **Reasoning** | 0.65 + 0.70 + 0.35 = 1.7 indicates no normalization step. The formula proportionally overweights fatigue relative to recovery. |
| **Confidence** | **High** — math is precise, lack of normalization is measurable. |
| **Expected Impact** | Medium — athletes near the 7.5 threshold may cross it earlier than intended. |

### Recommendation
Normalize coefficients to sum to 1.0 (e.g., 0.40 RPE + 0.35 soreness + 0.25 recovery). Remove the clamp. Expose coefficients and their rationale in the Why? section.

---

## Finding 3 — Performance e1RM Uses Cross-Exercise Average

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:113-116, 185-188` |
| **Evidence** | `averageE1RM` averages e1RM across ALL workout entries regardless of exercise. Squat 300 + bench 200 + deadlift 400 averages to 300 — if squat improves +20 but bench drops -10, the average rises and shows "improving" despite a declining lift. |
| **Issue** | Masks individual lift trends. The score breakdown uses `performancePercentChange` (derived from this average) as a ±30 factor. The per-exercise `flags.performanceUp/Down` system is already correct but unused for scoring. |
| **Reasoning** | Averaging different exercises' e1RM values is mathematically meaningless — they're in different units (squat kg vs bench kg vs deadlift kg) with different scaling factors per individual. |
| **Confidence** | **High** — mathematical certainty. |
| **Expected Impact** | Medium — ±30 score contribution uses a flawed metric. |

### Recommendation
Remove `performancePercentChange` / `averageE1RM` from the score breakdown. Use the per-exercise flag system: `(performanceUp - performanceDown) / totalLifts * 100`. This is already computed in `flags`.

---

## Finding 4 — Maladapted Classification Lacks Date Verification

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:117-119, 289-291` |
| **Evidence** | `countPersistentNegativeCycles` counts DMAIC logs by classification string match with **no date filter**. The Maladapted branch uses `>= 2` and claims the pattern "persisted beyond two weeks" — but no date check exists. |
| **Issue** | If a user runs 3 DMAIC cycles in one day (via Method tab), `persistentNegativeCycles >= 2` triggers immediately. The system labels "Maladapted" and says "2+ weeks" when it's been hours. |
| **Reasoning** | The code has a correct intent comment but no implementation of the date check. This is a logic-to-documentation mismatch. |
| **Confidence** | **High** — function has no date parameter, no filter. |
| **Expected Impact** | **High** — false Maladapted triggers volume reduction, intensity cap, and exercise substitutions unnecessarily. |

### Recommendation
Pass a minimum date range to `countPersistentNegativeCycles` (only count logs older than 14 days). Replace hardcoded "two weeks" with the actual span of flagged logs.

---

## Finding 5 — Confidence Score Is Opaque and Never Displayed

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:259-273` |
| **Evidence** | Base confidence = **72** (magic number). Penalties: -18 (workouts), -12 (recovery), -5 (adherence), -18 (conflict), -10 (maladapted persistence). Clamped to [35, 95]. Score is stored in DMAIC snapshot but **never rendered** in any Why? section. |
| **Issue** | 5 conditional penalties with a magic-number base, computed but hidden. Users see recommendations as authoritative without knowing the system's confidence. Why 72? Why -18 vs -12? No derivation exists. |
| **Reasoning** | The session notes say: "Every recommendation should include a 'Why?' expandable section showing inputs, metrics, decision rules, and confidence." Confidence is the ONE thing NOT displayed. |
| **Confidence** | **High** — data is stored, never surfaced. |
| **Expected Impact** | Low (hidden) / Medium (if surfaced). |

### Recommendation
Surface `confidence.score` and `confidence.reason` in IronLogicTab's RecommendationCard, Home dashboard WhyRec, and Progress WhyRec sections. Document each penalty's rationale.

---

## Finding 6 — Score Breakdown Weights Are Undocumented

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:121-203` |
| **Evidence** | Six factors: Performance ±30, Recovery ±20, Adherence ±15, Fatigue -15/+8, Readiness ±10, ACWR -12/+5. Total swing -102 to +88 around base 50, clamped to [0,100]. |
| **Issue** | Performance can swing 2x Fatigue. No normalization — maximum possible swing is 190 points (before clamp). Weights appear intuition-based, not calibrated. Classification boundaries (<45 maladapted, <50 watch) inherit this arbitrariness. |
| **Reasoning** | Factor weights determine classification. If weights are arbitrary, boundaries are arbitrary. The system should either document calibration source or normalize each factor to equal max contribution. |
| **Confidence** | **High** — weights are hardcoded with no research references. |
| **Expected Impact** | Medium — classification changes drive training adjustments. |

### Recommendation
Normalize each factor to ±20 max (6 factors = ±120 swing). Expose individual contributions in Why? sections. Record calibration basis in a manuscript document.

---

## Finding 7 — Adherence Ignores Free Sessions

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:118-130` |
| **Evidence** | `calculateAdherence` checks planned dates only. Unplanned ("free") workouts are ignored. When no plan exists, adherence = null and contributes 0 points. |
| **Issue** | Athletes without a program get no adherence data. Athletes doing extra free work get no credit. The factor contributes ±15 but free-training athletes score 0 regardless of effort. |
| **Reasoning** | Biases DMAIC toward planned-program users. Common in Olympic weightlifting where athletes follow loose daily variation. |
| **Confidence** | **High** — logic is clear, exclusion is verifiable. |
| **Expected Impact** | Low-Medium. |

### Recommendation
Add consistency score from training frequency when no plan exists. Give partial credit for free sessions on planned days (cap at 110%).

---

## Finding 8 — Recovery and Readiness Are Conflated

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:210`, `OlympicWeightliftingEngine.js:126-143`, `DMAICService.js:186-190` |
| **Evidence** | `recoveryScore` = average of last 7 days' entry.score. `getRecoveryAdjustment` computes `readinessScore` = average of recoveryScore + sleep + motivation. Score breakdown `readinessContribution` reads from `metrics.recoveryTrend`. |
| **Issue** | Three different functions use "recovery" and "readiness" interchangeably. Readiness (pre-session: energy, motivation, soreness) and recovery (post-session: sleep, HRV, pain) are distinct constructs in exercise science. |
| **Reasoning** | Readiness contribution literally reads from `metrics.recoveryTrend`. These should be measured independently. |
| **Confidence** | **High** — code trace proves proxy usage. |
| **Expected Impact** | Low-Medium — currently trends in same direction. |

### Recommendation
Add separate `readinessScore` in `calculateMetrics` reading from `entry.readiness` or `entry.mood`. Until then, surface a note: "Readiness inferred from recovery trend until dedicated readiness metric available."

---

## Finding 9 — Duplicate e1RM Calculation Exists

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:27-34` vs `calculator.js:4-14` |
| **Evidence** | Both implement Epley formula (RPE-adjusted) with identical math but different code paths. Minor behavioral difference: `calculateE1RM` clamps RPE to ≤10, `calculateEstimated1RM` returns 0 for RPE > 10. |
| **Issue** | DRY violation. Future formula changes (Epley → Brzycki → Lombardi) risk updating only one location. WorkoutLog uses calculator.js; MetricsService uses its own copy. |
| **Reasoning** | All e1RM calculations should route through one canonical function. |
| **Confidence** | **High** — both functions are isomorphic. |
| **Expected Impact** | Low (no functional difference) / Medium (future formula changes). |

### Recommendation
Deprecate `MetricsService.calculateE1RM`. Delegate to `calculator.calculateEstimated1RM`. Keep one canonical Epley implementation.

---

## Finding 10 — Manuscript Document Missing

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:2` |
| **Evidence** | `* Operationalizes the IronLogic manuscript as a transparent adaptive loop.` — but no `*manuscript*` file exists in the repository. |
| **Issue** | The code references an authoritative source that isn't version-controlled. Reviewers cannot verify implementation vs. intended design. The code IS the spec, making the reference circular. |
| **Reasoning** | Scientific frameworks need a reference document defining terms, thresholds, formulas, and decision rules independent of implementation. Without one, changes are untraceable to first principles. |
| **Confidence** | **High** — confirmed by filename search. |
| **Expected Impact** | Medium — prevents review against intended design. |

### Recommendation
Create `docs/IRONLOGIC_MANUSCRIPT.md` containing:
- DMAIC phase definitions and input requirements
- Classification decision tree with all thresholds
- Factor weights and normalization rationale
- Confidence score formula and calibration source
- Evidence generation rules
- Fallback recommendation mapping

---

## Summary Matrix

| # | Finding | Severity | Type | Impact |
|---|---------|----------|------|--------|
| 1 | ACWR false positive on new users | **High** | Incorrect assumption | New users penalized 5-12 pts |
| 2 | Fatigue index weights unnormalized | Medium | Algorithm inconsistency | Inflates near 7.5 threshold |
| 3 | Cross-exercise e1RM average | **High** | Incorrect assumption | ±30 factor uses meaningless metric |
| 4 | Maladapted lacks date check | **High** | Algorithm inconsistency | False Maladapted classification |
| 5 | Confidence score hidden | Medium | Missing transparency | Users see recommendations as absolute |
| 6 | Score weights undocumented | Medium | Opaque decision | Classification boundaries unverifiable |
| 7 | Adherence ignores free sessions | Low | Missing transparency | Free-training athletes get 0 credit |
| 8 | Recovery/readiness conflated | Low | Incorrect assumption | Proxy measurement until data available |
| 9 | Duplicate e1RM formula | Low | Technical debt | Maintenance hazard for formula changes |
| 10 | Manuscript document missing | Medium | Poor explanation | No reference for algorithm validation |

**Total: 10 findings — 3 High, 4 Medium, 3 Low severity.**

**Never modify the IronLogic algorithm without user approval per session constraint. All items above are recommendations requiring user approval before implementation.**

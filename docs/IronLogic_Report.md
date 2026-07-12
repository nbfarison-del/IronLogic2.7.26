# IronLogic Framework Report — Algorithm Audit

**Auditor**: IronLogic Framework Engineer  
**Scope**: DMAIC algorithm consistency, transparency, and scientific integrity  
**Sources**: DMAICService.js, MetricsService.js, OlympicWeightliftingEngine.js, calculator.js, IronLogicTab.jsx, AI_CONTEXT.md, "An Iterative Exercise Prescription Framework Using DMAIC Principles for Individualized Adaptation and Load Management" (N. Farison, manuscript)

**Note**: The canonical manuscript was provided by the author after the initial audit. Findings 1–10 were written without it, based on implementation vs. exercise science principles. Findings 11–18 compare the implementation directly against the manuscript, which has been archived at `docs/IRONLOGIC_MANUSCRIPT.md`.

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

## Finding 10 — Manuscript Was Not Version-Controlled

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:2` |
| **Evidence** | `* Operationalizes the IronLogic manuscript as a transparent adaptive loop.` — no manuscript file existed in the repository at audit time. |
| **Issue** | Reviewers could not verify implementation vs. intended design. The code was the sole spec. |
| **Reasoning** | Scientific frameworks need a reference document independent of implementation. |
| **Confidence** | **High** — confirmed by filename search; now resolved. |
| **Expected Impact** | Resolved — manuscript archived at `docs/IRONLOGIC_MANUSCRIPT.md`. |

### Recommendation (Resolved)
Document archived. Keep in sync with any future code changes.

---

## New Findings (Manuscript Comparison)

The following findings were identified by comparing the implementation against the author-supplied manuscript "An Iterative Exercise Prescription Framework Using DMAIC Principles..."

---

## Finding 11 — Injury Risk Proxies Missing (Measure Phase)

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:70-88` (calculateMetrics) |
| **Evidence** | Manuscript §Measure: "incorporating injury risk proxies such as joint range of motion, tendon stiffness, or movement compensations." Implementation calculates ACWR, RPE, recovery, soreness, fatigue, e1RM, adherence, body weight — no injury risk metrics. |
| **Issue** | The manuscript explicitly calls for injury risk tracking as part of the Measure phase. These metrics are foundational for "fostering long-term athlete health." Without them, the system cannot flag elevated injury risk before it manifests as performance decline. |
| **Reasoning** | The manuscript frames measurement as both performance and health monitoring. The implementation is performance-only. |
| **Confidence** | **High** — manuscript text is explicit. |
| **Expected Impact** | Medium — missed early injury detection. |

### Recommendation
Add optional fields for joint ROM, movement compensation flags, and tendon/tissue reactivity. Surface a "Monitoring Gap" badge when injury risk proxies are absent. Do not block DMAIC execution — note the gap and recommend assessment.

---

## Finding 12 — Fatigue Detection Doesn't Follow Manuscript Decision Rule

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:190-194` vs Manuscript Table 1 |
| **Evidence** | Manuscript Table 1 fatigue rule: "If RPE ↑ and performance ↓ for ≥2 consecutive sessions → flag fatigue." Implementation: `fatigue_index = 0.65*RPE + 0.70*soreness + 0.35*(10-recovery)` clamped to 10. The implementation never checks consecutive session patterns. |
| **Issue** | The manuscript prescribes a pattern-based rule (trend ≥2 sessions). The implementation uses a single-session formula that conflates fatigue with acute soreness/recovery state. An athlete with high RPE from a hard session (not fatigue) can trigger the 7.5 threshold. |
| **Reasoning** | The manuscript's rule is more conservative and specific. The implementation's formula casts a wider, less accurate net. |
| **Confidence** | **High** — both rules are unambiguous. |
| **Expected Impact** | Medium — false fatigue flags cause unnecessary volume/intensity reductions. |

### Recommendation
Replace the single-session fatigue formula with the manuscript's ≥2-session consecutive pattern rule. Keep soreness and recovery as separate metrics feeding into the Analyze phase classification, not the fatigue flag.

---

## Finding 13 — AI Capabilities Don't Match Manuscript Description

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:284-310` (generatePrescription with Gemini) vs Manuscript §Analyze |
| **Evidence** | Manuscript: "AI approaches can include clustering to identify similar adaptation trajectories, regression models to predict performance changes, and anomaly detection." Implementation: Gemini is called with a system prompt to generate recommendation text. No clustering, regression, or anomaly detection exists. |
| **Issue** | The manuscript describes AI as an analysis engine (finding patterns in data). The implementation uses AI as a text generator (writing recommendations). These are fundamentally different capabilities. The "AI-powered" claim overstates what the system does. |
| **Reasoning** | Text generation is a legitimate use of AI, but it's not the analysis engine the manuscript describes. The manuscript's "clustering, regression, anomaly detection" would require training/configuration. |
| **Confidence** | **High** — the implementation's AI call is a single prompt, not a statistical model. |
| **Expected Impact** | Low (immediate functionality works) / **High** (if marketing/paper claims are challenged). |

### Recommendation
Either: (a) Rename "AI analysis" to "AI-assisted recommendation" and document the gap vs. manuscript vision, or (b) Build clustering/regression/anomaly detection modules per manuscript roadmap. Option (a) is immediate; (b) is a major feature.

---

## Finding 14 — Goal Reevaluation Never Occurs (Control Phase Gap)

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:233-255` (createControlPlan) vs Manuscript §Control |
| **Evidence** | Manuscript: "routine reevaluation of individual goals" and "if an individual achieves their goal, then they should work together with their health practitioner to plan their next steps." Implementation: `createControlPlan` sets monitoring frequency, triggers, success criteria — but never checks goal achievement or re-evaluates goals. |
| **Issue** | The Define phase sets goals. The Control phase should check them. The loop is open — goals are set once and never closed. |
| **Reasoning** | A closed-loop system must check whether goals were met. Without this, DMAIC cycles accumulate without measuring actual outcomes. |
| **Confidence** | **High** — no goal comparison logic exists anywhere. |
| **Expected Impact** | Medium — reduces the system from "adaptive" to "monitoring." |

### Recommendation
Add a `goalAchievementCheck` to `createControlPlan` that compares current metrics against Define-phase goals. When goals are met, prompt "Goal achieved — proceed to new goal setting." When progress is insufficient, feed into the next DMAIC cycle.

---

## Finding 15 — Priority Domains Stored but Never Used

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:35-40` (createDefinePhase priorities) vs Manuscript §Define |
| **Evidence** | Manuscript: "Explicitly distinguishing primary versus secondary outcomes helps guide measurement selection." Implementation stores `priorities: { strength, power, endurance, hypertrophy }` in Define phase but no downstream code (Metrics, Analyze, classification, recommendations) references them. |
| **Issue** | Setting priorities is a UX action with no algorithmic consequence. An athlete selecting "power" gets the same analysis as one selecting "hypertrophy." |
| **Reasoning** | Priorities should weight metrics. A power athlete should have different fatigue thresholds than an endurance athlete. Currently they do not. |
| **Confidence** | **High** — grep confirms priorities are never read after creation. |
| **Expected Impact** | Low (no incorrect behavior) / Medium (missed personalization opportunity). |

### Recommendation
Use priorities to weight score breakdown factors (e.g., power priority → performance weight increased, adherence decreased). Document the mapping in the manuscript. Minimum viable: display "Priorities not yet influencing algorithm" note.

---

## Finding 16 — `appliedRecommendation` Hardcoded to `false`

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:249`, `createControlPlan` return object |
| **Evidence** | `appliedRecommendation: false` is set unconditionally. No mechanism exists to set it to `true` based on user action. The Manuscript §Control emphasizes "tracking whether recommendations were applied." |
| **Issue** | The system generates recommendations but never tracks whether they were followed. A coach can read the recommendation and ignore it — the next DMAIC cycle has no record. |
| **Reasoning** | Without tracking application, the system cannot learn which recommendations work. This is essential for the "control loop" described in the manuscript. |
| **Confidence** | **High** — value is hardcoded literal. |
| **Expected Impact** | Low (no current dependency on this field) / High (future feedback loop). |

### Recommendation
Add a `recommendationApplied(recommendationId)` API call that sets `appliedRecommendation: true` and a timestamp. Wire it to the UI after the athlete records the next session. Then baseline comparison can measure: "Did following this recommendation improve metrics?"

---

## Finding 17 — No Baseline Comparison Across Cycles

| Field | Detail |
|-------|--------|
| **Location** | `DMAICService.js:233-255` (createControlPlan baseline) vs Manuscript §Control |
| **Evidence** | Manuscript: "Control loops ensure that interventions remain responsive rather than static. They also provide documentation of optimization decisions." Implementation captures `baseline: { acuteVolume, averageRpe, recoveryScore, acwr }` in Control but never compares it against the next Define/Measure phase. |
| **Issue** | The baseline is a snapshot, not a comparison anchor. Each DMAIC cycle starts fresh — no "how did last cycle's adjustments change the metrics?" |
| **Reasoning** | Cross-cycle comparison is fundamental to the DMAIC methodology. Without it, there is no "continuous improvement." |
| **Confidence** | **High** — no comparison logic exists. |
| **Expected Impact** | Medium — system is reactive, not truly adaptive. |

### Recommendation
Store the previous cycle's Control baseline as `previousBaseline` in the new cycle's Define phase. Display a delta in the Why? section: "Recovery improved +12% since last review." Use the delta to adjust confidence score up or down.

---

## Finding 18 — Inconsistent ACWR Calculation with Manuscript Thresholds

| Field | Detail |
|-------|--------|
| **Location** | `MetricsService.js:180-189` vs Manuscript Table 1 |
| **Evidence** | Manuscript prescribes ACWR thresholds for decision-making (Table 1 reference values). Implementation uses hardcoded thresholds of <0.8 (low) and >1.3 (caution) with penalty -12 to +5. The manuscript does not specify exact numeric thresholds, only directional guidance. |
| **Issue** | The implementation's specific thresholds are unsourced in the manuscript. While the direction aligns (avoid high ACWR), the exact -12/+5 penalty weights and 0.8/1.3 boundaries have no manuscript basis. |
| **Reasoning** | If boundaries are implementation-specific, they should be documented as such rather than attributed to the manuscript. |
| **Confidence** | **Medium** — thresholds may come from general ACWR literature (not the manuscript). |
| **Expected Impact** | Low — thresholds are reasonable; issue is documentation, not correctness. |

### Recommendation
Document each threshold's source (manuscript or published literature). Add a citation field to `scoreBreakdown` factors.

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
| 10 | Manuscript was not version-controlled | Medium | Poor explanation | Resolved — archived |
| 11 | Injury risk proxies missing | Medium | Missing transparency | Missed early injury detection |
| 12 | Fatigue detection doesn't follow manuscript rule | **High** | Algorithm inconsistency | False fatigue flags |
| 13 | AI capabilities don't match manuscript | **High** | Incorrect assumption | Overstated AI capability |
| 14 | Goal reevaluation never occurs | Medium | Missing transparency | Open control loop |
| 15 | Priority domains stored but never used | Low | Technical debt | Missed personalization |
| 16 | appliedRecommendation hardcoded to false | Low | Technical debt | No feedback loop |
| 17 | No baseline comparison across cycles | Medium | Algorithm inconsistency | Reactive, not adaptive |
| 18 | ACWR thresholds undocumented | Low | Poor explanation | Citation gap |

**Total: 18 findings — 5 High, 7 Medium, 6 Low severity. Findings 1–10 from initial audit (no manuscript). Findings 11–18 from manuscript comparison (new).**

**Never modify the IronLogic algorithm without user approval per session constraint. All items above are recommendations requiring user approval before implementation.**

# An Iterative Exercise Prescription Framework Using DMAIC Principles for Individualized Adaptation and Load Management

**Author**: Nicholas Farison  
**Framework**: IronLogic Method  
**Version**: 1.0 (manuscript)

---

## 1. Overview

The IronLogic Method operationalizes the DMAIC (Define–Measure–Analyze–Improve–Control) framework from Six Sigma as a cyclical decision-support tool for individualized exercise prescription. Rather than applying static periodization templates, IronLogic uses real-time athlete data, rule-based classification, and AI-assisted recommendations to continuously adapt training load, volume, and exercise selection.

The framework is designed as a decision-support tool — it surfaces recommendations and rationale to coaches and athletes while keeping human judgment as the final authority. The AI component enhances analysis and recommendation generation but is not a "black box" that makes autonomous decisions.

---

## 2. DMAIC Phases

### 2.1 Define Phase

**Purpose**: Establish individual goals, constraints, and context for the training cycle.

**Inputs Required**:
- Primary goal (e.g., General Strength, Hypertrophy, Power, Endurance, Sport-Specific)
- Secondary goals
- Sport and training age
- Training phase
- Constraints: occupation stress, equipment access, days available per week, session length, injury history, movement limitations, travel schedule
- Priority domains: strength, power, endurance, hypertrophy — explicitly distinguished as primary versus secondary outcomes

**Notes**:
- Goals should align with the individual's functional goals, physiological targets, injury history, time availability, and access to equipment.
- An overarching main goal should be explicitly described.
- Explicitly distinguishing primary versus secondary outcomes helps guide measurement selection.

### 2.2 Measure Phase

**Purpose**: Collect objective and subjective metrics to establish baselines and track trends.

**Metrics to Capture**:
- **Objective**: Volume load, intensity (RPE or %1RM), e1RM trends per exercise, acute:chronic workload ratio (ACWR), body weight, adherence rate
- **Subjective**: Perceived recovery, soreness (1-10), rate of perceived exertion (RPE), readiness (energy, motivation, soreness pre-session), sleep quality
- **Injury Risk Proxies**: Joint range of motion, tendon stiffness or tissue reactivity, movement compensations/quality — incorporated as available

**Requirements**:
- Standardized monitoring protocols should be established to ensure consistency.
- The broad spectrum of data requires a measurement infrastructure capable of capturing longitudinal records.

### 2.3 Analyze Phase

**Purpose**: Transform raw data into actionable insight.

**Analysis Methods**:
- Traditional statistical methods: trend analysis, comparative baselines, threshold-based classification
- AI-assisted tools (as available):
  - Clustering to identify similar adaptation trajectories across athletes
  - Regression models to predict performance changes
  - Anomaly detection to flag unexpected responses
- Multidisciplinary collaboration (data scientists, sport scientists, exercise physiologists, coaches) for interpretation

**Decision Rules**:

| Rule | Condition | Action |
|------|-----------|--------|
| Fatigue flag | RPE ↑ AND performance ↓ for ≥2 consecutive sessions | Flag fatigue, adjust volume |
| Performance stagnation | Performance stagnates despite load progression | Reassess stimulus, modify exercise selection |
| High ACWR | ACWR > 1.3–1.5 range | Reduce volume/intensity |
| Low ACWR | ACWR < 0.8 | Consider increasing stimulus |
| Variability | High session-to-session variability persists | Increase monitoring frequency |
| Goal tracking | Performance matches or exceeds goal target | Maintain or progress load |

### 2.4 Improve Phase

**Purpose**: Translate analytic insights into specific training adjustments.

**Intervention Categories**:
- Adjust volume load (increase/decrease based on ACWR and fatigue)
- Adjust intensity (RPE targets, %1RM zones)
- Modify exercise selection (substitute flagged movements)
- Modify recovery protocols
- Adjust training frequency

**AI Role**: AI can assist by suggesting combinations of variables that historically correlate with positive outcomes. AI-informed prescriptions can offer more individualized solutions than traditional generalized templates.

### 2.5 Control Phase

**Purpose**: Establish mechanisms for ongoing feedback and adaptation.

**Requirements**:
- Routine reevaluation of individual goals
- If a goal is achieved, plan next steps or new goal
- Track whether recommendations were applied
- Document optimization decisions
- Compare current metrics against previous cycle baselines

**Control Loop Elements**:
- Monitoring frequency and triggers
- Success criteria tied to Define-phase goals
- Escalation rules for sustained negative patterns
- Baseline snapshot for cross-cycle comparison
- appliedRecommendation tracking

---

## 3. Classification System

The framework classifies adaptation state into four categories based on the Analyze phase scoring:

| Classification | Score Range | Implication |
|---------------|-------------|-------------|
| Adaptive | ≥ 65 | Positive adaptation; maintain or progress |
| Functional Overreaching | 50–64 | Temporary stress, monitor closely |
| Watch Status | 45–49 | Caution; adjust before maladaptation |
| Maladapted | < 45 | Negative adaptation; reduce load, reassess |

---

## 4. Score Breakdown Factors

The overall adaptation score (0–100, base 50) is calculated from six weighted factors:

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Performance | ±30 | Primary indicator of training effectiveness |
| Recovery | ±20 | Physiological readiness for continued training |
| Adherence | ±15 | Consistency is prerequisite for adaptation |
| Fatigue | -15/+8 | Acute fatigue may confound performance assessment |
| Readiness | ±10 | Pre-session state affects training quality |
| ACWR | -12/+5 | Workload balance affects injury risk |

---

## 5. Confidence Score

The system computes a confidence score (35–95, base 72) for each recommendation, adjusted by:

| Penalty | Amount | Condition |
|---------|--------|-----------|
| Limited data | -18 | < 90 workouts in history |
| Low recovery data | -12 | Recovery data missing |
| Low adherence | -5 | Adherence < 70% |
| Conflicting signals | -18 | Mixed performance/recovery across exercises |
| Persistent maladaptation | -10 | Sustained negative trend |

Confidence should be surfaced to users to indicate recommendation reliability.

---

## 6. AI Integration

- AI is a decision-support tool, not a black box.
- AI role spans: analysis (detecting patterns, anomalies, trajectories) and recommendation generation (suggesting adjustments).
- All AI outputs must include rationale and confidence level.
- Human coach/athlete judgment remains the final authority.
- AI suggestions should improve as historical data accumulates.

---

## 7. Design Principles

1. **Individualization**: Every prescription is specific to the individual's data, not population averages.
2. **Transparency**: All decision factors, weights, and confidence are exposed to the user.
3. **Iteration**: The DMAIC cycle repeats continuously, not on fixed calendar blocks.
4. **Health-first**: Injury risk monitoring and load management precede performance optimization.
5. **Decision-support**: The system advises; humans decide.
6. **Cross-domain balance**: Strength, power, and endurance development should be balanced according to priority domains.

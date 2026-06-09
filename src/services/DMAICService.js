/**
 * DMAICService.js
 * Operationalizes the IronLogic manuscript as a transparent adaptive loop.
 */

import {
    getBodyWeightHistory,
    getDMAICLogs,
    getPlannedWorkouts,
    getRecoveryHistory,
    getUserProfile,
    getWorkouts,
    setDoc,
    doc
} from './firestoreService';
import { calculateMetrics } from './MetricsService';
import { chatWithAI } from './GeminiService';
import { db } from '../config/firebaseConfig';
import { logger } from '../utils/logger';

const createDefinePhase = (profile = {}) => ({
    primaryGoal: profile?.primaryGoal || 'General Strength',
    secondaryGoals: profile?.secondaryGoals || '',
    sport: profile?.sport || 'General Fitness',
    trainingAge: profile?.trainingAge || 'unspecified',
    trainingPhase: profile?.trainingPhase || 'general',
    constraints: {
        occupationStress: profile?.occupationStress || 'low',
        equipment: profile?.equipment || 'full_gym',
        daysAvailable: profile?.daysAvailable || '',
        sessionLength: profile?.sessionLength || '',
        injuryHistory: profile?.injuryHistory || '',
        movementLimitations: profile?.movementLimitations || '',
        travelSchedule: profile?.travelSchedule || ''
    },
    priorities: {
        strength: profile?.priorityStrength || '',
        power: profile?.priorityPower || '',
        endurance: profile?.priorityEndurance || '',
        hypertrophy: profile?.priorityHypertrophy || ''
    }
});

const createMeasurementSummary = (metrics) => ({
    acuteVolume: Math.round(metrics.acuteVolume || 0),
    chronicWeeklyVolume: Math.round(metrics.chronicWeeklyVolume || 0),
    acwr: metrics.acwr,
    averageRpe: metrics.averageRpe,
    recoveryScore: metrics.recoveryScore,
    sorenessAverage: metrics.sorenessAverage,
    fatigueIndex: metrics.fatigue_index,
    adherence: metrics.adherence,
    e1rm: metrics.e1rm,
    dataQuality: metrics.dataQuality
});

/**
 * Executes a full DMAIC cycle for an athlete.
 */
export const runDMAICCycle = async (athleteId) => {
    logger.info('Starting DMAIC Cycle', { athleteId });
    try {
        const [profile, workouts, recovery, plannedWorkouts, bodyWeight, previousDmaicLogs] = await Promise.all([
            getUserProfile(athleteId),
            getWorkouts(athleteId, 120),
            getRecoveryHistory(athleteId, 28),
            getPlannedWorkouts(athleteId),
            getBodyWeightHistory(athleteId, 28),
            getDMAICLogs(athleteId, 8)
        ]);

        const define = createDefinePhase(profile);
        const metrics = calculateMetrics({
            workouts,
            recovery,
            plannedWorkouts,
            bodyWeight,
            previousDmaicLogs
        });
        const measure = createMeasurementSummary(metrics);
        const status = analyzeAdaptationState(metrics, define, previousDmaicLogs);
        const recommendation = await generatePrescription(define, status, metrics, previousDmaicLogs);
        const control = createControlPlan(status, recommendation, metrics, previousDmaicLogs);

        const snapshot = {
            define,
            measure,
            metrics,
            status,
            recommendation,
            control,
            timestamp: new Date().toISOString()
        };

        await logDMAICSnapshot(athleteId, snapshot);

        logger.info('DMAIC Cycle completed', { athleteId, status: status.classification });

        return snapshot;
    } catch (error) {
        logger.error('Error in DMAIC Cycle', { athleteId, error: error.message });
        throw error;
    }
};

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const formatPercent = (value) => `${value > 0 ? '+' : ''}${Math.round(value * 10) / 10}%`;

const getTrendContribution = (trend, positivePoints, negativePoints = positivePoints) => {
    if (trend === 'up') return positivePoints;
    if (trend === 'down') return -negativePoints;
    if (trend === 'flat') return Math.round(positivePoints * 0.5);
    return 0;
};

const countPersistentNegativeCycles = (previousDmaicLogs = []) => previousDmaicLogs
    .filter(log => ['Watch Status', 'Functional Overreaching', 'Maladapted', 'Overreached', 'Fatigued'].includes(log?.status?.classification))
    .length;

const createScoreBreakdown = (metrics = {}) => {
    const flags = metrics.flags || {};
    const adherenceRate = metrics.adherence?.rate;
    const adherencePercent = adherenceRate === null || adherenceRate === undefined ? null : Math.round(adherenceRate * 100);
    const totalPerformanceSignals = flags.performanceUp + flags.performanceFlat + flags.performanceDown;
    const performanceBalance = totalPerformanceSignals
        ? ((flags.performanceUp - flags.performanceDown) / totalPerformanceSignals) * 100
        : 0;

    const performanceContribution = totalPerformanceSignals
        ? Math.round(clamp(performanceBalance, -100, 100) * 0.3)
        : 0;
    const recoveryContribution = metrics.recoveryScore
        ? Math.round((metrics.recoveryScore - 5) * 4) + getTrendContribution(metrics.recoveryTrend, 5, 8)
        : 0;
    const adherenceContribution = adherencePercent === null
        ? 0
        : Math.round((adherencePercent - 75) * 0.6);
    const fatigueContribution = metrics.fatigue_index >= 7.5
        ? -15
        : metrics.fatigue_index >= 6.5
            ? -8
            : 8;
    const readinessContribution = getTrendContribution(metrics.recoveryTrend, 10);
    const acwrContribution = metrics.acwr >= 1.5
        ? -12
        : metrics.acwr >= 1.3
            ? -5
            : metrics.acwr >= 0.8
                ? 5
                : -3;

    const factors = [
        {
            label: 'Performance Trend',
            value: totalPerformanceSignals
                ? `${flags.performanceUp} improving / ${flags.performanceFlat} stable / ${flags.performanceDown} declining`
                : 'Not enough e1RM history',
            contribution: performanceContribution,
            evidence: metrics.performancePercentChange
                ? `Estimated strength output changed ${formatPercent(metrics.performancePercentChange)} versus the comparison window.`
                : 'No reliable recent e1RM change detected.'
        },
        {
            label: 'Recovery Score',
            value: `${metrics.recoveryScore || 0}/10`,
            contribution: clamp(recoveryContribution, -20, 20),
            evidence: `Recovery trend is ${metrics.recoveryTrend || 'new'}.`
        },
        {
            label: 'Session Completion Rate',
            value: adherencePercent === null ? 'No planned sessions' : `${adherencePercent}%`,
            contribution: clamp(adherenceContribution, -15, 15),
            evidence: adherencePercent === null
                ? 'No planned sessions were available to score adherence.'
                : `${metrics.adherence.completedPlannedSessions} of ${metrics.adherence.plannedSessions} planned sessions were completed.`
        },
        {
            label: 'Fatigue Index',
            value: metrics.fatigue_index >= 7.5 ? `Elevated (${metrics.fatigue_index}/10)` : `${metrics.fatigue_index || 0}/10`,
            contribution: fatigueContribution,
            evidence: metrics.fatigue_index >= 7.5
                ? 'Fatigue exceeded the elevated threshold of 7.5.'
                : 'Fatigue remained below the elevated threshold of 7.5.'
        },
        {
            label: 'Readiness Trend',
            value: metrics.recoveryTrend || 'new',
            contribution: readinessContribution,
            evidence: 'Readiness is currently inferred from recovery trend until a separate readiness stream is available.'
        },
        {
            label: 'Acute:Chronic Workload Ratio',
            value: metrics.acwr || 1,
            contribution: acwrContribution,
            evidence: metrics.acwr >= 1.3
                ? 'Acute load is meaningfully above chronic weekly load.'
                : 'Workload ratio is inside the normal monitoring range.'
        }
    ];

    const score = clamp(50 + factors.reduce((sum, factor) => sum + factor.contribution, 0));
    return { factors, score, performanceBalance, adherencePercent };
};

const createClassificationEvidence = (classification, metrics, breakdown, persistentNegativeCycles) => {
    const flags = metrics.flags || {};
    const positive = [];
    const negative = [];
    const thresholds = [
        { label: 'Fatigue Threshold', threshold: '> 7.5', current: metrics.fatigue_index || 0, triggered: (metrics.fatigue_index || 0) > 7.5, impact: '-15 adaptation points when elevated' },
        { label: 'ACWR Caution Threshold', threshold: '> 1.30', current: metrics.acwr || 1, triggered: (metrics.acwr || 1) > 1.3, impact: '-5 to -12 adaptation points' },
        { label: 'Recovery Decline Rule', threshold: 'trend = down', current: metrics.recoveryTrend || 'new', triggered: metrics.recoveryTrend === 'down', impact: 'Required for Maladapted classification' },
        { label: 'Performance Decline Rule', threshold: 'more declining than improving lifts', current: `${flags.performanceDown || 0} down / ${flags.performanceUp || 0} up`, triggered: (flags.performanceDown || 0) > (flags.performanceUp || 0), impact: 'Required for Maladapted classification' },
        { label: 'Persistence Rule', threshold: '> 2 weeks', current: `${persistentNegativeCycles + 1} flagged cycle(s)`, triggered: persistentNegativeCycles >= 2, impact: 'Required for Maladapted classification' }
    ];

    if ((flags.performanceUp || 0) > 0) positive.push(`${flags.performanceUp} movement trend(s) are improving.`);
    if ((flags.performanceFlat || 0) > 0) positive.push(`${flags.performanceFlat} movement trend(s) are stable.`);
    if (metrics.performancePercentChange > 0) positive.push(`Estimated strength output improved ${formatPercent(metrics.performancePercentChange)}.`);
    if (breakdown.adherencePercent >= 90) positive.push(`Training adherence remained high at ${breakdown.adherencePercent}%.`);
    if ((metrics.recoveryScore || 0) >= 6.5) positive.push(`Recovery score is still serviceable at ${metrics.recoveryScore}/10.`);

    if ((flags.performanceDown || 0) > 0) negative.push(`${flags.performanceDown} movement trend(s) are declining.`);
    if (metrics.recoveryTrend === 'down') negative.push('Recovery trend declined across the monitoring window.');
    if ((metrics.fatigue_index || 0) >= 7.5) negative.push(`Fatigue index is elevated at ${metrics.fatigue_index}/10.`);
    if ((metrics.acwr || 1) >= 1.3) negative.push(`Acute workload is ${Math.round(((metrics.acwr || 1) - 1) * 100)}% above chronic workload.`);

    return {
        summary: `The system classified you as ${classification} because the adaptation score was ${breakdown.score}/100 and the rule checks below were applied.`,
        positive,
        negative,
        thresholds
    };
};

const createConflictAnalysis = (metrics = {}, classification = '') => {
    const flags = metrics.flags || {};
    const performanceImproving = (flags.performanceUp || 0) > (flags.performanceDown || 0) || (metrics.performancePercentChange || 0) > 1.5;
    const negativeStatus = ['Functional Overreaching', 'Watch Status', 'Maladapted'].includes(classification);

    if (!performanceImproving || !negativeStatus) return null;

    return {
        title: 'Potential Conflict Detected',
        message: 'Your strength metrics are increasing despite elevated fatigue or workload markers.',
        possibilities: [
            'Functional overreaching',
            'Productive accumulation phase',
            'Early fatigue accumulation',
            'False positive fatigue detection'
        ],
        recommendation: classification === 'Maladapted'
            ? 'Confirm the trend with another check before making a major change unless recovery continues falling.'
            : 'Continue monitoring for 1-2 weeks before initiating a deload.'
    };
};

const createConfidence = (metrics = {}, classification = '', conflict = null, persistentNegativeCycles = 0) => {
    const dataQuality = metrics.dataQuality || {};
    let confidence = 72;
    if ((dataQuality.workoutSets28d || 0) < 8) confidence -= 18;
    if ((dataQuality.recoveryEntries14d || 0) < 4) confidence -= 12;
    if (!metrics.adherence) confidence -= 5;
    if (conflict) confidence -= 18;
    if (classification === 'Maladapted' && persistentNegativeCycles < 2) confidence -= 10;

    const reason = conflict
        ? 'Performance indicators are improving while fatigue or workload indicators are worsening. Mixed signals reduce confidence.'
        : 'Training, recovery, and workload signals are directionally consistent enough for this classification.';

    return { score: clamp(Math.round(confidence), 35, 95), reason };
};

export const analyzeAdaptationState = (metrics = {}, define = {}, previousDmaicLogs = []) => {
    const flags = metrics.flags || {};
    const reasoning = [];
    const decisionRules = [];
    const breakdown = createScoreBreakdown(metrics);
    const persistentNegativeCycles = countPersistentNegativeCycles(previousDmaicLogs);
    const performanceImproving = flags.performanceUp > flags.performanceDown || (metrics.performancePercentChange || 0) > 1.5;
    const performanceDeclining = flags.performanceDown > flags.performanceUp;
    const recoveryDeclining = metrics.recoveryTrend === 'down';
    const fatigueElevated = (metrics.fatigue_index || 0) >= 7.5;
    const workloadElevated = (metrics.acwr || 1) >= 1.3 || flags.volumeSpike;

    let classification = 'Adaptive';

    if (performanceDeclining && recoveryDeclining && fatigueElevated && persistentNegativeCycles >= 2) {
        classification = 'Maladapted';
        reasoning.push('Performance, recovery, and fatigue are all negative, and the pattern has persisted beyond two weeks.');
        decisionRules.push('Maladapted requires performance declining, recovery declining, fatigue elevated, and persistence across more than two weeks.');
    } else if (performanceImproving && (fatigueElevated || workloadElevated)) {
        classification = 'Functional Overreaching';
        reasoning.push('Performance is improving while fatigue or workload is elevated, suggesting productive accumulation rather than maladaptation.');
        decisionRules.push('If performance continues improving, classify elevated fatigue as functional overreaching before calling it maladaptation.');
    } else if ((performanceDeclining && (recoveryDeclining || fatigueElevated)) || breakdown.score < 45) {
        classification = 'Watch Status';
        reasoning.push('One or more negative signals are present, but the full maladaptation rule has not been met.');
        decisionRules.push('Use Watch Status when negative signals need monitoring but performance/recovery/fatigue/persistence do not all align.');
    } else {
        reasoning.push('Performance, recovery, and workload signals are compatible with continued adaptation.');
        decisionRules.push('Performance is the validation metric; fatigue markers provide context and do not override stable or improving output alone.');
    }

    if (define?.constraints?.injuryHistory || define?.constraints?.movementLimitations) {
        reasoning.push('Defined injury or movement constraints should shape exercise selection and progression speed.');
        decisionRules.push('If movement limitations are present, prioritize substitutions and conservative progression.');
    }

    const conflict = createConflictAnalysis(metrics, classification);
    const confidence = createConfidence(metrics, classification, conflict, persistentNegativeCycles);
    const evidence = createClassificationEvidence(classification, metrics, breakdown, persistentNegativeCycles);

    return {
        classification,
        score: breakdown.score,
        scoreBreakdown: breakdown.factors,
        confidence,
        evidence,
        conflict,
        historicalComparison: metrics.historicalComparison,
        reasoning,
        decisionRules,
        acwr: metrics.acwr || 1,
        fatigueIndex: metrics.fatigue_index || 0,
        recoveryScore: metrics.recoveryScore || 0,
        volumeTrend: metrics.volumeTrend || 'new',
        rpeTrend: metrics.rpeTrend || 'new',
        recoveryTrend: metrics.recoveryTrend || 'new'
    };
};

const getFallbackRecommendation = (classification, define = {}) => {
    const constraintNote = define?.constraints?.injuryHistory || define?.constraints?.movementLimitations
        ? 'Use pain-free variations and keep movement quality as the limiter.'
        : 'Keep exercise selection stable unless execution quality changes.';

    const fallbacks = {
        'Functional Overreaching': {
            adjustmentType: 'maintain',
            title: 'Productive Accumulation Watch',
            description: 'Performance is improving while fatigue is elevated. Treat this as functional overreaching unless recovery or output begins to fall.',
            specifics: {
                volume: 'Hold current volume for 1 week or trim nonessential accessories 5-10%',
                intensity: 'Keep main lift intensity stable and avoid grinders',
                exerciseSelection: constraintNote,
                recovery: 'Monitor sleep, soreness, and readiness before each hard session',
                focus: 'Preserve performance while watching fatigue'
            }
        },
        'Watch Status': {
            adjustmentType: 'maintain',
            title: 'Monitor Before Changing Course',
            description: 'Some negative indicators are present, but the system does not have enough aligned evidence to call this maladaptation.',
            specifics: {
                volume: 'Keep planned volume stable unless readiness drops again',
                intensity: 'Cap surprise high-fatigue sessions at RPE 8',
                exerciseSelection: constraintNote,
                recovery: 'Add one extra recovery check-in this week',
                focus: 'Confirm whether the signal persists'
            }
        },
        Adaptive: {
            adjustmentType: 'intensity_increase',
            title: 'Validated Adaptation',
            description: 'Performance and recovery signals support continued progression. Fatigue markers are being used as context, not as the primary verdict.',
            specifics: {
                volume: 'Keep volume stable',
                intensity: 'Progress load 2-5% where bar speed and RPE support it',
                exerciseSelection: constraintNote,
                recovery: 'Maintain current recovery strategy',
                focus: 'Measurable performance adaptation'
            }
        },
        Overreached: {
            adjustmentType: 'volume_reduction',
            title: 'Recovery Protection Block',
            description: 'Training stress is outpacing recovery. Reduce workload now to preserve adaptation and lower injury risk.',
            specifics: {
                volume: 'Reduce total work sets 20-30% for 3-7 days',
                intensity: 'Cap main lifts at RPE 6-7',
                exerciseSelection: constraintNote,
                recovery: 'Add one recovery or mobility emphasis day',
                focus: 'Restore readiness before progressing'
            }
        },
        Fatigued: {
            adjustmentType: 'volume_reduction',
            title: 'Fatigue Management Adjustment',
            description: 'Fatigue is rising before a clear performance drop. Trim nonessential volume while preserving skill practice.',
            specifics: {
                volume: 'Reduce accessory volume 10-20%',
                intensity: 'Maintain main work but avoid missed reps',
                exerciseSelection: constraintNote,
                recovery: 'Increase sleep/recovery emphasis and monitor soreness',
                focus: 'Crisp reps and recoverability'
            }
        },
        Maladapted: {
            adjustmentType: 'pivot',
            title: 'Stimulus Reassessment',
            description: 'Performance is declining under the current stimulus. Shift the stressor instead of forcing the same progression.',
            specifics: {
                volume: 'Hold or reduce volume 10-15%',
                intensity: 'Lower top set intensity by 5-10%',
                exerciseSelection: 'Use variations that reduce joint stress and improve technical output',
                recovery: 'Add readiness check before the next high-intensity exposure',
                focus: 'Recover performance quality'
            }
        },
        Advancing: {
            adjustmentType: 'intensity_increase',
            title: 'Controlled Progression',
            description: 'Performance is improving and recovery is acceptable. Progress conservatively while preserving the feedback loop.',
            specifics: {
                volume: 'Keep volume stable',
                intensity: 'Increase load 2-5% or add one RPE-appropriate top set',
                exerciseSelection: constraintNote,
                recovery: 'Maintain current recovery strategy',
                focus: 'Progress without disrupting readiness'
            }
        },
        Understimulated: {
            adjustmentType: 'stimulus_increase',
            title: 'Increase Training Stimulus',
            description: 'Progress is flat without excessive fatigue. The athlete likely needs a clearer overload signal.',
            specifics: {
                volume: 'Increase targeted volume 5-10%',
                intensity: 'Raise target RPE by 0.5 or add a heavier exposure',
                exerciseSelection: 'Introduce a variation aligned with the primary goal',
                recovery: 'Monitor recovery after the added stimulus',
                focus: 'Specific overload'
            }
        },
        Stable: {
            adjustmentType: 'maintain',
            title: 'Maintain and Monitor',
            description: 'Training stress and recovery appear balanced. Keep the current plan while collecting enough data for the next cycle.',
            specifics: {
                volume: 'Stable',
                intensity: 'Stable',
                exerciseSelection: constraintNote,
                recovery: 'Continue daily or weekly readiness tracking',
                focus: 'Consistency'
            }
        }
    };

    return fallbacks[classification] || fallbacks.Adaptive || fallbacks.Stable;
};

const generatePrescription = async (define, status, metrics, previousDmaicLogs) => {
    const fallback = getFallbackRecommendation(status.classification, define);

    const systemPrompt = `
You are the IronLogic AI Coaching Engine. Align with the DMAIC exercise prescription manuscript.
Use the provided structured decision rules as the primary source of truth. Do not invent unsupported metrics.

DEFINE:
${JSON.stringify(define)}

MEASURE:
${JSON.stringify(createMeasurementSummary(metrics))}

ANALYZE:
${JSON.stringify(status)}

CONTROL HISTORY:
${JSON.stringify(previousDmaicLogs?.slice(0, 3) || [])}

Return valid JSON only:
{
  "adjustmentType": "volume_reduction" | "intensity_increase" | "stimulus_increase" | "pivot" | "maintain",
  "title": "Short title",
  "description": "Why this adjustment follows from the data",
  "specifics": {
    "volume": "specific set/load adjustment",
    "intensity": "specific RPE/load cap or progression",
    "exerciseSelection": "specific selection guidance",
    "recovery": "specific recovery action",
    "focus": "weekly coaching focus"
  }
}`;

    try {
        const response = await chatWithAI([{ role: 'system', content: systemPrompt }]);
        return { ...fallback, ...JSON.parse(response) };
    } catch {
        return fallback;
    }
};

const createControlPlan = (status, recommendation, metrics, previousDmaicLogs = []) => {
    const lastSnapshot = previousDmaicLogs[0];
    const lastClassification = lastSnapshot?.status?.classification;
    const repeatedFlag = lastClassification && lastClassification === status.classification;

    return {
        monitoringFrequency: ['Functional Overreaching', 'Watch Status', 'Maladapted'].includes(status.classification)
            ? 'Check recovery before every session this week'
            : 'Review weekly after the next finalized session',
        nextReviewTrigger: 'After 2 completed sessions or 7 days, whichever comes first',
        successCriteria: [
            'Recovery score stabilizes or improves',
            'Average RPE does not continue rising',
            'Target movement e1RM or execution quality stabilizes',
            'Planned sessions are completed without excessive modification'
        ],
        escalationRule: repeatedFlag
            ? `Classification repeated from prior cycle (${lastClassification}); increase monitoring frequency and consider stronger intervention.`
            : 'If the same issue appears in the next cycle, escalate the adjustment.',
        appliedRecommendation: false,
        recommendationSummary: recommendation?.title || '',
        baseline: {
            acuteVolume: Math.round(metrics.acuteVolume || 0),
            averageRpe: metrics.averageRpe || 0,
            recoveryScore: metrics.recoveryScore || 0,
            acwr: metrics.acwr || 1
        }
    };
};

const logDMAICSnapshot = async (athleteId, data) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'users', athleteId, 'dmaic_logs', dateStr);
    await setDoc(docRef, data, { merge: true });
};

export const getRecommendationForInsight = (classification) => {
    const rec = getFallbackRecommendation(classification);
    return {
        label: rec.title,
        description: rec.description,
        ...rec.specifics
    };
};

export const analyzePerformance = (metrics, readiness) => {
    const analysis = analyzeAdaptationState(metrics, { constraints: readiness || {} });
    return analysis.classification;
};

export const runWeeklyCheckIn = async (athleteId) => {
    const result = await runDMAICCycle(athleteId);
    return {
        ...result,
        recommendation: result.recommendation.description,
        coachInsight: result.recommendation.description
    };
};

export const generateCoachInsight = async (insights) => {
    const rec = getFallbackRecommendation(insights);
    return rec.description;
};

export default {
    runDMAICCycle,
    analyzePerformance,
    getRecommendationForInsight,
    runWeeklyCheckIn
};

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
        const status = analyzeAdaptationState(metrics, define);
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

export const analyzeAdaptationState = (metrics = {}, define = {}) => {
    const flags = metrics.flags || {};
    const reasoning = [];
    const decisionRules = [];
    let classification = 'Stable';

    if (flags.volumeSpike && (flags.highRpe || flags.lowRecovery)) {
        classification = 'Overreached';
        reasoning.push('Acute workload is high relative to chronic workload while recovery or RPE indicators are stressed.');
        decisionRules.push('If ACWR >= 1.5 and RPE is high or recovery is low, reduce volume and cap intensity.');
    } else if (metrics.fatigue_index >= 7.5 || (metrics.rpeTrend === 'up' && metrics.recoveryTrend === 'down')) {
        classification = 'Fatigued';
        reasoning.push('Fatigue markers are elevated or RPE is rising while recovery is falling.');
        decisionRules.push('If RPE rises and recovery falls across the monitoring window, reduce accessory volume 10-20%.');
    }

    if (flags.performanceDown > 0 && classification === 'Stable') {
        classification = 'Maladapted';
        reasoning.push('One or more movement trends are declining despite continued training exposure.');
        decisionRules.push('If performance trends down, reassess stimulus and reduce intensity or change exercise selection.');
    }

    if (flags.performanceFlat > 0 && metrics.fatigue_index < 6 && classification === 'Stable') {
        classification = 'Understimulated';
        reasoning.push('Performance is flat while fatigue is manageable, suggesting insufficient overload or stimulus mismatch.');
        decisionRules.push('If performance plateaus with low fatigue, increase overload or shift exercise stimulus.');
    }

    if (flags.performanceUp > flags.performanceFlat + flags.performanceDown && metrics.fatigue_index < 7.5) {
        classification = 'Advancing';
        reasoning.push('Performance is improving without excessive fatigue accumulation.');
        decisionRules.push('If performance improves and readiness remains acceptable, continue progression.');
    }

    if (define?.constraints?.injuryHistory || define?.constraints?.movementLimitations) {
        reasoning.push('Defined injury or movement constraints should shape exercise selection and progression speed.');
        decisionRules.push('If movement limitations are present, prioritize substitutions and conservative progression.');
    }

    if (reasoning.length === 0) {
        reasoning.push('Current training, recovery, and performance signals are balanced.');
        decisionRules.push('Maintain current plan while continuing weekly monitoring.');
    }

    return {
        classification,
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

    return fallbacks[classification] || fallbacks.Stable;
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
        monitoringFrequency: status.classification === 'Overreached' || status.classification === 'Maladapted'
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

/**
 * DMAICService.js - Advanced Edition
 * Operationalizes the IronLogic manuscript into adaptive coaching logic.
 */

import { getUserProfile, getWorkouts, setDoc, doc } from './firestoreService';
import { calculateMetrics } from './MetricsService';
import { chatWithAI } from './GeminiService';
import { db } from '../config/firebaseConfig';
import { logger } from '../utils/logger';

/**
 * Executes a full DMAIC cycle for an athlete.
 * This should be triggered after a session is finalized or weekly.
 */
export const runDMAICCycle = async (athleteId) => {
    logger.info('Starting DMAIC Cycle', { athleteId });
    try {
        // 1. DEFINE
        // Establishing athlete context, goals, and constraints.
        const profile = await getUserProfile(athleteId);
        const goals = {
            primary: profile?.primaryGoal || 'General Strength',
            constraints: profile?.constraints || {}
        };
        
        // 2. MEASURE
        // Gathering objective performance and subjective readiness data.
        const recentWorkouts = await getWorkouts(athleteId, 28); // 4 weeks for ACWR
        const metrics = calculateMetrics(recentWorkouts);
        
        // 3. ANALYZE
        // Transforming raw data into adaptation status classification.
        const status = analyzeAdaptationState(metrics, profile);
        
        // 4. IMPROVE
        // Converting analysis into intelligent programming adjustments.
        const recommendation = await generatePrescription(profile, status, metrics);
        
        // 5. CONTROL
        // Logging for longitudinal optimization and intervention tracking.
        await logDMAICSnapshot(athleteId, {
            goals,
            metrics,
            status,
            recommendation,
            timestamp: new Date().toISOString()
        });

        logger.info('DMAIC Cycle completed', { athleteId, status: status.classification });

        return {
            status,
            recommendation,
            metrics
        };
    } catch (error) {
        logger.error('Error in DMAIC Cycle', { athleteId, error: error.message });
        throw error;
    }
};

/**
 * Advanced Adaptation Analysis
 * Classifies athlete state according to the IronLogic Master Framework.
 */
export const analyzeAdaptationState = (metrics, profile) => {
    const { fatigue_index = 0, trend = {}, volume_load_avg = 0 } = metrics || {};
    
    // Simple ACWR (Acute:Chronic Workload Ratio) estimation
    // In a real app, calculate this more precisely over 7 vs 28 days
    const acwr = metrics.acwr || 1.0; 

    // Classification Logic
    let classification = 'Stable';
    let reasoning = [];

    // Detection: High Fatigue / Overreaching
    if (fatigue_index > 8.5 || acwr > 1.5) {
        classification = 'Overreached';
        reasoning.push('Acute workload spikes detected relative to chronic capacity.');
    } else if (fatigue_index > 7.5) {
        classification = 'Fatigued';
        reasoning.push('Elevated session RPE trends suggesting fatigue accumulation.');
    }

    // Detection: Progress / Stagnation
    const trendValues = Object.values(trend);
    const progressCount = trendValues.filter(v => v === 'up').length;
    const stagnantCount = trendValues.filter(v => v === 'flat').length;

    if (progressCount > (trendValues.length / 2)) {
        classification = 'Advancing';
        reasoning.push('Consistently improving performance metrics across major movements.');
    } else if (stagnantCount > (trendValues.length / 2) && classification === 'Stable') {
        classification = 'Understimulated';
        reasoning.push('Plateaued performance despite low fatigue levels.');
    }

    // Recovery check (if available in metrics)
    if (metrics.recovery_score < 40) {
        classification = 'Recovery Compromised';
        reasoning.push('Persistent low readiness and recovery scores.');
    }

    return {
        classification,
        reasoning,
        acwr,
        fatigueIndex: fatigue_index
    };
};

/**
 * Prescription Generation
 * Uses the Analyze phase results to modify training variables.
 */
const generatePrescription = async (profile, status, metrics) => {
    const systemPrompt = `
        You are the IronLogic AI Coaching Engine. 
        Follow the Master Framework logic based on the DMAIC manuscript.
        
        Athlete Profile: ${JSON.stringify(profile)}
        Current State: ${status.classification}
        Reasoning: ${status.reasoning.join(' ')}
        Performance Metrics: ${JSON.stringify(metrics)}

        Output a specific "IMPROVE" phase prescription.
        Follow these IronLogic rules:
        1. Adaptation over rigid programming.
        2. Progress aggressively when readiness permits.
        3. Protect recovery when adaptation stalls.
        4. Explain WHY the adjustment occurs (Master Framework style).
        
        Respond in JSON format:
        {
            "adjustmentType": "volume_reduction" | "intensity_increase" | "pivot" | "maintain",
            "title": "Short title",
            "description": "Clear explanation in the IronLogic style",
            "specifics": {
                "volume": "e.g. Reduce by 15%",
                "intensity": "e.g. Cap at RPE 7",
                "focus": "Focus of the week"
            }
        }
    `;

    try {
        const response = await chatWithAI([{ role: 'system', content: systemPrompt }]);
        // Note: In real app, ensure this is valid JSON
        return JSON.parse(response);
    } catch (e) {
        // Fallback Logic
        return getFallbackRecommendation(status.classification);
    }
};

const getFallbackRecommendation = (classification) => {
    const fallbacks = {
        'Overreached': {
            title: 'Deload Required',
            description: 'Workload spikes detected. Reducing volume to shed fatigue.',
            specifics: { volume: 'Reduce 30%', intensity: 'Cap RPE 6', focus: 'Recovery' }
        },
        'Fatigued': {
            title: 'Fatigue Management',
            description: 'Fatigue is climbing. Holding intensity, reducing accessories.',
            specifics: { volume: 'Reduce 15%', intensity: 'Maintain', focus: 'Crisp Reps' }
        },
        'Advancing': {
            title: 'Continue Progression',
            description: 'Performance is trending up. Continuing current load progression.',
            specifics: { volume: 'Stable', intensity: 'Increase 2-5%', focus: 'Execution' }
        },
        'Understimulated': {
            title: 'Introduce Stimulus',
            description: 'Performance is flat despite low fatigue. Increasing overload.',
            specifics: { volume: 'Increase 10%', intensity: 'Increase RPE target', focus: 'Overload' }
        },
        'Stable': {
            title: 'Stay the Course',
            description: 'Balanced adaptation and fatigue. Maintaining current plan.',
            specifics: { volume: 'Stable', intensity: 'Stable', focus: 'Consistency' }
        }
    };
    return fallbacks[classification] || fallbacks['Stable'];
};

const logDMAICSnapshot = async (athleteId, data) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'users', athleteId, 'dmaic_logs', dateStr);
    await setDoc(docRef, data, { merge: true });
};

// --- LEGACY EXPORTS FOR COMPATIBILITY ---

export const getRecommendationForInsight = (classification) => {
    const rec = getFallbackRecommendation(classification);
    return {
        label: rec.title,
        description: rec.description,
        ...rec.specifics
    };
};

export const analyzePerformance = (metrics, readiness) => {
    const analysis = analyzeAdaptationState(metrics, { ...readiness });
    return analysis.classification;
};

export const runWeeklyCheckIn = async (athleteId, currentReadiness = {}) => {
    // Wrapper for runDMAICCycle but returning the format expected by old components
    const result = await runDMAICCycle(athleteId);
    return {
        ...result,
        recommendation: result.recommendation.description,
        coachInsight: result.recommendation.description // or generate a specific insight
    };
};

export const generateCoachInsight = async (insights, metrics) => {
    const rec = getFallbackRecommendation(insights);
    return rec.description;
};

export default {
    runDMAICCycle,
    analyzePerformance,
    getRecommendationForInsight,
    runWeeklyCheckIn
};

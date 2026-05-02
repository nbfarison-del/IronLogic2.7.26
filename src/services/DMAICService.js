/**
 * DMAICService.js
 * Adaptive training engine using Define-Measure-Analyze-Improve-Control framework.
 */

import { getUserProfile, getWorkouts, setDoc, doc } from './firestoreService';
import { calculateMetrics } from './MetricsService';
import { chatWithAI } from './GeminiService';
import { db } from '../config/firebaseConfig';

export const runDMAICCycle = async (athleteId) => {
    try {
        // 1. DEFINE (Get profile and goals)
        const profile = await getUserProfile(athleteId);
        
        // 2. MEASURE (Gather recent workout data)
        const recentSessions = await getWorkouts(athleteId, 14); // Last 14 workouts
        const metrics = calculateMetrics(recentSessions);

        // 3. ANALYZE (Detect patterns)
        const insights = analyzePerformance(metrics);

        // 4. IMPROVE (Adjust program)
        const updatedProgram = await adjustProgram(profile, insights, metrics);

        // 5. CONTROL (Log outcome for learning)
        await logOutcome(athleteId, insights, updatedProgram, metrics);

        // Generate coaching insight via Gemini
        const coachInsight = await generateCoachInsight(insights, metrics);

        return {
            metrics,
            insights,
            program: updatedProgram,
            coachInsight
        };
    } catch (error) {
        console.error("Error in DMAIC Cycle:", error);
        throw error;
    }
};

/**
 * Identify patterns based on metrics and readiness
 */
export const analyzePerformance = (metrics, readiness = {}) => {
    const { fatigue_index = 0, trend = {} } = metrics || {};
    const { sleep, soreness, fatigue: mentalFatigue } = readiness;
    
    const FATIGUE_THRESHOLD = 8.5; 

    // 1. High Fatigue Detection (Physical + Mental)
    const isPhysicalOverload = fatigue_index > FATIGUE_THRESHOLD;
    const isMentalOverload = Number(mentalFatigue) > 7;
    const isUnderRecovered = (Number(sleep) < 6 || Number(soreness) > 7);

    if (isPhysicalOverload && isUnderRecovered) return "overreaching_danger";
    if (isPhysicalOverload) return "high_physical_fatigue";
    if (isMentalOverload) return "lifestyle_stress_high";

    // 2. Plateau Detection (Multi-Factor, all exercises)
    const trendValues = Object.values(trend);
    const upCount = trendValues.filter(v => v === 'up').length;
    const downCount = trendValues.filter(v => v === 'down').length;
    const flatCount = trendValues.filter(v => v === 'flat').length;
    
    const isOverallFlat = flatCount > (trendValues.length / 2);
    const isOverallDropping = downCount > (trendValues.length / 3);
    const isOverallProgressing = upCount > 0;

    if (isOverallDropping && isPhysicalOverload) {
        return "accumulated_fatigue_plateau";
    }

    if (isOverallFlat && isUnderRecovered) {
        return "recovery_lead_plateau";
    }

    if (isOverallFlat && !isPhysicalOverload) {
        return "true_plateau"; 
    }

    if (isOverallProgressing) {
        return "progressing";
    }

    return "maintaining";
};

/**
 * Logic for program adjustments
 */
const RECOMMENDATION_MAP = {
    overreaching_danger: {
        type: 'deload',
        label: 'Deload Required',
        description: 'High training load is paired with poor readiness. Reduce volume 30-40%, cap top sets around RPE 6-7, and avoid adding load until sleep/soreness normalize.',
        action: 'reduce_volume_and_intensity',
        intensityShift: 'Reduce intensity to RPE 6-7.',
        volumeShift: 'Reduce total working sets by 30-40%.',
        focus: 'Restore readiness before pushing adaptation.',
        requiresCoachReview: true
    },
    high_physical_fatigue: {
        type: 'fatigue_management',
        label: 'Manage Physical Fatigue',
        description: 'Physical fatigue is elevated. Hold main lift intensity steady and reduce accessory volume so the athlete can recover without losing skill practice.',
        action: 'reduce_volume',
        intensityShift: 'Keep main work stable; avoid new PR attempts.',
        volumeShift: 'Reduce accessories and back-off work by 15-25%.',
        focus: 'Keep reps crisp and stop sets before technical breakdown.',
        requiresCoachReview: false
    },
    lifestyle_stress_high: {
        type: 'readiness_adjustment',
        label: 'Readiness Constraint',
        description: 'Reported mental fatigue is high. Keep the plan simple, lower optional work, and use RPE caps to avoid forcing load on a low-readiness week.',
        action: 'cap_rpe',
        intensityShift: 'Cap top sets at RPE 7.',
        volumeShift: 'Keep only the highest-priority accessories.',
        focus: 'Protect consistency while life stress is high.',
        requiresCoachReview: false
    },
    accumulated_fatigue_plateau: {
        type: 'pivot',
        label: 'Pivot Block',
        description: 'Performance is dropping while fatigue is high. Move into a low-stress pivot week with close variations and lower total stress.',
        action: 'pivot_block',
        intensityShift: 'Use close variations at RPE 6-7.',
        volumeShift: 'Reduce total volume by 25-35%.',
        focus: 'Shed fatigue while maintaining movement practice.',
        requiresCoachReview: true
    },
    recovery_lead_plateau: {
        type: 'recovery_first',
        label: 'Recovery-Led Plateau',
        description: 'Performance is flat while readiness is poor. Maintain the core lifts, remove nonessential work, and prioritize sleep and soreness management.',
        action: 'recovery_intervention',
        intensityShift: 'Hold loads steady; no forced progression.',
        volumeShift: 'Reduce optional volume by 15-25%.',
        focus: 'Improve recovery before changing exercise selection.',
        requiresCoachReview: false
    },
    true_plateau: {
        type: 'variation_shift',
        label: 'Variation Shift',
        description: 'Performance is broadly flat without a clear fatigue signal. Keep the development block structure but rotate one stalled lift to a close variation.',
        action: 'swap_variation',
        intensityShift: 'Keep effort targets similar at RPE 7-8.',
        volumeShift: 'Maintain weekly set count unless readiness changes.',
        focus: 'Introduce a specific stress change without rebuilding the whole plan.',
        requiresCoachReview: false
    },
    progressing: {
        type: 'progression',
        label: 'Progressing',
        description: 'Performance is trending up. Continue the microcycle and apply a conservative load increase where bar speed and RPE support it.',
        action: 'increase_load',
        intensityShift: 'Increase main lift load by 2.5-5% only if target RPE is preserved.',
        volumeShift: 'Keep volume stable.',
        focus: 'Repeat what is working and avoid unnecessary novelty.',
        requiresCoachReview: false
    },
    maintaining: {
        type: 'maintenance',
        label: 'Maintain Course',
        description: 'No strong fatigue, plateau, or progression signal was detected. Keep the current plan and collect another week of clean data.',
        action: 'maintain',
        intensityShift: 'Keep planned load and RPE targets.',
        volumeShift: 'Keep weekly set count stable.',
        focus: 'Improve data quality and execution consistency.',
        requiresCoachReview: false
    }
};

export const getRecommendationForInsight = (insights) => {
    return RECOMMENDATION_MAP[insights] || RECOMMENDATION_MAP.maintaining;
};

/**
 * Logic for program adjustments
 */
export const adjustProgram = async (_profile, insights) => getRecommendationForInsight(insights);

/**
 * Log the current state for future refinement
 */
const logOutcome = async (athleteId, insights, adjustment, metrics) => {
    const docRef = doc(db, 'users', athleteId, 'performanceOutcome', new Date().toISOString().split('T')[0]);
    await setDoc(docRef, {
        insights,
        adjustment,
        metrics,
        timestamp: new Date().toISOString()
    }, { merge: true });
};

export const runWeeklyCheckIn = async (athleteId, currentReadiness = {}) => {
    try {
        // 1. DEFINE
        const profile = await getUserProfile(athleteId);
        
        // 2. MEASURE
        const allWorkouts = await getWorkouts(athleteId, 21); // Last 21 for trend comparison
        const lastWeekWorkouts = allWorkouts.filter(w => {
            const wDate = new Date(w.date);
            const now = new Date();
            const diff = (now - wDate) / (1000 * 60 * 60 * 24);
            return diff <= 7;
        });
        
        const metrics = calculateMetrics(allWorkouts, currentReadiness, 7);
        
        // 3. ANALYZE (Multi-factor)
        const insights = analyzePerformance(metrics, currentReadiness);

        // 4. IMPROVE
        const nextWeekRecommendation = await generateNextWeekPlan(profile, insights, metrics, currentReadiness);

        // 5. CONTROL
        // Update Overarching goal in profile for persistent tracking
        if (currentReadiness.overarchingGoal) {
            await setDoc(doc(db, 'users', athleteId, 'profile', 'data'), {
                overarchingGoal: currentReadiness.overarchingGoal
            }, { merge: true });
        }

        // We'll log this as a check-in
        const checkinRef = doc(db, 'users', athleteId, 'weeklyCheckins', new Date().toISOString().split('T')[0]);
        await setDoc(checkinRef, {
            date: new Date().toISOString(),
            metrics,
            insights,
            recommendation: nextWeekRecommendation,
            readiness: currentReadiness,
            overarchingGoal: currentReadiness.overarchingGoal,
            weeklySmallGoal: currentReadiness.weeklySmallGoal
        }, { merge: true });

        const coachInsight = await generateCoachInsight(insights, metrics);

        return {
            lastWeekWorkouts,
            metrics,
            insights,
            recommendation: nextWeekRecommendation,
            coachInsight,
            overarchingGoal: currentReadiness.overarchingGoal,
            weeklySmallGoal: currentReadiness.weeklySmallGoal
        };
    } catch (e) {
        console.error("Weekly Check-in Error:", e);
        throw e;
    }
};

const generateNextWeekPlan = async (profile, insights, metrics, readiness) => {
    const deterministicRecommendation = getRecommendationForInsight(insights);
    // Combine metrics and readiness for a smart next week recommendation
    const prompt = `
        You are a strength coach using the IronLogic DMAIC framework.
        Previous Week Metrics: ${JSON.stringify(metrics)}
        Athlete Readiness: ${JSON.stringify(readiness)}
        Pattern: ${insights}
        Required Strategy: ${JSON.stringify(deterministicRecommendation)}

        TASK:
        Generate a specific recommendation for the NEXT WEEK of training. Stay consistent with the required strategy above.
        Include:
        1. Intensity shift (e.g. increase weight by 2kg on main lifts)
        2. Volume shift (e.g. add 1 set to accessories)
        3. A brief "Focus of the Week" instruction.
        
        Respond in a clear, bulleted format.
    `;

    try {
        const response = await chatWithAI([{ role: 'user', content: prompt }]);
        return response;
    } catch {
        return [
            `- Intensity: ${deterministicRecommendation.intensityShift}`,
            `- Volume: ${deterministicRecommendation.volumeShift}`,
            `- Focus of the Week: ${deterministicRecommendation.focus}`
        ].join('\n');
    }
};

/**
 * AI Coaching Insight
 */
export const generateCoachInsight = async (insights, metrics) => {
    const prompt = `
        You are an expert strength coach using ILM.
        Athlete Metrics from last 7 days:
        - Recent e1RM Trends: ${JSON.stringify(metrics.e1rm)}
        - Fatigue Index (RPE): ${metrics.fatigue_index}/10
        - Detected Pattern: ${insights}

        TASK:
        1. Contextualize progress across ALL exercises.
        2. Propose a brief adjustment strategy for next week.
        3. Be concise and motivating (2-3 sentences).
    `;

    try {
        const response = await chatWithAI([{ role: 'user', content: prompt }]);
        return response;
    } catch {
        const fallback = getRecommendationForInsight(insights);
        return `${fallback.label}: ${fallback.description}`;
    }
};

export default {
    runDMAICCycle,
    analyzePerformance,
    adjustProgram
};

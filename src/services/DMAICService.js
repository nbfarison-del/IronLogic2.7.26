/**
 * DMAICService.js
 * Adaptive training engine using Define-Measure-Analyze-Improve-Control framework.
 */

import { getUserProfile, getWorkouts, addWorkout, saveAIProgram, setDoc, doc } from './firestoreService';
import { calculateMetrics } from './MetricsService';
import { chatWithAI } from './GeminiService';
import { db } from '../config/firebaseConfig';

export const runDMAICCycle = async (athleteId) => {
    try {
        // 1. DEFINE (Get profile and goals)
        const profile = await getUserProfile(athleteId);
        const goals = profile?.goals || {};
        
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
    const { fatigue_index, e1rm, trend } = metrics;
    const { sleep, soreness, fatigue: mentalFatigue, weight } = readiness;
    
    const FATIGUE_THRESHOLD = 8.5; 
    const RECOVERY_FAIL_THRESHOLD = 5; // e.g., < 6 hrs sleep or > 7/10 soreness

    // 1. High Fatigue Detection (Physical + Mental)
    const isPhysicalOverload = fatigue_index > FATIGUE_THRESHOLD;
    const isMentalOverload = mentalFatigue > 7;
    const isUnderRecovered = (sleep < 6 || soreness > 7);

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

    if (isOverallFlat && !isPhysicalOverload) {
        return "true_plateau"; 
    }
    
    if (isOverallDropping && isPhysicalOverload) {
        return "accumulated_fatigue_plateau";
    }

    if (isOverallFlat && isUnderRecovered) {
        return "recovery_lead_plateau";
    }

    if (isOverallProgressing) {
        return "progressing";
    }

    return "maintaining";
};

/**
 * Logic for program adjustments
 */
const adjustProgram = async (profile, insights, metrics) => {
    // This would ideally interact with currently assigned programs
    // or generate a new block with updated intensity/volume
    
    let adjustment = { type: 'none', description: 'Maintain current program.' };

    switch (insights) {
        case "high_fatigue":
            adjustment = { 
                type: 'deload', 
                description: 'Fatigue is high. Reducing volume by 20% while maintaining intensity to recover.',
                action: 'reduce_volume'
            };
            break;
        case "progressing":
            adjustment = { 
                type: 'progression', 
                description: 'Progress looks good! Increasing load by 2.5-5% on main lifts.',
                action: 'increase_load'
            };
            break;
        case "plateau":
            adjustment = { 
                type: 'adjustment', 
                description: 'Progress has stalled. Swapping a variation (e.g. Pause Squat) for the plateaued lift.',
                action: 'swap_variation'
            };
            break;
        default:
            break;
    }

    return adjustment;
};

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
    // Combine metrics and readiness for a smart next week recommendation
    const prompt = `
        You are a strength coach using the IronLogic DMAIC framework.
        Previous Week Metrics: ${JSON.stringify(metrics)}
        Athlete Readiness: ${JSON.stringify(readiness)}
        Pattern: ${insights}

        TASK:
        Generate a specific recommendation for the NEXT WEEK of training.
        Include:
        1. Intensity shift (e.g. increase weight by 2kg on main lifts)
        2. Volume shift (e.g. add 1 set to accessories)
        3. A brief "Focus of the Week" instruction.
        
        Respond in a clear, bulleted format.
    `;

    try {
        const response = await chatWithAI([{ role: 'user', content: prompt }]);
        return response;
    } catch (e) {
        return "Increase load slightly on main lifts (+2.5kg) while maintaining sets/reps.";
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
    } catch (e) {
        return "Maintaining course. Focus on high-quality execution and managing recovery as highlighted in the directives.";
    }
};

export default {
    runDMAICCycle,
    analyzePerformance,
    adjustProgram
};

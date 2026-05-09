/**
 * ILMService.js
 * Core adaptive intelligence framework for IronLogic Method.
 * Implements DMAIC (Define, Measure, Analyze, Improve, Control).
 */

import { db } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { calculateMetrics } from './MetricsService';
import { chatWithAI } from './GeminiService';

// --- MUSCLE GROUP MAPPING ---
const MUSCLE_GROUPS = {
    'bb_squat': ['quads', 'glutes', 'lower_back'],
    'bb_bench': ['chest', 'front_delt', 'triceps'],
    'bb_deadlift': ['glutes', 'hamstrings', 'lower_back', 'traps'],
    'bb_ohp': ['front_delt', 'triceps', 'traps'],
    'bb_row': ['lats', 'rear_delt', 'biceps'],
    'bb_rdl': ['hamstrings', 'glutes'],
    'bb_front_squat': ['quads', 'upper_back'],
    'db_press': ['chest', 'front_delt', 'triceps'],
    'lat_pulldown': ['lats', 'biceps'],
    'face_pull': ['rear_delt', 'traps'],
    'tricep_pushdown': ['triceps'],
    'db_curl': ['biceps']
};

// --- 1. DEFINE: Training Intent Profile ---

export const saveTrainingIntent = async (userId, intent) => {
    const intentRef = doc(db, 'users', userId, 'ilm', 'intent');
    const profile = {
        goalType: intent.goalType || 'strength', // strength, hypertrophy, powerlifting, etc.
        constraints: {
            daysPerWeek: intent.daysPerWeek || 3,
            sessionDuration: intent.sessionDuration || 60,
            equipment: intent.equipment || ['barbell', 'bench', 'rack'],
            injuries: intent.injuries || []
        },
        updatedAt: new Date().toISOString()
    };
    await setDoc(intentRef, profile, { merge: true });
    return profile;
};

export const getTrainingIntent = async (userId) => {
    const intentRef = doc(db, 'users', userId, 'ilm', 'intent');
    const snap = await getDoc(intentRef);
    return snap.exists() ? snap.data() : null;
};

// --- 2. MEASURE: Data Ingestion Layer ---

export const ingestPerformanceData = async (userId, days = 14) => {
    // This aggregates workouts and planned sessions
    const workoutsRef = collection(db, 'users', userId, 'workouts');
    const plannedRef = collection(db, 'users', userId, 'plannedWorkouts');
    
    // In a real app, we'd filter by date in the query
    const [wSnap, pSnap] = await Promise.all([
        getDocs(query(workoutsRef, orderBy('date', 'desc'), limit(50))),
        getDocs(query(plannedRef, orderBy('date', 'desc'), limit(50)))
    ]);

    const workouts = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const planned = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // C. Volume Load per Muscle Group
    const volumePerMuscle = {};
    workouts.slice(0, 10).forEach(w => {
        const muscles = MUSCLE_GROUPS[w.exerciseId] || ['other'];
        const vol = (parseFloat(w.weight || 0) * parseFloat(w.reps || 0));
        muscles.forEach(m => {
            volumePerMuscle[m] = (volumePerMuscle[m] || 0) + vol;
        });
    });

    return { workouts, planned, volumePerMuscle };
};

// --- 3. ANALYZE: Adaptive Decision Engine ---

export const analyzeTrainingStatus = (performanceData, readiness = {}) => {
    const { workouts, planned } = performanceData;
    const metrics = calculateMetrics(workouts, readiness);
    
    // A. Adherence Calculation
    const recentPlanned = planned.slice(0, 5);
    const completedPlanned = recentPlanned.filter(p => 
        workouts.some(w => w.date === p.date && (w.planName === p.name || w.exerciseName === p.exerciseName))
    ).length;
    const adherence = recentPlanned.length > 0 ? (completedPlanned / recentPlanned.length) * 100 : 100;

    // B. Performance Trend Score
    const trends = Object.values(metrics.trend);
    const upCount = trends.filter(t => t === 'up').length;
    const downCount = trends.filter(t => t === 'down').length;
    const trendScore = trends.length > 0 ? ((upCount - downCount) / trends.length) * 50 + 50 : 50;

    // C. Fatigue Score (Inverse of fatigue index)
    const fatigueIndex = metrics.fatigue_index || 0;
    const fatigueScore = Math.max(0, 100 - (fatigueIndex * 10));

    // D. Training Status Score (0-100)
    const statusScore = Math.round(
        (trendScore * 0.4) + 
        (fatigueScore * 0.3) + 
        (adherence * 0.2) + 
        ((readiness.readiness || 50) * 0.1)
    );

    // E. Category Classification
    let category = 'Stable';
    if (statusScore >= 85) category = 'Progressing';
    else if (statusScore < 30) category = 'Regression';
    else if (fatigueScore < 40) category = 'Fatigued';
    else if (trendScore < 45) category = 'Stalled';

    return {
        score: statusScore,
        category,
        metrics: {
            adherence,
            trendScore,
            fatigueScore,
            volumePerMuscle: performanceData.volumePerMuscle,
            rawMetrics: metrics
        }
    };
};

// --- 4. IMPROVE: Auto-Adjustment Engine ---

export const generateAdjustments = (analysis, intent) => {
    const { category, score } = analysis;
    const adjustments = {
        loadProgression: 1.0, // Multiplier for standard progression
        volumeModifier: 1.0,  // Multiplier for set count
        intensityCap: 10,     // Max RPE
        instruction: '',
        triggers: []
    };

    switch (category) {
        case 'Progressing':
            adjustments.loadProgression = 1.25;
            adjustments.instruction = "High responsiveness detected. Aggressive progression authorized.";
            break;
        case 'Fatigued':
            adjustments.volumeModifier = 0.7;
            adjustments.intensityCap = 7;
            adjustments.instruction = "Fatigue thresholds breached. Implementing 30% volume reduction.";
            adjustments.triggers.push('DELOAD_PRIORITY');
            break;
        case 'Stalled':
            adjustments.instruction = "Plateau detected. System recommends exercise rotation or load reset.";
            adjustments.triggers.push('VARIATION_SWAP');
            break;
        case 'Regression':
            adjustments.volumeModifier = 0.5;
            adjustments.loadProgression = 0.8;
            adjustments.instruction = "Significant performance regression. Emergency deload triggered.";
            break;
        default:
            adjustments.instruction = "Stable performance. Maintain current trajectory.";
    }

    return adjustments;
};

// --- AI RECOMMENDATION HELPER (Explainable Adjustment) ---

export const generateDetailedRecommendation = async (analysis, adjustments, intent) => {
    const prompt = `
        You are a senior strength coach using the IronLogic Method (ILM).
        
        ATHLETE STATUS:
        - Score: ${analysis.score}/100
        - Category: ${analysis.category}
        - Adherence: ${analysis.metrics.adherence}%
        - Muscle Volume Analysis: ${JSON.stringify(analysis.metrics.volumePerMuscle)}
        
        PROPOSED ADJUSTMENTS:
        - Load progression multiplier: ${adjustments.loadProgression}
        - Volume modifier: ${adjustments.volumeModifier}
        - Intensity cap: RPE ${adjustments.intensityCap}
        - Triggers: ${adjustments.triggers.join(', ') || 'None'}
        
        INTENT CONSTRAINTS:
        - Goals: ${intent?.goalType}
        - Constraints: ${JSON.stringify(intent?.constraints)}
        
        TASK:
        Explain these adjustments to the athlete in a motivating but scientific way. 
        Provide 3 clear bullets for next week:
        1. Primary Focus
        2. Specific Intensity/Load change
        3. Volume/Set change
    `;

    try {
        return await chatWithAI([{ role: 'user', content: prompt }]);
    } catch (e) {
        return adjustments.instruction;
    }
};

// --- UNIFIED WORKFLOW: Weekly Check-In ---

export const runILMCheckIn = async (userId, readiness = {}) => {
    // 1. DEFINE
    const intent = await getTrainingIntent(userId);
    
    // 2. MEASURE
    const performanceData = await ingestPerformanceData(userId);
    
    // 3. ANALYZE
    const analysis = analyzeTrainingStatus(performanceData, readiness);
    
    // 4. IMPROVE
    const adjustments = generateAdjustments(analysis, intent);
    const detailedRecommendation = await generateDetailedRecommendation(analysis, adjustments, intent);
    
    // 5. CONTROL
    const log = await applyAndPersistAdjustment(userId, analysis, { ...adjustments, detailedRecommendation });
    
    return {
        analysis,
        adjustments: { ...adjustments, detailedRecommendation },
        performanceData,
        log
    };
};

export const applyAndPersistAdjustment = async (userId, analysis, adjustments) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const logRef = doc(db, 'users', userId, 'ilm', 'history', 'adjustments', dateStr);
    
    const stateRecord = {
        timestamp: new Date().toISOString(),
        analysis,
        adjustments,
        version: Date.now()
    };

    await setDoc(logRef, stateRecord);
    
    // Also update the current status in the user profile for quick lookup
    const statusRef = doc(db, 'users', userId, 'ilm', 'status');
    await setDoc(statusRef, {
        currentScore: analysis.score,
        currentCategory: analysis.category,
        lastAdjustment: adjustments.instruction,
        updatedAt: new Date().toISOString()
    }, { merge: true });

    return stateRecord;
};

export default {
    saveTrainingIntent,
    getTrainingIntent,
    ingestPerformanceData,
    analyzeTrainingStatus,
    generateAdjustments,
    applyAndPersistAdjustment
};

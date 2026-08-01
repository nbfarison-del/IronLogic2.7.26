import { olympicExerciseById } from '../data/olympicWeightlifting';
import { isOlympicExercise } from '../utils/olympicWeightlifting';

export const OLYMPIC_PROFILE_DEFAULTS = {
    snatch1RM: '',
    cleanJerk1RM: '',
    frontSquat1RM: '',
    backSquat1RM: '',
    pushPress1RM: '',
    trainingAge: '',
    competitionExperience: 'Novice',
    weeklyTrainingAvailability: 4,
    upcomingMeetDate: '',
    mockMeetDate: '',
    testingDate: '',
    equipmentAvailability: [],
    injuryLimitations: '',
    goals: ''
};

export const WEAK_POINT_ACCESSORIES = {
    weak_pull: ['oly_snatch_pull', 'oly_clean_pull', 'oly_deficit_pull'],
    weak_turnover: ['oly_muscle_snatch', 'oly_tall_snatch', 'oly_hang_snatch'],
    weak_receiving_position: ['oly_snatch_balance', 'oly_overhead_squat', 'oly_pause_front_squat'],
    weak_jerk: ['oly_push_press', 'oly_split_jerk', 'oly_jerk_balance', 'oly_power_jerk'],
    weak_front_squat: ['oly_front_squat', 'oly_pause_front_squat', 'oly_tempo_front_squat'],
    weak_overhead_stability: ['oly_overhead_squat', 'oly_snatch_balance', 'oly_push_press']
};

export const EXERCISE_SUBSTITUTIONS = {
    oly_snatch_pull: ['oly_block_pull', 'oly_deficit_pull', 'oly_paused_pull'],
    oly_clean_pull: ['oly_block_pull', 'oly_deficit_pull', 'oly_paused_pull'],
    oly_front_squat: ['oly_tempo_front_squat', 'oly_pause_front_squat'],
    bb_front_squat: ['oly_tempo_front_squat', 'oly_pause_front_squat'],
    oly_split_jerk: ['oly_power_jerk', 'oly_push_jerk', 'oly_jerk_balance'],
    oly_snatch: ['oly_power_snatch', 'oly_hang_snatch', 'oly_muscle_snatch'],
    oly_clean_and_jerk: ['oly_power_clean', 'oly_hang_clean', 'oly_split_jerk']
};

const numberOrZero = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getDateOnly = (value) => {
    if (!value) return '';
    return String(value).includes('T') ? String(value).split('T')[0] : String(value);
};

const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const target = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Math.ceil((target - today) / 86400000);
};

export const getOlympicProfile = (profile = {}) => ({
    ...OLYMPIC_PROFILE_DEFAULTS,
    ...(profile?.olympicWeightliftingProfile || {}),
    snatch1RM: profile?.olympicWeightliftingProfile?.snatch1RM || profile?.maxes?.oly_snatch || '',
    cleanJerk1RM: profile?.olympicWeightliftingProfile?.cleanJerk1RM || profile?.maxes?.oly_clean_and_jerk || '',
    frontSquat1RM: profile?.olympicWeightliftingProfile?.frontSquat1RM || profile?.maxes?.oly_front_squat || profile?.maxes?.bb_front_squat || '',
    backSquat1RM: profile?.olympicWeightliftingProfile?.backSquat1RM || profile?.maxes?.bb_squat || '',
    pushPress1RM: profile?.olympicWeightliftingProfile?.pushPress1RM || profile?.maxes?.oly_push_press || ''
});

export const calculateCompetitionPhase = (profile = {}) => {
    const olympicProfile = getOlympicProfile(profile);
    const meetDays = daysUntil(olympicProfile.upcomingMeetDate);
    if (meetDays === null) return { name: 'General Prep', volumeMultiplier: 1, intensityBias: 0, daysUntilMeet: null };
    if (meetDays <= 7) return { name: 'Taper', volumeMultiplier: 0.45, intensityBias: -5, daysUntilMeet: meetDays };
    if (meetDays <= 21) return { name: 'Peaking', volumeMultiplier: 0.65, intensityBias: 5, daysUntilMeet: meetDays };
    if (meetDays <= 49) return { name: 'Intensification', volumeMultiplier: 0.85, intensityBias: 3, daysUntilMeet: meetDays };
    return { name: 'Accumulation', volumeMultiplier: 1.12, intensityBias: -3, daysUntilMeet: meetDays };
};

const latestByExercise = (workouts = [], exerciseIds = [], predicate = null) => {
    const ids = new Set(exerciseIds);
    return workouts
        .filter(w => ids.has(w.exerciseId) && numberOrZero(w.estimated1RM || w.weight) > 0)
        .filter(w => !predicate || predicate(w))
        .sort((a, b) => new Date(getDateOnly(b.date)) - new Date(getDateOnly(a.date)))[0];
};

export const analyzeWeakPoints = (profile = {}, workouts = []) => {
    const p = getOlympicProfile(profile);
    const cleanJerk = numberOrZero(p.cleanJerk1RM) || numberOrZero(latestByExercise(workouts, ['oly_clean_and_jerk'])?.estimated1RM);
    const frontSquat = numberOrZero(p.frontSquat1RM) || numberOrZero(latestByExercise(workouts, ['oly_front_squat', 'bb_front_squat'])?.estimated1RM);
    const backSquat = numberOrZero(p.backSquat1RM) || numberOrZero(latestByExercise(workouts, ['bb_squat'], w => w.modifiers?.bar !== 'Low Bar')?.estimated1RM);
    const pushPress = numberOrZero(p.pushPress1RM) || numberOrZero(latestByExercise(workouts, ['oly_push_press', 'bb_ohp'])?.estimated1RM);

    const olympicSets = workouts.filter(w => w.sport === 'olympic_weightlifting' || isOlympicExercise(w));
    const recentMisses = olympicSets.slice(0, 40).filter(w => w.olympicSet?.missedLift);
    const noteText = olympicSets.slice(0, 60).map(w => JSON.stringify(w.technicalNotes || {}).toLowerCase()).join(' ');

    const flags = [];
    if (frontSquat && cleanJerk && frontSquat / cleanJerk < 1.12) flags.push('weak_front_squat');
    if (backSquat && cleanJerk && cleanJerk / backSquat < 0.68) flags.push('weak_pull');
    if (pushPress && cleanJerk && pushPress / cleanJerk < 0.72) flags.push('weak_jerk');
    if (/turnover|elbow|slow under|pull under/.test(noteText)) flags.push('weak_turnover');
    if (/catch|receive|rack|bottom|depth|crash/.test(noteText)) flags.push('weak_receiving_position');
    if (/overhead|lockout|press out|unstable|balance/.test(noteText)) flags.push('weak_overhead_stability');
    if (recentMisses.some(w => /jerk/i.test(w.exerciseName || ''))) flags.push('weak_jerk');
    if (recentMisses.some(w => /pull|clean|snatch/i.test(w.exerciseName || ''))) flags.push('weak_pull');

    const uniqueFlags = [...new Set(flags)];
    return {
        flags: uniqueFlags,
        ratios: {
            frontSquatToCleanJerk: cleanJerk ? Math.round((frontSquat / cleanJerk) * 100) : 0,
            cleanJerkToBackSquat: backSquat ? Math.round((cleanJerk / backSquat) * 100) : 0,
            pushPressToCleanJerk: cleanJerk ? Math.round((pushPress / cleanJerk) * 100) : 0
        },
        accessories: uniqueFlags.flatMap(flag => WEAK_POINT_ACCESSORIES[flag] || []).map(id => olympicExerciseById[id]?.name || id),
        dmaic: {
            define: p.goals || 'Improve Olympic weightlifting total',
            measure: 'Compare lift ratios, e1RM trends, readiness, misses, and technical notes.',
            analyze: uniqueFlags.length ? uniqueFlags.map(flag => flag.replaceAll('_', ' ')).join(', ') : 'No major weak point flagged yet.',
            improve: uniqueFlags.flatMap(flag => WEAK_POINT_ACCESSORIES[flag] || []).slice(0, 6).map(id => olympicExerciseById[id]?.name || id),
            control: 'Review after each finalized session and weekly trend update.'
        }
    };
};

export const getRecoveryAdjustment = (sessionFeedback = {}, recoveryHistory = []) => {
    const latestRecovery = recoveryHistory?.[0] || {};
    const recoveryScore = numberOrZero(sessionFeedback.recoveryScore || latestRecovery.score || latestRecovery.recoveryScore);
    const sleepQuality = numberOrZero(sessionFeedback.sleepQuality || latestRecovery.sleepQuality);
    const motivation = numberOrZero(sessionFeedback.motivationLevel || latestRecovery.motivation);
    const pain = numberOrZero(sessionFeedback.painScore || latestRecovery.painScore || latestRecovery.soreness);
    const sessionRpe = numberOrZero(sessionFeedback.sessionRpe);
    const readiness = [recoveryScore, sleepQuality, motivation].filter(Boolean);
    const readinessScore = readiness.length ? Math.round(readiness.reduce((sum, val) => sum + val, 0) / readiness.length) : 7;

    if (pain >= 7 || readinessScore <= 4 || sessionRpe >= 9.5) {
        return { readinessScore, volumeMultiplier: 0.75, intensityMultiplier: 0.95, note: 'Poor recovery: reduce volume 15-25% and select lower-risk variations.' };
    }
    if (readinessScore >= 8 && pain <= 3 && sessionRpe <= 8) {
        return { readinessScore, volumeMultiplier: 1.05, intensityMultiplier: 1.03, note: 'Excellent recovery: increase prescribed load 2-5% if technique stays crisp.' };
    }
    return { readinessScore, volumeMultiplier: 1, intensityMultiplier: 1, note: 'Readiness is acceptable: keep the planned dose stable.' };
};

export const buildOlympicSession = ({ profile = {}, workouts = [], recovery = [], sessionFeedback = {} } = {}) => {
    const phase = calculateCompetitionPhase(profile);
    const weakPointAnalysis = analyzeWeakPoints(profile, workouts);
    const recoveryAdjustment = getRecoveryAdjustment(sessionFeedback, recovery);
    const volumeMultiplier = phase.volumeMultiplier * recoveryAdjustment.volumeMultiplier;
    const intensityShift = phase.intensityBias;
    const primaryWeakness = weakPointAnalysis.flags[0];

    const snatchVariation = primaryWeakness === 'weak_turnover' ? 'oly_muscle_snatch' : primaryWeakness === 'weak_receiving_position' ? 'oly_snatch_balance' : 'oly_snatch';
    const cjVariation = primaryWeakness === 'weak_jerk' ? 'oly_split_jerk' : primaryWeakness === 'weak_pull' ? 'oly_clean_pull' : 'oly_clean_and_jerk';

    const setsFor = (base) => Math.max(1, Math.round(base * volumeMultiplier));
    const pct = (base) => `${Math.max(45, Math.min(95, base + intensityShift))}%`;

    return {
        name: `Iron Logic Weightlifting - ${phase.name}`,
        trainingMode: 'olympic_weightlifting',
        phase,
        recoveryAdjustment,
        weakPointAnalysis,
        exercises: [
            { exerciseId: snatchVariation, exerciseName: olympicExerciseById[snatchVariation]?.name || 'Snatch', sets: setsFor(4), reps: '1-2', targetRpe: 7, percentageOf1RM: pct(75), notes: 'Snatch priority. DMAIC Improve: technical exposure before fatigue.' },
            { exerciseId: cjVariation, exerciseName: olympicExerciseById[cjVariation]?.name || 'Clean and Jerk', sets: setsFor(4), reps: cjVariation.includes('pull') ? '2-3' : '1+1', targetRpe: 7.5, percentageOf1RM: pct(78), notes: 'Clean and jerk priority. Keep misses below 10%.' },
            { exerciseId: 'oly_front_squat', exerciseName: 'Front Squat', sets: setsFor(3), reps: '2-4', targetRpe: 8, percentageOf1RM: pct(82), notes: 'Squat strength for receiving and clean recovery.' },
            { exerciseId: primaryWeakness === 'weak_pull' ? 'oly_deficit_pull' : 'oly_clean_pull', exerciseName: primaryWeakness === 'weak_pull' ? 'Deficit Pull' : 'Clean Pull', sets: setsFor(3), reps: '2-4', targetRpe: 7.5, percentageOf1RM: pct(90), notes: 'Pull volume matched to current weak point.' },
            { exerciseId: 'oly_push_press', exerciseName: 'Push Press', sets: setsFor(3), reps: '3-5', targetRpe: 7, percentageOf1RM: pct(70), notes: 'Pressing support for jerk and overhead control.' },
            ...weakPointAnalysis.flags.slice(0, 2).flatMap(flag => (WEAK_POINT_ACCESSORIES[flag] || []).slice(0, 2).map(id => ({ id, flag }))).map(item => ({
                exerciseId: item.id,
                exerciseName: olympicExerciseById[item.id]?.name || item.id,
                sets: 2,
                reps: '3-5',
                targetRpe: 7,
                notes: `Accessory from weak point analysis: ${item.flag.replaceAll('_', ' ')}.`
            }))
        ]
    };
};

export const getOlympicProgressDashboard = (workouts = [], recovery = []) => {
    const targets = {
        snatch: ['oly_snatch'],
        cleanJerk: ['oly_clean_and_jerk', 'oly_clean', 'oly_split_jerk'],
        frontSquat: ['oly_front_squat', 'bb_front_squat'],
        backSquat: ['bb_squat'],
    };

    const buildTrend = (ids, predicate) => workouts
        .filter(w => ids.includes(w.exerciseId) && (w.estimated1RM || w.weight))
        .filter(w => !predicate || predicate(w))
        .sort((a, b) => new Date(getDateOnly(a.date)) - new Date(getDateOnly(b.date)))
        .map(w => {
            const volume = numberOrZero(w.weight) * numberOrZero(w.reps) * numberOrZero(w.sets || 1);
            return {
                date: getDateOnly(w.date),
                e1rm: numberOrZero(w.estimated1RM || w.weight),
                volume,
                intensity: numberOrZero(w.olympicSet?.percentageOf1RM || w.percentageOf1RM),
                readiness: numberOrZero(w.olympicSession?.sessionReadiness)
            };
        });

    const dashboards = Object.fromEntries(Object.entries(targets).map(([key, ids]) => [
        key,
        buildTrend(ids, key === 'backSquat' ? w => w.modifiers?.bar !== 'Low Bar' : null)
    ]));
    const snatchBest = Math.max(0, ...dashboards.snatch.map(d => d.e1rm));
    const cjBest = Math.max(0, ...dashboards.cleanJerk.map(d => d.e1rm));
    dashboards.total = [{ date: new Date().toISOString().split('T')[0], e1rm: snatchBest + cjBest, volume: 0, intensity: 0, readiness: numberOrZero(recovery?.[0]?.score) }];
    return dashboards;
};

export const getSmartRecommendations = ({ profile = {}, workouts = [], recovery = [] } = {}) => {
    const progress = getOlympicProgressDashboard(workouts, recovery);
    const weakPoints = analyzeWeakPoints(profile, workouts);
    const recs = [];
    const fsStart = progress.frontSquat[0]?.e1rm;
    const fsEnd = progress.frontSquat.at(-1)?.e1rm;
    const cleanStart = progress.cleanJerk[0]?.e1rm;
    const cleanEnd = progress.cleanJerk.at(-1)?.e1rm;
    if (fsStart && fsEnd && cleanStart && cleanEnd) {
        const fsGain = ((fsEnd - fsStart) / fsStart) * 100;
        const cleanGain = ((cleanEnd - cleanStart) / cleanStart) * 100;
        if (fsGain - cleanGain >= 5) {
            recs.push(`Your front squat has improved ${Math.round(fsGain)}% while your clean and jerk has improved ${Math.round(cleanGain)}%. Consider additional clean-specific work.`);
        }
    }
    const recentRecovery = recovery.slice(0, 7).map(r => numberOrZero(r.score || r.recoveryScore)).filter(Boolean);
    if (recentRecovery.length >= 5 && recentRecovery.at(0) < recentRecovery.at(-1) - 1) {
        recs.push('Your recovery scores have declined across the last week. Recommend a deload or lower technical volume.');
    }
    const total = Math.max(0, ...progress.total.map(d => d.e1rm));
    if (total) recs.push(`Based on your trends, estimated competition total is ${Math.round(total)} kg.`);
    if (weakPoints.flags.length) recs.push(`Weak point analysis flagged ${weakPoints.flags.map(f => f.replaceAll('_', ' ')).join(', ')}. Add ${weakPoints.accessories.slice(0, 3).join(', ')}.`);
    if (!recs.length) recs.push('DMAIC Control: keep logging readiness and technical quality so the next adjustment is data-led.');
    return recs.map(text => ({
        text,
        dmaic: {
            define: getOlympicProfile(profile).goals || 'Build the Olympic total',
            measure: 'Lift trends, readiness, volume, intensity, and PR timeline',
            analyze: weakPoints.flags.length ? weakPoints.flags.join(', ') : 'Stable trend',
            improve: text,
            control: 'Re-check after the next finalized session'
        }
    }));
};

export const getSubstitutionOptions = (exerciseId) => {
    return (EXERCISE_SUBSTITUTIONS[exerciseId] || [])
        .map(id => olympicExerciseById[id] || { id, name: id.replaceAll('_', ' ') })
        .map(exercise => ({
            ...exercise,
            stressEquivalent: 'Maintain sets and reps; adjust load to same RPE or percentage target.'
        }));
};

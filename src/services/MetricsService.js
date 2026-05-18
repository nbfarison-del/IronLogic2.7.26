/**
 * MetricsService.js
 * Converts logged training, readiness, and planning data into DMAIC measures.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseDate = (value) => {
    if (!value) return null;
    const dateStr = String(value).includes('T') ? String(value).split('T')[0] : String(value);
    const parsed = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const daysAgo = (date, now = new Date()) => {
    if (!date) return Infinity;
    return Math.floor((now - date) / MS_PER_DAY);
};

const getWorkoutDateStr = (entry) => String(entry?.date || '').split('T')[0];

const getSetCount = (entry) => {
    const sets = parseInt(entry?.sets || 1, 10);
    return Number.isFinite(sets) && sets > 0 ? sets : 1;
};

export const calculateE1RM = (weight, reps, rpe = 10) => {
    const parsedWeight = parseFloat(weight);
    const parsedReps = parseFloat(reps);
    const parsedRpe = parseFloat(rpe || 10);
    if (!Number.isFinite(parsedWeight) || !Number.isFinite(parsedReps) || parsedWeight <= 0 || parsedReps <= 0) return 0;
    const effectiveReps = parsedReps + Math.max(10 - Math.min(parsedRpe, 10), 0);
    return Math.round(parsedWeight * (1 + effectiveReps / 30));
};

export const calculateSetVolume = (entry) => {
    if (!entry || entry.type === 'cardio' || entry.type === 'hyrox') return 0;
    const weight = parseFloat(entry.weight || entry.load || 0);
    const reps = parseInt(entry.reps || 0, 10);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return 0;
    return weight * reps * getSetCount(entry);
};

const getRpe = (entry) => {
    const rpe = parseFloat(entry?.actualRpe || entry?.targetRpe || entry?.rpe);
    return Number.isFinite(rpe) ? rpe : null;
};

const average = (values) => {
    const valid = values.filter(value => Number.isFinite(value));
    if (valid.length === 0) return 0;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const sumVolumeWithinDays = (workouts, days, now = new Date()) => workouts.reduce((sum, entry) => {
    const entryDate = parseDate(entry.date);
    if (!entryDate || daysAgo(entryDate, now) > days) return sum;
    return sum + calculateSetVolume(entry);
}, 0);

const getRecoveryScore = (entry) => {
    const score = parseFloat(entry?.score);
    return Number.isFinite(score) ? score : null;
};

const getTrend = (recentValue, baselineValue, threshold = 0.015) => {
    if (!baselineValue) return 'new';
    const change = (recentValue - baselineValue) / baselineValue;
    if (change > threshold) return 'up';
    if (change < -threshold) return 'down';
    return 'flat';
};

const buildE1RMTrends = (workouts) => {
    const liftGroups = {};

    workouts.forEach(entry => {
        if (entry.type === 'cardio' || entry.type === 'hyrox') return;
        const name = entry.exerciseName || entry.name || entry.exerciseId || 'Unknown';
        const e1rm = parseFloat(entry.estimated1RM) || calculateE1RM(entry.weight, entry.reps, getRpe(entry) || 10);
        if (!e1rm) return;
        if (!liftGroups[name]) liftGroups[name] = [];
        liftGroups[name].push({
            e1rm,
            date: getWorkoutDateStr(entry)
        });
    });

    const e1rm = {};
    const trend = {};
    const plateau = {};

    Object.entries(liftGroups).forEach(([name, values]) => {
        const sorted = values.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestDate = sorted[0]?.date;
        const latestBest = Math.max(...sorted.filter(item => item.date === latestDate).map(item => item.e1rm));
        const previous = sorted.filter(item => item.date !== latestDate);
        const previousAverage = average(previous.map(item => item.e1rm));

        e1rm[name] = Math.round(latestBest);
        trend[name] = previousAverage ? getTrend(latestBest, previousAverage) : 'new';
        plateau[name] = previous.length >= 3 && trend[name] === 'flat';
    });

    return { e1rm, trend, plateau };
};

const calculateAdherence = (workouts, plannedWorkouts) => {
    if (!plannedWorkouts?.length) return null;

    const completedDates = new Set(workouts.map(getWorkoutDateStr).filter(Boolean));
    const plannedDates = plannedWorkouts.map(p => p.date).filter(Boolean);
    const completedPlannedDates = plannedDates.filter(date => completedDates.has(date));

    return {
        plannedSessions: plannedDates.length,
        completedPlannedSessions: completedPlannedDates.length,
        rate: plannedDates.length ? completedPlannedDates.length / plannedDates.length : null
    };
};

export const calculateMetrics = (input = {}, readiness = null) => {
    const {
        workouts = Array.isArray(input) ? input : [],
        recovery = readiness ? [readiness] : [],
        plannedWorkouts = [],
        bodyWeight = [],
        previousDmaicLogs = []
    } = Array.isArray(input) ? {} : input;
    const now = new Date();
    const recent7 = workouts.filter(entry => daysAgo(parseDate(entry.date), now) <= 7);
    const recent14 = workouts.filter(entry => daysAgo(parseDate(entry.date), now) <= 14);
    const recent28 = workouts.filter(entry => daysAgo(parseDate(entry.date), now) <= 28);
    const previous7 = workouts.filter(entry => {
        const age = daysAgo(parseDate(entry.date), now);
        return age > 7 && age <= 14;
    });

    const acuteVolume = sumVolumeWithinDays(workouts, 7, now);
    const chronicWeeklyVolume = sumVolumeWithinDays(workouts, 28, now) / 4;
    const previousWeekVolume = previous7.reduce((sum, entry) => sum + calculateSetVolume(entry), 0);
    const volumeTrend = getTrend(acuteVolume, previousWeekVolume || chronicWeeklyVolume, 0.05);

    const rpeValues = recent14.map(getRpe).filter(value => value !== null);
    const acuteRpe = average(recent7.map(getRpe).filter(value => value !== null));
    const previousRpe = average(previous7.map(getRpe).filter(value => value !== null));
    const rpeTrend = getTrend(acuteRpe, previousRpe, 0.05);

    const recoveryScores = recovery
        .filter(entry => daysAgo(parseDate(entry.date), now) <= 14)
        .map(getRecoveryScore)
        .filter(value => value !== null);
    const acuteRecovery = average(recovery
        .filter(entry => daysAgo(parseDate(entry.date), now) <= 7)
        .map(getRecoveryScore)
        .filter(value => value !== null));
    const previousRecovery = average(recovery
        .filter(entry => {
            const age = daysAgo(parseDate(entry.date), now);
            return age > 7 && age <= 14;
        })
        .map(getRecoveryScore)
        .filter(value => value !== null));
    const recoveryTrend = getTrend(acuteRecovery, previousRecovery, 0.05);

    const sorenessValues = recoveryScores.length
        ? recovery
            .filter(entry => daysAgo(parseDate(entry.date), now) <= 7)
            .flatMap(entry => [entry.legSoreness, entry.chestSoreness, entry.backSoreness, entry.fatigue])
            .map(value => parseFloat(value))
            .filter(value => Number.isFinite(value))
        : [];

    const { e1rm, trend, plateau } = buildE1RMTrends(recent28);
    const acwr = chronicWeeklyVolume > 0 ? acuteVolume / chronicWeeklyVolume : acuteVolume > 0 ? 1.5 : 1;
    const fatigueIndex = Math.min(10, Math.max(0, (
        (acuteRpe || average(rpeValues) || 0) * 0.65
        + (average(sorenessValues) || 0) * 0.7
        + (acuteRecovery ? Math.max(10 - acuteRecovery, 0) * 0.35 : 0)
    )));

    const performanceDown = Object.values(trend).filter(value => value === 'down').length;
    const performanceFlat = Object.values(trend).filter(value => value === 'flat').length;
    const performanceUp = Object.values(trend).filter(value => value === 'up').length;

    return {
        e1rm,
        trend,
        plateau,
        acuteVolume,
        chronicWeeklyVolume,
        previousWeekVolume,
        volumeTrend,
        averageRpe: Math.round((acuteRpe || average(rpeValues) || 0) * 10) / 10,
        rpeTrend,
        recoveryScore: Math.round((acuteRecovery || 0) * 10) / 10,
        recoveryTrend,
        sorenessAverage: Math.round((average(sorenessValues) || 0) * 10) / 10,
        fatigue_index: Math.round(fatigueIndex * 10) / 10,
        acwr: Math.round(acwr * 100) / 100,
        adherence: calculateAdherence(recent28, plannedWorkouts),
        bodyWeightLatest: bodyWeight?.[bodyWeight.length - 1]?.weight || null,
        dataQuality: {
            workoutSets28d: recent28.length,
            workoutSets7d: recent7.length,
            recoveryEntries14d: recoveryScores.length,
            plannedSessions: plannedWorkouts.length,
            dmaicSnapshots: previousDmaicLogs.length
        },
        flags: {
            performanceDown,
            performanceFlat,
            performanceUp,
            volumeSpike: acwr >= 1.5,
            lowRecovery: acuteRecovery > 0 && acuteRecovery < 5,
            highRpe: (acuteRpe || 0) >= 8.5
        }
    };
};

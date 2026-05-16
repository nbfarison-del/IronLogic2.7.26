/**
 * MetricsService.js
 * Handles calculation of performance metrics: e1RM, Fatigue, Volume.
 */

export const calculateE1RM = (weight, reps, rpe) => {
    if (!weight || !reps) return 0;
    const effectiveReps = parseFloat(reps) + (10 - parseFloat(rpe || 10));
    return weight * (1 + 0.0333 * effectiveReps);
};

export const calculateVolumeLoad = (session) => {
    if (!session || !session.exercises) return 0;
    return session.exercises.reduce((total, ex) => {
        const exVolume = ex.sets.reduce((setTotal, set) => {
            return setTotal + (parseFloat(set.load || 0) * parseFloat(set.reps || 0));
        }, 0);
        return total + exVolume;
    }, 0);
};

export const calculateFatigueIndex = (sessions, days = 14, readiness = null) => {
    if (!sessions || sessions.length === 0) return readiness?.fatigue ? parseFloat(readiness.fatigue) : 0;
    
    // Average RPE of the last 'days'
    const recentSessions = sessions.filter(s => {
        const sessionDate = new Date(s.date);
        const now = new Date();
        const diffTime = Math.abs(now - sessionDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
    });

    let totalRPE = 0;
    let totalSets = 0;
    
    recentSessions.forEach(s => {
        s.exercises?.forEach(ex => {
            ex.sets?.forEach(set => {
                const rpeVal = set.rpe || set.actualRpe || set.targetRpe;
                if (rpeVal) {
                    totalRPE += parseFloat(rpeVal);
                    totalSets++;
                }
            });
        });
    });

    const averageRPE = totalSets > 0 ? totalRPE / totalSets : 0;
    
    if (readiness && readiness.fatigue) {
        const reportedFatigue = parseFloat(readiness.fatigue);
        if (averageRPE > 0) {
            return (averageRPE + reportedFatigue) / 2;
        }
        return reportedFatigue;
    }

    return averageRPE;
};

export const calculateACWR = (sessions) => {
    if (!sessions || sessions.length === 0) return 1.0;

    const now = new Date();
    const acuteRange = 7;
    const chronicRange = 28;

    const getWorkloadForRange = (days) => {
        const rangeSessions = sessions.filter(s => {
            const diff = (now - new Date(s.date)) / (1000 * 60 * 60 * 24);
            return diff <= days;
        });
        return rangeSessions.reduce((total, s) => {
            const vol = (s.exercises || []).reduce((exTotal, ex) => {
                return exTotal + (ex.sets || []).reduce((setTotal, set) => {
                    return setTotal + (parseFloat(set.load || set.weight || 0) * parseFloat(set.reps || 0));
                }, 0);
            }, 0);
            return total + vol;
        }, 0);
    };

    const acuteWorkload = getWorkloadForRange(acuteRange);
    const chronicWorkload = getWorkloadForRange(chronicRange) / (chronicRange / acuteRange);

    if (chronicWorkload === 0) return acuteWorkload > 0 ? 1.5 : 1.0;
    return Math.round((acuteWorkload / chronicWorkload) * 100) / 100;
};

export const calculateMetrics = (sessions, readiness = null, fatigueDays = 7) => {
    if (!sessions || sessions.length === 0) return { e1rm: {}, fatigue_index: readiness?.fatigue ? parseFloat(readiness.fatigue) : 0, trend: {} };

    const metrics = {
        e1rm: {},
        fatigue_index: calculateFatigueIndex(sessions, fatigueDays, readiness),
        acwr: calculateACWR(sessions),
        trend: {} // 'up', 'down', or 'flat'
    };

    // Group e1RMs by Exercise Name
    const liftGroups = {};

    sessions.forEach(s => {
        if (!s.exercises) return;
        s.exercises.forEach(ex => {
            const name = ex.exerciseName || ex.name || "Unknown";
            if (!liftGroups[name]) liftGroups[name] = [];
            
            ex.sets?.forEach(set => {
                const weight = parseFloat(set.load || set.weight || 0);
                const reps = parseFloat(set.reps || 0);
                const rpe = parseFloat(set.rpe || set.actualRpe || set.targetRpe || 10);
                
                if (weight > 0 && reps > 0) {
                    liftGroups[name].push({
                        e1rm: calculateE1RM(weight, reps, rpe),
                        date: s.date
                    });
                }
            });
        });
    });

    // Calculate Max e1RM and Trend for each exercise
    Object.keys(liftGroups).forEach(name => {
        const data = liftGroups[name].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (data.length === 0) return;

        // Current Max (most recent session's top set)
        const latestSessionDate = data[0].date;
        const latestSets = data.filter(d => d.date === latestSessionDate);
        const currentMax = Math.max(...latestSets.map(d => d.e1rm));
        
        metrics.e1rm[name] = Math.round(currentMax * 10) / 10;

        // Trend calculation (latest vs. previous sessions average)
        if (data.length > 1) {
            const previousSets = data.filter(d => d.date !== latestSessionDate);
            const prevAvg = previousSets.reduce((sum, d) => sum + d.e1rm, 0) / previousSets.length;
            
            const diff = prevAvg > 0 ? ((currentMax - prevAvg) / prevAvg) * 100 : 0;
            if (diff > 1.5) metrics.trend[name] = 'up';
            else if (diff < -1.5) metrics.trend[name] = 'down';
            else metrics.trend[name] = 'flat';
        } else {
            metrics.trend[name] = 'new';
        }
    });

    return metrics;
};

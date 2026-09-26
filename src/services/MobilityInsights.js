import { getDateStr } from '../utils/dateUtils';

const DAY_MS = 86400000;
const toDayNum = (dateStr) => Math.floor(new Date(`${dateStr}T12:00:00`).getTime() / DAY_MS);
const fromDayNum = (n) => getDateStr(new Date(n * DAY_MS + 12 * 3600 * 1000));

const rpeOf = (w) => {
    const rpe = parseFloat(w.actualRpe ?? w.targetRpe ?? w.rpe);
    return Number.isFinite(rpe) ? rpe : null;
};

/**
 * Correlate mobility adherence with training RPE over the last `days` days.
 * "Covered" = mobility logged on the training day or the day before.
 * Returns null fields when there isn't enough data to say anything honest.
 */
export function computeMobilityInsights({ mobilityLogs = [], workouts = [], days = 28, todayStr = getDateStr(new Date()) }) {
    const mobilityDays = new Set(mobilityLogs.map(m => m.date).filter(Boolean));

    // Group workout RPEs by training day
    const rpeByDay = new Map();
    for (const w of workouts) {
        if (!w.date) continue;
        const rpe = rpeOf(w);
        if (rpe == null) continue;
        if (!rpeByDay.has(w.date)) rpeByDay.set(w.date, []);
        rpeByDay.get(w.date).push(rpe);
    }

    const todayNum = toDayNum(todayStr);
    const cutoffNum = todayNum - days;
    const covered = [], uncovered = [];
    for (const [date, rpes] of rpeByDay) {
        const n = toDayNum(date);
        if (n < cutoffNum || n > todayNum) continue;
        const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length;
        const prevDay = fromDayNum(n - 1);
        if (mobilityDays.has(date) || mobilityDays.has(prevDay)) covered.push(avg);
        else uncovered.push(avg);
    }

    const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    const avgWith = mean(covered), avgWithout = mean(uncovered);

    // This week's mobility adherence
    const weekStart = todayNum - 6;
    let weekMobilityDays = 0;
    for (let n = weekStart; n <= todayNum; n++) {
        if (mobilityDays.has(fromDayNum(n))) weekMobilityDays++;
    }

    const enough = covered.length >= 3 && uncovered.length >= 3;
    let message = null;
    if (enough) {
        const delta = avgWithout - avgWith;
        if (delta >= 0.5) {
            message = `Sessions near a mobility day average RPE ${avgWith.toFixed(1)} vs ${avgWithout.toFixed(1)} without — mobility days feel easier.`;
        } else if (delta <= -0.5) {
            message = `Sessions near a mobility day average RPE ${avgWith.toFixed(1)} vs ${avgWithout.toFixed(1)} without — worth watching.`;
        } else {
            message = `RPE is about the same with or without mobility (${avgWith.toFixed(1)} vs ${avgWithout.toFixed(1)}) — the habit still protects joints.`;
        }
    }

    return {
        weekMobilityDays,
        trainingDays: covered.length + uncovered.length,
        avgRpeWithMobility: avgWith != null ? Math.round(avgWith * 10) / 10 : null,
        avgRpeWithoutMobility: avgWithout != null ? Math.round(avgWithout * 10) / 10 : null,
        coveredDays: covered.length,
        uncoveredDays: uncovered.length,
        message,
    };
}

import { mobilityPaths } from '../data/mobilityPaths';
import { prescriptionRules, defaultPrescription } from '../data/mobilityPrescriptions';
import { getDateStr } from '../utils/dateUtils';

const pathById = Object.fromEntries(mobilityPaths.map(p => [p.id, p]));

/**
 * Order a path's exercises with focus ids first (in focus order),
 * then the rest in path order. Dedupes defensively.
 */
function orderExercises(path, focus = []) {
    const byId = new Map(path.exercises.map(e => [e.id, e]));
    const ordered = [];
    for (const id of focus) {
        const ex = byId.get(id);
        if (ex && !ordered.includes(ex)) ordered.push(ex);
    }
    for (const ex of path.exercises) {
        if (!ordered.includes(ex)) ordered.push(ex);
    }
    return ordered;
}

function sessionText(sessions) {
    return sessions
        .map(s => [s.name, s.planName, ...(s.exercises || []).map(e => e.name)].filter(Boolean).join(' '))
        .join(' | ');
}

/**
 * Prescribe today's mobility session.
 *
 * @param {Object} args
 * @param {Array}  args.sessions     planned workouts for the day (may be empty)
 * @param {Array}  args.mobilityLogs all mobility log entries ({ date })
 * @param {string} [args.dateStr]    YYYY-MM-DD; defaults to today
 * @returns {{ ruleId, ruleLabel, path, exercises, reason, isRestDay, alreadyDone }}
 */
export function prescribeMobility({ sessions = [], mobilityLogs = [], dateStr = getDateStr(new Date()) }) {
    const isRestDay = sessions.length === 0;
    let rule;

    if (isRestDay) {
        rule = prescriptionRules.find(r => r.id === 'rest_day');
    } else {
        const text = sessionText(sessions);
        rule = prescriptionRules.find(r => r.id !== 'rest_day' && r.match.some(rx => rx.test(text)));
    }
    rule = rule || defaultPrescription;

    const path = pathById[rule.pathId] || pathById[defaultPrescription.pathId];
    const alreadyDone = mobilityLogs.some(m => m.date === dateStr);

    return {
        ruleId: rule.id,
        ruleLabel: rule.label,
        path,
        exercises: orderExercises(path, rule.focus),
        reason: rule.reason,
        isRestDay,
        alreadyDone,
    };
}

/** Convenience: prescribe for today from DataContext-shaped data. */
export function prescribeForToday({ plannedWorkouts = [], mobilityLogs = [] }) {
    const today = getDateStr(new Date());
    const sessions = plannedWorkouts.filter(p => p.date === today);
    return prescribeMobility({ sessions, mobilityLogs, dateStr: today });
}

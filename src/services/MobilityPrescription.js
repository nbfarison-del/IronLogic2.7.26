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
 * Training-type chips shown on the home screen. Each maps to a prescription
 * rule id. This is the only training input the app needs — one tap, not a log.
 */
export const TRAINING_TYPES = [
    { key: 'rest', label: 'Rest', ruleId: 'rest_day' },
    { key: 'run', label: 'Run', ruleId: 'run_day' },
    { key: 'cardio', label: 'Cardio', ruleId: 'cardio_day' },
    { key: 'upper', label: 'Upper', ruleId: 'overhead_day' },
    { key: 'lower', label: 'Lower', ruleId: 'squat_day' },
    { key: 'olympic', label: 'Olympic', ruleId: 'overhead_day' },
];

/** Map a training-type chip key to its prescription rule id. */
export function ruleIdForTrainingType(key) {
    return TRAINING_TYPES.find(t => t.key === key)?.ruleId || null;
}

/**
 * Prescribe today's mobility session.
 *
 * @param {Object} args
 * @param {Array}  args.sessions     planned workouts for the day (may be empty)
 * @param {string} [args.trainingType] rule id from TRAINING_TYPES; takes precedence over sessions
 * @param {Array}  args.mobilityLogs all mobility log entries ({ date })
 * @param {string} [args.dateStr]    YYYY-MM-DD; defaults to today
 * @returns {{ ruleId, ruleLabel, path, exercises, reason, isRestDay, alreadyDone }}
 */
export function prescribeMobility({ sessions = [], trainingType = null, mobilityLogs = [], dateStr = getDateStr(new Date()) }) {
    let rule;
    let isRestDay = false;

    if (trainingType) {
        rule = prescriptionRules.find(r => r.id === trainingType);
        isRestDay = trainingType === 'rest_day';
    } else {
        isRestDay = sessions.length === 0;
        if (isRestDay) {
            rule = prescriptionRules.find(r => r.id === 'rest_day');
        } else {
            const text = sessionText(sessions);
            rule = prescriptionRules.find(r => r.id !== 'rest_day' && r.match.some(rx => rx.test(text)));
        }
    }
    rule = rule || defaultPrescription;

    const path = pathById[rule.pathId] || pathById[defaultPrescription.pathId];
    const alreadyDone = mobilityLogs.some(m => m.date === dateStr);

    return {
        ruleId: rule.id,
        ruleLabel: rule.label,
        path,
        exercises: orderExercises(path, rule.focus),
        focusIds: rule.focus || [],
        reason: rule.reason,
        isRestDay,
        alreadyDone,
    };
}

/** Convenience: prescribe for today from a training-type chip + mobility logs. */
export function prescribeForToday({ trainingType = null, plannedWorkouts = [], mobilityLogs = [] }) {
    const today = getDateStr(new Date());
    const sessions = plannedWorkouts.filter(p => p.date === today);
    const ruleId = trainingType ? ruleIdForTrainingType(trainingType) : null;
    return prescribeMobility({ sessions, trainingType: ruleId, mobilityLogs, dateStr: today });
}

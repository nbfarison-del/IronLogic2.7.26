import { getDateStr } from './dateUtils';

const CSV_HEADERS = [
    'date',
    'day',
    'weekStart',
    'weekEnd',
    'recordType',
    'exercise',
    'weight',
    'unit',
    'reps',
    'sets',
    'targetRpe',
    'actualRpe',
    'e1RM',
    'plan',
    'value',
    'notes'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const toCsvRow = (record) => CSV_HEADERS.map((header) => escapeCsv(record[header] ?? '')).join(',');

export const getWeekStart = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
};

export const getWeekEnd = (weekStart) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
};

const summarizePlannedExercises = (exercises) => {
    if (!Array.isArray(exercises) || exercises.length === 0) return '';
    return exercises.map((ex) => {
        const name = ex.exerciseName || ex.name || ex.exerciseId || 'Exercise';
        const parts = [name];
        if (Array.isArray(ex.sets)) {
            const first = ex.sets[0];
            const count = ex.sets.length;
            if (first) {
                const setsStr = `${count}x${first.reps ?? ''}`;
                const rpe = first.targetRpe || first.rpe || first.intensity || '';
                parts.push(setsStr + (rpe ? ` @ ${rpe}` : ''));
            }
        } else if (ex.sets) {
            const setsStr = `${ex.sets}x${ex.reps ?? ''}`;
            const rpe = ex.targetRpe || ex.rpe || ex.intensity || '';
            parts.push(setsStr + (rpe ? ` @ ${rpe}` : ''));
        }
        return parts.join(' ');
    }).join('; ');
};

export const buildWeekCSV = ({
    date,
    unit = 'kg',
    workouts = [],
    planned = [],
    recovery = [],
    weights = [],
    notes = [],
    mobility = []
}) => {
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(weekStart);
    const startStr = getDateStr(weekStart);
    const endStr = getDateStr(weekEnd);

    const rows = [];

    for (let offset = 0; offset < 7; offset++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + offset);
        const dayStr = getDateStr(dayDate);
        const dayName = DAY_NAMES[dayDate.getDay()];

        const inDay = (items, key = 'date') => (items || []).filter((item) => String(item[key] || '').startsWith(dayStr));

        inDay(workouts).forEach((w) => {
            rows.push({
                date: dayStr,
                day: dayName,
                weekStart: startStr,
                weekEnd: endStr,
                recordType: 'Workout',
                exercise: w.exerciseName || w.exerciseId || '',
                weight: w.weight,
                unit: w.weight ? unit : '',
                reps: w.reps,
                sets: w.sets || 1,
                targetRpe: w.targetRpe,
                actualRpe: w.actualRpe,
                e1RM: w.estimated1RM,
                plan: w.sourcePlanId ? 'from-plan' : '',
                value: '',
                notes: w.notes || ''
            });
        });

        inDay(planned).forEach((p) => {
            rows.push({
                date: dayStr,
                day: dayName,
                weekStart: startStr,
                weekEnd: endStr,
                recordType: 'Planned',
                exercise: summarizePlannedExercises(p.exercises),
                weight: '',
                unit: '',
                reps: '',
                sets: '',
                targetRpe: '',
                actualRpe: '',
                e1RM: '',
                plan: p.planName || p.name || 'Unnamed Plan',
                value: '',
                notes: p.notes || ''
            });
        });

        inDay(recovery).forEach((r) => {
            rows.push({
                date: dayStr,
                day: dayName,
                weekStart: startStr,
                weekEnd: endStr,
                recordType: 'Recovery',
                exercise: 'Recovery Score',
                weight: '',
                unit: '',
                reps: '',
                sets: '',
                targetRpe: '',
                actualRpe: '',
                e1RM: '',
                plan: '',
                value: r.score,
                notes: r.fatigue ? `fatigue:${r.fatigue} sleep:${r.sleep} rhr:${r.rhr} legSoreness:${r.legSoreness} chestSoreness:${r.chestSoreness} backSoreness:${r.backSoreness}` : ''
            });
        });

        inDay(weights).forEach((w) => {
            rows.push({
                date: dayStr,
                day: dayName,
                weekStart: startStr,
                weekEnd: endStr,
                recordType: 'Body Weight',
                exercise: 'Body Weight',
                weight: w.weight,
                unit: unit,
                reps: '',
                sets: '',
                targetRpe: '',
                actualRpe: '',
                e1RM: '',
                plan: '',
                value: w.weight,
                notes: ''
            });
        });

        inDay(mobility).forEach((m) => {
            rows.push({
                date: dayStr,
                day: dayName,
                weekStart: startStr,
                weekEnd: endStr,
                recordType: 'Mobility',
                exercise: m.pathName || m.name || 'Mobility Session',
                weight: '',
                unit: '',
                reps: '',
                sets: '',
                targetRpe: '',
                actualRpe: '',
                e1RM: '',
                plan: '',
                value: m.duration ? `${m.duration} min` : '',
                notes: Array.isArray(m.exercises) ? m.exercises.join('; ') : ''
            });
        });

        inDay(notes).forEach((n) => {
            rows.push({
                date: dayStr,
                day: dayName,
                weekStart: startStr,
                weekEnd: endStr,
                recordType: 'Note',
                exercise: '',
                weight: '',
                unit: '',
                reps: '',
                sets: '',
                targetRpe: '',
                actualRpe: '',
                e1RM: '',
                plan: '',
                value: '',
                notes: n.text || ''
            });
        });
    }

    const lines = [CSV_HEADERS.join(','), ...rows.map(toCsvRow)];
    return lines.join('\n');
};

export const downloadCSV = (filename, content) => {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

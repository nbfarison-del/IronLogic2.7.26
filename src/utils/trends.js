import { getDateStr, parseWorkoutDate, toLocalDateStr } from './dateUtils';

const AGGREGATORS = {
    max: (vals) => Math.max(...vals),
    sum: (vals) => vals.reduce((s, v) => s + v, 0),
    avgPos: (vals) => {
        const p = vals.filter(v => v > 0);
        return p.length ? p.reduce((s, v) => s + v, 0) / p.length : 0;
    },
    last: (vals) => vals[vals.length - 1]
};

export const getWeekStart = (dateValue) => {
    if (!dateValue) return null;
    const parsed = parseWorkoutDate(dateValue);
    if (!parsed || Number.isNaN(parsed.getTime())) return null;
    const day = parsed.getDay();
    const offset = (day + 6) % 7;
    parsed.setDate(parsed.getDate() - offset);
    return getDateStr(parsed);
};

export const formatWeekLabel = (weekStart) => {
    if (!weekStart) return '';
    const [y, m, d] = weekStart.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${date.toLocaleDateString(undefined, { month: 'short' })} ${d}`;
};

export const aggregateByWeek = (rows, config) => {
    const entries = (rows || [])
        .map(row => ({
            row,
            weekStart: getWeekStart(row.date ?? row.timestamp)
        }))
        .filter(e => e.weekStart);

    const buckets = new Map();
    entries.forEach(({ row, weekStart }) => {
        if (!buckets.has(weekStart)) buckets.set(weekStart, []);
        buckets.get(weekStart).push(row);
    });

    const sortedKeys = [...buckets.keys()].sort();

    return sortedKeys.map(weekStart => {
        const weekRows = buckets.get(weekStart);

        const point = {
            date: weekStart,
            weekLabel: formatWeekLabel(weekStart),
            sessions: weekRows.length
        };

        Object.entries(config).forEach(([key, mode]) => {
            const values = weekRows
                .map(r => Number.parseFloat(r[key]))
                .filter(v => Number.isFinite(v));

            if (mode === 'last') {
                point[key] = AGGREGATORS.last(values);
            } else {
                point[key] = AGGREGATORS[mode](values);
            }
        });

        return point;
    });
};

export const aggregateTrendByWeek = (rows) => aggregateByWeek(rows, {
    e1rm: 'max',
    volume: 'sum',
    intensity: 'avgPos',
    readiness: 'avgPos'
});

export const aggregateBodyWeightByWeek = (rows) => aggregateByWeek(rows, {
    weight: 'last'
});

export const aggregateDOTSByWeek = (rows) => aggregateByWeek(rows, {
    dots: 'last'
});
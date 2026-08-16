import { describe, test, expect } from 'vitest';
import { buildWeekCSV, getWeekStart, getWeekEnd } from '../utils/csvExport';

describe('getWeekStart', () => {
    test('returns the Sunday of the week containing the date', () => {
        // 2026-08-15 is a Saturday
        const start = getWeekStart(new Date(2026, 7, 15));
        expect(start.getDay()).toBe(0);
        expect(`${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`).toBe('2026-7-9');
    });

    test('returns the date itself when it is a Sunday', () => {
        const start = getWeekStart(new Date(2026, 7, 16));
        expect(`${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`).toBe('2026-7-16');
    });
});

describe('getWeekEnd', () => {
    test('returns the Saturday 6 days after the week start', () => {
        const end = getWeekEnd(getWeekStart(new Date(2026, 7, 15)));
        expect(`${end.getFullYear()}-${end.getMonth()}-${end.getDate()}`).toBe('2026-7-15');
    });
});

describe('buildWeekCSV', () => {
    const date = new Date(2026, 7, 15); // Saturday

    test('includes workouts, planned, recovery, weight, notes, and mobility rows', () => {
        const csv = buildWeekCSV({
            date,
            unit: 'kg',
            workouts: [
                { date: '2026-08-15', exerciseId: 'bb_squat', exerciseName: 'Back Squat', weight: 100, reps: 5, sets: 1, targetRpe: 7, actualRpe: 7.5, estimated1RM: 115 },
                { date: '2026-08-10', exerciseId: 'bb_bench', exerciseName: 'Bench Press', weight: 80, reps: 3, sets: 1, actualRpe: 8 }
            ],
            planned: [
                { date: '2026-08-13', planName: 'Program - W1D1', exercises: [{ exerciseName: 'Deadlift', sets: [{ reps: 5, targetRpe: 8 }] }], notes: 'Focus on brace' }
            ],
            recovery: [
                { date: '2026-08-15', score: 8, fatigue: 2, sleep: 4, rhr: 55, legSoreness: 1, chestSoreness: 0, backSoreness: 0 }
            ],
            weights: [
                { date: '2026-08-15', weight: 88.5 }
            ],
            notes: [
                { date: '2026-08-15', text: 'Felt strong PR set' }
            ],
            mobility: [
                { date: '2026-08-15', pathName: 'Lower Body Flow', duration: 10, exercises: ['Ankle Rock', 'Hip Flexor'] }
            ]
        });

        const lines = csv.split('\n');
        expect(lines[0]).toBe('date,day,weekStart,weekEnd,recordType,exercise,weight,unit,reps,sets,targetRpe,actualRpe,e1RM,plan,value,notes');

        const row = (line) => line.split(',');
        const records = lines.slice(1).map(row);

        const workoutRow = records.find(r => r[4] === 'Workout' && r[5] === 'Back Squat');
        expect(workoutRow[0]).toBe('2026-08-15');
        expect(workoutRow[2]).toBe('2026-08-09');
        expect(workoutRow[3]).toBe('2026-08-15');
        expect(workoutRow[5]).toBe('Back Squat');
        expect(workoutRow[6]).toBe('100');
        expect(workoutRow[7]).toBe('kg');
        expect(workoutRow[10]).toBe('7');
        expect(workoutRow[11]).toBe('7.5');

        const plannedRow = records.find(r => r[4] === 'Planned');
        expect(plannedRow[0]).toBe('2026-08-13');
        expect(plannedRow[13]).toBe('Program - W1D1');
        expect(plannedRow[5]).toContain('Deadlift');
        expect(plannedRow[15]).toBe('Focus on brace');

        const recoveryRow = records.find(r => r[4] === 'Recovery');
        expect(recoveryRow[14]).toBe('8');

        const weightRow = records.find(r => r[4] === 'Body Weight');
        expect(weightRow[14]).toBe('88.5');

        const noteRow = records.find(r => r[4] === 'Note');
        expect(noteRow[15]).toBe('Felt strong PR set');

        const mobilityRow = records.find(r => r[4] === 'Mobility');
        expect(mobilityRow[5]).toBe('Lower Body Flow');
        expect(mobilityRow[14]).toBe('10 min');

        expect(records.filter(r => r[0] === '2026-08-15').length).toBeGreaterThanOrEqual(5);
    });

    test('escapes commas and quotes in notes', () => {
        const csv = buildWeekCSV({
            date,
            unit: 'kg',
            workouts: [],
            planned: [],
            recovery: [],
            weights: [],
            notes: [
                { date: '2026-08-15', text: 'Heavy day, "really" pushed hard' }
            ],
            mobility: []
        });

        expect(csv).toContain('"Heavy day, ""really"" pushed hard"');
    });

    test('filters out entries outside the week', () => {
        const csv = buildWeekCSV({
            date,
            unit: 'kg',
            workouts: [
                { date: '2026-08-08', exerciseId: 'x', exerciseName: 'Outside Week', weight: 1, reps: 1 },
                { date: '2026-08-16', exerciseId: 'y', exerciseName: 'Also Outside', weight: 1, reps: 1 }
            ],
            planned: [],
            recovery: [],
            weights: [],
            notes: [],
            mobility: []
        });

        expect(csv.split('\n').filter(l => l.includes('Outside Week'))).toHaveLength(0);
    });
});

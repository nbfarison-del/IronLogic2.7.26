import { describe, it, expect } from 'vitest';
import { parseCSV, detectColumns, normalizeDate, rowsToWorkouts } from '../services/RTSImport';

describe('parseCSV', () => {
    it('parses headers and rows', () => {
        const { headers, rows } = parseCSV('Date,Exercise,Weight\n2026-09-26,Snatch,80\n');
        expect(headers).toEqual(['Date', 'Exercise', 'Weight']);
        expect(rows).toEqual([['2026-09-26', 'Snatch', '80']]);
    });

    it('handles quoted fields with commas', () => {
        const { rows } = parseCSV('Exercise,Notes\n"Snatch, power","felt good, fast"\n');
        expect(rows[0]).toEqual(['Snatch, power', 'felt good, fast']);
    });
});

describe('detectColumns', () => {
    it('fuzzy-matches RTS-style headers', () => {
        const map = detectColumns(['Workout Date', 'Exercise Name', 'Load (kg)', 'Reps', 'RPE @', 'Set']);
        expect(map.date).toBe(0);
        expect(map.exercise).toBe(1);
        expect(map.weight).toBe(2);
        expect(map.reps).toBe(3);
        expect(map.rpe).toBe(4);
        expect(map.sets).toBe(5);
    });

    it('returns -1 for missing columns', () => {
        expect(detectColumns(['Date', 'Exercise']).notes).toBe(-1);
    });
});

describe('normalizeDate', () => {
    it('handles common formats', () => {
        expect(normalizeDate('2026-09-26')).toBe('2026-09-26');
        expect(normalizeDate('9/26/2026')).toBe('2026-09-26');
        expect(normalizeDate('2026-09-26T10:00:00')).toBe('2026-09-26');
    });
    it('returns null for garbage', () => {
        expect(normalizeDate('not a date')).toBe(null);
        expect(normalizeDate('')).toBe(null);
    });
});

describe('rowsToWorkouts', () => {
    const colMap = { date: 0, exercise: 1, weight: 2, reps: 3, rpe: 4, sets: -1, notes: -1 };

    it('maps rows to workout docs', () => {
        const { workouts, skipped } = rowsToWorkouts(
            [['2026-09-26', 'Back Squat', '120', '5', '8']],
            colMap
        );
        expect(skipped).toBe(0);
        expect(workouts[0]).toMatchObject({
            date: '2026-09-26',
            exerciseId: 'back_squat',
            exerciseName: 'Back Squat',
            weight: 120,
            reps: 5,
            actualRpe: 8,
            source: 'rts-import',
        });
    });

    it('skips rows missing date or exercise', () => {
        const { workouts, skipped } = rowsToWorkouts(
            [['', 'Back Squat', '120', '5', '8'], ['2026-09-26', '', '120', '5', '8']],
            colMap
        );
        expect(workouts).toHaveLength(0);
        expect(skipped).toBe(2);
    });

    it('converts lb to kg when units differ', () => {
        const { workouts } = rowsToWorkouts(
            [['2026-09-26', 'Deadlift', '225', '5', '']],
            colMap,
            { csvUnit: 'lb', appUnit: 'kg' }
        );
        expect(workouts[0].weight).toBeCloseTo(102.1, 1);
    });
});

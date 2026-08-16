import { describe, test, expect } from 'vitest';
import { isWithinRecentDays, parseWorkoutDate, getDateStr } from '../utils/dateUtils';

describe('isWithinRecentDays - 30-day e1RM filter boundary', () => {
    const now = new Date(2026, 7, 15);

    test('includes a workout exactly 30 days ago (inclusive boundary)', () => {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        expect(isWithinRecentDays(getDateStr(cutoff), 30, now)).toBe(true);
    });

    test('excludes a workout 31 days ago', () => {
        const older = new Date(now);
        older.setDate(older.getDate() - 31);
        expect(isWithinRecentDays(getDateStr(older), 30, now)).toBe(false);
    });

    test('includes today and any workout within the window', () => {
        expect(isWithinRecentDays('2026-08-15', 30, now)).toBe(true);
        expect(isWithinRecentDays('2026-08-01', 30, now)).toBe(true);
    });

    test('handles legacy full-timestamp entries on the boundary day', () => {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        const ts = `${getDateStr(cutoff)}T23:59:59.000Z`;
        expect(isWithinRecentDays(ts, 30, now)).toBe(true);
    });

    test('rejects empty or invalid dates', () => {
        expect(isWithinRecentDays(null, 30, now)).toBe(false);
        expect(isWithinRecentDays(undefined, 30, now)).toBe(false);
        expect(isWithinRecentDays('', 30, now)).toBe(false);
    });
});

describe('parseWorkoutDate', () => {
    test('parses date-only strings as local noon (timezone-safe)', () => {
        const parsed = parseWorkoutDate('2026-07-16');
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(6);
        expect(parsed.getDate()).toBe(16);
    });

    test('strips timestamp components', () => {
        const parsed = parseWorkoutDate('2026-07-16T23:59:59.000Z');
        expect(parsed.getDate()).toBe(16);
    });

    test('returns null for invalid values', () => {
        expect(parseWorkoutDate(null)).toBe(null);
        expect(parseWorkoutDate('not-a-date')).toBe(null);
    });
});

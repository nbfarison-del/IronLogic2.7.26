import { describe, test, expect } from 'vitest';
import { isWithinRecentDays, parseWorkoutDate, getDateStr, toLocalDateStr } from '../utils/dateUtils';

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

    test('includes legacy timestamps whose local date is the boundary day (any timezone)', () => {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        // Local noon on the boundary day converts to a UTC instant whose
        // local calendar date is still the boundary day in every realistic zone.
        const boundaryNoonIso = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate(), 12).toISOString();
        expect(isWithinRecentDays(boundaryNoonIso, 30, now)).toBe(true);
    });

    test('judges legacy timestamps by their true local date, not the UTC prefix', () => {
        // 2026-07-16T01:00:00Z is July 15 local in negative-offset zones but
        // July 16 local in UTC/positive zones. The verdict must follow the
        // runtime-local calendar date of the instant in every zone.
        const ts = '2026-07-16T01:00:00.000Z';
        const expected = getDateStr(new Date(ts)) >= '2026-07-16';
        expect(isWithinRecentDays(ts, 30, now)).toBe(expected);
    });

    test('rejects empty or invalid dates', () => {
        expect(isWithinRecentDays(null, 30, now)).toBe(false);
        expect(isWithinRecentDays(undefined, 30, now)).toBe(false);
        expect(isWithinRecentDays('', 30, now)).toBe(false);
    });
});

describe('toLocalDateStr - legacy timestamp normalization', () => {
    test('passes date-only strings through unchanged', () => {
        expect(toLocalDateStr('2026-07-16')).toBe('2026-07-16');
    });

    test('converts full timestamps to their local calendar date', () => {
        const ts = '2026-07-16T01:00:00.000Z';
        expect(toLocalDateStr(ts)).toBe(getDateStr(new Date(ts)));
    });

    test('falls back to the UTC prefix for unparseable timestamp strings', () => {
        expect(toLocalDateStr('not-a-dateT00:00:00Z')).toBe('not-a-date');
    });
});

describe('parseWorkoutDate', () => {
    test('parses date-only strings as local noon (timezone-safe)', () => {
        const parsed = parseWorkoutDate('2026-07-16');
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(6);
        expect(parsed.getDate()).toBe(16);
        expect(parsed.getHours()).toBe(12);
    });

    test('normalizes legacy full timestamps to the runtime-local calendar date at noon', () => {
        const parsed = parseWorkoutDate('2026-07-16T23:59:59.000Z');
        const instant = new Date('2026-07-16T23:59:59.000Z');
        expect(parsed.getFullYear()).toBe(instant.getFullYear());
        expect(parsed.getMonth()).toBe(instant.getMonth());
        expect(parsed.getDate()).toBe(instant.getDate());
        expect(parsed.getHours()).toBe(12);
    });

    test('returns null for invalid values', () => {
        expect(parseWorkoutDate(null)).toBe(null);
        expect(parseWorkoutDate('not-a-date')).toBe(null);
    });
});

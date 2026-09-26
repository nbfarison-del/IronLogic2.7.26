import { describe, it, expect } from 'vitest';
import { computeMobilityStreak, weekStartOf } from '../hooks/useMobilityStreak';

describe('computeMobilityStreak', () => {
    it('returns zeros for no logs', () => {
        expect(computeMobilityStreak([], '2026-09-26')).toEqual({
            current: 0, longest: 0, total: 0, freezesAvailable: 1, newFreezes: [],
        });
    });

    it('counts a streak ending today', () => {
        const r = computeMobilityStreak(['2026-09-24', '2026-09-25', '2026-09-26'], '2026-09-26');
        expect(r.current).toBe(3);
        expect(r.longest).toBe(3);
        expect(r.newFreezes).toEqual([]);
    });

    it('keeps the streak alive when today is not logged yet', () => {
        const r = computeMobilityStreak(['2026-09-24', '2026-09-25'], '2026-09-26');
        expect(r.current).toBe(2);
    });

    it('freezes the most recent missed day instead of breaking', () => {
        const r = computeMobilityStreak(
            ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-26'],
            '2026-09-26'
        );
        expect(r.current).toBe(2); // 9-26 + frozen 9-25
        expect(r.longest).toBe(3);
        expect(r.total).toBe(4);
        expect(r.newFreezes).toEqual(['2026-09-25']);
        expect(r.freezesAvailable).toBe(0);
    });

    it('freezes a single missed day mid-streak', () => {
        const r = computeMobilityStreak(['2026-09-24', '2026-09-26'], '2026-09-26');
        expect(r.current).toBe(3);
        expect(r.newFreezes).toEqual(['2026-09-25']);
    });

    it('only one freeze per week — a second gap still breaks', () => {
        const r = computeMobilityStreak(['2026-09-23', '2026-09-26'], '2026-09-26');
        expect(r.current).toBe(2); // 9-26 + frozen 9-25; 9-24 gap breaks it
        expect(r.newFreezes).toEqual(['2026-09-25']);
    });

    it('does not double-consume an already-frozen date', () => {
        const r = computeMobilityStreak(['2026-09-24', '2026-09-26'], '2026-09-26', ['2026-09-25']);
        expect(r.current).toBe(3);
        expect(r.newFreezes).toEqual([]);
        expect(r.freezesAvailable).toBe(0);
    });

    it('never freezes today itself or days before history began', () => {
        const r = computeMobilityStreak(['2026-09-25'], '2026-09-26');
        expect(r.current).toBe(1);
        expect(r.newFreezes).toEqual([]);
    });

    it('dedupes multiple logs on the same day', () => {
        const r = computeMobilityStreak(['2026-09-26', '2026-09-26', '2026-09-25'], '2026-09-26');
        expect(r.current).toBe(2);
        expect(r.total).toBe(2);
    });
});

describe('weekStartOf', () => {
    it('returns the Monday of the week', () => {
        expect(weekStartOf('2026-09-26')).toBe('2026-09-21'); // Saturday -> Monday
        expect(weekStartOf('2026-09-21')).toBe('2026-09-21'); // Monday -> itself
        expect(weekStartOf('2026-09-27')).toBe('2026-09-21'); // Sunday -> Monday
    });
});

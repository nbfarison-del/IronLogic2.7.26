import { describe, it, expect } from 'vitest';
import { computeMobilityStreak } from '../hooks/useMobilityStreak';

describe('computeMobilityStreak', () => {
    it('returns zeros for no logs', () => {
        expect(computeMobilityStreak([], '2026-09-26')).toEqual({ current: 0, longest: 0, total: 0 });
    });

    it('counts a streak ending today', () => {
        const r = computeMobilityStreak(['2026-09-24', '2026-09-25', '2026-09-26'], '2026-09-26');
        expect(r).toEqual({ current: 3, longest: 3, total: 3 });
    });

    it('keeps the streak alive when today is not logged yet', () => {
        const r = computeMobilityStreak(['2026-09-24', '2026-09-25'], '2026-09-26');
        expect(r.current).toBe(2);
    });

    it('breaks the streak after a missed day but keeps longest', () => {
        const r = computeMobilityStreak(
            ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-26'],
            '2026-09-26'
        );
        expect(r.current).toBe(1);
        expect(r.longest).toBe(3);
        expect(r.total).toBe(4);
    });

    it('dedupes multiple logs on the same day', () => {
        const r = computeMobilityStreak(['2026-09-26', '2026-09-26', '2026-09-25'], '2026-09-26');
        expect(r).toEqual({ current: 2, longest: 2, total: 2 });
    });
});

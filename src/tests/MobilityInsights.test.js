import { describe, it, expect } from 'vitest';
import { computeMobilityInsights } from '../services/MobilityInsights';

const W = (date, rpe) => ({ date, actualRpe: rpe });
const M = (date) => ({ date });

describe('computeMobilityInsights', () => {
    it('finds lower RPE on mobility-covered days', () => {
        const mobilityLogs = ['2026-09-20', '2026-09-24'].map(M);
        const workouts = [
            W('2026-09-18', 9), W('2026-09-19', 9),
            W('2026-09-20', 7), W('2026-09-21', 7),
            W('2026-09-22', 9), W('2026-09-23', 9),
            W('2026-09-24', 7), W('2026-09-25', 7),
        ];
        const r = computeMobilityInsights({ mobilityLogs, workouts, todayStr: '2026-09-26' });
        expect(r.avgRpeWithMobility).toBe(7);
        expect(r.avgRpeWithoutMobility).toBe(9);
        expect(r.message).toContain('feel easier');
    });

    it('counts day-before mobility as covered', () => {
        const mobilityLogs = [M('2026-09-20')];
        const workouts = [W('2026-09-21', 7), W('2026-09-22', 9), W('2026-09-23', 9), W('2026-09-24', 7), W('2026-09-25', 9), W('2026-09-26', 9)];
        const r = computeMobilityInsights({ mobilityLogs, workouts, todayStr: '2026-09-26' });
        expect(r.coveredDays).toBe(1); // 9/21 covered by 9/20 mobility
    });

    it('stays silent with too little data', () => {
        const r = computeMobilityInsights({ mobilityLogs: [M('2026-09-26')], workouts: [W('2026-09-26', 8)], todayStr: '2026-09-26' });
        expect(r.message).toBe(null);
    });

    it('counts this week mobility days', () => {
        const mobilityLogs = ['2026-09-21', '2026-09-24', '2026-09-26'].map(M);
        const r = computeMobilityInsights({ mobilityLogs, workouts: [], todayStr: '2026-09-26' });
        expect(r.weekMobilityDays).toBe(3);
    });
});

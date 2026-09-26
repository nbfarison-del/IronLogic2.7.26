import { describe, it, expect } from 'vitest';
import { prescribeMobility } from '../services/MobilityPrescription';

const logs = [];

describe('prescribeMobility', () => {
    it('prescribes overhead mobility for a snatch day, focus first', () => {
        const r = prescribeMobility({
            sessions: [{ name: 'W6 D1', exercises: [{ name: 'Snatch 5x3' }, { name: 'Back Squat' }] }],
            mobilityLogs: logs,
            dateStr: '2026-09-26',
        });
        expect(r.ruleId).toBe('overhead_day');
        expect(r.path.id).toBe('traditional');
        expect(r.exercises[0].id).toBe('puppy_dog');
        expect(r.isRestDay).toBe(false);
        expect(r.alreadyDone).toBe(false);
    });

    it('prefers squat rule when no overhead match', () => {
        const r = prescribeMobility({
            sessions: [{ name: 'Squat Day', exercises: [{ name: 'Back Squat 5x5' }] }],
            mobilityLogs: logs,
            dateStr: '2026-09-26',
        });
        expect(r.ruleId).toBe('squat_day');
        expect(r.path.id).toBe('ironlogic_general');
        expect(r.exercises[0].id).toBe('ironlogic_split_squat');
    });

    it('matches run days to Run Prep', () => {
        const r = prescribeMobility({
            sessions: [{ name: 'Easy 5k', exercises: [] }],
            mobilityLogs: logs,
            dateStr: '2026-09-26',
        });
        expect(r.ruleId).toBe('run_day');
        expect(r.path.id).toBe('run_prep');
    });

    it('prescribes rest-day session when nothing planned', () => {
        const r = prescribeMobility({ sessions: [], mobilityLogs: logs, dateStr: '2026-09-26' });
        expect(r.ruleId).toBe('rest_day');
        expect(r.isRestDay).toBe(true);
    });

    it('falls back to default for unrecognized sessions', () => {
        const r = prescribeMobility({
            sessions: [{ name: 'Mystery Workout', exercises: [{ name: 'Balance Board' }] }],
            mobilityLogs: logs,
            dateStr: '2026-09-26',
        });
        expect(r.path.id).toBe('traditional');
        expect(r.reason).toBeTruthy();
    });

    it('detects already-done mobility for the day', () => {
        const r = prescribeMobility({
            sessions: [],
            mobilityLogs: [{ date: '2026-09-26', pathId: 'traditional' }],
            dateStr: '2026-09-26',
        });
        expect(r.alreadyDone).toBe(true);
    });
});

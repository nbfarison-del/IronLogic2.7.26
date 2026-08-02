/**
 * Tests for OlympicWeightliftingEngine bar-position feature (dd486e4).
 * Focus: low-bar bb_squat exclusion from competition back-squat surfaces.
 */

import { describe, test, expect } from 'vitest';
import {
    analyzeWeakPoints,
    getOlympicProgressDashboard,
    getSmartRecommendations,
    calculateCompetitionPhase
} from '../services/OlympicWeightliftingEngine';

const lowBarSquat = { exerciseId: 'bb_squat', date: '2026-07-10', weight: 200, reps: 3, estimated1RM: 210, modifiers: { bar: 'Low Bar' } };
const highBarSquat = { exerciseId: 'bb_squat', date: '2026-07-15', weight: 220, reps: 3, estimated1RM: 230, modifiers: { bar: 'High Bar' } };
const unspecifiedBarSquat = { exerciseId: 'bb_squat', date: '2026-07-20', weight: 210, reps: 3, estimated1RM: 220 };
const cleanJerk = { exerciseId: 'oly_clean_and_jerk', date: '2026-07-25', weight: 140, reps: 1, estimated1RM: 150 };
const snatch = { exerciseId: 'oly_snatch', date: '2026-07-18', weight: 100, reps: 1, estimated1RM: 100 };

describe('getOlympicProgressDashboard - bar position filtering', () => {
    test('backSquat dashboard excludes low-bar bb_squat entries', () => {
        const dash = getOlympicProgressDashboard([lowBarSquat, highBarSquat], []);
        const e1rms = dash.backSquat.map(d => d.e1rm);
        expect(e1rms).toEqual([230]);
        expect(e1rms).not.toContain(210);
    });

    test('backSquat dashboard includes high-bar and unspecified (legacy) entries', () => {
        const dash = getOlympicProgressDashboard([lowBarSquat, highBarSquat, unspecifiedBarSquat], []);
        const e1rms = dash.backSquat.map(d => d.e1rm);
        expect(e1rms).toEqual([230, 220]);
    });

    test('low-bar exclusion only applies to backSquat, other dashboards unaffected', () => {
        const dash = getOlympicProgressDashboard([lowBarSquat, cleanJerk, snatch], []);
        expect(dash.snatch.map(d => d.e1rm)).toEqual([100]);
        expect(dash.cleanJerk.map(d => d.e1rm)).toEqual([150]);
        expect(dash.backSquat).toEqual([]);
    });

    test('total dashboard is snatch + cleanJerk (olympic lifts only)', () => {
        const dash = getOlympicProgressDashboard([lowBarSquat, snatch, cleanJerk], []);
        expect(dash.total[0].e1rm).toBe(250);
    });
});

describe('analyzeWeakPoints - competition back squat', () => {
    test('back squat uses latest non-low-bar entry when no profile value', () => {
        const result = analyzeWeakPoints({}, [lowBarSquat, highBarSquat, unspecifiedBarSquat, cleanJerk]);
        expect(result.ratios.cleanJerkToBackSquat).toBe(Math.round((150 / 220) * 100));
    });

    test('back squat falls back to profile max when only low-bar entries exist', () => {
        const profile = { olympicWeightliftingProfile: { backSquat1RM: 250, cleanJerk1RM: 150 } };
        const result = analyzeWeakPoints(profile, [lowBarSquat]);
        expect(result.ratios.cleanJerkToBackSquat).toBe(Math.round((150 / 250) * 100));
    });

    test('back squat is 0 when only low-bar entries exist and no profile value; no ratio flag fires', () => {
        const result = analyzeWeakPoints({}, [lowBarSquat, cleanJerk]);
        expect(result.ratios.cleanJerkToBackSquat).toBe(0);
        expect(result.flags).not.toContain('weak_pull');
    });
});

describe('calculateCompetitionPhase - regression', () => {
    test('unknown meet date returns General Prep', () => {
        const phase = calculateCompetitionPhase({ olympicWeightliftingProfile: {} });
        expect(phase.name).toBe('General Prep');
    });
});

describe('getSmartRecommendations - regression', () => {
    test('competition total excludes low-bar squat contributions', () => {
        const recs = getSmartRecommendations({ workouts: [lowBarSquat, snatch, cleanJerk] });
        expect(recs.some(r => r.text.includes('100 kg'))).toBe(false);
        expect(recs.some(r => r.text.includes('250 kg'))).toBe(true);
    });
});

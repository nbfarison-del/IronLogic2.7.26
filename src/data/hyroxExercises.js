/**
 * hyroxExercises.js
 * Hyrox-specific exercise definitions.
 * These are additive to the existing exercise list and use the existing EXERCISE_CATEGORIES.
 */

import { EXERCISE_CATEGORIES } from './exercises';

export const HYROX_CATEGORY = 'Hyrox';

/**
 * The 8 official Hyrox stations, plus the run segment, as a structured list.
 * metricType tells the logging UI what fields to show:
 *   'time'     → time (mm:ss) only
 *   'distance' → distance (m) only
 *   'reps'     → reps only
 *   'weight_distance' → weight + distance
 */
export const HYROX_STATIONS = [
    {
        id: 'hyrox_run',
        name: 'Hyrox Run (1km)',
        category: HYROX_CATEGORY,
        order: 0,
        metricType: 'time',
        standardDistance: 1000,
        unit: 'm',
        description: '1 km run between each station.'
    },
    {
        id: 'hyrox_skierg',
        name: 'SkiErg',
        category: HYROX_CATEGORY,
        order: 1,
        metricType: 'time',
        standardDistance: 1000,
        unit: 'm',
        description: '1000m on the SkiErg.'
    },
    {
        id: 'hyrox_sled_push',
        name: 'Sled Push',
        category: HYROX_CATEGORY,
        order: 2,
        metricType: 'weight_distance',
        standardDistance: 50,
        unit: 'm',
        description: '50m sled push.'
    },
    {
        id: 'hyrox_sled_pull',
        name: 'Sled Pull',
        category: HYROX_CATEGORY,
        order: 3,
        metricType: 'weight_distance',
        standardDistance: 50,
        unit: 'm',
        description: '50m sled pull.'
    },
    {
        id: 'hyrox_burpee_broad_jump',
        name: 'Burpee Broad Jump',
        category: HYROX_CATEGORY,
        order: 4,
        metricType: 'distance',
        standardDistance: 80,
        unit: 'm',
        description: '80m burpee broad jumps.'
    },
    {
        id: 'hyrox_rowing',
        name: 'Rowing (Ergometer)',
        category: HYROX_CATEGORY,
        order: 5,
        metricType: 'time',
        standardDistance: 1000,
        unit: 'm',
        description: '1000m on the rowing machine.'
    },
    {
        id: 'hyrox_farmers_carry',
        name: 'Farmers Carry',
        category: HYROX_CATEGORY,
        order: 6,
        metricType: 'weight_distance',
        standardDistance: 200,
        unit: 'm',
        description: '200m farmers carry.'
    },
    {
        id: 'hyrox_sandbag_lunges',
        name: 'Sandbag Lunges',
        category: HYROX_CATEGORY,
        order: 7,
        metricType: 'weight_distance',
        standardDistance: 100,
        unit: 'm',
        description: '100m sandbag lunges.'
    },
    {
        id: 'hyrox_wall_balls',
        name: 'Wall Balls',
        category: HYROX_CATEGORY,
        order: 8,
        metricType: 'weight_reps',
        standardReps: 100,
        unit: 'reps',
        description: '100 wall ball shots.'
    }
];

/**
 * Hyrox training exercises (non-race, used in training programs).
 * These integrate directly into the existing WorkoutLog exercise list.
 */
export const HYROX_TRAINING_EXERCISES = [
    { id: 'hyrox_skierg_training', name: 'SkiErg Intervals', category: HYROX_CATEGORY },
    { id: 'hyrox_sled_push_training', name: 'Sled Push (Training)', category: HYROX_CATEGORY },
    { id: 'hyrox_sled_pull_training', name: 'Sled Pull (Training)', category: HYROX_CATEGORY },
    { id: 'hyrox_burpee_bj_training', name: 'Burpee Broad Jump (Training)', category: HYROX_CATEGORY },
    { id: 'hyrox_rowing_training', name: 'Row Intervals', category: HYROX_CATEGORY },
    { id: 'hyrox_farmers_carry_training', name: 'Farmers Carry (Training)', category: HYROX_CATEGORY },
    { id: 'hyrox_sandbag_lunge_training', name: 'Sandbag Lunges (Training)', category: HYROX_CATEGORY },
    { id: 'hyrox_wall_balls_training', name: 'Wall Balls (Training)', category: HYROX_CATEGORY },
    { id: 'hyrox_run_training', name: 'Running (Hyrox Pace)', category: HYROX_CATEGORY },
    { id: 'hyrox_devils_press', name: "Devil's Press", category: HYROX_CATEGORY },
];

/**
 * Parse a "mm:ss" or "hh:mm:ss" string into total seconds.
 */
export const parseTimeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return Number(timeStr) || 0;
};

/**
 * Format total seconds into "mm:ss".
 */
export const formatSeconds = (totalSeconds) => {
    const s = Math.round(totalSeconds || 0);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/**
 * Calculate total race time from an array of station results.
 * Each result: { id, time?, distance?, weight?, reps?, splitSeconds? }
 */
export const calcTotalRaceTime = (results) => {
    return results.reduce((sum, r) => sum + (r.splitSeconds || 0), 0);
};

export default HYROX_STATIONS;

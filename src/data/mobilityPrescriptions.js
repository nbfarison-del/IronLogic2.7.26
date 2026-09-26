// Prescription rules: training day → mobility session.
// Consumed by src/services/MobilityPrescription.js (chunk 2).
//
// A rule matches when ANY regex in `match` hits the planned session's name
// or any of its exercise names (case-insensitive). Rules are evaluated in
// order — first match wins, so specific rules come before general ones.
//
//   pathId : id in mobilityPaths.js
//   focus  : exercise ids from that path, ordered first in the session
//   sports : training-day types this rule applies to ('lift' | 'run' | 'cardio' | 'rest')
//   reason : human-readable "why this session" shown on the home screen

export const prescriptionRules = [
    {
        id: 'run_day',
        label: 'Run Day',
        match: [/run/i, /sprint/i, /\b5k\b/i, /\b10k\b/i, /marathon/i, /tempo/i, /interval/i, /jog/i],
        pathId: 'run_prep',
        focus: ['tibialis_raise_run', 'bent_knee_calf_raise', 'ankle_rock_over_knee'],
        sports: ['run'],
        reason: 'Running hammers the lower leg. Ten minutes on shins, calves, and ankles keeps the chain healthy.',
    },
    {
        id: 'cardio_day',
        label: 'Conditioning Day',
        match: [/row/i, /\bbike\b/i, /cycl/i, /swim/i, /conditioning/i, /metcon/i, /assault/i, /\berg\b/i, /aerobic/i],
        pathId: 'cardio_recovery',
        focus: [],
        sports: ['cardio'],
        reason: 'Hard conditioning deserves a real downshift — breathe, lengthen, recover.',
    },
    {
        id: 'overhead_day',
        label: 'Overhead Day',
        match: [/snatch/i, /overhead/i, /press/i, /jerk/i, /thruster/i],
        pathId: 'traditional',
        focus: ['puppy_dog', 'twisted_cross', 'couch_stretch'],
        sports: ['lift'],
        reason: 'Overhead work loads the shoulders and thoracic spine. Open them up before and after.',
    },
    {
        id: 'squat_day',
        label: 'Squat Day',
        match: [/squat/i, /clean/i, /lunge/i, /step.?up/i, /split squat/i],
        pathId: 'ironlogic_general',
        focus: ['ironlogic_split_squat', 'patrick_step', 'tibialis_raise'],
        sports: ['lift'],
        reason: 'Deep knee flexion day. Bulletproof the knees and restore ankle range.',
    },
    {
        id: 'pull_day',
        label: 'Pull / Hinge Day',
        match: [/deadlift/i, /rdl/i, /good.?morning/i, /hinge/i, /pull/i, /row/i],
        pathId: 'traditional',
        focus: ['pigeon', 'frog', 'couch_stretch', 'seal'],
        sports: ['lift'],
        reason: 'Hinging loads the posterior chain. Give the hips, hamstrings, and low back their ten minutes.',
    },
    {
        id: 'plyo_day',
        label: 'Jump / Plyo Day',
        match: [/jump/i, /plyo/i, /box jump/i, /bound/i],
        pathId: 'ironlogic_jump',
        focus: [],
        sports: ['lift'],
        reason: 'Explosive day — prime the tendons and rehearse clean landings.',
    },
    {
        id: 'rest_day',
        label: 'Rest Day',
        match: [],
        pathId: 'traditional',
        focus: [],
        sports: ['rest'],
        reason: 'No training today. A full-body downshift keeps the streak alive and the joints happy.',
    },
];

// Used when a session matches no rule and isn't a rest day.
export const defaultPrescription = {
    pathId: 'traditional',
    focus: [],
    sports: ['general'],
    reason: 'General training day — ten minutes of full-body mobility.',
};

export const EXERCISE_CATEGORIES = {
    BARBELL: 'Barbell',
    DUMBBELL: 'Dumbbell',
    CABLE: 'Cable',
    MACHINE: 'Machine',
    BODYWEIGHT: 'Bodyweight',
    CORE: 'Core',
    CARDIO: 'Cardio',
    HYROX: 'Hyrox',
    CUSTOM: 'Custom'
};

export const exercises = [
    // Powerlifting / Key Barbell Movements
    { id: 'bb_squat', name: 'Barbell Squat', category: EXERCISE_CATEGORIES.BARBELL },
    { id: 'bb_bench', name: 'Barbell Bench Press', category: EXERCISE_CATEGORIES.BARBELL },
    { id: 'bb_deadlift', name: 'Barbell Deadlift', category: EXERCISE_CATEGORIES.BARBELL },
    { id: 'bb_ohp', name: 'Overhead Press', category: EXERCISE_CATEGORIES.BARBELL },
    { id: 'bb_row', name: 'Barbell Row', category: EXERCISE_CATEGORIES.BARBELL },
    { id: 'bb_rdl', name: 'Romanian Deadlift', category: EXERCISE_CATEGORIES.BARBELL },
    { id: 'bb_front_squat', name: 'Front Squat', category: EXERCISE_CATEGORIES.BARBELL },
    { id: 'sumo_deadlift', name: 'Sumo Deadlift', category: EXERCISE_CATEGORIES.BARBELL },

    // Dumbbell Accessories
    { id: 'db_press', name: 'Dumbbell Bench Press', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_incline_press', name: 'Incline DB Press', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_row', name: 'Dumbbell Row', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_shoulder_press', name: 'Seated DB Shoulder Press', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_lunge', name: 'Dumbbell Lunge', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_curl', name: 'Dumbbell Bicep Curl', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_lat_raise', name: 'Lateral Raise', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_front_raise', name: 'Front Raise', category: EXERCISE_CATEGORIES.DUMBBELL },
    { id: 'db_tricep_ext', name: 'DB Tricep Extension', category: EXERCISE_CATEGORIES.DUMBBELL },


    // Cable / Machines
    { id: 'cable_row', name: 'Seated Cable Row', category: EXERCISE_CATEGORIES.CABLE },
    { id: 'lat_pulldown', name: 'Lat Pulldown', category: EXERCISE_CATEGORIES.CABLE },
    { id: 'face_pull', name: 'Face Pull', category: EXERCISE_CATEGORIES.CABLE },
    { id: 'tricep_pushdown', name: 'Tricep Pushdown', category: EXERCISE_CATEGORIES.CABLE },
    { id: 'cable_fly', name: 'Cable Chest Fly', category: EXERCISE_CATEGORIES.CABLE },

    // Core
    { id: 'copenhagen_plank', name: 'Copenhagen Plank', category: EXERCISE_CATEGORIES.CORE },
    { id: 'plank', name: 'Plank', category: EXERCISE_CATEGORIES.CORE },
    { id: 'side_plank', name: 'Side Plank', category: EXERCISE_CATEGORIES.CORE },
    { id: 'situps', name: 'Situps', category: EXERCISE_CATEGORIES.CORE },
    { id: 'russian_twists', name: 'Russian Twists', category: EXERCISE_CATEGORIES.CORE },
    { id: 'leg_raises', name: 'Leg Raises', category: EXERCISE_CATEGORIES.CORE },


    // Cardio / Classes
    { id: 'run_outdoor', name: 'Running (Outdoor)', category: EXERCISE_CATEGORIES.CARDIO },
    { id: 'treadmill', name: 'Treadmill', category: EXERCISE_CATEGORIES.CARDIO },
    { id: 'cycling', name: 'Cycling', category: EXERCISE_CATEGORIES.CARDIO },
    { id: 'rowing_machine', name: 'Rowing Machine', category: EXERCISE_CATEGORIES.CARDIO },
    { id: 'group_hiit', name: 'HIIT Class', category: EXERCISE_CATEGORIES.CARDIO },
    { id: 'yoga', name: 'Yoga Class', category: EXERCISE_CATEGORIES.CARDIO },

    // Hyrox Training (non-race)
    { id: 'hyrox_skierg_training', name: 'SkiErg Intervals', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_sled_push_training', name: 'Sled Push (Training)', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_sled_pull_training', name: 'Sled Pull (Training)', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_burpee_bj_training', name: 'Burpee Broad Jump (Training)', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_rowing_training', name: 'Row Intervals', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_farmers_carry_training', name: 'Farmers Carry (Training)', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_sandbag_lunge_training', name: 'Sandbag Lunges (Training)', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_wall_balls_training', name: 'Wall Balls (Training)', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_run_training', name: 'Running (Hyrox Pace)', category: EXERCISE_CATEGORIES.HYROX },
    { id: 'hyrox_devils_press', name: "Devil's Press", category: EXERCISE_CATEGORIES.HYROX },
];

export const EXERCISE_CONFIG = {
    // Squat Variations
    bb_squat: {
        hasBarValues: ['High Bar', 'Low Bar', 'Front Squat', 'SSB'],
        hasPause: true,
        hasBelt: true,
        hasTempo: true,
        hasKneeWraps: true,
        hasSquatSuit: true // Implies straps up option
    },
    bb_front_squat: {
        hasPause: true,
        hasBelt: true,
        hasTempo: true,
        hasKneeWraps: true
    },

    // Bench Variations
    bb_bench: {
        hasGripValues: ['Competition Grip', 'Wide Grip', 'Close Grip'],
        hasPause: true,
        hasBelt: true,
        hasTempo: true,
        hasBenchShirt: true,
        hasSlingshot: true,
        hasFeetUp: true,
        hasBoardValues: ['3 Board', '2 Board', '1 Board', '0.5 Board']
    },
    db_press: { hasTempo: true },

    // Deadlift Variations
    bb_deadlift: {
        hasPause: true,
        hasBelt: true,
        hasTempo: true,
        hasDeadliftSuit: true // Implies straps up option
    },
    sumo_deadlift: {
        hasPause: true,
        hasBelt: true,
        hasTempo: true,
        hasDeadliftSuit: true
    },
    bb_rdl: { hasBelt: true, hasTempo: true },
    bb_ohp: { hasBelt: true, hasTempo: true }
};

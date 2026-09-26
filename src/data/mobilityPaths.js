import { mobilityExercises } from './mobilityExercises';

// Each path has:
//   sessionType: 'timer'  → countdown-based (like existing ROMWOD flow)
//   sessionType: 'reps'   → checklist-based (IronLogic-style)
//   sports:      which training-day types this path serves:
//                'lift' | 'run' | 'cardio' | 'rest' | 'general'
//   demoUrl:     optional direct link to a demo video (link-only, nothing hosted).
//                Falls back to a YouTube search built from youtubeQuery/name.
//
// All paths are designed for ~10 minutes total.

export const mobilityPaths = [
    // ─────────────────────────────────────────────
    // TRADITIONAL  (timer, 5 × 2-min = 10 min)
    // ─────────────────────────────────────────────
    {
        id: 'traditional',
        name: 'Traditional',
        subtitle: 'IronLogic-Style Flexibility',
        description: 'Passive holds and deep stretches to improve flexibility, recovery, and range of motion.',
        icon: '🧘',
        color: '#9c27b0',
        sessionType: 'timer',
        sports: ['lift', 'rest', 'general'],
        exercises: mobilityExercises.filter(ex =>
            !ex.id.endsWith('_maternal') &&
            !['deep_birth_squat', 'adductor_rock_back', '90_90_rocks', 'standing_lunge', 'ql_doorway_stretch'].includes(ex.id)
        ),
    },

    // ─────────────────────────────────────────────
    // IRONLOGIC GENERAL  (reps, ~10 min)
    // Knee Ability Zero — foundational knee-health protocol
    // Tibialis Raise 2×25 ~2min + Patrick Step 2×25/s ~3min +
    // KOT Calf Raise 2×25 ~2min + IronLogic Split Squat 3×5/s ~3min = ~10min
    // ─────────────────────────────────────────────
    {
        id: 'ironlogic_general',
        name: 'IronLogic General',
        subtitle: 'Knee Ability Zero',
        description: 'Build bulletproof knees through full-range strengthening from the ground up.',
        icon: '🦵',
        color: '#2196f3',
        sessionType: 'reps',
        sports: ['lift', 'general'],
        exercises: [
            {
                id: 'tibialis_raise',
                name: 'Tibialis Raise',
                type: 'bilateral',
                prescription: '2 × 25 reps',
                estimatedMins: 2,
                cue: 'Back against wall, feet out front. Lift toes toward knees. Feel the burn in your shins.',
                youtubeQuery: 'knees over toes tibialis raise',
                description: 'Strengthens the tibialis anterior — the most neglected muscle for knee health and shin splint prevention.',
            },
            {
                id: 'patrick_step',
                name: 'Patrick Step',
                type: 'unilateral',
                prescription: '2 × 25 reps/side',
                estimatedMins: 3,
                cue: 'Balance on one leg, hips forward. Slowly bend the knee forward over toes. Tap heel, return.',
                youtubeQuery: 'knees over toes Patrick step exercise',
                description: 'Core IronLogic movement for developing safe, pain-free knee-over-toe strength.',
            },
            {
                id: 'kot_calf_raise',
                name: 'KOT Calf Raise',
                type: 'bilateral',
                prescription: '2 × 25 reps',
                estimatedMins: 2,
                cue: 'Push knees forward over toes as you rise. Slow and controlled through the full range.',
                youtubeQuery: 'knees over toes calf raise soleus',
                description: 'Isolates the soleus — often the missing link in chronic knee pain.',
            },
            {
                id: 'ironlogic_split_squat',
                name: 'IronLogic Split Squat',
                type: 'unilateral',
                prescription: '3 × 5 reps/side',
                estimatedMins: 3,
                cue: 'Front knee drives far over toes. Hamstring covers calf at the bottom. Heel stays flat.',
                youtubeQuery: 'split squat knees over toes tutorial',
                description: 'The signature IronLogic movement. Builds quad strength, ankle mobility, and hip flexor length simultaneously.',
            },
        ],
    },

    // ─────────────────────────────────────────────
    // IRONLOGIC JUMP TRAINING  (reps, ~10 min)
    // Plyometric / athletic performance protocol
    // Pogo 3×20 ~2min + Depth Drop 3×5 ~1.5min + Broad Jump 3×5 ~1.5min +
    // Single-Leg Hop 3×8/s ~2.5min + Split Squat Jump 2×8/s ~2min = ~9.5min
    // ─────────────────────────────────────────────
    {
        id: 'ironlogic_jump',
        name: 'IronLogic Jump Training',
        subtitle: 'Plyometric Performance',
        description: 'Develop explosive power, reactive strength, and athletic jumping ability.',
        icon: '🚀',
        color: '#ff9800',
        sessionType: 'reps',
        sports: ['lift', 'general'],
        exercises: [
            {
                id: 'pogo_jumps',
                name: 'Pogo Jumps',
                type: 'bilateral',
                prescription: '3 × 20 reps',
                estimatedMins: 2,
                cue: 'Stay on your toes. Minimal ground contact. Ankles stiff and springy — not your hips.',
                youtubeQuery: 'pogo jumps reactive strength plyometric',
                description: 'Builds tendon stiffness and reactive strength — the foundation of explosive jumping.',
            },
            {
                id: 'depth_drop',
                name: 'Depth Drop',
                type: 'bilateral',
                prescription: '3 × 5 reps',
                estimatedMins: 2,
                cue: 'Step off a 6–12" box. Land softly with bent knees — quiet feet. Correct the landing before adding power.',
                youtubeQuery: 'depth drop landing mechanics plyometric training',
                description: 'Teaches proper landing patterns and eccentric force absorption — essential before jumping heavy.',
            },
            {
                id: 'broad_jump',
                name: 'Broad Jump',
                type: 'bilateral',
                prescription: '3 × 5 reps',
                estimatedMins: 2,
                cue: 'Arms swing back, then drive forward explosively. Stick the landing with both feet — controlled.',
                youtubeQuery: 'broad jump horizontal power plyometric',
                description: 'Develops horizontal explosive power and hip drive — transfers directly to sprint speed.',
            },
            {
                id: 'single_leg_hop',
                name: 'Single-Leg Hop',
                type: 'unilateral',
                prescription: '3 × 8 reps/side',
                estimatedMins: 2.5,
                cue: 'Push through the full foot. Land on the same leg and absorb with a slight knee bend. Build symmetry.',
                youtubeQuery: 'single leg hop plyometric training power',
                description: 'Identifies and corrects power asymmetries between legs — critical for injury prevention.',
            },
            {
                id: 'split_squat_jump',
                name: 'Split Squat Jump',
                type: 'unilateral',
                prescription: '2 × 8 reps/side',
                estimatedMins: 2,
                cue: 'Lower into a split squat then explode up. Keep the torso tall. Land with control.',
                youtubeQuery: 'split squat jump plyometric lunge explosion',
                description: 'Combines knee-over-toe strength with explosive power — the best of both IronLogic worlds.',
            },
        ],
    },

    // ─────────────────────────────────────────────
    // MATERNAL PREP  (timer, 5 × 2-min = 10 min)
    // Prenatal & childbirth preparation
    // ─────────────────────────────────────────────
    {
        id: 'maternal_prep',
        name: 'Maternal Prep',
        subtitle: 'Prenatal & Birth Preparation',
        description: 'Gentle poses and movements to prepare the body for childbirth and support a healthy pregnancy.',
        icon: '🌸',
        color: '#e91e8c',
        sessionType: 'timer',
        sports: ['general'],
        exercises: [
            ...mobilityExercises.filter(ex => ex.id.endsWith('_maternal')),
            mobilityExercises.find(ex => ex.id === 'deep_birth_squat'),
            mobilityExercises.find(ex => ex.id === 'adductor_rock_back'),
            mobilityExercises.find(ex => ex.id === '90_90_rocks'),
            mobilityExercises.find(ex => ex.id === 'standing_lunge'),
            mobilityExercises.find(ex => ex.id === 'ql_doorway_stretch'),
        ].filter(Boolean),
    },

    // ─────────────────────────────────────────────
    // RUN PREP  (reps, ~10 min)
    // Runner's reset: shins, calves, hip flexors, hamstrings, ankles
    // Tibialis Raise 2×25 ~2min + Bent-Knee Calf Raise 2×20 ~2min +
    // Hip Flexor Rock-Back 2×10/s ~2min + Hamstring Scoop 2×12 ~2min +
    // Ankle Rock-Over-Knee 2×15/s ~2min = ~10min
    // ─────────────────────────────────────────────
    {
        id: 'run_prep',
        name: 'Run Prep',
        subtitle: "Runner's Reset",
        description: 'Bulletproof the runner\'s chain — shins, calves, hips, and ankles — in ten minutes.',
        icon: '🏃',
        color: '#4caf50',
        sessionType: 'reps',
        sports: ['run', 'cardio'],
        exercises: [
            {
                id: 'tibialis_raise_run',
                name: 'Wall Tibialis Raise',
                type: 'bilateral',
                prescription: '2 × 25 reps',
                estimatedMins: 2,
                cue: 'Back against wall, feet out front. Lift toes toward knees. Your shin-splint insurance.',
                youtubeQuery: 'knees over toes tibialis raise',
                description: 'Strengthens the tibialis anterior — the first thing to fail on longer runs.',
            },
            {
                id: 'bent_knee_calf_raise',
                name: 'Bent-Knee Calf Raise',
                type: 'bilateral',
                prescription: '2 × 20 reps',
                estimatedMins: 2,
                cue: 'Slight knee bend, rise onto the balls of your feet. Slow lower. Feel the soleus, not the bounce.',
                youtubeQuery: 'bent knee calf raise soleus running',
                description: 'Loads the soleus, which handles up to 8x bodyweight on every running stride.',
            },
            {
                id: 'hip_flexor_rock_back',
                name: 'Hip Flexor Rock-Back',
                type: 'unilateral',
                prescription: '2 × 10 reps/side',
                estimatedMins: 2,
                cue: 'Half-kneeling. Squeeze the back glute, shift hips forward. Rock in and out of the stretch.',
                youtubeQuery: 'half kneeling hip flexor stretch runners',
                description: 'Opens hip flexors shortened by sitting — restores stride length.',
            },
            {
                id: 'hamstring_scoop',
                name: 'Hamstring Scoop',
                type: 'bilateral',
                prescription: '2 × 12 reps',
                estimatedMins: 2,
                cue: 'Soft knees, hinge at the hips, scoop arms along your legs. Hinge, don\'t round.',
                youtubeQuery: 'standing hamstring mobility drill runners',
                description: 'Dynamic hamstring length for a freer backside swing phase.',
            },
            {
                id: 'ankle_rock_over_knee',
                name: 'Ankle Rock-Over-Knee',
                type: 'unilateral',
                prescription: '2 × 15 reps/side',
                estimatedMins: 2,
                cue: 'Half-kneeling, knee over toes, heel pinned down. Drive the knee as far forward as it goes.',
                youtubeQuery: 'knee over toes ankle mobility drill',
                description: 'Restores ankle dorsiflexion — the joint that decides how your foot strikes.',
            },
        ],
    },

    // ─────────────────────────────────────────────
    // CARDIO RECOVERY  (timer, 5 × 2-min = 10 min)
    // Easy full-body downshift after conditioning, cycling, rowing, swimming
    // ─────────────────────────────────────────────
    {
        id: 'cardio_recovery',
        name: 'Cardio Recovery',
        subtitle: 'Conditioning Cooldown',
        description: 'A ten-minute full-body downshift after hard conditioning — breathe, lengthen, recover.',
        icon: '🌊',
        color: '#00bcd4',
        sessionType: 'timer',
        sports: ['cardio', 'run', 'rest'],
        exercises: mobilityExercises.filter(ex =>
            ['childs_pose', 'cat_cow_maternal', 'pigeon', 'puppy_dog', 'straddle'].includes(ex.id)
        ),
    },
];

import { mobilityExercises } from './mobilityExercises';

// Each path has:
//   sessionType: 'timer'  → countdown-based (like existing ROMWOD flow)
//   sessionType: 'reps'   → checklist-based (IronLogic-style)
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
        exercises: mobilityExercises, // 5 are randomly selected at runtime
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
        exercises: [
            {
                id: 'cat_cow',
                name: 'Cat–Cow',
                type: 'bilateral',
                duration: 120,
                description: 'Gentle spinal flexion and extension on hands and knees. Relieves lower back tension and promotes pelvic mobility — safe for all trimesters.',
            },
            {
                id: 'hip_circles',
                name: 'Standing Hip Circles',
                type: 'bilateral',
                duration: 120,
                description: 'Slow, wide hip rotations in standing. Loosens the sacroiliac joint and opens the pelvis — excellent for encouraging baby into optimal position.',
            },
            {
                id: 'bound_angle',
                name: 'Bound Angle (Butterfly)',
                type: 'bilateral',
                duration: 120,
                description: 'Seated with soles of feet together, gentle pressure on inner thighs. Opens the groin and hips. A key pose for pelvic floor relaxation and birth preparation.',
            },
            {
                id: 'malasana',
                name: 'Malasana Squat',
                type: 'bilateral',
                duration: 120,
                description: 'Deep squat with hands in prayer or holding onto support. Opens the hips and pelvis, strengthens pelvic floor, and encourages optimal fetal positioning for birth.',
            },
            {
                id: 'pelvic_tilts',
                name: 'Pelvic Tilts',
                type: 'bilateral',
                duration: 120,
                description: 'On hands and knees or against a wall — gently tilt pelvis forward and back. Strengthens the pelvic floor and lower back, relieves pregnancy-related back pain.',
            },
        ],
    },
];

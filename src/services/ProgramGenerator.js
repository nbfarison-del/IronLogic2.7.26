import { EXERCISE_CATEGORIES } from '../data/exercises';

export const generateProgram = (data) => {
    // Default to 4 weeks
    const program = {
        name: `AI - ${data.goal?.[0] || 'Custom'} Program`,
        weeks: [],
        createdAt: new Date().toISOString()
    };

    const daysPerWeek = parseInt(data.frequency) || 3;
    const durationWeeks = 4; // MVP: 4 week blocks
    const goal = data.goal?.[0] || 'General Fitness';
    const experience = data.experience || 'Beginner';

    // Determine Split
    let split = [];
    if (daysPerWeek === 1) split = ['Full Body'];
    else if (daysPerWeek === 2) split = ['Upper', 'Lower'];
    else if (daysPerWeek === 3) split = ['Full Body', 'Full Body', 'Full Body'];
    else if (daysPerWeek === 4) split = ['Upper', 'Lower', 'Upper', 'Lower'];
    else if (daysPerWeek === 5) split = ['Upper', 'Lower', 'Push', 'Pull', 'Legs'];
    else split = ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs']; // 6 days

    // Helper to get exercises
    const getCompound = (type) => {
        if (type === 'Legs' || type === 'Lower' || type === 'Full Body') return 'bb_squat';
        if (type === 'Push' || type === 'Upper') return 'bb_bench';
        if (type === 'Pull') return 'bb_deadlift';
        return 'bb_squat';
    };

    // Scheme based on Goal/Experience
    let mainScheme = { sets: 3, reps: '8-12', rpe: 7 };
    if (goal === 'Strength') {
        if (experience === 'Beginner') mainScheme = { sets: 5, reps: '5', rpe: 8 };
        else mainScheme = { sets: 5, reps: '3-5', rpe: 9 };
    } else if (goal === 'Hypertrophy') {
        mainScheme = { sets: 4, reps: '8-12', rpe: 8 };
    }

    // Generate Weeks
    for (let w = 1; w <= durationWeeks; w++) {
        const week = {
            weekNumber: w,
            days: []
        };

        // Generate Days
        split.forEach((dayType, i) => {
            const day = {
                dayName: `Day ${i + 1} - ${dayType}`,
                exercises: []
            };

            // 1. Main Compound
            const mainExId = getCompound(dayType);
            day.exercises.push({
                exerciseId: mainExId,
                sets: mainScheme.sets,
                reps: mainScheme.reps,
                rpe: mainScheme.rpe,
                notes: `Week ${w} Focus: Main Compound`
            });

            // 2. Accessory
            if (dayType.includes('Upper') || dayType.includes('Push')) {
                day.exercises.push({ exerciseId: 'db_bench', sets: 3, reps: '10-12', rpe: 8, notes: 'Control the eccentric' });
                day.exercises.push({ exerciseId: 'db_fly', sets: 3, reps: '12-15', rpe: 8, notes: 'Stretch focus' });
            }
            if (dayType.includes('Lower') || dayType.includes('Legs')) {
                day.exercises.push({ exerciseId: 'db_lunge', sets: 3, reps: '10 each', rpe: 8, notes: 'Keep torso upright' });
                day.exercises.push({ exerciseId: 'leg_press', sets: 3, reps: '12-15', rpe: 8, notes: 'Full ROM' });
            }
            if (dayType.includes('Pull') || dayType.includes('Full Body')) {
                day.exercises.push({ exerciseId: 'lat_pulldown', sets: 3, reps: '10-12', rpe: 8, notes: 'Squeeze at bottom' });
                day.exercises.push({ exerciseId: 'db_row', sets: 3, reps: '10 each', rpe: 8, notes: 'Don\'t swing' });
            }

            // 3. Core
            day.exercises.push({ exerciseId: 'plank', sets: 3, reps: '60s', rpe: 8, notes: 'Brace core' });

            week.days.push(day);
        });

        program.weeks.push(week);
    }

    return program;
};

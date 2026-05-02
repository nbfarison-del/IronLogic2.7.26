const VALID_RPE_MIN = 1;
const VALID_RPE_MAX = 10;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toPositiveInt = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const validateProgram = (program) => {
    const errors = [];

    if (!isPlainObject(program)) {
        return { isValid: false, errors: ['Program response was empty or not an object.'] };
    }

    if (!program.name || typeof program.name !== 'string') {
        errors.push('Program is missing a name.');
    }

    if (!Array.isArray(program.weeks) || program.weeks.length === 0) {
        errors.push('Program must include at least one week.');
    } else {
        program.weeks.forEach((week, weekIndex) => {
            const weekNumber = toPositiveInt(week?.weekNumber);
            if (!weekNumber) errors.push(`Week ${weekIndex + 1} is missing a valid week number.`);

            if (!Array.isArray(week?.days) || week.days.length === 0) {
                errors.push(`Week ${weekNumber || weekIndex + 1} must include at least one training day.`);
                return;
            }

            week.days.forEach((day, dayIndex) => {
                const dayNumber = toPositiveInt(day?.dayNumber);
                if (!dayNumber || dayNumber < 1 || dayNumber > 7) {
                    errors.push(`Week ${weekNumber || weekIndex + 1}, day ${dayIndex + 1} must use dayNumber 1-7.`);
                }

                if (!Array.isArray(day?.exercises) || day.exercises.length === 0) {
                    errors.push(`Week ${weekNumber || weekIndex + 1}, day ${dayNumber || dayIndex + 1} needs at least one exercise.`);
                    return;
                }

                day.exercises.forEach((exercise, exerciseIndex) => {
                    const label = `Week ${weekNumber || weekIndex + 1}, day ${dayNumber || dayIndex + 1}, exercise ${exerciseIndex + 1}`;
                    if (!exercise?.exerciseId && !exercise?.name) {
                        errors.push(`${label} is missing an exercise ID or name.`);
                    }

                    if (!toPositiveInt(exercise?.sets)) {
                        errors.push(`${label} is missing a valid set count.`);
                    }

                    if (!exercise?.reps || String(exercise.reps).trim() === '') {
                        errors.push(`${label} is missing reps.`);
                    }

                    if (exercise?.rpe !== undefined && exercise.rpe !== '') {
                        const rpe = Number.parseFloat(exercise.rpe);
                        if (!Number.isFinite(rpe) || rpe < VALID_RPE_MIN || rpe > VALID_RPE_MAX) {
                            errors.push(`${label} has an RPE outside 1-10.`);
                        }
                    }

                    if (exercise?.isNew && (!exercise.name || !exercise.category)) {
                        errors.push(`${label} is marked as custom but is missing a name or category.`);
                    }
                });
            });
        });
    }

    return { isValid: errors.length === 0, errors };
};


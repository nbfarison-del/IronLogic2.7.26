/**
 * Calculates Estimated 1RM using the Epley formula adjusted for RPE.
 */
export const calculateEstimated1RM = (weight, reps, rpe) => {
    const parsedWeight = parseFloat(weight);
    const parsedReps = parseInt(reps, 10);
    if (!Number.isFinite(parsedWeight) || !Number.isFinite(parsedReps) || parsedWeight <= 0 || parsedReps <= 0) return 0;
    const effectiveRpe = rpe ? parseFloat(rpe) : 10;
    if (!Number.isFinite(effectiveRpe) || effectiveRpe > 10) return 0;
    const rir = 10 - effectiveRpe;
    const projectedMaxReps = parsedReps + rir;
    const e1rm = parsedWeight * (1 + projectedMaxReps / 30);
    return Math.round(e1rm);
};

/**
 * Calculates target weight based on 1RM, target reps, and target RPE.
 * Reverse Epley: Weight = 1RM / (1 + (Reps + (10 - RPE)) / 30)
 */
export const calculateWeightFrom1RM = (oneRM, targetReps, targetRpe) => {
    if (!oneRM || !targetReps) return 0;
    const effectiveRpe = targetRpe ? parseFloat(targetRpe) : 10;
    const rir = 10 - effectiveRpe;
    const projectedMaxReps = parseFloat(targetReps) + rir;
    const targetWeight = oneRM / (1 + projectedMaxReps / 30);
    return Math.round(targetWeight);
};

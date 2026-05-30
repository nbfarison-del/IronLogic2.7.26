import { isOlympicExercise, summarizeLiftSuccess } from '../utils/olympicWeightlifting';

export const summarizeOlympicSession = (entries) => {
    const olympicEntries = (entries || []).filter(entry => isOlympicExercise(entry));
    const { missedLiftCount, successfulLiftPercentage } = summarizeLiftSuccess(
        olympicEntries.map(entry => ({ missedLift: entry.olympicSet?.missedLift }))
    );

    const averageTechnicalQuality = olympicEntries.length
        ? Math.round(
            olympicEntries.reduce((sum, entry) => sum + (parseFloat(entry.olympicSet?.technicalQualityScore) || 0), 0)
            / olympicEntries.length
        )
        : null;

    return {
        totalOlympicSets: olympicEntries.length,
        missedLiftCount,
        successfulLiftPercentage,
        averageTechnicalQuality
    };
};

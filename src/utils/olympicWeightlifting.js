import { olympicExerciseById } from '../data/olympicWeightlifting';

export const isOlympicExercise = (exerciseOrId) => {
    const id = typeof exerciseOrId === 'string' ? exerciseOrId : exerciseOrId?.id || exerciseOrId?.exerciseId;
    return Boolean(id && olympicExerciseById[id]);
};

export const getOlympicExerciseMetadata = (exerciseOrId) => {
    const id = typeof exerciseOrId === 'string' ? exerciseOrId : exerciseOrId?.id || exerciseOrId?.exerciseId;
    return id ? olympicExerciseById[id] || null : null;
};

export const calculateLoadFromPercentage = (oneRepMax, percentage) => {
    const max = parseFloat(oneRepMax);
    const pct = parseFloat(percentage);
    if (!Number.isFinite(max) || !Number.isFinite(pct)) return '';
    return Math.round((max * pct) / 100);
};

export const calculatePercentageOf1RM = (weight, oneRepMax) => {
    const load = parseFloat(weight);
    const max = parseFloat(oneRepMax);
    if (!Number.isFinite(load) || !Number.isFinite(max) || max <= 0) return '';
    return Math.round((load / max) * 100);
};

export const createEmptyTechnicalNotes = () => ({
    timingIssues: '',
    catchPosition: '',
    pullMechanics: '',
    balanceObservations: '',
    coachCues: '',
    mobilityLimitations: ''
});

export const createVideoAnalysisStub = (videoUrl = '') => ({
    videoUrl,
    uploadStatus: videoUrl ? 'linked' : 'none',
    frameAnalysis: [],
    poseEstimation: null,
    barPathTracking: null,
    aiTechnicalScoring: null,
    schemaVersion: 1
});

export const summarizeLiftSuccess = (sets) => {
    const rows = Array.isArray(sets) ? sets : [];
    const missedLiftCount = rows.filter(row => Boolean(row.missedLift)).length;
    const total = rows.length;
    const successfulLiftPercentage = total > 0 ? Math.round(((total - missedLiftCount) / total) * 100) : 100;
    return { missedLiftCount, successfulLiftPercentage };
};

export const buildOlympicSetMetadata = ({ row, exercise, session, technicalNotes, videoUrl }) => {
    const exerciseMetadata = getOlympicExerciseMetadata(exercise);
    if (!exerciseMetadata) return {};

    return {
        sport: 'olympic_weightlifting',
        movementType: exerciseMetadata.movementType,
        exerciseMetadata: {
            technicalComplexity: exerciseMetadata.technicalComplexity,
            primaryMuscleGroups: exerciseMetadata.primaryMuscleGroups,
            skillClassification: exerciseMetadata.skillClassification,
            mobilityRequirements: exerciseMetadata.mobilityRequirements,
            recommendedRepRange: exerciseMetadata.recommendedRepRange,
            recommendedIntensityRange: exerciseMetadata.recommendedIntensityRange,
            technicalEmphasisTags: exerciseMetadata.technicalEmphasisTags
        },
        olympicSet: {
            barbellLoad: row.weight || '',
            percentageOf1RM: row.percentageOf1RM || '',
            rpe: row.actualRpe || row.targetRpe || '',
            technicalQualityScore: row.technicalQualityScore || '',
            barSpeedRating: row.barSpeedRating || '',
            missedLift: Boolean(row.missedLift)
        },
        olympicSession: {
            sessionReadiness: session.sessionReadiness,
            mobilityReadiness: session.mobilityReadiness
        },
        technicalNotes,
        videoAnalysis: createVideoAnalysisStub(videoUrl)
    };
};

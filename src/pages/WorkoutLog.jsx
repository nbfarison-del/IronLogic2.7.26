import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useTimer } from '../context/TimerContext';
import { useToast } from '../context/ToastContext';


import { exercises as defaultExercises, EXERCISE_CATEGORIES } from '../data/exercises';
import ExerciseTools from '../components/ExerciseTools';
import OlympicSetLogger from '../components/OlympicSetLogger';
import * as firestoreService from '../services/firestoreService';
import { runDMAICCycle } from '../services/DMAICService';
import { useRef } from 'react';
import { logger } from '../utils/logger';
import { syncService } from '../services/SyncService';
import {
    buildOlympicSetMetadata,
    createEmptyTechnicalNotes,
    isOlympicExercise,
    summarizeLiftSuccess
} from '../utils/olympicWeightlifting';
import {
    buildOlympicSession,
    getRecoveryAdjustment,
    getSubstitutionOptions
} from '../services/OlympicWeightliftingEngine';

// Exercises where distance is captured as whole meters rather than a decimal distance.
const METER_BASED_EXERCISE_IDS = new Set([
    'run_outdoor', 'treadmill', 'cycling', 'rowing_machine',
]);

const METER_BASED_NAME_PATTERN = /\b(running|run|row|rowing)\b/i;

const isMeterBasedExercise = (exerciseOrId) => {
    const id = typeof exerciseOrId === 'string' ? exerciseOrId : exerciseOrId?.id || exerciseOrId?.exerciseId;
    const name = typeof exerciseOrId === 'string' ? '' : exerciseOrId?.name || exerciseOrId?.exerciseName || '';
    const metricType = typeof exerciseOrId === 'string' ? '' : exerciseOrId?.metricType;
    const exerciseUnit = typeof exerciseOrId === 'string' ? '' : exerciseOrId?.unit;

    if (metricType === 'meters' || exerciseUnit === 'm') return true;
    if (id && METER_BASED_EXERCISE_IDS.has(id)) return true;
    return METER_BASED_NAME_PATTERN.test(name);
};

const useWakeLock = () => {
    const [isWakeLockActive, setIsWakeLockActive] = useState(false);
    const wakeLockRef = useRef(null);

    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                setIsWakeLockActive(true);
                wakeLockRef.current.addEventListener('release', () => {
                    setIsWakeLockActive(false);
                });
            }
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current !== null) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
            setIsWakeLockActive(false);
        }
    };

    return { isWakeLockActive, requestWakeLock, releaseWakeLock };
};

// Browser-robust YYYY-MM-DD helper
const getDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const createSetRow = (overrides = {}) => ({
    id: Date.now() + Math.random(),
    weight: '',
    reps: '',
    targetRpe: '',
    actualRpe: '',
    percentageOf1RM: '',
    technicalQualityScore: '',
    barSpeedRating: '',
    missedLift: false,
    ...overrides
});

const WorkoutLog = () => {
    const { user } = useAuth();
    const { athleteId: paramAthleteId } = useParams();
    const targetUserId = paramAthleteId || user?.id;
    const isViewingOther = !!paramAthleteId && paramAthleteId !== user?.id;

    const { unit } = useSettings();
    const { start: startTimer, setType, setDuration: setTimerDuration, reset: resetTimer, isOpen: isTimerOpen, toggleTimer } = useTimer();
    const { showToast } = useToast();
    const location = useLocation();



    const [extWorkouts, setExtWorkouts] = useState([]);
    const [extCustom, setExtCustom] = useState([]);
    const [extPlanned, setExtPlanned] = useState([]);
    const [extLoading, setExtLoading] = useState(isViewingOther);
    const {
        workouts: syncedWorkouts,
        customExercises: syncedCustom,
        plannedWorkouts,
        recovery,
        profile,
        isLoading: dataLoading,
        trainingMaxes,
        syncStatus,
        pendingSyncCount,
        updateSessionOptimistically
    } = useData();


    useEffect(() => {
        if (!isViewingOther) return;
        const loadExtData = async () => {
            setExtLoading(true);
            try {
                const [w, c, p] = await Promise.all([
                    firestoreService.getWorkouts(targetUserId, 50),
                    firestoreService.getCustomExercises(targetUserId),
                    firestoreService.getPlannedWorkouts(targetUserId)
                ]);
                setExtWorkouts(w);
                setExtCustom(c);
                setExtPlanned(p);
            } catch (err) {
                console.error("Error loading athlete data:", err);
            } finally {
                setExtLoading(false);
            }
        };
        loadExtData();
    }, [targetUserId, isViewingOther]);

    const workouts = isViewingOther ? extWorkouts : syncedWorkouts;
    const customExercises = isViewingOther ? extCustom : syncedCustom;
    const planned = isViewingOther ? extPlanned : plannedWorkouts;

    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const queryParams = new URLSearchParams(location.search);
    const dateParam = queryParams.get('date');
    const planIdParam = queryParams.get('planId');
    const isOlympicMode = location.pathname.includes('olympic-lifting');

    const isCoachViewing = paramAthleteId && paramAthleteId !== user?.id;

    const activePlannedWorkout = useMemo(() => {
        if (location.state?.plannedWorkout) return location.state.plannedWorkout;
        if (planIdParam) {
            const found = planned.find(p => p.id === planIdParam);
            if (found) return found;
        }
        const todayStr = getDateStr(new Date());
        return planned.find(p => p.date === todayStr);
    }, [location.state, planIdParam, planned]);

    const generatedOlympicWorkout = useMemo(() => {
        if (!isOlympicMode || activePlannedWorkout) return null;
        return {
            ...buildOlympicSession({ profile, workouts: syncedWorkouts, recovery }),
            id: 'generated_olympic_today',
            date: getDateStr(new Date()),
            exercises: buildOlympicSession({ profile, workouts: syncedWorkouts, recovery }).exercises.map((exercise, index) => ({
                ...exercise,
                id: exercise.id || `${exercise.exerciseId}_${index}`
            }))
        };
    }, [activePlannedWorkout, isOlympicMode, profile, recovery, syncedWorkouts]);

    const activeWorkoutPlan = activePlannedWorkout || generatedOlympicWorkout;

    const allExercisesList = useMemo(() => [
        ...defaultExercises,
        ...(customExercises || [])
    ], [customExercises]);

    const selectedExercise = useMemo(() => {
        return allExercisesList.find(ex => ex.id === selectedExerciseId);
    }, [allExercisesList, selectedExerciseId]);

    const isSelectedOlympicExercise = useMemo(() => {
        return isOlympicExercise(selectedExercise || selectedExerciseId);
    }, [selectedExercise, selectedExerciseId]);

    const [selectedDate, setSelectedDate] = useState(() => {
        if (dateParam) return new Date(dateParam + 'T12:00:00');
        if (location.state?.plannedWorkout?.date) return new Date(location.state.plannedWorkout.date + 'T12:00:00');
        return new Date();
    });

    const [selectedPlannedExId, setSelectedPlannedExId] = useState(null);
    const [workoutType, setWorkoutType] = useState('strength');
    const [setRows, setSetRows] = useState([createSetRow()]);
    const [notes, setNotes] = useState('');
    const [technicalNotes, setTechnicalNotes] = useState(createEmptyTechnicalNotes);
    const [sessionReadiness, setSessionReadiness] = useState('');
    const [mobilityReadiness, setMobilityReadiness] = useState('');
    const [olympicOneRepMax, setOlympicOneRepMax] = useState('');
    const [duration, setDuration] = useState('');
    const [distance, setDistance] = useState('');
    const [meters, setMeters] = useState('');
    const [saving, setSaving] = useState(false);
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);
    const [newExerciseName, setNewExerciseName] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [modifiers] = useState({
        grip: '', bar: '', pause: '', tempo: '',
        isBelt: false, isKneeWraps: false,
        isSquatSuit: false, isSquatSuitStrapsUp: false,
        isBenchShirt: false, isSlingshot: false, board: '',
        isDeadliftSuit: false, isDeadliftSuitStrapsUp: false, isFeetUp: false
    });
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [autoRest, setAutoRest] = useState(true);
    const [showRpeModal, setShowRpeModal] = useState(false);
    const [sessionRpe, setSessionRpe] = useState(7);
    const [completionFeedback, setCompletionFeedback] = useState({
        recoveryScore: 7,
        sleepQuality: 7,
        motivationLevel: 7,
        painScore: 1
    });
    const [pendingSaves, setPendingSaves] = useState(0);
    const [finalizeError, setFinalizeError] = useState(null);


    
    const weightInputRef = useRef([]);
    const repsInputRef = useRef([]);

    const { requestWakeLock, releaseWakeLock } = useWakeLock();
    const [keepAwake, setKeepAwake] = useState(false);

    useEffect(() => {
        if (keepAwake) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }
        return () => releaseWakeLock();
    }, [keepAwake]);

    useEffect(() => {
        if (!targetUserId || !selectedDate) return;
        const dateStr = getDateStr(selectedDate);
        const unsubscribe = firestoreService.subscribeToSessionStatus(targetUserId, dateStr, (status) => {
            setIsSessionComplete(status);
        });
        return () => unsubscribe();
    }, [targetUserId, selectedDate]);

    const handleFinalizeWorkout = () => {
        setShowRpeModal(true);
    };

    const confirmFinalize = async () => {
        if (pendingSaves > 0) {
            showToast("Please wait for all sets to finish saving.", "warn");
            return;
        }

        setSaving(true);
        setFinalizeError(null);
        const dateStr = getDateStr(selectedDate);
        
        logger.info('User confirmed session finalization', { 
            targetUserId, 
            dateStr, 
            sessionRpe,
            loggedSetsCount: loggedSets.length 
        });

        try {
            // Instead of direct call, we use SyncService
            syncService.enqueueSessionFinalization(targetUserId, dateStr, {
                sessionRpe,
                ...completionFeedback,
                recoveryAdjustment: getRecoveryAdjustment({ sessionRpe, ...completionFeedback }, recovery),
                loggedSetsCount: loggedSets.length,
                workoutType: workoutType,
                trainingMode: isOlympicMode || loggedSets.some(set => set.sport === 'olympic_weightlifting') ? 'olympic_weightlifting' : workoutType,
                dmaic: {
                    define: profile?.olympicWeightliftingProfile?.goals || profile?.primaryGoal || 'Complete planned training',
                    measure: 'Session RPE, recovery, sleep, motivation, pain, logged sets, volume, intensity, and readiness.',
                    analyze: 'Session feedback updates recovery adjustment and weak point monitoring.',
                    improve: 'Next session volume, intensity, and exercise selection adapt from these responses.',
                    control: 'Persist session completion through offline queue and batched server finalization.'
                }
            });

            // Optimistic UI update: Trigger global state change immediately
            updateSessionOptimistically(dateStr, {
                sessionRpe,
                ...completionFeedback,
                loggedSetsCount: loggedSets.length,
                workoutType: workoutType
            });

            // Optimistic UI update: Trigger local state change immediately
            setIsSessionComplete(true);
            setShowRpeModal(false);
            
            if (syncStatus === 'online') {
                showToast("Session complete. Syncing with server...", "success");
            } else {
                showToast("Session saved locally. Will sync when online.", "info");
            }

            if (isCoachViewing) {
                await runDMAICCycle(targetUserId);
            }
            
            logger.info('Session finalization enqueued', { targetUserId, dateStr });
        } catch (error) {
            logger.error('Error in confirmFinalize', { targetUserId, dateStr, error: error.message });
            setFinalizeError("Persistence failed. Please try again.");
            showToast("Failed to finalize session. Please check your connection and retry.", "error");
        } finally {
            setSaving(false);
        }
    };


    const handleReopenWorkout = async () => {
        try {
            await firestoreService.markSessionComplete(targetUserId, getDateStr(selectedDate), false);
        } catch (error) {
            console.error('Error reopening workout:', error);
        }
    };

    const loadPlannedExercise = (plannedEx) => {
        if (!plannedEx) return;
        setSelectedPlannedExId(plannedEx.id);
        const exMatch = allExercisesList.find(e => e.id === plannedEx.exerciseId || e.name === plannedEx.exerciseName);
        if (exMatch) {
            setSelectedExerciseId(exMatch.id);
            setWorkoutType(exMatch.category === EXERCISE_CATEGORIES.CARDIO || isMeterBasedExercise(exMatch) ? 'cardio' : 'strength');
        } else {
            setSelectedExerciseId(plannedEx.exerciseId);
            setWorkoutType(isMeterBasedExercise(plannedEx) ? 'cardio' : 'strength');
        }
        if (plannedEx.sets && Array.isArray(plannedEx.sets)) {
            setSetRows(plannedEx.sets.map(s => createSetRow({
                weight: s.weight || '',
                reps: s.reps || '',
                targetRpe: s.targetRpe || '',
                actualRpe: '',
                percentageOf1RM: s.percentageOf1RM || '',
                technicalQualityScore: s.technicalQualityScore || '',
                barSpeedRating: s.barSpeedRating || '',
                missedLift: false
            })));
        }
        setNotes(plannedEx.notes || '');
    };

    useEffect(() => {
        if (activeWorkoutPlan && activeWorkoutPlan.exercises?.length > 0 && !selectedExerciseId) {
            loadPlannedExercise(activeWorkoutPlan.exercises[0]);
        }
    }, [activeWorkoutPlan, allExercisesList]);

    const loggedSets = useMemo(() => {
        if (!workouts) return [];
        const today = getDateStr(selectedDate);
        return workouts.filter(w => {
            const workoutDate = w.date.includes('T') ? w.date.split('T')[0] : w.date;
            return workoutDate === today;
        });
    }, [workouts, selectedDate]);

    const calculateEstimated1RM = (weight, reps, rpe) => {
        if (!weight || !reps || !rpe) return 0;
        const w = parseFloat(weight);
        const r = parseInt(reps);
        const rp = parseFloat(rpe);
        if (isNaN(w) || isNaN(r) || isNaN(rp)) return 0;
        const effectiveReps = r + (10 - rp);
        if (effectiveReps <= 0) return 0;
        return Math.round(w * (36 / (37 - effectiveReps)));
    };

    const handleAddRow = () => {
        const lastRow = setRows[setRows.length - 1];
        setSetRows([...setRows, createSetRow({
            weight: lastRow?.weight || '',
            reps: lastRow?.reps || '',
            targetRpe: lastRow?.targetRpe || '',
            actualRpe: '',
            percentageOf1RM: lastRow?.percentageOf1RM || '',
            technicalQualityScore: '',
            barSpeedRating: lastRow?.barSpeedRating || '',
            missedLift: false
        })]);
        setTimeout(() => {
            if (weightInputRef.current[setRows.length]) {
                weightInputRef.current[setRows.length].focus();
            }
        }, 50);
    };

    const handleDuplicateRow = (id) => {
        const rowToDup = setRows.find(r => r.id === id) || setRows[setRows.length - 1];
        if (!rowToDup) return;
        setSetRows([...setRows, createSetRow({
            weight: rowToDup.weight,
            reps: rowToDup.reps,
            targetRpe: rowToDup.targetRpe,
            actualRpe: rowToDup.actualRpe,
            percentageOf1RM: rowToDup.percentageOf1RM || '',
            technicalQualityScore: rowToDup.technicalQualityScore || '',
            barSpeedRating: rowToDup.barSpeedRating || '',
            missedLift: rowToDup.missedLift || false
        })]);
    };

    const handleRowChange = (id, field, value) => {
        setSetRows(setRows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleRemoveRow = (id) => {
        if (setRows.length > 1) {
            setSetRows(setRows.filter(row => row.id !== id));
        }
    };

    const adjustWeight = (id, amount) => {
        setSetRows(setRows.map(row => {
            if (row.id === id) {
                const current = parseFloat(row.weight) || 0;
                const next = Math.max(0, current + amount);
                return { ...row, weight: next.toString() };
            }
            return row;
        }));
    };

    const handleCreateExercise = async () => {
        if (!newExerciseName.trim()) return;
        const newEx = {
            id: 'custom_' + Date.now(),
            name: newExerciseName.trim(),
            category: EXERCISE_CATEGORIES.CUSTOM,
            isCustom: true
        };
        try {
            await firestoreService.addCustomExercise(targetUserId, newEx);
            setNewExerciseName('');
            setIsCreatingExercise(false);
            setSelectedExerciseId(newEx.id);
        } catch (error) {
            console.error('Error creating exercise:', error);
        }
    };

    const handleAddSet = async (e) => {
        e.preventDefault();
        if (!user) {
            showToast("You must be logged in to save workouts.", "error");
            return;
        }
        if (!selectedExerciseId) {
            showToast("Please select an exercise first.", "warn");
            return;
        }

        setSaving(true);
        const d = selectedDate;
        const todayStr = getDateStr(d);
        try {
            logger.info('Attempting to log set', { targetUserId, selectedExerciseId, workoutType });
            const exercise = allExercisesList.find(ex => ex.id === selectedExerciseId) || {
                id: selectedExerciseId,
                name: activeWorkoutPlan?.exercises.find(ex => ex.exerciseId === selectedExerciseId)?.exerciseName || selectedExerciseId,
                category: EXERCISE_CATEGORIES.CUSTOM
            };

            const olympicSummary = summarizeLiftSuccess(setRows);
            const olympicSessionData = {
                sessionReadiness,
                mobilityReadiness,
                ...olympicSummary
            };

            const newEntries = workoutType === 'strength'
                ? setRows.map(row => ({
                    date: todayStr,
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    category: exercise.category,
                    type: workoutType,
                    weight: row.weight,
                    sets: 1,
                    reps: row.reps,
                    targetRpe: row.targetRpe,
                    actualRpe: row.actualRpe,
                    estimated1RM: calculateEstimated1RM(row.weight, row.reps, row.actualRpe || row.targetRpe),
                    modifiers: { ...modifiers },
                    notes: notes,
                    video_url: videoUrl,
                    trainingMode: isOlympicExercise(exercise) ? 'olympic_weightlifting' : undefined,
                    sourcePlanId: activeWorkoutPlan?.id || null,
                    ...(isOlympicExercise(exercise) ? {
                        ...buildOlympicSetMetadata({
                            row,
                            exercise,
                            session: olympicSessionData,
                            technicalNotes,
                            videoUrl
                        }),
                        olympicSession: olympicSessionData
                    } : {})
                }))
                : [{
                    date: todayStr,
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    category: exercise.category,
                    type: workoutType,
                    duration,
                    ...(isMeterBasedExercise(exercise) ? { meters } : { distance }),
                    notes,
                    video_url: videoUrl
                }];

            setPendingSaves(prev => prev + 1);
            try {
                logger.info('Enqueueing sets for sync', { entriesCount: newEntries.length });
                
                // Use SyncService for fault-tolerant background persistence
                syncService.enqueueWorkoutSets(targetUserId, newEntries);
                if (videoUrl && newEntries.some(entry => entry.sport === 'olympic_weightlifting')) {
                    await firestoreService.saveLiftVideoMetadata(targetUserId, {
                        liftDate: todayStr,
                        exerciseId: exercise.id,
                        exerciseName: exercise.name,
                        videoUrl,
                        setMetadata: newEntries.map(entry => entry.olympicSet).filter(Boolean),
                        technicalNotes,
                        sessionReadiness,
                        mobilityReadiness
                    });
                }
                
                logger.info('Sets enqueued successfully', { count: newEntries.length, exerciseId: exercise.id });
                showToast("Record saved locally!", "success");
            } catch (err) {
                logger.error('Failed to enqueue sets', { error: err.message });
                showToast("Failed to save. Please refresh.", "error");
                throw err;
            } finally {
                // Since enqueueing is fast, we decrement immediately, 
                // but SyncService will handle the actual background write.
                setPendingSaves(prev => Math.max(0, prev - 1));
            }
            
            if (autoRest && workoutType === 'strength' && !isViewingOther) {
                resetTimer();
                setType('countdown');
                setTimerDuration(180); // Default 3 mins
                startTimer();
                if (!isTimerOpen) toggleTimer();
                showToast("Set logged. Rest timer started!", "success");
            }

            setVideoUrl('');

            if (workoutType === 'strength') {
                const lastRow = setRows[setRows.length - 1];
                setSetRows([createSetRow({
                    weight: lastRow?.weight || '',
                    reps: lastRow?.reps || '',
                    percentageOf1RM: lastRow?.percentageOf1RM || '',
                    barSpeedRating: lastRow?.barSpeedRating || ''
                })]);
            } else {
                setDuration('');
                setDistance('');
                setMeters('');
            }
            setNotes('');
            setTechnicalNotes(createEmptyTechnicalNotes());
        } catch (error) {
            console.error('Error logging workout:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleExerciseChange = (e) => {
        const id = e.target.value;
        if (id === 'CREATE_NEW') {
            setIsCreatingExercise(true);
            return;
        }
        setSelectedExerciseId(id);
        const exercise = allExercisesList.find(ex => ex.id === id);
        const nextWorkoutType = exercise?.category === EXERCISE_CATEGORIES.CARDIO || isMeterBasedExercise(exercise || id) ? 'cardio' : 'strength';
        setWorkoutType(nextWorkoutType);
        const lastEntry = workouts.find(w => w.exerciseId === id);
        if (lastEntry && nextWorkoutType === 'strength' && lastEntry.weight) {
             setSetRows([createSetRow({
                 weight: lastEntry.weight, 
                 reps: lastEntry.reps, 
                 targetRpe: lastEntry.targetRpe || '', 
                 actualRpe: '',
                 percentageOf1RM: lastEntry.olympicSet?.percentageOf1RM || '',
                 technicalQualityScore: '',
                 barSpeedRating: lastEntry.olympicSet?.barSpeedRating || '',
                 missedLift: false
              })]);
        }
        if (lastEntry && nextWorkoutType === 'cardio') {
            setDuration(lastEntry.duration || '');
            setDistance(lastEntry.distance || '');
            setMeters(lastEntry.meters || '');
        }
    };

    const checkPR = (entry) => {
        if (entry.type !== 'strength' || !entry.estimated1RM) return false;
        const mapping = { bb_squat: 'squat', bb_bench: 'bench', bb_deadlift: 'deadlift', sumo_deadlift: 'deadlift', bb_ohp: 'ohp' };
        const key = mapping[entry.exerciseId];
        return key && trainingMaxes[key] ? entry.estimated1RM > parseFloat(trainingMaxes[key]) : false;

    };

    if (dataLoading || extLoading) return <div className="card">Syncing logs...</div>;

    const CommentSectionToRender = <CommentSection userId={targetUserId} sessionId={`session_${getDateStr(selectedDate)}`} />;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Link to="/calendar" className="btn" style={{ background: 'transparent', padding: '0.5rem' }}>&larr; Calendar</Link>
                    {!isCoachViewing && (
                        <Link to="/programs?tab=partner" className="btn" style={{ fontSize: '0.8rem', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>🤝 Partner Mode</Link>
                    )}

                </div>
                <h1 style={{ margin: 0, fontSize: '1.75rem' }}>{isCoachViewing ? `Review Log` : 'Workout Log'}</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!isCoachViewing && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={autoRest} onChange={e => setAutoRest(e.target.checked)} />
                            Auto-Rest
                        </label>
                    )}
                    <button 
                        className={`btn ${isFocusMode ? 'btn-primary' : ''}`} 
                        onClick={() => setIsFocusMode(!isFocusMode)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                        {isFocusMode ? '🎯 Focus: ON' : '🎯 Focus Mode'}
                    </button>
                    {!isCoachViewing && (
                        <button
                            onClick={() => setKeepAwake(!keepAwake)}
                            className={`btn ${keepAwake ? 'btn-primary' : ''}`}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            {keepAwake ? '💡 Screen: ON' : '😴 Allow Sleep'}
                        </button>
                    )}
                </div>
            </div>

            {syncStatus === 'offline' && (
                <div className="glass-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-error)', background: 'rgba(239, 68, 68, 0.1)', animation: 'pulse 2s infinite' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>📴 Offline Mode: Logs will sync once you reconnect.</p>
                </div>
            )}

            {pendingSyncCount > 0 && (
                <div className="glass-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)', background: 'rgba(var(--primary-rgb), 0.1)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>🔄 Syncing {pendingSyncCount} session(s) in background...</p>
                </div>
            )}

            {isSessionComplete && (
                <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-success)', background: 'rgba(16, 185, 129, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ color: 'var(--accent-success)', margin: 0, fontSize: '1.25rem' }}>✓ Session Finalized</h2>
                            <p style={{ margin: '0.25rem 0 0', opacity: 0.8, fontSize: '0.9rem' }}>This workout has been completed.</p>
                        </div>
                        {!isViewingOther && (
                            <button className="btn" style={{ padding: '0.4rem 1rem' }} onClick={handleReopenWorkout}>Reopen</button>
                        )}
                    </div>
                </div>
            )}

            {!isCoachViewing && activeWorkoutPlan && !isSessionComplete && (
                <div className="glass-card" style={{ marginBottom: '2.5rem', borderLeft: '4px solid var(--primary)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '0.02em' }}>
                        {activeWorkoutPlan.trainingMode === 'olympic_weightlifting' ? 'Olympic Session' : 'Today\'s Program'} - {activeWorkoutPlan.name || 'Ready'}
                    </h3>
                    {activeWorkoutPlan.recoveryAdjustment && (
                        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {activeWorkoutPlan.phase?.name} - {activeWorkoutPlan.recoveryAdjustment.note}
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {activeWorkoutPlan.exercises.map((pe, idx) => (
                            <button
                                key={idx}
                                className={`btn ${selectedPlannedExId === pe.id ? 'btn-primary' : ''}`}
                                onClick={() => loadPlannedExercise(pe)}
                                style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                            >
                                {pe.exerciseName}
                                {loggedSets.some(s => s.exerciseId === pe.exerciseId) && ' ✓'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!isSessionComplete && (
                <div className="glass-card" style={{ marginBottom: '2.5rem' }}>
                    {!isFocusMode && (
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85rem' }}>Date</label>
                                <input
                                    type="date"
                                    value={getDateStr(selectedDate)}
                                    onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
                                    disabled={isViewingOther}
                                />
                            </div>
                            <div className="input-group" style={{ flex: 2 }}>
                                <label style={{ fontSize: '0.85rem' }}>Movement</label>
                                <select value={selectedExerciseId} onChange={handleExerciseChange} disabled={isViewingOther}>
                                    <option value="">-- Choose --</option>
                                    <option value="CREATE_NEW">+ Custom</option>
                                    {Object.values(EXERCISE_CATEGORIES).map(cat => (
                                        <optgroup label={cat} key={cat}>
                                            {allExercisesList.filter(ex => ex.category === cat).map(ex => (
                                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {isFocusMode && selectedExerciseId && (
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Current Session</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>
                                {allExercisesList.find(e => e.id === selectedExerciseId)?.name}
                            </div>
                            <button className="btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', opacity: 0.6, marginTop: '0.5rem' }} onClick={() => setIsFocusMode(false)}>Change Movement</button>
                        </div>
                    )}

                    {isCreatingExercise && (
                        <div className="glass-card" style={{ marginBottom: '1.5rem', border: '2px solid var(--primary)' }}>
                            <h3>Create Custom Exercise</h3>
                            <input type="text" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} placeholder="Exercise Name" autoFocus style={{ width: '100%', marginBottom: '1rem' }} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={handleCreateExercise} className="btn btn-primary">Save Movement</button>
                                <button onClick={() => setIsCreatingExercise(false)} className="btn">Cancel</button>
                            </div>
                        </div>
                    )}

                    {selectedExerciseId && !isCreatingExercise && (
                        <form onSubmit={handleAddSet}>
                            <ExerciseTools
                                exerciseId={selectedExerciseId}
                                exerciseName={selectedExercise?.name || selectedExerciseId}
                                athleteId={targetUserId}
                                onApplyTarget={workoutType === 'strength' ? (target) => {
                                    const targetRowId = setRows.find(row => !row.weight && !row.reps)?.id || setRows[0]?.id;
                                    if (!targetRowId) return;
                                    setSetRows(setRows.map(row => row.id === targetRowId
                                        ? {
                                            ...row,
                                            weight: String(target.weight || ''),
                                            reps: String(target.reps || row.reps || ''),
                                            targetRpe: String(target.targetRpe || row.targetRpe || '')
                                        }
                                        : row
                                    ));
                                } : undefined}
                            />

                            {isSelectedOlympicExercise && (
                                <div className="glass" style={{ padding: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div>
                                            <strong>Substitution Engine</strong>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Equivalent stress: keep sets/reps and match target RPE.</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {getSubstitutionOptions(selectedExerciseId).map(option => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    className="btn"
                                                    style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}
                                                    title={option.stressEquivalent}
                                                    onClick={() => {
                                                        setSelectedExerciseId(option.id);
                                                        showToast(`${option.name} selected with equivalent training stress.`, 'info');
                                                    }}
                                                >
                                                    {option.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isSelectedOlympicExercise && (
                                <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border-glass)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 800 }}>{selectedExercise?.movementType?.replaceAll('_', ' ') || 'Olympic movement'}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                Complexity {selectedExercise?.technicalComplexity || '--'}/10 - {selectedExercise?.skillClassification?.replaceAll('_', ' ') || 'technical lift'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {(selectedExercise?.technicalEmphasisTags || []).slice(0, 4).map(tag => (
                                                <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.45rem', borderRadius: '999px', background: 'rgba(var(--primary-rgb), 0.12)', color: 'var(--primary)' }}>
                                                    {tag.replaceAll('_', ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                                        <div className="input-group" style={{ margin: 0 }}>
                                            <label>Session Readiness</label>
                                            <input type="number" min="1" max="10" value={sessionReadiness} onChange={e => setSessionReadiness(e.target.value)} placeholder="1-10" />
                                        </div>
                                        <div className="input-group" style={{ margin: 0 }}>
                                            <label>Mobility Readiness</label>
                                            <input type="number" min="1" max="10" value={mobilityReadiness} onChange={e => setMobilityReadiness(e.target.value)} placeholder="1-10" />
                                        </div>
                                        <div className="input-group" style={{ margin: 0 }}>
                                            <label>1RM for %</label>
                                            <input type="number" value={olympicOneRepMax} onChange={e => setOlympicOneRepMax(e.target.value)} placeholder={`Load (${unit})`} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {workoutType === 'strength' ? (
                                isSelectedOlympicExercise ? (
                                <div className="strength-entry-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {setRows.map(row => (
                                        <OlympicSetLogger
                                            key={row.id}
                                            row={row}
                                            oneRepMax={olympicOneRepMax}
                                            isFocusMode={isFocusMode}
                                            onChange={(field, value) => handleRowChange(row.id, field, value)}
                                            onAdjustWeight={(amount) => adjustWeight(row.id, amount)}
                                            onDuplicate={() => handleDuplicateRow(row.id)}
                                            onRemove={() => handleRemoveRow(row.id)}
                                            canRemove={setRows.length > 1}
                                        />
                                    ))}
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                                        <button type="button" onClick={handleAddRow} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>+ Add Set</button>
                                        <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
                                            {saving ? 'Saving...' : 'Log Olympic Sets'}
                                        </button>
                                    </div>
                                </div>
                                ) : (
                                <div className="strength-entry-form">
                                    {/* HEADERS - Strictly Aligned */}
                                    {!isFocusMode && (
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'minmax(120px, 1.5fr) 1fr 1fr 1fr 120px', 
                                            gap: '0.5rem', 
                                            padding: '0 0.5rem',
                                            marginBottom: '0.25rem',
                                            opacity: 0.5,
                                            fontSize: '0.7rem',
                                            fontWeight: '800'
                                        }}>
                                            <div style={{ paddingLeft: '0.5rem' }}>WEIGHT ({unit})</div>
                                            <div style={{ textAlign: 'center' }}>REPS</div>
                                            <div style={{ textAlign: 'center' }}>TARGET</div>
                                            <div style={{ textAlign: 'center' }}>ACTUAL</div>
                                            <div style={{ textAlign: 'right', paddingRight: '0.5rem' }}>ACTIONS</div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {setRows.map((row, index) => (
                                            <div key={row.id} className={isFocusMode ? 'glass' : ''} style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: isFocusMode ? '1fr' : 'minmax(120px, 1.5fr) 1fr 1fr 1fr 120px', 
                                                gap: '0.5rem', 
                                                alignItems: 'center',
                                                padding: isFocusMode ? '1.5rem' : '0.25rem',
                                                background: !isFocusMode ? 'rgba(255,255,255,0.02)' : 'inherit',
                                                borderRadius: '12px',
                                                border: !isFocusMode ? '1px solid var(--border-glass)' : 'none'
                                            }}>
                                                {/* WEIGHT - Same height as others */}
                                                <div style={{ display: 'flex', gap: '4px', height: isFocusMode ? 'auto' : '48px', alignItems: 'center' }}>
                                                    {isFocusMode && <label style={{ fontSize: '0.85rem' }}>Weight</label>}
                                                    <input
                                                        ref={el => weightInputRef.current[index] = el}
                                                        type="number"
                                                        value={row.weight}
                                                        onChange={(e) => handleRowChange(row.id, 'weight', e.target.value)}
                                                        className="pro-input"
                                                        style={{ height: '40px', fontSize: '1rem', fontWeight: '700', borderRadius: '8px' }}
                                                    />
                                                    {!isFocusMode && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <button type="button" className="btn" style={{ minWidth: '32px', height: '19px', padding: 0, fontSize: '0.6rem' }} onClick={() => adjustWeight(row.id, 2.5)}>+</button>
                                                            <button type="button" className="btn" style={{ minWidth: '32px', height: '19px', padding: 0, fontSize: '0.6rem' }} onClick={() => adjustWeight(row.id, -2.5)}>-</button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* REPS */}
                                                <div style={{ display: 'flex', flexDirection: 'column', height: isFocusMode ? 'auto' : '48px', justifyContent: 'center' }}>
                                                    {isFocusMode && <label style={{ fontSize: '0.85rem' }}>Reps</label>}
                                                    <input
                                                        ref={el => repsInputRef.current[index] = el}
                                                        type="number"
                                                        value={row.reps}
                                                        onChange={(e) => handleRowChange(row.id, 'reps', e.target.value)}
                                                        className="pro-input"
                                                        style={{ height: '40px', fontSize: '1rem', textAlign: 'center', borderRadius: '8px' }}
                                                    />
                                                </div>

                                                {/* TARGET */}
                                                <div style={{ display: 'flex', flexDirection: 'column', height: isFocusMode ? 'auto' : '48px', justifyContent: 'center' }}>
                                                    {isFocusMode && <label style={{ fontSize: '0.85rem' }}>Target</label>}
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={row.targetRpe}
                                                        onChange={(e) => handleRowChange(row.id, 'targetRpe', e.target.value)}
                                                        className="pro-input"
                                                        style={{ height: '40px', fontSize: '1rem', textAlign: 'center', opacity: 0.7, borderRadius: '8px' }}
                                                    />
                                                </div>

                                                {/* ACTUAL */}
                                                <div style={{ display: 'flex', flexDirection: 'column', height: isFocusMode ? 'auto' : '48px', justifyContent: 'center' }}>
                                                    {isFocusMode && <label style={{ fontSize: '0.85rem' }}>Actual</label>}
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={row.actualRpe}
                                                        onChange={(e) => handleRowChange(row.id, 'actualRpe', e.target.value)}
                                                        className="pro-input"
                                                        style={{ 
                                                            height: '40px', 
                                                            fontSize: '1rem', 
                                                            textAlign: 'center', 
                                                            borderRadius: '8px',
                                                            border: '2px solid var(--primary)'
                                                        }}
                                                        required
                                                    />
                                                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'gold', textAlign: isFocusMode ? 'left' : 'center' }}>
                                                        e1RM {calculateEstimated1RM(row.weight, row.reps, row.actualRpe || row.targetRpe) || '--'}{calculateEstimated1RM(row.weight, row.reps, row.actualRpe || row.targetRpe) ? unit : ''}
                                                    </div>
                                                </div>

                                                {/* ACTIONS */}
                                                <div style={{ display: 'flex', gap: '4px', height: isFocusMode ? 'auto' : '48px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    <button type="button" className="btn" style={{ padding: '0.5rem', minWidth: '40px', height: '40px' }} onClick={() => handleDuplicateRow(row.id)} title="Repeat last set">
                                                        📋
                                                    </button>
                                                    {setRows.length > 1 && (
                                                        <button type="button" className="btn" onClick={() => handleRemoveRow(row.id)} style={{ color: 'var(--accent-error)', padding: '0.5rem', minWidth: '40px', height: '40px' }}>
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button type="button" onClick={handleAddRow} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>+ Add Row</button>
                                        <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
                                            {saving ? 'Saving...' : '🔥 Log Record'}
                                        </button>
                                    </div>
                                </div>
                                )


                            ) : (
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
                                        <label>Duration (min)</label>
                                        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
                                    </div>
                                    {isMeterBasedExercise(selectedExercise || selectedExerciseId) ? (
                                        <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
                                            <label>Meters (m)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={meters}
                                                onChange={e => setMeters(e.target.value)}
                                                placeholder="e.g. 5000"
                                            />
                                        </div>
                                    ) : (
                                        <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
                                            <label>Distance</label>
                                            <input type="number" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} />
                                        </div>
                                    )}
                                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginBottom: '1.25rem' }}>Log Event</button>
                                </div>
                            )}

                            <details open style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                                <summary style={{ cursor: 'pointer', opacity: 0.75 }}>Notes / Video Link</summary>
                                <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label>Movement Notes</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Technique cues, subjective feel, pain, setup changes..." style={{ height: '80px' }} />
                                    </div>
                                    {isSelectedOlympicExercise && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                            {[
                                                ['timingIssues', 'Timing Issues'],
                                                ['catchPosition', 'Catch Position'],
                                                ['pullMechanics', 'Pull Mechanics'],
                                                ['balanceObservations', 'Balance'],
                                                ['coachCues', 'Coach Cues'],
                                                ['mobilityLimitations', 'Mobility Limits']
                                            ].map(([field, label]) => (
                                                <div className="input-group" style={{ margin: 0 }} key={field}>
                                                    <label>{label}</label>
                                                    <textarea
                                                        value={technicalNotes[field]}
                                                        onChange={e => setTechnicalNotes(prev => ({ ...prev, [field]: e.target.value }))}
                                                        style={{ height: '64px' }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="input-group">
                                        <label>Form Check Video (URL)</label>
                                        <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." />
                                    </div>
                                </div>
                            </details>
                        </form>
                    )}
                </div>
            )}

            <div className="glass-card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>📊 Performance History</h2>
                    {!isSessionComplete && !isViewingOther && loggedSets.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {pendingSaves > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', animation: 'pulse 1.5s infinite' }}>Saving {pendingSaves} set(s)...</span>}
                            <button 
                                className="btn btn-primary" 
                                onClick={handleFinalizeWorkout} 
                                disabled={pendingSaves > 0}
                                style={{ 
                                    background: pendingSaves > 0 ? '#444' : 'var(--accent-success)', 
                                    color: '#fff',
                                    opacity: pendingSaves > 0 ? 0.6 : 1
                                }}
                            >
                                Finalize Session
                            </button>
                        </div>
                    )}
                </div>
                {loggedSets.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loggedSets.map((entry, idx) => (
                            <div key={idx} className={`glass ${checkPR(entry) ? 'pr-card' : ''}`} style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{entry.exerciseName}</div>
                                        {checkPR(entry) && <div style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '800', marginTop: '0.25rem' }}>🔥 NEW PERSONAL RECORD</div>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {entry.type === 'cardio' ? (
                                            <>
                                                <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                                    {entry.meters ? `${entry.meters} m` : entry.distance ? `${entry.distance}` : '—'}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                                    {entry.duration ? `${entry.duration} min` : ''}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                                    {entry.weight}{unit} x {entry.reps}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                                    RPE {entry.actualRpe || entry.targetRpe}
                                                    {entry.olympicSet?.technicalQualityScore ? ` - Quality ${entry.olympicSet.technicalQualityScore}/10` : ''}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.7, borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem' }}>
                                    {entry.type !== 'cardio' ? (
                                        <>
                                            <span>
                                                {entry.sport === 'olympic_weightlifting'
                                                    ? `${entry.olympicSet?.percentageOf1RM || '--'}% - ${entry.olympicSet?.barSpeedRating || 'speed --'} - ${entry.olympicSet?.missedLift ? 'miss' : 'make'}`
                                                    : `e1RM: ${entry.estimated1RM}${unit}`}
                                            </span>
                                            <span>{entry.movementType?.replaceAll('_', ' ') || `${entry.modifiers?.bar && `[${entry.modifiers.bar}]`} ${entry.modifiers?.grip}`}</span>
                                        </>
                                    ) : (
                                        <span style={{ color: '#888' }}>{entry.category}</span>
                                    )}
                                </div>
                                {entry.notes && <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.8 }}>"{entry.notes}"</div>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, fontStyle: 'italic' }}>
                        No records found for this movement session.
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Communication Log</h2>
                <div className="glass-card">
                    {CommentSectionToRender}
                </div>
            </div>

            {/* Session RPE Modal */}
            {showRpeModal && (
                <div className="nav-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0 }}>Finalize Session</h2>
                        {finalizeError && (
                            <div className="card" style={{ background: 'rgba(255, 82, 82, 0.1)', border: '1px solid var(--accent-error)', color: 'var(--accent-error)', padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px' }}>
                                <p style={{ margin: 0 }}>⚠️ {finalizeError}</p>
                            </div>
                        )}
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Great work! How was the overall intensity of today's session?</p>
                        
                        <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '1rem' }}>
                            {sessionRpe}
                        </div>
                        
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            step="0.5" 
                            value={sessionRpe} 
                            onChange={e => setSessionRpe(parseFloat(e.target.value))}
                            style={{ width: '100%', marginBottom: '2rem', cursor: 'pointer' }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                            {[
                                ['recoveryScore', 'Recovery'],
                                ['sleepQuality', 'Sleep'],
                                ['motivationLevel', 'Motivation'],
                                ['painScore', 'Pain']
                            ].map(([field, label]) => (
                                <div className="input-group" style={{ margin: 0 }} key={field}>
                                    <label>{label} ({completionFeedback[field]})</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={completionFeedback[field]}
                                        onChange={e => setCompletionFeedback(prev => ({ ...prev, [field]: parseInt(e.target.value, 10) }))}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="empty-state" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
                            {getRecoveryAdjustment({ sessionRpe, ...completionFeedback }, recovery).note}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.8rem', opacity: 0.6, marginBottom: '2rem' }}>
                            <div style={{ textAlign: 'left' }}>1 (Very Easy)</div>
                            <div style={{ textAlign: 'right' }}>10 (Max Effort)</div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1 }} onClick={() => setShowRpeModal(false)}>Cancel</button>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 1, background: 'var(--accent-success)' }} 
                                onClick={confirmFinalize}
                                disabled={saving}
                            >
                                {saving ? 'Finalizing...' : 'Complete Workout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const CommentSection = ({ userId, sessionId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestoreService.subscribeToWorkoutComments(userId, sessionId, (data) => {
            setComments(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId, sessionId]);

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await firestoreService.addWorkoutComment(userId, sessionId, {
                text: newComment,
                authorId: user.id,
                authorEmail: user.email,
                authorRole: user.role
            });
            setNewComment('');
        } catch (error) {
            console.error('Error sending comment:', error);
        }
    };

    return (
        <div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
                {loading ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading threads...</div>
                ) : comments.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No communication in this session.</div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} style={{
                            alignSelf: c.authorId === user.id ? 'flex-end' : 'flex-start',
                            background: c.authorId === user.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: c.authorId === user.id ? '#000' : '#fff',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            maxWidth: '85%',
                            border: c.authorId === user.id ? 'none' : '1px solid var(--border-glass)'
                        }}>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.3rem', fontWeight: '600' }}>
                                {c.authorEmail.split('@')[0]} ({c.authorRole}) • {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>{c.text}</div>
                        </div>
                    ))
                )}
            </div>
            <form onSubmit={handleSendComment} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment or technical feedback..."
                    style={{ flex: 1, padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>Send</button>
            </form>
        </div>
    );
};

export default WorkoutLog;

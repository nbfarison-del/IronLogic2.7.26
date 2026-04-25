import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { exercises as defaultExercises, EXERCISE_CATEGORIES, EXERCISE_CONFIG } from '../data/exercises';
import ExerciseTools from '../components/ExerciseTools';
import * as firestoreService from '../services/firestoreService';
import { runDMAICCycle } from '../services/DMAICService';
import { useRef } from 'react';

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

const WorkoutLog = () => {
    const { user } = useAuth();
    const { athleteId: paramAthleteId } = useParams();
    const targetUserId = paramAthleteId || user?.id;
    const isViewingOther = !!paramAthleteId && paramAthleteId !== user?.id;

    const { unit } = useSettings();
    const location = useLocation();

    const [extWorkouts, setExtWorkouts] = useState([]);
    const [extCustom, setExtCustom] = useState([]);
    const [extPlanned, setExtPlanned] = useState([]);
    const [extLoading, setExtLoading] = useState(isViewingOther);
    const {
        workouts: syncedWorkouts,
        customExercises: syncedCustom,
        plannedWorkouts,
        isLoading: dataLoading,
        maxes
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

    const allExercisesList = useMemo(() => [
        ...defaultExercises,
        ...(customExercises || [])
    ], [customExercises]);

    const [selectedDate, setSelectedDate] = useState(() => {
        if (dateParam) return new Date(dateParam + 'T12:00:00');
        if (location.state?.plannedWorkout?.date) return new Date(location.state.plannedWorkout.date + 'T12:00:00');
        return new Date();
    });

    const [selectedPlannedExId, setSelectedPlannedExId] = useState(null);
    const [workoutType, setWorkoutType] = useState('strength');
    const [setRows, setSetRows] = useState([{ id: Date.now(), weight: '', reps: '', targetRpe: '', actualRpe: '' }]);
    const [notes, setNotes] = useState('');
    const [duration, setDuration] = useState('');
    const [distance, setDistance] = useState('');
    const [saving, setSaving] = useState(false);
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);
    const [newExerciseName, setNewExerciseName] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [modifiers, setModifiers] = useState({
        grip: '', bar: '', pause: '', tempo: '',
        isBelt: false, isKneeWraps: false,
        isSquatSuit: false, isSquatSuitStrapsUp: false,
        isBenchShirt: false, isSlingshot: false, board: '',
        isDeadliftSuit: false, isDeadliftSuitStrapsUp: false, isFeetUp: false
    });
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    
    const weightInputRef = useRef([]);
    const repsInputRef = useRef([]);

    const { isWakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock();
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

    const handleFinalizeWorkout = async () => {
        try {
            await firestoreService.markSessionComplete(targetUserId, getDateStr(selectedDate), true);
            if (isCoachViewing) {
                await runDMAICCycle(targetUserId);
            }
        } catch (error) {
            console.error('Error finalizing workout:', error);
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
            setWorkoutType(exMatch.category === EXERCISE_CATEGORIES.CARDIO ? 'cardio' : 'strength');
        } else {
            setSelectedExerciseId(plannedEx.exerciseId);
        }
        if (plannedEx.sets && Array.isArray(plannedEx.sets)) {
            setSetRows(plannedEx.sets.map(s => ({
                id: Date.now() + Math.random(),
                weight: s.weight || '',
                reps: s.reps || '',
                targetRpe: s.targetRpe || '',
                actualRpe: ''
            })));
        }
        setNotes(plannedEx.notes || '');
    };

    useEffect(() => {
        if (activePlannedWorkout && activePlannedWorkout.exercises?.length > 0 && !selectedExerciseId) {
            loadPlannedExercise(activePlannedWorkout.exercises[0]);
        }
    }, [activePlannedWorkout, allExercisesList]);

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
        setSetRows([...setRows, {
            id: Date.now(),
            weight: lastRow?.weight || '',
            reps: lastRow?.reps || '',
            targetRpe: lastRow?.targetRpe || '',
            actualRpe: ''
        }]);
        setTimeout(() => {
            if (weightInputRef.current[setRows.length]) {
                weightInputRef.current[setRows.length].focus();
            }
        }, 50);
    };

    const handleDuplicateRow = (id) => {
        const rowToDup = setRows.find(r => r.id === id) || setRows[setRows.length - 1];
        if (!rowToDup) return;
        setSetRows([...setRows, {
            id: Date.now(),
            weight: rowToDup.weight,
            reps: rowToDup.reps,
            targetRpe: rowToDup.targetRpe,
            actualRpe: rowToDup.actualRpe
        }]);
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
        if (!selectedExerciseId || !user) return;
        setSaving(true);
        const d = selectedDate;
        const todayStr = getDateStr(d);
        try {
            const exercise = allExercisesList.find(ex => ex.id === selectedExerciseId) || {
                id: selectedExerciseId,
                name: activePlannedWorkout?.exercises.find(ex => ex.exerciseId === selectedExerciseId)?.exerciseName || selectedExerciseId,
                category: EXERCISE_CATEGORIES.CUSTOM
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
                    video_url: videoUrl
                }))
                : [{
                    date: todayStr,
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    category: exercise.category,
                    type: workoutType,
                    duration,
                    distance,
                    notes,
                    video_url: videoUrl
                }];

            await Promise.all(newEntries.map(entry => firestoreService.addWorkout(targetUserId, entry)));
            setVideoUrl('');
            if (workoutType === 'strength') {
                const lastRow = setRows[setRows.length - 1];
                setSetRows([{ id: Date.now(), weight: lastRow?.weight || '', reps: lastRow?.reps || '', targetRpe: '', actualRpe: '' }]);
            } else {
                setDuration('');
                setDistance('');
            }
            setNotes('');
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
        setWorkoutType(exercise?.category === EXERCISE_CATEGORIES.CARDIO ? 'cardio' : 'strength');
        const lastEntry = workouts.find(w => w.exerciseId === id);
        if (lastEntry && workoutType === 'strength' && lastEntry.weight) {
             setSetRows([{ 
                 id: Date.now(), 
                 weight: lastEntry.weight, 
                 reps: lastEntry.reps, 
                 targetRpe: lastEntry.targetRpe || '', 
                 actualRpe: '' 
             }]);
        }
    };

    const checkPR = (entry) => {
        if (entry.type !== 'strength' || !entry.estimated1RM) return false;
        const mapping = { bb_squat: 'squat', bb_bench: 'bench', bb_deadlift: 'deadlift', sumo_deadlift: 'deadlift', bb_ohp: 'ohp' };
        const key = mapping[entry.exerciseId];
        return key && maxes[key] ? entry.estimated1RM > parseFloat(maxes[key]) : false;
    };

    const activeConfig = EXERCISE_CONFIG[selectedExerciseId] || {};

    if (dataLoading || extLoading) return <div className="card">Syncing logs...</div>;

    const CommentSectionToRender = <CommentSection userId={targetUserId} sessionId={`session_${getDateStr(selectedDate)}`} />;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <Link to="/calendar" className="btn" style={{ background: 'transparent', padding: '0.5rem' }}>&larr; Calendar</Link>
                <h1 style={{ margin: 0, fontSize: '1.75rem' }}>{isCoachViewing ? `Review Log` : 'Workout Log'}</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                            className={`btn ${keepAwake ? 'btn-secondary' : ''}`}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            {keepAwake ? '💡 Awake' : '😴 Sleep'}
                        </button>
                    )}
                </div>
            </div>

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

            {!isCoachViewing && activePlannedWorkout && !isSessionComplete && (
                <div className="glass-card" style={{ marginBottom: '2.5rem', borderLeft: '4px solid var(--primary)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '0.02em' }}>
                        ⚡ {activePlannedWorkout.name || 'Today\'s Program'}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {activePlannedWorkout.exercises.map((pe, idx) => (
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
                            {workoutType === 'strength' ? (
                                <div>
                                    {setRows.map((row, index) => (
                                        <div key={row.id} className={isFocusMode ? 'glass' : ''} style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: isFocusMode ? '1fr' : '1.2fr 0.8fr 0.8fr 0.8fr auto', 
                                            gap: '0.75rem', 
                                            alignItems: 'end',
                                            marginBottom: isFocusMode ? '1.5rem' : '0.75rem',
                                            padding: isFocusMode ? '1.25rem' : '0',
                                            borderRadius: '16px'
                                        }}>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                {!isFocusMode && index === 0 && <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Weight</label>}
                                                {isFocusMode && <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Weight ({unit})</label>}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <input
                                                        ref={el => weightInputRef.current[index] = el}
                                                        type="number"
                                                        value={row.weight}
                                                        onChange={(e) => handleRowChange(row.id, 'weight', e.target.value)}
                                                        style={{ width: '100%', fontSize: isFocusMode ? '1.5rem' : '1.1rem', fontWeight: '700', textAlign: isFocusMode ? 'center' : 'left' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                        <button type="button" className="btn" style={{ flex: 1, padding: '0.2rem', minHeight: '36px', fontSize: '0.75rem' }} onClick={() => adjustWeight(row.id, 2.5)}>+2.5</button>
                                                        <button type="button" className="btn" style={{ flex: 1, padding: '0.2rem', minHeight: '36px', fontSize: '0.75rem' }} onClick={() => adjustWeight(row.id, -2.5)}>-2.5</button>
                                                        <button type="button" className="btn" style={{ flex: 1, padding: '0.2rem', minHeight: '36px', fontSize: '0.75rem' }} onClick={() => adjustWeight(row.id, 5)}>+5</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                {!isFocusMode && index === 0 && <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Reps</label>}
                                                {isFocusMode && <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Reps</label>}
                                                <input
                                                    ref={el => repsInputRef.current[index] = el}
                                                    type="number"
                                                    value={row.reps}
                                                    onChange={(e) => handleRowChange(row.id, 'reps', e.target.value)}
                                                    style={{ width: '100%', fontSize: isFocusMode ? '1.5rem' : '1.1rem', fontWeight: '600', textAlign: isFocusMode ? 'center' : 'left' }}
                                                />
                                            </div>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                {!isFocusMode && index === 0 && <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Target RPE</label>}
                                                {isFocusMode && <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Target RPE</label>}
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={row.targetRpe}
                                                    onChange={(e) => handleRowChange(row.id, 'targetRpe', e.target.value)}
                                                    style={{ width: '100%', fontSize: isFocusMode ? '1.1rem' : '1rem', textAlign: isFocusMode ? 'center' : 'left' }}
                                                />
                                            </div>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                {!isFocusMode && index === 0 && <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Actual RPE</label>}
                                                {isFocusMode && <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Actual RPE</label>}
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={row.actualRpe}
                                                    onChange={(e) => handleRowChange(row.id, 'actualRpe', e.target.value)}
                                                    style={{ width: '100%', fontSize: isFocusMode ? '1.1rem' : '1rem', textAlign: isFocusMode ? 'center' : 'left', border: '2px solid var(--primary)' }}
                                                    required
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: isFocusMode ? 'center' : 'flex-end', marginTop: isFocusMode ? '1rem' : '0' }}>
                                                <button type="button" className="btn" onClick={() => handleDuplicateRow(row.id)} title="Repeat last set">
                                                    {isFocusMode ? '📋 Duplicate Set' : '📋'}
                                                </button>
                                                {setRows.length > 1 && (
                                                    <button type="button" className="btn" onClick={() => handleRemoveRow(row.id)} style={{ color: 'var(--accent-error)' }}>
                                                        {isFocusMode ? '🗑️ Remove' : '✕'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                        <button type="button" onClick={handleAddRow} className="btn" style={{ flex: 1 }}>+ Add Row</button>
                                        <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
                                            {saving ? 'Saving...' : '🔥 Log Record'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label>Duration (min)</label>
                                        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
                                    </div>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label>Distance</label>
                                        <input type="number" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} />
                                    </div>
                                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginBottom: '1.25rem' }}>Log Event</button>
                                </div>
                            )}

                            <details style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                                <summary style={{ cursor: 'pointer', opacity: 0.6 }}>Technical Notes / Video Link</summary>
                                <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label>Session Notes</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Technique cues, subjective feel..." style={{ height: '80px' }} />
                                    </div>
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
                        <button className="btn btn-primary" onClick={handleFinalizeWorkout} style={{ background: 'var(--accent-success)', color: '#fff' }}>Finalize Session</button>
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
                                        <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                            {entry.weight}{unit} x {entry.reps}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>RPE {entry.actualRpe || entry.targetRpe}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.7, borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem' }}>
                                    <span>e1RM: {entry.estimated1RM}{unit}</span>
                                    <span>{entry.modifiers?.bar && `[${entry.modifiers.bar}]`} {entry.modifiers?.grip}</span>
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

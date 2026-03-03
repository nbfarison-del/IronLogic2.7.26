import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { exercises as defaultExercises, EXERCISE_CATEGORIES, EXERCISE_CONFIG } from '../data/exercises';
import ExerciseTools from '../components/ExerciseTools';
import * as firestoreService from '../services/firestoreService';

const WorkoutLog = () => {
    const { user } = useAuth();
    const { athleteId: paramAthleteId } = useParams();
    const targetUserId = paramAthleteId || user?.id; // Allow viewing another user's log if param provided
    const isViewingOther = !!paramAthleteId && paramAthleteId !== user?.id;

    const { unit } = useSettings();
    const location = useLocation();

    // We need to fetch data manually if viewing someone else, 
    // because DataContext only holds the CURRENT user's data.
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

    // Browser-robust YYYY-MM-DD helper
    const getDateStr = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Load external data if viewing another user
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

    // Detect Planned Workout (either from navigation state or today's schedule)
    const activePlannedWorkout = useMemo(() => {
        if (location.state?.plannedWorkout) return location.state.plannedWorkout;
        const todayStr = getDateStr(new Date());
        return planned.find(p => p.date === todayStr);
    }, [location.state, planned]);

    // Combined Exercise List (Default + Custom)
    const allExercisesList = useMemo(() => [
        ...defaultExercises,
        ...(customExercises || [])
    ], [customExercises]);

    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const queryParams = new URLSearchParams(location.search);
    const dateParam = queryParams.get('date');

    const isCoachViewing = paramAthleteId && paramAthleteId !== user?.id;

    // Use date from params or today
    const [selectedDate, setSelectedDate] = useState(() => {
        if (dateParam) return new Date(dateParam + 'T12:00:00'); // Midday to avoids timezone flip
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

    // Handle Auto-loading of Planned Exercise
    const loadPlannedExercise = (plannedEx) => {
        if (!plannedEx) return;

        setSelectedPlannedExId(plannedEx.id);

        // Find existing id in allExercises for lookup
        const exMatch = allExercisesList.find(e => e.id === plannedEx.exerciseId || e.name === plannedEx.exerciseName);
        if (exMatch) {
            setSelectedExerciseId(exMatch.id);
            setWorkoutType(exMatch.category === EXERCISE_CATEGORIES.CARDIO ? 'cardio' : 'strength');
        } else {
            // Fallback for exercises not in library
            setSelectedExerciseId(plannedEx.exerciseId);
        }

        // Initialize sets
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

    // Initial load if planned workout exists
    useEffect(() => {
        if (activePlannedWorkout && activePlannedWorkout.exercises?.length > 0 && !selectedExerciseId) {
            loadPlannedExercise(activePlannedWorkout.exercises[0]);
        }
    }, [activePlannedWorkout, allExercisesList]);

    // Filter today's sets
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
            weight: lastRow.weight,
            reps: lastRow.reps,
            targetRpe: lastRow.targetRpe,
            actualRpe: ''
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
        const exercise = allExercisesList.find(ex => ex.id === selectedExerciseId);

        setSaving(true);
        const d = selectedDate;
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

            // Reset inputs
            setVideoUrl('');
            if (workoutType === 'strength') {
                const lastRow = setRows[setRows.length - 1];
                setSetRows([{ id: Date.now(), weight: lastRow.weight, reps: lastRow.reps, targetRpe: '', actualRpe: '' }]);
            } else {
                setDuration('');
                setDistance('');
            }
            setNotes('');
        } catch (error) {
            console.error('Error logging workout:', error);
            alert('Failed to log workout.');
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
    };

    const checkPR = (entry) => {
        if (entry.type !== 'strength' || !entry.estimated1RM) return false;
        const mapping = { bb_squat: 'squat', bb_bench: 'bench', bb_deadlift: 'deadlift', sumo_deadlift: 'deadlift', bb_ohp: 'ohp' };
        const key = mapping[entry.exerciseId];
        return key && maxes[key] ? entry.estimated1RM > parseFloat(maxes[key]) : false;
    };

    const activeConfig = EXERCISE_CONFIG[selectedExerciseId] || {};

    if (dataLoading || extLoading) return <div className="card">Syncing logs...</div>;

    const CommentSectionToRender = <CommentSection userId={targetUserId} selectedDate={selectedDate} />;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Link to="/calendar" className="btn">&larr; Calendar</Link>
                <h1>{isCoachViewing ? `Review: ${selectedDate.toLocaleDateString()}` : 'Log Workout'}</h1>
                <Link to="/profile" className="btn">Update Maxes</Link>
            </div>

            {/* Today's Plan Section (Athlete Only) */}
            {!isCoachViewing && activePlannedWorkout && !isSessionComplete && (
                <div className="card" style={{ marginBottom: '1rem', border: '1px solid #2196f3', background: 'rgba(33, 150, 243, 0.05)' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#2196f3' }}>
                        Today's Plan: {activePlannedWorkout.planName || activePlannedWorkout.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {activePlannedWorkout.exercises.map((ex, idx) => {
                            const isSelected = selectedPlannedExId === ex.id;
                            const isLogged = loggedSets.some(s => s.exerciseId === ex.exerciseId || s.exerciseName === ex.exerciseName);

                            return (
                                <button
                                    key={ex.id || idx}
                                    onClick={() => loadPlannedExercise(ex)}
                                    className={`btn ${isSelected ? 'btn-primary' : ''}`}
                                    style={{
                                        fontSize: '0.8rem',
                                        padding: '0.4rem 0.8rem',
                                        opacity: isLogged && !isSelected ? 0.6 : 1,
                                        border: isLogged ? '1px solid #4caf50' : isSelected ? '1px solid var(--primary)' : '1px solid #444'
                                    }}
                                >
                                    {isLogged && '✓ '}
                                    {ex.exerciseName || ex.exerciseId}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Log Workout Form (Athlete Only) */}
            {!isCoachViewing && !isSessionComplete && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    {!isCreatingExercise ? (
                        <div className="input-group">
                            <label>Exercise</label>
                            <select value={selectedExerciseId} onChange={handleExerciseChange}>
                                <option value="">-- Choose --</option>
                                <option value="CREATE_NEW">+ Create New</option>
                                {Object.values(EXERCISE_CATEGORIES).map(cat => (
                                    <optgroup label={cat} key={cat}>
                                        {allExercisesList.filter(ex => ex.category === cat).map(ex => (
                                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="card" style={{ border: '1px solid var(--primary)' }}>
                            <input type="text" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} placeholder="Exercise Name" autoFocus />
                            <button onClick={handleCreateExercise} className="btn btn-primary">Create</button>
                            <button onClick={() => setIsCreatingExercise(false)} className="btn">Cancel</button>
                        </div>
                    )}

                    {selectedExerciseId && <ExerciseTools exerciseId={selectedExerciseId} exerciseName={allExercisesList.find(ex => ex.id === selectedExerciseId)?.name} />}

                    {selectedExerciseId && !isCreatingExercise && (
                        <form onSubmit={handleAddSet}>
                            {workoutType === 'strength' ? (
                                <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    {/* Modifiers UI - Simple version for now */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                                        {activeConfig.hasBarValues && (
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.7rem' }}>Bar</label>
                                                <select value={modifiers.bar} onChange={e => setModifiers({ ...modifiers, bar: e.target.value })} style={{ padding: '0.3rem', fontSize: '0.8rem' }}>
                                                    <option value="">Std</option>
                                                    {activeConfig.hasBarValues.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {activeConfig.hasGripValues && (
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.7rem' }}>Grip</label>
                                                <select value={modifiers.grip} onChange={e => setModifiers({ ...modifiers, grip: e.target.value })} style={{ padding: '0.3rem', fontSize: '0.8rem' }}>
                                                    <option value="">Std</option>
                                                    {activeConfig.hasGripValues.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {/* Header Row */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '85px 70px 70px 70px 45px',
                                            gap: '0.6rem',
                                            marginBottom: '0.8rem',
                                            padding: '0.3rem 0',
                                            borderBottom: '1px solid #333',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            color: '#888',
                                            textAlign: 'center',
                                            width: 'fit-content'
                                        }}>
                                            <div>Weight</div>
                                            <div>Reps</div>
                                            <div>Target</div>
                                            <div>Actual</div>
                                            <div></div>
                                        </div>

                                        {setRows.map((row, idx) => (
                                            <div key={row.id} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '85px 70px 70px 70px 45px',
                                                gap: '0.6rem',
                                                marginBottom: '0.6rem',
                                                alignItems: 'center',
                                                width: 'fit-content'
                                            }}>
                                                <input
                                                    type="number"
                                                    value={row.weight}
                                                    onChange={e => handleRowChange(row.id, 'weight', e.target.value)}
                                                    placeholder={`${unit}`}
                                                    required
                                                    style={{ textAlign: 'center', padding: '0.6rem 0.4rem', fontSize: '1rem' }}
                                                />
                                                <input
                                                    type="number"
                                                    value={row.reps}
                                                    onChange={e => handleRowChange(row.id, 'reps', e.target.value)}
                                                    placeholder="R"
                                                    required
                                                    style={{ textAlign: 'center', padding: '0.6rem 0.4rem', fontSize: '1rem' }}
                                                />
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={row.targetRpe}
                                                    onChange={e => handleRowChange(row.id, 'targetRpe', e.target.value)}
                                                    placeholder="T"
                                                    style={{ textAlign: 'center', padding: '0.6rem 0.4rem', fontSize: '1rem', background: 'transparent', border: '1px solid #444' }}
                                                />
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={row.actualRpe}
                                                    onChange={e => handleRowChange(row.id, 'actualRpe', e.target.value)}
                                                    placeholder="A"
                                                    required
                                                    style={{ textAlign: 'center', padding: '0.6rem 0.4rem', fontSize: '1rem', borderColor: '#2196f3', backgroundColor: 'rgba(33, 150, 243, 0.05)', borderWidth: '2px' }}
                                                />
                                                {idx > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRow(row.id)}
                                                        style={{ color: '#ff5252', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                    >
                                                        &times;
                                                    </button>
                                                ) : <div />}
                                            </div>
                                        ))}
                                        <button type="button" onClick={handleAddRow} className="btn" style={{ width: '100%', maxWidth: '360px', border: '1px dashed #444', marginTop: '0.8rem', padding: '0.6rem', fontSize: '0.9rem' }}>+ Add Set</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '1rem' }}>
                                    <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (min)" required />
                                    <input type="number" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} placeholder="Distance" />
                                </div>
                            )}

                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem' }}>Video Link (YouTube, Drive, etc.)</label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={e => setVideoUrl(e.target.value)}
                                    placeholder="https://..."
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="input-group">
                                <label style={{ fontSize: '0.8rem' }}>Notes</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Focus on tempo, felt strong..."
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    marginTop: '1.5rem',
                                    padding: '1rem',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    boxShadow: '0 4px 6px rgba(33, 150, 243, 0.2)'
                                }}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Log Set(s)'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>{isCoachViewing ? 'Session Results' : "Today's Session"}</h2>
                {!isCoachViewing && loggedSets.length > 0 && (
                    isSessionComplete ? (
                        <button onClick={handleReopenWorkout} className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', border: '1px solid #444', color: '#aaa' }}>
                            Edit Session
                        </button>
                    ) : (
                        <button onClick={handleFinalizeWorkout} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#4caf50', border: 'none' }}>
                            ✔️ Complete Workout
                        </button>
                    )
                )}
            </div>

            {isSessionComplete && (
                <div style={{ padding: '1rem', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', borderRadius: '8px', color: '#4caf50', textAlign: 'center', marginBottom: '1rem' }}>
                    <strong>🎉 Workout Completed!</strong> Great job crushing this session.
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loggedSets.length === 0 ? <p>No logs recorded for this day.</p> : loggedSets.map(entry => (
                    <div key={entry.id} className="card" style={{ border: checkPR(entry) ? '1px solid gold' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{entry.exerciseName}</strong>
                            {checkPR(entry) && <span style={{ color: 'gold', fontSize: '0.8rem' }}>⭐ New PR!</span>}
                        </div>
                        <div>
                            {entry.type === 'strength'
                                ? `${entry.weight}${unit} x ${entry.reps} @ ${entry.actualRpe}`
                                : `${entry.duration}m ${entry.distance ? `| ${entry.distance}km` : ''}`}
                        </div>
                        {entry.video_url && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <a href={entry.video_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                                    View Video Link ↗
                                </a>
                            </div>
                        )}
                        {entry.notes && <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>{entry.notes}</div>}
                    </div>
                ))}
            </div>
            <h2 style={{ marginTop: '2rem' }}>Athlete-Coach Comments</h2>
            <div className="card">
                {CommentSectionToRender}
            </div>
        </div>
    );
};

const CommentSection = ({ userId, selectedDate }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);

    // Using selected date as the "session ID" for comments
    const dateStr = selectedDate.toISOString().split('T')[0];
    const sessionId = `session_${dateStr}`;

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
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loading ? (
                    <div style={{ color: '#888', fontSize: '0.8rem' }}>Loading comments...</div>
                ) : comments.length === 0 ? (
                    <div style={{ color: '#888', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No comments yet.</div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} style={{
                            alignSelf: c.authorId === user.id ? 'flex-end' : 'flex-start',
                            background: c.authorId === user.id ? 'var(--primary)' : '#333',
                            color: c.authorId === user.id ? '#000' : '#fff',
                            padding: '0.5rem 0.8rem',
                            borderRadius: '8px',
                            maxWidth: '80%',
                            position: 'relative'
                        }}>
                            <div style={{ fontSize: '0.6rem', opacity: 0.7, marginBottom: '0.2rem' }}>
                                {c.authorEmail.split('@')[0]} ({c.authorRole}) • {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.9rem' }}>{c.text}</div>
                        </div>
                    ))
                )}
            </div>
            <form onSubmit={handleSendComment} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '0.5rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Send</button>
            </form>
        </div>
    );
};

export default WorkoutLog;

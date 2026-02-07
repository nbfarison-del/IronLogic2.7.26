import { useState, useEffect } from 'react';
import { exercises as defaultExercises, EXERCISE_CATEGORIES, EXERCISE_CONFIG } from '../data/exercises';
import { calculateEstimated1RM } from '../utils/calculator';
import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import ExerciseTools from '../components/ExerciseTools';

const WorkoutLog = () => {
    const { unit } = useSettings();
    const location = useLocation();

    // Planned Program State
    const [plannedProgram, setPlannedProgram] = useState(location.state?.plannedWorkout || null);
    const [currentExIndex, setCurrentExIndex] = useState(0);

    // Combined Exercise List (Default + Custom)
    const [allExercises, setAllExercises] = useState(defaultExercises);
    const [customExercises, setCustomExercises] = useState([]);
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);
    const [newExerciseName, setNewExerciseName] = useState('');

    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [workoutType, setWorkoutType] = useState('strength'); // 'strength' or 'cardio'

    // Multi-Set State (Strength)
    // Structure: [{ id: 1, weight: '', reps: '', targetRpe: '', actualRpe: '' }]
    const [setRows, setSetRows] = useState([{ id: Date.now(), weight: '', reps: '', targetRpe: '', actualRpe: '' }]);

    // Modifiers State
    const [modifiers, setModifiers] = useState({
        grip: '',
        bar: '',
        pause: '',
        tempo: '',
        isBelt: false,
        isKneeWraps: false,
        isSquatSuit: false,
        isSquatSuitStrapsUp: false,
        isBenchShirt: false,
        isSlingshot: false,
        board: '',
        isDeadliftSuit: false,
        isDeadliftSuitStrapsUp: false,
        isFeetUp: false
    });

    // Cardio State
    const [duration, setDuration] = useState(''); // minutes
    const [distance, setDistance] = useState(''); // km/miles
    const [notes, setNotes] = useState('');

    const [loggedSets, setLoggedSets] = useState(() => {
        const saved = localStorage.getItem('fitnessAppWorkouts');
        return saved ? JSON.parse(saved) : [];
    });

    const [maxes, setMaxes] = useState({});

    // Load Data
    useEffect(() => {
        const savedMaxes = localStorage.getItem('fitnessAppMaxes');
        if (savedMaxes) setMaxes(JSON.parse(savedMaxes));

        const savedCustom = localStorage.getItem('fitnessAppCustomExercises');
        if (savedCustom) {
            const parsed = JSON.parse(savedCustom);
            setCustomExercises(parsed);
            setAllExercises([...defaultExercises, ...parsed]);
        }
    }, []);

    // Load Planned Workout if coming from Calendar
    useEffect(() => {
        if (plannedProgram && plannedProgram.exercises.length > currentExIndex) {
            const ex = plannedProgram.exercises[currentExIndex];
            setSelectedExerciseId(ex.exerciseId);
            setWorkoutType('strength'); // Planning currently only supports strength for details
            setSetRows(ex.sets.map(s => ({
                id: Date.now() + Math.random(),
                weight: s.weight,
                reps: s.reps,
                targetRpe: s.targetRpe,
                actualRpe: ''
            })));
            setNotes(ex.notes || '');
        }
    }, [plannedProgram, currentExIndex]);

    // Save Workouts
    useEffect(() => {
        localStorage.setItem('fitnessAppWorkouts', JSON.stringify(loggedSets));
    }, [loggedSets]);

    // Save Custom Exercises
    useEffect(() => {
        if (customExercises.length > 0) {
            localStorage.setItem('fitnessAppCustomExercises', JSON.stringify(customExercises));
        }
    }, [customExercises]);

    // --- Helpers for Set Rows ---
    const handleAddRow = () => {
        const lastRow = setRows[setRows.length - 1];
        setSetRows([...setRows, {
            id: Date.now(),
            weight: lastRow.weight, // Clone previous for convenience
            reps: lastRow.reps,
            targetRpe: lastRow.targetRpe,
            actualRpe: ''
        }]);
    };

    const handleRemoveRow = (id) => {
        if (setRows.length > 1) {
            setSetRows(setRows.filter(row => row.id !== id));
        }
    };

    const handleRowChange = (id, field, value) => {
        setSetRows(setRows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    // ----------------------------

    const handleCreateExercise = (e) => {
        e.preventDefault();
        if (!newExerciseName.trim()) return;

        const newEx = {
            id: `custom_${Date.now()}`,
            name: newExerciseName,
            category: EXERCISE_CATEGORIES.CUSTOM
        };

        const updatedCustom = [...customExercises, newEx];
        setCustomExercises(updatedCustom);
        setAllExercises([...defaultExercises, ...updatedCustom]);

        // Auto-select
        setSelectedExerciseId(newEx.id);
        setWorkoutType('strength');
        setNewExerciseName('');
        setIsCreatingExercise(false);
    };

    const handleAddSet = (e) => {
        e.preventDefault();

        if (!selectedExerciseId) return;
        const exercise = allExercises.find(ex => ex.id === selectedExerciseId);

        let newEntries = [];

        if (workoutType === 'strength') {
            // Process all rows
            newEntries = setRows.map(row => {
                let estimatedMax = calculateEstimated1RM(row.weight, row.reps, row.actualRpe || row.targetRpe);
                return {
                    id: row.id, // Use row ID as unique ID
                    date: new Date().toISOString(),
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    category: exercise.category,
                    type: workoutType,
                    weight: row.weight,
                    sets: 1, // Each row is 1 set
                    reps: row.reps,
                    targetRpe: row.targetRpe,
                    actualRpe: row.actualRpe,
                    estimated1RM: estimatedMax,
                    modifiers: { ...modifiers },
                    notes: notes // Apply common notes to all sets in this batch
                };
            });
        } else {
            // Cardio
            newEntries.push({
                id: Date.now(),
                date: new Date().toISOString(),
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                category: exercise.category,
                type: workoutType,
                duration: duration,
                distance: distance,
                notes: notes,
            });
        }

        setLoggedSets([...newEntries, ...loggedSets]);

        // If part of a planned program, move to next exercise or finish
        if (plannedProgram) {
            if (currentExIndex < plannedProgram.exercises.length - 1) {
                setCurrentExIndex(currentExIndex + 1);
            } else {
                setPlannedProgram(null);
                alert('Planned workout complete!');
            }
        }

        // Reset fields
        if (workoutType === 'strength') {
            // Reset to one empty row, maybe keeping weight?
            const lastRow = setRows[setRows.length - 1];
            setSetRows([{ id: Date.now(), weight: lastRow.weight, reps: lastRow.reps, targetRpe: '', actualRpe: '' }]);
            setNotes('');
        } else {
            setDuration('');
            setDistance('');
            setNotes('');
        }
    };

    const handleExerciseChange = (e) => {
        if (e.target.value === 'CREATE_NEW') {
            setIsCreatingExercise(true);
            setSelectedExerciseId('');
            return;
        }

        const id = e.target.value;
        setSelectedExerciseId(id);
        setIsCreatingExercise(false);

        const exercise = allExercises.find(ex => ex.id === id);
        if (exercise && exercise.category === EXERCISE_CATEGORIES.CARDIO) {
            setWorkoutType('cardio');
        } else {
            setWorkoutType('strength');
        }

        // Reset Modifiers & Rows
        setModifiers({
            grip: '',
            bar: '',
            pause: '',
            tempo: '',
            isBelt: false,
            isKneeWraps: false,
            isSquatSuit: false,
            isSquatSuitStrapsUp: false,
            isBenchShirt: false,
            isSlingshot: false,
            board: '',
            isDeadliftSuit: false,
            isDeadliftSuitStrapsUp: false,
            isFeetUp: false
        });
        setSetRows([{ id: Date.now(), weight: '', reps: '', targetRpe: '', actualRpe: '' }]);
    };

    const clearHistory = () => {
        if (confirm('Are you sure you want to clear your history?')) {
            setLoggedSets([]);
        }
    };

    const checkPR = (entry) => {
        if (entry.type !== 'strength' || !entry.estimated1RM) return false;
        let profileKey = null;
        if (entry.exerciseId === 'bb_squat') profileKey = 'squat';
        if (entry.exerciseId === 'bb_bench') profileKey = 'bench';
        if (entry.exerciseId === 'bb_deadlift' || entry.exerciseId === 'sumo_deadlift') profileKey = 'deadlift';
        if (entry.exerciseId === 'bb_ohp') profileKey = 'ohp';

        if (profileKey && maxes[profileKey]) {
            return entry.estimated1RM > parseFloat(maxes[profileKey]);
        }
        return false;
    };

    const activeConfig = EXERCISE_CONFIG[selectedExerciseId] || {};

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/calendar" className="btn" style={{ padding: '0.4rem 0.6rem' }}>&larr; Calendar</Link>
                    <h1 style={{ margin: 0 }}>Log Workout</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {plannedProgram && (
                        <div style={{ background: '#2196f3', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            Program: {plannedProgram.name} ({currentExIndex + 1}/{plannedProgram.exercises.length})
                        </div>
                    )}
                    <Link to="/profile" className="btn" style={{ fontSize: '0.8rem', padding: '0.5em' }}>Update Maxes</Link>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                {!isCreatingExercise ? (
                    <div className="input-group">
                        <label>Select Exercise</label>
                        <select
                            value={selectedExerciseId}
                            onChange={handleExerciseChange}
                            style={{ padding: '0.8rem', borderRadius: '6px', background: '#1a1a1a', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="">-- Choose an Exercise --</option>
                            <option value="CREATE_NEW" style={{ color: 'gold', fontWeight: 'bold' }}>+ Create New Exercise</option>
                            {Object.values(EXERCISE_CATEGORIES).map(cat => (
                                <optgroup label={cat} key={cat}>
                                    {allExercises.filter(ex => ex.category === cat).map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--primary)' }}>
                        <h3>Create Custom Exercise</h3>
                        <div className="input-group">
                            <label>Exercise Name</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={newExerciseName}
                                    onChange={e => setNewExerciseName(e.target.value)}
                                    placeholder="e.g. Zercher Squat"
                                    autoFocus
                                />
                                <button type="button" className="btn btn-primary" onClick={handleCreateExercise}>Create</button>
                                <button type="button" className="btn" onClick={() => setIsCreatingExercise(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedExerciseId && !isCreatingExercise && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <ExerciseTools
                            exerciseId={selectedExerciseId}
                            exerciseName={allExercises.find(ex => ex.id === selectedExerciseId)?.name}
                        />
                    </div>
                )}


                {selectedExerciseId && !isCreatingExercise && (
                    <form onSubmit={handleAddSet}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>

                            {workoutType === 'strength' ? (
                                <>
                                    {/* --- Modifiers Section --- */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                        gap: '0.5rem',
                                        background: '#222',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        marginBottom: '1rem',
                                        gridColumn: '1 / -1'
                                    }}>
                                        {activeConfig.hasBarValues && (
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label>Bar Type</label>
                                                <select value={modifiers.bar} onChange={e => setModifiers({ ...modifiers, bar: e.target.value })} style={{ padding: '0.5rem' }}>
                                                    <option value="">Standard</option>
                                                    {activeConfig.hasBarValues.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {activeConfig.hasGripValues && (
                                            <div className="input-group">
                                                <label>Grip</label>
                                                <select value={modifiers.grip} onChange={e => setModifiers({ ...modifiers, grip: e.target.value })} style={{ padding: '0.5rem' }}>
                                                    <option value="">Standard</option>
                                                    {activeConfig.hasGripValues.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {activeConfig.hasPause && (
                                            <div className="input-group">
                                                <label>Pause</label>
                                                <select value={modifiers.pause} onChange={e => setModifiers({ ...modifiers, pause: e.target.value })} style={{ padding: '0.5rem' }}>
                                                    <option value="">None</option>
                                                    <option value="2s">2 sec</option>
                                                    <option value="3s">3 sec</option>
                                                    <option value="4s">4 sec</option>
                                                </select>
                                            </div>
                                        )}
                                        {activeConfig.hasTempo && (
                                            <div className="input-group">
                                                <label>Tempo (e.g. 3-0-0)</label>
                                                <input type="text" value={modifiers.tempo} onChange={e => setModifiers({ ...modifiers, tempo: e.target.value })} placeholder="3-0-0" />
                                            </div>
                                        )}
                                        {activeConfig.hasBelt && (
                                            <div className="input-group" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0 }}>
                                                    <input type="checkbox" checked={modifiers.isBelt} onChange={e => setModifiers({ ...modifiers, isBelt: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                    Belt
                                                </label>
                                            </div>
                                        )}
                                        {activeConfig.hasKneeWraps && (
                                            <div className="input-group" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0 }}>
                                                    <input type="checkbox" checked={modifiers.isKneeWraps} onChange={e => setModifiers({ ...modifiers, isKneeWraps: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                    Knee Wraps
                                                </label>
                                            </div>
                                        )}
                                        {activeConfig.hasSquatSuit && (
                                            <div className="input-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0 }}>
                                                    <input type="checkbox" checked={modifiers.isSquatSuit} onChange={e => setModifiers({ ...modifiers, isSquatSuit: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                    Squat Suit
                                                </label>
                                                {modifiers.isSquatSuit && (
                                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0, marginLeft: '1rem' }}>
                                                        <input type="checkbox" checked={modifiers.isSquatSuitStrapsUp} onChange={e => setModifiers({ ...modifiers, isSquatSuitStrapsUp: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                        Straps Up?
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                        {activeConfig.hasBenchShirt && (
                                            <div className="input-group" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0 }}>
                                                    <input type="checkbox" checked={modifiers.isBenchShirt} onChange={e => setModifiers({ ...modifiers, isBenchShirt: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                    Bench Shirt
                                                </label>
                                            </div>
                                        )}
                                        {activeConfig.hasSlingshot && (
                                            <div className="input-group" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0 }}>
                                                    <input type="checkbox" checked={modifiers.isSlingshot} onChange={e => setModifiers({ ...modifiers, isSlingshot: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                    Slingshot
                                                </label>
                                            </div>
                                        )}
                                        {activeConfig.hasBoardValues && (
                                            <div className="input-group">
                                                <label>Board</label>
                                                <select value={modifiers.board} onChange={e => setModifiers({ ...modifiers, board: e.target.value })} style={{ padding: '0.5rem' }}>
                                                    <option value="">None</option>
                                                    {activeConfig.hasBoardValues.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {activeConfig.hasFeetUp && (
                                            <div className="input-group" style={{ display: 'flex', alignItems: 'center', height: '100%', marginBottom: 0 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0 }}>
                                                    <input type="checkbox" checked={modifiers.isFeetUp} onChange={e => setModifiers({ ...modifiers, isFeetUp: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                    Feet Up
                                                </label>
                                            </div>
                                        )}
                                        {activeConfig.hasDeadliftSuit && (
                                            <div className="input-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: 0 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0 }}>
                                                    <input type="checkbox" checked={modifiers.isDeadliftSuit} onChange={e => setModifiers({ ...modifiers, isDeadliftSuit: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                    Deadlift Suit
                                                </label>
                                                {modifiers.isDeadliftSuit && (
                                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: 0, marginLeft: '1rem' }}>
                                                        <input type="checkbox" checked={modifiers.isDeadliftSuitStrapsUp} onChange={e => setModifiers({ ...modifiers, isDeadliftSuitStrapsUp: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                                        Straps Up?
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* --- Multi-Set Row Interface --- */}
                                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                        <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Sets</h4>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {/* Header */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.8fr 30px', gap: '0.5rem', fontSize: '0.8rem', color: '#aaa', paddingLeft: '0.5rem' }}>
                                                <div>Weight ({unit})</div>
                                                <div>Reps</div>
                                                <div>RPE (T)</div>
                                                <div>RPE (A)</div>
                                                <div></div>
                                            </div>

                                            {setRows.map((row, index) => {
                                                const liveEst1RM = calculateEstimated1RM(row.weight, row.reps, row.actualRpe || row.targetRpe);
                                                return (
                                                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(60px, 1fr) minmax(40px, 0.8fr) minmax(40px, 0.8fr) minmax(40px, 0.8fr) 30px', gap: '0.5rem', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <input
                                                                type="number"
                                                                value={row.weight}
                                                                onChange={e => handleRowChange(row.id, 'weight', e.target.value)}
                                                                placeholder=""
                                                                required
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={row.reps}
                                                            onChange={e => handleRowChange(row.id, 'reps', e.target.value)}
                                                            placeholder="5"
                                                            required
                                                            style={{ width: '100%' }}
                                                        />
                                                        <input
                                                            type="number"
                                                            step="0.5"
                                                            value={row.targetRpe}
                                                            onChange={e => handleRowChange(row.id, 'targetRpe', e.target.value)}
                                                            placeholder="8"
                                                            style={{ width: '100%' }}
                                                        />
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                value={row.actualRpe}
                                                                onChange={e => handleRowChange(row.id, 'actualRpe', e.target.value)}
                                                                placeholder="9"
                                                                required
                                                                style={{ width: '100%' }}
                                                            />
                                                            {liveEst1RM > 0 && (
                                                                <div style={{ position: 'absolute', top: '100%', right: 0, fontSize: '0.7rem', color: 'gold', whiteSpace: 'nowrap', zIndex: 10, background: 'rgba(0,0,0,0.8)', padding: '2px 4px', borderRadius: '4px' }}>
                                                                    e1RM: {liveEst1RM}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {index > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveRow(row.id)}
                                                                className="btn"
                                                                style={{ padding: '0', color: '#f44336', background: 'transparent', width: '100%', textAlign: 'center' }}
                                                                title="Remove set"
                                                            >
                                                                &times;
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAddRow}
                                            className="btn"
                                            style={{ marginTop: '1rem', width: '100%', border: '1px dashed #444', background: '#222' }}
                                        >
                                            + Add Another Set
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="input-group">
                                        <label>Duration (mins)</label>
                                        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required placeholder="30" />
                                    </div>
                                    <div className="input-group">
                                        <label>Distance (km/mi)</label>
                                        <input type="number" step="0.01" value={distance} onChange={e => setDistance(e.target.value)} placeholder="3.1" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="input-group" style={{ marginTop: '1rem' }}>
                            <label>Comments / Notes</label>
                            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Felt heavy today..." />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                            {workoutType === 'strength' && setRows.length > 1 ? `Log ${setRows.length} Sets` : 'Log Workout'}
                        </button>
                    </form>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Today's Session</h2>
                {loggedSets.length > 0 && <button className="btn" onClick={clearHistory} style={{ fontSize: '0.8rem', padding: '0.4em 0.8em' }}>Clear History</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loggedSets.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>No sets logged yet.</p>}

                {loggedSets.map(entry => {
                    const isPR = checkPR(entry);
                    return (
                        <div key={entry.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: isPR ? '1px solid gold' : 'none' }}>
                            <div>
                                <strong style={{ fontSize: '1.1rem', color: isPR ? 'gold' : 'var(--primary)' }}>
                                    {entry.exerciseName} {isPR && '🏆'}
                                </strong>
                                {/* Display Modifiers */}
                                {entry.type === 'strength' && entry.modifiers && (
                                    <div style={{ fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {entry.modifiers.bar && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>{entry.modifiers.bar}</span>}
                                        {entry.modifiers.grip && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>{entry.modifiers.grip}</span>}
                                        {entry.modifiers.pause && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Pause: {entry.modifiers.pause}</span>}
                                        {entry.modifiers.tempo && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Tempo: {entry.modifiers.tempo}</span>}
                                        {entry.modifiers.isBelt && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Belt</span>}
                                        {entry.modifiers.isKneeWraps && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Knee Wraps</span>}
                                        {entry.modifiers.isSquatSuit && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Squat Suit</span>}
                                        {entry.modifiers.isSquatSuitStrapsUp && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Straps Up</span>}
                                        {entry.modifiers.isBenchShirt && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Bench Shirt</span>}
                                        {entry.modifiers.isSlingshot && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Slingshot</span>}
                                        {entry.modifiers.board && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>{entry.modifiers.board}</span>}
                                        {entry.modifiers.isDeadliftSuit && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>DL Suit</span>}
                                        {entry.modifiers.isDeadliftSuitStrapsUp && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Straps Up</span>}
                                        {entry.modifiers.isFeetUp && <span style={{ background: '#333', padding: '1px 4px', borderRadius: '4px' }}>Feet Up</span>}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '0.2rem' }}>
                                    {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                {entry.type === 'strength' ? (
                                    <>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {entry.weight} <span style={{ fontSize: '0.8rem', color: '#888' }}>{unit}</span> &times; {entry.sets} <span style={{ fontSize: '0.8rem', color: '#888' }}>sets</span> &times; {entry.reps} <span style={{ fontSize: '0.8rem', color: '#888' }}>reps</span>
                                        </div>
                                        <div style={{ marginTop: '0.2rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            <span>RPE: {entry.targetRpe || '-'} / <span style={{ color: 'white', fontWeight: 'bold' }}>{entry.actualRpe}</span></span>
                                            {entry.estimated1RM && (
                                                <span style={{ marginLeft: '1rem', color: isPR ? 'gold' : '#888', fontWeight: isPR ? 'bold' : 'normal', border: isPR ? '1px solid gold' : '1px solid #444', padding: '0 4px', borderRadius: '4px' }}>
                                                    e1RM: {entry.estimated1RM}
                                                </span>
                                            )}
                                        </div>
                                        {entry.notes && <div style={{ marginTop: '0.2rem', color: '#aaa', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'right' }}>{entry.notes}</div>}
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {entry.duration} <span style={{ fontSize: '0.8rem', color: '#888' }}>mins</span>
                                        </div>
                                        {entry.notes && <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{entry.notes}</div>}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div >
    );
};

export default WorkoutLog;

import { useState, useEffect } from 'react';
import { exercises, EXERCISE_CATEGORIES } from '../data/exercises';

const WorkoutLog = () => {
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [workoutType, setWorkoutType] = useState('strength'); // 'strength' or 'cardio'

    // Strength State
    const [weight, setWeight] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [targetRpe, setTargetRpe] = useState('');
    const [actualRpe, setActualRpe] = useState('');

    // Cardio State
    const [duration, setDuration] = useState(''); // minutes
    const [distance, setDistance] = useState(''); // km/miles
    const [notes, setNotes] = useState('');

    const [loggedSets, setLoggedSets] = useState(() => {
        const saved = localStorage.getItem('fitnessAppWorkouts');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('fitnessAppWorkouts', JSON.stringify(loggedSets));
    }, [loggedSets]);

    const handleAddSet = (e) => {
        e.preventDefault();

        if (!selectedExerciseId) return;

        const exercise = exercises.find(ex => ex.id === selectedExerciseId);

        const newEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            exerciseName: exercise.name,
            category: exercise.category,
            type: workoutType,
            // Strength Data
            weight: workoutType === 'strength' ? weight : null,
            sets: workoutType === 'strength' ? sets : null,
            reps: workoutType === 'strength' ? reps : null,
            targetRpe: workoutType === 'strength' ? targetRpe : null,
            actualRpe: workoutType === 'strength' ? actualRpe : null,
            // Cardio Data
            duration: workoutType === 'cardio' ? duration : null,
            distance: workoutType === 'cardio' ? distance : null,
            notes: workoutType === 'cardio' ? notes : null,
        };

        setLoggedSets([newEntry, ...loggedSets]);

        // Reset specific fields but keep exercise selected for multi-set convenience
        if (workoutType === 'strength') {
            // Optional: clear inputs or keep them? Usually people keep them for next set.
            // Let's clear Actual RPE to force re-evaluation.
            setActualRpe('');
        } else {
            setDuration('');
            setDistance('');
            setNotes('');
        }
    };

    const handleExerciseChange = (e) => {
        const id = e.target.value;
        setSelectedExerciseId(id);
        const exercise = exercises.find(ex => ex.id === id);
        if (exercise && exercise.category === EXERCISE_CATEGORIES.CARDIO) {
            setWorkoutType('cardio');
        } else {
            setWorkoutType('strength');
        }
    };

    const clearHistory = () => {
        if (confirm('Are you sure you want to clear your history?')) {
            setLoggedSets([]);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
            <h1>Log Workout</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleAddSet}>
                    <div className="input-group">
                        <label>Select Exercise</label>
                        <select
                            value={selectedExerciseId}
                            onChange={handleExerciseChange}
                            style={{ padding: '0.8rem', borderRadius: '6px', background: '#1a1a1a', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="">-- Choose an Exercise --</option>
                            {Object.values(EXERCISE_CATEGORIES).map(cat => (
                                <optgroup label={cat} key={cat}>
                                    {exercises.filter(ex => ex.category === cat).map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {selectedExerciseId && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>

                            {workoutType === 'strength' ? (
                                <>
                                    <div className="input-group">
                                        <label>Weight (lbs/kg)</label>
                                        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} required placeholder="e.g. 135" />
                                    </div>
                                    <div className="input-group">
                                        <label>Sets</label>
                                        <input type="number" value={sets} onChange={e => setSets(e.target.value)} required placeholder="e.g. 3" />
                                    </div>
                                    <div className="input-group">
                                        <label>Reps</label>
                                        <input type="number" value={reps} onChange={e => setReps(e.target.value)} required placeholder="e.g. 5" />
                                    </div>
                                    <div className="input-group">
                                        <label>Target RPE (Optional)</label>
                                        <input type="number" step="0.5" max="10" value={targetRpe} onChange={e => setTargetRpe(e.target.value)} placeholder="e.g. 8" />
                                    </div>
                                    <div className="input-group">
                                        <label>Actual RPE</label>
                                        <input type="number" step="0.5" max="10" value={actualRpe} onChange={e => setActualRpe(e.target.value)} required placeholder="e.g. 9" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="input-group">
                                        <label>Duration (mins)</label>
                                        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required placeholder="e.g. 30" />
                                    </div>
                                    <div className="input-group">
                                        <label>Distance (km/mi)</label>
                                        <input type="number" step="0.01" value={distance} onChange={e => setDistance(e.target.value)} placeholder="e.g. 3.1" />
                                    </div>
                                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                        <label>Notes / Intensity</label>
                                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Average HR 145, Hilly route" />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={!selectedExerciseId}>
                        Log Set
                    </button>
                </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Today's Session</h2>
                {loggedSets.length > 0 && <button className="btn" onClick={clearHistory} style={{ fontSize: '0.8rem', padding: '0.4em 0.8em' }}>Clear History</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loggedSets.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>No sets logged yet.</p>}

                {loggedSets.map(entry => (
                    <div key={entry.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{entry.exerciseName}</strong>
                            <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '0.2rem' }}>
                                {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            {entry.type === 'strength' ? (
                                <>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                        {entry.weight} <span style={{ fontSize: '0.8rem', color: '#888' }}>lbs/kg</span> &times; {entry.sets} <span style={{ fontSize: '0.8rem', color: '#888' }}>sets</span> &times; {entry.reps} <span style={{ fontSize: '0.8rem', color: '#888' }}>reps</span>
                                    </div>
                                    <div style={{ marginTop: '0.2rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <span>Target RPE: {entry.targetRpe || 'N/A'}</span>
                                        <span style={{ color: 'var(--primary)' }}>&#8594;</span>
                                        <span style={{ color: 'white', fontWeight: 'bold' }}>Actual: {entry.actualRpe}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                        {entry.duration} <span style={{ fontSize: '0.8rem', color: '#888' }}>mins</span>
                                        {entry.distance && <span> / {entry.distance} <span style={{ fontSize: '0.8rem', color: '#888' }}>mi</span></span>}
                                    </div>
                                    {entry.notes && <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{entry.notes}</div>}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkoutLog;

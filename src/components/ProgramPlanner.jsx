import { useState, useEffect } from 'react';
import { exercises as defaultExercises, EXERCISE_CATEGORIES, EXERCISE_CONFIG } from '../data/exercises';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';
import ExerciseTools from './ExerciseTools';

const ProgramPlanner = ({ date, onSave, onCancel, initialData = null }) => {
    const { unit } = useSettings();
    const { user } = useAuth();
    const [allExercises, setAllExercises] = useState(defaultExercises);
    const [programName, setProgramName] = useState(initialData?.name || 'New Program');
    const [plannedExercises, setPlannedExercises] = useState(() => {
        const exercisesInPlan = initialData?.exercises || [];
        return exercisesInPlan.map(ex => {
            // Fallback for missing exercise names in old synced programs
            const standardEx = defaultExercises.find(e => e.id === ex.exerciseId);
            const finalName = ex.exerciseName || ex.name || standardEx?.name || ex.exerciseId;

            return {
                ...ex,
                exerciseName: finalName,
                id: ex.id || Date.now() + Math.random(),
                sets: Array.isArray(ex.sets) ? ex.sets : Array.from({ length: parseInt(ex.sets) || 1 }, (_, i) => ({
                    id: Date.now() + i + Math.random(),
                    weight: '',
                    reps: ex.reps || '',
                    targetRpe: ex.rpe || ''
                }))
            };
        });
    });

    // Load custom exercises
    useEffect(() => {
        const loadCustomExercises = async () => {
            if (!user) return;
            try {
                const custom = await firestoreService.getCustomExercises(user.id);
                setAllExercises([...defaultExercises, ...custom]);
            } catch (error) {
                console.error('Error loading custom exercises:', error);
            }
        };
        loadCustomExercises();
    }, [user]);

    const addExercise = () => {
        setPlannedExercises([
            ...plannedExercises,
            {
                id: Date.now(),
                exerciseId: '',
                exerciseName: '',
                sets: [{ id: Date.now() + 1, weight: '', reps: '', targetRpe: '' }],
                notes: '',
                modifiers: {
                    grip: '', bar: '', pause: '', tempo: '',
                    isBelt: false, isKneeWraps: false,
                    isSquatSuit: false, isSquatSuitStrapsUp: false,
                    isBenchShirt: false, isSlingshot: false, board: '',
                    isDeadliftSuit: false, isDeadliftSuitStrapsUp: false, isFeetUp: false
                }
            }
        ]);
    };

    const removeExercise = (id) => {
        setPlannedExercises(plannedExercises.filter(ex => ex.id !== id));
    };

    const handleExerciseChange = (id, exerciseId) => {
        const exercise = allExercises.find(ex => ex.id === exerciseId);
        setPlannedExercises(plannedExercises.map(ex =>
            ex.id === id ? { ...ex, exerciseId, exerciseName: exercise?.name || '' } : ex
        ));
    };

    const addSet = (exerciseId) => {
        setPlannedExercises(plannedExercises.map(ex => {
            if (ex.id === exerciseId) {
                const lastSet = ex.sets[ex.sets.length - 1];
                return {
                    ...ex,
                    sets: [...ex.sets, {
                        id: Date.now(),
                        weight: lastSet?.weight || '',
                        reps: lastSet?.reps || '',
                        targetRpe: lastSet?.targetRpe || ''
                    }]
                };
            }
            return ex;
        }));
    };

    const removeSet = (exerciseId, setId) => {
        setPlannedExercises(plannedExercises.map(ex => {
            if (ex.id === exerciseId && ex.sets.length > 1) {
                return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
            }
            return ex;
        }));
    };

    const handleSetChange = (exerciseId, setId, field, value) => {
        setPlannedExercises(plannedExercises.map(ex => {
            if (ex.id === exerciseId) {
                return {
                    ...ex,
                    sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
                };
            }
            return ex;
        }));
    };

    const handleExerciseNotesChange = (exerciseId, notes) => {
        setPlannedExercises(plannedExercises.map(ex =>
            ex.id === exerciseId ? { ...ex, notes } : ex
        ));
    };

    const handleModifierChange = (exerciseId, field, value) => {
        setPlannedExercises(plannedExercises.map(ex => {
            if (ex.id === exerciseId) {
                return { ...ex, modifiers: { ...ex.modifiers, [field]: value } };
            }
            return ex;
        }));
    };

    const handleSave = () => {
        if (!programName) return alert('Please enter a program name');
        if (plannedExercises.length === 0) return alert('Please add at least one exercise');

        const filteredExercises = plannedExercises.filter(ex => ex.exerciseId);
        if (filteredExercises.length === 0) return alert('Please select an exercise');

        const getDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const todayStr = getDateStr(date);
        onSave({
            id: initialData?.id || Date.now().toString(),
            date: todayStr,
            name: programName,
            planName: programName,
            exercises: filteredExercises
        });
    };

    return (
        <div className="card" style={{ background: '#222', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Plan Workout for {date.toLocaleDateString()}</h2>
                <button className="btn" onClick={onCancel}>Cancel</button>
            </div>

            <div className="input-group">
                <label>Program Name</label>
                <input
                    type="text"
                    value={programName}
                    onChange={e => setProgramName(e.target.value)}
                    placeholder="e.g. Leg Day A"
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                {plannedExercises.map((ex, exIndex) => (
                    <div key={ex.id} style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', border: '1px solid #444' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <select
                                    value={ex.exerciseId}
                                    onChange={e => handleExerciseChange(ex.id, e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '4px', background: '#222', color: 'white' }}
                                >
                                    <option value="">-- Select Exercise --</option>
                                    {Object.values(EXERCISE_CATEGORIES).map(cat => (
                                        <optgroup label={cat} key={cat}>
                                            {allExercises.filter(e => e.category === cat).map(e => (
                                                <option key={e.id} value={e.id}>{e.name}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="btn"
                                style={{ color: '#f44336', marginLeft: '1rem' }}
                                onClick={() => removeExercise(ex.id)}
                            >
                                Remove
                            </button>
                        </div>

                        {ex.exerciseId && (
                            <div style={{ marginBottom: '1rem' }}>
                                <ExerciseTools
                                    exerciseId={ex.exerciseId}
                                    exerciseName={ex.exerciseName}
                                />
                            </div>
                        )}



                        {/* Modifiers UI */}
                        {ex.exerciseId && EXERCISE_CONFIG[ex.exerciseId] && (
                            <div style={{ marginBottom: '1rem', background: '#222', padding: '0.5rem', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {/* Bar */}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasBarValues && (
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Bar</label>
                                            <select
                                                value={ex.modifiers?.bar || ''}
                                                onChange={e => handleModifierChange(ex.id, 'bar', e.target.value)}
                                                style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                                            >
                                                <option value="">Std</option>
                                                {EXERCISE_CONFIG[ex.exerciseId].hasBarValues.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {/* Grip */}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasGripValues && (
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Grip</label>
                                            <select
                                                value={ex.modifiers?.grip || ''}
                                                onChange={e => handleModifierChange(ex.id, 'grip', e.target.value)}
                                                style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                                            >
                                                <option value="">Std</option>
                                                {EXERCISE_CONFIG[ex.exerciseId].hasGripValues.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {/* Pause */}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasPause && (
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Pause</label>
                                            <select
                                                value={ex.modifiers?.pause || ''}
                                                onChange={e => handleModifierChange(ex.id, 'pause', e.target.value)}
                                                style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                                            >
                                                <option value="">None</option>
                                                <option value="2s">2s</option>
                                                <option value="3s">3s</option>
                                            </select>
                                        </div>
                                    )}
                                    {/* Tempo */}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasTempo && (
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Tempo</label>
                                            <input
                                                type="text"
                                                value={ex.modifiers?.tempo || ''}
                                                onChange={e => handleModifierChange(ex.id, 'tempo', e.target.value)}
                                                placeholder="3-0-0"
                                                style={{ padding: '0.3rem', fontSize: '0.8rem', width: '60px' }}
                                            />
                                        </div>
                                    )}
                                    {/* Boards */}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasBoardValues && (
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Board</label>
                                            <select
                                                value={ex.modifiers?.board || ''}
                                                onChange={e => handleModifierChange(ex.id, 'board', e.target.value)}
                                                style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                                            >
                                                <option value="">None</option>
                                                {EXERCISE_CONFIG[ex.exerciseId].hasBoardValues.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                    {EXERCISE_CONFIG[ex.exerciseId].hasBelt && (
                                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <input type="checkbox" checked={ex.modifiers?.isBelt || false} onChange={e => handleModifierChange(ex.id, 'isBelt', e.target.checked)} />
                                            Belt
                                        </label>
                                    )}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasKneeWraps && (
                                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <input type="checkbox" checked={ex.modifiers?.isKneeWraps || false} onChange={e => handleModifierChange(ex.id, 'isKneeWraps', e.target.checked)} />
                                            Wraps
                                        </label>
                                    )}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasFeetUp && (
                                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <input type="checkbox" checked={ex.modifiers?.isFeetUp || false} onChange={e => handleModifierChange(ex.id, 'isFeetUp', e.target.checked)} />
                                            Feet Up
                                        </label>
                                    )}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasSquatSuit && (
                                        <>
                                            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <input type="checkbox" checked={ex.modifiers?.isSquatSuit || false} onChange={e => handleModifierChange(ex.id, 'isSquatSuit', e.target.checked)} />
                                                Suit
                                            </label>
                                        </>
                                    )}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasBenchShirt && (
                                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <input type="checkbox" checked={ex.modifiers?.isBenchShirt || false} onChange={e => handleModifierChange(ex.id, 'isBenchShirt', e.target.checked)} />
                                            Shirt
                                        </label>
                                    )}
                                    {EXERCISE_CONFIG[ex.exerciseId].hasSlingshot && (
                                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <input type="checkbox" checked={ex.modifiers?.isSlingshot || false} onChange={e => handleModifierChange(ex.id, 'isSlingshot', e.target.checked)} />
                                            Slingshot
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 30px', gap: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                                <div>Weight ({unit})</div>
                                <div>Reps</div>
                                <div>Target RPE</div>
                                <div></div>
                            </div>
                            {ex.sets.map((s, sIndex) => (
                                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 30px', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        value={s.weight}
                                        onChange={e => handleSetChange(ex.id, s.id, 'weight', e.target.value)}
                                        placeholder="0"
                                    />
                                    <input
                                        type="number"
                                        value={s.reps}
                                        onChange={e => handleSetChange(ex.id, s.id, 'reps', e.target.value)}
                                        placeholder="0"
                                    />
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={s.targetRpe}
                                        onChange={e => handleSetChange(ex.id, s.id, 'targetRpe', e.target.value)}
                                        placeholder="8"
                                    />
                                    {ex.sets.length > 1 && (
                                        <button
                                            className="btn"
                                            style={{ padding: 0, color: '#f44336', background: 'transparent' }}
                                            onClick={() => removeSet(ex.id, s.id)}
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                className="btn"
                                style={{ marginTop: '0.5rem', fontSize: '0.8rem', border: '1px dashed #444' }}
                                onClick={() => addSet(ex.id)}
                            >
                                + Add Set
                            </button>
                        </div>

                        <div className="input-group" style={{ marginTop: '1rem' }}>
                            <label style={{ fontSize: '0.8rem' }}>Exercise Notes</label>
                            <input
                                type="text"
                                value={ex.notes}
                                onChange={e => handleExerciseNotesChange(ex.id, e.target.value)}
                                placeholder="e.g. Focus on tempo"
                                style={{ padding: '0.5rem' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="btn"
                style={{ width: '100%', marginTop: '1rem', background: '#333' }}
                onClick={addExercise}
            >
                + Add Exercise
            </button>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                    Save Program
                </button>
                <button className="btn" style={{ flex: 1 }} onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ProgramPlanner;

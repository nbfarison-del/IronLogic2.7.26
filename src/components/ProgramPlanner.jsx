import { useState, useEffect } from 'react';
import { exercises as defaultExercises, EXERCISE_CATEGORIES, EXERCISE_CONFIG } from '../data/exercises';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';
import ExerciseTools from './ExerciseTools';

const ADMIN_EMAIL = 'nbfarison@gmail.com';

const ProgramPlanner = ({ date, onSave, onCancel, initialData = null }) => {
    const { unit } = useSettings();
    const { user } = useAuth();
    const [allExercises, setAllExercises] = useState(defaultExercises);
    const [programName, setProgramName] = useState(initialData?.name || 'New Program');
    const [isTemplate, setIsTemplate] = useState(initialData?.isTemplate || false);
    const [targetAthleteId, setTargetAthleteId] = useState(user?.id);
    const [myAthletes, setMyAthletes] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
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

    const [lastCheckIn, setLastCheckIn] = useState(null);
    const [showInsights, setShowInsights] = useState(false);

    // Load custom exercises and athletes
    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            try {
                // Admin sees ALL users; coaches only see their assigned athletes
                const athleteLoader = user.email === ADMIN_EMAIL
                    ? firestoreService.getAllRegisteredUsers().then(all =>
                        all.filter(u => u.email !== ADMIN_EMAIL && (u.role === 'athlete' || !u.role))
                      )
                    : (user.role === 'coach' || user.role === 'admin')
                        ? firestoreService.getAssignedAthletes(user.id)
                        : Promise.resolve([]);

                const [custom, athletes, fetchedTemplates] = await Promise.all([
                    firestoreService.getCustomExercises(user.id),
                    athleteLoader,
                    (user.role === 'coach' || user.role === 'admin')
                        ? firestoreService.getProgramTemplates()
                        : Promise.resolve([])
                ]);
                setAllExercises([...defaultExercises, ...custom]);
                setMyAthletes(athletes);
                setTemplates(fetchedTemplates);

                // Fetch last check-in for the target athlete
                if (targetAthleteId) {
                    const checkinRef = firestoreService.doc(firestoreService.db, 'users', targetAthleteId, 'weeklyCheckins', new Date().toISOString().split('T')[0]);
                    const snap = await firestoreService.getDoc(checkinRef);
                    if (snap.exists()) {
                        setLastCheckIn(snap.data());
                    } else {
                        // Try finding the most recent if not today
                        const q = firestoreService.query(
                            firestoreService.collection(firestoreService.db, 'users', targetAthleteId, 'weeklyCheckins'),
                            firestoreService.orderBy('date', 'desc'),
                            firestoreService.limit(1)
                        );
                        const qSnap = await firestoreService.getDocs(q);
                        if (!qSnap.empty) setLastCheckIn(qSnap.docs[0].data());
                    }
                }
            } catch (error) {
                console.error('Error loading planner data:', error);
            }
        };
        loadInitialData();
    }, [user, targetAthleteId]);

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

    const handleLoadTemplate = (template) => {
        setProgramName(template.name);
        setPlannedExercises(template.exercises.map(ex => ({
            ...ex,
            id: Date.now() + Math.random(),
            sets: ex.sets.map(s => ({ ...s, id: Date.now() + Math.random() }))
        })));
        setShowTemplatePicker(false);
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

    const handleSave = async () => {
        if (!programName) return alert('Please enter a program name');
        if (plannedExercises.length === 0) return alert('Please add at least one exercise');

        const filteredExercises = plannedExercises.filter(ex => ex.exerciseId);
        if (filteredExercises.length === 0) return alert('Please select an exercise');

        const getDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const todayStr = getDateStr(date);

        const programData = {
            name: programName,
            planName: programName, // Redundant for compatibility
            exercises: filteredExercises,
            authorId: user.id, // The coach/admin who wrote it
            date: todayStr
        };

        try {
            // Context 1: Template Library
            if (isTemplate) {
                await firestoreService.addProgramTemplate({
                    ...programData,
                    authorEmail: user.email
                });
                alert('Saved to Template Library!');
            }

            // Context 2: Actual Assignment
            if (targetAthleteId === user.id) {
                // COACH PERSONAL PROGRAMMING
                // We use the separated path
                await firestoreService.saveCoachPersonalWorkout(user.id, programData);
                
                // For legacy UI compatibility, we also update the athletePrograms path (since it's their own schedule)
                await firestoreService.saveAthleteProgram(user.id, user.id, programData);
                
                onSave({
                    id: initialData?.id || null,
                    ...programData
                });
            } else if (targetAthleteId) {
                // ATHLETE PROGRAMMING
                await firestoreService.saveAthleteProgram(targetAthleteId, user.id, programData);
                alert(`Program assigned to athlete successfully!`);
                onSave(null); // Close planner
            }
        } catch (error) {
            console.error('Error saving program:', error);
            alert('Error saving program: ' + error.message);
        }
    };

    return (
        <div className="card" style={{ background: '#222', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Plan Workout for {date.toLocaleDateString()}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {lastCheckIn && (
                        <button 
                            className="btn" 
                            style={{ background: showInsights ? 'var(--primary)' : '#333', color: 'white' }}
                            onClick={() => setShowInsights(!showInsights)}
                        >
                            {showInsights ? '📖 Hide Insights' : '💡 View Insights'}
                        </button>
                    )}
                    {(user.role === 'coach' || user.role === 'admin') && (
                        <button className="btn" onClick={() => setShowTemplatePicker(!showTemplatePicker)}>
                            {showTemplatePicker ? 'Close Library' : '📁 Load Template'}
                        </button>
                    )}
                    <button className="btn" onClick={onCancel}>Cancel</button>
                </div>
            </div>

            {showInsights && lastCheckIn && (
                <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(33, 150, 243, 0.1)', border: '1px solid var(--primary)', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary)' }}>LATEST ILM RECOMMENDATION</h3>
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(lastCheckIn.date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#fff', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px' }}>
                        {lastCheckIn.recommendation}
                    </div>
                </div>
            )}

            {showTemplatePicker && (
                <div className="card" style={{ marginBottom: '1rem', background: '#333', border: '1px solid var(--primary)' }}>
                    <h3>Template Library</h3>
                    {templates.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {templates.map(t => (
                                <button
                                    key={t.id}
                                    className="btn"
                                    style={{ textAlign: 'left', padding: '0.8rem' }}
                                    onClick={() => handleLoadTemplate(t)}
                                >
                                    <div style={{ fontWeight: 'bold' }}>{t.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{t.exercises?.length || 0} exercises</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#888', fontStyle: 'italic' }}>No templates saved yet.</p>
                    )}
                </div>
            )}

            <div className="input-group">
                <label>Program Name</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={programName}
                        onChange={e => setProgramName(e.target.value)}
                        placeholder="e.g. Leg Day A"
                        style={{ flex: 1 }}
                    />
                    {(user.role === 'coach' || user.role === 'admin') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={isTemplate} onChange={e => setIsTemplate(e.target.checked)} />
                            Save as Template
                        </label>
                    )}
                </div>
            </div>

            {(user.role === 'coach' || user.role === 'admin') && (
                <div className="input-group">
                    <label>Assign to Athlete</label>
                    <select value={targetAthleteId} onChange={e => setTargetAthleteId(e.target.value)}>
                        <option value={user.id}>Myself</option>
                        {myAthletes.map(a => (
                            <option key={a.id} value={a.id}>{a.email} ({a.name || 'Athlete'})</option>
                        ))}
                    </select>
                </div>
            )}

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

import { useState, useEffect } from 'react';
import { exercises as defaultExercises, EXERCISE_CATEGORIES, EXERCISE_CONFIG } from '../data/exercises';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';
import ExerciseTools from './ExerciseTools';
import { calculateEstimated1RM } from '../utils/calculator';
import { useSettings } from '../context/SettingsContext';

const ADMIN_EMAIL = 'nbfarison@gmail.com';

const ProgramPlanner = ({ date, onSave, onCancel, initialData = null, mode = 'assign' }) => {
    const { user } = useAuth();
    const { unit } = useSettings();
    const [allExercises, setAllExercises] = useState(defaultExercises);
    const [programName, setProgramName] = useState(initialData?.name || 'New Program');
    const [isTemplate, setIsTemplate] = useState(initialData?.isTemplate || mode === 'template');
    
    // Template specific fields
    const [duration, setDuration] = useState(initialData?.duration || '12 Weeks');
    const [frequency, setFrequency] = useState(initialData?.frequency || '3 Days/Week');
    const [goal, setGoal] = useState(initialData?.goal || 'General Strength');
    const [visibility, setVisibility] = useState(initialData?.visibility || 'public');

    const [targetAthleteId, setTargetAthleteId] = useState(user?.id);
    const [myAthletes, setMyAthletes] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [isCreatingCustom, setIsCreatingCustom] = useState(false);
    const [newExName, setNewExName] = useState('');
    const [activeExIdForCustom, setActiveExIdForCustom] = useState(null);
    
    const [plannedExercises, setPlannedExercises] = useState(() => {
        const exercisesInPlan = initialData?.exercises || [];
        return exercisesInPlan.map(ex => {
            const standardEx = defaultExercises.find(e => e.id === ex.exerciseId);
            const finalName = ex.exerciseName || ex.name || standardEx?.name || ex.exerciseId;

            return {
                ...ex,
                exerciseName: finalName,
                id: ex.id || Date.now() + Math.random(),
                sets: Array.isArray(ex.sets) ? ex.sets : Array.from({ length: parseInt(ex.sets, 10) || 1 }, (_, i) => ({
                    id: Date.now() + i + Math.random(),
                    weight: '',
                    reps: ex.reps || '',
                    targetRpe: ex.rpe || ''
                }))
            };
        });
    });

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            try {
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
                        ? firestoreService.getProgramTemplates(true)
                        : Promise.resolve([])
                ]);
                setAllExercises([...defaultExercises, ...custom]);
                setMyAthletes(athletes);
                setTemplates(fetchedTemplates);
            } catch (error) {
                console.error('Error loading planner data:', error);
            }
        };
        loadInitialData();
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
                    isSquatSuit: false, isBenchShirt: false, isSlingshot: false
                }
            }
        ]);
    };

    const removeExercise = (id) => {
        setPlannedExercises(plannedExercises.filter(ex => ex.id !== id));
    };

    const handleExerciseChange = (id, exerciseId) => {
        if (exerciseId === 'CREATE_NEW') {
            setActiveExIdForCustom(id);
            setIsCreatingCustom(true);
            return;
        }
        const exercise = allExercises.find(ex => ex.id === exerciseId);
        setPlannedExercises(plannedExercises.map(ex =>
            ex.id === id ? { ...ex, exerciseId, exerciseName: exercise?.name || '' } : ex
        ));
    };

    const handleSaveCustomExercise = async () => {
        if (!newExName.trim()) return;
        const newEx = {
            id: 'custom_' + Date.now(),
            name: newExName.trim(),
            category: EXERCISE_CATEGORIES.CUSTOM,
            isCustom: true
        };

        try {
            await firestoreService.addCustomExercise(user.id, newEx);
            setAllExercises([...allExercises, newEx]);
            setPlannedExercises(plannedExercises.map(ex =>
                ex.id === activeExIdForCustom ? { ...ex, exerciseId: newEx.id, exerciseName: newEx.name } : ex
            ));
            setNewExName('');
            setIsCreatingCustom(false);
            setActiveExIdForCustom(null);
        } catch (error) {
            console.error('Error saving custom exercise:', error);
            alert('Failed to save exercise');
        }
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
            if (ex.id !== exerciseId) return ex;
            if (ex.sets.length <= 1) return ex;
            return {
                ...ex,
                sets: ex.sets.filter(set => set.id !== setId)
            };
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

    const handleExerciseNoteChange = (exerciseId, value) => {
        setPlannedExercises(plannedExercises.map(ex =>
            ex.id === exerciseId ? { ...ex, notes: value } : ex
        ));
    };

    const applyCalculatedTarget = (exerciseId, target) => {
        setPlannedExercises(plannedExercises.map(ex => {
            if (ex.id !== exerciseId) return ex;

            const targetSetId = ex.sets.find(s => !s.weight && !s.reps)?.id || ex.sets[0]?.id;
            return {
                ...ex,
                sets: ex.sets.map(s => s.id === targetSetId
                    ? {
                        ...s,
                        weight: String(target.weight || ''),
                        reps: String(target.reps || s.reps || ''),
                        targetRpe: String(target.targetRpe || s.targetRpe || '')
                    }
                    : s
                )
            };
        }));
    };

    const handleSave = async () => {
        if (!programName) return alert('Please enter a program name');
        if (plannedExercises.length === 0) return alert('Please add at least one exercise');

        const filteredExercises = plannedExercises.filter(ex => ex.exerciseId);
        if (filteredExercises.length === 0) return alert('Please select an exercise');

        const todayStr = `${(date || new Date()).getFullYear()}-${String((date || new Date()).getMonth() + 1).padStart(2, '0')}-${String((date || new Date()).getDate()).padStart(2, '0')}`;

        const programData = {
            name: programName,
            exercises: filteredExercises,
            createdBy: user.name || user.email,
            authorId: user.id,
            updatedAt: new Date().toISOString()
        };

        try {
            if (isTemplate) {
                await firestoreService.addProgramTemplate({
                    ...programData,
                    duration,
                    frequency,
                    goal,
                    visibility
                }, user.id);
                alert('Saved to Template Library!');
                if (mode === 'template') return onSave(null);
            }

            if (mode !== 'template') {
                if (targetAthleteId === user.id) {
                    await firestoreService.saveCoachPersonalWorkout(user.id, { ...programData, date: todayStr });
                    await firestoreService.saveAthleteProgram(user.id, user.id, { ...programData, date: todayStr });
                    onSave({ ...programData, date: todayStr });
                } else if (targetAthleteId) {
                    await firestoreService.saveAthleteProgram(targetAthleteId, user.id, { ...programData, date: todayStr });
                    alert(`Program assigned to athlete successfully!`);
                    onSave(null);
                }
            }
        } catch (error) {
            console.error('Error saving program:', error);
            alert('Error saving program: ' + error.message);
        }
    };

    return (
        <div className="glass-card" style={{ background: 'rgba(15,15,18,0.95)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{mode === 'template' ? 'Build Template' : `Plan Workout for ${date?.toLocaleDateString()}`}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(user.role === 'coach' || user.role === 'admin') && mode !== 'template' && (
                        <button className="btn" onClick={() => setShowTemplatePicker(!showTemplatePicker)}>
                            📁 {showTemplatePicker ? 'Hide Library' : 'Load Template'}
                        </button>
                    )}
                    <button className="btn" onClick={onCancel}>Cancel</button>
                </div>
            </div>

            {/* Template picker if not in template mode */}
            {showTemplatePicker && (
                <div className="card" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)' }}>
                    <h3>Template Library</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {templates.map(t => (
                            <button key={t.id} className="btn" onClick={() => {
                                setProgramName(t.name);
                                setPlannedExercises(t.exercises.map(ex => ({ ...ex, id: Math.random() })));
                                setShowTemplatePicker(false);
                            }}>
                                <strong>{t.name}</strong>
                                <small style={{ display: 'block', opacity: 0.7 }}>{t.duration}</small>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="input-group">
                    <label>Program Name</label>
                    <input type="text" value={programName} onChange={e => setProgramName(e.target.value)} placeholder="e.g. Day 1: Squat Focus" />
                </div>
                {isTemplate && (
                    <>
                        <div className="input-group">
                            <label>Goal</label>
                            <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Hypertrophy" />
                        </div>
                        <div className="input-group">
                            <label>Duration / Frequency</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="text" value={duration} onChange={e => setDuration(e.target.value)} style={{ flex: 1 }} />
                                <input type="text" value={frequency} onChange={e => setFrequency(e.target.value)} style={{ flex: 1 }} />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {(user.role === 'coach' || user.role === 'admin') && (
                    <label className="btn" style={{ background: isTemplate ? 'var(--primary-glow)' : 'transparent', borderColor: isTemplate ? 'var(--primary)' : 'var(--border-glass)' }}>
                        <input type="checkbox" checked={isTemplate} onChange={e => setIsTemplate(e.target.checked)} style={{ marginRight: '0.5rem' }} />
                        Save to Library
                    </label>
                )}
                {isTemplate && user.role === 'admin' && (
                    <select value={visibility} onChange={e => setVisibility(e.target.value)} className="btn">
                        <option value="public">🌍 Public (All Users)</option>
                        <option value="private">🔒 Private (Admin Only)</option>
                    </select>
                )}
                {mode !== 'template' && (
                    <select value={targetAthleteId} onChange={e => setTargetAthleteId(e.target.value)} className="btn">
                        <option value={user.id}>Target: Myself</option>
                        {myAthletes.map(a => <option key={a.id} value={a.id}>Target: {a.email}</option>)}
                    </select>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {plannedExercises.map((ex) => (
                    <div key={ex.id} className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <select value={ex.exerciseId} onChange={e => handleExerciseChange(ex.id, e.target.value)} style={{ flex: 1 }}>
                                <option value="">-- Select Exercise --</option>
                                <option value="CREATE_NEW">+ Create New Exercise</option>
                                {Object.values(EXERCISE_CATEGORIES).map(cat => (
                                    <optgroup label={cat} key={cat}>
                                        {allExercises.filter(e => e.category === cat).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                            <button className="btn" style={{ color: 'var(--accent-error)' }} onClick={() => removeExercise(ex.id)}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {ex.sets.map((s) => (
                                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) minmax(86px, auto) auto', gap: '0.5rem', alignItems: 'center' }}>
                                    <input type="number" placeholder="Weight" value={s.weight} onChange={e => handleSetChange(ex.id, s.id, 'weight', e.target.value)} style={{ flex: 1 }} disabled={isTemplate} />
                                    <input type="text" placeholder="Reps" value={s.reps} onChange={e => handleSetChange(ex.id, s.id, 'reps', e.target.value)} style={{ flex: 1 }} />
                                    <input type="text" placeholder="RPE" value={s.targetRpe} onChange={e => handleSetChange(ex.id, s.id, 'targetRpe', e.target.value)} style={{ flex: 1 }} />
                                    <div style={{ fontSize: '0.75rem', color: 'gold', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {calculateEstimated1RM(s.weight, s.reps, s.targetRpe) > 0
                                            ? `e1RM ${calculateEstimated1RM(s.weight, s.reps, s.targetRpe)} ${unit}`
                                            : 'e1RM --'}
                                    </div>
                                    <button className="btn" onClick={() => removeSet(ex.id, s.id)}>✕</button>
                                </div>
                            ))}
                            <button className="btn" onClick={() => addSet(ex.id)}>+ Add Set</button>
                        </div>

                        <div className="input-group" style={{ marginTop: '1rem' }}>
                            <label>Movement Notes</label>
                            <textarea
                                value={ex.notes || ''}
                                onChange={e => handleExerciseNoteChange(ex.id, e.target.value)}
                                placeholder="Cues, substitutions, tempo, warm-up notes..."
                                style={{ minHeight: '70px', resize: 'vertical' }}
                            />
                        </div>

                        <ExerciseTools
                            exerciseId={ex.exerciseId}
                            exerciseName={ex.exerciseName}
                            athleteId={targetAthleteId}
                            onApplyTarget={isTemplate ? undefined : (target) => applyCalculatedTarget(ex.id, target)}
                        />
                    </div>
                ))}
            </div>

            {isCreatingCustom && (
                <div className="nav-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h3>Add New Exercise</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>This will be added to your custom movement library.</p>
                        <input 
                            type="text" 
                            value={newExName} 
                            onChange={e => setNewExName(e.target.value)} 
                            placeholder="Exercise Name (e.g. Pause Squat)" 
                            autoFocus
                            style={{ width: '100%', marginBottom: '1.5rem', padding: '0.8rem' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1 }} onClick={() => { setIsCreatingCustom(false); setNewExName(''); }}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveCustomExercise}>Add Exercise</button>
                        </div>
                    </div>
                </div>
            )}

            <button className="btn" style={{ width: '100%', marginTop: '1rem' }} onClick={addExercise}>+ Add Movement</button>

            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save {isTemplate ? 'Template' : 'Program'}</button>
                <button className="btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export default ProgramPlanner;

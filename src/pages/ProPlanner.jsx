import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import * as firestoreService from '../services/firestoreService';
import { exercises as defaultExercises, EXERCISE_CATEGORIES } from '../data/exercises';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ProPlanner = () => {
    const { athleteId: paramAthleteId } = useParams();
    const { user } = useAuth();
    const { unit } = useSettings();
    const navigate = useNavigate();

    // Data State
    const [athlete, setAthlete] = useState(null);
    const [weeks, setWeeks] = useState([]); 
    const [activeWeekIndex, setActiveWeekIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Selection state for Bulk Actions
    const [selectedIds, setSelectedIds] = useState(new Set()); 
    const [templates, setTemplates] = useState([]);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    // Filter/Switch State
    const [myAthletes, setMyAthletes] = useState([]);
    const [targetAthleteId, setTargetAthleteId] = useState(paramAthleteId || user?.id);

    // DB Sync
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, [user, targetAthleteId]);

    const loadInitialData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [usersData, profileData, plannedData, templatesData] = await Promise.all([
                user.email === 'nbfarison@gmail.com' ? firestoreService.getAllRegisteredUsers() : firestoreService.getAssignedAthletes(user.id),
                firestoreService.getUserProfile(targetAthleteId),
                firestoreService.getPlannedWorkouts(targetAthleteId),
                firestoreService.getProgramTemplates(true)
            ]);
            
            setMyAthletes(usersData);
            setAthlete(profileData || { email: 'Unknown' });
            setTemplates(templatesData);
            setWeeks(buildStructureFromPlanned(plannedData));
        } catch (error) {
            console.error('Error loading pro planner:', error);
        } finally {
            setLoading(false);
        }
    };

    const buildStructureFromPlanned = (planned) => {
        if (planned.length === 0) return [createEmptyWeek()];
        const sorted = [...planned].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = new Date(sorted[0].date);
        const startOffset = (firstDate.getDay() + 6) % 7; 
        const MondayDate = new Date(firstDate);
        MondayDate.setDate(firstDate.getDate() - startOffset);

        const weekMap = {};
        sorted.forEach(p => {
            const date = new Date(p.date);
            const diffInDays = Math.floor((date - MondayDate) / (1000 * 60 * 60 * 24));
            const weekIdx = Math.floor(diffInDays / 7);
            const dayIdx = diffInDays % 7;
            if (weekIdx < 0 || weekIdx > 52) return; // Guard

            if (!weekMap[weekIdx]) weekMap[weekIdx] = DAYS.map(() => ({ sessions: [] }));
            weekMap[weekIdx][dayIdx].sessions.push({
                id: p.id,
                name: p.name || 'Strength Session',
                exercises: (p.exercises || []).map(ex => ({
                    ...ex,
                    id: ex.id || Math.random().toString(36).substr(2, 9)
                }))
            });
        });

        const result = [];
        const maxWeek = Math.max(...Object.keys(weekMap).map(Number), 0);
        for(let i=0; i<=maxWeek; i++) {
            result.push(weekMap[i] || createEmptyWeek());
        }
        return result;
    };

    const createEmptyWeek = () => DAYS.map(() => ({ sessions: [] }));

    // ==================== DRAG AND DROP ====================
    const [dragSession, setDragSession] = useState(null);

    const onDragStart = (e, session, fromDayIdx) => {
        setDragSession({ session, fromDayIdx, fromWeekIdx: activeWeekIndex });
        e.dataTransfer.effectAllowed = "move";
    };

    const onDrop = (e, toDayIdx) => {
        e.preventDefault();
        if (!dragSession) return;

        const newWeeks = [...weeks];
        const { session, fromDayIdx, fromWeekIdx } = dragSession;

        // Remove from old
        newWeeks[fromWeekIdx][fromDayIdx].sessions = newWeeks[fromWeekIdx][fromDayIdx].sessions.filter(s => s.id !== session.id);
        
        // Add to new
        newWeeks[activeWeekIndex][toDayIdx].sessions.push(session);
        
        setWeeks(newWeeks);
        setDragSession(null);
        triggerAutoSync();
    };

    // ==================== CORE ACTIONS ====================

    const addSession = (dayIdx) => {
        const newWeeks = [...weeks];
        newWeeks[activeWeekIndex][dayIdx].sessions.push({
            id: Date.now().toString() + Math.random(),
            name: 'New Session',
            exercises: [{
                id: Math.random().toString(),
                exerciseId: '',
                name: '',
                sets: [{ id: 1, reps: '', targetRpe: '', weight: '' }]
            }]
        });
        setWeeks(newWeeks);
    };

    const handleInlineChange = (sIdx, dayIdx, exIdx, field, value) => {
        const newWeeks = [...weeks];
        const ex = newWeeks[activeWeekIndex][dayIdx].sessions[sIdx].exercises[exIdx];
        
        if (field === 'exerciseId') {
            const standard = defaultExercises.find(e => e.id === value);
            ex.exerciseId = value;
            ex.name = standard?.name || value;
        } else {
            if (!ex.sets || ex.sets.length === 0) ex.sets = [{ id: 1 }];
            ex.sets[0][field] = value;
        }
        
        setWeeks(newWeeks);
        triggerAutoSync();
    };

    const copyWeekForward = () => {
        const currentWeek = JSON.parse(JSON.stringify(weeks[activeWeekIndex]));
        const newWeek = currentWeek.map(day => ({
            sessions: day.sessions.map(s => ({
                ...s,
                id: Date.now() + Math.random().toString(),
                exercises: s.exercises.map(ex => ({ ...ex, id: Math.random().toString() }))
            }))
        }));
        setWeeks([...weeks, newWeek]);
        setActiveWeekIndex(weeks.length);
        triggerAutoSync();
    };

    const applyTemplate = (template) => {
        const templateWeek = buildStructureFromPlanned(template.exercises.map(ex => ({
            ...ex,
            date: new Date().toISOString() // dummy for structuring
        })))[0]; // Take first week of template

        const newWeeks = [...weeks];
        newWeeks[activeWeekIndex] = templateWeek;
        setWeeks(newWeeks);
        setShowTemplateMenu(false);
        triggerAutoSync();
    };

    // ==================== BULK ADJUSTMENTS ====================

    const applyBulkAdjustment = (type, value) => {
        const newWeeks = [...weeks];
        newWeeks[activeWeekIndex].forEach(day => {
            day.sessions.forEach(session => {
                if (selectedIds.has(session.id)) {
                    session.exercises.forEach(ex => {
                        if (!ex.sets || !ex.sets[0]) return;
                        const set = ex.sets[0];
                        if (type === 'rpe') set.targetRpe = (parseFloat(set.targetRpe || 0) + value).toFixed(1);
                        if (type === 'weight') set.weight = (parseFloat(set.weight || 0) + value).toString();
                        if (type === 'reps') set.reps = (parseFloat(set.reps || 0) + value).toString();
                    });
                }
            });
        });
        setWeeks(newWeeks);
        triggerAutoSync();
    };

    // ==================== SYNC LOGIC ====================
    const syncTimeoutRef = useRef(null);
    const triggerAutoSync = () => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(async () => {
            setIsSyncing(true);
            try {
                const MondayDate = getMondayOfWeek(activeWeekIndex);
                const promises = [];
                
                weeks[activeWeekIndex].forEach((day, dayIdx) => {
                    const workoutDate = new Date(MondayDate);
                    workoutDate.setDate(MondayDate.getDate() + dayIdx);
                    const dateStr = workoutDate.toISOString().split('T')[0];

                    day.sessions.forEach(session => {
                        promises.push(firestoreService.saveAthleteProgram(targetAthleteId, user.id, {
                            ...session,
                            date: dateStr,
                        }));
                    });
                });

                await Promise.all(promises);
            } catch (err) {
                console.error('Sync error:', err);
            } finally {
                setIsSyncing(false);
            }
        }, 1500); 
    };

    const getMondayOfWeek = (weekIdx) => {
        const d = new Date();
        const Monday = new Date(d.setDate(d.getDate() - (d.getDay() + 6) % 7));
        Monday.setDate(Monday.getDate() + (weekIdx * 7));
        return Monday;
    };

    if (loading) return <div className="card">Loading SPRINT Engine...</div>;

    return (
        <div className="pro-layout animate-in">
            {/* STICKY TOOLBAR */}
            <div className="pro-toolbar glass-card" style={{ padding: '0.75rem 1.5rem', borderRadius: '0' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textShadow: '0 0 10px var(--primary-glow)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.1em' }}>SPRINT PROGRAMMER v1.0</h2>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ATHLETE: {athlete?.email}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Week Switcher */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        {weeks.map((_, i) => (
                            <button 
                                key={i} 
                                className={`btn ${activeWeekIndex === i ? 'btn-primary' : ''}`}
                                style={{ minHeight: '30px', padding: '4px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                                onClick={() => setActiveWeekIndex(i)}
                            >
                                W{i+1}
                            </button>
                        ))}
                        <button className="btn" style={{ minHeight: '30px', padding: '4px 10px' }} onClick={copyWeekForward}>+ COPY W{activeWeekIndex+1}</button>
                    </div>

                    {/* Bulk Tools */}
                    <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                        <button className="btn" style={{ minHeight: '32px', fontSize: '0.7rem' }} onClick={() => applyBulkAdjustment('weight', 5)}>+5lb</button>
                        <button className="btn" style={{ minHeight: '32px', fontSize: '0.7rem' }} onClick={() => applyBulkAdjustment('rpe', 0.5)}>+.5 RPE</button>
                    </div>

                    {/* Templates */}
                    <div style={{ position: 'relative' }}>
                        <button className="btn btn-secondary" style={{ minHeight: '32px', fontSize: '0.75rem' }} onClick={() => setShowTemplateMenu(!showTemplateMenu)}>
                            📁 Templates
                        </button>
                        {showTemplateMenu && (
                            <div className="glass-card" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1001, width: '250px', marginTop: '0.5rem', padding: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem' }}>Apply Template to W{activeWeekIndex+1}</h4>
                                {templates.map(t => (
                                    <button 
                                        key={t.id} 
                                        className="btn" 
                                        style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.5rem', marginBottom: '4px' }}
                                        onClick={() => applyTemplate(t)}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ paddingLeft: '10px', borderLeft: '1px solid #444' }}>
                         {isSyncing ? <span style={{ fontSize: '0.75rem', color: 'var(--primary)', animation: 'pulse 1s infinite' }}>⚡ Syncing...</span> : <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)' }}>✓ Cloud Synced</span>}
                    </div>
                </div>
            </div>

            {/* WEEKLY GRID */}
            <div className="pro-week-grid">
                {DAYS.map((dayName, dayIdx) => (
                    <div 
                        key={dayName} 
                        className="pro-day-col"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, dayIdx)}
                    >
                        <div className="pro-day-header">
                            {dayName}
                            <button 
                                onClick={() => addSession(dayIdx)} 
                                style={{ float: 'right', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem' }}
                            >
                                +
                            </button>
                        </div>
                        
                        {weeks[activeWeekIndex][dayIdx].sessions.map((session, sIdx) => (
                            <div 
                                key={session.id} 
                                draggable
                                onDragStart={(e) => onDragStart(e, session, dayIdx)}
                                className={`pro-session-card animate-in ${selectedIds.has(session.id) ? 'selected' : ''}`}
                                onClick={(e) => {
                                    const newSelection = new Set(selectedIds);
                                    if (newSelection.has(session.id)) newSelection.delete(session.id);
                                    else newSelection.add(session.id);
                                    setSelectedIds(newSelection);
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <input 
                                        className="pro-input" 
                                        style={{ fontWeight: 800, textAlign: 'left', border: 'none', background: 'transparent', fontSize: '0.8rem', color: 'var(--primary)' }} 
                                        value={session.name} 
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            const newWeeks = [...weeks];
                                            newWeeks[activeWeekIndex][dayIdx].sessions[sIdx].name = e.target.value;
                                            setWeeks(newWeeks);
                                        }}
                                    />
                                    <span style={{ fontSize: '0.6rem', color: '#555', cursor: 'grab' }}>⠿</span>
                                </div>

                                {session.exercises.map((ex, exIdx) => (
                                    <div key={ex.id} className="pro-exercise-row" onClick={(e) => e.stopPropagation()}>
                                        <select 
                                            className="pro-input pro-input-name"
                                            value={ex.exerciseId}
                                            onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'exerciseId', e.target.value)}
                                        >
                                            <option value="">Exercise...</option>
                                            {Object.values(EXERCISE_CATEGORIES).map(cat => (
                                                <optgroup label={cat} key={cat}>
                                                    {defaultExercises.filter(e => e.category === cat).map(e => (
                                                        <option key={e.id} value={e.id}>{e.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <input className="pro-input" placeholder="S" value={ex.sets?.[0]?.sets || ''} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'sets', e.target.value)} />
                                        <input className="pro-input" placeholder="R" value={ex.sets?.[0]?.reps || ''} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'reps', e.target.value)} />
                                        <input className="pro-input" placeholder="@" value={ex.sets?.[0]?.targetRpe || ''} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'targetRpe', e.target.value)} />
                                        <input className="pro-input" placeholder="W" value={ex.sets?.[0]?.weight || ''} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'weight', e.target.value)} />
                                    </div>
                                ))}

                                <button 
                                    className="btn" 
                                    style={{ width: '100%', minHeight: '22px', fontSize: '0.6rem', marginTop: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #444', color: '#888' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newWeeks = [...weeks];
                                        newWeeks[activeWeekIndex][dayIdx].sessions[sIdx].exercises.push({
                                            id: Math.random().toString(),
                                            exerciseId: '',
                                            name: '',
                                            sets: [{ id: 1, reps: '', targetRpe: '', weight: '' }]
                                        });
                                        setWeeks(newWeeks);
                                    }}
                                >
                                    + ADD LIFT
                                </button>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
};

export default ProPlanner;

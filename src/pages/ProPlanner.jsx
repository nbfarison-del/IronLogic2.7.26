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
    const [deletedDocIds, setDeletedDocIds] = useState(new Set());
    
    // Undo History
    const [history, setHistory] = useState([]);

    // Selection state for Bulk Actions
    const [selectedExIds, setSelectedExIds] = useState(new Set()); 
    const [templates, setTemplates] = useState([]);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    // Filter/Switch State
    const [myAthletes, setMyAthletes] = useState([]);
    const [targetAthleteId, setTargetAthleteId] = useState(paramAthleteId || user?.id);

    // DB Sync
    const [isSyncing, setIsSyncing] = useState(false);
    const syncTimeoutRef = useRef(null);

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
            if (weekIdx < 0 || weekIdx > 52) return; 

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

    const getMondayOfWeek = (weekIdx) => {
        const d = new Date();
        const Monday = new Date(d.setDate(d.getDate() - (d.getDay() + 6) % 7));
        Monday.setDate(Monday.getDate() + (weekIdx * 7));
        return Monday;
    };

    const getDayDate = (weekIdx, dayIdx) => {
        const Monday = getMondayOfWeek(weekIdx);
        const d = new Date(Monday);
        d.setDate(Monday.getDate() + dayIdx);
        return d.toISOString().split('T')[0];
    };

    const triggerAutoSync = (currentWeeks = weeks, currentWeekIdx = activeWeekIndex) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(async () => {
            setIsSyncing(true);
            try {
                if (deletedDocIds.size > 0) {
                    const deletePromises = Array.from(deletedDocIds).map(id => 
                        firestoreService.deletePlannedWorkout(targetAthleteId, id)
                    );
                    await Promise.all(deletePromises);
                    setDeletedDocIds(new Set());
                }

                const promises = [];
                currentWeeks[currentWeekIdx].forEach((day, dayIdx) => {
                    const dateStr = getDayDate(currentWeekIdx, dayIdx);
                    day.sessions.forEach(session => {
                        if (session.exercises.length > 0 || session.name) {
                            promises.push(firestoreService.saveAthleteProgram(targetAthleteId, user.id, {
                                ...session,
                                date: dateStr,
                            }));
                        }
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

    const copyData = (data) => JSON.parse(JSON.stringify(data));

    const modifyWeeks = (updater) => {
        setHistory(prev => [...prev.slice(-19), copyData(weeks)]);
        const newWeeks = copyData(weeks);
        updater(newWeeks);
        setWeeks(newWeeks);
        triggerAutoSync(newWeeks, activeWeekIndex);
    };

    const undo = () => {
        if (history.length > 0) {
            const prevState = history[history.length - 1];
            setHistory(prev => prev.slice(0, -1));
            setWeeks(prevState);
            triggerAutoSync(prevState, activeWeekIndex);
            setSelectedExIds(new Set());
        }
    };


    // ==================== DRAG AND DROP ====================
    const [dragItem, setDragItem] = useState(null); 
    const [dragOverInfo, setDragOverInfo] = useState(null); 

    const onExerciseDragStart = (e, sessionIdx, dayIdx, exIdx, exercise) => {
        setDragItem({ type: 'exercise', sessionIdx, dayIdx, exIdx, item: exercise });
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
    };

    const onDragOver = (e, targetDayIdx, targetSessionIdx) => {
        e.preventDefault();
        setDragOverInfo({ dayIdx: targetDayIdx, sessionIdx: targetSessionIdx });
    };

    const onDragLeave = () => {
        setDragOverInfo(null);
    };

    const onTemplateDragStart = (e, template) => {
        setDragItem({ type: 'template', item: template });
        e.dataTransfer.effectAllowed = "copy";
        e.stopPropagation();
    };

    const onDrop = (e, targetDayIdx, targetSessionIdx) => {
        e.preventDefault();
        setDragOverInfo(null);
        if (!dragItem) return;

        if (dragItem.type === 'exercise') {
            // Don't drop on itself
            if (dragItem.dayIdx === targetDayIdx && dragItem.sessionIdx === targetSessionIdx) return;

            modifyWeeks(newWeeks => {
                const currentWeek = newWeeks[activeWeekIndex];
                // Remove
                currentWeek[dragItem.dayIdx].sessions[dragItem.sessionIdx].exercises.splice(dragItem.exIdx, 1);
                // Add
                currentWeek[targetDayIdx].sessions[targetSessionIdx].exercises.push(dragItem.item);
            });
        } else if (dragItem.type === 'template') {
            const template = JSON.parse(JSON.stringify(dragItem.item));
            console.log("[DRAG] Template object before processing:", template);

            modifyWeeks(newWeeks => {
                const currentWeek = newWeeks[activeWeekIndex];

                // Helper to clone a single exercise with its sets
                const cloneExercise = (ex) => ({
                    exerciseId: ex.exerciseId || '',
                    name: ex.exerciseName || ex.name || '',
                    notes: ex.notes || '',
                    modifiers: ex.modifiers ? JSON.parse(JSON.stringify(ex.modifiers)) : {},
                    id: Math.random().toString(36).substr(2, 9),
                    sets: (ex.sets || []).map(s => ({
                        ...s,
                        id: Math.random().toString(36).substr(2, 9),
                        weight: s.weight || '',
                        reps: s.reps || '',
                        targetRpe: s.targetRpe || ''
                    }))
                });

                if (template.weeks && Array.isArray(template.weeks)) {
                    // Full program template - apply starting from current week
                    console.log("[DRAG] Applying multi-week program template");
                    template.weeks.forEach((week, wIdx) => {
                        const targetWIdx = activeWeekIndex + wIdx;
                        if (!newWeeks[targetWIdx]) newWeeks[targetWIdx] = createEmptyWeek();
                        
                        if (week.days && Array.isArray(week.days)) {
                            week.days.forEach(day => {
                                const dayIdx = day.dayOfWeek - 1;
                                if (dayIdx >= 0 && dayIdx < 7) {
                                    const newSession = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        name: day.name || template.name || "Program Session",
                                        exercises: (day.exercises || []).map(cloneExercise)
                                    };
                                    newWeeks[targetWIdx][dayIdx].sessions.push(newSession);
                                }
                            });
                        }
                    });
                } else {
                    // Single workout template
                    console.log("[DRAG] Applying single workout template");
                    const exercises = (template.exercises || []).map(cloneExercise);
                    
                    if (exercises.length === 0) {
                        console.warn("[DRAG] Template has no exercises!", template);
                    }

                    const newSession = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: template.name || "Template Session",
                        exercises: exercises
                    };

                    console.log("[DRAG] Final session object to be dropped:", newSession);

                    if (targetSessionIdx !== undefined && currentWeek[targetDayIdx].sessions[targetSessionIdx]) {
                        // Merge into existing session
                        console.log("[DRAG] Merging into existing session at day", targetDayIdx, "session", targetSessionIdx);
                        currentWeek[targetDayIdx].sessions[targetSessionIdx].exercises.push(...newSession.exercises);
                    } else {
                        // Add as new session to the day
                        console.log("[DRAG] Creating new session on day", targetDayIdx);
                        currentWeek[targetDayIdx].sessions.push(newSession);
                    }
                }
            });
        }
        setDragItem(null);
    };



    // ==================== CORE ACTIONS ====================

    const deleteSession = (dayIdx, sIdx) => {
        if (!window.confirm("Delete this entire session?")) return;
        
        const session = weeks[activeWeekIndex][dayIdx].sessions[sIdx];
        // If the ID looks like a Firestore ID (alphanumeric, no dots, length around 20), track for deletion
        if (session.id && !session.id.includes('.') && session.id.length > 10) {
            setDeletedDocIds(prev => new Set(prev).add(session.id));
        }

        modifyWeeks(newWeeks => {
            newWeeks[activeWeekIndex][dayIdx].sessions.splice(sIdx, 1);
        });
    };

    const addSession = (dayIdx) => {
        modifyWeeks(newWeeks => {
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
        });
    };

    const handleInlineChange = (sIdx, dayIdx, exIdx, field, value) => {
        modifyWeeks(newWeeks => {
            const ex = newWeeks[activeWeekIndex][dayIdx].sessions[sIdx].exercises[exIdx];
            if (field === 'exerciseId') {
                const standard = defaultExercises.find(e => e.id === value);
                ex.exerciseId = value;
                ex.name = standard?.name || value;
            } else {
                if (!ex.sets || ex.sets.length === 0) ex.sets = [{ id: 1 }];
                ex.sets[0][field] = value;
            }
        });
    };

    const copyWeekForward = () => {
        const currentWeek = copyData(weeks[activeWeekIndex]);
        const newWeek = currentWeek.map(day => ({
            sessions: day.sessions.map(s => ({
                ...s,
                id: Date.now() + Math.random().toString(),
                exercises: s.exercises.map(ex => ({ ...ex, id: Math.random().toString() }))
            }))
        }));
        
        setHistory(prev => [...prev.slice(-19), copyData(weeks)]);
        const newWeeksData = [...weeks, newWeek];
        setWeeks(newWeeksData);
        setActiveWeekIndex(newWeeksData.length - 1);
        triggerAutoSync(newWeeksData, newWeeksData.length - 1);
    };

    const applyWeekForward = () => {
        const numWeeks = parseInt(prompt("How many weeks forward to apply?", "4") || "0");
        if (numWeeks <= 0 || isNaN(numWeeks)) return;
        
        modifyWeeks(newWeeks => {
            const currentWeekData = copyData(newWeeks[activeWeekIndex]);
            for(let i=1; i<=numWeeks; i++) {
                const targetIdx = activeWeekIndex + i;
                if (!newWeeks[targetIdx]) newWeeks[targetIdx] = createEmptyWeek();
                
                newWeeks[targetIdx] = currentWeekData.map(day => ({
                    sessions: day.sessions.map(s => ({
                        ...s,
                        id: Math.random().toString(),
                        exercises: s.exercises.map(ex => ({ ...ex, id: Math.random().toString() }))
                    }))
                }));
            }
        });
        alert(`Applied week structure ${numWeeks} weeks forward.`);
    };

    const applyTemplate = (templateData) => {
        const template = JSON.parse(JSON.stringify(templateData));
        console.log("[MENU] Applying template to week:", template);

        modifyWeeks(newWeeks => {
            const cloneExercise = (ex) => ({
                exerciseId: ex.exerciseId || '',
                name: ex.exerciseName || ex.name || '',
                notes: ex.notes || '',
                modifiers: ex.modifiers ? JSON.parse(JSON.stringify(ex.modifiers)) : {},
                id: Math.random().toString(36).substr(2, 9),
                sets: (ex.sets || []).map(s => ({
                    ...s,
                    id: Math.random().toString(36).substr(2, 9),
                    weight: s.weight || '',
                    reps: s.reps || '',
                    targetRpe: s.targetRpe || ''
                }))
            });

            if (template.weeks && Array.isArray(template.weeks)) {
                // Multi-week program
                template.weeks.forEach((week, wIdx) => {
                    const targetWIdx = activeWeekIndex + wIdx;
                    if (!newWeeks[targetWIdx]) newWeeks[targetWIdx] = createEmptyWeek();
                    
                    if (week.days && Array.isArray(week.days)) {
                        week.days.forEach(day => {
                            const dayIdx = day.dayOfWeek - 1;
                            if (dayIdx >= 0 && dayIdx < 7) {
                                newWeeks[targetWIdx][dayIdx].sessions.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    name: day.name || template.name || "Program Session",
                                    exercises: (day.exercises || []).map(cloneExercise)
                                });
                            }
                        });
                    }
                });
            } else if (template.exercises && Array.isArray(template.exercises)) {
                // Apply single workout to first day of active week by default if using Menu
                const newSession = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: template.name || "Template Session",
                    exercises: template.exercises.map(cloneExercise)
                };
                newWeeks[activeWeekIndex][0].sessions.push(newSession);
                console.log("[MENU] Applied single workout to day 0 of active week.");
            }
        });
        setShowTemplateMenu(false);
    };



    // ==================== BULK ADJUSTMENTS ====================
    const toggleExerciseSelection = (e, exId) => {
        e.stopPropagation();
        const newSel = new Set(selectedExIds);
        if (newSel.has(exId)) newSel.delete(exId);
        else newSel.add(exId);
        setSelectedExIds(newSel);
    };

    const applyBulkAdjustment = (type, value) => {
        if (selectedExIds.size === 0) return;
        modifyWeeks(newWeeks => {
            newWeeks[activeWeekIndex].forEach(day => {
                day.sessions.forEach(session => {
                    session.exercises.forEach(ex => {
                        if (selectedExIds.has(ex.id) && ex.sets && ex.sets[0]) {
                            const set = ex.sets[0];
                            if (type === 'rpe') set.targetRpe = (parseFloat(set.targetRpe || 0) + value).toFixed(1);
                            if (type === 'weight') {
                                const currentWeight = parseFloat(set.weight || 0);
                                set.weight = (currentWeight * value).toFixed(1);
                            }
                        }
                    });
                });
            });
        });
    };

    const bulkDelete = () => {
        if (selectedExIds.size === 0) return;
        modifyWeeks(newWeeks => {
            newWeeks[activeWeekIndex].forEach(day => {
                day.sessions.forEach(session => {
                    session.exercises = session.exercises.filter(ex => !selectedExIds.has(ex.id));
                });
            });
        });
        setSelectedExIds(new Set());
    };

    // ==================== EXERCISE MENU ====================
    const [menuOpenExId, setMenuOpenExId] = useState(null);

    const duplicateExercise = (dayIdx, sessionIdx, exIdx) => {
        modifyWeeks(newWeeks => {
            const ex = newWeeks[activeWeekIndex][dayIdx].sessions[sessionIdx].exercises[exIdx];
            const clone = copyData(ex);
            clone.id = Math.random().toString();
            newWeeks[activeWeekIndex][dayIdx].sessions[sessionIdx].exercises.splice(exIdx + 1, 0, clone);
        });
        setMenuOpenExId(null);
    };

    const deleteExercise = (dayIdx, sessionIdx, exIdx) => {
        modifyWeeks(newWeeks => {
            newWeeks[activeWeekIndex][dayIdx].sessions[sessionIdx].exercises.splice(exIdx, 1);
        });
        setMenuOpenExId(null);
    };

    const copyExerciseToDay = (sourceDayIdx, sessionIdx, exIdx, targetDayIdx) => {
        modifyWeeks(newWeeks => {
            const ex = newWeeks[activeWeekIndex][sourceDayIdx].sessions[sessionIdx].exercises[exIdx];
            const clone = copyData(ex);
            clone.id = Math.random().toString();
            
            const targetSessions = newWeeks[activeWeekIndex][targetDayIdx].sessions;
            if (targetSessions.length === 0) {
                 targetSessions.push({ id: Math.random().toString(), name: 'Main Session', exercises: [clone] });
            } else {
                 targetSessions[0].exercises.push(clone);
            }
        });
        setMenuOpenExId(null);
    };

    const moveExerciseToWeek = (dayIdx, sessionIdx, exIdx, targetWeekIdx) => {
        if (targetWeekIdx < 0 || targetWeekIdx >= weeks.length) return;
        modifyWeeks(newWeeks => {
            const ex = newWeeks[activeWeekIndex][dayIdx].sessions[sessionIdx].exercises[exIdx];
            const clone = copyData(ex);
            clone.id = Math.random().toString();
            
            newWeeks[activeWeekIndex][dayIdx].sessions[sessionIdx].exercises.splice(exIdx, 1); // remove

            const targetSessions = newWeeks[targetWeekIdx][dayIdx].sessions;
            if (targetSessions.length === 0) {
                 targetSessions.push({ id: Math.random().toString(), name: 'Main Session', exercises: [clone] });
            } else {
                 targetSessions[0].exercises.push(clone);
            }
        });
        setMenuOpenExId(null);
    };

    useEffect(() => {
        const handleClickOutside = () => setMenuOpenExId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    if (loading) return <div className="card">Loading SPRINT Engine...</div>;

    return (
        <div className="pro-layout animate-in">
            {/* STICKY TOOLBAR */}
            <div className="pro-toolbar glass-card" style={{ padding: '0.75rem 1.5rem', borderRadius: '0', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textShadow: '0 0 10px var(--primary-glow)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.1em' }}>SPRINT PROGRAMMER v2.0</h2>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ATHLETE: {athlete?.email}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Undo */}
                    <button className="btn" style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem' }} onClick={undo} disabled={history.length === 0}>
                        ↩ Undo
                    </button>

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
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary" style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem' }} onClick={copyWeekForward}>COPY W{activeWeekIndex+1}</button>
                        <button className="btn btn-secondary" style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem' }} onClick={applyWeekForward}>APPLY FWD</button>
                    </div>

                    {/* Bulk Tools */}
                    {selectedExIds.size > 0 && (
                        <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                            <span style={{fontSize: '0.7rem', alignSelf: 'center', color: 'var(--primary)'}}>{selectedExIds.size} Selected</span>
                            <button className="btn" style={{ minHeight: '32px', fontSize: '0.7rem', padding: '4px 8px' }} onClick={() => applyBulkAdjustment('weight', 1.05)}>+5% Load</button>
                            <button className="btn" style={{ minHeight: '32px', fontSize: '0.7rem', padding: '4px 8px' }} onClick={() => applyBulkAdjustment('weight', 0.95)}>-5% Load</button>
                            <button className="btn" style={{ minHeight: '32px', fontSize: '0.7rem', padding: '4px 8px' }} onClick={() => applyBulkAdjustment('rpe', 0.5)}>+.5 RPE</button>
                            <button className="btn" style={{ minHeight: '32px', fontSize: '0.7rem', padding: '4px 8px' }} onClick={() => applyBulkAdjustment('rpe', -0.5)}>-.5 RPE</button>
                            <button className="btn" style={{ minHeight: '32px', fontSize: '0.7rem', padding: '4px 8px', color: 'var(--accent-error)', borderColor: 'var(--accent-error)' }} onClick={bulkDelete}>Del</button>
                        </div>
                    )}

                    {/* Templates */}
                    <div style={{ position: 'relative' }}>
                        <button className="btn" style={{ minHeight: '32px', fontSize: '0.75rem' }} onClick={() => setShowTemplateMenu(!showTemplateMenu)}>
                            📁 Temp
                        </button>
                        {showTemplateMenu && (
                            <div className="glass-card" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1001, width: '250px', marginTop: '0.5rem', padding: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem' }}>Apply Template to W{activeWeekIndex+1}</h4>
                                {templates.map(t => (
                                    <button 
                                        key={t.id} 
                                        className="btn" 
                                        style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.5rem', marginBottom: '4px', cursor: 'grab' }}
                                        draggable
                                        onDragStart={(e) => onTemplateDragStart(e, t)}
                                        onClick={() => applyTemplate(t)}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ paddingLeft: '10px', borderLeft: '1px solid #444', minWidth: '80px', textAlign: 'center' }}>
                         {isSyncing ? <span style={{ fontSize: '0.75rem', color: 'var(--primary)', animation: 'pulse 1s infinite' }}>⚡ Syncing</span> : <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)' }}>✓ Saved</span>}
                    </div>
                </div>
            </div>

            {/* WEEKLY GRID */}
            <div className="pro-week-grid">
                {DAYS.map((dayName, dayIdx) => (
                    <div 
                        key={dayName} 
                        className="pro-day-col"
                        onDragOver={(e) => onDragOver(e, dayIdx)}
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
                        
                        {weeks[activeWeekIndex] && weeks[activeWeekIndex][dayIdx].sessions.map((session, sIdx) => {
                            const isDragOverSession = dragOverInfo && dragOverInfo.dayIdx === dayIdx && dragOverInfo.sessionIdx === sIdx;
                            return (
                            <div 
                                key={session.id} 
                                className={`pro-session-card animate-in ${isDragOverSession ? 'drop-zone' : ''}`}
                                onDragOver={(e) => { e.stopPropagation(); onDragOver(e, dayIdx, sIdx); }}
                                onDragLeave={onDragLeave}
                                onDrop={(e) => { e.stopPropagation(); onDrop(e, dayIdx, sIdx); }}
                                style={{
                                    border: isDragOverSession ? '2px dashed var(--primary)' : '1px solid var(--border-glass)',
                                    background: isDragOverSession ? 'rgba(251, 191, 36, 0.1)' : 'rgba(24, 24, 27, 0.95)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <input 
                                        className="pro-input" 
                                        style={{ fontWeight: 800, textAlign: 'left', border: 'none', background: 'transparent', fontSize: '0.8rem', color: 'var(--primary)', flex: 1 }} 
                                        value={session.name} 
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            modifyWeeks(newWeeks => {
                                                newWeeks[activeWeekIndex][dayIdx].sessions[sIdx].name = e.target.value;
                                            });
                                        }}
                                    />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteSession(dayIdx, sIdx); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-error)', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6, padding: '4px' }}
                                        title="Delete Workout"
                                    >
                                        🗑
                                    </button>
                                </div>

                                {session.exercises.map((ex, exIdx) => (
                                    <div 
                                        key={ex.id} 
                                        className={`pro-exercise-row ${selectedExIds.has(ex.id) ? 'selected-ex' : ''}`} 
                                        draggable
                                        onDragStart={(e) => onExerciseDragStart(e, sIdx, dayIdx, exIdx, ex)}
                                        onClick={(e) => toggleExerciseSelection(e, ex.id)}
                                        style={{ 
                                            position: 'relative', 
                                            cursor: 'grab',
                                            background: selectedExIds.has(ex.id) ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                                            padding: '4px',
                                            borderRadius: '6px',
                                            border: selectedExIds.has(ex.id) ? '1px solid var(--primary)' : '1px solid transparent',
                                            transition: 'all 0.1s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input type="checkbox" checked={selectedExIds.has(ex.id)} onChange={() => {}} style={{ cursor: 'pointer', width: '14px', height: '14px' }} />
                                            <select 
                                                className="pro-input pro-input-name"
                                                value={ex.exerciseId}
                                                onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'exerciseId', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
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
                                        </div>
                                        <input className="pro-input" placeholder="S" value={ex.sets?.[0]?.sets || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'sets', e.target.value)} />
                                        <input className="pro-input" placeholder="R" value={ex.sets?.[0]?.reps || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'reps', e.target.value)} />
                                        <input className="pro-input" placeholder="@" value={ex.sets?.[0]?.targetRpe || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'targetRpe', e.target.value)} />
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input className="pro-input" placeholder="W" value={ex.sets?.[0]?.weight || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => handleInlineChange(sIdx, dayIdx, exIdx, 'weight', e.target.value)} />
                                            <div style={{ position: 'relative' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setMenuOpenExId(menuOpenExId === ex.id ? null : ex.id); }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', fontSize: '1.2rem' }}
                                                >
                                                    ⋮
                                                </button>
                                                {menuOpenExId === ex.id && (
                                                    <div className="glass-card" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, padding: '0.5rem', width: '150px', display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                                        <button className="btn" style={{ minHeight: '26px', fontSize: '0.7rem', padding: '4px', justifyContent: 'flex-start' }} onClick={() => duplicateExercise(dayIdx, sIdx, exIdx)}>📄 Duplicate</button>
                                                        
                                                        <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px' }}>Copy to:</div>
                                                        {DAYS.map((d, i) => i !== dayIdx ? <button key={d} className="btn" style={{ minHeight: '22px', fontSize: '0.65rem', padding: '2px 4px', justifyContent: 'flex-start' }} onClick={() => copyExerciseToDay(dayIdx, sIdx, exIdx, i)}>{d}</button> : null)}
                                                        
                                                        <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px' }}>Move to:</div>
                                                        {weeks.map((_, i) => i !== activeWeekIndex ? <button key={i} className="btn" style={{ minHeight: '22px', fontSize: '0.65rem', padding: '2px 4px', justifyContent: 'flex-start' }} onClick={() => moveExerciseToWeek(dayIdx, sIdx, exIdx, i)}>Week {i+1}</button> : null)}

                                                        <button className="btn" style={{ minHeight: '26px', fontSize: '0.7rem', padding: '4px', justifyContent: 'flex-start', color: 'var(--accent-error)', borderColor: 'var(--accent-error)', marginTop: '4px' }} onClick={() => deleteExercise(dayIdx, sIdx, exIdx)}>🗑 Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button 
                                    className="btn" 
                                    style={{ width: '100%', minHeight: '22px', fontSize: '0.6rem', marginTop: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #444', color: '#888' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        modifyWeeks(newWeeks => {
                                            newWeeks[activeWeekIndex][dayIdx].sessions[sIdx].exercises.push({
                                                id: Math.random().toString(),
                                                exerciseId: '',
                                                name: '',
                                                sets: [{ id: 1, reps: '', targetRpe: '', weight: '' }]
                                            });
                                        });
                                    }}
                                >
                                </button>
                                
                                <textarea 
                                    placeholder="Add session notes..."
                                    style={{ 
                                        width: '100%', 
                                        background: 'rgba(255,255,255,0.03)', 
                                        border: '1px solid var(--border-glass)', 
                                        borderRadius: '4px', 
                                        marginTop: '12px', 
                                        fontSize: '0.7rem', 
                                        color: 'var(--text-muted)', 
                                        padding: '6px',
                                        minHeight: '40px',
                                        resize: 'vertical'
                                    }}
                                    value={session.notes || ''}
                                    onChange={(e) => {
                                        modifyWeeks(newWeeks => {
                                            newWeeks[activeWeekIndex][dayIdx].sessions[sIdx].notes = e.target.value;
                                        });
                                    }}
                                />
                            </div>
                        )})}
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

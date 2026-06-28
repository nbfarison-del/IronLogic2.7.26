import { useState, useEffect } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import ProgramPlanner from '../components/ProgramPlanner';
import * as firestoreService from '../services/firestoreService';

// Browser-robust YYYY-MM-DD helper
const getDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const CalendarView = () => {
    const { unit } = useSettings();
    const { user } = useAuth();
    const {
        workouts,
        recovery: recoveryHistory,
        weights: weightHistory,
        plannedWorkouts,
        notesHistory,
        mobilityLogs,
        isLoading
    } = useData();
    const navigate = useNavigate();
    const { athleteId: paramAthleteId } = useParams();
    const location = useLocation();
    const targetUserId = paramAthleteId || user?.id;
    const isCoachViewing = paramAthleteId && paramAthleteId !== user?.id;
    const isAdmin = user?.email === 'nbfarison@gmail.com';
    
    // Permission logic: 
    // - Admin can manage anything.
    // - Coach can manage if they are viewing an athlete.
    // - Users can manage their OWN personal calendar (unless you want to restrict that too).
    const canManagePrograms = isAdmin || (user?.role === 'coach' && isCoachViewing) || (!isCoachViewing);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // External Data State (for Coach viewing)
    const [extWorkouts, setExtWorkouts] = useState([]);
    const [extPlanned, setExtPlanned] = useState([]);
    const [extRecovery, setExtRecovery] = useState([]);
    const [extWeights, setExtWeights] = useState([]);
    const [extNotes, setExtNotes] = useState([]);
    const [extMobility, setExtMobility] = useState([]);
    const [extLoading, setExtLoading] = useState(false);

    const queryParams = new URLSearchParams(location.search);
    const planParam = queryParams.get('plan');

    // UI State
    const [isPlanning, setIsPlanning] = useState(planParam === 'true');
    const [editingProgram, setEditingProgram] = useState(null);

    // Input State for Weight
    const [weightInput, setWeightInput] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [confirmingDelete, setConfirmingDelete] = useState(null);


    // Auto-open planner if coming from Home with ?plan=true
    useEffect(() => {
        if (planParam === 'true') {
            // Optional: clean up URL
            navigate(location.pathname, { replace: true });
        }
    }, [planParam, location.pathname, navigate]);


    // Fetch Athlete Data if Coach is viewing
    useEffect(() => {
        if (!isCoachViewing) return;

        let receivedSnapshots = 0;
        const markLoaded = () => {
            receivedSnapshots += 1;
            if (receivedSnapshots >= 6) setExtLoading(false);
        };
        const wrap = (setter) => (data) => {
            setter(data);
            markLoaded();
        };
        const handleError = (error) => {
            console.error('Calendar subscription error:', error);
            setExtLoading(false);
        };

        const unsubWorkouts = firestoreService.subscribeToWorkouts(targetUserId, wrap(setExtWorkouts), handleError);
        const unsubPlanned = firestoreService.subscribeToPlannedWorkouts(targetUserId, wrap(setExtPlanned), handleError);
        const unsubRecovery = firestoreService.subscribeToRecovery(targetUserId, wrap(setExtRecovery), handleError);
        const unsubWeights = firestoreService.subscribeToBodyWeight(targetUserId, wrap(setExtWeights), handleError);
        const unsubNotes = firestoreService.subscribeToCalendarNotes(targetUserId, wrap(setExtNotes), handleError);
        const unsubMobility = firestoreService.subscribeToMobilityLogs(targetUserId, wrap(setExtMobility), handleError);

        return () => {
            unsubWorkouts();
            unsubPlanned();
            unsubRecovery();
            unsubWeights();
            unsubNotes();
            unsubMobility();
        };
    }, [targetUserId, isCoachViewing]);

    // Effective Data based on role
    const effectiveWorkouts = isCoachViewing ? extWorkouts : workouts;
    const effectivePlanned = isCoachViewing ? extPlanned : plannedWorkouts;
    const effectiveRecovery = isCoachViewing ? extRecovery : recoveryHistory;
    const effectiveWeights = isCoachViewing ? extWeights : weightHistory;
    const effectiveNotes = isCoachViewing ? extNotes : notesHistory;
    const effectiveMobility = isCoachViewing ? extMobility : mobilityLogs;

    // Sync Weight and Note Input
    useEffect(() => {
        const dateStr = getDateStr(selectedDate);
        const weightEntry = effectiveWeights.find(w => w.date === dateStr);
        setWeightInput(weightEntry ? weightEntry.weight : '');

        const noteEntry = effectiveNotes.find(n => n.date === dateStr);
        setNoteInput(noteEntry ? noteEntry.text : '');
    }, [selectedDate, effectiveWeights, effectiveNotes, isCoachViewing]);

    const saveWeight = async (e) => {
        e.preventDefault();
        if (!user || isCoachViewing) return;
        const dateStr = getDateStr(selectedDate);
        const newEntry = { date: dateStr, weight: parseFloat(weightInput) };

        try {
            const existingEntry = effectiveWeights.find(w => w.date === dateStr);
            if (existingEntry) {
                await firestoreService.updateBodyWeight(targetUserId, existingEntry.id, newEntry);
            } else if (weightInput) {
                await firestoreService.addBodyWeight(targetUserId, newEntry);
            }
        } catch (error) {
            console.error('Error saving weight:', error);
        }
    };

    const saveNote = async (e) => {
        e.preventDefault();
        if (!user || isCoachViewing) return;
        const dateStr = getDateStr(selectedDate);

        try {
            const existingEntry = effectiveNotes.find(n => n.date === dateStr);
            if (existingEntry) {
                if (noteInput.trim()) {
                    await firestoreService.updateCalendarNote(targetUserId, existingEntry.id, { text: noteInput });
                } else {
                    await firestoreService.deleteCalendarNote(targetUserId, existingEntry.id);
                }
            } else if (noteInput.trim()) {
                const newNote = { date: dateStr, text: noteInput };
                await firestoreService.addCalendarNote(targetUserId, newNote);
            }
        } catch (error) {
            console.error('Error saving note:', error);
        }
    };

    const savePlannedWorkout = async (program) => {
        if (!user) return;
        try {
            if (editingProgram) {
                await firestoreService.updatePlannedWorkout(targetUserId, program.id, program);
            } else {
                await firestoreService.addPlannedWorkout(targetUserId, program);
            }
            setIsPlanning(false);
            setEditingProgram(null);
        } catch (error) {
            console.error('Error saving planned workout:', error);
        }
    };

    const deletePlannedWorkout = async (id) => {
        if (confirmingDelete !== id) {
            setConfirmingDelete(id);
            setTimeout(() => setConfirmingDelete(null), 3000);
            return;
        }
        
        try {
            await firestoreService.deletePlannedWorkout(targetUserId, id);
            setConfirmingDelete(null);
        } catch (error) {
            console.error('Error deleting planned workout:', error);
        }
    };


    const startWorkout = (program) => {
        navigate('/log', { state: { plannedWorkout: program } });
    };

    // Calendar Helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const renderCalendarDays = () => {
        const totalDays = getDaysInMonth(currentDate);
        const startDay = getFirstDayOfMonth(currentDate);
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
            const dateStr = getDateStr(date);

            const hasWorkout = effectiveWorkouts.some(w => w.date?.startsWith(dateStr));
            const hasPlanned = effectivePlanned.some(p => p.date?.startsWith(dateStr));
            const recoveryEntry = effectiveRecovery.find(r => r.date?.startsWith(dateStr));
            const hasWeight = effectiveWeights.some(w => w.date?.startsWith(dateStr));
            const hasNote = effectiveNotes.some(n => n.date?.startsWith(dateStr));
            const hasMobility = effectiveMobility.some(m => m.date?.startsWith(dateStr));

            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());

            days.push(
                <div
                    key={d}
                    className={`calendar-day ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(date)}
                    style={{
                        border: isSelected ? '2px solid var(--primary)' : '1px solid #444',
                        background: isToday ? 'rgba(100, 108, 255, 0.1)' : '#1a1a1a',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        minHeight: '60px',
                        position: 'relative'
                    }}
                >
                    <div style={{ fontWeight: 'bold' }}>{d}</div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {hasWorkout && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} title="Workout Logged"></div>}
                        {hasPlanned && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2196f3' }} title="Program Planned"></div>}
                        {recoveryEntry && (
                            <div style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: recoveryEntry.score >= 8 ? '#4caf50' : recoveryEntry.score >= 5 ? '#ff9800' : '#f44336'
                            }} title={`Recovery: ${recoveryEntry.score}`}></div>
                        )}
                        {hasWeight && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9c27b0' }} title="Weight Logged"></div>}
                        {hasNote && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffeb3b' }} title="Note Added"></div>}
                        {hasMobility && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9c27b0', border: '1px solid white' }} title="Mobility Logged"></div>}
                    </div>
                </div>
            );
        }
        return days;
    };

    if (isLoading || extLoading) {
        return <div className="card">Syncing calendar...</div>;
    }

    if (isPlanning) {
        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
                <ProgramPlanner
                    date={selectedDate}
                    onSave={savePlannedWorkout}
                    onCancel={() => { setIsPlanning(false); setEditingProgram(null); }}
                    initialData={editingProgram}
                />
            </div>
        );
    }

    const selectedDateStr = getDateStr(selectedDate);
    const dayWorkouts = effectiveWorkouts.filter(w => w.date?.startsWith(selectedDateStr));
    
    // Deduplicate planned workouts for the day to avoid "excessive population"
    const rawDayPlanned = effectivePlanned.filter(p => p.date === selectedDateStr);
    const dayPlanned = Array.from(new Map(rawDayPlanned.map(p => [p.name || p.planName, p])).values());

    const dayRecovery = effectiveRecovery.find(r => r.date === selectedDateStr);

    const dayMobility = effectiveMobility.filter(m => m.date === selectedDateStr);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>{isCoachViewing ? `Athlete Calendar` : 'Calendar Tracking'}</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {!isCoachViewing && (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                const planned = effectivePlanned.find(p => p.date === selectedDateStr);
                                if (planned) {
                                    startWorkout(planned);
                                } else {
                                    navigate('/log');
                                }
                            }}
                        >
                            Log Workout
                        </button>
                    )}
                    {canManagePrograms && (
                        <button 
                            className="btn btn-primary" 
                            style={{ background: 'linear-gradient(135deg, #1565c0, #0288d1)', border: 'none' }}
                            onClick={() => setIsPlanning(true)}
                        >
                            {isCoachViewing ? 'Assign Athlete Program' : '+ Plan Workout'}
                        </button>
                    )}
                    {!isCoachViewing && (
                        <Link to="/peaking" className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                            Peaking
                        </Link>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>
                <div className="card calendar-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <button className="btn" onClick={() => changeMonth(-1)}>&lt;</button>
                        <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <button className="btn" onClick={() => changeMonth(1)}>&gt;</button>
                    </div>

                    <div className="calendar-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '1px',
                        background: '#333',
                        border: '1px solid #333'
                    }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} style={{ padding: '0.5rem', textAlign: 'center', background: '#222', fontWeight: 'bold' }}>{day}</div>
                        ))}
                        {renderCalendarDays()}
                    </div>
                </div>

                <div className="card">
                    <h2>Details for {selectedDate.toLocaleDateString()}</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h3>Workouts</h3>
                            {dayWorkouts.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {dayWorkouts.map((w, i) => (
                                        <div key={i} style={{ padding: '0.5rem', background: '#222', borderRadius: '4px' }}>
                                            {w.exerciseName}: {w.weight}{unit} x {w.reps}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No workouts logged.</p>
                            )}

                            <h3 style={{ marginTop: '1.5rem' }}>Planned Sessions</h3>
                            {dayPlanned.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {dayPlanned.map((p, i) => (
                                        <div key={i} style={{ padding: '0.5rem', background: '#222', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{p.planName || p.name || 'Unnamed Plan'}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => startWorkout(p)}>Start</button>
                                                <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => { setEditingProgram(p); setIsPlanning(true); }}>Edit</button>
                                                <button 
                                                    className="btn" 
                                                    style={{ 
                                                        padding: '0.2rem 0.5rem', 
                                                        fontSize: '0.8rem', 
                                                        background: confirmingDelete === p.id ? 'var(--accent-error)' : '#333',
                                                        color: confirmingDelete === p.id ? '#fff' : 'inherit',
                                                        transition: 'all 0.2s'
                                                    }} 
                                                    onClick={() => deletePlannedWorkout(p.id)}
                                                >
                                                    {confirmingDelete === p.id ? 'Confirm?' : 'Delete'}
                                                </button>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No programs planned.</p>
                            )}
                        </div>

                        <div style={{ borderLeft: '1px solid #333', paddingLeft: '2rem' }}>
                            <h3>Body Metrics</h3>
                            <form onSubmit={saveWeight} style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.8rem' }}>Body Weight ({unit})</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={weightInput}
                                        onChange={(e) => setWeightInput(e.target.value)}
                                        style={{ flex: 1, padding: '0.5rem' }}
                                    />
                                    <button type="submit" className="btn btn-primary">Save</button>
                                </div>
                            </form>

                            {dayRecovery && (
                                <div style={{ padding: '1rem', background: '#222', borderRadius: '8px', borderLeft: `4px solid ${dayRecovery.score >= 8 ? '#4caf50' : dayRecovery.score >= 5 ? '#ff9800' : '#f44336'}` }}>
                                    <div style={{ fontWeight: 'bold' }}>Recovery Score: {dayRecovery.score}/10</div>
                                </div>
                            )}

                            {dayMobility.length > 0 && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: '#222', borderRadius: '8px', borderLeft: '4px solid #9c27b0' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Mobility</div>
                                    {dayMobility.map(entry => (
                                        <div key={entry.id} style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                            {entry.pathName || entry.name || 'Mobility session'}{entry.duration ? ` - ${entry.duration} min` : ''}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <h3 style={{ marginTop: '1.5rem' }}>Notes</h3>
                            <form onSubmit={saveNote}>
                                <textarea
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    placeholder="Add notes for this day..."
                                    style={{ width: '100%', height: '80px', padding: '0.5rem', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                                />
                                <button type="submit" className="btn" style={{ marginTop: '0.5rem', width: '100%' }}>Save Note</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;

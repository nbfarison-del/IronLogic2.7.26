import { useData } from '../context/DataContext';

const CalendarView = () => {
    const { unit } = useSettings();
    const { user } = useAuth();
    const {
        workouts,
        weights: weightHistory,
        recovery: recoveryHistory,
        goals,
        isLoading: loading
    } = useData();

    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Local state for non-streamed items (planned, notes)
    const [plannedWorkouts, setPlannedWorkouts] = useState([]);
    const [notesHistory, setNotesHistory] = useState([]);

    // UI State
    const [isPlanning, setIsPlanning] = useState(false);
    const [editingProgram, setEditingProgram] = useState(null);

    // Input State for Weight
    const [weightInput, setWeightInput] = useState('');
    const [noteInput, setNoteInput] = useState('');

    // Load Data for non-streamed items when month changes
    useEffect(() => {
        const loadMonthData = async () => {
            if (!user) return;
            try {
                const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

                const startRange = new Date(firstDay);
                startRange.setDate(startRange.getDate() - 7);
                const endRange = new Date(lastDay);
                endRange.setDate(endRange.getDate() + 7);

                const startStr = startRange.toISOString().split('T')[0];
                const endStr = endRange.toISOString().split('T')[0];

                const [fetchedPlanned, fetchedNotes] = await Promise.all([
                    firestoreService.getPlannedWorkouts(user.id), // Planned workouts are usually few, can fetch all
                    firestoreService.getCalendarNotes(user.id)
                ]);

                setPlannedWorkouts(fetchedPlanned);
                setNotesHistory(fetchedNotes);
            } catch (error) {
                console.error('Error loading calendar extra data:', error);
            }
        };

        loadMonthData();
    }, [user, currentDate]);

    // Sync Weight and Note Input when selected date changes
    useEffect(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];

        const weightEntry = weightHistory.find(w => w.date === dateStr);
        setWeightInput(weightEntry ? weightEntry.weight : '');

        const noteEntry = notesHistory.find(n => n.date === dateStr);
        setNoteInput(noteEntry ? noteEntry.text : '');
    }, [selectedDate, weightHistory, notesHistory]);

    const saveWeight = async (e) => {
        e.preventDefault();
        if (!user) return;
        const dateStr = selectedDate.toISOString().split('T')[0];
        const newEntry = { date: dateStr, weight: parseFloat(weightInput) };

        try {
            const existingEntry = weightHistory.find(w => w.date === dateStr);
            if (existingEntry) {
                await firestoreService.updateBodyWeight(user.id, existingEntry.id, newEntry);
                setWeightHistory(weightHistory.map(w => w.id === existingEntry.id ? { ...newEntry, id: existingEntry.id } : w));
            } else if (weightInput) {
                const newId = await firestoreService.addBodyWeight(user.id, newEntry);
                setWeightHistory([...weightHistory, { ...newEntry, id: newId }]);
            }
        } catch (error) {
            console.error('Error saving weight:', error);
        }
    };

    const saveNote = async (e) => {
        e.preventDefault();
        if (!user) return;
        const dateStr = selectedDate.toISOString().split('T')[0];

        try {
            const existingEntry = notesHistory.find(n => n.date === dateStr);
            if (existingEntry) {
                if (noteInput.trim()) {
                    await firestoreService.updateCalendarNote(user.id, existingEntry.id, { text: noteInput });
                    setNotesHistory(notesHistory.map(n => n.id === existingEntry.id ? { ...n, text: noteInput } : n));
                } else {
                    // Delete if empty
                    await firestoreService.deleteCalendarNote(user.id, existingEntry.id);
                    setNotesHistory(notesHistory.filter(n => n.id !== existingEntry.id));
                }
            } else if (noteInput.trim()) {
                const newNote = { date: dateStr, text: noteInput };
                const newId = await firestoreService.addCalendarNote(user.id, newNote);
                setNotesHistory([...notesHistory, { ...newNote, id: newId }]);
            }
        } catch (error) {
            console.error('Error saving note:', error);
        }
    };

    const savePlannedWorkout = async (program) => {
        if (!user) return;
        try {
            if (editingProgram) {
                await firestoreService.updatePlannedWorkout(user.id, program.id, program);
                setPlannedWorkouts(plannedWorkouts.map(p => p.id === program.id ? program : p));
            } else {
                const newId = await firestoreService.addPlannedWorkout(user.id, program);
                setPlannedWorkouts([...plannedWorkouts, { ...program, id: newId }]);
            }
            setIsPlanning(false);
            setEditingProgram(null);
        } catch (error) {
            console.error('Error saving planned workout:', error);
        }
    };

    const deletePlannedWorkout = async (id) => {
        if (!user || !confirm('Are you sure you want to delete this planned workout?')) return;
        try {
            await firestoreService.deletePlannedWorkout(user.id, id);
            setPlannedWorkouts(plannedWorkouts.filter(p => p.id !== id));
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

        // Empty cells for offset
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Days
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
            const dateStr = date.toISOString().split('T')[0];

            // Indicators
            const hasWorkout = workouts.some(w => w.date.startsWith(dateStr));
            const hasPlanned = plannedWorkouts.some(p => p.date === dateStr);
            const recoveryEntry = recoveryHistory.find(r => r.date === dateStr);
            const hasWeight = weightHistory.some(w => w.date === dateStr);
            const hasNote = notesHistory.some(n => n.date === dateStr);

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
                    </div>
                </div>
            );
        }
        return days;
    };

    // Get Data for Selected Day
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const dayWorkouts = workouts.filter(w => w.date.startsWith(selectedDateStr));
    const dayPlanned = plannedWorkouts.filter(p => p.date === selectedDateStr);
    const dayRecovery = recoveryHistory.find(r => r.date === selectedDateStr);

    if (loading) {
        return <div>Loading calendar...</div>;
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

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Calendar Tracking</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/log')}>Log Workout</button>
                    <button className="btn" onClick={() => setIsPlanning(true)}>+ Plan Program</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>

                {/* Calendar Section */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <button className="btn" onClick={() => changeMonth(-1)}>&lt; Prev</button>
                        <h2 style={{ margin: 0 }}>
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button className="btn" onClick={() => changeMonth(1)}>Next &gt;</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} style={{ fontWeight: 'bold', color: '#888' }}>{day}</div>
                        ))}
                        {renderCalendarDays()}
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#aaa', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div> Logged
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2196f3' }}></div> Planned
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4caf50' }}></div> Recovery
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9c27b0' }}></div> Body Weight
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffeb3b' }}></div> Note
                        </div>
                    </div>
                </div>

                {/* Selected Day Detail Section */}
                <div className="card">
                    <div style={{ borderBottom: '1px solid #444', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0 }}>
                            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/log')} style={{ fontSize: '0.8rem' }}>Log Workout Here</button>
                            <button className="btn" onClick={() => setIsPlanning(true)} style={{ fontSize: '0.8rem' }}>Plan Workout Here</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

                        {/* 1. Planned Programs */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📅 Planned Program</h3>
                            {dayPlanned.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {dayPlanned.map(p => (
                                        <div key={p.id} style={{ padding: '1rem', background: '#222', borderRadius: '8px', borderLeft: '4px solid #2196f3' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, color: '#2196f3' }}>{p.name}</h4>
                                                    <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '0.2rem' }}>
                                                        {p.exercises.length} Exercises scheduled
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => startWorkout(p)}>Start Now</button>
                                                    <button className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => { setEditingProgram(p); setIsPlanning(true); }}>Edit</button>
                                                    <button className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#f44336' }} onClick={() => deletePlannedWorkout(p.id)}>Delete</button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
                                                {p.exercises.map((ex, i) => (
                                                    <div key={i} style={{ fontSize: '0.9rem', color: '#ccc', background: '#1a1a1a', padding: '0.5rem', borderRadius: '4px' }}>
                                                        <strong>{ex.exerciseName}</strong>: {ex.sets.length} sets
                                                        {ex.notes && <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#888' }}>{ex.notes}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No programs planned for this day.</p>
                            )}
                        </div>

                        {/* 2. Workouts Done */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <h3>🏋️ Logged Workouts</h3>
                            {dayWorkouts.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {dayWorkouts.map(w => (
                                        <div key={w.id} style={{ padding: '0.8rem', background: '#222', borderRadius: '6px', borderLeft: '4px solid var(--primary)' }}>
                                            <strong>{w.exerciseName}</strong>
                                            <span style={{ color: '#ccc', marginLeft: '0.5rem' }}>
                                                {w.type === 'strength'
                                                    ? `${w.weight} ${unit} x ${w.sets} x ${w.reps}`
                                                    : `${w.duration} mins`}
                                            </span>
                                            {w.estimated1RM && <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'gold', border: '1px solid #444', padding: '2px 4px' }}>e1RM: {w.estimated1RM}</span>}
                                            {w.notes && <div style={{ fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic', marginTop: '0.2rem' }}>{w.notes}</div>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No workouts logged for this day.</p>
                            )}
                        </div>

                        {/* 3. Body Weight Entry */}
                        <div>
                            <h3>⚖️ Body Weight</h3>
                            <form onSubmit={saveWeight} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder={`Weight in ${unit}`}
                                    value={weightInput}
                                    onChange={(e) => setWeightInput(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn btn-primary">Save</button>
                            </form>
                        </div>

                        {/* 4. Daily Notes */}
                        <div>
                            <h3>📝 Daily Notes</h3>
                            <form onSubmit={saveNote} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="Add a note for this day..."
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn">Save</button>
                            </form>
                        </div>

                        {/* 5. Recovery Score */}
                        <div>
                            <h3>🔋 Recovery</h3>
                            {dayRecovery ? (
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    color: dayRecovery.score >= 8 ? '#4caf50' : dayRecovery.score >= 5 ? '#ff9800' : '#f44336'
                                }}>
                                    {dayRecovery.score}/10
                                </div>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No recovery score logged.</p>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;

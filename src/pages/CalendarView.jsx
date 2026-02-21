import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import ProgramPlanner from '../components/ProgramPlanner';
import * as firestoreService from '../services/firestoreService';

const CalendarView = () => {
    const { unit } = useSettings();
    const { user } = useAuth();
    const {
        workouts,
        recovery: recoveryHistory,
        weights: weightHistory,
        plannedWorkouts,
        notesHistory,
        isLoading
    } = useData();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // UI State
    const [isPlanning, setIsPlanning] = useState(false);
    const [editingProgram, setEditingProgram] = useState(null);

    // Input State for Weight
    const [weightInput, setWeightInput] = useState('');
    const [noteInput, setNoteInput] = useState('');

    // Browser-robust YYYY-MM-DD helper
    const getDateStr = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Sync Weight and Note Input when selected date changes
    useEffect(() => {
        const dateStr = getDateStr(selectedDate);

        const weightEntry = weightHistory.find(w => w.date === dateStr);
        setWeightInput(weightEntry ? weightEntry.weight : '');

        const noteEntry = notesHistory.find(n => n.date === dateStr);
        setNoteInput(noteEntry ? noteEntry.text : '');
    }, [selectedDate, weightHistory, notesHistory]);

    const saveWeight = async (e) => {
        e.preventDefault();
        if (!user) return;
        const dateStr = getDateStr(selectedDate);
        const newEntry = { date: dateStr, weight: parseFloat(weightInput) };

        try {
            const existingEntry = weightHistory.find(w => w.date === dateStr);
            if (existingEntry) {
                await firestoreService.updateBodyWeight(user.id, existingEntry.id, newEntry);
            } else if (weightInput) {
                await firestoreService.addBodyWeight(user.id, newEntry);
            }
        } catch (error) {
            console.error('Error saving weight:', error);
        }
    };

    const saveNote = async (e) => {
        e.preventDefault();
        if (!user) return;
        const dateStr = getDateStr(selectedDate);

        try {
            const existingEntry = notesHistory.find(n => n.date === dateStr);
            if (existingEntry) {
                if (noteInput.trim()) {
                    await firestoreService.updateCalendarNote(user.id, existingEntry.id, { text: noteInput });
                } else {
                    await firestoreService.deleteCalendarNote(user.id, existingEntry.id);
                }
            } else if (noteInput.trim()) {
                const newNote = { date: dateStr, text: noteInput };
                await firestoreService.addCalendarNote(user.id, newNote);
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
            } else {
                await firestoreService.addPlannedWorkout(user.id, program);
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

            const hasWorkout = workouts.some(w => w.date.startsWith(dateStr));
            const hasPlanned = plannedWorkouts.some(p => p.date.startsWith(dateStr));
            const recoveryEntry = recoveryHistory.find(r => r.date.startsWith(dateStr));
            const hasWeight = weightHistory.some(w => w.date.startsWith(dateStr));
            const hasNote = notesHistory.some(n => n.date.startsWith(dateStr));

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

    if (isLoading) {
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
    const dayWorkouts = workouts.filter(w => w.date.startsWith(selectedDateStr));
    const dayPlanned = plannedWorkouts.filter(p => p.date === selectedDateStr);
    const dayRecovery = recoveryHistory.find(r => r.date === selectedDateStr);

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
                                            <span>{p.planName}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => startWorkout(p)}>Start</button>
                                                <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => { setEditingProgram(p); setIsPlanning(true); }}>Edit</button>
                                                <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#f44336' }} onClick={() => deletePlannedWorkout(p.id)}>Delete</button>
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

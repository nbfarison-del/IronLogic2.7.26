import { useState, useEffect } from 'react';
import { generateStrengthBlock, analyzeTrends } from '../services/GeminiService';
import { getWorkouts, getPlannedWorkouts, assignProgramToAthlete } from '../services/firestoreService';
import { validateProgram } from '../utils/programValidation';

const AISuggestionModal = ({ athlete, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [trendAnalysis, setTrendAnalysis] = useState('');
    const [generatedProgram, setGeneratedProgram] = useState(null);
    const [goal, setGoal] = useState('Strength');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('idle'); // idle, analyzing, generating, applying

    useEffect(() => {
        if (athlete) {
            handleAnalyze();
        }
    }, [athlete]);

    const handleAnalyze = async () => {
        setStatus('analyzing');
        setLoading(true);
        try {
            const [workouts, planned] = await Promise.all([
                getWorkouts(athlete.id, 20),
                getPlannedWorkouts(athlete.id)
            ]);
            const analysis = await analyzeTrends({ workouts, planned });
            setTrendAnalysis(analysis);
        } catch (error) {
            console.error('Error analyzing trends:', error);
            setTrendAnalysis('Failed to analyze trends. Please try again.');
        } finally {
            setLoading(false);
            setStatus('idle');
        }
    };

    const handleGenerateProgram = async () => {
        setStatus('generating');
        setLoading(true);
        try {
            const [workouts, planned] = await Promise.all([
                getWorkouts(athlete.id, 20),
                getPlannedWorkouts(athlete.id)
            ]);
            const program = await generateStrengthBlock({ workouts, planned }, goal);
            const validation = validateProgram(program);
            if (!validation.isValid) {
                alert(`Generated program needs review before assignment:\n\n${validation.errors.slice(0, 5).join('\n')}`);
                setGeneratedProgram(null);
                return;
            }
            setGeneratedProgram(program);
        } catch (error) {
            console.error('Error generating program:', error);
            alert('Failed to generate program.');
        } finally {
            setLoading(false);
            setStatus('idle');
        }
    };

    const handleApplyProgram = async () => {
        if (!generatedProgram || !startDate) return;
        const validation = validateProgram(generatedProgram);
        if (!validation.isValid) {
            alert(`This program cannot be assigned yet:\n\n${validation.errors.slice(0, 8).join('\n')}`);
            return;
        }
        setStatus('applying');
        setLoading(true);
        try {
            const baseDate = new Date(startDate);

            // Loop through weeks and days to assign workouts
            const assignments = [];
            generatedProgram.weeks.forEach(week => {
                const weekOffset = (week.weekNumber - 1) * 7;
                week.days.forEach(day => {
                    const workoutDate = new Date(baseDate);
                    workoutDate.setDate(baseDate.getDate() + weekOffset + (day.dayNumber - 1));

                    const dateStr = workoutDate.toISOString().split('T')[0];
                    assignments.push(assignProgramToAthlete(athlete.id, {
                        name: `${generatedProgram.name} - W${week.weekNumber} D${day.dayNumber}`,
                        planName: generatedProgram.name,
                        date: dateStr,
                        exercises: day.exercises,
                        aiGenerated: true
                    }));
                });
            });

            await Promise.all(assignments);
            alert('Program applied successfully!');
            onClose();
        } catch (error) {
            console.error('Error applying program:', error);
            alert('Failed to apply program.');
        } finally {
            setLoading(false);
            setStatus('idle');
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.5rem' }}
                >
                    &times;
                </button>

                <h2 style={{ color: 'var(--primary)' }}>AI Coach Assistant: {athlete.email}</h2>

                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Trend Analysis</h3>
                        <button className="btn" onClick={handleAnalyze} disabled={status !== 'idle'}>
                            {status === 'analyzing' ? 'Analyzing...' : '🔄 Refresh Analysis'}
                        </button>
                    </div>
                    <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', whiteSpace: 'pre-wrap', borderLeft: '4px solid var(--primary)' }}>
                        {loading && status === 'analyzing' ? 'Consulting AI Coach...' : trendAnalysis}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                    <h3>Generate New Block</h3>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
                            <label>Focus Goal</label>
                            <select value={goal} onChange={e => setGoal(e.target.value)}>
                                <option value="Strength">Max Strength</option>
                                <option value="Hypertrophy">Hypertrophy (Volume)</option>
                                <option value="Peaking">Peaking (Intensity)</option>
                                <option value="Pivot">Pivot (Recovery)</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
                            <label>Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handleGenerateProgram} disabled={status !== 'idle'}>
                                {status === 'generating' ? 'Generating...' : '✨ Generate Block'}
                            </button>
                        </div>
                    </div>

                    {generatedProgram && (
                        <div className="card" style={{ background: '#1a1a1a', border: '1px solid #444' }}>
                            <h4 style={{ color: 'gold', marginTop: 0 }}>{generatedProgram.name}</h4>
                            <p style={{ fontSize: '0.8rem', color: '#aaa' }}>{generatedProgram.coachingNotes}</p>

                            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                                {generatedProgram.weeks.map(week => (
                                    <div key={week.weekNumber} style={{ marginBottom: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '0.2rem' }}>Week {week.weekNumber}</div>
                                        {week.days.map(day => (
                                            <div key={day.dayNumber} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                                                <span style={{ color: 'var(--primary)' }}>Day {day.dayNumber}:</span> {day.dayName}
                                                <div style={{ color: '#888', paddingLeft: '1rem' }}>
                                                    {day.exercises.map((ex, i) => (
                                                        <div key={i}>{ex.sets}x{ex.reps} @ RPE{ex.rpe} - {ex.exerciseId}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApplyProgram} disabled={status !== 'idle'}>
                                    {status === 'applying' ? 'Applying...' : '✔️ Approve & Assign to Athlete'}
                                </button>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setGeneratedProgram(null)}>
                                    Discard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AISuggestionModal;

import { useState, useEffect } from 'react';
import { calculateEstimated1RM, calculateWeightFrom1RM } from '../utils/calculator';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';

const ExerciseTools = ({ exerciseId, exerciseName, athleteId, onApplyTarget }) => {
    const { unit } = useSettings();
    const { user } = useAuth();
    const [activeTool, setActiveTool] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const [calcWeight, setCalcWeight] = useState('');
    const [calcReps, setCalcReps] = useState('');
    const [calcRpe, setCalcRpe] = useState('10');
    const [targetReps, setTargetReps] = useState('');
    const [targetRpe, setTargetRpe] = useState('8');

    useEffect(() => {
        const loadHistory = async () => {
            const historyUserId = athleteId || user?.id;
            if (activeTool === 'history' && exerciseId && historyUserId) {
                setLoading(true);
                try {
                    const allWorkouts = await firestoreService.getWorkouts(historyUserId);
                    const exerciseHistory = allWorkouts
                        .filter(w => w.exerciseId === exerciseId || (exerciseName && w.exerciseName === exerciseName))
                        .sort((a, b) => new Date(b.date) - new Date(a.date));
                    setHistory(exerciseHistory);
                } catch (error) {
                    console.error('Error loading history:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        loadHistory();
    }, [activeTool, exerciseId, exerciseName, athleteId, user]);

    const e1rm = calculateEstimated1RM(calcWeight, calcReps, calcRpe);
    const projectedWeight = calculateWeightFrom1RM(e1rm, targetReps, targetRpe);

    if (!exerciseId) return null;

    return (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className={`btn ${activeTool === 'calc' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'calc' ? null : 'calc')}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                    RPE Calculator
                </button>
                <button
                    type="button"
                    className={`btn ${activeTool === 'history' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'history' ? null : 'history')}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                    History
                </button>
            </div>

            {activeTool === 'calc' && (
                <div style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', border: '1px solid #444', marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>RPE Load Calculator</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem' }}>Known Weight</label>
                            <input type="number" value={calcWeight} onChange={e => setCalcWeight(e.target.value)} placeholder={unit} />
                        </div>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem' }}>Known Reps</label>
                            <input type="number" value={calcReps} onChange={e => setCalcReps(e.target.value)} placeholder="0" />
                        </div>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem' }}>Known RPE</label>
                            <input type="number" min="1" max="10" step="0.5" value={calcRpe} onChange={e => setCalcRpe(e.target.value)} placeholder="10" />
                        </div>
                    </div>

                    {e1rm > 0 && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#222', borderRadius: '4px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#888' }}>Estimated 1RM</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'gold' }}>{e1rm} {unit}</div>

                            <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Plan a target set</div>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="number"
                                        value={targetReps}
                                        onChange={e => setTargetReps(e.target.value)}
                                        placeholder="Reps"
                                        style={{ width: '70px', padding: '0.3rem' }}
                                    />
                                    <span>reps @</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        step="0.5"
                                        value={targetRpe}
                                        onChange={e => setTargetRpe(e.target.value)}
                                        placeholder="RPE"
                                        style={{ width: '70px', padding: '0.3rem' }}
                                    />
                                    <span>RPE</span>
                                </div>
                                {projectedWeight > 0 && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                            Target: {projectedWeight} {unit}
                                        </div>
                                        {onApplyTarget && (
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
                                                onClick={() => onApplyTarget({
                                                    weight: projectedWeight,
                                                    reps: targetReps,
                                                    targetRpe
                                                })}
                                            >
                                                Use in Plan
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTool === 'history' && (
                <div style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', border: '1px solid #444' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>{exerciseName} History</h4>
                    {loading ? (
                        <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Loading history...</p>
                    ) : history.length > 0 ? (
                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {history.map((entry, idx) => (
                                <div key={entry.id || idx} style={{ background: '#222', padding: '0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: '2px', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                            {entry.date?.includes('T') ? entry.date.split('T')[0] : entry.date}
                                        </div>
                                        {entry.estimated1RM && <span style={{ color: 'gold' }}>e1RM: {entry.estimated1RM}</span>}
                                    </div>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {entry.type === 'cardio' || entry.type === 'hyrox'
                                            ? `${entry.meters ? `${entry.meters} m` : entry.distance || '-'}${entry.duration ? ` in ${entry.duration} min` : ''}`
                                            : `${entry.weight} ${unit} x ${entry.reps} @ RPE ${entry.actualRpe || entry.targetRpe || '-'}`}
                                    </div>
                                    {entry.notes && <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>{entry.notes}</div>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>No history found for this exercise.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExerciseTools;

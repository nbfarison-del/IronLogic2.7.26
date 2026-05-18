import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as firestoreService from '../services/firestoreService';
import {
    HYROX_STATIONS,
    parseTimeToSeconds,
    formatSeconds,
    calcTotalRaceTime
} from '../data/hyroxExercises';

/**
 * HyroxTracker.jsx
 * A self-contained Hyrox race and training tracker.
 * Plugs into the existing Firestore workout collection with type: 'hyrox'.
 * Does not modify any existing pages or services.
 */

const getDateStr = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// ── Utility: parse "mm:ss" input ──────────────────────────────────────────────
const TimeInput = ({ value, onChange, placeholder = '00:00' }) => (
    <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        pattern="[0-9]{1,2}:[0-9]{2}"
        style={{
            background: '#1a1a1a', border: '1px solid #444', color: '#fff',
            padding: '0.5rem', borderRadius: '6px', width: '90px', textAlign: 'center', fontSize: '1rem'
        }}
    />
);

// ── Station Row ───────────────────────────────────────────────────────────────
const StationRow = ({ station, result, onChange, isRun }) => {
    const { metricType } = station;
    const accent = isRun ? '#2196f3' : '#646cff';

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            background: isRun ? 'rgba(33,150,243,0.05)' : 'rgba(100,108,255,0.05)',
            borderRadius: '8px',
            borderLeft: `3px solid ${accent}`,
            marginBottom: '0.5rem'
        }}>
            {/* Station Name */}
            <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{station.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{station.description}</div>
            </div>

            {/* Metric Inputs */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {(metricType === 'time' || metricType === 'weight_distance' || metricType === 'weight_reps') && (
                    <>
                        {(metricType === 'weight_distance' || metricType === 'weight_reps') && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '2px' }}>Weight (kg)</div>
                                <input
                                    type="number"
                                    value={result.weight || ''}
                                    onChange={e => onChange({ weight: e.target.value })}
                                    placeholder="0"
                                    style={{
                                        background: '#1a1a1a', border: '1px solid #444', color: '#fff',
                                        padding: '0.5rem', borderRadius: '6px', width: '72px', textAlign: 'center'
                                    }}
                                />
                            </div>
                        )}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '2px' }}>Split (mm:ss)</div>
                            <TimeInput value={result.splitTime || ''} onChange={v => onChange({ splitTime: v, splitSeconds: parseTimeToSeconds(v) })} />
                        </div>
                    </>
                )}
                {metricType === 'distance' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '2px' }}>Distance (m)</div>
                        <input
                            type="number"
                            value={result.distance || ''}
                            onChange={e => onChange({ distance: e.target.value })}
                            placeholder={station.standardDistance}
                            style={{
                                background: '#1a1a1a', border: '1px solid #444', color: '#fff',
                                padding: '0.5rem', borderRadius: '6px', width: '90px', textAlign: 'center'
                            }}
                        />
                    </div>
                )}
                {metricType === 'weight_reps' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '2px' }}>Reps</div>
                        <input
                            type="number"
                            value={result.reps || ''}
                            onChange={e => onChange({ reps: e.target.value })}
                            placeholder={station.standardReps || ''}
                            style={{
                                background: '#1a1a1a', border: '1px solid #444', color: '#fff',
                                padding: '0.5rem', borderRadius: '6px', width: '72px', textAlign: 'center'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Split time display */}
            <div style={{ minWidth: '55px', textAlign: 'right' }}>
                {result.splitSeconds > 0 && (
                    <div style={{ color: accent, fontWeight: '700', fontSize: '0.95rem' }}>
                        {formatSeconds(result.splitSeconds)}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Past Race Card ────────────────────────────────────────────────────────────
const PastRaceCard = ({ race }) => {
    const [expanded, setExpanded] = useState(false);
    const totalSec = race.totalSeconds || 0;
    return (
        <div className="card" style={{ marginBottom: '0.75rem', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: '700' }}>{race.date}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{race.division || 'Open'} · {race.notes || ''}</div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#646cff' }}>
                    {formatSeconds(totalSec)}
                </div>
            </div>
            {expanded && race.results && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                    {race.results.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.85rem', borderBottom: '1px solid #222' }}>
                            <span style={{ color: '#ccc' }}>{HYROX_STATIONS.find(s => s.id === r.id)?.name || r.id}</span>
                            <span style={{ color: '#646cff', fontWeight: '600' }}>{formatSeconds(r.splitSeconds)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const HyroxTracker = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [view, setView] = useState('log'); // 'log' | 'history'
    const [division, setDivision] = useState('Open');
    const [raceDate, setRaceDate] = useState(getDateStr(new Date()));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Build a results map keyed by station id
    const [results, setResults] = useState(() =>
        Object.fromEntries(HYROX_STATIONS.map(s => [s.id, { splitTime: '', splitSeconds: 0, weight: '', distance: '', reps: '' }]))
    );

    const totalSeconds = calcTotalRaceTime(Object.values(results));

    const updateStation = (stationId, patch) => {
        setResults(prev => ({ ...prev, [stationId]: { ...prev[stationId], ...patch } }));
    };

    // Load history on mount
    useEffect(() => {
        if (!user?.id) return;
        const load = async () => {
            try {
                const all = await firestoreService.getWorkouts(user.id, 100);
                setHistory(all.filter(w => w.type === 'hyrox').sort((a, b) => b.date.localeCompare(a.date)));
            } catch (e) {
                console.error('Hyrox history load error:', e);
            } finally {
                setLoadingHistory(false);
            }
        };
        load();
    }, [user?.id]);

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const resultsArr = HYROX_STATIONS.map(s => ({
                id: s.id,
                ...results[s.id]
            })).filter(r => r.splitSeconds > 0 || r.distance || r.reps);

            const entry = {
                date: raceDate,
                exerciseId: 'hyrox_race',
                exerciseName: 'Hyrox Race',
                category: 'Hyrox',
                type: 'hyrox',
                division,
                notes,
                results: resultsArr,
                totalSeconds,
                totalTime: formatSeconds(totalSeconds),
            };

            await firestoreService.addWorkout(user.id, entry);
            showToast('Hyrox result saved! 🏅', 'success');
            setHistory(prev => [entry, ...prev]);

            // Reset form
            setResults(Object.fromEntries(HYROX_STATIONS.map(s => [s.id, { splitTime: '', splitSeconds: 0, weight: '', distance: '', reps: '' }])));
            setNotes('');
        } catch (e) {
            console.error('Save error:', e);
            showToast('Failed to save result.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const pb = history.length > 0 ? Math.min(...history.map(h => h.totalSeconds || Infinity)) : null;

    return (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, background: 'linear-gradient(135deg, #646cff, #00bcd4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        HYROX Tracker
                    </h1>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>Race results · Split analysis · PR tracking</p>
                </div>
                {pb && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Personal Best</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#4caf50' }}>{formatSeconds(pb)}</div>
                    </div>
                )}
            </div>

            {/* Tab Nav */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['log', 'history'].map(v => (
                    <button
                        key={v}
                        className={`btn ${view === v ? 'btn-primary' : ''}`}
                        style={{ flex: 1, textTransform: 'capitalize' }}
                        onClick={() => setView(v)}
                    >
                        {v === 'log' ? '🏁 Log Race' : '📊 History'}
                    </button>
                ))}
            </div>

            {/* ── LOG VIEW ── */}
            {view === 'log' && (
                <>
                    {/* Race Meta */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label>Date</label>
                                <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)}
                                    style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '0.5rem', borderRadius: '6px' }} />
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label>Division</label>
                                <select value={division} onChange={e => setDivision(e.target.value)}
                                    style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '0.5rem', borderRadius: '6px', width: '100%' }}>
                                    <option>Open</option>
                                    <option>Pro</option>
                                    <option>Doubles</option>
                                    <option>Relay</option>
                                    <option>Simulation</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label>Notes</label>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Race location, etc."
                                    style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '0.5rem', borderRadius: '6px' }} />
                            </div>
                        </div>
                    </div>

                    {/* Total Time Banner */}
                    {totalSeconds > 0 && (
                        <div style={{
                            textAlign: 'center', padding: '1rem', marginBottom: '1rem',
                            background: 'linear-gradient(135deg, rgba(100,108,255,0.1), rgba(0,188,212,0.1))',
                            borderRadius: '12px', border: '1px solid rgba(100,108,255,0.3)'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}>Projected Total Time</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#646cff' }}>{formatSeconds(totalSeconds)}</div>
                            {pb && totalSeconds < pb && (
                                <div style={{ color: '#4caf50', fontSize: '0.85rem', fontWeight: '600' }}>🏆 PB Pace!</div>
                            )}
                        </div>
                    )}

                    {/* Station List */}
                    <div className="card">
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Race Splits</h3>
                        {HYROX_STATIONS.map(station => (
                            <StationRow
                                key={station.id}
                                station={station}
                                result={results[station.id]}
                                onChange={patch => updateStation(station.id, patch)}
                                isRun={station.id === 'hyrox_run'}
                            />
                        ))}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}
                        onClick={handleSave}
                        disabled={saving || totalSeconds === 0}
                    >
                        {saving ? 'Saving...' : '💾 Save Race Result'}
                    </button>
                </>
            )}

            {/* ── HISTORY VIEW ── */}
            {view === 'history' && (
                <>
                    {loadingHistory ? (
                        <div className="card" style={{ color: '#888' }}>Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="card" style={{ color: '#666', textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏁</div>
                            <p>No Hyrox results logged yet. Log your first race!</p>
                        </div>
                    ) : (
                        <>
                            {/* Progress Chart (simple bar) */}
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem 0' }}>Finish Time Trend</h3>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
                                    {history.slice(0, 8).reverse().map((r, i) => {
                                        const max = Math.max(...history.slice(0, 8).map(h => h.totalSeconds || 0));
                                        const pct = max > 0 ? ((r.totalSeconds || 0) / max) * 100 : 0;
                                        const isPB = r.totalSeconds === pb;
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ fontSize: '0.55rem', color: '#888' }}>{formatSeconds(r.totalSeconds)}</div>
                                                <div style={{
                                                    width: '100%', height: `${pct}%`, minHeight: '4px',
                                                    background: isPB ? '#4caf50' : '#646cff',
                                                    borderRadius: '3px 3px 0 0', transition: 'height 0.3s'
                                                }} />
                                                <div style={{ fontSize: '0.55rem', color: '#666' }}>{r.date?.slice(5)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {history.map((race, i) => <PastRaceCard key={i} race={race} />)}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default HyroxTracker;

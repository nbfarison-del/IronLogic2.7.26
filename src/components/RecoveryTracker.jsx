import React, { useState, useEffect, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';

const GOGGINS_QUOTES = {
    high: [
        "THEY DON'T KNOW ME SON!",
        "WHO'S GONNA CARRY THE BOATS?!",
        "STAY HARD!",
        "You don't stop when you're tired, you stop when you're done!",
        "Roger that!",
        "Greatness pulls mediocrity into the mud. Get out there and get dirty.",
        "No one is going to come help you. No one's coming to save you. Go get it!",
        "Be the savage, not the average!",
        "Self-talk and visualization are the keys to fighting the war within your head."
    ],
    medium: [
        "Callous your mind!",
        "It's supposed to be hard! If it wasn't hard, everyone would do it.",
        "Get comfortable being uncomfortable!",
        "Don't be soft!",
        "Taking souls!",
        "Pain unlocks a secret doorway in the mind.",
        "Make your mind your weapon.",
        "The ticket to victory often comes down to bringing your very best when you feel your worst."
    ],
    low: [
        "Merry Christmas! You taking a break?",
        "Suffer!",
        "The only easy day was yesterday.",
        "You gotta suffer to grow!",
        "Life is one big tug of war between mediocrity and trying to find your best self.",
        "Deny the pain! Feed on it!",
        "Your body is broken. Your mind can still fight!",
        "When you think that you are done, you're only 40% in into what your body's capable of doing."
    ]
};

const getRandomQuote = (score) => {
    let category = 'low';
    if (score >= 8) category = 'high';
    else if (score >= 5) category = 'medium';

    const quotes = GOGGINS_QUOTES[category];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

const RecoveryTracker = () => {
    const { user } = useAuth();
    const { recovery: history, isLoading: loading } = useData();
    const [todayScore, setTodayScore] = useState(null);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    // Inputs (0-5 scale)
    const [metrics, setMetrics] = useState({
        legSoreness: 0,
        chestSoreness: 0,
        backSoreness: 0,
        fatigue: 0,
        rhr: 60,
        sleep: 3
    });

    useEffect(() => {
        if (history.length > 0) {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const todayEntry = history.find(h => h.date.startsWith(todayStr));
            if (todayEntry) {
                setTodayScore(todayEntry.score);
                setMessage(getRandomQuote(todayEntry.score));
            } else {
                setTodayScore(null);
                setMessage('');
            }
        }
    }, [history]);


    const handleChange = (e) => {
        setMetrics({
            ...metrics,
            [e.target.name]: parseInt(e.target.value) || 0
        });
    };

    const calculateScore = async () => {
        if (!user || saving) return;

        setSaving(true);
        // ... calculation logic ...
        let rhrStress = 0;
        if (metrics.rhr <= 50) rhrStress = 0;
        else if (metrics.rhr >= 100) rhrStress = 5;
        else {
            rhrStress = (metrics.rhr - 50) / 10;
        }

        const sleepStress = 5 - metrics.sleep;
        const stressPoints =
            metrics.legSoreness +
            metrics.chestSoreness +
            metrics.backSoreness +
            metrics.fatigue +
            rhrStress +
            sleepStress;

        const minPoints = 0;
        const maxPoints = 30;
        const stressFraction = (stressPoints - minPoints) / (maxPoints - minPoints);
        let score = 10 - (stressFraction * 9);
        score = Math.round(score);

        setTodayScore(score);
        setMessage(getRandomQuote(score));

        // Optimistic UI handled by DataContext subscription
        const todayStr = new Date().toLocaleDateString('en-CA');
        const newEntry = { date: todayStr, score: score };
        const existingIdx = history.findIndex(h => h.date.startsWith(todayStr));

        try {
            if (existingIdx >= 0) {
                await firestoreService.updateRecovery(user.id, history[existingIdx].id, newEntry);
            } else {
                await firestoreService.addRecovery(user.id, newEntry);
            }
        } catch (error) {
            console.error('Error saving recovery:', error);
            setMessage('Error saving recovery data');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="card">Loading recovery data...</div>;
    }


    const getScoreColor = (score) => {
        if (score >= 8) return '#4caf50'; // Green
        if (score >= 5) return '#ff9800'; // Orange
        return '#f44336'; // Red
    };

    // Graph Rendering Helper
    const renderGraph = () => {
        if (history.length < 2) return null;

        // Get last 7 entries for cleaner display
        const data = history.slice(-7);

        const width = 300;
        const height = 100;
        const padding = 20;

        // Scales
        const minDate = 0;
        const maxDate = data.length - 1;
        const minScore = 1;
        const maxScore = 10;

        const getX = (index) => padding + (index / (maxDate || 1)) * (width - 2 * padding);
        const getY = (score) => height - padding - ((score - minScore) / (maxScore - minScore)) * (height - 2 * padding);

        const points = data.map((d, i) => `${getX(i)},${getY(d.score)}`).join(' ');

        return (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#888' }}>Recovery Trend (Last 7 Days)</h3>
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
                    {/* Grid Lines */}
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#333" strokeDasharray="4" />
                    <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#333" strokeDasharray="4" />
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#333" strokeDasharray="4" />

                    {/* The Line */}
                    <polyline
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="3"
                        points={points}
                    />

                    {/* Data Points */}
                    {data.map((d, i) => (
                        <g key={i}>
                            <circle cx={getX(i)} cy={getY(d.score)} r="4" fill={getScoreColor(d.score)} />
                            <text x={getX(i)} y={getY(d.score) - 8} textAnchor="middle" fill="#ccc" fontSize="10">{d.score}</text>
                        </g>
                    ))}
                </svg>
            </div>
        );
    };

    return (
        <div className="card" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Daily Recovery Tracker</h2>
                {todayScore !== null && (
                    <div style={{
                        background: getScoreColor(todayScore),
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '1.2rem'
                    }}>
                        Score: {todayScore}/10
                    </div>
                )}
            </div>

            {/* Show Graph if history exists */}
            {renderGraph()}

            {todayScore === null ? (
                <div style={{ marginTop: '2rem' }}>
                    <p style={{ color: '#aaa', marginBottom: '1rem' }}>Rate the following metrics to calculate readiness:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div className="input-group">
                            <label>Leg Soreness (0-5)</label>
                            <input type="range" name="legSoreness" min="0" max="5" value={metrics.legSoreness} onChange={handleChange} />
                            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{metrics.legSoreness}</div>
                        </div>
                        <div className="input-group">
                            <label>Chest Soreness (0-5)</label>
                            <input type="range" name="chestSoreness" min="0" max="5" value={metrics.chestSoreness} onChange={handleChange} />
                            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{metrics.chestSoreness}</div>
                        </div>
                        <div className="input-group">
                            <label>Back Soreness (0-5)</label>
                            <input type="range" name="backSoreness" min="0" max="5" value={metrics.backSoreness} onChange={handleChange} />
                            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{metrics.backSoreness}</div>
                        </div>
                        <div className="input-group">
                            <label>General Fatigue (0-5)</label>
                            <input type="range" name="fatigue" min="0" max="5" value={metrics.fatigue} onChange={handleChange} />
                            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{metrics.fatigue}</div>
                        </div>

                        <div className="input-group">
                            <label>Resting HR (BPM)</label>
                            <input
                                type="number"
                                name="rhr"
                                value={metrics.rhr}
                                onChange={handleChange}
                                style={{ padding: '0.5rem' }}
                            />
                        </div>

                        <div className="input-group">
                            <label>Sleep Quality (0-5)</label>
                            <input type="range" name="sleep" min="0" max="5" value={metrics.sleep} onChange={handleChange} />
                            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{metrics.sleep} (5=Great)</div>
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={calculateScore} style={{ width: '100%', marginTop: '1rem' }} disabled={saving}>
                        {saving ? 'Calculating...' : 'Calculate Recovery'}
                    </button>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 'bold', color: '#gold' }}>
                        "{message}"
                    </p>
                    <button className="btn" onClick={() => setTodayScore(null)} style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Recalculate Today</button>
                </div>
            )}
        </div>
    );
};

export default memo(RecoveryTracker);

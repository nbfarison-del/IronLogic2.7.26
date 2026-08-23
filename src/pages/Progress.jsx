import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

import { useSettings } from '../context/SettingsContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { aggregateTrendByWeek } from '../utils/trends';
import QualifyingTotals from '../components/QualifyingTotals';

const WhyRec = ({ rec, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen || false);
    return (
        <div className="card" style={{ padding: '0.85rem', background: 'rgba(var(--primary-rgb), 0.04)', borderLeft: '3px solid var(--primary)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rec.text}</div>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem 0',
                    fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    marginTop: '0.35rem'
                }}
            >
                <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9656;</span>
                {open ? 'Hide' : 'Why?'}
            </button>
            {open && (
                <div style={{ marginTop: '0.5rem', padding: '0.65rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <div><strong>DMAIC:</strong> Define {rec.dmaic?.define || 'athlete profile'} &rarr; Measure {rec.dmaic?.measure || 'readiness/recovery'} &rarr; Analyze {rec.dmaic?.analyze || 'training data'} &rarr; <strong>Improve</strong> (this recommendation) &rarr; Control (monitor outcome)</div>
                    {rec.dmaic?.evidence && <div style={{ marginTop: '0.3rem' }}><strong>Evidence:</strong> {rec.dmaic.evidence}</div>}
                    <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                        Confidence: High | Source: IronLogic DMAIC Cycle | Phase: Improve
                    </div>
                </div>
            )}
        </div>
    );
};

const numberOrZero = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const Progress = () => {
    const { workouts, isLoading } = useData();
    const { unit } = useSettings();
    const [selectedExercise, setSelectedExercise] = useState('bb_squat');

    // List of exercises the user has actually logged
    const exerciseList = useMemo(() => {
        const unique = {};
        workouts.forEach(w => {
            if (w.exerciseId && w.exerciseName) unique[w.exerciseId] = w.exerciseName;
        });
        return Object.entries(unique).map(([id, name]) => ({ id, name }));
    }, [workouts]);

    // Weekly e1RM trend for the selected exercise, limited to last 12 weeks
    const e1rmData = useMemo(() => {
        if (!selectedExercise) return [];
        const allData = workouts
            .filter(w => w.exerciseId === selectedExercise && w.estimated1RM)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const aggregated = aggregateTrendByWeek(allData);
        // Show only the last 12 weeks of data
        const recent = aggregated.slice(-12);
        return recent.map(w => ({
            date: w.date,
            weekLabel: w.weekLabel,
            e1rm: w.e1rm
        }));
    }, [workouts, selectedExercise]);

    // Summary stats for the selected exercise
    const exerciseWorkouts = useMemo(() => {
        return workouts.filter(w => w.exerciseId === selectedExercise);
    }, [workouts, selectedExercise]);

    const best1RM = useMemo(() => {
        if (!exerciseWorkouts.length) return 0;
        return Math.max(...exerciseWorkouts.map(w => numberOrZero(w.estimated1RM || w.weight)));
    }, [exerciseWorkouts]);

    const totalVolume = useMemo(() => {
        if (!exerciseWorkouts.length) return 0;
        return exerciseWorkouts.reduce((sum, w) => sum + numberOrZero(w.weight) * numberOrZero(w.reps), 0);
    }, [exerciseWorkouts]);

    const prCount = useMemo(() => {
        if (!exerciseWorkouts.length) return 0;
        const maxSoFar = [];
        let count = 0;
        const sorted = [...exerciseWorkouts].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(w => {
            const current = numberOrZero(w.estimated1RM || w.weight);
            const previousMax = maxSoFar.length ? Math.max(...maxSoFar) : 0;
            if (current > previousMax) {
                count++;
            }
            maxSoFar.push(current);
        });
        return count;
    }, [exerciseWorkouts]);

    if (isLoading) return <div className="card">Loading progress data...</div>;

    return (
        <div className="animate-in" style={{ textAlign: 'left', paddingBottom: '5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ margin: 0 }}>Performance Analytics</h1>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select Lift:</label>
                    <select
                        value={selectedExercise}
                        onChange={(e) => setSelectedExercise(e.target.value)}
                        style={{
                            padding: '0.5rem', borderRadius: '8px', background: '#222', color: 'white', border: '1px solid #444'
                        }}
                    >
                        {exerciseList.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                {/* e1RM Trend Chart */}
                <div className="glass-card" style={{ borderTop: '4px solid var(--primary)' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📈 {exerciseList.find(e => e.id === selectedExercise)?.name} Intensity (e1RM) — 12-Week Trend
                    </h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={e1rmData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                                <YAxis stroke="var(--text-muted)" domain={['auto', 'auto']} fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '12px' }} />
                                <Line type="stepAfter" dataKey="e1rm" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                <div className="glass-card">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏆 Best e1RM
                    </h2>
                    <div>
                        <div style={{ fontSize: '3rem', fontWeight: 300, color: 'var(--primary)' }}>
                            {best1RM > 0 ? `${Math.round(best1RM)} ${unit}` : 'Awaiting data'}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {exerciseWorkouts.length > 0 ? `• ${exerciseWorkouts.length} sessions logged` : ''}
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🧱 Total Volume
                    </h2>
                    <div>
                        <div style={{ fontSize: '3rem', fontWeight: 300, color: 'var(--primary)' }}>
                            {totalVolume > 0 ? totalVolume.toLocaleString() : '0'}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {exerciseWorkouts.length > 0 ? `• ${exerciseWorkouts.length} sessions` : ''}
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏅 PRs
                    </h2>
                    <div>
                        <div style={{ fontSize: '3rem', fontWeight: 300, color: 'var(--primary)' }}>
                            {prCount}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {exerciseWorkouts.length > 0 ? `• New personal bests` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <section className="glass-card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                        <p className="page-kicker">IronLogic Coach</p>
                        <h2 style={{ marginTop: 0 }}>Adaptation Insights</h2>
                    </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 0 }}>
                    IronLogic analyzes your training data through the DMAIC framework to generate coaching recommendations.
                </p>
                <div style={{ display: 'grid', gap: '0.65rem' }}>
                    {workouts.length > 0 && workouts.length < 5 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Log more sessions to generate coaching insights.
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Log training sessions to generate coaching insights.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Progress;
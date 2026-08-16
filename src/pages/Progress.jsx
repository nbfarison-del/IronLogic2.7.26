import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { isWithinRecentDays } from '../utils/dateUtils';

import { useSettings } from '../context/SettingsContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { getOlympicProgressDashboard, getSmartRecommendations } from '../services/OlympicWeightliftingEngine';
import QualifyingTotals from '../components/QualifyingTotals';

// DOTS score calculation
const getDOTSScore = (bodyWeight, liftWeight, isMale = true) => {
    const mCoeffs = [-0.000001093, 0.0007391293, -0.191875104, 24.0900756, -307.75076];
    const fCoeffs = [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288];
    const c = isMale ? mCoeffs : fCoeffs;
    const bw = bodyWeight;
    const denom = c[0] * Math.pow(bw, 4) + c[1] * Math.pow(bw, 3) + c[2] * Math.pow(bw, 2) + c[3] * bw + c[4];
    if (denom === 0) return 0;
    return (liftWeight * 500) / denom;
};

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

const Progress = () => {
    const location = useLocation();
    const { weights, workouts, recovery, profile, isLoading } = useData();
    const { unit } = useSettings();
    const [selectedExercise, setSelectedExercise] = useState('bb_squat');
    const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get('tab') || 'general');

    // List of exercises for comparison
    const exerciseList = useMemo(() => {
        const unique = {};
        workouts.forEach(w => {
            if (w.exerciseId && w.exerciseName) unique[w.exerciseId] = w.exerciseName;
        });
        return Object.entries(unique).map(([id, name]) => ({ id, name }));
    }, [workouts]);

    const e1rmData = useMemo(() => {
        return workouts
            .filter(w => w.exerciseId === selectedExercise && w.estimated1RM)
            .filter(w => isWithinRecentDays(w.date, 30))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(w => ({
                date: w.date,
                e1rm: w.estimated1RM
            }));
    }, [workouts, selectedExercise]);

    const tonnageData = useMemo(() => {
        const weeks = {};
        const now = new Date();
        // Last 12 weeks
        for (let i = 0; i < 12; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * 7));
            const weekStr = `Week -${i}`;
            const weekKey = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
            weeks[weekKey] = { name: weekStr, volume: 0 };
        }

        workouts.forEach(w => {
            const d = new Date(w.date);
            const weekKey = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
            if (weeks[weekKey]) {
                const vol = (w.weight || 0) * (w.reps || 0);
                weeks[weekKey].volume += Math.round(vol);
            }
        });

        return Object.values(weeks).reverse();
    }, [workouts]);

    // DOTS Score Trend (keep existing logic but optimize)
    const dotsData = useMemo(() => {
        if (weights.length === 0 || workouts.length === 0) return [];
        const sortedBw = [...weights].sort((a,b) => new Date(a.date) - new Date(b.date));
        const sortedWorkouts = [...workouts].sort((a,b) => new Date(a.date) - new Date(b.date));
        
        const data = [];
        const currentMaxes = { bb_squat: 0, bb_bench: 0, bb_deadlift: 0 };

        sortedBw.forEach(bwEntry => {
            const bwDate = new Date(bwEntry.date);
            sortedWorkouts.forEach(w => {
                const wDate = new Date(w.date);
                if (wDate <= bwDate && w.estimated1RM) {
                    if ((w.exerciseId === 'bb_squat' && w.modifiers?.bar !== 'Low Bar') || ['bb_front_squat', 'ssb_squat'].includes(w.exerciseId))
                        currentMaxes.bb_squat = Math.max(currentMaxes.bb_squat, w.estimated1RM);
                    if (['bb_bench'].includes(w.exerciseId)) 
                        currentMaxes.bb_bench = Math.max(currentMaxes.bb_bench, w.estimated1RM);
                    if (['bb_deadlift', 'sumo_deadlift'].includes(w.exerciseId)) 
                        currentMaxes.bb_deadlift = Math.max(currentMaxes.bb_deadlift, w.estimated1RM);
                }
            });

            if (currentMaxes.bb_squat > 0 && currentMaxes.bb_bench > 0 && currentMaxes.bb_deadlift > 0) {
                const total = currentMaxes.bb_squat + currentMaxes.bb_bench + currentMaxes.bb_deadlift;
                const dots = getDOTSScore(parseFloat(bwEntry.weight), total, true);
                data.push({
                    date: bwEntry.date,
                    dots: Math.round(dots * 10) / 10
                });
            }
        });
        return data;
    }, [workouts, weights]);

    const olympicDashboards = useMemo(() => getOlympicProgressDashboard(workouts, recovery), [workouts, recovery]);
    const olympicRecommendations = useMemo(() => getSmartRecommendations({ profile, workouts, recovery }).slice(0, 4), [profile, workouts, recovery]);

    const olympicCards = [
        ['snatch', 'Snatch Progress'],
        ['cleanJerk', 'Clean & Jerk Progress'],
        ['total', 'Total Progress'],
        ['frontSquat', 'Front Squat Progress'],
        ['backSquat', 'Back Squat Progress']
    ];

    if (isLoading) return <div className="card">Loading progress data...</div>;

    return (
        <div className="animate-in" style={{ textAlign: 'left', paddingBottom: '5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ margin: 0 }}>Performance Analytics</h1>
                {activeTab === 'general' && <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Focus Exercise:</label>
                    <select 
                        value={selectedExercise} 
                        onChange={(e) => setSelectedExercise(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '8px', background: '#222', color: 'white', border: '1px solid #444' }}
                    >
                        {exerciseList.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </select>
                </div>}
            </div>

            <div className="segmented-control" style={{ marginBottom: '1.5rem' }}>
                <button type="button" className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>General</button>
                <button type="button" className={activeTab === 'olympic' ? 'active' : ''} onClick={() => setActiveTab('olympic')}>Olympic Weightlifting</button>
            </div>

            {activeTab === 'olympic' ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                        {olympicCards.map(([key, label]) => {
                            const data = olympicDashboards[key] || [];
                            const best = Math.max(0, ...data.map(row => row.e1rm || 0));
                            return (
                                <div key={key} className="glass-card">
                                    <p className="page-kicker">{label}</p>
                                    <h2 style={{ marginTop: 0 }}>{best ? `${Math.round(best)} ${unit} e1RM` : 'Awaiting data'}</h2>
                                    <div style={{ height: 220, width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={data}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                                                <YAxis stroke="var(--text-muted)" domain={['auto', 'auto']} fontSize={10} />
                                                <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                                                <Line type="monotone" dataKey="e1rm" name="e1RM" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} />
                                                <Line type="monotone" dataKey="readiness" name="Readiness" stroke="var(--secondary)" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                                        <div className="empty-state"><strong>Volume</strong><br />{Math.round(data.reduce((sum, row) => sum + (row.volume || 0), 0)).toLocaleString()}</div>
                                        <div className="empty-state"><strong>Intensity</strong><br />{Math.round(data.reduce((sum, row) => sum + (row.intensity || 0), 0) / Math.max(data.filter(row => row.intensity).length, 1)) || '--'}%</div>
                                        <div className="empty-state"><strong>PRs</strong><br />{data.filter((row, index) => row.e1rm >= Math.max(...data.slice(0, index + 1).map(item => item.e1rm))).length}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <section className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div>
                                <p className="page-kicker">IronLogic Coach</p>
                                <h2 style={{ marginTop: 0 }}>Adaptation Insights</h2>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gap: '0.65rem' }}>
                            {olympicRecommendations.map((rec, idx) => (
                                <WhyRec
                                    key={idx}
                                    rec={rec}
                                    defaultOpen={idx === 0}
                                />
                            ))}
                            {olympicRecommendations.length === 0 && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Log Olympic lifting sessions to generate coaching insights.
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: '0.85rem', padding: '0.7rem', background: 'rgba(0,0,0,0.12)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
                            IronLogic uses the DMAIC framework to analyze your Olympic weightlifting data and generate coaching recommendations.
                        </div>
                    </section>

                    <QualifyingTotals
                        athleteTotal={Math.max(0, ...(olympicDashboards.total || []).map(r => r.e1rm || 0))}
                        bodyWeightKg={profile?.bodyWeight || 77}
                        gender={profile?.gender || 'men'}
                        age={profile?.age || 30}
                        unit={unit}
                    />
                </>
            ) : (
                <>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                {/* E1RM Trend Chart */}
                <div className="glass-card" style={{ borderTop: '4px solid var(--primary)' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📈 {exerciseList.find(e => e.id === selectedExercise)?.name} Intensity (e1RM) &mdash; Last 30 Days
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

                {/* Tonnage Trend Chart */}
                <div className="glass-card" style={{ borderTop: '4px solid #10b981' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🧱 Weekly Training Volume (Tonnage)
                    </h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tonnageData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                                <YAxis stroke="var(--text-muted)" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '12px' }} />
                                <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                <div className="glass-card">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚖️ Body Weight Trend ({unit})
                    </h2>
                    <div style={{ height: '250px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weights}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                                <YAxis stroke="var(--text-muted)" domain={['auto', 'auto']} fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '12px' }} />
                                <Line type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏆 DOTS Score Progress
                    </h2>
                    <div style={{ height: '250px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dotsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                                <YAxis stroke="var(--text-muted)" domain={['auto', 'auto']} fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '12px' }} />
                                <Line type="monotone" dataKey="dots" stroke="var(--secondary)" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <section className="glass-card" style={{ marginTop: '1.5rem' }}>
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
                    {olympicRecommendations.map((rec, idx) => (
                        <WhyRec
                            key={idx}
                            rec={rec}
                            defaultOpen={idx === 0}
                        />
                    ))}
                    {olympicRecommendations.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Log training sessions to generate coaching insights.
                        </div>
                    )}
                </div>
            </section>
                </>
            )}
        </div>

    );
};

export default Progress;


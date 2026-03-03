import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

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

const Progress = () => {
    const { weights, workouts, isLoading } = useData();
    const { unit } = useSettings();

    if (isLoading) return <div className="card">Loading progress data...</div>;

    // Consistency Helper: Workouts per week for last 8 weeks
    const getConsistencyData = () => {
        const weeks = {};
        const now = new Date();
        for (let i = 0; i < 8; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * 7));
            const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
            weeks[weekNum] = { name: `Week -${i}`, count: 0 };
        }
        workouts.forEach(w => {
            const d = new Date(w.date);
            const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
            if (weeks[weekNum]) weeks[weekNum].count++;
        });
        return Object.values(weeks).reverse();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const dotsData = useMemo(() => {
        if (weights.length === 0 || workouts.length === 0) return [];
        const sortedWorkouts = [...workouts].reverse();
        const data = [];
        let workoutIdx = 0;
        const currentMaxes = { squat: 0, bench: 0, deadlift: 0 };
        const squatIds = ['bb_squat', 'bb_front_squat', 'ssb_squat'];
        const benchIds = ['bb_bench'];
        const dlIds = ['bb_deadlift', 'sumo_deadlift'];

        weights.forEach(bwEntry => {
            const bwDate = new Date(bwEntry.date);
            while (workoutIdx < sortedWorkouts.length) {
                const w = sortedWorkouts[workoutIdx];
                const wDate = new Date(w.date);
                if (wDate > bwDate) break;
                if (w.estimated1RM) {
                    if (squatIds.includes(w.exerciseId)) currentMaxes.squat = Math.max(currentMaxes.squat, w.estimated1RM);
                    if (benchIds.includes(w.exerciseId)) currentMaxes.bench = Math.max(currentMaxes.bench, w.estimated1RM);
                    if (dlIds.includes(w.exerciseId)) currentMaxes.deadlift = Math.max(currentMaxes.deadlift, w.estimated1RM);
                }
                workoutIdx++;
            }
            if (currentMaxes.squat > 0 && currentMaxes.bench > 0 && currentMaxes.deadlift > 0) {
                const total = currentMaxes.squat + currentMaxes.bench + currentMaxes.deadlift;
                const dots = getDOTSScore(parseFloat(bwEntry.weight), total, true);
                data.push({
                    date: bwEntry.date,
                    dots: Math.round(dots * 100) / 100,
                    total,
                    bw: bwEntry.weight
                });
            }
        });
        return data.slice(-30);
    }, [workouts, weights]);

    return (
        <div>
            <h1>Your Training Progress</h1>

            {/* DOTS Progress Chart */}
            <div className="card" style={{ marginBottom: '2rem', marginTop: '2rem' }}>
                <h2>🏋️ Powerlifting DOTS Progress</h2>
                {dotsData.length > 1 ? (
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dotsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="date" stroke="#888" fontSize={12} />
                                <YAxis stroke="#888" domain={['auto', 'auto']} fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                                    formatter={(value, name) => [value, name === 'dots' ? 'DOTS Score' : name]}
                                />
                                <Line type="monotone" dataKey="dots" stroke="#2196f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p style={{ fontStyle: 'italic', color: '#666' }}>
                        Need more data (Body Weight logs + SBD maxes) to generate DOTS graph.
                    </p>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                {/* Weight History Chart */}
                <div className="card">
                    <h2>Body Weight Trend ({unit})</h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weights}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="date" stroke="#888" fontSize={12} />
                                <YAxis stroke="#888" domain={['auto', 'auto']} fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                                <Line type="monotone" dataKey="weight" stroke="#9c27b0" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Workout Consistency */}
                <div className="card">
                    <h2>Workout Consistency (Last 8 Weeks)</h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getConsistencyData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                                <YAxis stroke="#888" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Progress;


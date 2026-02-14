import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';
import { exercises as allExercises } from '../data/exercises';
import { calculateEstimated1RM } from '../utils/calculator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RecoveryTracker from '../components/RecoveryTracker';
import WeightTracker from '../components/WeightTracker';
import GoalTracker from '../components/GoalTracker';

import { generateProgram } from '../services/ProgramGenerator';

// DOTS Utilities
const getDOTSScore = (bodyWeight, liftWeight, isMale = true) => {
    // DOTS Coefficients (Male)
    const mCoeffs = [-0.000001093, 0.0007391293, -0.191875104, 24.0900756, -307.75076];
    // DOTS Coefficients (Female)
    const fCoeffs = [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288];

    const c = isMale ? mCoeffs : fCoeffs;
    const w = bodyWeight * 2.20462; // Convert kg to lbs for DOTS formula usually? Wait, DOTS is usually KG.
    // Standard DOTS uses KG.
    // Formula: Score = WeightLifted * 500 / (c1*bw^4 + c2*bw^3 + c3*bw^2 + c4*bw + c5)
    // Actually standard DOTS coefficients are for KG.
    // Male:
    // A = -0.0000010930
    // B = 0.0007391293
    // C = -0.1918751040
    // D = 24.0900756000
    // E = -307.7507600000

    // Denominator = A*bw^4 + B*bw^3 + C*bw^2 + D*bw + E
    const bw = bodyWeight;
    const denom = c[0] * Math.pow(bw, 4) + c[1] * Math.pow(bw, 3) + c[2] * Math.pow(bw, 2) + c[3] * bw + c[4];

    if (denom === 0) return 0;
    return (liftWeight * 500) / denom;
};

const Home = () => {
    const { user } = useAuth();
    const [aiProgram, setAiProgram] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [weightHistory, setWeightHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [fetchedWorkouts, fetchedWeights, fetchedProgram, fetchedQuestionnaire] = await Promise.all([
                    firestoreService.getWorkouts(user.id),
                    firestoreService.getBodyWeight(user.id),
                    firestoreService.getAIProgram(user.id),
                    firestoreService.getQuestionnaire(user.id)
                ]);

                setWorkouts(fetchedWorkouts);
                setWeightHistory(fetchedWeights);

                if (fetchedProgram) {
                    setAiProgram(fetchedProgram);
                } else if (fetchedQuestionnaire) {
                    // Generate new program if questionnaire exists but no program
                    const newProgram = generateProgram(fetchedQuestionnaire);
                    setAiProgram(newProgram);
                    await firestoreService.saveAIProgram(user.id, newProgram);
                }
            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [user]);

    // --- Recent PRs Calculation ---
    // We need to find "Personal Records" historically. 
    // A simplified approach: Sort all workouts by date. Track max 1RM seen so far. If a new one beats it, it's a PR.
    // We want to list the *Recent* ones.
    const getRecentPRs = () => {
        const prList = [];
        const maxes = {}; // Track current max per exercise

        // Sort workouts oldest to newest
        const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedWorkouts.forEach(w => {
            if (w.type === 'strength' && w.estimated1RM) {
                const exId = w.exerciseId;
                const currentMax = maxes[exId] || 0;
                if (w.estimated1RM > currentMax) {
                    const increase = w.estimated1RM - currentMax;
                    maxes[exId] = w.estimated1RM;

                    // Add to PR list
                    prList.push({
                        ...w,
                        increase: increase > 0 && currentMax > 0 ? increase : 0, // 0 if first time
                        isFirst: currentMax === 0
                    });
                }
            }
        });

        // Return reversed (newest first), limit to 10
        return prList.reverse().slice(0, 10);
    };

    const recentPRs = getRecentPRs();


    // --- DOTS Graph Data ---
    // We need SBD (Squat, Bench, Deadlift) totals over time.
    // Strategy: For each weight entry, find the closest previous Squat, Bench, and Deadlift 1RM.
    // Calculate DOTS.
    const getDotsData = () => {
        if (weightHistory.length === 0) return [];

        // Sort weight history
        const sortedWeights = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

        const data = [];

        sortedWeights.forEach(bwEntry => {
            const date = new Date(bwEntry.date);

            // Find best Squat/Bench/Deadlift BEFORE or ON this date
            // Helper to get maxe1RM for exercise category before date
            const getMaxBefore = (exIds) => {
                const relevant = workouts.filter(w =>
                    exIds.includes(w.exerciseId) &&
                    new Date(w.date) <= date &&
                    w.estimated1RM
                );
                if (relevant.length === 0) return 0;
                return Math.max(...relevant.map(w => w.estimated1RM));
            };

            const squat = getMaxBefore(['bb_squat', 'bb_front_squat', 'ssb_squat']);
            const bench = getMaxBefore(['bb_bench']);
            const deadlift = getMaxBefore(['bb_deadlift', 'sumo_deadlift']);

            if (squat > 0 && bench > 0 && deadlift > 0) {
                const total = squat + bench + deadlift;
                const dots = getDOTSScore(parseFloat(bwEntry.weight), total, true); // Assuming male for now, user profile needs gender
                data.push({
                    date: bwEntry.date,
                    dots: Math.round(dots * 100) / 100,
                    total: total,
                    bw: bwEntry.weight
                });
            }
        });

        return data;
    };

    const dotsData = getDotsData();

    return (
        <div>
            <h1>Welcome back, {user?.name || 'User'}!</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem', fontStyle: 'italic' }}>
                Train like a Champion Today!
            </p>

            {/* AI Program Card */}
            {aiProgram && (
                <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)', background: 'linear-gradient(45deg, #222 0%, #2a2a2a 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>⚡ AI Action Plan: {aiProgram.name}</h2>
                            <p style={{ color: '#aaa', margin: 0 }}>Based on your recent questionnaire.</p>
                        </div>
                        <Link to="/questionnaire">
                            <button className="btn" style={{ fontSize: '0.8rem' }}>Update Goals</button>
                        </Link>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', color: '#fff' }}>Week 1 Preview:</h3>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {aiProgram.weeks[0]?.days.map((day, i) => (
                                <div key={i} style={{ minWidth: '200px', background: '#333', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#ddd' }}>{day.dayName}</div>
                                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#aaa' }}>
                                        {day.exercises.slice(0, 3).map((ex, j) => (
                                            <li key={j}>{ex.sets}x{ex.reps} ({ex.exerciseId})</li>
                                        ))}
                                        {day.exercises.length > 3 && <li>+ {day.exercises.length - 3} more</li>}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => alert('Feature coming soon: Load this program directly into your planner!')}>
                        Load Program into Planner
                    </button>
                </div>
            )}

            {/* DOTS Chart */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2>Powerlifting DOTS Progress</h2>
                {dotsData.length > 1 ? (
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dotsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="date" stroke="#888" />
                                <YAxis stroke="#888" domain={['auto', 'auto']} />
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <RecoveryTracker />
                <WeightTracker />
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2>🏆 Recent PRs</h2>
                {recentPRs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recentPRs.map((pr, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#222', borderRadius: '6px', borderLeft: '4px solid gold' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{pr.exerciseName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{new Date(pr.date).toLocaleDateString()}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'gold' }}>{pr.estimated1RM} <span style={{ fontSize: '0.8rem' }}>e1RM</span></div>
                                    {!pr.isFirst && (
                                        <div style={{ fontSize: '0.8rem', color: '#4caf50' }}>+{pr.increase.toFixed(1)}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ fontStyle: 'italic', color: '#666' }}>No PRs set yet.</p>
                )}
            </div>

            <GoalTracker />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <div className="card">
                    <h2>Start Workout</h2>
                    <p>Log your daily exercise and keep track of your sets.</p>
                    <Link to="/log">
                        <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Log Now</button>
                    </Link>
                </div>

                <div className="card">
                    <h2>View Progress</h2>
                    <p>See your stats and improvements over time.</p>
                    <Link to="/progress">
                        <button className="btn" style={{ marginTop: '1rem' }}>View Dashboard</button>
                    </Link>
                </div>

                <div className="card">
                    <h2>Recent Activity</h2>
                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No recent activity to show.</p>
                </div>
            </div>
        </div>
    );
};

export default Home;

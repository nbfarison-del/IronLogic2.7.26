import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';
import { exercises as allExercises } from '../data/exercises';
import { calculateEstimated1RM } from '../utils/calculator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RecoveryTracker from '../components/RecoveryTracker';
import WeightTracker from '../components/WeightTracker';
import GoalTracker from '../components/GoalTracker';
import MobilityTab from '../components/MobilityTab';
import AIAgentTab from '../components/AIAgentTab';
import { generateProgram } from '../services/ProgramGenerator';
import logo from '../assets/logo.png';

// DOTS Utilities
const getDOTSScore = (bodyWeight, liftWeight, isMale = true) => {
    const mCoeffs = [-0.000001093, 0.0007391293, -0.191875104, 24.0900756, -307.75076];
    const fCoeffs = [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288];
    const c = isMale ? mCoeffs : fCoeffs;
    const bw = bodyWeight;
    const denom = c[0] * Math.pow(bw, 4) + c[1] * Math.pow(bw, 3) + c[2] * Math.pow(bw, 2) + c[3] * bw + c[4];
    if (denom === 0) return 0;
    return (liftWeight * 500) / denom;
};

const Home = () => {
    const { user } = useAuth();
    const { unit: appUnit } = useSettings();
    const {
        workouts,
        weights: weightHistory,
        recovery: recoveryHistory,
        goals,
        coaching,
        plannedWorkouts,
        isLoading: loading
    } = useData();

    const [activeTab, setActiveTab] = useState('dashboard');

    const recentPRs = useMemo(() => {
        const prList = [];
        const maxes = {};
        const chronological = [...workouts].reverse();
        chronological.forEach(w => {
            if (w.type === 'strength' && w.estimated1RM) {
                const exId = w.exerciseId;
                const currentMax = maxes[exId] || 0;
                if (w.estimated1RM > currentMax) {
                    const increase = w.estimated1RM - currentMax;
                    maxes[exId] = w.estimated1RM;
                    prList.push({
                        ...w,
                        increase: increase > 0 && currentMax > 0 ? increase : 0,
                        isFirst: currentMax === 0
                    });
                }
            }
        });
        return prList.reverse().slice(0, 10);
    }, [workouts]);

    const dotsData = useMemo(() => {
        if (weightHistory.length === 0 || workouts.length === 0) return [];
        const sortedWeights = weightHistory;
        const sortedWorkouts = [...workouts].reverse();
        const data = [];
        let workoutIdx = 0;
        const currentMaxes = { squat: 0, bench: 0, deadlift: 0 };
        const squatIds = ['bb_squat', 'bb_front_squat', 'ssb_squat'];
        const benchIds = ['bb_bench'];
        const dlIds = ['bb_deadlift', 'sumo_deadlift'];

        sortedWeights.forEach(bwEntry => {
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
                    total: total,
                    bw: bwEntry.weight
                });
            }
        });
        return data.slice(-30);
    }, [workouts, weightHistory]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p>Loading Dashboard...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Welcome back, {user?.name || 'User'}!</h1>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'dashboard' ? 'var(--primary)' : '#888',
                        borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary)' : '2px solid transparent',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                    }}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('mobility')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'mobility' ? '#9c27b0' : '#888',
                        borderBottom: activeTab === 'mobility' ? '2px solid #9c27b0' : '2px solid transparent',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                    }}
                >
                    Mobility
                </button>
                <button
                    onClick={() => setActiveTab('ai-agent')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'ai-agent' ? 'var(--primary)' : '#888',
                        borderBottom: activeTab === 'ai-agent' ? '2px solid var(--primary)' : '2px solid transparent',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                    }}
                >
                    AI Agent
                </button>
            </div>


            {
                activeTab === 'dashboard' ? (
                    <>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem', fontStyle: 'italic' }}>
                            Train like a Champion Today!
                        </p>

                        {/* Today's Planned Workout Section */}
                        {(() => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const todayPlan = plannedWorkouts?.find(p => p.date === todayStr);
                            if (todayPlan) {
                                return (
                                    <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--primary)', background: 'rgba(33, 150, 243, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Today's Planned Session</h3>
                                                <p style={{ margin: '0.5rem 0 0 0', fontWeight: 'bold' }}>{todayPlan.planName || todayPlan.name}</p>
                                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {todayPlan.exercises?.length || 0} Exercises planned
                                                </p>
                                            </div>
                                            <Link to="/log" state={{ plannedWorkout: todayPlan }}>
                                                <button className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem' }}>
                                                    Start Workout
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}




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
                                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                                    {pr.date.includes('T') ? pr.date.split('T')[0] : pr.date}
                                                </div>
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
                                {workouts.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {workouts.slice(0, 5).map((w, i) => (
                                            <div key={i} style={{ fontSize: '0.9rem', padding: '0.5rem', background: '#222', borderRadius: '4px', borderLeft: '3px solid #666' }}>
                                                <div style={{ fontWeight: 'bold' }}>{w.exerciseName}</div>
                                                <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
                                                    {w.date.includes('T') ? w.date.split('T')[0] : w.date} • {w.weight ? `${w.weight}${appUnit} x ` : ''}{w.reps ? `${w.reps} reps` : (w.duration ? `${w.duration}m` : '')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No recent activity to show.</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : activeTab === 'mobility' ? (
                    <MobilityTab />
                ) : (
                    <AIAgentTab />
                )
            }
        </div >
    );
};

export default Home;

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import RecoveryTracker from '../components/RecoveryTracker';
import WeightTracker from '../components/WeightTracker';
import GoalTracker from '../components/GoalTracker';
import MobilityTab from '../components/MobilityTab';
import IronLogicTab from '../components/IronLogicTab';

// Browser-robust YYYY-MM-DD helper
const getDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const Home = () => {
    const { user } = useAuth();
    const { unit: appUnit } = useSettings();
    const {
        workouts,
        plannedWorkouts,
        trainingMaxes,
        isLoading: loading
    } = useData();




    const [activeTab, setActiveTab] = useState('dashboard');

    const todayStr = useMemo(() => getDateStr(new Date()), []);
    const todayPlan = useMemo(() => {
        return plannedWorkouts.find(p => p.date === todayStr);
    }, [plannedWorkouts, todayStr]);

    const recentPRs = useMemo(() => {
        const prList = [];
        const prTrackingMaxes = {};
        const chronological = [...workouts].reverse();
        chronological.forEach(w => {
            if (w.type === 'strength' && w.estimated1RM) {
                const exId = w.exerciseId;
                const currentMax = prTrackingMaxes[exId] || 0;
                if (w.estimated1RM > currentMax) {
                    const increase = w.estimated1RM - currentMax;
                    prTrackingMaxes[exId] = w.estimated1RM;
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
    const weeklySummary = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);
        
        const thisWeekWorkouts = workouts.filter(w => {
            const d = new Date(w.date);
            return d >= startOfWeek;
        });

        const totalWeight = thisWeekWorkouts.reduce((sum, w) => sum + (parseFloat(w.weight || 0) * parseInt(w.reps || 0)), 0);
        const sessions = new Set(thisWeekWorkouts.map(w => w.date.split('T')[0])).size;

        return { totalWeight, sessions };
    }, [workouts]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p style={{ fontWeight: '600', letterSpacing: '0.05em' }}>SYNCING PERFORMANCE DATA...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ paddingBottom: '2rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Welcome, {user?.name || 'Athlete'}</h1>
                <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Your performance journey continues today.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
                {['dashboard', 'mobility', 'ironlogic-method'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            background: activeTab === tab ? 'rgba(255,255,255,0.07)' : 'transparent',
                            border: 'none',
                            color: activeTab === tab ? 'var(--primary)' : '#888',
                            padding: '0.75rem',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {activeTab === 'dashboard' ? (
                <>
                    {/* Onboarding Flow for New Athletes */}
                    {(workouts.length === 0 || !trainingMaxes?.squat) && (


                        <div className="glass-card animate-in" style={{ 
                            marginBottom: '2.5rem', 
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(251, 191, 36, 0.1))',
                            border: '1px solid var(--primary)',
                            padding: '2rem'
                        }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '3rem' }}>🚀</div>
                                <div style={{ flex: 1, minWidth: '250px' }}>
                                    <h2 style={{ margin: '0 0 0.5rem 0' }}>Welcome to the Platform</h2>
                                    <p style={{ opacity: 0.8, fontSize: '0.95rem', margin: 0 }}>
                                        To get the most out of IronLogic, please complete your setup to enable performance tracking.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <Link to="/profile" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Set Your Maxes</Link>
                                    <Link to="/questionnaire" className="btn" style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#000' }}>Setup AI Coach</Link>
                                    <Link to="/log" className="btn" style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)' }}>Log First Session</Link>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="action-grid" style={{ marginBottom: '2.5rem' }}>

                        <Link to="/log" style={{ textDecoration: 'none' }}>
                            <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--border-glass)' }}>
                                <span style={{ fontSize: '2rem' }}>🏋️</span>
                                <span style={{ fontWeight: '700' }}>Free Session</span>
                            </div>
                        </Link>
                        <Link to={todayPlan ? `/log?planId=${todayPlan.id}` : "/calendar?plan=true"} style={{ textDecoration: 'none' }}>
                            <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: todayPlan ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), transparent)' : 'rgba(255,255,255,0.03)', border: todayPlan ? '1px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                                <span style={{ fontSize: '2rem' }}>{todayPlan ? '🔥' : '📅'}</span>
                                <span style={{ fontWeight: '700', color: todayPlan ? 'var(--primary)' : 'inherit' }}>{todayPlan ? 'Start Program' : 'Plan Program'}</span>
                            </div>
                        </Link>
                        <Link to="/calendar" style={{ textDecoration: 'none' }}>
                            <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2rem' }}>⏪</span>
                                <span style={{ fontWeight: '700' }}>History</span>
                            </div>
                        </Link>
                    </div>

                    <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                        <div className="glass-card" style={{ textAlign: 'left', borderTop: '4px solid var(--secondary)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weekly Volume</div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.5rem 0' }}>{Math.round(weeklySummary.totalWeight).toLocaleString()} {appUnit}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--accent-success)' }}>Across {weeklySummary.sessions} sessions this week</div>
                        </div>
                        <div className="glass-card" style={{ textAlign: 'left', borderTop: '4px solid var(--primary)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Intensity</div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.5rem 0' }}>{recentPRs[0]?.estimated1RM || 0} {appUnit}</div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Last set on {recentPRs[0]?.exerciseName || 'N/A'}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
                        <RecoveryTracker />
                        <WeightTracker />
                    </div>

                    <div className="glass-card" style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ fontSize: '1.2rem' }}>🏆</span> Recent Milestones</h2>
                        {recentPRs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                                {recentPRs.slice(0, 5).map(pr => (
                                    <div key={`${pr.date}-${pr.exerciseId}`} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>

                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>{pr.exerciseName}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pr.date}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>{pr.estimated1RM} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{appUnit} e1RM</span></div>
                                            {!pr.isFirst && <div style={{ fontSize: '0.8rem', color: 'var(--accent-success)', fontWeight: '700' }}>↑ {pr.increase.toFixed(1)}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ opacity: 0.5, fontStyle: 'italic', marginTop: '1rem' }}>Your records will appear here as you log sessions.</p>
                        )}
                    </div>

                    <GoalTracker />

                    <div style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.4, fontSize: '0.9rem' }}>
                        IronLogic v2.7.26 • Built for Performance
                    </div>
                </>
            ) : activeTab === 'mobility' ? (
                <MobilityTab />
            ) : (
                <IronLogicTab />
            )}
        </div>
    );
};

export default Home;

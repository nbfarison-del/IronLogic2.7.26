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
import ActivityFeed from '../components/ActivityFeed';

const getDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const parseWorkoutDate = (value) => {
    if (!value) return null;
    const dateStr = String(value).includes('T') ? String(value).split('T')[0] : String(value);
    const parsed = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getSetVolume = (workout) => {
    if (workout?.type === 'cardio') return 0;
    const weight = parseFloat(workout?.weight || 0);
    const reps = parseInt(workout?.reps || 0, 10);
    const sets = parseInt(workout?.sets || 1, 10);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || !Number.isFinite(sets)) return 0;
    return weight * reps * Math.max(sets, 1);
};

const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'mobility', label: 'Mobility' },
    { id: 'ironlogic-method', label: 'Method' }
];

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
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const lastWeekWorkouts = workouts.filter(w => {
            const d = parseWorkoutDate(w.date);
            return d && d >= sevenDaysAgo && d <= now;
        });

        const totalWeight = lastWeekWorkouts.reduce((sum, w) => sum + getSetVolume(w), 0);
        const sessions = new Set(lastWeekWorkouts.map(w => String(w.date).split('T')[0])).size;
        const peakIntensity = lastWeekWorkouts
            .filter(w => w.type === 'strength' && Number(w.estimated1RM) > 0)
            .reduce((best, w) => {
                if (!best || Number(w.estimated1RM) > Number(best.estimated1RM)) return w;
                return best;
            }, null);

        const rpeEntries = lastWeekWorkouts
            .map(w => parseFloat(w.actualRpe || w.targetRpe))
            .filter(value => Number.isFinite(value));
        const averageRpe = rpeEntries.length
            ? rpeEntries.reduce((sum, value) => sum + value, 0) / rpeEntries.length
            : 0;

        return { totalWeight, sessions, peakIntensity, averageRpe };
    }, [workouts]);

    if (loading) {
        return (
            <div className="app-state">
                <div className="app-state-panel">
                    <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p className="app-state-eyebrow">Syncing</p>
                    <p>Loading your training workspace.</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell animate-in">
            <div className="page-header">
                <div>
                    <p className="page-kicker">Training Command Center</p>
                    <h1 className="page-title">Welcome, {user?.name || 'Athlete'}</h1>
                    <p className="page-subtitle">Review today's work, track the week, and keep momentum visible.</p>
                </div>
                <Link to="/log" className="btn btn-primary">Log Workout</Link>
            </div>

            <div className="segmented-control" style={{ marginBottom: '1.25rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={activeTab === tab.id ? 'active' : ''}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'dashboard' ? (
                <>
                    {(workouts.length === 0 || !trainingMaxes?.squat) && (
                        <div className="glass-card" style={{ marginBottom: '1.25rem', borderColor: 'rgba(var(--primary-rgb), 0.28)' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 260 }}>
                                    <p className="page-kicker">Setup Needed</p>
                                    <h2 style={{ margin: '0 0 0.45rem' }}>Complete your athlete profile</h2>
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                        Add maxes and context so the app can personalize analytics, programming, and recovery decisions.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                                    <Link to="/profile" className="btn btn-primary">Set Maxes</Link>
                                    <Link to="/questionnaire" className="btn">AI Setup</Link>
                                    <Link to="/log" className="btn">First Session</Link>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="dashboard-hero">
                        <section className="glass-card hero-panel">
                            <div>
                                <p className="page-kicker">This Week</p>
                                <h2 style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>
                                    {weeklySummary.sessions > 0 ? `${weeklySummary.sessions} sessions logged` : 'No sessions logged yet'}
                                </h2>
                                <p style={{ color: 'var(--text-muted)', maxWidth: 620, margin: 0 }}>
                                    Keep the record simple: log the work, review the trend, and let the data guide the next adjustment.
                                </p>
                            </div>
                            <div className="metric-grid" style={{ marginTop: '1.25rem' }}>
                                <div className="metric-card card">
                                    <small>Weekly Volume</small>
                                    <div className="metric-value">{Math.round(weeklySummary.totalWeight).toLocaleString()} {appUnit}</div>
                                    <div className="metric-note">Across tracked work sets</div>
                                </div>
                                <div className="metric-card card">
                                    <small>Peak Intensity</small>
                                    <div className="metric-value">{weeklySummary.peakIntensity?.estimated1RM || 0} {appUnit}</div>
                                    <div className="metric-note">
                                        {weeklySummary.peakIntensity
                                            ? `${weeklySummary.peakIntensity.exerciseName} e1RM`
                                            : 'Awaiting logged data'}
                                        {weeklySummary.averageRpe > 0 ? ` • Avg RPE ${weeklySummary.averageRpe.toFixed(1)}` : ''}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <aside className="glass-card today-panel">
                            <p className="page-kicker">Today</p>
                            <h2 style={{ margin: '0 0 0.6rem' }}>{todayPlan ? 'Program ready' : 'No program planned'}</h2>
                            <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                                {todayPlan ? (todayPlan.planName || todayPlan.name || 'Scheduled training session') : 'Create a session or apply a template to the calendar.'}
                            </p>
                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                <Link to={todayPlan ? `/log?planId=${todayPlan.id}` : '/calendar?plan=true'} className="btn btn-primary">
                                    {todayPlan ? 'Start Planned Session' : 'Plan Today'}
                                </Link>
                                <Link to="/programs" className="btn">Browse Templates</Link>
                            </div>
                        </aside>
                    </div>

                    <div className="quick-action-grid">
                        <Link to="/log" className="glass-card action-tile">
                            <small>Capture</small>
                            <strong>Free Session</strong>
                            <span>Log strength, conditioning, or accessory work.</span>
                        </Link>
                        <Link to="/calendar" className="glass-card action-tile">
                            <small>Schedule</small>
                            <strong>Calendar</strong>
                            <span>Review planned work and historical training.</span>
                        </Link>
                        <Link to="/progress" className="glass-card action-tile">
                            <small>Analyze</small>
                            <strong>Performance Trends</strong>
                            <span>See PRs, volume, and consistency over time.</span>
                        </Link>
                    </div>

                    <div className="content-grid">
                        <RecoveryTracker />
                        <WeightTracker />
                    </div>

                    <ActivityFeed />

                    <section className="glass-card" style={{ marginBottom: '1.25rem' }}>
                        <h2 style={{ marginTop: 0 }}>Recent Milestones</h2>
                        {recentPRs.length > 0 ? (
                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                {recentPRs.slice(0, 5).map(pr => (
                                    <div key={`${pr.date}-${pr.exerciseId}`} className="list-row">
                                        <div>
                                            <strong>{pr.exerciseName}</strong>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{pr.date}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <strong style={{ color: 'var(--primary)' }}>{pr.estimated1RM} {appUnit} e1RM</strong>
                                            {!pr.isFirst && <div style={{ color: 'var(--accent-success)', fontSize: '0.84rem' }}>+{pr.increase.toFixed(1)}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">Milestones will appear here after you log sessions.</div>
                        )}
                    </section>

                    <GoalTracker />

                    <div style={{ marginTop: '2rem', color: 'var(--text-subtle)', fontSize: '0.85rem', textAlign: 'center' }}>
                        IronLogic v2.7.26 - Built for performance.
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

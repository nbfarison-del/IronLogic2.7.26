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
import {
    calculateCompetitionPhase,
    getRecoveryAdjustment,
    getSmartRecommendations
} from '../services/OlympicWeightliftingEngine';
import { getDateStr, parseWorkoutDate } from '../utils/dateUtils';
import { prescribeForToday } from '../services/MobilityPrescription';
import { useMobilityStreak } from '../hooks/useMobilityStreak';

const getSetVolume = (workout) => {
    if (workout?.type === 'cardio') return 0;
    const weight = parseFloat(workout?.weight || 0);
    const reps = parseInt(workout?.reps || 0, 10);
    const sets = parseInt(workout?.sets || 1, 10);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || !Number.isFinite(sets)) return 0;
    return weight * reps * Math.max(sets, 1);
};

const tabs = [
    { id: 'mobility', label: 'Mobility' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'ironlogic-method', label: 'Method' }
];

const WhyRec = ({ rec }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="card" style={{ marginBottom: '0.5rem', padding: '0.85rem', background: 'rgba(var(--primary-rgb), 0.04)', borderLeft: '3px solid var(--primary)' }}>
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
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <div><strong>DMAIC:</strong> Define {rec.dmaic.define}</div>
                    {rec.dmaic.measure && <div><strong>Measure:</strong> {rec.dmaic.measure}</div>}
                    {rec.dmaic.analyze && <div><strong>Analyze:</strong> {rec.dmaic.analyze}</div>}
                    <div><strong>Improve:</strong> {rec.text}</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                        Confidence: High | Phase: Improve | Source: IronLogic DMAIC Cycle
                    </div>
                </div>
            )}
        </div>
    );
};

const Home = () => {
    const { user } = useAuth();
    const { unit: appUnit } = useSettings();
    const {
        workouts,
        recovery,
        sessions,
        profile,
        plannedWorkouts,
        trainingMaxes,
        mobilityLogs,
        isLoading: loading
    } = useData();

    const [activeTab, setActiveTab] = useState('dashboard');

    // Mobility-first: today's prescribed 10-minute session, derived from the training plan
    const mobilityRx = useMemo(
        () => prescribeForToday({ plannedWorkouts: plannedWorkouts || [], mobilityLogs: mobilityLogs || [] }),
        [plannedWorkouts, mobilityLogs]
    );
    const mobilityStreak = useMobilityStreak(mobilityLogs || []);

    const todayStr = useMemo(() => getDateStr(new Date()), []);
    const todayPlan = useMemo(() => {
        return plannedWorkouts.find(p => p.date === todayStr);
    }, [plannedWorkouts, todayStr]);

    const competitionPhase = useMemo(() => calculateCompetitionPhase(profile || {}), [profile]);
    const recoveryAdjustment = useMemo(() => getRecoveryAdjustment({}, recovery), [recovery]);
    const smartRecommendations = useMemo(() => getSmartRecommendations({ profile, workouts, recovery }).slice(0, 3), [profile, workouts, recovery]);

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

    const recentPR = useMemo(() => recentPRs[0], [recentPRs]);

    const trainingStreak = useMemo(() => {
        const completedDates = new Set((sessions || []).filter(s => s.isComplete).map(s => s.id));
        let streak = 0;
        const cursor = new Date();
        for (let i = 0; i < 30; i++) {
            const key = getDateStr(cursor);
            if (!completedDates.has(key)) break;
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        }
        return streak;
    }, [sessions]);

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
                    {(workouts.length === 0 || !trainingMaxes?.bb_squat) && (
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

                    {!profile?.onboardingCompleted && workouts.length === 0 && (
                        <div className="glass-card" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.06)', borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                    <p className="page-kicker">Welcome to IronLogic</p>
                                    <h3 style={{ margin: '0.25rem 0 0' }}>Set up your training profile</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.2rem 0 0' }}>
                                        Complete the onboarding wizard to generate a personalized program.
                                    </p>
                                </div>
                                <Link to="/onboarding" className="btn btn-primary">Start Onboarding</Link>
                            </div>
                        </div>
                    )}

                    <section className="glass-card" style={{ marginBottom: '1.25rem', borderLeft: `4px solid ${mobilityRx.path.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 220px' }}>
                                <p className="page-kicker">
                                    Today&apos;s Mobility · ~10 min
                                    {mobilityStreak.current > 0 && (
                                        <span> · 🔥 {mobilityStreak.current}-day streak</span>
                                    )}
                                </p>
                                <h2 style={{ margin: '0.2rem 0 0.4rem', fontSize: '1.25rem' }}>
                                    {mobilityRx.path.icon} {mobilityRx.path.name}
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                                    {mobilityRx.reason}
                                </p>
                            </div>
                            {mobilityRx.alreadyDone ? (
                                <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                                    ✓ Done today
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setActiveTab('mobility')}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    Start Session
                                </button>
                            )}
                        </div>
                    </section>

                    <div className="dashboard-hero">
                        <section className="glass-card hero-panel" style={{ flex: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                    <p className="page-kicker">This Week</p>
                                    <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem' }}>
                                        {weeklySummary.sessions > 0 ? `${weeklySummary.sessions} session${weeklySummary.sessions > 1 ? 's' : ''}` : 'No sessions yet'}
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <small>Volume</small>
                                        <div style={{ fontWeight: 700 }}>{Math.round(weeklySummary.totalWeight).toLocaleString()} {appUnit}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <small>Peak e1RM</small>
                                        <div style={{ fontWeight: 700 }}>{weeklySummary.peakIntensity?.estimated1RM || 0} {appUnit}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <small>Avg RPE</small>
                                        <div style={{ fontWeight: 700 }}>{weeklySummary.averageRpe > 0 ? weeklySummary.averageRpe.toFixed(1) : '--'}</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <aside className="glass-card today-panel" style={{ flex: 1 }}>
                            <p className="page-kicker">Today</p>
                            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem' }}>{todayPlan ? (todayPlan.planName || todayPlan.name || 'Program ready') : 'Free session'}</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <Link to={todayPlan ? `/log?planId=${todayPlan.id}` : '/log'} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>
                                    {todayPlan ? 'Start' : 'Log Workout'}
                                </Link>
                                {!todayPlan && <Link to="/calendar?plan=true" className="btn" style={{ flex: 1, textAlign: 'center' }}>Plan</Link>}
                            </div>
                        </aside>
                    </div>

                    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                        <div className="metric-card card">
                            <small>Readiness</small>
                            <div className="metric-value">{recoveryAdjustment.readinessScore}</div>
                            <div className="metric-note">{recoveryAdjustment.note}</div>
                        </div>
                        <div className="metric-card card">
                            <small>Recent PR</small>
                            <div className="metric-value">{recentPR ? `${recentPR.estimated1RM} ${appUnit}` : '--'}</div>
                            <div className="metric-note">{recentPR?.exerciseName || 'Log a new best'}</div>
                        </div>
                        <div className="metric-card card">
                            <small>Streak</small>
                            <div className="metric-value">{trainingStreak}</div>
                            <div className="metric-note">Finalized sessions</div>
                        </div>
                        <div className="metric-card card">
                            <small>Competition</small>
                            <div className="metric-value">{competitionPhase.daysUntilMeet ?? '--'} days</div>
                            <div className="metric-note">{competitionPhase.name}</div>
                        </div>
                    </div>

                    <section className="glass-card" style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div>
                                <p className="page-kicker">Iron Logic Coach</p>
                                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.15rem' }}>Today&apos;s Coaching Recommendation</h2>
                            </div>
                            <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.85rem' }}
                                onClick={() => setActiveTab('ironlogic-method')}
                            >
                                View Method
                            </button>
                        </div>
                        {smartRecommendations.length > 0 ? (
                            <div style={{ marginTop: '0.65rem' }}>
                                {smartRecommendations.slice(0, 2).map((rec, index) => (
                                    <WhyRec
                                        key={index}
                                        rec={rec}
                                        defaultOpen={index === 0}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ marginTop: '0.85rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {workouts.length > 3
                                    ? 'Run a DMAIC cycle on the Method tab to generate coaching recommendations.'
                                    : 'Log a few sessions to unlock IronLogic coaching insights.'}
                            </div>
                        )}
                    </section>

                    <div className="quick-action-grid">
                        <Link to="/log" className="glass-card action-tile">
                            <small>Capture</small>
                            <strong>Free Session</strong>
                        </Link>
                        <Link to="/calendar" className="glass-card action-tile">
                            <small>Schedule</small>
                            <strong>Calendar</strong>
                        </Link>
                        <Link to="/progress" className="glass-card action-tile">
                            <small>Analyze</small>
                            <strong>Trends</strong>
                        </Link>
                        <Link to="/olympic-lifting" className="glass-card action-tile">
                            <small>Olympic</small>
                            <strong>Weightlifting</strong>
                        </Link>
                    </div>

                    <ActivityFeed />

                    <GoalTracker />

                    <div style={{ marginTop: '2rem', color: 'var(--text-subtle)', fontSize: '0.85rem', textAlign: 'center' }}>
                        IronLogic v2.7.26
                    </div>
                </>
            ) : activeTab === 'mobility' ? (
                <MobilityTab prescription={mobilityRx} />
            ) : (
                <IronLogicTab />
            )}
        </div>
    );
};

export default Home;

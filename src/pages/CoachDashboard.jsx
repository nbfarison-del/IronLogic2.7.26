import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAssignedAthletes } from '../services/firestoreService';
import { Link } from 'react-router-dom';
import * as firestoreService from '../services/firestoreService';
import AISuggestionModal from '../components/AISuggestionModal';
import { SUPER_ADMIN_EMAIL } from '../config/constants';

const CoachDashboard = () => {
    const { user } = useAuth();
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({});
    const [selectedAthleteForAI, setSelectedAthleteForAI] = useState(null);

    useEffect(() => {
        if (user && (user.role === 'coach' || user.role === 'admin')) {
            fetchAthletes();
        }
    }, [user]);

    const fetchAthletes = async () => {
        setLoading(true);
        try {
            let data;
            if (user.email === SUPER_ADMIN_EMAIL) {
                // Master access for super admin
                const allUsers = await firestoreService.getAllRegisteredUsers();
                // Filter out the admin themselves so they aren't coaching themselves (optional, but cleaner)
                data = allUsers.filter(u => u.email !== SUPER_ADMIN_EMAIL);
            } else {
                data = await getAssignedAthletes(user.id);
            }

            // Fetch quick metrics for each athlete in parallel to avoid N+1 slow loading
            const results = await Promise.all(data.map(async (athlete) => {
                try {
                    const [workouts, planned, profile, latestOutcome] = await Promise.all([
                        firestoreService.getWorkouts(athlete.id, 5),
                        firestoreService.getPlannedWorkouts(athlete.id),
                        firestoreService.getUserProfile(athlete.id),
                        firestoreService.getLatestPerformanceOutcome(athlete.id)
                    ]);

                    const lastWorkoutDate = workouts.length > 0 ? new Date(workouts[0].date) : null;
                    const lastWorkout = lastWorkoutDate ? workouts[0].date : 'None yet';
                    const activePlan = planned.length > 0
                        ? planned.sort((a, b) => new Date(b.date) - new Date(a.date))[0].name || 'General'
                        : 'No Plan';

                    // Simplified Compliance: Logged vs Planned in last 7 days
                    const now = new Date();
                    const daysAgo = (date) => (now - new Date(date)) / 86400000;
                    const last7Days = workouts.filter(w => {
                        const diff = daysAgo(w.date);
                        return diff >= 0 && diff <= 7;
                    }).length;
                    const planned7Days = planned.filter(w => {
                        const diff = daysAgo(w.date);
                        return diff >= 0 && diff <= 7;
                    }).length;
                    const compliance = planned7Days > 0 ? Math.min(100, Math.round((last7Days / planned7Days) * 100)) : (last7Days > 0 ? 100 : 0);
                    const daysSinceLastWorkout = lastWorkoutDate ? Math.floor(daysAgo(lastWorkoutDate)) : null;

                    return {
                        id: athlete.id,
                        name: profile?.name || athlete.email.split('@')[0],
                        metrics: {
                            lastWorkout,
                            currentBlock: activePlan,
                            compliance,
                            needsAttention: daysSinceLastWorkout === null || daysSinceLastWorkout >= 7 || compliance < 70,
                            daysSinceLastWorkout,
                            ilmStatus: latestOutcome?.insights ? latestOutcome.insights.replace(/_/g, ' ').toUpperCase() : 'MAINTAINING'
                        }
                    };
                } catch (err) {
                    console.error(`Error fetching data for ${athlete.id}:`, err);
                    return { id: athlete.id, name: athlete.email, metrics: { lastWorkout: 'Error', currentBlock: '-', compliance: 0, ilmStatus: 'UNKNOWN' } };
                }
            }));

            const metricsData = {};
            const namesData = {};
            results.forEach(res => {
                metricsData[res.id] = res.metrics;
                namesData[res.id] = res.name;
            });
            
            setMetrics(metricsData);
            setAthletes(data.map(a => ({ ...a, displayName: namesData[a.id] })).sort((a, b) => {
                const aNeeds = metricsData[a.id]?.needsAttention ? 0 : 1;
                const bNeeds = metricsData[b.id]?.needsAttention ? 0 : 1;
                return aNeeds - bNeeds || (a.displayName || '').localeCompare(b.displayName || '');
            }));
        } catch (error) {
            console.error('Error fetching athletes:', error);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="container" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Coach Dashboard</h1>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Logged in as</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{user?.email}</div>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {loading ? (
                    <div className="card">Loading athletes...</div>
                ) : athletes.length > 0 ? (
                    athletes.map(athlete => (
                        <div key={athlete.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)', textTransform: 'capitalize' }}>{athlete.displayName}</h2>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{athlete.email}</div>
                                <span style={{ fontSize: '0.6rem', color: '#555' }}>ID: {athlete.id}</span>
                                {metrics[athlete.id]?.needsAttention && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#ff9800', fontWeight: 'bold' }}>
                                        Needs coach review
                                    </div>
                                )}
                                <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                                    ILM Status: {metrics[athlete.id]?.ilmStatus || 'UNKNOWN'}
                                </div>
                            </div>


                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Workout</div>
                                    <div style={{ fontSize: '0.9rem' }}>{metrics[athlete.id]?.lastWorkout}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Block</div>
                                    <div style={{ fontSize: '0.9rem' }}>{metrics[athlete.id]?.currentBlock}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compliance</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{metrics[athlete.id]?.compliance}%</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                {/* Primary action: Write Program */}
                                <Link
                                    to={`/coach/plan/${athlete.id}`}
                                    className="btn btn-primary"
                                    style={{ flex: '1 1 100%', fontSize: '0.9rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--primary), #d97706)', border: 'none', padding: '0.75rem', fontWeight: 'bold' }}
                                >
                                    ⚡ Pro Planner (Sprint Mode)
                                </Link>

                                {/* Secondary actions */}
                                <Link to={`/coach/athlete/${athlete.id}`} className="btn" style={{ flex: 1, fontSize: '0.75rem', textAlign: 'center', minWidth: '80px' }}>
                                    Workout History
                                </Link>
                                <Link to={`/coach/checkin/${athlete.id}`} className="btn" style={{ flex: 1, fontSize: '0.75rem', background: '#2e7d32', border: 'none', textAlign: 'center', color: 'white' }}>
                                    Weekly Review
                                </Link>
                                <Link to={`/coach/adaptive/${athlete.id}`} className="btn" style={{ flex: 1, fontSize: '0.75rem', background: '#333', border: 'none', textAlign: 'center' }}>
                                    ILM Status
                                </Link>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: '1 1 100%', fontSize: '0.8rem', background: 'linear-gradient(135deg, #2196f3, #9c27b0)', border: 'none' }}
                                    onClick={() => setSelectedAthleteForAI(athlete)}
                                >
                                    ✨ Chat with AI Coach
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', border: '2px dashed #333' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'grayscale(1) opacity(0.5)' }}>👥</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Your Roster is Empty</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
                            You haven't been assigned any athletes yet. Once assigned, you'll be able to program, review logs, and use the AI coach.
                        </p>
                        <div style={{ padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', display: 'inline-block', border: '1px solid var(--primary)' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Action Required:</span> Contact <strong>admin@ironlogic.app</strong> to assign athletes.
                        </div>
                    </div>
                )}

            </div>

            {selectedAthleteForAI && (
                <AISuggestionModal
                    athlete={selectedAthleteForAI}
                    onClose={() => setSelectedAthleteForAI(null)}
                />
            )}
        </div>
    );
};

export default CoachDashboard;

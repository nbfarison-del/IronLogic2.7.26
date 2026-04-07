import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAssignedAthletes, getWorkouts } from '../services/firestoreService';
import { Link } from 'react-router-dom';
import * as firestoreService from '../services/firestoreService';
import AISuggestionModal from '../components/AISuggestionModal';

const CoachDashboard = () => {
    const { user } = useAuth();
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({});
    const [selectedAthleteForAI, setSelectedAthleteForAI] = useState(null);

    useEffect(() => {
        if (user) {
            fetchAthletes();
        }
    }, [user]);

    const fetchAthletes = async () => {
        setLoading(true);
        try {
            let data;
            if (user.email === 'nbfarison@gmail.com') {
                // Master access for super admin
                const allUsers = await firestoreService.getAllRegisteredUsers();
                // Filter out the admin themselves so they aren't coaching themselves (optional, but cleaner)
                data = allUsers.filter(u => u.email !== 'nbfarison@gmail.com');
            } else {
                data = await getAssignedAthletes(user.id);
            }

            setAthletes(data);

            // Fetch quick metrics for each athlete
            const metricsData = {};
            for (const athlete of data) {
                const [workouts, planned] = await Promise.all([
                    firestoreService.getWorkouts(athlete.id, 1),
                    firestoreService.getPlannedWorkouts(athlete.id)
                ]);

                const lastWorkout = workouts.length > 0 ? workouts[0].date : 'None yet';

                // Find nearest upcoming or recent planned workout name as "Block/Phase"
                const activePlan = planned.length > 0
                    ? planned.sort((a, b) => new Date(b.date) - new Date(a.date))[0].planName || 'General'
                    : 'No Plan';

                metricsData[athlete.id] = {
                    lastWorkout,
                    currentBlock: activePlan,
                    compliance: workouts.length > 0 ? 90 : 0 // Still placeholder
                };
            }
            setMetrics(metricsData);
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
                                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{athlete.email}</h2>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {athlete.id}</span>
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
                                <Link to={`/coach/athlete/${athlete.id}`} className="btn" style={{ flex: 1, fontSize: '0.75rem', textAlign: 'center', minWidth: '80px' }}>
                                    History
                                </Link>
                                <Link to={`/calendar/${athlete.id}`} className="btn" style={{ flex: 1, fontSize: '0.75rem', textAlign: 'center', minWidth: '80px' }}>
                                    Edit
                                </Link>
                                <Link to={`/coach/adaptive/${athlete.id}`} className="btn" style={{ flex: 1, fontSize: '0.75rem', background: '#333', border: 'none', textAlign: 'center' }}>
                                    ILM Status
                                </Link>
                                <Link to={`/coach/checkin/${athlete.id}`} className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem', background: '#4caf50', border: 'none', textAlign: 'center' }}>
                                    Weekly Review
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
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                        <h3>No Athletes Assigned</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Contact an administrator to assign athletes to your profile.</p>
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';
import { getFirestore, clearIndexedDbPersistence } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';


const Profile = () => {
    const { user } = useAuth();
    const { unit, toggleUnit } = useSettings();
    const {
        workouts,
        weights,
        recovery,
        goals,
        plannedWorkouts,
        notesHistory,
        profile,
        trainingMaxes: syncedMaxes,
        isLoading,
        syncStatus,
        syncTimestamps,
        syncError
    } = useData();

    const counts = {
        workouts: workouts?.length || 0,
        weights: weights?.length || 0,
        recovery: recovery?.length || 0,
        goals: goals?.length || 0,
        planned: plannedWorkouts?.length || 0,
        notes: notesHistory?.length || 0
    };

    const { showToast } = useToast();
    const [maxes, setMaxes] = useState({
        squat: '',
        bench: '',
        deadlift: '',
        ohp: '',
        clean: '',
        snatch: '',
        cleanAndJerk: ''
    });
    const [defineData, setDefineData] = useState({
        age: '',
        sex: '',
        sport: '',
        trainingAge: '',
        primaryGoal: '',
        secondaryGoals: '',
        trainingPhase: 'general',
        daysAvailable: '',
        sessionLength: '',
        injuryHistory: '',
        movementLimitations: '',
        travelSchedule: '',
        priorityStrength: '',
        priorityPower: '',
        priorityEndurance: '',
        priorityHypertrophy: '',
        occupationStress: 'low',
        equipment: 'full_gym'
    });
    const [confirmRefresh, setConfirmRefresh] = useState(false);


    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (syncedMaxes) {
                setMaxes(syncedMaxes);
            }
            if (profile) {
                setDefineData({
                    age: profile.age || '',
                    sex: profile.sex || '',
                    sport: profile.sport || '',
                    trainingAge: profile.trainingAge || '',
                    primaryGoal: profile.primaryGoal || '',
                    secondaryGoals: profile.secondaryGoals || '',
                    trainingPhase: profile.trainingPhase || 'general',
                    daysAvailable: profile.daysAvailable || '',
                    sessionLength: profile.sessionLength || '',
                    injuryHistory: profile.injuryHistory || '',
                    movementLimitations: profile.movementLimitations || '',
                    travelSchedule: profile.travelSchedule || '',
                    priorityStrength: profile.priorityStrength || '',
                    priorityPower: profile.priorityPower || '',
                    priorityEndurance: profile.priorityEndurance || '',
                    priorityHypertrophy: profile.priorityHypertrophy || '',
                    occupationStress: profile.occupationStress || 'low',
                    equipment: profile.equipment || 'full_gym'
                });
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [syncedMaxes, profile]);

    const handleForceRefresh = async () => {
        if (!confirmRefresh) {
            setConfirmRefresh(true);
            setTimeout(() => setConfirmRefresh(false), 3000);
            return;
        }

        try {
            showToast("Wiping local cache...", "info");
            localStorage.clear();
            const db = getFirestore();
            await clearIndexedDbPersistence(db);
            window.location.href = '/';
        } catch (err) {
            console.error('Refresh error:', err);
            showToast('Failed to clear cache. Reloading...', 'error');
            window.location.reload();
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setMaxes(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            await firestoreService.updateUserProfile(user.id, { 
                trainingMaxes: maxes, 
                maxes,
                ...defineData
            });
            showToast('Profile saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast('Failed to save. Please try again.', 'error');
        }
    };


    if (isLoading) {
        return <div className="card">Syncing profiles...</div>;
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left', paddingBottom: '5.5rem' }}>
            <h1>Lifter Profile</h1>
            <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <p className="page-kicker" style={{ margin: 0 }}>Library</p>
                    <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>My Templates</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Saved programs, exportable as JSON.</div>
                </div>
                <Link to="/templates" className="btn">Open</Link>
            </div>
            <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                Enter your current tested 1 Rep Maxes. These will be used to track your progress against your daily sets.
            </p>



            <div className="card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSave}>
                    <h2>Phase 1: Define (Context & Goals)</h2>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label>Age</label>
                            <input type="number" value={defineData.age} onChange={e => setDefineData({...defineData, age: e.target.value})} />
                        </div>
                        <div className="input-group">
                            <label>Sex</label>
                            <select value={defineData.sex} onChange={e => setDefineData({...defineData, sex: e.target.value})}>
                                <option value="">Select...</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Sport / Discipline</label>
                        <input type="text" value={defineData.sport} onChange={e => setDefineData({...defineData, sport: e.target.value})} placeholder="e.g. Powerlifting, Olympic weightlifting" />
                    </div>

                    <div className="input-group">
                        <label>Training Age</label>
                        <select value={defineData.trainingAge} onChange={e => setDefineData({...defineData, trainingAge: e.target.value})}>
                            <option value="novice">Novice (&lt;1 year)</option>
                            <option value="intermediate">Intermediate (1-3 years)</option>
                            <option value="advanced">Advanced (3-5 years)</option>
                            <option value="elite">Elite (5+ years)</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Primary Goal</label>
                        <input type="text" value={defineData.primaryGoal} onChange={e => setDefineData({...defineData, primaryGoal: e.target.value})} placeholder="e.g. Max Squat Strength" />
                    </div>

                    <div className="input-group">
                        <label>Secondary Goals</label>
                        <textarea value={defineData.secondaryGoals} onChange={e => setDefineData({...defineData, secondaryGoals: e.target.value})} placeholder="e.g. Maintain aerobic fitness, improve vertical jump" style={{ minHeight: '70px' }} />
                    </div>

                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label>Current Training Phase</label>
                            <select value={defineData.trainingPhase} onChange={e => setDefineData({...defineData, trainingPhase: e.target.value})}>
                                <option value="general">General Preparation</option>
                                <option value="strength">Strength Emphasis</option>
                                <option value="power">Power / Explosive Emphasis</option>
                                <option value="hypertrophy">Hypertrophy Emphasis</option>
                                <option value="endurance">Endurance Emphasis</option>
                                <option value="hybrid">Hybrid / Concurrent</option>
                                <option value="deload">Deload / Restoration</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Training Days Available</label>
                            <input type="number" min="1" max="7" value={defineData.daysAvailable} onChange={e => setDefineData({...defineData, daysAvailable: e.target.value})} placeholder="e.g. 4" />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Typical Session Length</label>
                        <input type="text" value={defineData.sessionLength} onChange={e => setDefineData({...defineData, sessionLength: e.target.value})} placeholder="e.g. 60 minutes" />
                    </div>

                    <div className="input-group">
                        <label>Injury History / Pain Considerations</label>
                        <textarea value={defineData.injuryHistory} onChange={e => setDefineData({...defineData, injuryHistory: e.target.value})} placeholder="Relevant injuries, pain triggers, or medical restrictions" style={{ minHeight: '70px' }} />
                    </div>

                    <div className="input-group">
                        <label>Movement Limitations</label>
                        <textarea value={defineData.movementLimitations} onChange={e => setDefineData({...defineData, movementLimitations: e.target.value})} placeholder="Mobility limits, technique constraints, unavailable movements" style={{ minHeight: '70px' }} />
                    </div>

                    <div className="input-group">
                        <label>Travel / Schedule Constraints</label>
                        <input type="text" value={defineData.travelSchedule} onChange={e => setDefineData({...defineData, travelSchedule: e.target.value})} placeholder="e.g. travel every other week, rotating shifts" />
                    </div>

                    <h3>Priority Domains</h3>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {[
                            ['priorityStrength', 'Strength'],
                            ['priorityPower', 'Power'],
                            ['priorityEndurance', 'Endurance'],
                            ['priorityHypertrophy', 'Hypertrophy']
                        ].map(([key, label]) => (
                            <div className="input-group" key={key}>
                                <label>{label}</label>
                                <select value={defineData[key]} onChange={e => setDefineData({...defineData, [key]: e.target.value})}>
                                    <option value="">Not prioritized</option>
                                    <option value="primary">Primary</option>
                                    <option value="secondary">Secondary</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="input-group">
                        <label>Occupational Fatigue</label>
                        <select value={defineData.occupationStress} onChange={e => setDefineData({...defineData, occupationStress: e.target.value})}>
                            <option value="low">Low (Sedentary/Low Stress)</option>
                            <option value="moderate">Moderate (Active/Moderate Stress)</option>
                            <option value="high">High (Manual Labor/High Stress)</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Equipment Access</label>
                        <select value={defineData.equipment} onChange={e => setDefineData({...defineData, equipment: e.target.value})}>
                            <option value="full_gym">Full Commercial Gym</option>
                            <option value="garage_gym">Garage Gym (Rack/Barbell)</option>
                            <option value="minimal">Minimal (Dumbbells/Kettlebells)</option>
                        </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                        Save Context
                    </button>
                </form>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2>App Settings</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Preferred Unit:</label>
                    <button type="button" onClick={toggleUnit} className="btn" style={{ minWidth: '80px' }}>
                        {unit.toUpperCase()}
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSave}>
                    <h2>Current Training Maxes</h2>

                    <div className="input-group">
                        <label>Squat</label>
                        <input
                            type="number"
                            name="squat"
                            value={maxes.squat || ''}
                            onChange={handleChange}
                            placeholder="e.g. 315"
                        />
                    </div>

                    <div className="input-group">
                        <label>Bench Press</label>
                        <input
                            type="number"
                            name="bench"
                            value={maxes.bench || ''}
                            onChange={handleChange}
                            placeholder="e.g. 225"
                        />
                    </div>

                    <div className="input-group">
                        <label>Deadlift</label>
                        <input
                            type="number"
                            name="deadlift"
                            value={maxes.deadlift || ''}
                            onChange={handleChange}
                            placeholder="e.g. 405"
                        />
                    </div>

                    <div className="input-group">
                        <label>Overhead Press (OHP)</label>
                        <input
                            type="number"
                            name="ohp"
                            value={maxes.ohp || ''}
                            onChange={handleChange}
                            placeholder="e.g. 135"
                        />
                    </div>

                    <div className="input-group">
                        <label>Clean</label>
                        <input
                            type="number"
                            name="clean"
                            value={maxes.clean || ''}
                            onChange={handleChange}
                            placeholder="e.g. 225"
                        />
                    </div>

                    <div className="input-group">
                        <label>Snatch</label>
                        <input
                            type="number"
                            name="snatch"
                            value={maxes.snatch || ''}
                            onChange={handleChange}
                            placeholder="e.g. 175"
                        />
                    </div>

                    <div className="input-group">
                        <label>Clean and Jerk</label>
                        <input
                            type="number"
                            name="cleanAndJerk"
                            value={maxes.cleanAndJerk || ''}
                            onChange={handleChange}
                            placeholder="e.g. 205"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                        Save Profile
                    </button>
                </form>
            </div>

            {/* SYNC DIAGNOSTICS - Only for Coaches/Admins or specialized debugging */}
            {(user?.role === 'coach' || user?.role === 'admin') && (
                <div className="card" style={{ border: '1px solid #444', background: '#1a1a1a' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--primary)' }}>Sync Diagnostics</h3>


                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Account:</span>
                        <span style={{ color: '#888' }}>{user?.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>User ID:</span>
                        <span style={{ color: '#888', fontSize: '0.7rem' }}>{user?.id ? `${user.id.substring(0, 8)}...` : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Firestore Status:</span>
                        <span style={{ color: syncStatus === 'online' ? '#4caf50' : '#f44336' }}>
                            {syncStatus?.toUpperCase() || 'UNKNOWN'}
                        </span>
                    </div>

                    {syncError && (
                        <div style={{ padding: '0.5rem', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '4px', color: '#f44336', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                            <strong>Sync Error:</strong> {syncError}
                        </div>
                    )}

                    <div style={{ marginTop: '1rem', borderTop: '1px solid #333' }}>
                        <div style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Last Received Updates:</div>
                        {Object.entries(syncTimestamps || {}).length === 0 ? (
                            <div style={{ color: '#666' }}>No live updates received yet.</div>
                        ) : (
                            Object.entries(syncTimestamps).map(([key, time]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                    <span style={{ textTransform: 'capitalize' }}>{key} ({counts[key] || 0}):</span>
                                    <span style={{ color: '#aaa' }}>{time}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={handleForceRefresh}
                        className="btn"
                        style={{
                            marginTop: '1.5rem',
                            width: '100%',
                            background: confirmRefresh ? 'var(--accent-error)' : '#333',
                            color: confirmRefresh ? '#fff' : 'inherit',
                            fontSize: '0.8rem',
                            padding: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {confirmRefresh ? '⚠️ Confirm Wipe & Reload?' : 'Hard Refresh Sync'}
                    </button>

                    <p style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
                        Clears local cache and reloads from server
                    </p>
                </div>
            </div>
        )}
    </div>
);
};


export default Profile;

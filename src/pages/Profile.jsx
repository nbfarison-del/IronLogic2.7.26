import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';

console.log('--- Profile Module Initialized ---');
console.log('useAuth:', typeof useAuth);
console.log('useSettings:', typeof useSettings);

const Profile = () => {
    const { user } = useAuth();
    const { unit, toggleUnit } = useSettings();
    const { maxes: syncedMaxes, isLoading, syncStatus, syncTimestamps } = useData();

    const [maxes, setMaxes] = useState(syncedMaxes || {
        squat: '',
        bench: '',
        deadlift: '',
        ohp: ''
    });
    const [notifications, setNotifications] = useState('');

    // Sync local state when global stream updates (Live Sync)
    useEffect(() => {
        if (syncedMaxes) {
            setMaxes(syncedMaxes);
        }
    }, [syncedMaxes]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setMaxes(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            await firestoreService.updateUserProfile(user.id, { maxes });
            setNotifications('Maxes saved successfully!');
            setTimeout(() => setNotifications(''), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            setNotifications('Failed to save. Please try again.');
            setTimeout(() => setNotifications(''), 3000);
        }
    };

    if (isLoading) {
        return <div className="card">Syncing profiles...</div>;
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
            <h1>Lifter Profile</h1>
            <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                Enter your current tested 1 Rep Maxes. These will be used to track your progress against your daily sets.
            </p>

            {notifications && (
                <div style={{ padding: '1rem', background: '#2e7d32', color: 'white', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
                    {notifications}
                </div>
            )}

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2>App Settings</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Preferred Unit:</label>
                    <button type="button" onClick={toggleUnit} className="btn" style={{ minWidth: '80px' }}>
                        {unit.toUpperCase()}
                    </button>
                </div>
            </div>

            <div className="card">
                <form onSubmit={handleSave}>
                    <h2>Current Training Maxes</h2>

                    <div className="input-group">
                        <label>Squat</label>
                        <input
                            type="number"
                            name="squat"
                            value={maxes.squat}
                            onChange={handleChange}
                            placeholder="e.g. 315"
                        />
                    </div>

                    <div className="input-group">
                        <label>Bench Press</label>
                        <input
                            type="number"
                            name="bench"
                            value={maxes.bench}
                            onChange={handleChange}
                            placeholder="e.g. 225"
                        />
                    </div>

                    <div className="input-group">
                        <label>Deadlift</label>
                        <input
                            type="number"
                            name="deadlift"
                            value={maxes.deadlift}
                            onChange={handleChange}
                            placeholder="e.g. 405"
                        />
                    </div>

                    <div className="input-group">
                        <label>Overhead Press (OHP)</label>
                        <input
                            type="number"
                            name="ohp"
                            value={maxes.ohp}
                            onChange={handleChange}
                            placeholder="e.g. 135"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                        Save Profile
                    </button>
                </form>
            </div>
            <div className="card" style={{ marginTop: '2rem', border: '1px solid #444', opacity: 0.8 }}>
                <h3 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    Sync Diagnostics
                    <span style={{ color: syncStatus === 'online' ? '#4caf50' : '#f44336' }}>● {syncStatus.toUpperCase()}</span>
                </h3>

                <div style={{ fontSize: '0.75rem', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                        <span>User ID:</span>
                        <span style={{ fontFamily: 'monospace' }}>{user.uid.slice(0, 15)}...</span>
                    </div>

                    {Object.entries(syncTimestamps).map(([key, time]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Last {key}:</span>
                            <span style={{ color: 'var(--primary)' }}>{time}</span>
                        </div>
                    ))}

                    <button
                        className="btn"
                        style={{ fontSize: '0.7rem', marginTop: '1rem', padding: '4px 8px', background: 'transparent', border: '1px solid #666' }}
                        onClick={() => {
                            if (confirm('Clear local cache and refresh?')) {
                                localStorage.removeItem('ironlogic_bootstrap_cache');
                                window.location.reload();
                            }
                        }}
                    >
                        Force Cache Refresh
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;

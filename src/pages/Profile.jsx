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
    const { maxes: syncedMaxes, isLoading } = useData();

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
        </div>
    );
};

export default Profile;

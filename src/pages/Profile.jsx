import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';
import { getFirestore, clearIndexedDbPersistence, terminate } from 'firebase/firestore';

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
        maxes: syncedMaxes,
        isLoading,
        syncStatus
    } = useData();

    const [maxes, setMaxes] = useState({
        squat: '',
        bench: '',
        deadlift: '',
        ohp: ''
    });
    const [notifications, setNotifications] = useState('');

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

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                        Save Profile
                    </button>
                </form>
            </div>

            {/* SYNC & MAINTENANCE */}
            <div className="card" style={{ border: '1px solid #444', background: '#1a1a1a' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--primary)' }}>System Status</h3>

                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Account:</span>
                        <span style={{ color: '#888' }}>{user?.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>App Version:</span>
                        <span style={{ color: '#00e676', fontWeight: 'bold' }}>v3.0.0 (Stable)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Status:</span>
                        <span style={{ color: syncStatus === 'online' ? '#4caf50' : '#f44336' }}>
                            {syncStatus?.toUpperCase() || 'STABLE'}
                        </span>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={async () => {
                            try {
                                await firestoreService.forceSyncNetwork();
                                alert('Network sync resumed! Checking for uploads...');
                            } catch (err) {
                                alert('Failed to resume network.');
                            }
                        }}
                        className="btn"
                        style={{
                            flex: 1,
                            fontSize: '0.8rem',
                            padding: '0.5rem',
                            background: '#222',
                            border: '1px solid #444'
                        }}
                    >
                        Resume Sync
                    </button>
                    <button
                        onClick={async () => {
                            if (window.confirm('PURGE SYSTEM: This will unregister all Service Workers and wipe LocalStorage. Use this if the site feels "stale" or old versions keep coming back. Continue?')) {
                                try {
                                    if ('serviceWorker' in navigator) {
                                        const registrations = await navigator.serviceWorker.getRegistrations();
                                        for (let registration of registrations) {
                                            await registration.unregister();
                                        }
                                    }
                                    localStorage.clear();
                                    const dbInstance = getFirestore();
                                    await terminate(dbInstance);
                                    await clearIndexedDbPersistence(dbInstance);

                                    alert('System Purged! Refreshing...');
                                    window.location.reload();
                                } catch (err) {
                                    window.location.reload();
                                }
                            }
                        }}
                        className="btn"
                        style={{
                            flex: 2,
                            fontSize: '0.8rem',
                            padding: '0.5rem',
                            background: '#311b92',
                            border: '1px solid #7e57c2'
                        }}
                    >
                        Hard Reset App
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;

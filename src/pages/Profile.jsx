import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';
import { getFirestore, clearIndexedDbPersistence } from 'firebase/firestore';

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

    const [maxes, setMaxes] = useState({
        squat: '',
        bench: '',
        deadlift: '',
        ohp: ''
    });
    const [notifications, setNotifications] = useState('');

    const [isTesting, setIsTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Idle');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (syncedMaxes) {
            setMaxes(syncedMaxes);
        }
    }, [syncedMaxes]);

    // Browser-robust YYYY-MM-DD
    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const handleTestConnection = async () => {
        if (!user || !user.id) {
            setError('User session invalid');
            return;
        }

        setIsTesting(true);
        setConnectionStatus('Testing...');
        setError(null);

        try {
            const result = await firestoreService.testFirestoreConnection(user.id);
            if (result.success) {
                setConnectionStatus('Online');
                setError(null);
            } else {
                setConnectionStatus('Failed');
                setError(`${result.code}: ${result.message}`);
            }
        } catch (err) {
            setConnectionStatus('Error');
            setError(err.message);
        } finally {
            setIsTesting(false);
        }
    };

    const handleForceRefresh = async () => {
        if (window.confirm('This will wipe all local caches (including Firebase persistence) and force a full reload. Continue?')) {
            try {
                localStorage.clear();
                const db = getFirestore();
                await clearIndexedDbPersistence(db);
                // Redirect to root to avoid 404 on re-load
                window.location.href = '/';
            } catch (err) {
                console.error('Refresh error:', err);
                window.location.reload();
            }
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

            {/* SYNC DIAGNOSTICS - Super Safe Version */}
            <div className="card" style={{ border: '1px solid #444', background: '#1a1a1a' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--primary)' }}>Sync Diagnostics</h3>

                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Account:</span>
                        <span style={{ color: '#888' }}>{user?.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>User ID:</span>
                        <span style={{ color: '#888', fontSize: '0.65rem', wordBreak: 'break-all', marginLeft: '1rem' }}>{user?.id || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>App Version:</span>
                        <span style={{ color: '#00e676', fontWeight: 'bold' }}>v2.0.2 (Super Trace)</span>
                    </div>

                    {/* Tier 1: Connection Trace (The Truth) */}
                    <div style={{ margin: '8px 0', padding: '8px', background: '#212121', borderRadius: '4px', border: '1px solid #ff5252' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ff5252' }}>⚠️ FIREBASE AUTH TRACE</span>
                        </div>
                        <div style={{ fontSize: '0.65rem' }}>
                            Status: <span style={{ color: connectionStatus === 'Online' ? '#00e676' : '#ff5252' }}>{connectionStatus || 'Idle'}</span>
                        </div>
                        {error && (
                            <div style={{ marginTop: '4px', padding: '4px', background: '#000', color: '#ff5252', fontSize: '0.6rem', fontFamily: 'monospace', overflow: 'auto' }}>
                                ERROR: {error}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Hostname:</span>
                        <span style={{ color: '#888', fontSize: '0.65rem' }}>{window.location.hostname}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Env Config:</span>
                        <span style={{ color: import.meta.env.VITE_FIREBASE_API_KEY ? '#00e676' : '#ff5252', fontWeight: 'bold' }}>
                            {import.meta.env.VITE_FIREBASE_API_KEY ? 'DETECTED ✅' : 'MISSING ❌'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>System Time:</span>
                        <span style={{ color: '#888' }}>{new Date().toLocaleTimeString()}</span>
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
                            Object.entries(syncTimestamps).map(([key, meta]) => (
                                <div key={key} style={{ padding: '5px 0', borderBottom: '1px solid #222' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{key} ({counts[key] || 0}):</span>
                                        <span style={{ color: '#aaa', fontSize: '0.75rem' }}>{meta.time}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2px', fontSize: '0.7rem' }}>
                                        <span style={{ color: meta.fromCache ? '#ffa726' : '#4caf50' }}>
                                            {meta.fromCache ? '● Local Cache' : '● Cloud Verified'}
                                        </span>
                                        {meta.hasPendingWrites && (
                                            <span style={{ color: '#f44336', fontWeight: 'bold' }}>
                                                ⚠️ {meta.pendingCount || 'Pending'} Upload
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <button
                            onClick={handleForceRefresh}
                            className="btn"
                            style={{
                                flex: 2,
                                background: '#333',
                                fontSize: '0.8rem',
                                padding: '0.5rem'
                            }}
                        >
                            Hard Refresh Sync
                        </button>
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="btn btn-primary"
                            style={{
                                flex: 3,
                                background: connectionStatus === 'Online' ? '#00e676' : '#1e3a8a',
                                fontSize: '0.8rem',
                                padding: '0.5rem',
                                color: 'white',
                                cursor: isTesting ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isTesting ? 'Testing...' : 'Test Cloud Connection'}
                        </button>
                    </div>

                    {error && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    const diag = `v2.0.0 | ${window.location.hostname} | ${error}`;
                                    navigator.clipboard.writeText(diag);
                                    alert('Diagnostic Report copied!');
                                }}
                                style={{
                                    width: '100%',
                                    fontSize: '0.65rem',
                                    background: '#111',
                                    padding: '4px',
                                    border: '1px solid #ff5252',
                                    color: '#ff5252'
                                }}
                            >
                                Copy Trace Report 📋
                            </button>
                        </div>
                    )}
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
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
                        Resume Network
                    </button>
                    <button
                        onClick={async () => {
                            if (window.confirm('PURGE EVERYTHING: This will unregister all Service Workers and wipe LocalStorage. Use this if the site feels "stale" or old versions keep coming back. Continue?')) {
                                try {
                                    // 1. Unregister Service Workers
                                    if ('serviceWorker' in navigator) {
                                        const registrations = await navigator.serviceWorker.getRegistrations();
                                        for (let registration of registrations) {
                                            await registration.unregister();
                                        }
                                    }
                                    // 2. Clear Local Storage
                                    localStorage.clear();
                                    // 3. Firestore reset (if possible)
                                    const { terminate, clearIndexedDbPersistence } = await import('firebase/firestore');
                                    const dbInstance = (await import('../config/firebaseConfig')).db;
                                    await terminate(dbInstance);
                                    await clearIndexedDbPersistence(dbInstance);

                                    alert('System Purged! Refreshing...');
                                    window.location.href = '/profile';
                                } catch (err) {
                                    alert('Purge had issues. Hard Refreshing instead.');
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
                        Purge Cache & Workers
                    </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
                    Test Connection reveals the EXACT error code blocking your sync.
                </p>
            </div>
        </div>
    );
};

export default Profile;

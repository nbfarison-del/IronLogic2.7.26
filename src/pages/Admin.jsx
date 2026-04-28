import { useState, useEffect } from 'react';
import { getAllRegisteredUsers, updateUserRole, assignAthleteToCoach, updateUserRole as syncRole, addProgramTemplate } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { advancedTemplates } from '../data/advancedTemplates';



const Admin = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [syncDone, setSyncDone] = useState(false);




    const ADMIN_EMAIL = 'nbfarison@gmail.com';

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchUsers();
        }
    }, [user]);

    // One-time fix: write role:admin to Firestore so the admin appears in coach dropdowns
    const handleSyncAdminRole = async () => {
        if (!user?.id) return;
        try {
            await syncRole(user.id, 'admin');
            await fetchUsers(); // Refresh list
            showToast('Done! Account synchronized successfully.', 'success');
        } catch (err) {
            console.error('Sync failed:', err);
            showToast('Sync failed: ' + err.message, 'error');
        }
    };


    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getAllRegisteredUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load registered users.');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        if (user.email !== ADMIN_EMAIL) {
            showToast('Permission denied.', 'error');
            return;
        }

        setUpdatingId(userId);
        try {
            await updateUserRole(userId, newRole);
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast('Role updated successfully.', 'success');
        } catch (err) {
            console.error('Error updating role:', err);
            showToast('Failed to update role', 'error');
        } finally {
            setUpdatingId(null);
        }
    };


    const handleCoachAssign = async (athleteId, coachId) => {
        if (user.email !== ADMIN_EMAIL) {
            showToast('Permission denied.', 'error');
            return;
        }

        setUpdatingId(athleteId);
        try {
            await assignAthleteToCoach(athleteId, coachId);
            setUsers(users.map(u => u.id === athleteId ? { ...u, coach_id: coachId } : u));
        } catch (err) {
            console.error('Error assigning coach:', err);
            showToast('Failed to assign coach', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    if (!user || user.role !== 'admin' || user.email !== ADMIN_EMAIL) {
        return <Navigate to="/" replace />;
    }

    // Build coaches list — always inject the admin account using the live user.id from auth
    // so the dropdown works even before Firestore has role:admin stored.
    const coachesFromDB = users.filter(u => u.role === 'coach' || u.role === 'admin');
    const adminAlreadyInList = coachesFromDB.some(c => c.email === ADMIN_EMAIL);
    const coaches = adminAlreadyInList
        ? coachesFromDB
        : [
            { id: user.id, email: ADMIN_EMAIL, role: 'admin' },
            ...coachesFromDB
          ];
    console.log('[Admin] coaches list:', coaches.map(c => c.email));

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>

                <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!syncDone && (
                        <button
                            className="btn btn-primary"
                            onClick={handleSyncAdminRole}
                            style={{ fontSize: '0.8rem', background: '#ff9800', border: 'none' }}
                        >
                            ⚡ Sync Admin Role to Firestore
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={fetchUsers}
                        disabled={loading}
                        style={{ fontSize: '0.8rem' }}
                    >
                        {loading ? 'Refreshing...' : 'Refresh List'}
                    </button>

                </div>
            </div>


            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Registered Users ({users.length})</h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>User</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Coach Assignment</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subscription</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((u) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: updatingId === u.id ? 0.5 : 1 }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold' }}>{u.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.id}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <select
                                                value={u.role || 'athlete'}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                style={{ padding: '4px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                                                disabled={updatingId === u.id || (u.role === 'admin' && user.email !== ADMIN_EMAIL)}
                                            >
                                                <option value="athlete">Athlete</option>
                                                <option value="coach">Coach</option>
                                                {(user.email === ADMIN_EMAIL || u.role === 'admin') && (
                                                    <option value="admin">Admin</option>
                                                )}
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {(u.role === 'athlete' || (!u.role)) && (
                                                <select
                                                    value={u.coach_id || ''}
                                                    onChange={(e) => handleCoachAssign(u.id, e.target.value)}
                                                    style={{ padding: '4px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', width: '100%' }}
                                                    disabled={updatingId === u.id}
                                                >
                                                    <option value="">No Coach</option>
                                                    {coaches.map(c => (
                                                        <option key={c.id} value={c.id}>{c.email} ({c.role})</option>
                                                    ))}
                                                </select>
                                            )}
                                            {u.role === 'coach' && <span style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>Is Coach</span>}
                                            {(u.role === 'admin' || u.email === ADMIN_EMAIL) && (
                                                <span style={{ color: '#ff9800', fontSize: '0.8rem', fontWeight: 'bold' }}>Is Coach (Admin)</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.7rem',
                                                background: 'rgba(255,255,255,0.1)'
                                            }}>
                                                {u.subscription_status || 'beta'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {loading ? 'Loading users...' : 'No users found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {error && (
                <div style={{ marginTop: '1rem', color: 'var(--danger)', textAlign: 'center' }}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default Admin;

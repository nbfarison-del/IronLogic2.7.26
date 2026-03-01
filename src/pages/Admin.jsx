import { useState, useEffect } from 'react';
import { getAllRegisteredUsers } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Admin = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const ADMIN_EMAIL = 'nbfarison@gmail.com';

    useEffect(() => {
        if (user && user.email === ADMIN_EMAIL) {
            fetchUsers();
        }
    }, [user]);

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

    if (!user || user.email !== ADMIN_EMAIL) {
        return <Navigate to="/" />;
    }

    return (
        <div className="container" style={{ padding: '1rem' }}>
            <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
                <button
                    className="btn btn-secondary"
                    onClick={fetchUsers}
                    disabled={loading}
                    style={{ fontSize: '0.8rem' }}
                >
                    {loading ? 'Refreshing...' : 'Refresh List'}
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Registered Users ({users.length})</h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email/ID</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Signup Date</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((u) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold' }}>{u.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.id}</div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                            {u.signupDate ? new Date(u.signupDate).toLocaleDateString() : 'N/A'}<br />
                                            <small style={{ color: 'var(--text-muted)' }}>
                                                {u.signupDate ? new Date(u.signupDate).toLocaleTimeString() : ''}
                                            </small>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.7rem',
                                                background: u.role === 'admin' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                color: u.role === 'admin' ? '#000' : 'inherit'
                                            }}>
                                                {u.role || 'user'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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

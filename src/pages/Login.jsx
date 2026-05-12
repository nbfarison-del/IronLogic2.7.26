import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/');
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(getFriendlyErrorMessage(err, 'Failed to login. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="card auth-card">
                <p className="page-kicker">IronLogic</p>
                <h1>Welcome back</h1>
                <p className="auth-subtitle">Sign in to continue training, planning, and reviewing performance.</p>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="******"
                        />
                    </div>
                    {error && <div className="empty-state" style={{ color: 'var(--accent-error)', marginBottom: '1rem' }}>{error}</div>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <div style={{ marginTop: '1.25rem', display: 'grid', gap: '0.7rem', fontSize: '0.92rem', textAlign: 'center' }}>
                    <Link to="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>Forgot password?</Link>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                        New to IronLogic? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>Create an account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

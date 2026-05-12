import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { recordUserSignup } from '../services/firestoreService';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/');
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await register(email, password);
            if (result && result.user) {
                await recordUserSignup(result.user.uid, email);
            }
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(getFriendlyErrorMessage(err, 'Failed to create account. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="card auth-card">
                <p className="page-kicker">Start Training</p>
                <h1>Create account</h1>
                <p className="auth-subtitle">Build your profile, log sessions, and keep your training history in one place.</p>
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
                            placeholder="Minimum 6 characters"
                        />
                    </div>
                    {error && <div className="empty-state" style={{ color: 'var(--accent-error)', marginBottom: '1rem' }}>{error}</div>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                <p style={{ margin: '1.25rem 0 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.92rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;

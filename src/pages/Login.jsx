import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to login. Check your email and password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <h1>Welcome Back</h1>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="demo@example.com"
                    />
                </div>
                <div className="input-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••"
                    />
                </div>
                {error && <p style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                Don't have an account? <Link to="/register" style={{ color: 'var(--primary)' }}>Register</Link>
            </p>
        </div>
    );
};

export default Login;

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await resetPassword(email);
            setMessage('Check your inbox for further instructions.');
        } catch (err) {
            console.error(err);
            // Show generic response even if email not found for security, OR handle specific errors
            if (err.code === 'auth/user-not-found') {
                setMessage('Check your inbox for further instructions.');
            } else {
                setError(err.message || 'Failed to reset password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <h1>Reset Password</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Enter your email address and we'll send you a link to reset your password.
            </p>
            {message ? (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--accent-success)', marginBottom: '1.5rem' }}>{message}</p>
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>Back to Login</Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>
                    {error && <p style={{ color: 'var(--accent-error)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Back to Login</Link>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ForgotPassword;

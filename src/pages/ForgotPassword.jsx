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
            const trimmedEmail = email.trim();
            if (!trimmedEmail) throw new Error("Please enter a valid email address.");
            
            console.log("Reset Password UI: submitting request for:", trimmedEmail);
            const response = await resetPassword(trimmedEmail);
            console.log("Reset Password UI: backend response:", response ?? { status: 'sent' });
            setMessage('Password reset link sent to your email');
        } catch (err) {
            console.error("Reset Password Failed:", err);
            if (err.code === 'auth/user-not-found') {
                setError('No account was found for that email address.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (err.code === 'auth/unauthorized-continue-uri') {
                setError('Password reset is not configured for this app domain. Add this domain to Firebase authorized domains.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Network connection failed. Check your connection and try again.');
            } else if (err.code === 'permission-denied') {
                setError('Unable to verify that email in the user registry. Please contact support.');
            } else {
                setError(err.message || 'Failed to reset password. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="card auth-card">
                <p className="page-kicker">Account Recovery</p>
                <h1>Reset password</h1>
                <p className="auth-subtitle">Enter your account email and we will send a secure reset link.</p>
                {message ? (
                    <div style={{ textAlign: 'center' }}>
                        <div className="empty-state" style={{ color: 'var(--accent-success)', marginBottom: '1rem' }}>{message}</div>
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
                        {error && <div className="empty-state" style={{ color: 'var(--accent-error)', marginBottom: '1rem' }}>{error}</div>}
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.92rem' }}>
                            <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>Back to login</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;

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

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          padding: '2rem',
          background: '#111',
          color: '#fff'
        }}>
          <h1 style={{ color: 'var(--primary)', fontSize: '3rem' }}>Oops!</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Something went wrong in the IronLogic engine.</p>
          <div className="glass-card" style={{ maxWidth: '600px', textAlign: 'left', marginBottom: '2rem' }}>
            <code style={{ color: '#ff5252' }}>{this.state.error?.toString()}</code>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.href = '/'}
            style={{ padding: '1rem 2rem' }}
          >
            Restart Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

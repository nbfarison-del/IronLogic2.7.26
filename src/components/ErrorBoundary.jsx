import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);

        // Check for dynamic import/chunk load failures
        const errorMessage = error?.message || error?.toString() || "";
        const isChunkLoadError =
            errorMessage.includes("Failed to fetch dynamically imported module") ||
            errorMessage.includes("Loading chunk") ||
            errorMessage.includes("Script error");

        if (isChunkLoadError) {
            console.warn("Chunk load error detected. Attempting to reload page...");
            // Only reload once to avoid infinite loops
            const hasReloaded = sessionStorage.getItem('chunk-error-reloaded');
            if (!hasReloaded) {
                sessionStorage.setItem('chunk-error-reloaded', 'true');
                window.location.reload();
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: '#fff', background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h1 style={{ color: 'red' }}>Application Error</h1>
                    <p>Refer to the console for more details.</p>
                    <div style={{ background: '#333', padding: '1rem', borderRadius: '4px', maxWidth: '800px', overflowX: 'auto' }}>
                        <pre style={{ color: '#ff8888', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <br />
                        <details>
                            <summary style={{ cursor: 'pointer', color: '#aaa' }}>Component Stack Trace</summary>
                            <pre style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    </div>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '2rem', padding: '0.8rem 2rem', fontSize: '1rem', cursor: 'pointer', background: 'var(--primary)', border: 'none', borderRadius: '4px' }}>
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

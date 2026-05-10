import React from 'react';
import logo from '../assets/logo.png';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render() {
    if (this.state.hasError) {
      const displayMessage = getFriendlyErrorMessage(
        this.state.error,
        'We hit an unexpected issue while loading this screen.'
      );

      return (
        <div className="app-state app-state-full">
          <div className="app-state-panel">
            <img src={logo} alt="IronLogic" style={{ width: '84px', marginBottom: '1rem', opacity: 0.9 }} />
            <p className="app-state-eyebrow">IronLogic</p>
            <h1>We could not load this screen</h1>
            <p>{displayMessage}</p>
            <div className="app-state-actions">
              <button className="btn btn-primary" onClick={this.reset}>Try Again</button>
              <button className="btn" onClick={() => window.location.assign('/')}>Go to Dashboard</button>
            </div>
            <button
              className="app-state-link"
              onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
            >
              {this.state.showDetails ? 'Hide technical details' : 'Show technical details'}
            </button>
            {this.state.showDetails && (
              <pre className="app-error-details">
                {this.state.error?.stack || this.state.error?.toString()}
                {this.state.errorInfo?.componentStack ? `\n${this.state.errorInfo.componentStack}` : ''}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

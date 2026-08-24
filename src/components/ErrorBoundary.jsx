import React from 'react';

// Top-level error boundary. Without this, an uncaught error thrown while
// rendering any tab/page white-screens the entire app instead of degrading
// gracefully — this catches that and shows a recoverable fallback instead.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error in app tree:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '40px 20px', color: 'rgba(158, 165, 196,0.85)',
        }}>
          <h2 style={{ color: 'var(--color-cyan)', marginBottom: '10px' }}>Something went wrong.</h2>
          <p style={{ maxWidth: '420px', marginBottom: '20px', color: 'rgba(158, 165, 196,0.6)' }}>
            This page hit an unexpected error. You can try reloading — the rest of the site should be unaffected.
          </p>
          <button className="neon-button" onClick={this.handleReload}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

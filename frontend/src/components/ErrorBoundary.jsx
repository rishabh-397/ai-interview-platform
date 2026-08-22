import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container" style={{ textAlign: 'center', marginTop: 80 }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#888' }}>
            This page hit an unexpected error. Your progress elsewhere in the app is safe.
          </p>
          <button onClick={this.handleReload} style={{ marginTop: 16 }}>
            Return to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
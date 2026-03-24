import React from 'react';
import { sendLog, SeverityNumber } from '@/lib/otel';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    sendLog({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: error?.message || 'React rendering error',
      attributes: {
        'error.type': error?.name || 'ReactError',
        'error.message': error?.message || '',
        'error.stack': error?.stack || '',
        'error.component_stack': errorInfo?.componentStack || '',
        'browser.url': typeof window !== 'undefined' ? window.location.href : '',
        'log.source': 'react.error_boundary',
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Something went wrong.</h2>
            <p>Please try refreshing the page.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              style={{ padding: '0.5rem 1.5rem', marginTop: '1rem', cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

import React from 'react';
import { sendLog, SeverityNumber } from '@/lib/otel';
import { BiError } from 'react-icons/bi';
import { FiRefreshCw } from 'react-icons/fi';
import { GoHome } from 'react-icons/go';
import styles from './ErrorBoundary.module.scss';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true, errorId: Date.now().toString(36) };
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

  handleRefresh = () => {
    this.setState({ hasError: false, errorId: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, errorId: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.iconWrapper}>
                <BiError className={styles.icon} />
              </div>
              <h2 className={styles.title}>Something went wrong</h2>
              <p className={styles.subtitle}>
                An unexpected error occurred while loading this page. Our team has been automatically notified and is looking into it.
              </p>
              <div className={styles.actions}>
                <button className={styles.refreshBtn} onClick={this.handleRefresh}>
                  <FiRefreshCw size={16} />
                  Refresh Page
                </button>
                <button className={styles.homeBtn} onClick={this.handleGoHome}>
                  <GoHome size={16} />
                  Go to Homepage
                </button>
              </div>
              <hr className={styles.divider} />
              <p className={styles.helpText}>
                If the issue persists, try clearing your browser cache or contact support.
                {this.state.errorId && (
                  <> &middot; Error ID: <span className={styles.errorId}>{this.state.errorId}</span></>
                )}
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

import { Component } from 'react';
import errorTrackerStore from './errorTrackerStore.js';
import { errorLogTrace } from '../services/error/errorLogTrace.js';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const moduleName = this.props.name || 'react';
    errorTrackerStore.logError(moduleName, 'render', error, {
      componentStack: info.componentStack
    });
    errorLogTrace(moduleName, error?.message || String(error));
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

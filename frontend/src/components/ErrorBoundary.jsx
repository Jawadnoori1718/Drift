import { Component } from 'react';

/**
 * Catch-all error boundary. We don't expect to hit this in normal use,
 * but a runtime error in a third-party API response shouldn't blank the
 * whole page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'IBM Plex Mono, monospace' }}>
          <h1 style={{ fontFamily: 'IBM Plex Serif, serif', fontWeight: 500 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="tool"
            onClick={this.handleReset}
            style={{ marginTop: 12 }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

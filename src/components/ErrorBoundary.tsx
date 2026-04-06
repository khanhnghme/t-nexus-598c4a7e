import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(160deg, hsl(228 27% 8%) 0%, hsl(228 22% 12%) 50%, hsl(228 27% 10%) 100%)',
            fontFamily: "'Inter', system-ui, sans-serif",
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              padding: '40px 32px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '28px',
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                color: '#f0f0f3',
                fontSize: '20px',
                fontWeight: 700,
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px',
                lineHeight: 1.6,
                margin: '0 0 24px',
              }}
            >
              An unexpected error occurred. Please try reloading the page.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  textAlign: 'left',
                }}
              >
                <p
                  style={{
                    color: 'rgba(239,68,68,0.8)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    margin: 0,
                    wordBreak: 'break-word',
                    lineHeight: 1.5,
                  }}
                >
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'hsl(228 63% 43%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Reload page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Go to homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

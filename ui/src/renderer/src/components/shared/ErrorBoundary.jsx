import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="cradle-card cradle-card-compact max-w-md">
                        <div className="cradle-card-header">
                            <span className="cradle-text-error">Something went wrong</span>
                        </div>
                        <div className="cradle-card-body">
                            <p className="cradle-text-secondary mb-4">
                                This tab encountered an error and couldn't be displayed.
                            </p>
                            <button
                                className="cradle-btn cradle-btn-primary"
                                onClick={() => {
                                    this.setState({ hasError: false, error: null, errorInfo: null });
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

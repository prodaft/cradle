import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render(): ReactNode {
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

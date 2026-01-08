import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
            errorInfo: errorInfo,
        });
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
                    <Card className='cradle-card-compact max-w-md'>
                        <CardHeader>
                            <CardTitle className='text-destructive'>
                                Something went wrong
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-foreground mb-4'>
                                This tab encountered an error and couldn't be displayed.
                            </p>
                            <Button
                                variant='default'
                                size='default'
                                onClick={() => {
                                    this.setState({
                                        hasError: false,
                                        error: null,
                                        errorInfo: null,
                                    });
                                }}
                            >
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

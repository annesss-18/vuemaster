'use client';

import React, { ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and display errors gracefully
 * Usage:
 *   <ErrorBoundary fallback={(error, reset) => <CustomError error={error} onRetry={reset} />}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback?.(
        this.state.error,
        this.resetError
      ) || <DefaultErrorFallback error={this.state.error} onReset={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default error UI when no custom fallback is provided
 */
function DefaultErrorFallback({
  error,
  onReset
}: {
  error: Error;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-red-500 mb-2">Oops!</h1>
          <p className="text-muted-foreground mb-4">
            Something went wrong. Please try again.
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-200 break-words">
            {error.message}
          </p>
        </div>

        <button
          onClick={onReset}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Try Again
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="w-full mt-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

/**
 * Hook-based error boundary (for newer React versions)
 * Usage:
 *   const { error } = useErrorBoundary();
 *   if (error) throw error; // to reset
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    error,
    setError,
    resetError: () => setError(null)
  };
}

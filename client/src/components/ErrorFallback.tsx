import { FallbackProps } from 'react-error-boundary';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Helper to extract error message from unknown error type
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

interface ErrorFallbackProps extends FallbackProps {
  variant?: 'page' | 'section' | 'inline';
  title?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  variant = 'page',
  title = 'Something went wrong'
}: ErrorFallbackProps) {
  const errorMessage = getErrorMessage(error);

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{errorMessage}</span>
        <button
          onClick={resetErrorBoundary}
          className="ml-auto text-xs text-red-300 hover:text-white underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (variant === 'section') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900/50 rounded-lg border border-gray-800">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm text-center mb-4 max-w-md">
          {errorMessage}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Full page variant
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
        <p className="text-gray-400 mb-6">
          {errorMessage}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="btn btn-secondary"
          >
            Go to Dashboard
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
              Error Details
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 rounded-lg text-xs text-red-400 overflow-auto max-h-48">
              {getErrorStack(error) || errorMessage}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Specialized fallback for the canvas/visualization components
export function CanvasErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-900/30 rounded-lg">
      <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <ExclamationTriangleIcon className="w-7 h-7 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Canvas Error</h3>
      <p className="text-gray-400 text-sm text-center mb-4 max-w-sm">
        The trail map failed to render. This might be due to invalid data or a temporary issue.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="btn btn-primary flex items-center gap-2"
      >
        <ArrowPathIcon className="w-4 h-4" />
        Reload Canvas
      </button>
      {process.env.NODE_ENV === 'development' && (
        <p className="mt-4 text-xs text-red-400 max-w-sm truncate">
          {getErrorMessage(error)}
        </p>
      )}
    </div>
  );
}

// Fallback for auth pages
export function AuthErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Authentication Error</h2>
        <p className="text-gray-400 text-sm mb-4">
          {getErrorMessage(error)}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="btn btn-primary"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="btn btn-secondary"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// Fallback for project pages
export function ProjectErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <ExclamationTriangleIcon className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Page Error</h2>
      <p className="text-gray-400 text-sm text-center mb-4 max-w-md">
        {getErrorMessage(error)}
      </p>
      <div className="flex gap-3">
        <button
          onClick={resetErrorBoundary}
          className="btn btn-primary flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Retry
        </button>
        <button
          onClick={() => window.history.back()}
          className="btn btn-secondary"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default ErrorFallback;

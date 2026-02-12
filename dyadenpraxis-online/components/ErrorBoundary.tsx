import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  message?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary,
  title = 'Etwas ist schiefgelaufen',
  message = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.'
}) => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      
      <h2 className="text-xl font-serif text-[var(--c-text-main)] mb-2">
        {title}
      </h2>
      
      <p className="text-[var(--c-text-muted)] text-sm max-w-md mb-6">
        {message}
      </p>

      <div className="flex gap-3">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-[var(--c-bg-card)] text-[var(--c-text-main)] border border-[var(--c-border)] rounded-xl hover:bg-[var(--c-bg-app)] transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </button>
        
        <button
          onClick={handleReload}
          className="px-4 py-2 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-xl hover:opacity-90 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Seite neu laden
        </button>
      </div>

      {import.meta.env.DEV && (
        <details className="mt-6 text-left w-full max-w-lg">
          <summary className="cursor-pointer text-xs text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]">
            Technische Details (nur Entwicklung)
          </summary>
          <pre className="mt-2 p-3 bg-[var(--c-bg-card)] rounded-lg text-xs overflow-auto text-red-600 dark:text-red-400">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ 
  children, 
  fallbackTitle, 
  fallbackMessage,
  onReset 
}) => {
  const handleError = (error: Error, info: React.ErrorInfo) => {
    console.error('[ErrorBoundary] Fehler gefangen:', error);
    console.error('[ErrorBoundary] Component Stack:', info.componentStack);
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback 
          {...props} 
          title={fallbackTitle} 
          message={fallbackMessage} 
        />
      )}
      onError={handleError}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;

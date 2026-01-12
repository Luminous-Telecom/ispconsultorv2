import React, { Component, ReactNode } from 'react';
import { Button } from '../ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Chama callback opcional para logging/reporting
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Renderiza fallback customizado ou padrão
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary text-center p-4">
          <div className="mb-3">
            <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '3rem' }}></i>
          </div>
          <h4 className="text-danger mb-3">Ops! Algo deu errado</h4>
          <p className="text-muted mb-4">
            Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte se o problema persistir.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              leftIcon={<i className="bi bi-arrow-clockwise"></i>}
            >
              Recarregar Página
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Tentar Novamente
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-start">
              <summary className="text-muted small">Detalhes do erro (desenvolvimento)</summary>
              <pre className="mt-2 p-2 bg-light rounded small text-danger">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook personalizado para usar Error Boundary de forma funcional
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
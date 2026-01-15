import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Fallback UI displayed when an error is caught
 */
const ErrorFallback = ({
  error,
  onRetry,
}: {
  error?: Error;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
    <div className="rounded-full bg-destructive/10 p-4 mb-6">
      <AlertTriangle className="h-12 w-12 text-destructive" />
    </div>
    <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
    <p className="text-muted-foreground mb-6 max-w-md">
      We encountered an unexpected error. Please try refreshing the page.
    </p>
    {error && process.env.NODE_ENV === "development" && (
      <details className="mb-6 text-left max-w-lg">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          Error details (dev only)
        </summary>
        <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
      </details>
    )}
    <Button onClick={onRetry} variant="outline" className="gap-2">
      <RefreshCcw className="h-4 w-4" />
      Retry
    </Button>
  </div>
);

/**
 * React Error Boundary component that catches JavaScript errors
 * in child component tree and displays a fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development, could send to monitoring service in production
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

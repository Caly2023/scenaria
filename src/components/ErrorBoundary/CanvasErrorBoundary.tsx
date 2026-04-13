import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('Canvas Error');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-surface/30 rounded-3xl border border-red-500/20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Canvas Render Error</h3>
          <p className="text-secondary text-sm max-w-md">
            The canvas failed to load properly. The data is safe, but the view crashed.
          </p>
          <button 
            onClick={this.handleRetry} 
            className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold tracking-tight text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Canvas
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

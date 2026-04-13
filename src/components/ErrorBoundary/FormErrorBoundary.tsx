import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FormErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('Form Error');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#1a1a1a] text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">Form Encountered an Error</h3>
          <p className="text-white/40 text-sm">
            Something went wrong while rendering the settings.
          </p>
          <button 
            onClick={this.handleReset} 
            className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold tracking-tight text-white transition-all flex items-center gap-2 mt-4"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Form
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

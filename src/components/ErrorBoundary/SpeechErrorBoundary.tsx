import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MicOff } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SpeechErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('Speech Recognition Error');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Context: DictationButton crashed during use.');
    console.groupEnd();
  }

  public render() {
    if (this.state.hasError) {
      return (
        <button 
          title="Speech Recognition Unavailable"
          className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center cursor-not-allowed border border-red-500/20"
        >
          <MicOff className="w-5 h-5" />
        </button>
      );
    }

    return this.props.children;
  }
}

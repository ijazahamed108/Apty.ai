import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Mini Apty overlay error]', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 8 }}>
            Something went wrong in the overlay. Refresh the page to retry.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

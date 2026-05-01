import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep a console record for debugging; avoid logging any sensitive user input.
    console.error("UI crashed inside ErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="h-full w-full flex items-center justify-center bg-muted/30">
            <p className="text-sm text-muted-foreground">Tento blok se nepodařilo načíst.</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

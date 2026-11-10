import { Component, type ErrorInfo, type ReactNode } from "react";
import { useRouteError } from "react-router";
import { ErrorScreen, Notice } from "./Feedback.js";

/**
 * Catches a render error below it and draws `fallback` in its place, so one broken piece (a
 * figure with a bad spec, a stage that throws) never blanks the rest of the screen. A change in
 * `resetKey` clears the error, so moving to another step or stage tries again.
 */
export class ErrorBoundary extends Component<
  { fallback: ReactNode; resetKey?: unknown; children: ReactNode },
  { failed: boolean; key: unknown }
> {
  override state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: { resetKey?: unknown },
    state: { failed: boolean; key: unknown },
  ): { failed: boolean; key: unknown } | null {
    return Object.is(props.resetKey, state.key) ? null : { failed: false, key: props.resetKey };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("A part of the screen failed to render.", error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** A figure that throws becomes one line, and the question beside it stays answerable. */
export function FigureBoundary({ children, resetKey }: { children: ReactNode; resetKey?: unknown }) {
  return (
    <ErrorBoundary
      resetKey={resetKey}
      fallback={
        <div className="figure-failed">
          <Notice tone="warning">
            <p>This figure could not be drawn.</p>
          </Notice>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/** The router's error element: any screen that throws while rendering or loading lands here. */
export function RouteErrorScreen() {
  const error = useRouteError();
  return (
    <ErrorScreen
      error={error}
      title="This screen could not be shown"
      message="Something went wrong while drawing it. Try again, or go back to Home."
      onRetry={() => window.location.reload()}
      back={{ to: "/", label: "Back to Home" }}
    />
  );
}

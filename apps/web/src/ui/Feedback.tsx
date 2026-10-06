import { Bonehead } from "../mascot/Bonehead.js";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import { isEngineUnavailable } from "../api/client.js";
import { markEngineExplained } from "../api/engine-status.js";

export type NoticeTone = "correct" | "error" | "warning" | "info";

const ICONS = {
  correct: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

/**
 * Status messaging carries an icon and words as well as colour, so the meaning survives for
 * anyone who cannot separate the greens from the reds.
 */
export function Notice({
  tone,
  title,
  children,
  live,
}: {
  tone: NoticeTone;
  title?: string;
  children?: ReactNode;
  live?: boolean;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      className={`notice notice-${tone}`}
      {...(live ? { role: "status", "aria-live": "polite" } : {})}
    >
      <Icon aria-hidden="true" size={18} />
      <div>
        {title ? <strong className="notice-title">{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}

export function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="loading-screen" role="status">
      <Bonehead className="loading-mascot" expression="curious" live size={72} quiet />
      <p>{message}</p>
    </div>
  );
}

/**
 * A screen that could not load. Given the failure itself, an unreachable engine is named as
 * such rather than as a problem with this screen; given `onRetry`, the learner can try again
 * without reloading, and `back` leaves a way out of a dead end.
 */
export function ErrorScreen({
  title,
  message,
  error,
  onRetry,
  back,
}: {
  title: string;
  message: string;
  error?: unknown;
  onRetry?: (() => unknown) | undefined;
  back?: { to: string; label: string } | undefined;
}) {
  const engineDown = error !== undefined && isEngineUnavailable(error);
  const [retrying, setRetrying] = useState(false);
  useEffect(
    () => (engineDown && onRetry ? markEngineExplained() : undefined),
    [engineDown, onRetry],
  );
  async function retry(): Promise<void> {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }
  return (
    <div className={`error-screen${engineDown ? " error-screen--engine" : ""}`} role="alert">
      <Bonehead
        className="error-mascot"
        expression={engineDown ? "sleepy" : "encouraging"}
        props={engineDown ? [] : ["bandage"]}
        live
        size={96}
        quiet
      />
      <h1>{engineDown ? "Discere’s engine isn’t responding" : title}</h1>
      <p>
        {engineDown
          ? "Reopen Discere from Instrumenta, then try again. Nothing you saved is lost."
          : message}
      </p>
      {onRetry || back ? (
        <div className="button-row error-screen-actions">
          {onRetry ? (
            <button
              aria-busy={retrying}
              className="button button-primary"
              disabled={retrying}
              onClick={() => void retry()}
              type="button"
            >
              {retrying ? (
                <Loader2 aria-hidden="true" className="spin" size={16} />
              ) : (
                <RotateCcw aria-hidden="true" size={16} />
              )}
              Try again
            </button>
          ) : null}
          {back ? (
            <Link className={`button ${onRetry ? "button-quiet" : "button-primary"}`} to={back.to}>
              {back.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

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
      <Loader2 aria-hidden="true" className="spin" size={22} />
      <p>{message}</p>
    </div>
  );
}

export function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="error-screen" role="alert">
      <XCircle aria-hidden="true" size={24} />
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}

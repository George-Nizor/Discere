import { useQueryClient } from "@tanstack/react-query";
import { Loader2, PlugZap, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { retryEngine, useEngineStatus, watchEngine } from "../api/engine-status.js";

/**
 * The one app-wide notice for a stopped engine. Discere runs locally, launched from Instrumenta,
 * so the honest instruction is to reopen it there; meanwhile the app probes quietly and clears
 * this notice by itself once the engine answers. A screen that already explains the outage in
 * full keeps this banner out of the way.
 */
export function EngineBanner() {
  const client = useQueryClient();
  const { down, explainedBy } = useEngineStatus();
  const [retrying, setRetrying] = useState(false);
  const [stillDown, setStillDown] = useState(false);
  useEffect(() => watchEngine(client), [client]);
  useEffect(() => {
    if (!down) setStillDown(false);
  }, [down]);
  if (!down || explainedBy > 0) return null;
  async function retry(): Promise<void> {
    setRetrying(true);
    try {
      setStillDown(!(await retryEngine(client)));
    } finally {
      setRetrying(false);
    }
  }
  return (
    <div className="engine-banner" role="status" aria-live="polite">
      <PlugZap aria-hidden="true" size={18} />
      <p>
        <strong>Discere’s engine isn’t responding.</strong>{" "}
        {stillDown
          ? "Still no answer. Reopen Discere from Instrumenta; this page reconnects by itself."
          : "Reopen it from Instrumenta. Nothing you saved is lost."}
      </p>
      <button
        aria-busy={retrying}
        className="button button-quiet engine-banner-retry"
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
    </div>
  );
}

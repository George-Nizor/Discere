import type { TutorStatus } from "@discere/contracts";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { errorMessage } from "../api/client.js";
import { probeTutor } from "../api/endpoints.js";
import { useTutorStatus } from "../api/queries.js";
import { ErrorScreen, LoadingScreen, Notice } from "../ui/Feedback.js";

const PROVIDER_LABELS: Record<TutorStatus["provider"], string> = {
  codex: "Local Codex CLI",
  companion: "Copy and paste into ChatGPT",
  mock: "Offline mock",
};

const OUTCOME_LABELS: Record<TutorStatus["lastOutcome"], string> = {
  none: "Nothing asked yet this session",
  ok: "The last request succeeded",
  error: "The last request failed",
};

function formatResetTime(unixSeconds: number): string {
  if (unixSeconds <= 0) return "an unknown time";
  return new Date(unixSeconds * 1_000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Remediation is spelled out, because a red light the owner cannot act on is just bad news. */
function linkRemedy(status: TutorStatus): string {
  if (status.provider !== "codex") {
    return `Discere is set to the ${PROVIDER_LABELS[status.provider].toLowerCase()} provider. Set DISCERE_TUTOR_PROVIDER=codex to answer in place.`;
  }
  if (!status.binaryFound) {
    return "Install the Codex CLI in WSL, or point DISCERE_CODEX_BIN at it, then restart Discere.";
  }
  return "Run `codex login` in WSL to sign the CLI in to your OpenAI account, then restart Discere.";
}

function QuotaPanel({ status }: { status: TutorStatus }) {
  if (!status.quotaKnown) {
    return (
      <p className="settings-note">
        No quota reading yet. It appears after the first request of a session.
      </p>
    );
  }
  const used = Math.min(100, Math.max(0, Math.round(status.quotaUsedPercent)));
  const tone = used >= 90 ? "spent" : used >= 60 ? "high" : "fine";
  return (
    <div className="settings-quota">
      <div className="settings-quota-head">
        <span>{status.quotaPlanType || "Unnamed plan"}</span>
        <strong>{used}% used</strong>
      </div>
      {/* The reading is already stated in words above, so the bar is decoration. */}
      <div aria-hidden="true" className="settings-quota-track">
        <span className={`settings-quota-fill is-${tone}`} style={{ width: `${used}%` }} />
      </div>
      <p className="settings-note">This window resets at {formatResetTime(status.quotaResetsAt)}.</p>
    </div>
  );
}

/**
 * Proof that the OpenAI link is live, on one screen. Discere spends the owner's subscription,
 * so the state of that subscription belongs in the interface rather than in a log file.
 */
export function SettingsScreen() {
  const status = useTutorStatus();
  const probe = useMutation({ mutationFn: probeTutor });

  if (status.isPending) return <LoadingScreen message="Reading the tutor status…" />;
  if (status.error || !status.data) {
    return (
      <ErrorScreen
        message={errorMessage(status.error, "The tutor status did not load.")}
        title="Settings unavailable"
      />
    );
  }

  const data = status.data;
  const linked = data.provider === "codex" && data.binaryFound && data.authPresent;

  return (
    <main className="page" id="stage">
      <p className="eyebrow">Settings</p>
      <h1>Tutor and OpenAI link</h1>
      <p className="deck page-deck">
        Discere answers through the Codex CLI signed in to your own OpenAI account. Everything
        below is read from this machine.
      </p>

      <section aria-labelledby="link-heading" className="settings-card">
        <h2 className="settings-card-title" id="link-heading">
          OpenAI link
        </h2>
        <p className={`settings-link-state ${linked ? "is-live" : "is-down"}`}>
          {linked ? (
            <CheckCircle2 aria-hidden="true" size={22} />
          ) : (
            <XCircle aria-hidden="true" size={22} />
          )}
          <span>{linked ? "Connected" : "Not connected"}</span>
        </p>
        {linked ? null : <p className="settings-remedy">{linkRemedy(data)}</p>}

        <dl className="settings-facts">
          <div>
            <dt>Provider</dt>
            <dd>{PROVIDER_LABELS[data.provider]}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{data.model || "Account default"}</dd>
          </div>
          <div>
            <dt>CLI</dt>
            <dd>{data.binaryVersion || "Not found"}</dd>
          </div>
          <div>
            <dt>Sign-in</dt>
            <dd>{data.authPresent ? "Present" : "Missing"}</dd>
          </div>
          <div>
            <dt>Queued requests</dt>
            <dd>{data.queueDepth}</dd>
          </div>
          <div>
            <dt>Last request</dt>
            <dd>{OUTCOME_LABELS[data.lastOutcome]}</dd>
          </div>
        </dl>
        {data.lastError ? <p className="settings-remedy">{data.lastError}</p> : null}
      </section>

      <section aria-labelledby="quota-heading" className="settings-card">
        <h2 className="settings-card-title" id="quota-heading">
          Subscription quota
        </h2>
        <QuotaPanel status={data} />
      </section>

      <section aria-labelledby="test-heading" className="settings-card">
        <h2 className="settings-card-title" id="test-heading">
          Test the link
        </h2>
        <p className="settings-note">
          This sends one real question to OpenAI and counts against the quota above.
        </p>
        <button
          className="button button-primary"
          disabled={probe.isPending}
          onClick={() => {
            probe.mutate();
          }}
          type="button"
        >
          {probe.isPending ? (
            <>
              <Loader2 aria-hidden="true" className="spin" size={16} /> Asking OpenAI…
            </>
          ) : (
            "Send a live test request"
          )}
        </button>
        {probe.error ? (
          <Notice live tone="error" title="The test did not complete">
            <p>{errorMessage(probe.error, "The test request failed.")}</p>
          </Notice>
        ) : null}
        {probe.data ? (
          <Notice
            live
            tone={probe.data.ok ? "correct" : "error"}
            title={probe.data.ok ? "The link is live" : "The link did not answer"}
          >
            <p>
              {probe.data.message} Round trip {(probe.data.durationMs / 1000).toFixed(1)}s.
            </p>
          </Notice>
        ) : null}
      </section>
    </main>
  );
}

import type { CapabilityId, TutorStatus } from "@discere/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { errorMessage } from "../api/client.js";
import { probeTutor } from "../api/endpoints.js";
import { queryKeys, useCapabilities, useTutorStatus } from "../api/queries.js";
import { Notice } from "../ui/Feedback.js";
import { StudyPreferences } from "../study/StudyPreferences.js";

const PROVIDER_LABELS: Record<TutorStatus["provider"], string> = {
  claude: "Claude Code",
  "openai-compatible": "Your own AI endpoint",
  codex: "Local Codex CLI",
  companion: "Copy and paste into ChatGPT",
  mock: "Offline practice tutor",
};
const OUTCOME_LABELS: Record<TutorStatus["lastOutcome"], string> = {
  none: "No request this session",
  ok: "The last request succeeded",
  error: "The last request failed",
};
const CAPABILITY_LABELS: Record<CapabilityId, string> = {
  tutor_generation: "Tutor answers",
  illustrations: "Drawn illustrations",
  authoring: "Course authoring",
};
function linkRemedy(status: TutorStatus): string {
  if (!status.binaryFound)
    return "Install the Codex CLI in WSL, or point DISCERE_CODEX_BIN at it, then restart Discere.";
  return "Run `codex login` in WSL to sign the CLI in, then restart Discere.";
}
function QuotaPanel({ status }: { status: TutorStatus }) {
  if (!status.quotaKnown)
    return (
      <p className="settings-note">No quota reading is available. A live request may update it.</p>
    );
  const used = Math.min(100, Math.max(0, Math.round(status.quotaUsedPercent)));
  const reset =
    status.quotaResetsAt > 0
      ? new Date(status.quotaResetsAt * 1000).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
  const tone = used >= 90 ? "spent" : used >= 60 ? "high" : "fine";
  return (
    <div className="settings-quota">
      <div className="settings-quota-head">
        <span>{status.quotaPlanType || "Reported usage window"}</span>
        <strong>{used}% used</strong>
      </div>
      <div aria-hidden="true" className="settings-quota-track">
        <span className={"settings-quota-fill is-" + tone} style={{ width: used + "%" }} />
      </div>
      <p className="settings-note">
        Last reported by the local CLI.
        {reset ? " This window resets at " + reset + "." : " Reset time is unavailable."}
      </p>
    </div>
  );
}
function CapabilityPanel() {
  const capabilities = useCapabilities();
  if (capabilities.isPending)
    return (
      <p className="muted" role="status">
        Checking what is available…
      </p>
    );
  if (capabilities.error || !capabilities.data)
    return (
      <Notice tone="error" title="Availability could not be checked">
        <p>{errorMessage(capabilities.error, "The capability status did not load.")}</p>
        <button
          type="button"
          className="button button-secondary"
          disabled={capabilities.isFetching}
          onClick={() => void capabilities.refetch()}
        >
          Check availability again
        </button>
      </Notice>
    );
  // Course authoring is the owner's tool for writing courses, not something a learner uses.
  const learnerFacing = capabilities.data.capabilities.filter((entry) => entry.id !== "authoring");
  return (
    <ul className="settings-capabilities">
      {learnerFacing.map((entry) => (
        <li key={entry.id} className={entry.state === "available" ? "is-available" : "is-off"}>
          <h3>{CAPABILITY_LABELS[entry.id]}</h3>
          <p className="settings-capability-state">
            {entry.state === "available" ? "Available" : "Not available right now"}
          </p>
          {entry.state !== "available" && entry.reason ? (
            <p className="settings-capability-reason">{entry.reason}</p>
          ) : null}
          {entry.state !== "available" && entry.fallback ? (
            <p className="settings-capability-fallback">
              <strong>Still works:</strong> {entry.fallback}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
const ROUTING_LABELS = {
  auto: "Chooses per question",
  fast: "Always the fast model",
  smart: "Always the capable model",
} as const;

/** Which models the tutor routes between, and what it has used since Discere started. */
function TutorRoutingAndUsage({ status }: { status: TutorStatus }) {
  const { routing, usage } = status;
  if (!routing && !usage) return null;
  const money = (value: number) =>
    value.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 4,
    });
  return (
    <div className="settings-tutor-usage">
      {routing ? (
        <dl className="settings-facts">
          <div>
            <dt>Model choice</dt>
            <dd>{ROUTING_LABELS[routing.mode]}</dd>
          </div>
          <div>
            <dt>Fast model</dt>
            <dd>{routing.fastModel || "Provider default"}</dd>
          </div>
          <div>
            <dt>Capable model</dt>
            <dd>{routing.smartModel || "Provider default"}</dd>
          </div>
        </dl>
      ) : null}
      {usage ? (
        <>
          <h3 className="settings-subtitle">Since Discere started</h3>
          <p className="settings-note">
            {usage.calls === 0
              ? "No tutor requests yet."
              : `${usage.calls} ${usage.calls === 1 ? "request" : "requests"}${usage.costUsd > 0 ? `, about ${money(usage.costUsd)} reported` : ""}.`}
          </p>
          {usage.byModel.length ? (
            <table className="settings-usage-table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Requests</th>
                  <th scope="col">Tokens in / out</th>
                  <th scope="col">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.byModel.map((row) => (
                  <tr key={row.model}>
                    <th scope="row">{row.model}</th>
                    <td>{row.calls}</td>
                    <td>
                      {row.inputTokens.toLocaleString()} / {row.outputTokens.toLocaleString()}
                    </td>
                    <td>{row.costUsd > 0 ? money(row.costUsd) : "Not reported"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function TutorSettings() {
  const status = useTutorStatus(),
    client = useQueryClient();
  const probe = useMutation({
    mutationFn: probeTutor,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.tutorStatus }),
        client.invalidateQueries({ queryKey: queryKeys.capabilities }),
      ]);
    },
  });
  if (status.isPending)
    return (
      <section className="settings-card" aria-label="Tutor connection">
        <p role="status">Reading the tutor status…</p>
      </section>
    );
  if (status.error || !status.data)
    return (
      <section className="settings-card" aria-label="Tutor connection">
        <Notice tone="error" title="Tutor status unavailable">
          <p>{errorMessage(status.error, "The tutor status did not load.")}</p>
          <button
            type="button"
            className="button button-secondary"
            disabled={status.isFetching}
            onClick={() => void status.refetch()}
          >
            Retry tutor status
          </button>
        </Notice>
      </section>
    );
  const data = status.data,
    codex = data.provider === "codex";
  const configured = codex && data.binaryFound && data.authPresent;
  const verified = configured && data.lastOutcome === "ok";
  const state =
    data.provider === "mock"
      ? "Offline practice"
      : data.provider === "companion"
        ? "Copy and paste"
        : !configured
          ? "Setup needed"
          : data.lastOutcome === "error"
            ? "Connection needs attention"
            : verified
              ? "Connection verified"
              : "Ready to test";
  const icon = verified ? (
    <CheckCircle2 aria-hidden="true" size={22} />
  ) : codex && (!configured || data.lastOutcome === "error") ? (
    <XCircle aria-hidden="true" size={22} />
  ) : (
    <Info aria-hidden="true" size={22} />
  );
  return (
    <>
      <section aria-labelledby="link-heading" className="settings-card">
        <h2 className="settings-card-title" id="link-heading">
          Tutor connection
        </h2>
        <p className={"settings-link-state " + (verified ? "is-live" : "is-neutral")}>
          {icon}
          <span>{state}</span>
        </p>
        {codex && !configured && <p className="settings-remedy">{linkRemedy(data)}</p>}
        {configured && data.lastOutcome === "none" && (
          <p className="settings-note">
            The CLI and sign-in are present. Send a test to check whether it can answer.
          </p>
        )}
        {data.provider === "mock" && (
          <p className="settings-note">
            Responses use local examples. This mode makes no model requests.
          </p>
        )}
        {data.provider === "companion" && (
          <p className="settings-note">
            Use the tutor inside a lesson to copy its prompt into ChatGPT and paste the response
            back.
          </p>
        )}
        <dl className="settings-facts">
          <div>
            <dt>Provider</dt>
            <dd>{PROVIDER_LABELS[data.provider]}</dd>
          </div>
          {codex && (
            <>
              <div>
                <dt>Model</dt>
                <dd>{data.model || "Account default"}</dd>
              </div>
              <div>
                <dt>Reasoning effort</dt>
                <dd>{data.reasoningEffort || "Account default"}</dd>
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
            </>
          )}
        </dl>
        {codex && data.lastError && <p className="settings-remedy">{data.lastError}</p>}
        <TutorRoutingAndUsage status={data} />
      </section>
      {codex && (
        <section aria-labelledby="quota-heading" className="settings-card">
          <h2 className="settings-card-title" id="quota-heading">
            Reported subscription usage
          </h2>
          <QuotaPanel status={data} />
        </section>
      )}
      {data.provider !== "companion" && data.provider !== "mock" && (
        <section aria-labelledby="test-heading" className="settings-card">
          <h2 className="settings-card-title" id="test-heading">
            Test the connection
          </h2>
          <p className="settings-note">
            {codex
              ? "This sends one question through the local Codex CLI and uses your account allowance."
              : "This sends one short question to the tutor, which counts as one request."}
          </p>
          <button
            className="button button-primary"
            disabled={probe.isPending}
            onClick={() => probe.mutate()}
            type="button"
          >
            {probe.isPending ? (
              <>
                <Loader2 aria-hidden="true" className="spin" size={16} /> Testing…
              </>
            ) : codex ? (
              "Send a live test request"
            ) : (
              "Send a test question"
            )}
          </button>
          {probe.error && (
            <Notice live tone="error" title="The test did not complete">
              <p>{errorMessage(probe.error, "The test request failed.")}</p>
            </Notice>
          )}
          {probe.data && (
            <Notice
              live
              tone={probe.data.ok ? "correct" : "error"}
              title={
                probe.data.ok
                  ? codex
                    ? "The connection answered"
                    : "The tutor answered"
                  : "The test did not answer"
              }
            >
              <p>
                {probe.data.message} Round trip {(probe.data.durationMs / 1000).toFixed(1)}s.
              </p>
            </Notice>
          )}
        </section>
      )}
    </>
  );
}
export function SettingsScreen() {
  return (
    <main className="page" id="stage">
      <h1>Settings</h1>
      <StudyPreferences />
      <TutorSettings />
      <section aria-labelledby="capability-heading" className="settings-card">
        <h2 className="settings-card-title" id="capability-heading">
          Available tools
        </h2>
        <CapabilityPanel />
      </section>
    </main>
  );
}

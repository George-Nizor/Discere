import type { IllustrationResponse } from "@discere/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { getIllustration, startIllustration } from "../api/endpoints.js";
import { Notice } from "./Feedback.js";

/** Slow enough not to hammer the server, quick enough that a finished picture appears promptly. */
const POLL_MS = 4_000;

/**
 * A picture drawn on request to show something words are struggling with.
 *
 * Deliberately a button rather than something that happens on its own. One illustration costs a
 * couple of minutes and a real slice of the owner's subscription, so it is asked for, and the
 * same request is never drawn twice — the server keys them by prompt.
 *
 * It is always labelled as an illustration. ADR-0002 keeps generated pictures out of the class
 * of things a learner may treat as evidence, and a drawing that appears beside a tutor's answer
 * without saying what it is would quietly join that class.
 */
export function Illustration({
  subject,
  alt,
  accent,
  label = "Draw this",
}: {
  /** What to draw, in the tutor's words rather than the learner's. */
  subject: string;
  alt: string;
  accent: string;
  label?: string;
}) {
  const [key, setKey] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => startIllustration({ subject, alt, accent }),
    onSuccess: (result) => setKey(result.key),
  });

  const poll = useQuery<IllustrationResponse>({
    queryKey: ["illustration", key],
    queryFn: () => getIllustration(key ?? ""),
    enabled: key !== null,
    // Stops polling the moment the picture is settled, one way or the other.
    refetchInterval: (query) =>
      query.state.data && query.state.data.status !== "generating" ? false : POLL_MS,
  });

  const record = poll.data ?? start.data ?? null;

  if (!record) {
    return (
      <div className="illustration">
        <button
          aria-busy={start.isPending}
          className="button button-secondary"
          disabled={start.isPending}
          onClick={() => start.mutate()}
          type="button"
        >
          {start.isPending ? (
            <Loader2 aria-hidden="true" className="spin" size={16} />
          ) : (
            <ImagePlus aria-hidden="true" size={16} strokeWidth={1.8} />
          )}
          {label}
        </button>
        {start.error ? (
          <Notice live tone="error" title="The picture could not be started">
            <p>{errorMessage(start.error, "The request failed.")}</p>
          </Notice>
        ) : null}
      </div>
    );
  }

  if (record.status === "failed") {
    return (
      <Notice live tone="error" title="The picture could not be drawn">
        <p>{record.detail || "The generator did not return an image."}</p>
      </Notice>
    );
  }

  if (record.status === "generating") {
    return (
      <p aria-live="polite" className="illustration-waiting muted">
        <Loader2 aria-hidden="true" className="spin" size={16} />
        Drawing this. It takes a minute or two, and you can keep reading.
      </p>
    );
  }

  return (
    <figure className="illustration" style={{ "--course-accent": accent } as React.CSSProperties}>
      <img alt={record.alt} src={record.url} />
      <figcaption>
        {record.alt}
        {/* Said plainly, every time: this was drawn to explain, and proves nothing. */}
        <span className="illustration-provenance">
          Drawn by the tutor to illustrate. Not a source or a photograph.
        </span>
      </figcaption>
    </figure>
  );
}

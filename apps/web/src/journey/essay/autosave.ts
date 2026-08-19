import { useCallback, useEffect, useRef, useState } from "react";
import { formatSavedAt } from "../../lib/format.js";

export type SaveStatus = "idle" | "waiting" | "saving" | "saved" | "failed";

/** The autosave line is a statement of fact, never a promise about work still queued. */
export function autosaveLabel(
  status: SaveStatus,
  savedAt: string | null,
  now: number = Date.now(),
): string {
  if (status === "saving") return "Saving…";
  if (status === "waiting") return "Unsaved changes";
  if (status === "failed") return "Not saved. The last change is still in the editor.";
  return formatSavedAt(savedAt, now);
}

export interface AutosaveController {
  status: SaveStatus;
  savedAt: string | null;
  saveNow: () => Promise<void>;
}

/**
 * Saves the draft a set time after typing stops. Saving never moves focus and never rewrites
 * the editor, so the learner keeps their place.
 */
export function useAutosave({
  value,
  enabled,
  delayMs,
  initialSavedAt,
  onSave,
}: {
  value: string;
  enabled: boolean;
  delayMs: number;
  initialSavedAt: string | null;
  onSave: (value: string) => Promise<string | null>;
}): AutosaveController {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const savedValue = useRef<string | null>(null);
  const latest = useRef(value);
  latest.current = value;

  const save = useCallback(async () => {
    const pending = latest.current;
    if (savedValue.current === pending) return;
    setStatus("saving");
    try {
      const updatedAt = await onSave(pending);
      savedValue.current = pending;
      setSavedAt(updatedAt);
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }, [onSave]);

  useEffect(() => {
    if (savedValue.current === null) {
      savedValue.current = value;
      return;
    }
    if (!enabled || savedValue.current === value) return;
    setStatus("waiting");
    const timer = window.setTimeout(() => void save(), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, enabled, delayMs, save]);

  return { status, savedAt, saveNow: save };
}

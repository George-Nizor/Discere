import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies text to the clipboard and says so. Failure is reported, never swallowed. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="copy-control">
      <button className="button button-secondary" onClick={() => void copy()} type="button">
        {state === "copied" ? (
          <Check aria-hidden="true" size={16} strokeWidth={1.8} />
        ) : (
          <Copy aria-hidden="true" size={16} strokeWidth={1.8} />
        )}
        {label}
      </button>
      <span aria-live="polite" className="copy-status">
        {state === "copied" ? "Copied." : null}
        {state === "failed"
          ? "The browser refused clipboard access. Select the text instead."
          : null}
      </span>
    </span>
  );
}

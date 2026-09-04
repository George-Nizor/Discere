import { X } from "lucide-react";
import { type RefObject, useCallback, useEffect, useId, useRef } from "react";

export interface ReferenceSource {
  title: string;
  detail: string;
  href: string;
}

interface ReferenceSourceDialogProps {
  sources: ReferenceSource[];
  onClose: () => void;
  /** The exact control that opened the drawer. It receives focus again after dismissal. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && !element.hasAttribute("hidden"),
  );
}

export function ReferenceSourceDialog({
  sources,
  onClose,
  triggerRef,
}: ReferenceSourceDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeRequested = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closeRequested.current) return;
    closeRequested.current = true;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const returnTarget = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = focusableElements(dialog);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnTarget?.isConnected) {
        returnTarget.focus();
      }
    };
  }, [requestClose, triggerRef]);

  return (
    <div className="reference-drawer-layer">
      <button
        aria-label="Close sources backdrop"
        className="reference-drawer-backdrop"
        onClick={requestClose}
        tabIndex={-1}
        type="button"
      />
      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className="reference-source-drawer"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header>
          <h2 id={titleId}>Sources</h2>
          <button
            aria-label="Close sources"
            className="reference-icon-button"
            onClick={requestClose}
            ref={closeRef}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <ul>
          {sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} rel="noreferrer" target="_blank">
                {source.title}
              </a>
              <p className="reference-source-detail">{source.detail}</p>
            </li>
          ))}
        </ul>
        <p className="reference-source-note">
          Dates and claims are checked against the course bundle. Visual references remain attached
          to their licence records.
        </p>
      </aside>
    </div>
  );
}

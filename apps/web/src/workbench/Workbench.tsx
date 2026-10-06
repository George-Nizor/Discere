import type { CalculatorPolicy, TutoringMode } from "@discere/contracts";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Calculator as CalculatorIcon, MessageCircleQuestion, NotebookPen } from "../brand/icon-set.js";
import { useEffect, useState } from "react";
import { InlineRichText } from "../ui/RichText.js";
import { NotebookPanel } from "../notebook/NotebookScreen.js";
import { TutorPanel } from "../tutor/TutorPanel.js";
import { Calculator } from "./Calculator.js";

export type WorkbenchTab = "working" | "calculator" | "tutor";

export const workbenchTabs: Array<{ id: WorkbenchTab; label: string; icon: typeof NotebookPen }> = [
  { id: "working", label: "Working", icon: NotebookPen },
  { id: "calculator", label: "Calculator", icon: CalculatorIcon },
  { id: "tutor", label: "Tutor", icon: MessageCircleQuestion },
];

/**
 * The lesson's side pane: a working page the tutor can review, a scientific calculator and the
 * tutor conversation, beside the question rather than on another screen. Each tab stays mounted
 * once opened, so switching tabs keeps a half-drawn working or a typed expression.
 */
export function Workbench({
  tab,
  onTab,
  onClose,
  lessonId,
  conceptIds,
  questionId,
  mode,
  accent,
  visited,
  calculator = "available",
  questionPrompt,
}: {
  tab: WorkbenchTab;
  onTab: (tab: WorkbenchTab) => void;
  onClose: () => void;
  lessonId: string;
  conceptIds: string[];
  questionId?: string;
  mode: TutoringMode;
  accent: string;
  visited: ReadonlySet<WorkbenchTab>;
  /** `off` removes the calculator for this step: the arithmetic is the skill (spec §6.3). */
  calculator?: CalculatorPolicy;
  /**
   * The question being worked on. On a phone the bench is a bottom sheet, so the prompt is
   * repeated at its top and the sheet folds down to its tabs: the learner can always read what
   * they are solving (audit M8).
   */
  questionPrompt?: string | undefined;
}) {
  const [folded, setFolded] = useState(false);
  // Esc closes the bench from anywhere in the lesson, as it would a drawer (audit m2).
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const tabs = workbenchTabs
    .filter((item) => item.id !== "tutor" || mode !== "exam")
    .filter((item) => item.id !== "calculator" || calculator !== "off");
  return (
    <aside
      className={`workbench workbench--${tab}${folded ? " workbench--folded" : ""}`}
      aria-label="Lesson workbench"
    >
      <header className="workbench-head">
        <div className="workbench-tabs" role="tablist" aria-label="Workbench tools">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`workbench-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`workbench-panel-${item.id}`}
              className="workbench-tab"
              onClick={() => onTab(item.id)}
            >
              <item.icon aria-hidden="true" size={20} />
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="icon-button workbench-fold"
          aria-expanded={!folded}
          aria-label={folded ? "Show the tools" : "Fold the tools down"}
          onClick={() => setFolded((value) => !value)}
        >
          {folded ? (
            <ChevronUp aria-hidden="true" size={18} />
          ) : (
            <ChevronDown aria-hidden="true" size={18} />
          )}
        </button>
        <button
          type="button"
          className="icon-button workbench-close"
          aria-label="Close the workbench"
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </header>
      {questionPrompt ? (
        <p className="workbench-question">
          <span className="sr-only">Question: </span>
          <InlineRichText text={questionPrompt} />
        </p>
      ) : null}
      <div className="workbench-body" hidden={folded}>
        {(visited.has("working") || tab === "working") && (
          <section
            id="workbench-panel-working"
            role="tabpanel"
            aria-labelledby="workbench-tab-working"
            hidden={tab !== "working"}
            className="workbench-panel workbench-working"
          >
            <p className="workbench-note">
              Work it out here. Ask the tutor to review your working when you are stuck; it reads
              the page only when you ask.
            </p>
            <NotebookPanel lessonId={lessonId} />
          </section>
        )}
        {calculator !== "off" && (visited.has("calculator") || tab === "calculator") && (
          <section
            id="workbench-panel-calculator"
            role="tabpanel"
            aria-labelledby="workbench-tab-calculator"
            hidden={tab !== "calculator"}
            className="workbench-panel"
          >
            <Calculator />
          </section>
        )}
        {mode !== "exam" && (visited.has("tutor") || tab === "tutor") && (
          <section
            id="workbench-panel-tutor"
            role="tabpanel"
            aria-labelledby="workbench-tab-tutor"
            hidden={tab !== "tutor"}
            className="workbench-panel workbench-tutor"
          >
            <TutorPanel
              docked
              accent={accent}
              conceptIds={conceptIds}
              lessonId={lessonId}
              {...(questionId ? { questionId } : {})}
              mode={mode}
              onClose={onClose}
            />
          </section>
        )}
      </div>
    </aside>
  );
}

import type { LearnerActivity } from "@discere/contracts";
import { moveInOrder } from "@discere/activity-engine";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useActivityAssessment } from "./use-activity-assessment.js";
import { Notice } from "../../ui/Feedback.js";

/**
 * Rotates the public item list without consulting the private answer. Deterministic, because a
 * random start would make the activity a different task on every render and untestable.
 */
function openingOrder(activity: Extract<LearnerActivity, { type: "order_sequence" }>): string[] {
  const order = activity.items.map((item) => item.id).sort((a, b) => a.localeCompare(b));
  if (order.length < 2) return order;
  const rotated = [...order.slice(1), order[0] as string];
  // The public item list does not establish the correct sequence.
  return rotated;
}

/**
 * Put the steps in the right order. Sequence is a kind of understanding that multiple choice
 * cannot reach: knowing that Actium came after the Rubicon is different from recognising both.
 *
 * Reordering is done with buttons and the arrow keys rather than by dragging. Drag is the
 * obvious gesture and the worst one here — it is unusable from a keyboard, awkward on a
 * trackpad, and flaky to test — so the same two controls serve every input.
 */
export function OrderSequence({
  activity,
  onAnswered,
}: {
  activity: Extract<LearnerActivity, { type: "order_sequence" }>;
  onAnswered?: (correct: boolean) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => openingOrder(activity));
  const { outcome, busy, error, check, clear } = useActivityAssessment(activity.id, onAnswered);

  function move(itemId: string, delta: number): void {
    if (busy || outcome?.correct) return;
    setOrder((current) => moveInOrder(current, itemId, delta));
    clear();
  }

  return (
    <div className="order-sequence">
      <p className="order-sequence-prompt">{activity.prompt}</p>
      <ol className="order-list">
        {order.map((itemId, index) => {
          const item = activity.items.find((entry) => entry.id === itemId);
          if (!item) return null;
          const flagged = outcome?.firstMisplacedId === itemId;
          return (
            <li className={flagged ? "order-item is-flagged" : "order-item"} key={itemId}>
              <span className="order-item-position">{index + 1}</span>
              <span className="order-item-label">{item.label}</span>
              <span className="order-item-controls">
                <button
                  aria-label={`Move "${item.label}" earlier`}
                  className="button button-quiet order-move"
                  disabled={busy || index === 0 || outcome?.correct === true}
                  onClick={() => move(itemId, -1)}
                  onKeyDown={(event) => {
                    // The arrow keys move the item the learner is already on, so reordering
                    // never requires leaving the keyboard to find the other button.
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      move(itemId, 1);
                    }
                  }}
                  type="button"
                >
                  <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
                </button>
                <button
                  aria-label={`Move "${item.label}" later`}
                  className="button button-quiet order-move"
                  disabled={busy || index === order.length - 1 || outcome?.correct === true}
                  onClick={() => move(itemId, 1)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      move(itemId, -1);
                    }
                  }}
                  type="button"
                >
                  <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {outcome?.correct ? null : (
        <div className="button-row">
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => void check(order)}
            type="button"
          >
            Check the order
          </button>
        </div>
      )}
      {error ? <p role="alert">{error}</p> : null}
      {outcome ? (
        <Notice
          live
          tone={outcome.correct ? "correct" : "info"}
          title={outcome.correct ? "That is the order" : "Not yet"}
        >
          <p>{outcome.explanation}</p>
        </Notice>
      ) : null}
    </div>
  );
}

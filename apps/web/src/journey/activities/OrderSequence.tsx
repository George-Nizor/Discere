import type { OrderSequenceActivity } from "@discere/contracts";
import { evaluateOrderSequence, moveInOrder } from "@discere/activity-engine";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Notice } from "../../ui/Feedback.js";

/**
 * Rotates the authored order so the learner never opens on the answer. Deterministic, because a
 * random start would make the activity a different task on every render and untestable.
 */
function openingOrder(activity: OrderSequenceActivity): string[] {
  const order = [...activity.correctOrder];
  if (order.length < 2) return order;
  const rotated = [...order.slice(1), order[0] as string];
  // A rotation of two items is just a swap, which is fine; of three or more it is never correct.
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
  activity: OrderSequenceActivity;
  onAnswered?: (correct: boolean) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => openingOrder(activity));
  const [checked, setChecked] = useState(false);
  const outcome = checked ? evaluateOrderSequence(activity, order) : null;

  function move(itemId: string, delta: number): void {
    if (outcome?.correct) return;
    setOrder((current) => moveInOrder(current, itemId, delta));
    setChecked(false);
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
                  disabled={index === 0 || outcome?.correct === true}
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
                  disabled={index === order.length - 1 || outcome?.correct === true}
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
            onClick={() => {
              setChecked(true);
              onAnswered?.(evaluateOrderSequence(activity, order).correct);
            }}
            type="button"
          >
            Check the order
          </button>
        </div>
      )}
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

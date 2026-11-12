import type { LearnerOrder } from "@discere/contracts";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import { InlineRichText, stripEmphasis } from "../../ui/RichText.js";

/**
 * The answer to an order question: a list the learner arranges. Each item has a button to move
 * it up and one to move it down, and the arrow keys do the same while either button has focus,
 * so the list works the same with a mouse, a finger and a keyboard. Nothing is dragged. Each
 * move is announced with the item's new place.
 *
 * Once the question has closed with its answer, the list shows the right order, and marks the
 * items the learner had in the right place.
 */
export function OrderAnswer({
  order,
  ids,
  onChange,
  locked,
  solution,
  marked,
  idPrefix,
  label,
}: {
  order: LearnerOrder;
  /** The item ids in the learner's sequence. */
  ids: string[];
  onChange: (ids: string[]) => void;
  locked: boolean;
  /** The right sequence, once the question has closed and the answer may be shown. */
  solution?: string[] | undefined;
  /** Whether the arrangement on screen was checked, so it can be compared with the answer. */
  marked: boolean;
  idPrefix: string;
  label?: string | undefined;
}) {
  const [announcement, setAnnouncement] = useState("");
  const list = useRef<HTMLOListElement>(null);
  // The button that moved an item keeps focus as its row changes place.
  const refocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!refocus.current) return;
    list.current?.querySelector<HTMLButtonElement>(`[data-move="${refocus.current}"]`)?.focus();
    refocus.current = null;
  });
  const labelOf = (id: string) => order.items.find((item) => item.id === id)?.label ?? "";
  const shown = solution ?? ids;

  function move(id: string, delta: -1 | 1, direction: "up" | "down"): void {
    if (locked) return;
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    refocus.current = `${id}:${direction}`;
    onChange(next);
    setAnnouncement(`${stripEmphasis(labelOf(id))} is now ${to + 1} of ${ids.length}.`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string, direction: "up" | "down") {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    move(id, event.key === "ArrowUp" ? -1 : 1, direction);
  }

  return (
    <div className="order-answer">
      <p className="answer-instruction" id={`${idPrefix}-order-help`}>
        {solution
          ? "This is the right order."
          : "Put these in order, first at the top. Use the arrows beside an item, or the arrow keys, to move it."}
      </p>
      <ol
        aria-describedby={`${idPrefix}-order-help`}
        aria-label={label ?? (solution ? "The right order" : "Items to put in order")}
        className={"order-list" + (solution ? " is-solution" : "")}
        ref={list}
      >
        {shown.map((id, index) => {
          const text = labelOf(id);
          const plain = stripEmphasis(text);
          const placed = marked && solution !== undefined && ids[index] === id;
          return (
            <li className={"order-item" + (placed ? " is-placed" : "")} data-item={id} key={id}>
              <span className="order-item-position" aria-hidden="true">
                {index + 1}
              </span>
              <span className="order-item-label">
                <InlineRichText text={text} />
              </span>
              {solution ? (
                placed ? (
                  <Check
                    aria-label="You had this in the right place"
                    className="choice-mark order-item-mark"
                    size={18}
                    strokeWidth={2}
                  />
                ) : null
              ) : (
                <span className="order-item-controls">
                  <button
                    aria-disabled={locked || index === 0 || undefined}
                    aria-label={`Move up: ${plain}`}
                    className="button button-quiet order-move"
                    data-move={`${id}:up`}
                    onClick={() => move(id, -1, "up")}
                    onKeyDown={(event) => onKeyDown(event, id, "up")}
                    type="button"
                  >
                    <ChevronUp aria-hidden="true" size={18} strokeWidth={2} />
                  </button>
                  <button
                    aria-disabled={locked || index === shown.length - 1 || undefined}
                    aria-label={`Move down: ${plain}`}
                    className="button button-quiet order-move"
                    data-move={`${id}:down`}
                    onClick={() => move(id, 1, "down")}
                    onKeyDown={(event) => onKeyDown(event, id, "down")}
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" size={18} strokeWidth={2} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only" data-testid="order-announcement">
        {announcement}
      </p>
    </div>
  );
}

import type { LearnerSort, StructuredSolution } from "@discere/contracts";
import { Check, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { InlineRichText, stripEmphasis } from "../../ui/RichText.js";

/**
 * The answer to a sort question: items to place into named groups. Every item is a button.
 * Choosing an item and then choosing a group places it there, and a placed item can be chosen
 * again to move it to another group or back to the list. Nothing is dragged, so it works the
 * same with a mouse, a finger and a keyboard. Each placing is announced.
 *
 * Once the question has closed with its answer, each group shows the items that belong in it,
 * with a mark for the ones the learner placed there and each item's line of explanation.
 */
export function SortAnswer({
  sort,
  ids,
  placed,
  onChange,
  locked,
  solution,
  marked,
  idPrefix,
  label,
}: {
  sort: LearnerSort;
  /** Every item id, in the arrangement the items were dealt. */
  ids: string[];
  /** The group each placed item is in. */
  placed: Record<string, string>;
  onChange: (placed: Record<string, string>) => void;
  locked: boolean;
  /** Where each item belongs, once the question has closed and the answer may be shown. */
  solution?: StructuredSolution["sort"] | undefined;
  /** Whether the sorting on screen was checked, so it can be compared with the answer. */
  marked: boolean;
  idPrefix: string;
  label?: string | undefined;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const refocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!refocus.current) return;
    root.current?.querySelector<HTMLButtonElement>(`[data-focus="${refocus.current}"]`)?.focus();
    refocus.current = null;
  });
  const labelOf = (id: string) => sort.items.find((item) => item.id === id)?.label ?? "";
  const binLabel = (id: string | undefined) =>
    sort.bins.find((bin) => bin.id === id)?.label ?? "";
  const waiting = ids.filter((id) => !placed[id]);
  const active = locked ? null : chosen;

  function place(binId: string): void {
    if (!active) return;
    const next = { ...placed, [active]: binId };
    onChange(next);
    setAnnouncement(`${stripEmphasis(labelOf(active))} is in ${binLabel(binId)}.`);
    // Focus goes to the next item still waiting, so sorting needs no hunting with Tab.
    const following = ids.find((id) => id !== active && !next[id]);
    refocus.current = following ? `item:${following}` : `bin:${binId}`;
    setChosen(null);
  }

  function takeOut(): void {
    if (!active || !placed[active]) return;
    const { [active]: _removed, ...rest } = placed;
    onChange(rest);
    setAnnouncement(`${stripEmphasis(labelOf(active))} is back in the list.`);
    refocus.current = `item:${active}`;
    setChosen(null);
  }

  const itemButton = (id: string) => {
    const text = labelOf(id);
    const isChosen = active === id;
    return (
      <button
        aria-disabled={locked || undefined}
        aria-pressed={isChosen}
        className={"sort-item" + (isChosen ? " is-chosen" : "")}
        data-focus={`item:${id}`}
        onClick={() => {
          if (!locked) setChosen(isChosen ? null : id);
        }}
        type="button"
      >
        <InlineRichText text={text} />
      </button>
    );
  };

  if (solution) {
    return (
      <div className="sort-answer" ref={root}>
        <p className="answer-instruction">This is where each item belongs.</p>
        <div className="sort-bins is-solution" data-count={sort.bins.length}>
          {sort.bins.map((bin) => (
            <section aria-label={bin.label} className="sort-bin is-solution" key={bin.id}>
              <h3 className="sort-bin-name">{bin.label}</h3>
              <ul className="sort-bin-items">
                {solution
                  .filter((item) => item.bin === bin.id)
                  .map((item) => {
                    const right = placed[item.id] === item.bin;
                    return (
                      <li
                        className={
                          "sort-result" + (marked ? (right ? " is-right" : " is-wrong") : "")
                        }
                        key={item.id}
                      >
                        <span className="sort-result-label">
                          <InlineRichText text={labelOf(item.id)} />
                          {!marked ? null : right ? (
                            <Check
                              aria-label="You placed this here"
                              className="sort-result-mark"
                              size={18}
                              strokeWidth={2}
                            />
                          ) : (
                            <X
                              aria-label="You placed this elsewhere"
                              className="sort-result-mark"
                              size={18}
                              strokeWidth={2}
                            />
                          )}
                        </span>
                        {marked && !right && placed[item.id] ? (
                          <span className="sort-result-note">
                            You put this in {binLabel(placed[item.id])}.
                          </span>
                        ) : null}
                        {item.explanation ? (
                          <span className="sort-result-why">
                            <InlineRichText text={item.explanation} />
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sort-answer" ref={root}>
      <p className="answer-instruction" id={`${idPrefix}-sort-help`}>
        Choose an item, then choose the group it belongs in. Choose a placed item to move it.
      </p>
      <div
        aria-describedby={`${idPrefix}-sort-help`}
        aria-label={label ?? "Items to sort"}
        className="sort-pool"
        role="group"
      >
        {waiting.length ? (
          <ul className="sort-pool-items">
            {waiting.map((id) => (
              <li key={id}>{itemButton(id)}</li>
            ))}
          </ul>
        ) : (
          <p className="sort-pool-empty">Every item is in a group.</p>
        )}
        {active && placed[active] ? (
          <button
            className="button button-quiet sort-take-out"
            data-focus="take-out"
            onClick={takeOut}
            type="button"
          >
            Move it back to the list
          </button>
        ) : null}
      </div>
      <div className="sort-bins" data-count={sort.bins.length}>
        {sort.bins.map((bin) => {
          const inside = ids.filter((id) => placed[id] === bin.id);
          return (
            <section aria-label={bin.label} className="sort-bin" key={bin.id}>
              <button
                aria-disabled={!active || undefined}
                aria-label={
                  active
                    ? `Put ${stripEmphasis(labelOf(active))} in ${bin.label}`
                    : `${bin.label}. ${inside.length} placed. Choose an item first.`
                }
                className={"sort-bin-target" + (active ? " is-ready" : "")}
                data-focus={`bin:${bin.id}`}
                onClick={() => place(bin.id)}
                type="button"
              >
                <span className="sort-bin-name">{bin.label}</span>
                <span className="sort-bin-hint" aria-hidden="true">
                  {active ? "Place here" : `${inside.length}`}
                </span>
              </button>
              {inside.length ? (
                <ul className="sort-bin-items">
                  {inside.map((id) => (
                    <li key={id}>{itemButton(id)}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only" data-testid="sort-announcement">
        {announcement}
      </p>
    </div>
  );
}

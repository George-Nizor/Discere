import { Combo as Flame } from "../brand/icon-set.js";
import { useLocation } from "react-router";
import { comboScope, useCombo } from "../fx/combo.js";

/** Visible from a run of two; the flame heats through green, gold, orange and violet. */
export function ComboMeter() {
  const location = useLocation();
  const { count } = useCombo(comboScope(location.pathname));
  const heat = count >= 10 ? "cosmic" : count >= 5 ? "blaze" : count >= 3 ? "hot" : "warm";
  return (
    <span
      className={`combo-meter combo-meter--${heat}${count >= 2 ? " is-live" : ""}`}
      data-fx-target="combo"
      aria-live="polite"
    >
      {count >= 2 ? (
        <>
          <Flame aria-hidden="true" size={18} strokeWidth={2.2} />
          <span key={count} className="combo-meter-count">
            ×{count}
          </span>
          <span className="sr-only"> answers right first time in a row</span>
        </>
      ) : null}
    </span>
  );
}

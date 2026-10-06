import { emitMascot } from "../mascot/bus.js";
import { comboScope, comboTitles, registerAnswer } from "./combo.js";
import {
  burst,
  centre,
  embers,
  floatText,
  type PaletteName,
  pulse,
  rain,
  ring,
  shake,
  stars,
} from "./engine.js";
import type { StudySound } from "../study/experience.js";

const xpTarget = () =>
  document.querySelector('[data-fx-target="xp"]') ?? document.querySelector(".site-xp");

function paletteFor(combo: number): PaletteName {
  if (combo >= 10) return "cosmic";
  if (combo >= 5) return "blaze";
  if (combo >= 3) return "hot";
  return "correct";
}

/**
 * The answer moment. Correct answers burst from the button that was pressed, and the burst grows
 * with the combo; a miss gets a soft shake and nothing that feels like a punishment.
 */
export function celebrateAnswer({
  correct,
  firstTry,
  xp,
  origin,
  play,
}: {
  correct: boolean;
  firstTry: boolean;
  xp: number;
  origin: Element | null;
  play: (kind: StudySound, intensity?: number) => void;
}) {
  const combo = registerAnswer(comboScope(), correct && firstTry, correct);
  emitMascot({ type: "answer", correct, combo });
  const at = centre(origin && origin !== document.body ? origin : null);
  if (!correct) {
    play("miss");
    pulse("wrong");
    shake(document.querySelector(".stage-canvas .lesson-question, .stage-canvas") ?? origin);
    return combo;
  }
  const palette = paletteFor(combo);
  play(combo >= 2 ? "combo" : "answer", combo);
  burst(at, {
    count: Math.min(130, 30 + combo * 8),
    palette,
    power: 1 + Math.min(combo, 10) * 0.05,
  });
  ring(at, combo >= 5 ? "#ffb020" : "#3ee07f", 110 + Math.min(combo, 10) * 12);
  pulse(combo >= 10 ? "cosmic" : combo >= 5 ? "gold" : "correct");
  if (xp > 0) floatText(`+${xp} XP`, at, { to: xpTarget(), tone: "xp" });
  if (combo >= 2) {
    const meter = document.querySelector('[data-fx-target="combo"]');
    window.setTimeout(() => embers(centre(meter), 8 + combo, palette), 120);
  }
  const title = comboTitles[combo];
  if (title) {
    const top = { x: window.innerWidth / 2, y: window.innerHeight * 0.32 };
    window.setTimeout(() => {
      floatText(`${combo}× ${title}!`, top, { tone: combo >= 10 ? "hype" : "combo", size: 1.4 });
      stars(top, 8 + combo, combo >= 10 ? "cosmic" : "gold");
      if (combo >= 5) rain({ count: 60 + combo * 6, palette });
    }, 260);
  }
  return combo;
}

export function celebrateLevelUp() {
  emitMascot({ type: "levelup" });
  const top = { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
  rain({ count: 220, palette: "cosmic" });
  stars(top, 24, "gold");
  ring(top, "#ffd23e", 260);
  pulse("gold");
}

export function celebrateChest(origin: Element | null, xp: number, palette: PaletteName = "gold") {
  emitMascot({ type: "chest" });
  const at = centre(origin);
  burst(at, { count: palette === "gold" ? 90 : 140, palette, power: 1.3 });
  stars(at, 18, "gold");
  if (palette === "blaze" || palette === "cosmic") rain({ count: 120, palette });
  ring(at, "#ffd23e", 200);
  pulse("gold");
  floatText(`+${xp} XP`, at, { to: xpTarget(), tone: "gold", size: 1.3 });
}

/** Scaled by stars: a lesson finished mostly with help gets a quiet ring, not confetti. */
export function celebrateFinish(origin: Element | null, stars3: 0 | 1 | 2 | 3 = 3) {
  emitMascot({ type: "finish", stars: stars3 });
  const at = centre(origin);
  if (stars3 === 0) return;
  ring(at, "#3ee07f", 160 + stars3 * 30);
  stars(at, 6 + stars3 * 4, "gold");
  if (stars3 >= 2)
    rain({ count: stars3 === 3 ? 200 : 90, palette: stars3 === 3 ? "cosmic" : "correct" });
}

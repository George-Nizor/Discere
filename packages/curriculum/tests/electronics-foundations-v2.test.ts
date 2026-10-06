import { readFileSync, readdirSync } from "node:fs";
import type { Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Electronics Foundations v2 migration drafts. Every numeric key is recomputed here from the
 * circuit the item describes, not read back from the authority it is checking. Reads the drafts
 * because the bundle is only rewritten when the lead applies them.
 */
const directory = new URL(
  "../../../content/electronics-foundations/.authoring/migration/",
  import.meta.url,
);
const questions = new Map<string, Question>();
for (const file of readdirSync(directory).filter((name) => name.endsWith(".json")))
  for (const q of (JSON.parse(readFileSync(new URL(file, directory), "utf8")) as { questions: Question[] })
    .questions)
    questions.set(q.id, q);

const key = (id: string): number => {
  const authority = questions.get(id)?.answerAuthority;
  if (!authority || authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const ohm = (v: number, r: number) => v / r;
const par = (...r: number[]) => 1 / r.reduce((sum, x) => sum + 1 / x, 0);
const near = (id: string, expected: number) => expect(key(id)).toBeCloseTo(expected, 9);

describe("Electronics Foundations v2 keys", () => {
  it("lesson 1: current in one loop", () => {
    near("loop-water-flow", 2);
    near("current-after-resistor", 0.05);
    near("calculate-current-6v-150ohm", ohm(6, 150));
    near("calculate-current-5v-100ohm", ohm(5, 100));
    near("current-at-second-meter", ohm(12, 60));
    near("check-current-10v-400ohm", ohm(10, 400));
  });
  it("lesson 2: series", () => {
    near("two-identical-resistors", ohm(10, 100 + 100));
    near("current-at-second-resistor", ohm(9, 100 + 200));
    near("calculate-series-current-9v-300ohm", ohm(9, 100 + 200));
    near("calculate-series-total-220-330", 220 + 330);
    near("voltage-across-second-resistor", ohm(12, 100 + 200) * 200);
    near("check-series-current-6v-600ohm", ohm(6, 100 + 500));
    near("tap-series-total", 10 + 20);
    near("tap-voltage-shares", 9 - 5);
  });
  it("lesson 3: parallel", () => {
    near("second-route-current", ohm(12, 100) + ohm(12, 100));
    near("generated-parallel-branch-voltage", 6);
    near("generated-parallel-total-current", ohm(12, 100) + ohm(12, 300));
    near("generated-parallel-equivalent", par(100, 100));
    near("battery-current-two-lamps", ohm(9, 90) + ohm(9, 45));
    near("check-parallel-current-12v-30-60", ohm(12, 30) + ohm(12, 60));
    near("check-parallel-equivalent-30-60", par(30, 60));
    expect(par(100, 300)).toBeCloseTo(75, 9);
  });
  it("lesson 4: power", () => {
    near("joules-each-second", 4 * 0.5);
    near("calculate-power-6v-025a", 6 * 0.25);
    near("calculate-power-5v-100ohm", 5 ** 2 / 100);
    near("calculate-power-9v-20ma", 9 * (20 / 1000));
    near("energy-lamp-60s", 0.2 * 9 * 60);
    near("check-power-0p1a-50ohm", 0.1 ** 2 * 50);
    near("tap-heater-power", 100);
    expect(0.5 * 8).toBe(2 * 2);
  });
  it("lesson 5: components", () => {
    near("resistor-current-at-double-voltage", ohm(4, ohm(2, 0.02)));
    near("calculate-led-series-resistor", (5 - 2) / (15 / 1000));
    near("led-resistor-blue-9v", (9 - 3) / (10 / 1000));
    near("check-led-resistor-12v-2v-25ma", (12 - 2) / (25 / 1000));
    expect((9 - 2) / (20 / 1000)).toBeCloseTo(350, 9);
  });
  it("never lets a misconception match the key", () => {
    for (const q of questions.values()) {
      if (q.answerAuthority.kind !== "numeric") continue;
      for (const m of q.misconceptions ?? [])
        expect(m.match.numeric ?? []).not.toContain(q.answerAuthority.value);
    }
  });
});

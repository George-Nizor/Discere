import { describe, expect, it } from "vitest";
import {
  PhilosophyDiagramSchema,
  PhilosophyModelSchema,
  type PhilosophyModel,
} from "@discere/contracts";
import {
  auditArgument,
  bayesCounts,
  bayesDots,
  evaluatePhilosophyFormula,
  expectedUtilities,
  knowledgeVerdict,
  meanSummary,
  argumentIndicatorSpans,
  persistenceRelations,
  philosophyGivenList,
  philosophyGivens,
  philosophyMeasures,
  philosophyTruthRows,
  runMachine,
  sameMachineTable,
  trolleyLedger,
  veilSummary,
} from "../src/philosophy.js";

type Of<K extends PhilosophyModel["kind"]> = Extract<PhilosophyModel, { kind: K }>;
const atoms = (...pairs: Array<["p" | "q" | "r", string]>) =>
  pairs.map(([symbol, meaning]) => ({ symbol, meaning }));
const formal = (premises: string[], conclusion: string): Of<"argument_map"> => ({
  kind: "argument_map",
  premises: premises.map((formula) => ({ text: formula, formula })),
  conclusion: { text: conclusion, formula: conclusion },
  atoms: atoms(["p", "p"], ["q", "q"], ["r", "r"]),
});
const drinks = (realiser: Of<"machine_table">["realiser"]): Of<"machine_table"> => ({
  kind: "machine_table",
  title: "Drinks",
  realiser,
  states: [
    { id: "S0", label: "Nothing owed" },
    { id: "S1", label: "10p credited" },
  ],
  inputs: ["10p", "20p"],
  transitions: [
    { from: "S0", input: "10p", to: "S1", output: "" },
    { from: "S0", input: "20p", to: "S0", output: "can" },
    { from: "S1", input: "10p", to: "S0", output: "can" },
    { from: "S1", input: "20p", to: "S0", output: "can + 10p" },
  ],
  start: "S0",
});

describe("propositional machinery", () => {
  it("respects precedence and the right association of the conditional", () => {
    const v = { p: true, q: false, r: false };
    expect(evaluatePhilosophyFormula("¬p ∨ q", v)).toBe(false);
    expect(evaluatePhilosophyFormula("p ∧ q → r", v)).toBe(true);
    expect(evaluatePhilosophyFormula("p → q → r", { p: true, q: true, r: false })).toBe(false);
    expect(evaluatePhilosophyFormula("(p → q) → r", { p: false, q: false, r: false })).toBe(false);
    expect(evaluatePhilosophyFormula("p ↔ ¬¬p", { p: false })).toBe(true);
    expect(() => evaluatePhilosophyFormula("p →", {})).toThrow();
  });
  it("lists every row of the table, first atom slowest", () => {
    const rows = philosophyTruthRows(["p", "q"]);
    expect(rows).toEqual([
      { p: true, q: true },
      { p: true, q: false },
      { p: false, q: true },
      { p: false, q: false },
    ]);
    expect(philosophyTruthRows(["p", "q", "r", "s"])).toHaveLength(16);
  });
  it("finds the single counterexample to affirming the consequent and none for modus ponens", () => {
    const ac = auditArgument(formal(["p → q", "q"], "p"));
    expect(ac.valid).toBe(false);
    expect(ac.premisesTrueRows).toBe(2);
    expect(ac.counterexamples).toEqual([{ p: false, q: true }]);
    const mp = auditArgument(formal(["p → q", "p"], "q"));
    expect(mp.valid).toBe(true);
    expect(mp.premisesTrueRows).toBe(1);
    const mt = auditArgument(formal(["p → q", "¬q"], "¬p"));
    expect(mt).toMatchObject({ valid: true, premisesTrueRows: 1 });
  });
  it("tests three-letter forms over eight rows", () => {
    expect(auditArgument(formal(["p → q", "q → r"], "p → r")).valid).toBe(true);
    const shared = auditArgument(formal(["p → q", "r → q"], "p → r"));
    expect(shared.rows).toHaveLength(8);
    expect(shared.counterexamples).toEqual([{ p: true, q: true, r: false }]);
    const elisabeth = auditArgument(formal(["p → q", "q → r", "¬r"], "¬p"));
    expect(elisabeth).toMatchObject({ valid: true, premisesTrueRows: 1 });
  });
  it("reports informal maps as untestable and keeps unstated premises out of the givens", () => {
    const m: Of<"argument_map"> = {
      kind: "argument_map",
      passage: "Mira is a solicitor, so she has a law degree.",
      premises: [
        { text: "Every solicitor has a law degree.", unstated: true },
        { text: "Mira is a solicitor." },
      ],
      conclusion: { text: "Mira has a law degree." },
    };
    expect(auditArgument(m).valid).toBeNull();
    expect(philosophyMeasures(m)).toEqual([]);
    expect(philosophyGivens(m)).not.toContain("Every solicitor");
    expect(philosophyGivenList(m)).toContain("Premise 1: Mira is a solicitor.");
  });
  it("marks indicator words without splitting other words", () => {
    const spans = argumentIndicatorSpans(
      "Since it rained, the match is off; so stay home. Sonia agrees.",
    );
    expect(spans.filter((s) => s.role).map((s) => [s.text, s.role])).toEqual([
      ["Since", "premise"],
      ["so", "conclusion"],
    ]);
    expect(spans.map((s) => s.text).join("")).toBe(
      "Since it rained, the match is off; so stay home. Sonia agrees.",
    );
  });
});

describe("evidence and credence", () => {
  const common: Of<"bayes_grid"> = {
    kind: "bayes_grid",
    population: 1000,
    hypothesis: "have it",
    evidence: "test positive",
    prior: 0.1,
    hitRate: 0.9,
    falseAlarmRate: 0.1,
  };
  it("computes natural frequencies and the posterior by Bayes' theorem", () => {
    const c = bayesCounts(common);
    expect(c.hypothesisAndEvidence).toBeCloseTo(90, 9);
    expect(c.evidenceOnly).toBeCloseTo(90, 9);
    expect(c.posterior).toBeCloseTo(0.5, 12);
    // Odds form: prior odds × likelihood ratio = posterior odds.
    expect(c.posteriorOdds).toBeCloseTo(c.posterior / (1 - c.posterior), 12);
    const rare = bayesCounts({ ...common, prior: 0.01 });
    expect(rare.evidence).toBeCloseTo(108, 9);
    expect(rare.posterior).toBeCloseTo(9 / 108, 12);
  });
  it("draws exactly one dot per person and keeps group totals", () => {
    const dots = bayesDots({ ...common, prior: 0.01 }, 1000);
    expect(dots.per).toBe(1);
    expect(dots.groups).toEqual([9, 1, 99, 891]);
    const big = bayesDots({ ...common, population: 10000 }, 400);
    expect(big.groups.reduce((a, b) => a + b, 0)).toBe(400);
  });
});

describe("knowledge, mind and persons", () => {
  it("separates a Gettier case from knowledge and from false belief", () => {
    const base = {
      kind: "knowledge_case" as const,
      subject: "S",
      belief: "b",
      evidence: "e",
      fact: "f",
      believes: true,
      justified: true,
      beliefTrue: true,
    };
    expect(knowledgeVerdict({ ...base, evidenceConnected: false })).toMatchObject({
      conditionsMet: 3,
      gettiered: true,
    });
    expect(knowledgeVerdict({ ...base, evidenceConnected: true }).gettiered).toBe(false);
    expect(
      knowledgeVerdict({ ...base, beliefTrue: false, evidenceConnected: false }),
    ).toMatchObject({
      conditionsMet: 2,
      jtb: false,
    });
  });
  it("runs Block's drinks machine and treats different realisers as one function", () => {
    expect(runMachine(drinks("mechanism"), ["10p", "10p", "10p"])).toMatchObject({
      state: "S1",
      outputs: ["can"],
    });
    expect(runMachine(drinks("silicon"), ["20p", "10p", "20p"]).outputs).toEqual([
      "can",
      "can + 10p",
    ]);
    expect(sameMachineTable(drinks("mechanism"), drinks("neurons"))).toBe(true);
    const altered = drinks("silicon");
    altered.transitions[1] = { ...altered.transitions[1]!, output: "" };
    expect(sameMachineTable(drinks("mechanism"), altered)).toBe(false);
  });
  it("finds Reid's transitivity failure and counts fission candidates", () => {
    const reid: Of<"persistence"> = {
      kind: "persistence",
      scenario: "memory_chain",
      stages: [
        { id: "boy", label: "Boy", column: 0, row: 0 },
        { id: "officer", label: "Officer", column: 1, row: 0 },
        { id: "general", label: "General", column: 2, row: 0 },
      ],
      links: [
        { from: "boy", to: "officer", relation: "memory" },
        { from: "officer", to: "general", relation: "memory" },
      ],
    };
    const r = persistenceRelations(reid);
    expect(r.directWithOrigin).toEqual(["officer"]);
    expect(r.continuousWithOrigin).toEqual(["officer", "general"]);
    expect(r.transitivityFailures).toEqual([["boy", "officer", "general"]]);
    const fission: Of<"persistence"> = {
      kind: "persistence",
      scenario: "fission",
      stages: [
        { id: "you", label: "You", column: 0, row: 0 },
        { id: "left", label: "Left", column: 1, row: -1 },
        { id: "right", label: "Right", column: 1, row: 1 },
      ],
      links: [
        { from: "you", to: "left", relation: "memory" },
        { from: "you", to: "right", relation: "memory" },
      ],
    };
    expect(persistenceRelations(fission)).toMatchObject({
      psychologicalCandidates: ["left", "right"],
      bodilyCandidates: [],
      branches: true,
    });
  });
});

describe("ethics and politics", () => {
  it("counts lives and the means/side-effect distinction in trolley cases", () => {
    expect(trolleyLedger({ kind: "trolley", variant: "switch", ahead: 5, other: 1 })).toEqual({
      deathsIfRefrain: 5,
      deathsIfAct: 1,
      livesSavedByActing: 4,
      usedAsMeans: false,
    });
    expect(
      trolleyLedger({ kind: "trolley", variant: "loop", ahead: 5, other: 1 }).usedAsMeans,
    ).toBe(true);
  });
  it("weights outcomes by probability", () => {
    const eu = expectedUtilities({
      kind: "expected_utility",
      unit: "u",
      options: [
        { label: "A", outcomes: [{ label: "x", probability: 1, value: 50 }] },
        {
          label: "B",
          outcomes: [
            { label: "win", probability: 0.6, value: 100 },
            { label: "lose", probability: 0.4, value: 0 },
          ],
        },
      ],
    });
    expect(eu.map((o) => o.value)).toEqual([50, 60]);
  });
  it("separates maximin from the highest average", () => {
    const v = veilSummary({
      kind: "veil",
      unit: "u",
      positions: ["low", "mid", "top"],
      societies: [
        { label: "A", values: [10, 40, 70] },
        { label: "B", values: [25, 30, 35] },
      ],
    });
    expect(v.rows.map((r) => r.average)).toEqual([40, 30]);
    expect(v).toMatchObject({ maximinChoice: "B", averageChoice: "A" });
    const weighted = veilSummary({
      kind: "veil",
      unit: "u",
      positions: ["quarter", "rest"],
      shares: [0.25, 0.75],
      societies: [
        { label: "C", values: [20, 60] },
        { label: "D", values: [30, 50] },
      ],
    });
    expect(weighted.rows.map((r) => r.average)).toEqual([50, 45]);
  });
  it("puts the arithmetic mean at the midpoint and classifies amounts relative to the agent", () => {
    const s = meanSummary({
      kind: "mean",
      sphere: "food",
      deficiency: "too little",
      virtue: "right",
      excess: "too much",
      scale: "minae",
      low: 2,
      high: 10,
      agent: "Milo",
      band: [7, 9],
    });
    expect(s.arithmeticMean).toBe(6);
    expect(s.region(6)).toBe("too little");
    expect(s.region(8)).toBe("right");
    expect(s.region(9.5)).toBe("too much");
  });
});

describe("schemas", () => {
  it("rejects models that smuggle in inconsistencies", () => {
    expect(
      PhilosophyModelSchema.safeParse({
        kind: "expected_utility",
        unit: "u",
        options: [
          { label: "A", outcomes: [{ label: "x", probability: 0.5, value: 1 }] },
          { label: "B", outcomes: [{ label: "y", probability: 1, value: 1 }] },
        ],
      }).success,
    ).toBe(false);
    const machine = drinks("silicon");
    expect(PhilosophyModelSchema.safeParse(machine).success).toBe(true);
    expect(
      PhilosophyModelSchema.safeParse({ ...machine, transitions: machine.transitions.slice(1) })
        .success,
    ).toBe(false);
    expect(
      PhilosophyModelSchema.safeParse({
        kind: "argument_map",
        premises: [{ text: "p", formula: "p" }],
        conclusion: { text: "q" },
      }).success,
    ).toBe(false);
    expect(
      PhilosophyDiagramSchema.safeParse({
        type: "philosophy_explorer",
        cases: [
          { id: "a", label: "A", model: machine },
          { id: "a", label: "B", model: machine },
        ],
        initialCaseId: "a",
      }).success,
    ).toBe(false);
  });
});

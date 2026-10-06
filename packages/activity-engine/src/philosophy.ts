import type { PhilosophyModel } from "@discere/contracts";

type Model<K extends PhilosophyModel["kind"]> = Extract<PhilosophyModel, { kind: K }>;
export type PhilosophyAtom = "p" | "q" | "r" | "s";
export type PhilosophyValuation = Partial<Record<PhilosophyAtom, boolean>>;

const fmt = (value: number, places = 2) => {
  const rounded = Math.round(value * 10 ** places) / 10 ** places;
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString("en-GB", {
    maximumFractionDigits: places,
  });
};
export const philosophyNumber = fmt;
const percent = (value: number, places = 1) => fmt(value * 100, places) + "%";

/* ------------------------------------------------------------------ formulas */

type Node =
  | { op: "atom"; atom: PhilosophyAtom }
  | { op: "not"; a: Node }
  | { op: "and" | "or" | "if" | "iff"; a: Node; b: Node };

/** Parses ¬ ∧ ∨ → ↔ with the usual precedence; → and ↔ associate to the right. */
export function parsePhilosophyFormula(source: string): Node {
  const tokens = [...source.replace(/\s+/gu, "")];
  let i = 0;
  const peek = () => tokens[i];
  function primary(): Node {
    const t = tokens[i++];
    if (t === "¬") return { op: "not", a: primary() };
    if (t === "(") {
      const inner = biconditional();
      if (tokens[i++] !== ")") throw new Error("Unclosed parenthesis in " + source);
      return inner;
    }
    if (t === "p" || t === "q" || t === "r" || t === "s") return { op: "atom", atom: t };
    throw new Error("Unexpected '" + (t ?? "end") + "' in " + source);
  }
  function binary(next: () => Node, symbol: string, op: "and" | "or"): Node {
    let left = next();
    while (peek() === symbol) {
      i++;
      left = { op, a: left, b: next() };
    }
    return left;
  }
  const conjunction = () => binary(primary, "∧", "and");
  const disjunction = () => binary(conjunction, "∨", "or");
  function conditional(): Node {
    const left = disjunction();
    if (peek() === "→") {
      i++;
      return { op: "if", a: left, b: conditional() };
    }
    return left;
  }
  function biconditional(): Node {
    const left = conditional();
    if (peek() === "↔") {
      i++;
      return { op: "iff", a: left, b: biconditional() };
    }
    return left;
  }
  const tree = biconditional();
  if (i !== tokens.length) throw new Error("Unexpected text after formula " + source);
  return tree;
}

export function evaluatePhilosophyFormula(source: string, valuation: PhilosophyValuation): boolean {
  const run = (n: Node): boolean => {
    switch (n.op) {
      case "atom":
        return valuation[n.atom] ?? false;
      case "not":
        return !run(n.a);
      case "and":
        return run(n.a) && run(n.b);
      case "or":
        return run(n.a) || run(n.b);
      case "if":
        return !run(n.a) || run(n.b);
      case "iff":
        return run(n.a) === run(n.b);
    }
  };
  return run(parsePhilosophyFormula(source));
}

export function philosophyFormulaAtoms(sources: string[]): PhilosophyAtom[] {
  const found = new Set(sources.flatMap((s) => [...s].filter((c) => "pqrs".includes(c))));
  return (["p", "q", "r", "s"] as const).filter((a) => found.has(a));
}

/** Every row of the truth table, first atom slowest, true before false (forall x order). */
export function philosophyTruthRows(atoms: PhilosophyAtom[]): PhilosophyValuation[] {
  return Array.from(
    { length: 2 ** atoms.length },
    (_, row) =>
      Object.fromEntries(
        atoms.map((a, k) => [a, ((row >> (atoms.length - 1 - k)) & 1) === 0]),
      ) as PhilosophyValuation,
  );
}

export interface ArgumentAudit {
  formal: boolean;
  atoms: PhilosophyAtom[];
  rows: Array<{ valuation: PhilosophyValuation; premises: boolean[]; conclusion: boolean }>;
  premisesTrueRows: number;
  counterexamples: PhilosophyValuation[];
  valid: boolean | null;
}

export function auditArgument(model: Model<"argument_map">): ArgumentAudit {
  const premises = model.premises.map((p) => p.formula);
  const conclusion = model.conclusion.formula;
  if (!conclusion || premises.some((p) => !p))
    return {
      formal: false,
      atoms: [],
      rows: [],
      premisesTrueRows: 0,
      counterexamples: [],
      valid: null,
    };
  const sources = [...(premises as string[]), conclusion];
  const atoms = philosophyFormulaAtoms(sources);
  const rows = philosophyTruthRows(atoms).map((valuation) => ({
    valuation,
    premises: (premises as string[]).map((p) => evaluatePhilosophyFormula(p, valuation)),
    conclusion: evaluatePhilosophyFormula(conclusion, valuation),
  }));
  const supported = rows.filter((r) => r.premises.every(Boolean));
  const counterexamples = supported.filter((r) => !r.conclusion).map((r) => r.valuation);
  return {
    formal: true,
    atoms,
    rows,
    premisesTrueRows: supported.length,
    counterexamples,
    valid: counterexamples.length === 0,
  };
}

/** Indicator words that usually mark a conclusion or a premise in English prose. */
export const conclusionIndicators = [
  "therefore",
  "so",
  "hence",
  "thus",
  "it follows that",
  "consequently",
  "which means that",
];
export const premiseIndicators = ["since", "because", "for", "given that", "as", "after all"];

export function argumentIndicatorSpans(
  passage: string,
): Array<{ text: string; role: "premise" | "conclusion" | null }> {
  const all = [
    ...conclusionIndicators.map((w) => [w, "conclusion"] as const),
    ...premiseIndicators.map((w) => [w, "premise"] as const),
  ].sort((a, b) => b[0].length - a[0].length);
  const pattern = new RegExp(
    "\\b(" + all.map(([w]) => w.replaceAll(" ", "\\s+")).join("|") + ")\\b",
    "giu",
  );
  const spans: Array<{ text: string; role: "premise" | "conclusion" | null }> = [];
  let last = 0;
  for (const match of passage.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) spans.push({ text: passage.slice(last, start), role: null });
    const word = match[0].toLocaleLowerCase().replace(/\s+/gu, " ");
    spans.push({ text: match[0], role: all.find(([w]) => w === word)?.[1] ?? null });
    last = start + match[0].length;
  }
  if (last < passage.length) spans.push({ text: passage.slice(last), role: null });
  return spans;
}

/* --------------------------------------------------------------------- Bayes */

export interface BayesCounts {
  hypothesisAndEvidence: number;
  hypothesisOnly: number;
  evidenceOnly: number;
  neither: number;
  evidence: number;
  posterior: number;
  likelihoodRatio: number;
  priorOdds: number;
  posteriorOdds: number;
}

/** Expected frequencies in the stated population (natural frequencies), and the exact posterior. */
export function bayesCounts(m: Model<"bayes_grid">): BayesCounts {
  const withH = m.population * m.prior,
    withoutH = m.population - withH;
  const hypothesisAndEvidence = withH * m.hitRate,
    evidenceOnly = withoutH * m.falseAlarmRate;
  const evidence = hypothesisAndEvidence + evidenceOnly;
  const priorOdds = m.prior / (1 - m.prior);
  const likelihoodRatio = m.falseAlarmRate === 0 ? Infinity : m.hitRate / m.falseAlarmRate;
  return {
    hypothesisAndEvidence,
    hypothesisOnly: withH - hypothesisAndEvidence,
    evidenceOnly,
    neither: withoutH - evidenceOnly,
    evidence,
    posterior: hypothesisAndEvidence / evidence,
    likelihoodRatio,
    priorOdds,
    posteriorOdds: priorOdds * likelihoodRatio,
  };
}

/** Dots for a grid of at most 400 marks. Each dot stands for an equal share of the population. */
export function bayesDots(m: Model<"bayes_grid">, maxDots = 400) {
  const dots = Math.min(maxDots, m.population);
  const per = m.population / dots;
  const c = bayesCounts(m);
  // Largest-remainder rounding keeps the four groups summing to the dot count.
  const raw = [c.hypothesisAndEvidence, c.hypothesisOnly, c.evidenceOnly, c.neither].map(
    (v) => v / per,
  );
  const floors = raw.map(Math.floor);
  let left = dots - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floors[i]! += 1;
    left -= 1;
  }
  return { dots, per, groups: floors as [number, number, number, number] };
}

/* ----------------------------------------------------------------- knowledge */

export function knowledgeVerdict(m: Model<"knowledge_case">) {
  const jtb = m.believes && m.justified && m.beliefTrue;
  return {
    conditionsMet: [m.justified, m.beliefTrue, m.believes].filter(Boolean).length,
    jtb,
    gettiered: jtb && !m.evidenceConnected,
    knowsOnJtb: jtb,
  };
}

/* ------------------------------------------------------------- machine table */

export function machineStep(m: Model<"machine_table">, state: string, input: string) {
  const t = m.transitions.find((x) => x.from === state && x.input === input);
  if (!t) throw new Error("No transition from " + state + " on " + input);
  return { state: t.to, output: t.output };
}

export function runMachine(m: Model<"machine_table">, inputs: string[]) {
  let state = m.start;
  const trace: Array<{ input: string; from: string; to: string; output: string }> = [];
  for (const input of inputs) {
    const next = machineStep(m, state, input);
    trace.push({ input, from: state, to: next.state, output: next.output });
    state = next.state;
  }
  return { state, trace, outputs: trace.map((t) => t.output).filter(Boolean) };
}

/** Two tables realise the same function when relabelled states give identical behaviour. */
export function sameMachineTable(a: Model<"machine_table">, b: Model<"machine_table">): boolean {
  if (a.states.length !== b.states.length || a.inputs.join("|") !== b.inputs.join("|"))
    return false;
  const index = (m: Model<"machine_table">, id: string) => m.states.findIndex((s) => s.id === id);
  return a.transitions.every((t) => {
    const u = b.transitions.find(
      (x) => index(b, x.from) === index(a, t.from) && x.input === t.input,
    );
    return Boolean(u && index(b, u.to) === index(a, t.to) && u.output === t.output);
  });
}

/* --------------------------------------------------------------- persistence */

export function persistenceRelations(m: Model<"persistence">) {
  const memory = m.links.filter((l) => l.relation === "memory");
  const body = m.links.filter((l) => l.relation === "body");
  const origin = [...m.stages].sort((a, b) => a.column - b.column || a.row - b.row)[0]!;
  const last = Math.max(...m.stages.map((s) => s.column));
  const reach = (links: typeof m.links, from: string) => {
    const seen = new Set<string>();
    const queue = [from];
    while (queue.length) {
      const at = queue.shift()!;
      for (const l of links)
        if (l.from === at && !seen.has(l.to)) {
          seen.add(l.to);
          queue.push(l.to);
        }
    }
    return seen;
  };
  const direct = (a: string, b: string) => memory.some((l) => l.from === a && l.to === b);
  const continuity = reach(memory, origin.id);
  const bodily = reach(body, origin.id);
  // A transitivity failure: a–b and b–c are direct memory links but a–c is not.
  const failures = memory.flatMap((ab) =>
    memory
      .filter((bc) => bc.from === ab.to && !direct(ab.from, bc.to))
      .map((bc) => [ab.from, ab.to, bc.to] as const),
  );
  const finals = m.stages.filter((s) => s.column === last && s.id !== origin.id);
  return {
    origin: origin.id,
    directWithOrigin: m.stages.filter((s) => direct(origin.id, s.id)).map((s) => s.id),
    continuousWithOrigin: m.stages.filter((s) => continuity.has(s.id)).map((s) => s.id),
    bodilyWithOrigin: m.stages.filter((s) => bodily.has(s.id)).map((s) => s.id),
    psychologicalCandidates: finals.filter((s) => continuity.has(s.id)).map((s) => s.id),
    bodilyCandidates: finals.filter((s) => bodily.has(s.id)).map((s) => s.id),
    transitivityFailures: failures,
    branches: finals.filter((s) => continuity.has(s.id)).length > 1,
  };
}

/* ------------------------------------------------------------------- trolley */

export function trolleyLedger(m: Model<"trolley">) {
  return {
    deathsIfRefrain: m.ahead,
    deathsIfAct: m.other,
    livesSavedByActing: m.ahead - m.other,
    /** Whether the harmed person's body is the mechanism that stops the trolley. */
    usedAsMeans: m.variant !== "switch",
  };
}

/* ---------------------------------------------------------- expected utility */

export function expectedUtilities(m: Model<"expected_utility">) {
  return m.options.map((o) => ({
    label: o.label,
    value: o.outcomes.reduce((sum, x) => sum + x.probability * x.value, 0),
    worst: Math.min(...o.outcomes.map((x) => x.value)),
  }));
}

/* ---------------------------------------------------------------------- veil */

export function veilSummary(m: Model<"veil">) {
  const shares = m.shares ?? m.positions.map(() => 1 / m.positions.length);
  const rows = m.societies.map((s) => ({
    label: s.label,
    average: s.values.reduce((sum, v, i) => sum + v * shares[i]!, 0),
    minimum: Math.min(...s.values),
    total: s.values.reduce((a, b) => a + b, 0),
  }));
  const best = (key: "average" | "minimum") =>
    rows.reduce((a, b) => (b[key] > a[key] ? b : a)).label;
  return { shares, rows, maximinChoice: best("minimum"), averageChoice: best("average") };
}

/* ---------------------------------------------------------------------- mean */

export function meanSummary(m: Model<"mean">) {
  return {
    arithmeticMean: (m.low + m.high) / 2,
    agentMidpoint: (m.band[0] + m.band[1]) / 2,
    region: (value: number) =>
      value < m.band[0] ? m.deficiency : value > m.band[1] ? m.excess : m.virtue,
  };
}

/* -------------------------------------------------------------- descriptions */

const symbolWords: Record<string, string> = {
  "¬": "not ",
  "∧": " and ",
  "∨": " or ",
  "→": " implies ",
  "↔": " if and only if ",
};
const spoken = (formula: string) =>
  [...formula.replace(/\s+/gu, "")].map((c) => symbolWords[c] ?? c).join("");

/** The given values of a model, one short statement each, for screen readers and tutors. */
export function philosophyGivenList(m: PhilosophyModel): string[] {
  switch (m.kind) {
    case "argument_map":
      return [
        ...(m.passage ? ["Passage: " + m.passage] : []),
        ...m.premises
          .filter((p) => !p.unstated)
          .map(
            (p, i) =>
              "Premise " +
              (i + 1) +
              ": " +
              p.text +
              (p.formula ? " (" + spoken(p.formula) + ")" : ""),
          ),
        "Conclusion: " +
          m.conclusion.text +
          (m.conclusion.formula ? " (" + spoken(m.conclusion.formula) + ")" : ""),
        ...(m.atoms ?? []).map((a) => a.symbol + " means " + a.meaning),
      ];
    case "bayes_grid":
      return [
        "Population " + m.population.toLocaleString("en-GB"),
        "Share who " + m.hypothesis + ": " + percent(m.prior),
        "Of those, share who " + m.evidence + ": " + percent(m.hitRate),
        "Of the rest, share who " + m.evidence + ": " + percent(m.falseAlarmRate),
      ];
    case "knowledge_case":
      return [
        m.subject + " believes: " + m.belief,
        "Evidence: " + m.evidence,
        "What is actually so: " + m.fact,
      ];
    case "machine_table":
      return [
        m.title + ", realised in " + realiserNames[m.realiser],
        "Starts in " + m.states.find((s) => s.id === m.start)!.label,
        ...m.transitions.map(
          (t) =>
            "In " +
            m.states.find((s) => s.id === t.from)!.label +
            ", input " +
            t.input +
            " leads to " +
            m.states.find((s) => s.id === t.to)!.label +
            (t.output ? " and outputs " + t.output : " with no output"),
        ),
      ];
    case "persistence": {
      const label = (id: string) => m.stages.find((s) => s.id === id)!.label;
      return [
        ...m.stages.map((s) => "Stage " + (s.column + 1) + ": " + s.label),
        ...m.links.map(
          (l) =>
            label(l.to) +
            (l.relation === "memory" ? " remembers being " : " has the body of ") +
            label(l.from),
        ),
      ];
    }
    case "trolley":
      return [
        trolleyVariantNames[m.variant],
        m.ahead + " people on the track ahead",
        m.variant === "footbridge"
          ? m.other + " person on the footbridge"
          : m.other + (m.other === 1 ? " person" : " people") + " on the side track",
      ];
    case "expected_utility":
      return m.options.map(
        (o) =>
          o.label +
          ": " +
          o.outcomes
            .map(
              (x) =>
                percent(x.probability, 0) +
                " chance of " +
                x.label +
                " (" +
                fmt(x.value) +
                " " +
                m.unit +
                ")",
            )
            .join("; "),
      );
    case "veil": {
      const shares = m.shares ?? m.positions.map(() => 1 / m.positions.length);
      return [
        "Positions: " +
          m.positions.map((p, i) => p + " (" + percent(shares[i]!, 0) + " of people)").join("; "),
        ...m.societies.map(
          (s) => s.label + ": " + s.values.map((v) => fmt(v)).join(", ") + " " + m.unit,
        ),
      ];
    }
    case "mean":
      return [
        "Sphere: " + m.sphere,
        "Deficiency " + m.deficiency + ", mean " + m.virtue + ", excess " + m.excess,
        "Scale " + fmt(m.low) + " to " + fmt(m.high) + " " + m.scale,
        "For " +
          m.agent +
          ", the right amount lies between " +
          fmt(m.band[0]) +
          " and " +
          fmt(m.band[1]),
      ];
  }
}

/** A plain-language statement of the given values of a model. */
export function philosophyGivens(m: PhilosophyModel): string {
  return philosophyGivenList(m).join(". ");
}

export const realiserNames: Record<Model<"machine_table">["realiser"], string> = {
  mechanism: "gears and levers",
  neurons: "neurons",
  silicon: "silicon chips",
  rulebook: "a person following a rulebook",
};
export const trolleyVariantNames: Record<Model<"trolley">["variant"], string> = {
  switch: "Switch: a lever diverts the trolley onto a side track",
  footbridge: "Footbridge: only a heavy body pushed from the bridge can stop the trolley",
  loop: "Loop: the side track rejoins the main line, so only the side-track body stops the trolley",
};

/** Computed results, released after the learner answers. */
export function philosophyMeasures(m: PhilosophyModel): Array<{ label: string; value: string }> {
  switch (m.kind) {
    case "argument_map": {
      const a = auditArgument(m);
      if (!a.formal) return [];
      return [
        { label: "Rows checked", value: String(a.rows.length) },
        { label: "Rows with all premises true", value: String(a.premisesTrueRows) },
        { label: "Counterexample rows", value: String(a.counterexamples.length) },
        { label: "Verdict", value: a.valid ? "Valid" : "Invalid" },
      ];
    }
    case "bayes_grid": {
      const c = bayesCounts(m);
      return [
        { label: "Show the evidence", value: fmt(c.evidence, 1) },
        { label: "Of those, " + m.hypothesis, value: fmt(c.hypothesisAndEvidence, 1) },
        { label: "Posterior", value: percent(c.posterior) },
        {
          label: "Likelihood ratio",
          value: Number.isFinite(c.likelihoodRatio) ? fmt(c.likelihoodRatio) : "unbounded",
        },
      ];
    }
    case "knowledge_case": {
      const v = knowledgeVerdict(m);
      return [
        { label: "JTB conditions met", value: v.conditionsMet + " of 3" },
        { label: "Evidence connected to the fact", value: m.evidenceConnected ? "Yes" : "No" },
        {
          label: "Verdict",
          value: v.gettiered ? "Gettier case" : v.jtb ? "Knowledge" : "Not knowledge",
        },
      ];
    }
    case "machine_table":
      return [
        { label: "States", value: String(m.states.length) },
        { label: "Rows in the table", value: String(m.transitions.length) },
      ];
    case "persistence": {
      const r = persistenceRelations(m);
      return [
        { label: "Direct memory of the first stage", value: String(r.directWithOrigin.length) },
        {
          label: "Memory chain from the first stage",
          value: String(r.continuousWithOrigin.length),
        },
        {
          label: "Later candidates (psychological)",
          value: String(r.psychologicalCandidates.length),
        },
        { label: "Later candidates (bodily)", value: String(r.bodilyCandidates.length) },
      ];
    }
    case "trolley": {
      const t = trolleyLedger(m);
      return [
        { label: "Deaths if you refrain", value: String(t.deathsIfRefrain) },
        { label: "Deaths if you act", value: String(t.deathsIfAct) },
        { label: "Lives saved by acting", value: String(t.livesSavedByActing) },
        { label: "Harm used as a means", value: t.usedAsMeans ? "Yes" : "No" },
      ];
    }
    case "expected_utility":
      return expectedUtilities(m).map((o) => ({
        label: o.label,
        value: fmt(o.value) + " " + m.unit,
      }));
    case "veil": {
      const v = veilSummary(m);
      return [
        ...v.rows.map((r) => ({
          label: r.label + " average · worst",
          value: fmt(r.average) + " · " + fmt(r.minimum),
        })),
        { label: "Maximin chooses", value: v.maximinChoice },
        { label: "Highest average", value: v.averageChoice },
      ];
    }
    case "mean": {
      const s = meanSummary(m);
      return [
        { label: "Arithmetic midpoint", value: fmt(s.arithmeticMean) + " " + m.scale },
        {
          label: "Mean for " + m.agent,
          value: fmt(m.band[0]) + "–" + fmt(m.band[1]) + " " + m.scale,
        },
      ];
    }
  }
}

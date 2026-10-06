import { z } from "zod";

/**
 * Philosophy explorer models. Each carries only what a case stipulates: the premises as stated,
 * the numbers in a scenario, the links in a story. Verdicts (valid or not, the posterior, which
 * society maximin picks, who is identical with whom) are computed by the activity engine and
 * shown only after the learner has answered.
 */
const text = (max: number) => z.string().min(1).max(max);
/** Propositional formulas over p, q, r and s with ¬ ∧ ∨ → ↔ and parentheses. */
const formula = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[pqrs¬∧∨→↔() ]+$/u, "Use p, q, r, s, ¬, ∧, ∨, →, ↔ and parentheses.");
const atom = z.enum(["p", "q", "r", "s"]);
const probability = z.number().min(0).max(1);
const claim = z.object({ text: text(110), formula: formula.optional() }).strict();

const ArgumentMap = z
  .object({
    kind: z.literal("argument_map"),
    /** The argument as written, before reconstruction. Optional. */
    passage: text(320).optional(),
    premises: z
      .array(claim.extend({ unstated: z.boolean().optional() }).strict())
      .min(1)
      .max(5),
    conclusion: claim,
    atoms: z
      .array(z.object({ symbol: atom, meaning: text(60) }).strict())
      .max(4)
      .optional(),
  })
  .strict()
  .refine((m) => {
    const claims = [...m.premises, m.conclusion];
    const formal = claims.filter((c) => c.formula);
    if (formal.length === 0) return true;
    if (formal.length !== claims.length || !m.atoms) return false;
    const defined = new Set(m.atoms.map((a) => a.symbol));
    return claims.every((c) =>
      [...(c.formula ?? "")].every((ch) => !"pqrs".includes(ch) || defined.has(ch as "p")),
    );
  }, "Give every claim a formula over defined atoms, or none of them.");

const BayesGrid = z
  .object({
    kind: z.literal("bayes_grid"),
    population: z.number().int().min(100).max(100000),
    hypothesis: text(60),
    evidence: text(60),
    prior: z.number().min(0.001).max(0.999),
    /** P(evidence | hypothesis). */
    hitRate: probability,
    /** P(evidence | not hypothesis). */
    falseAlarmRate: probability,
  })
  .strict()
  .refine((m) => m.hitRate + m.falseAlarmRate > 0, "Some people must show the evidence.");

const KnowledgeCase = z
  .object({
    kind: z.literal("knowledge_case"),
    subject: text(30),
    belief: text(110),
    evidence: text(130),
    /** What is actually the case in the story. */
    fact: text(130),
    believes: z.boolean(),
    justified: z.boolean(),
    beliefTrue: z.boolean(),
    /** Whether the evidence is connected to what makes the belief true, rather than luckily matching it. */
    evidenceConnected: z.boolean(),
  })
  .strict();

const MachineTable = z
  .object({
    kind: z.literal("machine_table"),
    title: text(50),
    realiser: z.enum(["mechanism", "neurons", "silicon", "rulebook"]),
    states: z
      .array(z.object({ id: z.string().regex(/^[A-Za-z0-9]{1,4}$/), label: text(28) }).strict())
      .min(2)
      .max(4),
    inputs: z.array(text(10)).min(1).max(3),
    transitions: z
      .array(
        z
          .object({
            from: z.string().min(1),
            input: text(10),
            to: z.string().min(1),
            output: z.string().max(24),
          })
          .strict(),
      )
      .min(2)
      .max(12),
    start: z.string().min(1),
  })
  .strict()
  .refine((m) => {
    const ids = new Set(m.states.map((s) => s.id));
    if (!ids.has(m.start) || ids.size !== m.states.length) return false;
    for (const s of m.states)
      for (const input of m.inputs)
        if (m.transitions.filter((t) => t.from === s.id && t.input === input).length !== 1)
          return false;
    return m.transitions.every(
      (t) => ids.has(t.from) && ids.has(t.to) && m.inputs.includes(t.input),
    );
  }, "Give exactly one transition for every state and input.");

const Persistence = z
  .object({
    kind: z.literal("persistence"),
    scenario: z.enum(["memory_chain", "teleporter", "fission"]),
    stages: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9]{1,8}$/),
            label: text(26),
            column: z.number().int().min(0).max(3),
            row: z.number().int().min(-1).max(1).default(0),
          })
          .strict(),
      )
      .min(2)
      .max(6),
    links: z
      .array(
        z
          .object({
            from: z.string(),
            to: z.string(),
            relation: z.enum(["memory", "body"]),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict()
  .refine((m) => {
    const column = new Map(m.stages.map((s) => [s.id, s.column]));
    return (
      column.size === m.stages.length &&
      m.links.every(
        (l) => column.has(l.from) && column.has(l.to) && column.get(l.from)! < column.get(l.to)!,
      )
    );
  }, "Links run forward in time between known stages.");

const Trolley = z
  .object({
    kind: z.literal("trolley"),
    variant: z.enum(["switch", "footbridge", "loop"]),
    ahead: z.number().int().min(1).max(8),
    /** People on the side track, or the one person on the bridge. */
    other: z.number().int().min(1).max(5),
  })
  .strict();

const ExpectedUtility = z
  .object({
    kind: z.literal("expected_utility"),
    unit: text(24),
    options: z
      .array(
        z
          .object({
            label: text(36),
            outcomes: z
              .array(
                z
                  .object({
                    label: text(30),
                    probability: z.number().gt(0).max(1),
                    value: z.number().min(-200).max(200),
                  })
                  .strict(),
              )
              .min(1)
              .max(4),
          })
          .strict(),
      )
      .min(2)
      .max(3),
  })
  .strict()
  .refine(
    (m) =>
      m.options.every(
        (o) => Math.abs(o.outcomes.reduce((sum, x) => sum + x.probability, 0) - 1) < 1e-9,
      ),
    "Each option's outcome probabilities sum to one.",
  );

const Veil = z
  .object({
    kind: z.literal("veil"),
    unit: text(24),
    positions: z.array(text(18)).min(2).max(5),
    /** Share of the population in each position; equal shares when omitted. */
    shares: z.array(z.number().gt(0).max(1)).min(2).max(5).optional(),
    societies: z
      .array(
        z
          .object({ label: text(20), values: z.array(z.number().min(0).max(1000)).min(2).max(5) })
          .strict(),
      )
      .min(2)
      .max(3),
  })
  .strict()
  .refine(
    (m) =>
      m.societies.every((s) => s.values.length === m.positions.length) &&
      (!m.shares ||
        (m.shares.length === m.positions.length &&
          Math.abs(m.shares.reduce((a, b) => a + b, 0) - 1) < 1e-9)),
    "Give one value per position and shares that sum to one.",
  );

const Mean = z
  .object({
    kind: z.literal("mean"),
    sphere: text(40),
    deficiency: text(24),
    virtue: text(24),
    excess: text(24),
    scale: text(30),
    low: z.number().min(0).max(1000),
    high: z.number().min(0).max(1000),
    /** The agent the mean is relative to, and the range that suits them. */
    agent: text(30),
    band: z.tuple([z.number(), z.number()]),
  })
  .strict()
  .refine(
    (m) => m.low < m.high && m.low <= m.band[0] && m.band[0] < m.band[1] && m.band[1] <= m.high,
    "The agent's band lies inside the scale.",
  );

export const PhilosophyModelSchema = z.discriminatedUnion("kind", [
  ArgumentMap,
  BayesGrid,
  KnowledgeCase,
  MachineTable,
  Persistence,
  Trolley,
  ExpectedUtility,
  Veil,
  Mean,
]);
export const PhilosophyDiagramSchema = z
  .object({
    type: z.literal("philosophy_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(70),
            model: PhilosophyModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.cases.map((c) => c.id)).size === v.cases.length &&
      v.cases.some((c) => c.id === v.initialCaseId),
    "Use unique cases and an available initial case.",
  );
export type PhilosophyModel = z.infer<typeof PhilosophyModelSchema>;
export type PhilosophyDiagram = z.infer<typeof PhilosophyDiagramSchema>;

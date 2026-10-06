import { z } from "zod";

/**
 * Bounded psychology models. Each carries only the values a problem states: never a computed
 * result such as d′, Cohen's d, a retention percentage or a posterior probability.
 */
const Label = z.string().min(1).max(40);
const Probability = z.number().min(0).max(1);

const ScatterModel = z
  .object({
    kind: z.literal("scatter"),
    xLabel: Label,
    yLabel: Label,
    /** Optional third variable that can colour each point, used to expose a confound. */
    zLabel: Label.optional(),
    points: z
      .array(
        z
          .object({
            x: z.number().finite().min(-1000).max(1000),
            y: z.number().finite().min(-1000).max(1000),
            z: z.number().finite().min(-1000).max(1000).optional(),
          })
          .strict(),
      )
      .min(3)
      .max(40),
  })
  .strict()
  .refine(
    (m) =>
      new Set(m.points.map((p) => p.x)).size > 1 &&
      new Set(m.points.map((p) => p.y)).size > 1 &&
      (!m.zLabel || m.points.every((p) => p.z !== undefined)),
    "Vary both axes, and give every point a third value when a third variable is named.",
  );

const AssignmentModel = z
  .object({
    kind: z.literal("assignment"),
    traitLabel: Label,
    /** One pre-existing trait value per participant, in arrival order. */
    traits: z.array(z.number().finite().min(0).max(100)).min(4).max(24),
    method: z.enum(["random", "self_selected"]),
    seed: z.number().int().min(1).max(9999),
  })
  .strict()
  .refine((m) => m.traits.length % 2 === 0, "Use an even number of participants.");

const EffectModel = z
  .object({
    kind: z.literal("effect"),
    labelA: Label,
    labelB: Label,
    meanA: z.number().finite().min(-1000).max(1000),
    meanB: z.number().finite().min(-1000).max(1000),
    sdA: z.number().positive().max(500),
    sdB: z.number().positive().max(500),
    unit: z.string().max(20),
  })
  .strict()
  .refine(
    (m) => Math.abs(m.meanA - m.meanB) / Math.sqrt((m.sdA ** 2 + m.sdB ** 2) / 2) <= 4,
    "Keep the standardised difference within four standard deviations.",
  );

const DetectionModel = z
  .object({
    kind: z.literal("detection"),
    /** Distance between the noise and signal means, in noise standard deviations. */
    separation: z.number().min(0).max(4),
    /** Criterion position measured from the noise mean, in the same units. */
    criterion: z.number().min(-2.5).max(5),
    signalLabel: Label,
  })
  .strict();

const SwitchingModel = z
  .object({
    kind: z.literal("switching"),
    sequence: z
      .string()
      .regex(/^[AB]{4,16}$/u, "Write the trial sequence with the letters A and B."),
    labelA: Label,
    labelB: Label,
    baseMs: z.number().int().min(200).max(2000),
    switchCostMs: z.number().int().min(0).max(1000),
  })
  .strict();

const CueModel = z
  .object({
    kind: z.literal("cues"),
    labelA: Label,
    labelB: Label,
    meanA: z.number().finite().min(-100).max(100),
    meanB: z.number().finite().min(-100).max(100),
    sdA: z.number().positive().max(50),
    sdB: z.number().positive().max(50),
    unit: z.string().max(20),
  })
  .strict();

const SpanModel = z
  .object({
    kind: z.literal("span"),
    items: z.array(z.string().min(1).max(4)).min(3).max(24),
    /** Group sizes, in order, that a learner who chunks would use. */
    chunks: z.array(z.number().int().min(1).max(24)).min(1).max(24),
    capacity: z.number().int().min(2).max(9),
  })
  .strict()
  .refine(
    (m) => m.chunks.reduce((a, b) => a + b, 0) === m.items.length,
    "Chunk sizes must cover every item exactly once.",
  );

const ForgettingModel = z
  .object({
    kind: z.literal("forgetting"),
    /** Days until predicted recall falls to 90 per cent, before any review. */
    stability: z.number().positive().max(400),
    /** Days after first learning on which a successful review happens. */
    reviews: z.array(z.number().positive().max(400)).max(6),
    /** Factor by which each successful review multiplies stability. */
    growth: z.number().min(1).max(10),
    horizon: z.number().positive().max(400),
  })
  .strict()
  .refine(
    (m) =>
      m.reviews.every((d, i) => i === 0 || d > m.reviews[i - 1]!) &&
      m.reviews.every((d) => d < m.horizon),
    "Reviews must be in order and inside the horizon.",
  );

const PairingModel = z
  .object({
    kind: z.literal("pairing"),
    cueLabel: Label,
    outcomeLabel: Label,
    /** The combined learning rate αβ of the Rescorla–Wagner rule. */
    rate: z.number().min(0.05).max(1),
    /** The asymptote of associative strength the outcome supports. */
    asymptote: z.number().min(0.1).max(1),
    trials: z
      .array(z.enum(["paired", "alone"]))
      .min(1)
      .max(16),
  })
  .strict();

const ScheduleModel = z
  .object({
    kind: z.literal("schedule"),
    rule: z.enum(["fixed_ratio", "variable_ratio", "fixed_interval", "variable_interval"]),
    /** Successive requirements: responses for ratio rules, seconds for interval rules. */
    requirements: z.array(z.number().int().min(1).max(120)).min(1).max(12),
    /** Seconds between steady responses. */
    responseEvery: z.number().int().min(1).max(30),
    duration: z.number().int().min(10).max(300),
  })
  .strict()
  .refine(
    (m) =>
      m.rule.startsWith("fixed")
        ? new Set(m.requirements).size === 1
        : new Set(m.requirements).size > 1,
    "A fixed rule repeats one requirement; a variable rule varies it.",
  );

const BaseRateModel = z
  .object({
    kind: z.literal("base_rate"),
    population: z.number().int().min(100).max(10000),
    baseRate: Probability,
    hitRate: Probability,
    falseAlarmRate: Probability,
    conditionLabel: Label,
    testLabel: Label,
  })
  .strict()
  .refine(
    (m) =>
      [
        m.population * m.baseRate,
        m.population * m.baseRate * m.hitRate,
        m.population * (1 - m.baseRate) * m.falseAlarmRate,
      ].every((v) => Math.abs(v - Math.round(v)) < 1e-6),
    "Choose rates that give whole numbers of people.",
  );

const AnchorModel = z
  .object({
    kind: z.literal("anchor"),
    quantity: z.string().min(1).max(60),
    lowAnchor: z.number().finite(),
    highAnchor: z.number().finite(),
    lowEstimate: z.number().finite(),
    highEstimate: z.number().finite(),
    min: z.number().finite(),
    max: z.number().finite(),
  })
  .strict()
  .refine(
    (m) =>
      m.min < m.max &&
      m.lowAnchor < m.highAnchor &&
      [m.lowAnchor, m.highAnchor, m.lowEstimate, m.highEstimate].every(
        (v) => v >= m.min && v <= m.max,
      ),
    "Keep anchors and estimates inside the drawn range.",
  );

const TallyModel = z
  .object({
    kind: z.literal("tally"),
    total: z.number().int().min(2).max(1000),
    count: z.number().int().min(0).max(1000),
    countLabel: Label,
    restLabel: Label,
    setting: z.string().min(1).max(70),
  })
  .strict()
  .refine((m) => m.count <= m.total, "The count cannot exceed the total.");

const BystanderModel = z
  .object({
    kind: z.literal("bystander"),
    bystanders: z.number().int().min(1).max(12),
    /** Each person's independent probability of acting. */
    helpProbability: Probability,
  })
  .strict();

export const PsychologyModelSchema = z.discriminatedUnion("kind", [
  ScatterModel,
  AssignmentModel,
  EffectModel,
  DetectionModel,
  SwitchingModel,
  CueModel,
  SpanModel,
  ForgettingModel,
  PairingModel,
  ScheduleModel,
  BaseRateModel,
  AnchorModel,
  TallyModel,
  BystanderModel,
]);
export const PsychologyDiagramSchema = z
  .object({
    type: z.literal("psychology_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(70),
            model: PsychologyModelSchema,
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
export type PsychologyModel = z.infer<typeof PsychologyModelSchema>;
export type PsychologyDiagram = z.infer<typeof PsychologyDiagramSchema>;

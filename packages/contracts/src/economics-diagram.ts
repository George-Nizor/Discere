import { z } from "zod";

const label = z.string().min(1).max(24);
const price = z.number().min(0).max(500);
const quantity = z.number().min(0).max(2000);
const money = z.number().min(-1000).max(1000);
/** A linear demand curve written as Qd = intercept − slope × P. */
const demand = z
  .object({ intercept: z.number().min(1).max(2000), slope: z.number().min(0.05).max(100) })
  .strict();
/** A linear supply curve written as Qs = intercept + slope × P. The intercept may be negative. */
const supply = z
  .object({ intercept: z.number().min(-2000).max(2000), slope: z.number().min(0.05).max(100) })
  .strict();
const strategy = z.enum(["always_cooperate", "always_defect", "tit_for_tat", "grim_trigger"]);

/**
 * Only given quantities belong in these bounded models: curves, schedules, payoffs and policy
 * settings. Equilibria, surpluses, elasticities and best responses are derived by the activity
 * engine and are never part of a payload.
 */
export const EconomicsModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ppf"),
      goodX: label,
      goodY: label,
      points: z
        .array(z.object({ x: quantity, y: quantity }).strict())
        .min(2)
        .max(6),
      marker: z.object({ x: quantity, y: quantity }).strict().optional(),
    })
    .strict()
    .refine(
      (v) =>
        v.points[0]!.x === 0 &&
        v.points.at(-1)!.y === 0 &&
        v.points.every((p, i) => i === 0 || (p.x > v.points[i - 1]!.x && p.y < v.points[i - 1]!.y)),
      "A frontier starts on the vertical axis, ends on the horizontal axis and slopes down.",
    ),
  z
    .object({
      kind: z.literal("trade"),
      goodX: label,
      goodY: label,
      producers: z
        .array(
          z
            .object({
              name: label,
              maxX: z.number().min(0.5).max(1000),
              maxY: z.number().min(0.5).max(1000),
            })
            .strict(),
        )
        .length(2),
      /** Units of good Y exchanged for one unit of good X. */
      terms: z.number().min(0.01).max(100).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("margin"),
      activity: label,
      unit: label,
      benefits: z.array(money).min(2).max(8),
      costs: z.array(money).min(2).max(8),
    })
    .strict()
    .refine((v) => v.benefits.length === v.costs.length, "Give one benefit and one cost per unit."),
  z
    .object({
      kind: z.literal("market"),
      good: label,
      demand,
      supply,
      /** Change in quantity demanded at every price (a horizontal shift). */
      demandShift: z.number().min(-1000).max(1000).optional(),
      supplyShift: z.number().min(-1000).max(1000).optional(),
      view: z.enum(["equilibrium", "surplus", "tax", "control", "externality"]),
      /** A price to mark with a horizontal probe. */
      marker: price.optional(),
      /** A per-unit tax collected from sellers. */
      tax: z.number().min(0).max(200).optional(),
      control: z
        .object({ kind: z.enum(["ceiling", "floor"]), price })
        .strict()
        .optional(),
      /** A cap on the quantity that may be sold. */
      quota: quantity.optional(),
      /** Constant marginal external cost borne by people outside the market. */
      externalCost: z.number().min(0).max(200).optional(),
    })
    .strict()
    .refine((v) => {
      const a = v.demand.intercept + (v.demandShift ?? 0),
        c = v.supply.intercept + (v.supplyShift ?? 0);
      const p = (a - c) / (v.demand.slope + v.supply.slope);
      return p > 0 && a - v.demand.slope * p > 0;
    }, "The curves must cross at a positive price and quantity."),
  z
    .object({
      kind: z.literal("elasticity"),
      good: label,
      demand,
      prices: z.tuple([price, price]),
    })
    .strict()
    .refine(
      (v) =>
        v.prices[0] !== v.prices[1] &&
        v.prices.every((p) => v.demand.intercept - v.demand.slope * p > 0),
      "Use two different prices with positive quantity demanded.",
    ),
  z
    .object({
      kind: z.literal("costs"),
      fixedCost: z.number().min(0).max(5000),
      /** Total cost is fixedCost + linearCost × q + quadraticCost × q². */
      linearCost: z.number().min(0).max(200),
      quadraticCost: z.number().min(0.01).max(20),
      price: price.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("monopoly"),
      /** Inverse demand P = demandIntercept − demandSlope × Q. */
      demandIntercept: z.number().min(1).max(500),
      demandSlope: z.number().min(0.01).max(50),
      marginalCost: z.number().min(0).max(500),
    })
    .strict()
    .refine((v) => v.marginalCost < v.demandIntercept, "Some units must be worth producing."),
  z
    .object({
      kind: z.literal("game"),
      rowPlayer: label,
      columnPlayer: label,
      rowStrategies: z.array(label).min(2).max(3),
      columnStrategies: z.array(label).min(2).max(3),
      /** payoffs[row][column] = [row player's payoff, column player's payoff]. */
      payoffs: z
        .array(
          z
            .array(z.tuple([money, money]))
            .min(2)
            .max(3),
        )
        .min(2)
        .max(3),
    })
    .strict()
    .refine(
      (v) =>
        v.payoffs.length === v.rowStrategies.length &&
        v.payoffs.every((row) => row.length === v.columnStrategies.length),
      "Give one payoff pair for every pair of strategies.",
    ),
  z
    .object({
      kind: z.literal("repeated"),
      cooperate: label,
      defect: label,
      /** Prisoner's-dilemma payoffs: temptation > reward > punishment > sucker. */
      reward: money,
      temptation: money,
      sucker: money,
      punishment: money,
      strategies: z.tuple([strategy, strategy]),
      rounds: z.number().int().min(1).max(10),
    })
    .strict()
    .refine(
      (v) => v.temptation > v.reward && v.reward > v.punishment && v.punishment > v.sucker,
      "Use prisoner's-dilemma payoffs.",
    ),
]);
export const EconomicsDiagramSchema = z
  .object({
    type: z.literal("economics_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(70),
            model: EconomicsModelSchema,
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
export type EconomicsModel = z.infer<typeof EconomicsModelSchema>;
export type EconomicsDiagram = z.infer<typeof EconomicsDiagramSchema>;

import type { EconomicsModel } from "@discere/contracts";

type Of<K extends EconomicsModel["kind"]> = Extract<EconomicsModel, { kind: K }>;
export type EconomicsMarket = Of<"market">;
export type EconomicsGame = Of<"game">;
export type EconomicsRepeated = Of<"repeated">;
export type EconomicsCosts = Of<"costs">;

const tidy = (v: number) => Math.round(v * 1e9) / 1e9;

/** Up to two decimal places, British grouping, a true minus sign. */
export function economicsNumber(v: number): string {
  const text = Math.abs(tidy(v)).toLocaleString("en-GB", { maximumFractionDigits: 2 });
  return (tidy(v) < 0 ? "−" : "") + text;
}
export function economicsMoney(v: number): string {
  return (tidy(v) < 0 ? "−£" : "£") + economicsNumber(Math.abs(v));
}

/** A singular, lower-case form of a plural good name, such as "cakes" to "cake". */
export function economicsSingular(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (/(?:ch|sh|ss|x)es$/u.test(w)) return w.slice(0, -2);
  return w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
}

/* ---------- Choice and cost ---------- */

export interface FrontierSegment {
  fromX: number;
  toX: number;
  gainedX: number;
  lostY: number;
  /** Units of Y given up per extra unit of X along this segment. */
  costPerX: number;
}
export function ppfSegments(m: Of<"ppf">): FrontierSegment[] {
  return m.points.slice(1).map((p, i) => {
    const a = m.points[i]!;
    return {
      fromX: a.x,
      toX: p.x,
      gainedX: p.x - a.x,
      lostY: a.y - p.y,
      costPerX: (a.y - p.y) / (p.x - a.x),
    };
  });
}
/** Maximum Y attainable alongside a given X, following the straight segments. */
export function ppfFrontierY(m: Of<"ppf">, x: number): number {
  if (x <= 0) return m.points[0]!.y;
  for (const [i, p] of m.points.entries()) {
    if (i === 0 || x > p.x) continue;
    const a = m.points[i - 1]!;
    return a.y + ((p.y - a.y) * (x - a.x)) / (p.x - a.x);
  }
  return 0;
}
export type FrontierPosition = "inside" | "on" | "beyond";
export function ppfPosition(m: Of<"ppf">, point: { x: number; y: number }): FrontierPosition {
  const maxX = m.points.at(-1)!.x;
  if (point.x > maxX + 1e-9) return "beyond";
  const frontier = ppfFrontierY(m, point.x);
  if (Math.abs(point.y - frontier) < 1e-9) return "on";
  return point.y < frontier ? "inside" : "beyond";
}

export interface TradeProducer {
  name: string;
  maxX: number;
  maxY: number;
  /** Y given up per unit of X. */
  costOfX: number;
  /** X given up per unit of Y. */
  costOfY: number;
}
export function tradeAnalysis(m: Of<"trade">) {
  const producers: TradeProducer[] = m.producers.map((p) => ({
    ...p,
    costOfX: p.maxY / p.maxX,
    costOfY: p.maxX / p.maxY,
  }));
  const [a, b] = producers as [TradeProducer, TradeProducer];
  const same = Math.abs(a.costOfX - b.costOfX) < 1e-12;
  const xSpecialist = same ? undefined : a.costOfX < b.costOfX ? a : b;
  const ySpecialist = same ? undefined : xSpecialist === a ? b : a;
  const low = Math.min(a.costOfX, b.costOfX),
    high = Math.max(a.costOfX, b.costOfX);
  return {
    producers,
    xSpecialist: xSpecialist?.name,
    ySpecialist: ySpecialist?.name,
    /** Range of terms (Y per X) at which both gain. */
    range: [low, high] as const,
    termsGainful: m.terms === undefined ? undefined : m.terms > low && m.terms < high,
  };
}

export function marginAnalysis(m: Of<"margin">) {
  const net = m.benefits.map((b, i) => b - m.costs[i]!);
  const cumulative = net.map((_, i) => net.slice(0, i + 1).reduce((s, v) => s + v, 0));
  let best = 0,
    bestTotal = 0;
  cumulative.forEach((total, i) => {
    if (total >= bestTotal - 1e-12) {
      best = i + 1;
      bestTotal = total;
    }
  });
  return { net, cumulative, best, bestTotal: tidy(bestTotal) };
}

/* ---------- Markets ---------- */

export function marketCurves(m: EconomicsMarket, shifted = true) {
  return {
    a: m.demand.intercept + (shifted ? (m.demandShift ?? 0) : 0),
    b: m.demand.slope,
    c: m.supply.intercept + (shifted ? (m.supplyShift ?? 0) : 0),
    d: m.supply.slope,
  };
}
export const quantityDemanded = (m: EconomicsMarket, p: number, shifted = true) => {
  const { a, b } = marketCurves(m, shifted);
  return Math.max(0, a - b * p);
};
export const quantitySupplied = (m: EconomicsMarket, p: number, shifted = true) => {
  const { c, d } = marketCurves(m, shifted);
  return Math.max(0, c + d * p);
};
export function marketEquilibrium(m: EconomicsMarket, shifted = true) {
  const { a, b, c, d } = marketCurves(m, shifted);
  const price = (a - c) / (b + d);
  return { price: tidy(price), quantity: tidy(a - b * price) };
}
/** Price buyers would pay for the Q-th unit, and the lowest price sellers accept for it. */
export function demandPrice(m: EconomicsMarket, q: number) {
  const { a, b } = marketCurves(m);
  return (a - q) / b;
}
export function supplyPrice(m: EconomicsMarket, q: number) {
  const { c, d } = marketCurves(m);
  return Math.max(0, (q - c) / d);
}
function surplusAt(m: EconomicsMarket, price: number) {
  const { a, b, c, d } = marketCurves(m);
  const choke = a / b,
    floor = Math.max(0, -c / d);
  const consumer = price < choke ? 0.5 * b * (choke - price) ** 2 : 0;
  const producer = price > floor ? c * (price - floor) + 0.5 * d * (price ** 2 - floor ** 2) : 0;
  return { consumer: tidy(consumer), producer: tidy(producer) };
}
export function marketOutcome(m: EconomicsMarket) {
  const eq = marketEquilibrium(m);
  const base = marketEquilibrium(m, false);
  const { consumer, producer } = surplusAt(m, eq.price);
  const { b, d } = marketCurves(m);
  const result = {
    equilibrium: eq,
    original: base,
    consumerSurplus: consumer,
    producerSurplus: producer,
    totalSurplus: tidy(consumer + producer),
    tax: undefined as
      | undefined
      | {
          buyerPrice: number;
          sellerPrice: number;
          quantity: number;
          revenue: number;
          deadweight: number;
          buyerShare: number;
          sellerShare: number;
        },
    control: undefined as
      | undefined
      | {
          binding: boolean;
          demanded: number;
          supplied: number;
          shortage: number;
          excess: number;
          traded: number;
        },
    quota: undefined as undefined | { binding: boolean; traded: number; deadweight: number },
    externality: undefined as
      | undefined
      | { quantity: number; price: number; overproduction: number; deadweight: number },
    marker: undefined as undefined | { demanded: number; supplied: number; gap: number },
  };
  if (m.tax !== undefined) {
    const t = m.tax;
    const buyerPrice = eq.price + (d * t) / (b + d);
    const quantity = eq.quantity - (b * d * t) / (b + d);
    result.tax = {
      buyerPrice: tidy(buyerPrice),
      sellerPrice: tidy(buyerPrice - t),
      quantity: tidy(quantity),
      revenue: tidy(t * quantity),
      deadweight: tidy(0.5 * t * (eq.quantity - quantity)),
      buyerShare: tidy(buyerPrice - eq.price),
      sellerShare: tidy(t - (buyerPrice - eq.price)),
    };
  }
  if (m.control) {
    const p = m.control.price;
    const binding = m.control.kind === "ceiling" ? p < eq.price : p > eq.price;
    const demanded = tidy(binding ? quantityDemanded(m, p) : eq.quantity),
      supplied = tidy(binding ? quantitySupplied(m, p) : eq.quantity);
    result.control = {
      binding,
      demanded,
      supplied,
      shortage: tidy(Math.max(0, demanded - supplied)),
      excess: tidy(Math.max(0, supplied - demanded)),
      traded: tidy(Math.min(demanded, supplied)),
    };
  }
  if (m.quota !== undefined) {
    const binding = m.quota < eq.quantity;
    const traded = binding ? m.quota : eq.quantity;
    const gap = demandPrice(m, traded) - supplyPrice(m, traded);
    result.quota = {
      binding,
      traded: tidy(traded),
      deadweight: tidy(binding ? 0.5 * gap * (eq.quantity - traded) : 0),
    };
  }
  if (m.externalCost !== undefined) {
    const e = m.externalCost;
    const price = eq.price + (d * e) / (b + d);
    const quantity = eq.quantity - (b * d * e) / (b + d);
    result.externality = {
      quantity: tidy(quantity),
      price: tidy(price),
      overproduction: tidy(eq.quantity - quantity),
      deadweight: tidy(0.5 * e * (eq.quantity - quantity)),
    };
  }
  if (m.marker !== undefined) {
    const demanded = tidy(quantityDemanded(m, m.marker)),
      supplied = tidy(quantitySupplied(m, m.marker));
    result.marker = { demanded, supplied, gap: tidy(demanded - supplied) };
  }
  return result;
}
/** A shared price and quantity scale so cases can be compared on the same axes. */
export function marketScale(models: EconomicsMarket[]) {
  let maxP = 1,
    maxQ = 1;
  for (const m of models) {
    for (const shifted of [false, true]) {
      const { a, b, c, d } = marketCurves(m, shifted);
      const eq = marketEquilibrium(m, shifted);
      maxP = Math.max(maxP, eq.price * 1.6, Math.min(a / b, eq.price * 2.4));
      maxQ = Math.max(maxQ, eq.quantity * 1.45, Math.min(a, eq.quantity * 1.9), c + d * eq.price);
    }
    if (m.control) maxP = Math.max(maxP, m.control.price * 1.15);
    if (m.marker !== undefined) maxP = Math.max(maxP, m.marker * 1.15);
  }
  return { maxP: niceCeiling(maxP), maxQ: niceCeiling(maxQ) };
}
export function niceCeiling(v: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * power >= v - 1e-9) return tidy(step * power);
  }
  return tidy(10 * power);
}

export function elasticityAnalysis(m: Of<"elasticity">) {
  const [p1, p2] = m.prices;
  const q = (p: number) => m.demand.intercept - m.demand.slope * p;
  const q1 = q(p1),
    q2 = q(p2);
  const pctQ = (q2 - q1) / ((q1 + q2) / 2),
    pctP = (p2 - p1) / ((p1 + p2) / 2);
  const elasticity = Math.abs(pctQ / pctP);
  const kind =
    Math.abs(elasticity - 1) < 1e-9 ? "unit elastic" : elasticity > 1 ? "elastic" : "inelastic";
  return {
    q1: tidy(q1),
    q2: tidy(q2),
    percentQuantity: tidy(pctQ * 100),
    percentPrice: tidy(pctP * 100),
    elasticity: tidy(elasticity),
    kind,
    revenue1: tidy(p1 * q1),
    revenue2: tidy(p2 * q2),
    revenueChange: tidy(p2 * q2 - p1 * q1),
  };
}

/* ---------- Firms ---------- */

export function costsAt(m: EconomicsCosts, q: number) {
  const variable = m.linearCost * q + m.quadraticCost * q * q;
  const total = m.fixedCost + variable;
  return {
    fixed: m.fixedCost,
    variable: tidy(variable),
    total: tidy(total),
    averageFixed: q > 0 ? tidy(m.fixedCost / q) : Number.POSITIVE_INFINITY,
    averageVariable: tidy(m.linearCost + m.quadraticCost * q),
    averageTotal: q > 0 ? tidy(total / q) : Number.POSITIVE_INFINITY,
    marginal: tidy(m.linearCost + 2 * m.quadraticCost * q),
  };
}
export function costsAnalysis(m: EconomicsCosts) {
  const efficientScale = Math.sqrt(m.fixedCost / m.quadraticCost);
  const minimumAverage =
    efficientScale > 0 ? costsAt(m, efficientScale).averageTotal : m.linearCost;
  const decision =
    m.price === undefined
      ? undefined
      : (() => {
          const quantity = Math.max(0, (m.price - m.linearCost) / (2 * m.quadraticCost));
          const at = costsAt(m, quantity);
          const revenue = m.price * quantity;
          return {
            quantity: tidy(quantity),
            revenue: tidy(revenue),
            totalCost: at.total,
            averageTotal: at.averageTotal,
            profit: tidy(revenue - at.total),
          };
        })();
  return { efficientScale: tidy(efficientScale), minimumAverage: tidy(minimumAverage), decision };
}
export function costsScale(models: EconomicsCosts[]) {
  let maxQ = 1,
    maxC = 1;
  for (const m of models) {
    const a = costsAnalysis(m);
    maxQ = Math.max(maxQ, a.efficientScale * 2, (a.decision?.quantity ?? 0) * 1.4);
  }
  maxQ = niceCeiling(maxQ);
  for (const m of models) {
    const a = costsAnalysis(m);
    maxC = Math.max(maxC, a.minimumAverage * 2.2, (m.price ?? 0) * 1.4);
  }
  return { maxQ, maxC: niceCeiling(maxC) };
}

export function monopolyAnalysis(m: Of<"monopoly">) {
  const A = m.demandIntercept,
    B = m.demandSlope,
    c = m.marginalCost;
  const quantity = (A - c) / (2 * B),
    price = A - B * quantity,
    competitiveQuantity = (A - c) / B;
  return {
    quantity: tidy(quantity),
    price: tidy(price),
    competitiveQuantity: tidy(competitiveQuantity),
    competitivePrice: c,
    profit: tidy((price - c) * quantity),
    consumerSurplus: tidy(0.5 * quantity * (A - price)),
    deadweight: tidy(0.5 * (price - c) * (competitiveQuantity - quantity)),
    marginalRevenue: (q: number) => tidy(A - 2 * B * q),
  };
}

/* ---------- Strategy ---------- */

export function gameAnalysis(m: EconomicsGame) {
  const rows = m.rowStrategies.length,
    cols = m.columnStrategies.length;
  const rowBest = Array.from({ length: cols }, (_, c) => {
    const best = Math.max(...m.payoffs.map((row) => row[c]![0]));
    return m.payoffs.flatMap((row, r) => (row[c]![0] === best ? [r] : []));
  });
  const columnBest = Array.from({ length: rows }, (_, r) => {
    const best = Math.max(...m.payoffs[r]!.map((cell) => cell[1]));
    return m.payoffs[r]!.flatMap((cell, c) => (cell[1] === best ? [c] : []));
  });
  const nash: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (rowBest[c]!.includes(r) && columnBest[r]!.includes(c)) nash.push([r, c]);
  const rowDominant = m.rowStrategies.findIndex((_, r) =>
    m.rowStrategies.every(
      (__, other) =>
        other === r || m.payoffs[r]!.every((cell, c) => cell[0] > m.payoffs[other]![c]![0]),
    ),
  );
  const columnDominant = m.columnStrategies.findIndex((_, c) =>
    m.columnStrategies.every(
      (__, other) => other === c || m.payoffs.every((row) => row[c]![1] > row[other]![1]),
    ),
  );
  return {
    rowBest,
    columnBest,
    nash,
    rowDominant: rowDominant < 0 ? undefined : rowDominant,
    columnDominant: columnDominant < 0 ? undefined : columnDominant,
  };
}

export const repeatedStrategyNames: Record<EconomicsRepeated["strategies"][number], string> = {
  always_cooperate: "Always cooperate",
  always_defect: "Always defect",
  tit_for_tat: "Tit for tat",
  grim_trigger: "Grim trigger",
};
export function repeatedPlay(m: EconomicsRepeated) {
  const history: Array<{ moves: [boolean, boolean]; payoffs: [number, number] }> = [];
  const choose = (s: EconomicsRepeated["strategies"][number], me: 0 | 1): boolean => {
    const other = me === 0 ? 1 : 0;
    if (s === "always_cooperate") return true;
    if (s === "always_defect") return false;
    if (s === "tit_for_tat") return history.length === 0 || history.at(-1)!.moves[other];
    return history.every((h) => h.moves[other]);
  };
  const pay = (mine: boolean, theirs: boolean) =>
    mine ? (theirs ? m.reward : m.sucker) : theirs ? m.temptation : m.punishment;
  for (let i = 0; i < m.rounds; i++) {
    const a = choose(m.strategies[0], 0),
      b = choose(m.strategies[1], 1);
    history.push({ moves: [a, b], payoffs: [pay(a, b), pay(b, a)] });
  }
  const totals: [number, number] = [
    history.reduce((s, h) => s + h.payoffs[0], 0),
    history.reduce((s, h) => s + h.payoffs[1], 0),
  ];
  return { history, totals };
}

/* ---------- Words ---------- */

const curve = (m: EconomicsMarket, shifted = true) => {
  const { a, b, c, d } = marketCurves(m, shifted);
  return {
    demand: "Qd = " + economicsNumber(a) + " − " + economicsNumber(b) + "P",
    supply: "Qs = " + (c === 0 ? "" : economicsNumber(c) + " + ") + economicsNumber(d) + "P",
  };
};

/** Every given value of a model, one statement per entry, for screen readers and tutors. */
export function economicsGivenList(m: EconomicsModel): string[] {
  switch (m.kind) {
    case "ppf":
      return [
        "Frontier points (" +
          m.goodX.toLowerCase() +
          ", " +
          m.goodY.toLowerCase() +
          "): " +
          m.points
            .map((p) => "(" + economicsNumber(p.x) + ", " + economicsNumber(p.y) + ")")
            .join(", "),
        ...(m.marker
          ? [
              "Marked production point: " +
                economicsNumber(m.marker.x) +
                " " +
                m.goodX.toLowerCase() +
                " and " +
                economicsNumber(m.marker.y) +
                " " +
                m.goodY.toLowerCase(),
            ]
          : []),
      ];
    case "trade":
      return [
        ...m.producers.map(
          (p) =>
            p.name +
            ": at most " +
            economicsNumber(p.maxX) +
            " " +
            m.goodX.toLowerCase() +
            " or " +
            economicsNumber(p.maxY) +
            " " +
            m.goodY.toLowerCase(),
        ),
        ...(m.terms === undefined
          ? []
          : [
              "Terms of trade: " +
                economicsNumber(m.terms) +
                " " +
                m.goodY.toLowerCase() +
                " for each unit of " +
                m.goodX.toLowerCase(),
            ]),
      ];
    case "margin":
      return m.benefits.map(
        (b, i) =>
          m.unit +
          " " +
          (i + 1) +
          ": marginal benefit " +
          economicsMoney(b) +
          ", marginal cost " +
          economicsMoney(m.costs[i]!),
      );
    case "market": {
      const now = curve(m),
        before = curve(m, false);
      const shifted = (m.demandShift ?? 0) !== 0 || (m.supplyShift ?? 0) !== 0;
      return [
        "Market for " + m.good.toLowerCase(),
        ...(shifted ? ["Before the change: " + before.demand + ", " + before.supply] : []),
        (shifted ? "After the change: " : "") + now.demand + ", " + now.supply,
        ...(m.marker !== undefined ? ["Marked price: " + economicsMoney(m.marker)] : []),
        ...(m.tax !== undefined ? ["Tax on sellers: " + economicsMoney(m.tax) + " per unit"] : []),
        ...(m.control ? ["Price " + m.control.kind + ": " + economicsMoney(m.control.price)] : []),
        ...(m.quota !== undefined ? ["Quantity cap: " + economicsNumber(m.quota) + " units"] : []),
        ...(m.externalCost !== undefined
          ? ["External cost: " + economicsMoney(m.externalCost) + " per unit, borne by others"]
          : []),
      ];
    }
    case "elasticity":
      return [
        "Demand for " +
          m.good.toLowerCase() +
          ": Qd = " +
          economicsNumber(m.demand.intercept) +
          " − " +
          economicsNumber(m.demand.slope) +
          "P",
        "Price moves from " + economicsMoney(m.prices[0]) + " to " + economicsMoney(m.prices[1]),
      ];
    case "costs":
      return [
        "Fixed cost " + economicsMoney(m.fixedCost),
        "Total cost = " +
          economicsNumber(m.fixedCost) +
          (m.linearCost ? " + " + economicsNumber(m.linearCost) + "q" : "") +
          " + " +
          (m.quadraticCost === 1 ? "" : economicsNumber(m.quadraticCost)) +
          "q²",
        "Marginal cost MC = " +
          (m.linearCost ? economicsNumber(m.linearCost) + " + " : "") +
          economicsNumber(2 * m.quadraticCost) +
          "q",
        ...(m.price !== undefined ? ["Market price " + economicsMoney(m.price)] : []),
      ];
    case "monopoly":
      return [
        "Demand: P = " +
          economicsNumber(m.demandIntercept) +
          " − " +
          (m.demandSlope === 1 ? "" : economicsNumber(m.demandSlope)) +
          "Q",
        "Constant marginal cost " + economicsMoney(m.marginalCost),
      ];
    case "game":
      return [
        m.rowPlayer + " chooses a row; " + m.columnPlayer + " chooses a column",
        ...m.rowStrategies.flatMap((r, i) =>
          m.columnStrategies.map(
            (c, j) =>
              r +
              " / " +
              c +
              ": " +
              m.rowPlayer +
              " " +
              economicsNumber(m.payoffs[i]![j]![0]) +
              ", " +
              m.columnPlayer +
              " " +
              economicsNumber(m.payoffs[i]![j]![1]),
          ),
        ),
      ];
    case "repeated":
      return [
        "Each round: both " +
          m.cooperate.toLowerCase() +
          " " +
          economicsNumber(m.reward) +
          " each; both " +
          m.defect.toLowerCase() +
          " " +
          economicsNumber(m.punishment) +
          " each; a lone " +
          m.defect.toLowerCase() +
          " earns " +
          economicsNumber(m.temptation) +
          " against " +
          economicsNumber(m.sucker),
        "Strategies: " +
          repeatedStrategyNames[m.strategies[0]] +
          " against " +
          repeatedStrategyNames[m.strategies[1]] +
          ", " +
          m.rounds +
          " rounds",
      ];
  }
}

/** A plain-language statement of the given values, used by tutors and screen readers. */
export function economicsGivens(m: EconomicsModel): string {
  return economicsGivenList(m).join(". ") + ".";
}

/** Derived results, shown only after the learner has answered. */
export function economicsMeasures(m: EconomicsModel): Array<{ label: string; value: string }> {
  const n = economicsNumber,
    money = economicsMoney;
  switch (m.kind) {
    case "ppf":
      return ppfSegments(m).map((s) => ({
        label: n(s.fromX) + "→" + n(s.toX) + " " + m.goodX.toLowerCase(),
        value: n(s.costPerX) + " " + m.goodY.toLowerCase() + " each",
      }));
    case "trade": {
      const t = tradeAnalysis(m);
      return [
        ...t.producers.map((p) => ({
          label: p.name + ": cost of one " + economicsSingular(m.goodX),
          value: n(p.costOfX) + " " + m.goodY.toLowerCase(),
        })),
        {
          label: "Comparative advantage in " + m.goodX.toLowerCase(),
          value: t.xSpecialist ?? "Neither",
        },
      ];
    }
    case "margin": {
      const a = marginAnalysis(m);
      return [
        { label: "Best number of " + m.unit.toLowerCase() + "s", value: n(a.best) },
        { label: "Total net benefit", value: money(a.bestTotal) },
      ];
    }
    case "market": {
      const o = marketOutcome(m);
      const out = [
        { label: "Equilibrium price", value: money(o.equilibrium.price) },
        { label: "Equilibrium quantity", value: n(o.equilibrium.quantity) },
      ];
      if (m.view === "surplus" || m.view === "equilibrium")
        out.push(
          { label: "Consumer surplus", value: money(o.consumerSurplus) },
          { label: "Producer surplus", value: money(o.producerSurplus) },
        );
      if (o.marker)
        out.push({
          label: o.marker.gap >= 0 ? "Shortage at marked price" : "Surplus at marked price",
          value: n(Math.abs(o.marker.gap)),
        });
      if (o.quota?.binding)
        out.push({ label: "Deadweight loss", value: money(o.quota.deadweight) });
      if (o.tax)
        out.push(
          { label: "Buyers pay", value: money(o.tax.buyerPrice) },
          { label: "Sellers keep", value: money(o.tax.sellerPrice) },
          { label: "Quantity after tax", value: n(o.tax.quantity) },
          { label: "Tax revenue", value: money(o.tax.revenue) },
          { label: "Deadweight loss", value: money(o.tax.deadweight) },
        );
      if (o.control)
        out.push(
          o.control.binding
            ? o.control.shortage > 0
              ? { label: "Shortage", value: n(o.control.shortage) }
              : { label: "Unsold surplus", value: n(o.control.excess) }
            : { label: "Control", value: "Not binding" },
        );
      if (o.externality)
        out.push(
          { label: "Efficient quantity", value: n(o.externality.quantity) },
          { label: "Overproduction", value: n(o.externality.overproduction) },
          { label: "Deadweight loss", value: money(o.externality.deadweight) },
        );
      return out;
    }
    case "elasticity": {
      const e = elasticityAnalysis(m);
      return [
        { label: "Midpoint elasticity", value: n(e.elasticity) + " (" + e.kind + ")" },
        { label: "Revenue before", value: money(e.revenue1) },
        { label: "Revenue after", value: money(e.revenue2) },
      ];
    }
    case "costs": {
      const a = costsAnalysis(m);
      return [
        {
          label: "Lowest average total cost",
          value: money(a.minimumAverage) + " at q = " + n(a.efficientScale),
        },
        ...(a.decision
          ? [
              { label: "Output where P = MC", value: n(a.decision.quantity) },
              { label: "Profit", value: money(a.decision.profit) },
            ]
          : []),
      ];
    }
    case "monopoly": {
      const a = monopolyAnalysis(m);
      return [
        { label: "Monopoly output", value: n(a.quantity) },
        { label: "Monopoly price", value: money(a.price) },
        { label: "Competitive output", value: n(a.competitiveQuantity) },
        { label: "Deadweight loss", value: money(a.deadweight) },
      ];
    }
    case "game": {
      const a = gameAnalysis(m);
      return [
        {
          label: "Nash equilibrium",
          value: a.nash.length
            ? a.nash.map(([r, c]) => m.rowStrategies[r] + " / " + m.columnStrategies[c]).join("; ")
            : "None in pure strategies",
        },
        {
          label: m.rowPlayer + " dominant strategy",
          value: a.rowDominant === undefined ? "None" : m.rowStrategies[a.rowDominant]!,
        },
        {
          label: m.columnPlayer + " dominant strategy",
          value: a.columnDominant === undefined ? "None" : m.columnStrategies[a.columnDominant]!,
        },
      ];
    }
    case "repeated": {
      const a = repeatedPlay(m);
      return [
        { label: repeatedStrategyNames[m.strategies[0]] + " total", value: n(a.totals[0]) },
        { label: repeatedStrategyNames[m.strategies[1]] + " total", value: n(a.totals[1]) },
      ];
    }
  }
}

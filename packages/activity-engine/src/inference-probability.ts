/** Numerical probabilities for bounded teaching models, never response marking. */
const sqrtTwoPi = Math.sqrt(2 * Math.PI);
const probability = (x: number) => Math.max(0, Math.min(1, x));

export function normalDensity(z: number): number {
  return Math.exp(-0.5 * z * z) / sqrtTwoPi;
}

/** Abramowitz-Stegun normal-tail approximation; absolute error below 8e-8. */
export function normalSurvival(z: number): number {
  if (Number.isNaN(z)) throw Error("A normal score must be a number.");
  if (z === 0) return 0.5;
  if (!Number.isFinite(z)) return z > 0 ? 0 : 1;
  const x = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * x);
  const tail =
    normalDensity(x) *
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return probability(z > 0 ? tail : 1 - tail);
}

export function normalCdf(z: number): number {
  return normalSurvival(-z);
}

export function normalInterval(lower: number, upper: number): number {
  if (lower > upper || Number.isNaN(lower) || Number.isNaN(upper))
    throw Error("Order the normal interval endpoints.");
  return probability(
    lower >= 0
      ? normalSurvival(lower) - normalSurvival(upper)
      : normalCdf(upper) - normalCdf(lower),
  );
}

export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw Error("Use a probability strictly between zero and one.");
  if (p === 0.5) return 0;
  let low = -12,
    high = 12;
  for (let iteration = 0; iteration < 80; iteration++) {
    const middle = (low + high) / 2;
    if (normalCdf(middle) < p) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

const gammaCoefficients = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  const shifted = z - 1;
  let series = 0.99999999999980993;
  for (let i = 0; i < gammaCoefficients.length; i++)
    series += gammaCoefficients[i]! / (shifted + i + 1);
  const t = shifted + 7.5;
  return Math.log(sqrtTwoPi) + (shifted + 0.5) * Math.log(t) - t + Math.log(series);
}

function betaFraction(a: number, b: number, x: number): number {
  const floor = (v: number) => (Math.abs(v) < 1e-300 ? (v < 0 ? -1e-300 : 1e-300) : v);
  const qab = a + b,
    qap = a + 1,
    qam = a - 1;
  let c = 1,
    d = 1 / floor(1 - (qab * x) / qap),
    h = d;
  for (let m = 1; m <= 300; m++) {
    const twice = 2 * m;
    let coefficient = (m * (b - m) * x) / ((qam + twice) * (a + twice));
    d = 1 / floor(1 + coefficient * d);
    c = floor(1 + coefficient / c);
    h *= d * c;
    coefficient = (-(a + m) * (qab + m) * x) / ((a + twice) * (qap + twice));
    d = 1 / floor(1 + coefficient * d);
    c = floor(1 + coefficient / c);
    const change = d * c;
    h *= change;
    if (Math.abs(change - 1) < 3e-14) return h;
  }
  throw Error("The bounded beta calculation did not converge.");
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x),
  );
  return probability(
    x < (a + 1) / (a + b + 2)
      ? (factor * betaFraction(a, b, x)) / a
      : 1 - (factor * betaFraction(b, a, 1 - x)) / b,
  );
}

export function studentSurvival(t: number, degrees: number): number {
  if (!Number.isFinite(degrees) || degrees < 1 || Number.isNaN(t))
    throw Error("Use at least one degree of freedom and a numeric score.");
  if (t === 0) return 0.5;
  if (!Number.isFinite(t)) return t > 0 ? 0 : 1;
  const halfTail = 0.5 * regularizedBeta(degrees / (degrees + t * t), degrees / 2, 0.5);
  return t > 0 ? halfTail : 1 - halfTail;
}

export function studentDensity(t: number, degrees: number): number {
  if (!(degrees >= 1) || !Number.isFinite(degrees))
    throw Error("Use at least one degree of freedom.");
  return Math.exp(
    logGamma((degrees + 1) / 2) -
      logGamma(degrees / 2) -
      0.5 * Math.log(degrees * Math.PI) -
      ((degrees + 1) / 2) * Math.log1p((t * t) / degrees),
  );
}

export function studentQuantile(p: number, degrees: number): number {
  if (!(p > 0 && p < 1) || !Number.isFinite(degrees) || degrees < 1)
    throw Error("Use an interior probability and at least one degree of freedom.");
  if (p === 0.5) return 0;
  if (p < 0.5) return -studentQuantile(1 - p, degrees);
  let low = 0,
    high = 1;
  while (studentSurvival(high, degrees) > 1 - p) {
    high *= 2;
    if (high > 1e12) throw Error("The requested t quantile is outside the teaching range.");
  }
  for (let iteration = 0; iteration < 80; iteration++) {
    const middle = (low + high) / 2;
    if (studentSurvival(middle, degrees) > 1 - p) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function binomialMass(trials: number, p: number, successes: number): number {
  if (
    !Number.isInteger(trials) ||
    trials < 1 ||
    trials > 200 ||
    !Number.isInteger(successes) ||
    !(p >= 0 && p <= 1)
  )
    throw Error("Use a bounded binomial count and probability.");
  if (successes < 0 || successes > trials) return 0;
  if (p === 0) return successes === 0 ? 1 : 0;
  if (p === 1) return successes === trials ? 1 : 0;
  const k = Math.min(successes, trials - successes);
  let combinations = 1;
  for (let i = 1; i <= k; i++) combinations *= (trials - k + i) / i;
  return combinations * p ** successes * (1 - p) ** (trials - successes);
}

export function poissonMass(expected: number, count: number): number {
  if (
    !Number.isFinite(expected) ||
    expected < 0 ||
    expected > 40 ||
    !Number.isInteger(count) ||
    count > 200
  )
    throw Error("Use a bounded Poisson mean and an integer count.");
  if (count < 0) return 0;
  let mass = Math.exp(-expected);
  for (let k = 1; k <= count; k++) mass *= expected / k;
  return mass;
}

export function countEventProbability(
  mass: (k: number) => number,
  target: number,
  event: "equal" | "at_least" | "at_most",
): number {
  if (!Number.isInteger(target) || target < 0 || target > 200)
    throw Error("Use a bounded, nonnegative event threshold.");
  if (event === "equal") return probability(mass(target));
  const last = event === "at_least" ? target - 1 : target;
  let cumulative = 0;
  for (let k = 0; k <= last; k++) cumulative += mass(k);
  return probability(event === "at_least" ? 1 - cumulative : cumulative);
}

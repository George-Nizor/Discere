export interface ParsedNumericAnswer {
  value: number;
  unit?: string;
}
export interface NumericAuthority {
  value: number;
  unit?: string;
  absoluteTolerance?: number;
  relativeTolerance?: number;
}
export interface NumericAssessment {
  correct: boolean;
  parsed: ParsedNumericAnswer | null;
  error?: "unreadable" | "unit_mismatch" | "outside_tolerance";
  difference?: number;
}

const UNIT_ALIASES: Record<string, { canonical: string; factor: number }> = {
  m: { canonical: "m", factor: 1 },
  metre: { canonical: "m", factor: 1 },
  metres: { canonical: "m", factor: 1 },
  meter: { canonical: "m", factor: 1 },
  meters: { canonical: "m", factor: 1 },
  cm: { canonical: "m", factor: 0.01 },
  mm: { canonical: "m", factor: 0.001 },
  km: { canonical: "m", factor: 1000 },
  s: { canonical: "s", factor: 1 },
  seconds: { canonical: "s", factor: 1 },
  second: { canonical: "s", factor: 1 },
  sec: { canonical: "s", factor: 1 },
  min: { canonical: "s", factor: 60 },
  minute: { canonical: "s", factor: 60 },
  minutes: { canonical: "s", factor: 60 },
  "m/s": { canonical: "m/s", factor: 1 },
  "m/s²": { canonical: "m/s²", factor: 1 },
  "m/s^2": { canonical: "m/s²", factor: 1 },
  "m/s2": { canonical: "m/s²", factor: 1 },
  n: { canonical: "N", factor: 1 },
  kn: { canonical: "N", factor: 1000 },
  newton: { canonical: "N", factor: 1 },
  newtons: { canonical: "N", factor: 1 },
  j: { canonical: "J", factor: 1 },
  kj: { canonical: "J", factor: 1000 },
  joule: { canonical: "J", factor: 1 },
  joules: { canonical: "J", factor: 1 },
  w: { canonical: "W", factor: 1 },
  watt: { canonical: "W", factor: 1 },
  watts: { canonical: "W", factor: 1 },
  kg: { canonical: "kg", factor: 1 },
  g: { canonical: "kg", factor: 0.001 },
  gram: { canonical: "kg", factor: 0.001 },
  grams: { canonical: "kg", factor: 0.001 },
  mol: { canonical: "mol", factor: 1 },
  mmol: { canonical: "mol", factor: 0.001 },
  mole: { canonical: "mol", factor: 1 },
  moles: { canonical: "mol", factor: 1 },
  u: { canonical: "u", factor: 1 },
  amu: { canonical: "u", factor: 1 },
  da: { canonical: "u", factor: 1 },
  dalton: { canonical: "u", factor: 1 },
  daltons: { canonical: "u", factor: 1 },
  e: { canonical: "e", factor: 1 },
  electron: { canonical: "electrons", factor: 1 },
  electrons: { canonical: "electrons", factor: 1 },
  proton: { canonical: "protons", factor: 1 },
  protons: { canonical: "protons", factor: 1 },
  neutron: { canonical: "neutrons", factor: 1 },
  neutrons: { canonical: "neutrons", factor: 1 },
  particle: { canonical: "particles", factor: 1 },
  particles: { canonical: "particles", factor: 1 },
  ion: { canonical: "ions", factor: 1 },
  ions: { canonical: "ions", factor: 1 },
  atom: { canonical: "atoms", factor: 1 },
  atoms: { canonical: "atoms", factor: 1 },
  percent: { canonical: "%", factor: 1 },
  probability: { canonical: "probability", factor: 1 },
  "kg·m/s": { canonical: "kg·m/s", factor: 1 },
  "kg*m/s": { canonical: "kg·m/s", factor: 1 },
  "kgm/s": { canonical: "kg·m/s", factor: 1 },
  n·s: { canonical: "kg·m/s", factor: 1 },
  "n*s": { canonical: "kg·m/s", factor: 1 },
  ns: { canonical: "kg·m/s", factor: 1 },
  "%": { canonical: "%", factor: 1 },
  a: { canonical: "A", factor: 1 },
  amp: { canonical: "A", factor: 1 },
  amps: { canonical: "A", factor: 1 },
  ampere: { canonical: "A", factor: 1 },
  amperes: { canonical: "A", factor: 1 },
  ma: { canonical: "A", factor: 0.001 },
  milliamp: { canonical: "A", factor: 0.001 },
  milliamps: { canonical: "A", factor: 0.001 },
  v: { canonical: "V", factor: 1 },
  volt: { canonical: "V", factor: 1 },
  volts: { canonical: "V", factor: 1 },
  mv: { canonical: "V", factor: 0.001 },
  ohm: { canonical: "Ω", factor: 1 },
  ohms: { canonical: "Ω", factor: 1 },
  ω: { canonical: "Ω", factor: 1 },
  kohm: { canonical: "Ω", factor: 1000 },
  kohms: { canonical: "Ω", factor: 1000 },
  kω: { canonical: "Ω", factor: 1000 },
};

function normaliseUnit(raw: string): { canonical: string; factor: number } | null {
  return UNIT_ALIASES[raw.toLocaleLowerCase().replaceAll(" ", "")] ?? null;
}

export function parseNumericAnswer(input: string): ParsedNumericAnswer | null {
  const match = input
    .trim()
    .replaceAll("−", "-")
    .replace(/([a-zA-ZΩω%²])\.$/, "$1")
    .match(
      /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?))?\s*([a-zA-ZΩω%][a-zA-ZΩω·*/^²0-9]*)?$/i,
    );
  if (!match?.[1]) return null;
  const denominator = match[2] === undefined ? 1 : Number(match[2]);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  const value = Number(match[1]) / denominator;
  if (!Number.isFinite(value)) return null;
  const rawUnit = match[3];
  if (!rawUnit) return { value };
  const unit = normaliseUnit(rawUnit);
  if (!unit) return { value, unit: rawUnit };
  return { value: value * unit.factor, unit: unit.canonical };
}

const squash = (text: string) => text.toLocaleLowerCase().replace(/\s+/g, "");

/**
 * The unit a question itself declares is always readable, even when it is not in the alias
 * table: "52 °", "£24", "£3m", "1.2 L☉" and "4.5 million years" all mean the declared unit.
 * Returns the bare number text, or null when the input does not carry the declared unit.
 */
export function stripDeclaredUnit(input: string, unit: string | undefined): string | null {
  if (!unit) return null;
  const declared = squash(unit);
  let text = squash(input.replaceAll("−", "-"));
  if (!declared || !text) return null;
  const currency = /^[£$€¥]/.exec(declared)?.[0];
  if (currency && text.startsWith(currency)) {
    text = text.slice(currency.length);
    const rest = declared.slice(currency.length);
    if (rest && text.endsWith(rest)) text = text.slice(0, -rest.length);
    else if (rest) return null;
    return text;
  }
  if (text.endsWith(declared)) return text.slice(0, -declared.length);
  return null;
}

export function assessNumericAnswer(input: string, authority: NumericAuthority): NumericAssessment {
  const bare = stripDeclaredUnit(input, authority.unit);
  const bareQuantity = bare === null ? null : parseNumericAnswer(bare);
  // The declared unit only explains the input when what remains is a plain number; "1300 cm"
  // against metres must stay centimetres, not become "1300 c" in metres.
  const quantity =
    bareQuantity && bareQuantity.unit === undefined ? bareQuantity : parseNumericAnswer(input);
  if (!quantity) return { correct: false, parsed: null, error: "unreadable" };
  // Only a declared probability interprets a percentage as a fraction of one.
  const parsed =
    authority.unit === "probability" && quantity.unit === "%"
      ? { value: quantity.value / 100, unit: "probability" }
      : quantity;
  if (authority.unit) {
    const authorityUnit = normaliseUnit(authority.unit) ?? { canonical: authority.unit, factor: 1 };
    if (parsed.unit && parsed.unit !== authorityUnit.canonical)
      return { correct: false, parsed, error: "unit_mismatch" };
  } else if (authority.unit === "" && parsed.unit) {
    return { correct: false, parsed, error: "unit_mismatch" };
  }
  // Bare values use the unit asked for; explicit units are converted to the same base.
  const authorityFactor = authority.unit ? (normaliseUnit(authority.unit)?.factor ?? 1) : 1;
  const expected = authority.value * authorityFactor;
  const actual = parsed.unit ? parsed.value : parsed.value * authorityFactor;
  const difference = Math.abs(actual - expected);
  const absoluteTolerance = (authority.absoluteTolerance ?? 1e-9) * authorityFactor;
  const relativeTolerance = authority.relativeTolerance ?? 0.01;
  const allowed = Math.max(absoluteTolerance, Math.abs(expected) * relativeTolerance);
  return difference <= allowed
    ? { correct: true, parsed, difference }
    : { correct: false, parsed, error: "outside_tolerance", difference };
}

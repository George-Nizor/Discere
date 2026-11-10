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

interface Unit {
  canonical: string;
  factor: number;
}

/**
 * Unit symbols, matched with their case. SI prefixes are generated for each base symbol so that
 * the table knows when two symbols differ only by case ("mW" and "MW", "mm" and "Mm", "ns" and
 * "Ns"). Such a symbol must be typed in its own case; any other symbol may be typed in any case.
 */
const SYMBOLS = new Map<string, Unit>();
const PREFIXES: Array<[string, number]> = [
  ["p", 1e-12],
  ["n", 1e-9],
  ["µ", 1e-6],
  ["μ", 1e-6],
  ["u", 1e-6],
  ["m", 1e-3],
  ["k", 1e3],
  ["M", 1e6],
  ["G", 1e9],
  ["T", 1e12],
];
const PREFIXED_BASES: Array<[string, string, number, string?]> = [
  ["m", "m", 1],
  ["s", "s", 1],
  ["g", "kg", 0.001],
  ["N", "N", 1],
  ["J", "J", 1],
  ["W", "W", 1],
  ["Wh", "J", 3600],
  ["A", "A", 1],
  ["V", "V", 1],
  ["Ω", "Ω", 1],
  ["C", "C", 1],
  ["Pa", "Pa", 1],
  ["Hz", "Hz", 1],
  ["mol", "mol", 1],
  // "ml" stays readable for millilitres: megalitres are not offered.
  ["L", "L", 1, "pnµμumk"],
  ["B", "B", 1],
  ["b", "bit", 1],
  ["eV", "eV", 1],
  ["Wb", "Wb", 1],
  ["pc", "pc", 1],
];
for (const [symbol, canonical, factor, allowed] of PREFIXED_BASES) {
  SYMBOLS.set(symbol, { canonical, factor });
  for (const [prefix, scale] of PREFIXES)
    if ((allowed === undefined || allowed.includes(prefix)) && !SYMBOLS.has(prefix + symbol))
      SYMBOLS.set(prefix + symbol, { canonical, factor: factor * scale });
}
for (const [symbol, unit] of Object.entries({
  cm: { canonical: "m", factor: 0.01 },
  cL: { canonical: "L", factor: 0.01 },
  KB: { canonical: "B", factor: 1000 },
  min: { canonical: "s", factor: 60 },
  h: { canonical: "s", factor: 3600 },
  "m/s": { canonical: "m/s", factor: 1 },
  "m/s2": { canonical: "m/s²", factor: 1 },
  "kg·m/s": { canonical: "kg·m/s", factor: 1 },
  "kgm/s": { canonical: "kg·m/s", factor: 1 },
  N·s: { canonical: "kg·m/s", factor: 1 },
  Ns: { canonical: "kg·m/s", factor: 1 },
  "%": { canonical: "%", factor: 1 },
  "°": { canonical: "°", factor: 1 },
  "°C": { canonical: "°C", factor: 1 },
  "℃": { canonical: "°C", factor: 1 },
  u: { canonical: "u", factor: 1 },
  Da: { canonical: "u", factor: 1 },
  e: { canonical: "e", factor: 1 },
  K: { canonical: "K", factor: 1 },
  dB: { canonical: "dB", factor: 1 },
}))
  SYMBOLS.set(symbol, unit);

/** Unit words, matched in any case. */
const WORDS = new Map<string, Unit>();
function words(canonical: string, factor: number, names: string[]): void {
  for (const name of names) WORDS.set(name, { canonical, factor });
}
words("m", 1, ["metre", "metres", "meter", "meters"]);
words("m", 0.001, ["millimetre", "millimetres", "millimeter", "millimeters"]);
words("m", 0.01, ["centimetre", "centimetres", "centimeter", "centimeters"]);
words("m", 1000, ["kilometre", "kilometres", "kilometer", "kilometers"]);
words("s", 1, ["second", "seconds", "sec", "secs"]);
words("s", 60, ["minute", "minutes", "mins"]);
words("s", 3600, ["hour", "hours", "hr", "hrs"]);
words("s", 86400, ["day", "days"]);
words("s", 604800, ["week", "weeks"]);
words("N", 1, ["newton", "newtons"]);
words("J", 1, ["joule", "joules"]);
words("W", 1, ["watt", "watts"]);
words("kg", 0.001, ["gram", "grams"]);
words("kg", 1, ["kilogram", "kilograms"]);
words("mol", 1, ["mole", "moles"]);
words("u", 1, ["amu", "dalton", "daltons"]);
words("electrons", 1, ["electron", "electrons"]);
words("protons", 1, ["proton", "protons"]);
words("neutrons", 1, ["neutron", "neutrons"]);
words("particles", 1, ["particle", "particles"]);
words("ions", 1, ["ion", "ions"]);
words("atoms", 1, ["atom", "atoms"]);
words("%", 1, ["percent", "per·cent", "pct"]);
words("probability", 1, ["probability"]);
words("A", 1, ["amp", "amps", "ampere", "amperes"]);
words("A", 0.001, ["milliamp", "milliamps"]);
words("V", 1, ["volt", "volts"]);
words("Ω", 1, ["ohm", "ohms"]);
words("Ω", 1000, ["kohm", "kohms"]);
words("°", 1, ["deg", "degree", "degrees"]);
words("°C", 1, ["degc", "deg·c", "degrees·c", "degree·c", "celsius", "degrees·celsius"]);

/** Unit text that means the asked-for unit only when that unit is the one asked for. */
const CONTEXT_WORDS: Record<string, string[]> = { "°C": ["c"] };

/** Symbols whose case carries meaning: another known symbol differs from them only by case. */
const FOLDED = new Map<string, string[]>();
for (const symbol of SYMBOLS.keys()) {
  const folded = symbol.toLocaleLowerCase();
  FOLDED.set(folded, [...(FOLDED.get(folded) ?? []), symbol]);
}
function caseSensitive(token: string): boolean {
  return (FOLDED.get(token.toLocaleLowerCase())?.length ?? 0) > 1;
}

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

function plainDigits(text: string): string {
  return text
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/gu, (digit) => String(SUPERSCRIPTS.indexOf(digit)))
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/gu, (digit) => String(SUBSCRIPTS.indexOf(digit)))
    .replaceAll("⁻", "-")
    .replaceAll("⁺", "+");
}

/**
 * A unit as a keyboard types it, keeping its case: superscript or subscript digits as plain
 * ones, "^" dropped, "×" as "x", and any multiplication sign or space between parts as "·".
 * So "W/m^2" is "W/m2", "N m" and "N*m" are "N·m", and "x10^8 m/s" is "x108·m/s".
 */
function unitKey(text: string): string {
  return plainDigits(text.trim())
    .replaceAll("^", "")
    .replaceAll("×", "x")
    .replace(/[*⋅]/gu, "·")
    .replace(/\s*([/·])\s*/gu, "$1")
    .replace(/\s+/gu, "·");
}

/** The parts of a unit to compare: runs of letters and single other characters. */
function unitTokens(text: string): string[] {
  return unitKey(text)
    .split("·")
    .flatMap((chunk) => chunk.match(/\p{L}+|[^\p{L}]/gu) ?? []);
}

function sameToken(typed: string, declared: string): boolean {
  if (typed === declared) return true;
  const a = typed.toLocaleLowerCase();
  const b = declared.toLocaleLowerCase();
  if (!/^\p{L}/u.test(a)) return false;
  if (a === b) return !caseSensitive(typed) && !caseSensitive(declared);
  // A countable unit in the singular or plural: "12 row" for "rows".
  if (a.length < 3 || b.length < 3 || SYMBOLS.has(typed) || SYMBOLS.has(declared)) return false;
  return a === `${b}s` || b === `${a}s` || a === `${b}es` || b === `${a}es`;
}

/** Two unit texts name the same unit, comparing part by part as `sameToken` does. */
function sameUnitText(typed: string, declared: string): boolean {
  const a = unitTokens(typed);
  const b = unitTokens(declared);
  return a.length === b.length && a.every((token, index) => sameToken(token, b[index]!));
}

/**
 * A unit as a keyboard types it: lower case, no spaces, and superscript or subscript digits as
 * plain ones, so "W/m2" and "W/m^2" match "W/m²", "GtCO2" matches "GtCO₂" and "x10^8" matches "×10⁸".
 * Kept for callers that compare unit text loosely; marking itself compares with `sameUnitText`.
 */
export function plainUnit(text: string): string {
  return plainDigits(text.toLocaleLowerCase())
    .replace(/\s+/gu, "")
    .replaceAll("^", "")
    .replaceAll("×", "x");
}

function normaliseUnit(raw: string, context?: string): Unit | null {
  const key = unitKey(raw);
  if (context && CONTEXT_WORDS[context]?.includes(key.toLocaleLowerCase()))
    return { canonical: context, factor: 1 };
  const symbol = SYMBOLS.get(key);
  if (symbol) return symbol;
  const word = WORDS.get(key.toLocaleLowerCase());
  if (word) return word;
  const folded = FOLDED.get(key.toLocaleLowerCase());
  return folded?.length === 1 ? SYMBOLS.get(folded[0]!)! : null;
}

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const SEPARATORS = ",    ";

/**
 * Number text as the parser reads it. A minus may be typed with a space ("- 5") or as "−".
 * Thousands may be grouped with commas or spaces, but only in groups of exactly three digits
 * after a first group of one to three that does not start with 0: "1,000", "17,463,600" and
 * "1 000" are read, while "1,5", "1,00" and "0,500" are not, so a decimal comma is never
 * mistaken for a thousands separator. With `scientific`, "1.92 × 10^-14", "1.92*10^-14",
 * "1.92x10⁻¹⁴" and "10^-3" are read as e-notation.
 */
function normaliseNumberText(input: string, scientific: boolean): string {
  let text = input
    .trim()
    .replace(/[−–]/gu, "-")
    .replace(/^([+-])\s+(?=[\d.])/u, "$1")
    .replace(
      new RegExp(
        `(?<![\\d.,])([1-9]\\d{0,2})([${SEPARATORS}])(\\d{3}(?:\\2\\d{3})*)(?![\\d]|[${SEPARATORS}]\\d)`,
        "gu",
      ),
      (_whole, head: string, separator: string, groups: string) =>
        head + groups.replaceAll(separator, ""),
    )
    .replace(/(\p{L}|[%°²³])\.$/u, "$1");
  if (scientific) {
    const power = String.raw`10\s*(?:(?:\^|\*\*)\s*\(?\s*([+-]?)\s*(\d+)\s*\)?|([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))`;
    const exponent = (sign = "", digits = "", superscript = "") =>
      superscript ? plainDigits(superscript) : `${sign}${digits}`;
    text = text
      .replace(
        new RegExp(`^([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))\\s*[x×X*·⋅]\\s*${power}`, "u"),
        (_whole, mantissa: string, sign?: string, digits?: string, superscript?: string) =>
          `${mantissa}e${exponent(sign, digits, superscript)}`,
      )
      .replace(
        new RegExp(`^([+-]?)${power}`, "u"),
        (_whole, lead: string, sign?: string, digits?: string, superscript?: string) =>
          `${lead}1e${exponent(sign, digits, superscript)}`,
      );
  }
  return text;
}

/** The number at the start of the text, as a value or a fraction, and the text after it. */
function splitNumber(text: string): { number: string; rest: string } | null {
  const match = new RegExp(`^(${NUMBER}(?:\\s*\\/\\s*${NUMBER})?)(.*)$`, "iu").exec(text.trim());
  if (!match) return null;
  return { number: match[1]!, rest: match[2]!.trim() };
}

export function parseNumericAnswer(input: string, context?: string): ParsedNumericAnswer | null {
  const match = normaliseNumberText(input, true).match(
    new RegExp(
      `^(${NUMBER})(?:\\s*\\/\\s*(${NUMBER}))?\\s*([\\p{L}%°℃](?:[^=<>+]*[^\\s=<>+])?)?$`,
      "iu",
    ),
  );
  if (!match?.[1]) return null;
  const denominator = match[2] === undefined ? 1 : Number(match[2]);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  const value = Number(match[1]) / denominator;
  if (!Number.isFinite(value)) return null;
  const rawUnit = match[3];
  if (!rawUnit) return { value };
  const unit = normaliseUnit(rawUnit, context);
  if (!unit) return { value, unit: rawUnit };
  return { value: value * unit.factor, unit: unit.canonical };
}

const CURRENCY_WORDS: Record<string, string[]> = {
  $: ["dollar", "dollars", "usd"],
  "£": ["pound", "pounds", "gbp"],
  "€": ["euro", "euros", "eur"],
  "¥": ["yen"],
};

/**
 * The unit a question itself declares is always readable, even when it is not in the unit
 * tables: "52 °", "£24", "£3m", "1.2 L☉", "4.5 million years" and "12 row" for "rows" all mean
 * the declared unit, and "$24" means "dollars". Returns the bare number text, or null when the
 * input does not carry the declared unit.
 */
export function stripDeclaredUnit(input: string, unit: string | undefined): string | null {
  if (!unit?.trim()) return null;
  const text = normaliseNumberText(input, false);
  const declared = normaliseNumberText(unit, false);
  const currency = /^[£$€¥]/u.exec(text)?.[0];
  if (currency) {
    const split = splitNumber(text.slice(currency.length));
    if (!split) return null;
    let remainder: string | null = null;
    if (declared.startsWith(currency)) remainder = declared.slice(currency.length);
    else {
      const last = /(?:^|\s)(\p{L}+)$/u.exec(declared);
      if (last && CURRENCY_WORDS[currency]!.includes(last[1]!.toLocaleLowerCase()))
        remainder = declared.slice(0, last.index).trim();
    }
    if (remainder === null) return null;
    if (!remainder.trim()) return split.rest ? null : split.number;
    return sameUnitText(split.rest, remainder) ? split.number : null;
  }
  const split = splitNumber(text);
  if (!split?.rest) return null;
  // "24 dollars" for a question in "$".
  const named = CURRENCY_WORDS[declared.trim()];
  if (named?.includes(split.rest.toLocaleLowerCase())) return split.number;
  return sameUnitText(split.rest, declared) ? split.number : null;
}

/** A declared unit that starts with a power of ten, such as "×10⁸ m/s" or "10⁶ mm⁴". */
function poweredUnit(unit: string): { scale: number; rest: string } | null {
  const match = /^\s*(?:[x×]\s*)?10\s*\^?\s*([+-]?\d+)(.*)$/u.exec(
    plainDigits(unit.replace(/[−]/gu, "-")),
  );
  if (!match) return null;
  return { scale: 10 ** Number(match[1]), rest: match[2]!.trim() };
}

function assessOnce(input: string, authority: NumericAuthority): NumericAssessment {
  const authorityUnit = authority.unit
    ? (normaliseUnit(authority.unit) ?? { canonical: authority.unit, factor: 1 })
    : undefined;
  const bare = stripDeclaredUnit(input, authority.unit);
  const bareQuantity = bare === null ? null : parseNumericAnswer(bare);
  // The declared unit only explains the input when what remains is a plain number; "1300 cm"
  // against metres must stay centimetres, not become "1300 c" in metres.
  const quantity =
    bareQuantity && bareQuantity.unit === undefined
      ? bareQuantity
      : parseNumericAnswer(input, authorityUnit?.canonical);
  if (!quantity) return { correct: false, parsed: null, error: "unreadable" };
  // Only a declared probability interprets a percentage as a fraction of one.
  const parsed =
    authority.unit === "probability" && quantity.unit === "%"
      ? { value: quantity.value / 100, unit: "probability" }
      : quantity;
  if (authorityUnit) {
    if (parsed.unit && !sameUnitText(parsed.unit, authorityUnit.canonical))
      return { correct: false, parsed, error: "unit_mismatch" };
  } else if (authority.unit === "" && parsed.unit) {
    return { correct: false, parsed, error: "unit_mismatch" };
  }
  // Bare values use the unit asked for; explicit units are converted to the same base.
  const authorityFactor = authorityUnit?.factor ?? 1;
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

export function assessNumericAnswer(input: string, authority: NumericAuthority): NumericAssessment {
  const result = assessOnce(input, authority);
  if (result.correct) return result;
  // A unit that starts with a power of ten also accepts the full number in the rest of the
  // unit: "3e8 m/s" or "3 × 10^8 m/s" for 3 in "×10⁸ m/s". Tolerances scale with it.
  const powered = authority.unit ? poweredUnit(authority.unit) : null;
  if (!powered) return result;
  const scaled = assessOnce(input, {
    value: authority.value * powered.scale,
    unit: powered.rest,
    ...(authority.absoluteTolerance === undefined
      ? {}
      : { absoluteTolerance: authority.absoluteTolerance * powered.scale }),
    ...(authority.relativeTolerance === undefined
      ? {}
      : { relativeTolerance: authority.relativeTolerance }),
  });
  // A plain number with no unit and no power of ten stays in the declared unit: "5000000" for
  // 5 in "10⁶ mm⁴" is the slip of forgetting the scale, and is marked wrong.
  const explicit =
    scaled.parsed?.unit !== undefined || /e[+-]?\d/iu.test(normaliseNumberText(input, true));
  return scaled.correct && explicit ? scaled : result;
}

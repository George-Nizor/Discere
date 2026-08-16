export interface ParsedNumericAnswer { value: number; unit?: string; }
export interface NumericAuthority { value: number; unit?: string; absoluteTolerance?: number; relativeTolerance?: number; }
export interface NumericAssessment { correct: boolean; parsed: ParsedNumericAnswer | null; error?: "unreadable" | "unit_mismatch" | "outside_tolerance"; difference?: number; }

const UNIT_ALIASES: Record<string, { canonical: string; factor: number }> = {
  a: { canonical: "A", factor: 1 }, amp: { canonical: "A", factor: 1 }, amps: { canonical: "A", factor: 1 }, ampere: { canonical: "A", factor: 1 }, amperes: { canonical: "A", factor: 1 }, ma: { canonical: "A", factor: 0.001 }, milliamp: { canonical: "A", factor: 0.001 }, milliamps: { canonical: "A", factor: 0.001 },
  v: { canonical: "V", factor: 1 }, volt: { canonical: "V", factor: 1 }, volts: { canonical: "V", factor: 1 }, mv: { canonical: "V", factor: 0.001 },
  ohm: { canonical: "Ω", factor: 1 }, ohms: { canonical: "Ω", factor: 1 }, "ω": { canonical: "Ω", factor: 1 }, kohm: { canonical: "Ω", factor: 1000 }, kohms: { canonical: "Ω", factor: 1000 }, "kω": { canonical: "Ω", factor: 1000 },
};

function normaliseUnit(raw: string): { canonical: string; factor: number } | null {
  return UNIT_ALIASES[raw.toLocaleLowerCase().replaceAll(" ", "")] ?? null;
}

export function parseNumericAnswer(input: string): ParsedNumericAnswer | null {
  const match = input.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([a-zA-ZΩω]+)?$/i);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const rawUnit = match[2];
  if (!rawUnit) return { value };
  const unit = normaliseUnit(rawUnit);
  if (!unit) return { value, unit: rawUnit };
  return { value: value * unit.factor, unit: unit.canonical };
}

export function assessNumericAnswer(input: string, authority: NumericAuthority): NumericAssessment {
  const parsed = parseNumericAnswer(input);
  if (!parsed) return { correct: false, parsed: null, error: "unreadable" };
  if (authority.unit) {
    const authorityUnit = normaliseUnit(authority.unit) ?? { canonical: authority.unit, factor: 1 };
    if (parsed.unit && parsed.unit !== authorityUnit.canonical) return { correct: false, parsed, error: "unit_mismatch" };
  }
  const difference = Math.abs(parsed.value - authority.value);
  const absoluteTolerance = authority.absoluteTolerance ?? 1e-9;
  const relativeTolerance = authority.relativeTolerance ?? 0.01;
  const allowed = Math.max(absoluteTolerance, Math.abs(authority.value) * relativeTolerance);
  return difference <= allowed ? { correct: true, parsed, difference } : { correct: false, parsed, error: "outside_tolerance", difference };
}

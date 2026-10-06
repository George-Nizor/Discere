/**
 * The workbench calculator's arithmetic. A small recursive-descent parser over a fixed grammar,
 * never `eval`: the input is the learner's, and only numbers, the listed functions and constants,
 * operators and brackets mean anything.
 *
 *   expression := term (("+" | "-") term)*
 *   term       := unary (("*" | "/") unary | implicit unary)*
 *   unary      := ("-" | "+") unary | power
 *   power      := postfix ("^" unary)?          right-associative, binds tighter than unary minus
 *   postfix    := primary ("!" | "%")*
 *   primary    := number | constant | function "(" expression ")" | "(" expression ")" | "|" expression "|"
 */
export type AngleUnit = "deg" | "rad";

export class CalcError extends Error {}

const FUNCTIONS = [
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "sin",
  "cos",
  "tan",
  "sqrt",
  "cbrt",
  "log2",
  "log",
  "ln",
  "exp",
  "abs",
] as const;
type FunctionName = (typeof FUNCTIONS)[number];

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "op"; value: string };

/** Accepts the symbols the keypad writes as well as what a keyboard types. */
export function normalise(input: string): string {
  return input
    .replace(/×|·|∙/g, "*")
    .replace(/÷/g, "/")
    .replace(/−|–/g, "-")
    .replace(/√/g, "sqrt")
    .replace(/∛/g, "cbrt")
    .replace(/π/g, "pi")
    .replace(/\*\*/g, "^")
    .replace(/,/g, "");
}

function tokenise(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    const number = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(source.slice(i));
    if (number) {
      tokens.push({ kind: "number", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    const name = /^(log2|[a-z]+)/i.exec(source.slice(i));
    if (name) {
      tokens.push({ kind: "name", value: name[0].toLowerCase() });
      i += name[0].length;
      continue;
    }
    if ("+-*/^()!%|".includes(c)) {
      tokens.push({ kind: "op", value: c });
      i += 1;
      continue;
    }
    throw new CalcError(`“${c}” is not something the calculator understands.`);
  }
  return tokens;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new CalcError("Factorial needs a whole number ≥ 0.");
  if (n > 170) return Number.POSITIVE_INFINITY;
  let product = 1;
  for (let k = 2; k <= n; k += 1) product *= k;
  return product;
}

/** Splits names typed together, e.g. "pie" → pi·e or "2pir" fails rather than guessing. */
function splitName(name: string, ans: number): number[] | FunctionName {
  if ((FUNCTIONS as readonly string[]).includes(name)) return name as FunctionName;
  const values: number[] = [];
  let rest = name;
  while (rest) {
    if (rest.startsWith("ans")) {
      values.push(ans);
      rest = rest.slice(3);
    } else if (rest.startsWith("pi")) {
      values.push(Math.PI);
      rest = rest.slice(2);
    } else if (rest.startsWith("e")) {
      values.push(Math.E);
      rest = rest.slice(1);
    } else throw new CalcError(`Unknown name “${name}”.`);
  }
  return values;
}

export function evaluate(input: string, angle: AngleUnit = "deg", ans = 0): number {
  const tokens = tokenise(normalise(input));
  if (!tokens.length) throw new CalcError("Type an expression.");
  let position = 0;
  const peek = () => tokens[position];
  const isOp = (value: string) => {
    const token = peek();
    return token?.kind === "op" && token.value === value;
  };
  const expect = (value: string) => {
    if (!isOp(value)) throw new CalcError(`Expected “${value}”.`);
    position += 1;
  };
  const toRadians = (x: number) => (angle === "deg" ? (x * Math.PI) / 180 : x);
  const fromRadians = (x: number) => (angle === "deg" ? (x * 180) / Math.PI : x);
  /** Exact zeros at the multiples where floating point would leave 1e-16. */
  const tidy = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x);

  function apply(name: FunctionName, x: number): number {
    switch (name) {
      case "sin":
        return tidy(Math.sin(toRadians(x)));
      case "cos":
        return tidy(Math.cos(toRadians(x)));
      case "tan": {
        const c = tidy(Math.cos(toRadians(x)));
        if (c === 0) throw new CalcError("tan is undefined there.");
        return tidy(Math.tan(toRadians(x)));
      }
      case "asin":
      case "acos":
        if (x < -1 || x > 1) throw new CalcError(`${name} needs a value between −1 and 1.`);
        return fromRadians(name === "asin" ? Math.asin(x) : Math.acos(x));
      case "atan":
        return fromRadians(Math.atan(x));
      case "sinh":
        return Math.sinh(x);
      case "cosh":
        return Math.cosh(x);
      case "tanh":
        return Math.tanh(x);
      case "sqrt":
        if (x < 0) throw new CalcError("No real square root of a negative number.");
        return Math.sqrt(x);
      case "cbrt":
        return Math.cbrt(x);
      case "ln":
      case "log":
      case "log2":
        if (x <= 0) throw new CalcError("Logarithms need a positive number.");
        return name === "ln" ? Math.log(x) : name === "log" ? Math.log10(x) : Math.log2(x);
      case "exp":
        return Math.exp(x);
      case "abs":
        return Math.abs(x);
    }
  }

  function startsPrimary(): boolean {
    const token = peek();
    if (!token) return false;
    return token.kind !== "op" || token.value === "(";
  }

  function primary(): number {
    const token = peek();
    if (!token) throw new CalcError("The expression ends too soon.");
    if (token.kind === "number") {
      position += 1;
      return token.value;
    }
    if (token.kind === "name") {
      position += 1;
      const resolved = splitName(token.value, ans);
      if (Array.isArray(resolved)) return resolved.reduce((a, b) => a * b, 1);
      // "sin(30)" and also "sin 30"; the bare form takes one power, so "sin 30^2" is sin(900).
      let argument: number;
      if (isOp("(")) {
        position += 1;
        argument = expression();
        expect(")");
      } else argument = power();
      return apply(resolved, argument);
    }
    if (token.value === "(") {
      position += 1;
      const value = expression();
      expect(")");
      return value;
    }
    if (token.value === "|") {
      position += 1;
      const value = expression();
      expect("|");
      return Math.abs(value);
    }
    throw new CalcError(`Unexpected “${token.value}”.`);
  }
  function postfix(): number {
    let value = primary();
    while (isOp("!") || isOp("%")) {
      const op = peek()!.value;
      position += 1;
      value = op === "!" ? factorial(value) : value / 100;
    }
    return value;
  }
  function power(): number {
    const base = postfix();
    if (isOp("^")) {
      position += 1;
      const exponent = unary();
      const result = base ** exponent;
      if (Number.isNaN(result)) throw new CalcError("That power has no real value.");
      return result;
    }
    return base;
  }
  function unary(): number {
    if (isOp("-")) {
      position += 1;
      return -unary();
    }
    if (isOp("+")) {
      position += 1;
      return unary();
    }
    return power();
  }
  function term(): number {
    let value = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = peek()!.value;
        position += 1;
        const right = unary();
        if (op === "/" && right === 0) throw new CalcError("Division by zero.");
        value = op === "*" ? value * right : value / right;
      } else if (startsPrimary()) {
        value *= unary();
      } else return value;
    }
  }
  function expression(): number {
    let value = term();
    while (isOp("+") || isOp("-")) {
      const op = peek()!.value;
      position += 1;
      const right = term();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  const value = expression();
  if (position < tokens.length) {
    const token = tokens[position]!;
    throw new CalcError(
      token.kind === "op" && token.value === ")" ? "A closing bracket has no opening one." : "Check the expression near the end.",
    );
  }
  if (!Number.isFinite(value)) throw new CalcError("The result is too large to show.");
  return value;
}

/** Up to 12 significant figures, switching to scientific notation for very large or small values. */
export function formatResult(value: number): string {
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e12 || magnitude < 1e-6) {
    const [mantissa, exponent] = value.toExponential(9).split("e");
    return `${Number(mantissa)}e${exponent}`;
  }
  return String(Number(value.toPrecision(12)));
}

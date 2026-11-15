import { phonemize } from "phonemizer";

/**
 * Turns lesson prose into the phoneme tokens Kokoro reads.
 *
 * The normalisation and the punctuation handling follow kokoro-js 1.2.1 (Apache-2.0,
 * github.com/hexgrad/kokoro), which follows the reference Python package. Kokoro was trained on
 * phonemes from eSpeak NG with these exact clean-ups, so keeping them is what keeps the voice
 * sounding the way it did in the samples. Only British English is used: George is a British voice.
 */

/** Kokoro's vocabulary: one id per phoneme symbol (tokenizer.json at the pinned revision). */
const VOCAB: Record<string, number> = {
  ";": 1,
  ":": 2,
  ",": 3,
  ".": 4,
  "!": 5,
  "?": 6,
  "—": 9,
  "…": 10,
  '"': 11,
  "(": 12,
  ")": 13,
  "“": 14,
  "”": 15,
  " ": 16,
  "̃": 17,
  ʣ: 18,
  ʥ: 19,
  ʦ: 20,
  ʨ: 21,
  ᵝ: 22,
  ꭧ: 23,
  A: 24,
  I: 25,
  O: 31,
  Q: 33,
  S: 35,
  T: 36,
  W: 39,
  Y: 41,
  ᵊ: 42,
  a: 43,
  b: 44,
  c: 45,
  d: 46,
  e: 47,
  f: 48,
  h: 50,
  i: 51,
  j: 52,
  k: 53,
  l: 54,
  m: 55,
  n: 56,
  o: 57,
  p: 58,
  q: 59,
  r: 60,
  s: 61,
  t: 62,
  u: 63,
  v: 64,
  w: 65,
  x: 66,
  y: 67,
  z: 68,
  ɑ: 69,
  ɐ: 70,
  ɒ: 71,
  æ: 72,
  β: 75,
  ɔ: 76,
  ɕ: 77,
  ç: 78,
  ɖ: 80,
  ð: 81,
  ʤ: 82,
  ə: 83,
  ɚ: 85,
  ɛ: 86,
  ɜ: 87,
  ɟ: 90,
  ɡ: 92,
  ɥ: 99,
  ɨ: 101,
  ɪ: 102,
  ʝ: 103,
  ɯ: 110,
  ɰ: 111,
  ŋ: 112,
  ɳ: 113,
  ɲ: 114,
  ɴ: 115,
  ø: 116,
  ɸ: 118,
  θ: 119,
  œ: 120,
  ɹ: 123,
  ɾ: 125,
  ɻ: 126,
  ʁ: 128,
  ɽ: 129,
  ʂ: 130,
  ʃ: 131,
  ʈ: 132,
  ʧ: 133,
  ʊ: 135,
  ʋ: 136,
  ʌ: 138,
  ɣ: 139,
  ɤ: 140,
  χ: 142,
  ʎ: 143,
  ʒ: 147,
  ʔ: 148,
  ˈ: 156,
  ˌ: 157,
  ː: 158,
  ʰ: 162,
  ʲ: 164,
  "↓": 169,
  "→": 171,
  "↗": 172,
  "↘": 173,
  ᵻ: 177,
};

/** The model reads at most 510 tokens between its two boundary tokens. */
export const MAX_TOKENS = 510;

function speakYear(text: string): string {
  if (text.includes(".")) return text;
  if (text.includes(":")) {
    const [hours, minutes] = text.split(":").map(Number) as [number, number];
    if (minutes === 0) return `${hours} o'clock`;
    return minutes < 10 ? `${hours} oh ${minutes}` : `${hours} ${minutes}`;
  }
  const year = Number.parseInt(text.slice(0, 4), 10);
  if (year < 1100 || year % 1000 < 10) return text;
  const left = text.slice(0, 2);
  const right = Number.parseInt(text.slice(2, 4), 10);
  const plural = text.endsWith("s") ? "s" : "";
  if (year % 1000 >= 100 && year % 1000 <= 999) {
    if (right === 0) return `${left} hundred${plural}`;
    if (right < 10) return `${left} oh ${right}${plural}`;
  }
  return `${left} ${right}${plural}`;
}

function speakMoney(text: string): string {
  const unit = text[0] === "$" ? "dollar" : "pound";
  const amount = text.slice(1);
  if (Number.isNaN(Number(amount))) return `${amount} ${unit}s`;
  if (!amount.includes(".")) return `${amount} ${unit}${amount === "1" ? "" : "s"}`;
  const [whole = "0", part = ""] = amount.split(".");
  const small = Number.parseInt(part.padEnd(2, "0"), 10);
  const smallUnit =
    text[0] === "$" ? (small === 1 ? "cent" : "cents") : small === 1 ? "penny" : "pence";
  return `${whole} ${unit}${whole === "1" ? "" : "s"} and ${small} ${smallUnit}`;
}

function speakDecimal(text: string): string {
  const [whole = "", part = ""] = text.split(".");
  return `${whole} point ${part.split("").join(" ")}`;
}

const GREEK: Record<string, string> = {
  alpha: "alpha",
  beta: "beta",
  gamma: "gamma",
  delta: "delta",
  Delta: "delta",
  epsilon: "epsilon",
  theta: "theta",
  lambda: "lambda",
  mu: "mu",
  pi: "pi",
  rho: "rho",
  sigma: "sigma",
  Sigma: "sigma",
  tau: "tau",
  phi: "phi",
  omega: "omega",
  Omega: "omega",
};
const SPOKEN_POWERS: Record<string, string> = { "2": " squared", "3": " cubed" };
const HALVES: Record<string, string> = { "12": "a half", "13": "a third", "14": "a quarter" };

/**
 * Inline maths, written between dollar signs in lessons, said aloud. This covers what the courses
 * actually use (fractions, powers, roots, functions, Greek letters); anything else is read with
 * its backslashes removed, which is still better than the symbols.
 */
export function speakMath(expression: string): string {
  // "2x" is said "2 x", and "uv" as two letters, before any words are put in.
  const spaced = expression
    .replace(/(\d)([a-zA-Z])(?![a-zA-Z])/g, "$1 $2")
    .replace(/(?<![\\a-zA-Z])([a-z])([a-z])(?![a-zA-Z])/g, "$1 $2");
  const spoken = spaced
    .replace(/\\[dt]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, " $1 over $2 ")
    .replace(
      /\\[dt]?frac(\d)(\d)/g,
      (_m, a: string, b: string) => ` ${HALVES[a + b] ?? `${a} over ${b}`} `,
    )
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, " the square root of $1 ")
    .replace(/\^\{?([23])\}?(?![\d{])/g, (_m, power: string) => SPOKEN_POWERS[power] ?? "")
    .replace(/\^\{([^{}]+)\}/g, " to the power $1 ")
    .replace(/\^(\w)/g, " to the $1 ")
    .replace(/_\{?(\w+)\}?/g, " $1 ")
    .replace(
      /\\(sin|cos|tan)\b/g,
      (_m, name: string) => ({ sin: " sine ", cos: " cos ", tan: " tan " })[name] ?? name,
    )
    .replace(/\\ln\b/g, " log ")
    .replace(/\\log\b/g, " log ")
    .replace(/\\(?:cdot|times)\b/g, " times ")
    .replace(/\\div\b/g, " divided by ")
    .replace(/\\(?:le|leq)\b/g, " is at most ")
    .replace(/\\(?:ge|geq)\b/g, " is at least ")
    .replace(/\\(?:ne|neq)\b/g, " is not equal to ")
    .replace(/\\approx\b/g, " is about ")
    .replace(/\\(?:to|rightarrow)\b/g, " approaches ")
    .replace(/\\infty\b/g, " infinity ")
    .replace(/\\pm\b/g, " plus or minus ")
    .replace(/\\([A-Za-z]+)/g, (_m, name: string) => ` ${GREEK[name] ?? name} `)
    .replace(/[{}]/g, " ")
    .replace(/(?<=\w)\s*\(\s*(\w)\s*\)/g, " of $1")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/\s+[-−]\s+/g, " minus ")
    .replace(/^\s*[-−]/g, " minus ")
    .replace(/\s*\/\s*/g, " over ")
    .replace(/\s*<\s*/g, " is less than ")
    .replace(/\s*>\s*/g, " is greater than ");
  return spoken.replace(/\s+/g, " ").trim();
}

/** Lesson markup and symbols that read badly, said the way a teacher would say them. */
export function prepareLessonText(text: string): string {
  return (
    text
      .replace(/\$([^$\n]+)\$/g, (_m, expression: string) => ` ${speakMath(expression)} `)
      // Glossary links, [[term|note]], are read as their term.
      .replace(/\[\[([^|\]\n]+)\|[^\]\n]+\]\]/g, "$1")
      // Emphasis and inline code markers are for the eye only.
      .replace(/\*\*|__|`/g, "")
      .replace(/(?<![\w*])\*(?!\s)([^*]+?)\*(?!\w)/g, "$1")
      // f(x) is read "f of x", the way it is said in a classroom.
      .replace(/\b([A-Za-z])\(([A-Za-z])\)/g, "$1 of $2")
      .replace(/\s?−\s?/g, " minus ")
      .replace(/\s=\s/g, " equals ")
      .replace(/\s×\s/g, " times ")
      .replace(/\s÷\s/g, " divided by ")
      .replace(/≤/g, " is at most ")
      .replace(/≥/g, " is at least ")
      .replace(/≠/g, " is not equal to ")
      .replace(/≈/g, " is about ")
      .replace(/%/g, " percent")
      .replace(/²/g, " squared")
      .replace(/³/g, " cubed")
      .replace(/\be\.g\./gi, "for example")
      .replace(/\bi\.e\./gi, "that is")
      .replace(/\s+/g, " ")
      .replace(/\s+(?=[,.;:!?])/g, "")
      .trim()
  );
}

/** kokoro-js's normalisation: quotes, titles, numbers, money, decimals and initialisms. */
function normalise(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/«/g, "“")
    .replace(/»/g, "”")
    .replace(/[“”]/g, '"')
    .replace(/\(/g, "«")
    .replace(/\)/g, "»")
    .replace(/[^\S \n]/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\bD[Rr]\.(?= [A-Z])/g, "Doctor")
    .replace(/\b(?:Mr\.|MR\.(?= [A-Z]))/g, "Mister")
    .replace(/\b(?:Ms\.|MS\.(?= [A-Z]))/g, "Miss")
    .replace(/\b(?:Mrs\.|MRS\.(?= [A-Z]))/g, "Mrs")
    .replace(/\betc\.(?! [A-Z])/gi, "etc")
    .replace(/\b(y)eah?\b/gi, "$1e'a")
    .replace(/\d*\.\d+|\b\d{4}s?\b|(?<!:)\b(?:[1-9]|1[0-2]):[0-5]\d\b(?!:)/g, speakYear)
    .replace(/(?<=\d),(?=\d)/g, "")
    .replace(
      /[$£]\d+(?:\.\d+)?(?: hundred| thousand| (?:[bm]|tr)illion)*\b|[$£]\d+\.\d\d?\b/gi,
      speakMoney,
    )
    .replace(/\d*\.\d+/g, speakDecimal)
    .replace(/(?<=\d)-(?=\d)/g, " to ")
    .replace(/(?<=\d)S/g, " S")
    .replace(/(?<=[BCDFGHJ-NP-TV-Z])'?s\b/g, "'S")
    .replace(/(?<=X')S\b/g, "s")
    .replace(/(?:[A-Za-z]\.){2,} [a-z]/g, (match) => match.replace(/\./g, "-"))
    .replace(/(?<=[A-Z])\.(?=[A-Z])/gi, "-")
    .trim();
}

const PUNCTUATION = ';:,.!?¡¿—…"«»“”(){}[]';
const PUNCTUATION_RUN = new RegExp(
  `(\\s*[${PUNCTUATION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]+\\s*)+`,
  "g",
);

/**
 * eSpeak drops punctuation, and punctuation is where Kokoro pauses, so the text is cut at every
 * run of it, the words between are phonemised, and the punctuation is put back as it was.
 */
export async function toPhonemes(text: string): Promise<string> {
  const normalised = normalise(text);
  const pieces: { punctuation: boolean; text: string }[] = [];
  let last = 0;
  for (const match of normalised.matchAll(PUNCTUATION_RUN)) {
    if (last < match.index)
      pieces.push({ punctuation: false, text: normalised.slice(last, match.index) });
    if (match[0].length > 0) pieces.push({ punctuation: true, text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < normalised.length) pieces.push({ punctuation: false, text: normalised.slice(last) });
  const spoken = await Promise.all(
    pieces.map(async (piece) =>
      piece.punctuation ? piece.text : (await phonemize(piece.text, "en")).join(" "),
    ),
  );
  return spoken
    .join("")
    .replace(/kəkˈɔːɹəʊ/g, "kˈəʊkəɹəʊ")
    .replace(/ʲ/g, "j")
    .replace(/r/g, "ɹ")
    .replace(/x/g, "k")
    .replace(/ɬ/g, "l")
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, " ")
    .replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, "z")
    .trim();
}

/** Symbols outside the vocabulary are dropped, as the reference tokenizer does. */
export function toTokens(phonemes: string): number[] {
  const tokens: number[] = [];
  for (const symbol of phonemes) {
    const id = VOCAB[symbol];
    if (id !== undefined) tokens.push(id);
  }
  return tokens.slice(0, MAX_TOKENS);
}

/**
 * Splits a screen into sentences, each read and cached on its own. That keeps every piece under
 * the model's token limit, lets the first sentence play while the next is made, and means editing
 * one sentence of a lesson re-renders only that sentence.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  const pattern = /[^.!?…]+(?:[.!?…]+["”’)\]]*|$)/g;
  let carry = "";
  for (const match of text.matchAll(pattern)) {
    const piece = match[0];
    const candidate = `${carry}${piece}`;
    // "e.g", "Dr", a lone initial or a decimal point is not the end of a sentence.
    const tail = /(?:^|\s)(?:[A-Z]|Dr|Mr|Mrs|Ms|St|vs|etc|[a-z]\.[a-z])\.$/.test(
      candidate.trimEnd(),
    );
    const decimal =
      /\d\.$/.test(candidate) && /^\d/.test(text.slice((match.index ?? 0) + piece.length));
    if (tail || decimal) {
      carry = candidate;
      continue;
    }
    if (candidate.trim()) sentences.push(candidate.trim());
    carry = "";
  }
  if (carry.trim()) sentences.push(carry.trim());
  return sentences.flatMap(splitLong);
}

/** A sentence too long for one pass is cut at its commas, then at its spaces. */
function splitLong(sentence: string): string[] {
  const LIMIT = 300;
  if (sentence.length <= LIMIT) return [sentence];
  const parts: string[] = [];
  let current = "";
  for (const clause of sentence.split(/(?<=[,;:])\s+/)) {
    if (current && `${current} ${clause}`.length > LIMIT) {
      parts.push(current);
      current = clause;
    } else current = current ? `${current} ${clause}` : clause;
  }
  if (current) parts.push(current);
  return parts.flatMap((part) => {
    if (part.length <= LIMIT) return [part];
    const words = part.split(" ");
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 40) chunks.push(words.slice(i, i + 40).join(" "));
    return chunks;
  });
}

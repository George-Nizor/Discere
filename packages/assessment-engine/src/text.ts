export interface TextAuthority {
  acceptedIdeas: string[];
  acceptedAlternatives?: string[] | undefined;
  rejectedIdeas: string[];
}
export interface TextAssessment {
  correct: boolean;
  matchedIdeas: string[];
  rejectedIdeasFound: string[];
  coverage: number;
}

function normalise(value: string): string {
  return (
    value
      .toLocaleLowerCase()
      .replace(/[’‘]/gu, "\u0027")
      .replace(
        /\b(isn|aren|wasn|weren|don|doesn|didn|hasn|haven|hadn|can|couldn|won|wouldn|shouldn|mustn)\u0027t\b/gu,
        "not",
      )
      .replace(/\bcannot\b/gu, "not")
      // The same contractions typed without an apostrophe: "dont", "doesnt", "isnt".
      .replace(
        /\b(?:isnt|arent|wasnt|werent|dont|doesnt|didnt|hasnt|havent|hadnt|couldnt|wouldnt|shouldnt|mustnt)\b/gu,
        "not",
      )
      .replaceAll("−", "-")
      .replaceAll("×", "*")
      .replaceAll("÷", "/")
      // "well-known" and "well known" are one phrase; a minus between numbers stays a minus.
      .replace(/(?<=\p{L})-(?=\p{L})/gu, " ")
      // A decimal point stays part of its number, so "0.1" is not read as "0" and "1".
      .replace(/(?<=\p{N})\.(?=\p{N})/gu, "\u00b7")
      // Sharps and flats are part of a note's name: "B♭" is not "B". "#" is read as "♯".
      .replace(/(?<=[a-g])#/gu, "\u266f")
      .replace(/[^\p{L}\p{N}+*/=<>!\u00b7\u266d\u266f-]+/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** A word and its regular plural, as one regex alternative. Short words are left exact. */
function inflections(word: string): string {
  if (word.length < 3 || !/^\p{L}+$/u.test(word)) return escapeRegExp(word);
  const stem =
    word.endsWith("es") && /(?:ss|x|ch|sh)es$/u.test(word)
      ? word.slice(0, -2)
      : word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word;
  const plural = /(?:s|x|ch|sh)$/u.test(stem) ? "(?:es)?" : "s?";
  return `${escapeRegExp(stem)}${plural}`;
}

/**
 * A word with common English endings removed, so "tracing" and "trace", "dominance" and
 * "dominant", "boundaries" and "boundary", "hypotheses" and "hypothesis" share a stem. Only
 * endings that leave a stem of four letters or more are removed (five for -ance/-ant/-ence/-ent),
 * so short words are compared as they are.
 */
export function stemWord(word: string): string {
  // Inflections first: plural, -ing, -ed, -ly.
  const inflections: Array<[RegExp, string, number]> = [
    [/ies$/u, "y", 4],
    [/(?:ings?|ed|ly)$/u, "", 4],
    [/ses$/u, "s", 5],
    [/sis$/u, "s", 5],
    [/(?<=s|x|ch|sh)es$/u, "", 4],
    [/es$/u, "e", 4],
    [/(?<!s)s$/u, "", 4],
  ];
  let stem = word;
  for (const [ending, replacement, minimum] of inflections) {
    const match = ending.exec(stem);
    if (!match) continue;
    const shorter = stem.slice(0, match.index) + replacement;
    if (shorter.length < minimum) continue;
    stem = shorter;
    break;
  }
  // Then one derivational ending, keeping at least five letters.
  const derived = /(?:ance|ence|ancy|ency|ant|ent)$/u.exec(stem);
  if (derived && derived.index >= 5) stem = stem.slice(0, derived.index);
  return stem
    .replace(/([b-df-hj-np-tv-z])\1$/u, "$1")
    .replace(/e$/u, "")
    .replace(/y$/u, "i");
}

/** At most one letter inserted, deleted or changed, keeping the first letter. */
function oneEditApart(a: string, b: string): boolean {
  if (a === b || a[0] !== b[0] || Math.abs(a.length - b.length) > 1) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.length === long.length
    ? short.slice(i + 1) === long.slice(i + 1)
    : short.slice(i) === long.slice(i + 1);
}

/** Words of six letters or more may carry one typing slip. */
const TYPO_MIN_LENGTH = 6;
const LOOSE_MAX_WORDS = 3;

export function assessTextAnswer(input: string, authority: TextAuthority): TextAssessment {
  const text = normalise(input);
  const tokens = [...text.matchAll(/\S+/gu)].map((match) => ({
    word: match[0],
    start: match.index,
  }));
  // A typed word that is itself named by a rejected idea is never read as a slip for another.
  const rejectedWords = new Set(
    authority.rejectedIdeas.flatMap((idea) => normalise(idea).split(" ").filter(Boolean)),
  );
  function sameWord(typed: string, wanted: string): boolean {
    if (typed === wanted) return true;
    if (!/^\p{L}{4,}$/u.test(typed) || !/^\p{L}{4,}$/u.test(wanted)) return false;
    if (rejectedWords.has(typed)) return false;
    if (stemWord(typed) === stemWord(wanted)) return true;
    return (
      typed.length >= TYPO_MIN_LENGTH &&
      wanted.length >= TYPO_MIN_LENGTH &&
      oneEditApart(typed, wanted)
    );
  }
  function negated(start: number): boolean {
    return /\b(?:not|never|isnt)\s+(?:(?:think|believe|suppose|reckon|guess|say|feel|agree)\s+(?:that\s+)?)?(?:(?:it|its|this|that|they|there|s|is|are|was|were|be|been|a|an|the|really|actually|necessarily|always|certainly)\s+)*$/u.test(
      text.slice(0, start),
    );
  }
  function containsClaim(idea: string, rejectContradiction = true, loose = false): boolean {
    const words = normalise(idea).split(" ").filter(Boolean);
    if (words.length === 0) return false;
    // Each word matches its singular or plural ("value" / "values", "box" / "boxes"), so a
    // right answer is not refused for grammatical number (audit M6).
    const phrase = words.map(inflections).join(" ");
    // A number is not found inside a longer one: "1" is not in "-1", "0.1" or "1.5".
    const lead = /^\p{N}/u.test(words[0]!) ? "[^\\p{L}\\p{N}\u00b7-]" : "[^\\p{L}\\p{N}]";
    const pattern = new RegExp(
      `(?:^|${lead})(${phrase})(?=$|[^\\p{L}\\p{N}\u00b7\u266d\u266f])`,
      "gu",
    );
    const starts = new Set(
      [...text.matchAll(pattern)].map((match) => match.index + match[0].length - match[1]!.length),
    );
    // An accepted idea of up to three words, a term rather than a sentence, also matches word
    // by word through shared stems and single slips: "tracing" for "trace", "tropospere" for
    // "troposphere". A longer idea is matched as written, since its wording can be the point
    // ("configure the file" against "configuring the file").
    if (loose && words.length <= LOOSE_MAX_WORDS)
      for (let i = 0; i + words.length <= tokens.length; i++)
        if (words.every((word, j) => sameWord(tokens[i + j]!.word, word)))
          starts.add(tokens[i]!.start);
    const claims = [...starts].map((start) => !negated(start));
    return claims.some(Boolean) && (!rejectContradiction || claims.every(Boolean));
  }
  const matchedIdeas = authority.acceptedIdeas.filter(
    (idea) =>
      containsClaim(idea, true, true) ||
      (authority.acceptedIdeas.length === 1 &&
        (authority.acceptedAlternatives ?? []).some((idea) => containsClaim(idea, true, true))),
  );
  // Rejected ideas are matched strictly, so a loosened match never refuses a right answer.
  const rejectedIdeasFound = authority.rejectedIdeas.filter((idea) => containsClaim(idea, false));
  const coverage = matchedIdeas.length / authority.acceptedIdeas.length;
  return {
    correct: coverage >= 0.6 && rejectedIdeasFound.length === 0,
    matchedIdeas,
    rejectedIdeasFound,
    coverage,
  };
}

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

export function assessTextAnswer(input: string, authority: TextAuthority): TextAssessment {
  const text = normalise(input);
  function containsClaim(idea: string, rejectContradiction = true): boolean {
    const words = normalise(idea).split(" ").filter(Boolean);
    if (words.length === 0) return false;
    // Each word matches its singular or plural ("value" / "values", "box" / "boxes"), so a
    // right answer is not refused for grammatical number (audit M6). Nothing else loosens.
    const phrase = words.map(inflections).join(" ");
    // A number is not found inside a longer one: "1" is not in "-1", "0.1" or "1.5".
    const lead = /^\p{N}/u.test(words[0]!) ? "[^\\p{L}\\p{N}\u00b7-]" : "[^\\p{L}\\p{N}]";
    const pattern = new RegExp(`(?:^|${lead})(${phrase})(?=$|[^\\p{L}\\p{N}\u00b7\u266d\u266f])`, "gu");
    const claims = [...text.matchAll(pattern)].map((match) => {
      const start = match.index + match[0].length - match[1]!.length;
      return !/\b(?:not|never|isnt)\s+(?:(?:be|been|a|an|the|really|actually|necessarily|always|certainly)\s+)*$/u.test(
        text.slice(0, start),
      );
    });
    return claims.some(Boolean) && (!rejectContradiction || claims.every(Boolean));
  }
  const matchedIdeas = authority.acceptedIdeas.filter(
    (idea) =>
      containsClaim(idea) ||
      (authority.acceptedIdeas.length === 1 &&
        (authority.acceptedAlternatives ?? []).some((idea) => containsClaim(idea))),
  );
  const rejectedIdeasFound = authority.rejectedIdeas.filter((idea) => containsClaim(idea, false));
  const coverage = matchedIdeas.length / authority.acceptedIdeas.length;
  return {
    correct: coverage >= 0.6 && rejectedIdeasFound.length === 0,
    matchedIdeas,
    rejectedIdeasFound,
    coverage,
  };
}

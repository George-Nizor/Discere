import type { LanguageJoinMark, LanguageMark, LanguageModel } from "@discere/contracts";

type Model<K extends LanguageModel["kind"]> = Extract<LanguageModel, { kind: K }>;

/** A word is a whitespace-separated token with at least one letter or digit; a lone dash is not. */
export function languageWords(text: string): string[] {
  return text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token));
}
export const languageWordCount = (text: string) => languageWords(text).length;

const capitalise = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
const trimEnd = (s: string) => s.replace(/[\s,;:.!?]+$/u, "");

// ---------------------------------------------------------------- clauses and joins

export const languageMarkGlyph: Record<LanguageJoinMark, string> = {
  comma: ",",
  semicolon: ";",
  colon: ":",
  dash: "\u2014",
  full_stop: ".",
  comma_conjunction: ",",
};
export const languageMarkName: Record<LanguageJoinMark, string> = {
  comma: "Comma",
  semicolon: "Semicolon",
  colon: "Colon",
  dash: "Dash",
  full_stop: "Full stop",
  comma_conjunction: "Comma + conjunction",
};

/** Join tokens with spaces, except after a dash and before closing punctuation. */
export function languageJoinTokens(tokens: string[]): string {
  return tokens.reduce(
    (out, t, i) =>
      i === 0 ? t : out + (/[\u2014]$/u.test(out) || /^[,;:.!?\u2014]/u.test(t) ? "" : " ") + t,
    "",
  );
}
export function languageClauseText(clause: Model<"clauses">["clauses"][number]): string {
  return languageJoinTokens(clause.parts.map((p) => p.text));
}

/** The sentence as written, with the join mark (or a substitute) between the first two clauses. */
export function languageClausesSentence(m: Model<"clauses">, mark = m.join?.mark): string {
  const texts = m.clauses.map(languageClauseText);
  if (!m.join || !mark) return languageJoinTokens(texts);
  const [first, second, ...rest] = texts;
  let joined: string;
  if (mark === "full_stop") joined = trimEnd(first!) + ". " + capitalise(second!);
  else if (mark === "comma_conjunction")
    joined = trimEnd(first!) + ", " + (m.join.conjunction ?? "and") + " " + second!;
  else if (mark === "dash") joined = trimEnd(first!) + languageMarkGlyph.dash + second!;
  else joined = trimEnd(first!) + languageMarkGlyph[mark] + " " + second!;
  return languageJoinTokens([joined, ...rest]);
}

export interface LanguageJoinVerdict {
  standard: boolean;
  label: string;
  note: string;
}

/** Edited-prose verdict on joining the first two clauses with a mark. */
export function languageJoinVerdict(
  m: Model<"clauses">,
  mark: LanguageJoinMark,
): LanguageJoinVerdict {
  const [a, b] = m.clauses;
  const relation = m.join?.relation ?? "adds";
  const bothIndependent = a?.kind === "independent" && b?.kind === "independent";
  if (!bothIndependent) {
    if (mark === "comma" || mark === "dash")
      return {
        standard: true,
        label: "Standard",
        note: "A dependent clause attaches with a comma or nothing.",
      };
    if (mark === "comma_conjunction")
      return {
        standard: false,
        label: "Doubled link",
        note: "The subordinator already links the clauses.",
      };
    return {
      standard: false,
      label: mark === "full_stop" ? "Fragment" : "Misused",
      note: "A dependent clause cannot stand on one side of this mark alone.",
    };
  }
  switch (mark) {
    case "comma":
      return {
        standard: false,
        label: "Comma splice",
        note: "A comma alone cannot hold two independent clauses.",
      };
    case "semicolon":
      return {
        standard: true,
        label: "Standard",
        note: "Two complete clauses, one closely related thought.",
      };
    case "colon":
      return relation === "explains"
        ? {
            standard: true,
            label: "Standard",
            note: "The second clause delivers what the first promises.",
          }
        : {
            standard: false,
            label: "Strained",
            note: "A colon promises explanation; this clause does not explain.",
          };
    case "dash":
      return {
        standard: true,
        label: "Informal",
        note: "A dash breaks the line for emphasis; use it sparingly.",
      };
    case "full_stop":
      return {
        standard: true,
        label: "Standard",
        note: "Two sentences: the link between them goes unstated.",
      };
    case "comma_conjunction":
      return {
        standard: true,
        label: "Standard",
        note: "The conjunction names the relation the comma cannot.",
      };
  }
}

export function languageClauseCounts(m: Model<"clauses">) {
  const parts = m.clauses.flatMap((c) => c.parts);
  return {
    clauses: m.clauses.length,
    independent: m.clauses.filter((c) => c.kind === "independent").length,
    dependent: m.clauses.filter((c) => c.kind === "dependent").length,
    finiteVerbs: parts.filter((p) => p.role === "verb").length,
  };
}

// ---------------------------------------------------------------- voice

export type LanguageVoice = Model<"voice">["display"];
export function languageVoiceSentence(m: Model<"voice">, voice: LanguageVoice = m.display): string {
  const tail = m.tail ? " " + m.tail : "";
  if (voice === "active")
    return capitalise(m.agent) + " " + m.active + " " + m.patient + tail + ".";
  const by = voice === "passive" ? " by " + m.agent : "";
  return capitalise(m.patient) + " " + m.passive + by + tail + ".";
}
export const languageVoiceWords = (m: Model<"voice">, voice: LanguageVoice = m.display) =>
  languageWordCount(languageVoiceSentence(m, voice));

// ---------------------------------------------------------------- concision

export function languageCompression(m: Model<"compress">) {
  const before = m.segments.map((s) => s.text).join(" ");
  const after = m.segments
    .flatMap((s) => (s.edit === "keep" ? [s.text] : s.edit === "replace" ? [s.replacement!] : []))
    .join(" ")
    .replace(/\s+([,.;:!?])/gu, "$1");
  const tidy = capitalise(after.trim());
  const beforeWords = languageWordCount(before),
    afterWords = languageWordCount(tidy);
  return { before, after: tidy, beforeWords, afterWords, saved: beforeWords - afterWords };
}

// ---------------------------------------------------------------- Toulmin

export const languageToulminOrder = [
  "grounds",
  "qualifier",
  "claim",
  "warrant",
  "backing",
  "rebuttal",
] as const;
export function languageToulminRoles(m: Model<"toulmin">) {
  return languageToulminOrder.filter((role) => m.statements.some((s) => s.role === role));
}

// ---------------------------------------------------------------- scansion

export type LanguageFoot = "iamb" | "trochee" | "mixed";
const metreNames: Record<number, string> = {
  1: "monometer",
  2: "dimeter",
  3: "trimeter",
  4: "tetrameter",
  5: "pentameter",
  6: "hexameter",
  7: "heptameter",
};

/** Classify a line from its marked stresses, allowing one substituted foot. */
export function languageScansion(m: Model<"scansion">) {
  const pattern = m.syllables.map((s) => (s.stress ? 1 : 0));
  const syllables = pattern.length,
    beats = pattern.filter(Boolean).length;
  const fit = (first: 0 | 1, length: number) => {
    let misses = 0;
    for (let i = 0; i < length; i += 2) {
      const foot = pattern.slice(i, i + 2);
      const expected = foot.length === 2 ? (first ? [1, 0] : [0, 1]) : [first];
      if (foot.join("") !== expected.join("")) misses += 1;
    }
    return misses;
  };
  const candidates: Array<{
    foot: LanguageFoot;
    feet: number;
    misses: number;
    ending: "masculine" | "feminine" | "catalectic";
  }> = [];
  if (syllables % 2 === 0) {
    candidates.push({
      foot: "iamb",
      feet: syllables / 2,
      misses: fit(0, syllables),
      ending: "masculine",
    });
    candidates.push({
      foot: "trochee",
      feet: syllables / 2,
      misses: fit(1, syllables),
      ending: "feminine",
    });
  } else {
    if (pattern.at(-1) === 0)
      candidates.push({
        foot: "iamb",
        feet: (syllables - 1) / 2,
        misses: fit(0, syllables - 1),
        ending: "feminine",
      });
    if (pattern.at(-1) === 1)
      candidates.push({
        foot: "trochee",
        feet: (syllables + 1) / 2,
        misses: fit(1, syllables),
        ending: "catalectic",
      });
  }
  const best = candidates.sort((a, b) => a.misses - b.misses)[0];
  const regular = best && best.misses <= 1;
  const foot: LanguageFoot = regular ? best.foot : "mixed";
  const feet = regular ? best.feet : 0;
  const metre = regular
    ? (best.foot === "iamb" ? "iambic " : "trochaic ") +
      (metreNames[best.feet] ?? best.feet + "-foot")
    : "irregular";
  return {
    syllables,
    beats,
    foot,
    feet,
    metre,
    substitutions: regular ? best.misses : 0,
    ending: regular ? best.ending : "masculine",
  };
}

// ---------------------------------------------------------------- sonnet

export function languageSonnet(m: Model<"sonnet">) {
  const letters: string[] = [];
  const seen = new Map<string, string>();
  for (const line of m.lines) {
    if (!seen.has(line.sound)) seen.set(line.sound, String.fromCharCode(65 + seen.size));
    letters.push(seen.get(line.sound)!);
  }
  const scheme = letters.join("");
  const same = (a: number, b: number) => m.lines[a]!.sound === m.lines[b]!.sound;
  const quatrains = [0, 4, 8].every((q) => same(q, q + 2) && same(q + 1, q + 3));
  const form =
    quatrains && same(12, 13)
      ? "Shakespearean"
      : [3, 4, 7].every((i) => same(0, i)) && [2, 5, 6].every((i) => same(1, i))
        ? "Petrarchan"
        : "irregular";
  return {
    letters,
    scheme,
    sounds: seen.size,
    form,
    groups: form === "Shakespearean" ? [4, 4, 4, 2] : form === "Petrarchan" ? [8, 6] : [14],
  };
}

// ---------------------------------------------------------------- arc

export function languageArc(m: Model<"arc">) {
  const peak = Math.max(...m.scenes.map((s) => s.rise));
  const climax = m.scenes.findIndex((s) => s.rise === peak);
  const turns = m.scenes.flatMap((s, i) => (s.opens !== s.closes ? [i] : []));
  const phases = m.scenes.map((_, i) =>
    i === climax
      ? "climax"
      : i === 0
        ? "exposition"
        : i < climax
          ? "rising action"
          : i === m.scenes.length - 1
            ? "catastrophe"
            : "falling action",
  );
  return { climax, climaxScene: climax + 1, turns, turnCount: turns.length, phases };
}

// ---------------------------------------------------------------- passages

export const languageMarkLabel: Record<LanguageMark, string> = {
  ethos: "Ethos",
  pathos: "Pathos",
  logos: "Logos",
  kairos: "Kairos",
  anaphora: "Anaphora",
  antithesis: "Antithesis",
  chiasmus: "Chiasmus",
  tricolon: "Tricolon",
  alliteration: "Alliteration",
  assonance: "Assonance",
  metaphor: "Metaphor",
  simile: "Simile",
  narration: "Narration",
  free_indirect: "Free indirect discourse",
  direct_speech: "Direct speech",
  irony: "Irony",
};
export function languagePassageMarks(m: Model<"passage">): LanguageMark[] {
  const marks = m.lines.flatMap((l) => l.spans.flatMap((s) => (s.mark ? [s.mark] : [])));
  return [...new Set(marks)];
}
export function languagePassageText(m: Model<"passage">): string {
  return m.lines.map((l) => l.spans.map((s) => s.text).join("")).join(" / ");
}

// ---------------------------------------------------------------- shared readouts

/** Plain-language statement of the given values, for tutors and screen readers. */
export function languageGivens(m: LanguageModel): string {
  switch (m.kind) {
    case "clauses":
      return (
        "Sentence: " + languageClausesSentence(m) + (m.source ? " (" + m.source + ")" : "") + "."
      );
    case "voice":
      return "Actor: " + m.agent + ". Action: " + m.active + ". Receiver: " + m.patient + ".";
    case "compress":
      return "Draft sentence: " + languageCompression(m).before;
    case "toulmin":
      return m.statements.map((s, i) => "Statement " + (i + 1) + ": " + s.text).join(" ");
    case "passage":
      return m.source + ": " + languagePassageText(m);
    case "scansion":
      return m.source + ": " + languageScansionLine(m);
    case "sonnet":
      return m.source + ", fourteen lines, opening: " + m.lines[0]!.text;
    case "irony":
      return m.speaker + " (" + m.source + "): " + m.line;
    case "arc":
      return (
        m.title +
        ": " +
        m.scenes
          .map(
            (s, i) =>
              "scene " +
              (i + 1) +
              " " +
              s.label +
              ", rise " +
              s.rise +
              ", " +
              s.opens +
              " to " +
              s.closes,
          )
          .join("; ")
      );
  }
}
export function languageScansionLine(m: Model<"scansion">): string {
  return m.syllables
    .map((s) => s.text + (s.wordEnd ? " " : ""))
    .join("")
    .trim();
}

/** Derived results, revealed only after the learner has answered. */
export function languageMeasures(m: LanguageModel): Array<{ label: string; value: string }> {
  switch (m.kind) {
    case "clauses": {
      const c = languageClauseCounts(m);
      return [
        { label: "Clauses", value: String(c.clauses) },
        { label: "Independent", value: String(c.independent) },
        { label: "Finite verbs", value: String(c.finiteVerbs) },
        ...(m.join
          ? [{ label: "Join as written", value: languageJoinVerdict(m, m.join.mark).label }]
          : []),
      ];
    }
    case "voice":
      return [
        { label: "Active", value: languageVoiceWords(m, "active") + " words" },
        { label: "Passive", value: languageVoiceWords(m, "passive") + " words" },
        { label: "Agentless", value: languageVoiceWords(m, "agentless") + " words" },
      ];
    case "compress": {
      const c = languageCompression(m);
      return [
        { label: "Before", value: c.beforeWords + " words" },
        { label: "After", value: c.afterWords + " words" },
        { label: "Saved", value: c.saved + " words" },
      ];
    }
    case "toulmin":
      return m.statements.map((s, i) => ({
        label: "Statement " + (i + 1),
        value: capitalise(s.role),
      }));
    case "passage":
      return languagePassageMarks(m).map((mark) => ({
        label: languageMarkLabel[mark],
        value: m.lines.flatMap((l) => l.spans).filter((s) => s.mark === mark).length + " marked",
      }));
    case "scansion": {
      const s = languageScansion(m);
      return [
        { label: "Syllables", value: String(s.syllables) },
        { label: "Beats", value: String(s.beats) },
        { label: "Metre", value: s.metre },
        { label: "Ending", value: s.ending },
      ];
    }
    case "sonnet": {
      const s = languageSonnet(m);
      return [
        {
          label: "Rhyme scheme",
          value: s.groups
            .map((size, g) =>
              s.scheme.slice(s.groups.slice(0, g).reduce((a, b) => a + b, 0)).slice(0, size),
            )
            .join(" "),
        },
        { label: "Rhyme sounds", value: String(s.sounds) },
        { label: "Form", value: s.form },
        { label: "Turn", value: "line " + m.turn },
      ];
    }
    case "irony":
      return [{ label: "Who knows more", value: capitalise(m.knower) }];
    case "arc": {
      const a = languageArc(m);
      return [
        { label: "Highest point", value: "scene " + a.climaxScene },
        { label: "Scenes that turn", value: String(a.turnCount) },
      ];
    }
  }
}

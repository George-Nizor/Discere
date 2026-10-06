import { describe, expect, it } from "vitest";
import { LanguageDiagramSchema, LanguageModelSchema, type LanguageModel } from "@discere/contracts";
import {
  languageArc,
  languageClauseCounts,
  languageClausesSentence,
  languageCompression,
  languageGivens,
  languageJoinVerdict,
  languageMeasures,
  languageScansion,
  languageSonnet,
  languageVoiceSentence,
  languageVoiceWords,
  languageWordCount,
} from "../src/index.js";

const parse = (m: unknown) => LanguageModelSchema.parse(m);
const splice = parse({
  kind: "clauses",
  clauses: [
    {
      kind: "independent",
      parts: [
        { text: "The vote", role: "subject" },
        { text: "was", role: "verb" },
        { text: "close", role: "complement" },
      ],
    },
    {
      kind: "independent",
      parts: [
        { text: "the motion", role: "subject" },
        { text: "failed.", role: "verb" },
      ],
    },
  ],
  join: { mark: "comma", conjunction: "but", relation: "contrast" },
}) as Extract<LanguageModel, { kind: "clauses" }>;
const syllables = (pattern: string, words: number[] = []) =>
  [...pattern].map((c, i) => ({
    text: "la",
    stress: c === "/",
    wordEnd: words.length ? words.includes(i) : true,
  }));

describe("language words and clauses", () => {
  it("counts words but not a free-standing dash", () => {
    expect(languageWordCount("we can not dedicate — we can not consecrate")).toBe(8);
    expect(languageWordCount("  Mistakes were made. ")).toBe(3);
  });
  it("rebuilds a sentence for every join and judges it as edited prose", () => {
    expect(languageClausesSentence(splice)).toBe("The vote was close, the motion failed.");
    expect(languageClausesSentence(splice, "full_stop")).toBe(
      "The vote was close. The motion failed.",
    );
    expect(languageClausesSentence(splice, "comma_conjunction")).toBe(
      "The vote was close, but the motion failed.",
    );
    expect(languageClausesSentence(splice, "dash")).toBe("The vote was close—the motion failed.");
    expect(languageJoinVerdict(splice, "comma")).toMatchObject({
      standard: false,
      label: "Comma splice",
    });
    expect(languageJoinVerdict(splice, "semicolon").standard).toBe(true);
    expect(languageJoinVerdict(splice, "comma_conjunction").standard).toBe(true);
    // A colon promises explanation; a contrast does not deliver it.
    expect(languageJoinVerdict(splice, "colon").standard).toBe(false);
    expect(
      languageJoinVerdict({ ...splice, join: { ...splice.join!, relation: "explains" } }, "colon")
        .standard,
    ).toBe(true);
  });
  it("treats a dependent first clause differently", () => {
    const dependent = {
      ...splice,
      clauses: [{ ...splice.clauses[0]!, kind: "dependent" as const }, splice.clauses[1]!],
    };
    expect(languageJoinVerdict(dependent, "comma").standard).toBe(true);
    expect(languageJoinVerdict(dependent, "full_stop").label).toBe("Fragment");
    expect(languageClauseCounts(dependent)).toEqual({
      clauses: 2,
      independent: 1,
      dependent: 1,
      finiteVerbs: 2,
    });
  });
  it("refuses a join without two clauses", () => {
    expect(LanguageModelSchema.safeParse({ ...splice, clauses: [splice.clauses[0]] }).success).toBe(
      false,
    );
  });
});

describe("voice and concision", () => {
  const motion = parse({
    kind: "voice",
    agent: "the committee",
    active: "rejected",
    passive: "was rejected",
    patient: "the motion",
    display: "passive",
  }) as Extract<LanguageModel, { kind: "voice" }>;
  it("moves the actor between subject and by-phrase and counts every version", () => {
    expect(languageVoiceSentence(motion, "active")).toBe("The committee rejected the motion.");
    expect(languageVoiceSentence(motion)).toBe("The motion was rejected by the committee.");
    expect(languageVoiceSentence(motion, "agentless")).toBe("The motion was rejected.");
    expect([
      languageVoiceWords(motion, "active"),
      languageVoiceWords(motion, "passive"),
      languageVoiceWords(motion, "agentless"),
    ]).toEqual([5, 7, 4]);
  });
  it("compresses cut and replaced segments and reports the saving", () => {
    const m = parse({
      kind: "compress",
      segments: [
        { text: "In my personal opinion, it is basically true that", edit: "cut" },
        { text: "the", edit: "keep" },
        { text: "final", edit: "cut" },
        { text: "outcome depends on the weather.", edit: "keep" },
      ],
    }) as Extract<LanguageModel, { kind: "compress" }>;
    expect(languageCompression(m)).toMatchObject({
      after: "The outcome depends on the weather.",
      beforeWords: 16,
      afterWords: 6,
      saved: 10,
    });
  });
  it("requires replacement text exactly when a segment is replaced", () => {
    expect(
      LanguageModelSchema.safeParse({
        kind: "compress",
        segments: [
          { text: "a", edit: "replace" },
          { text: "b", edit: "keep" },
        ],
      }).success,
    ).toBe(false);
    expect(
      LanguageModelSchema.safeParse({
        kind: "compress",
        segments: [
          { text: "a", edit: "keep", replacement: "c" },
          { text: "b", edit: "keep" },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("scansion", () => {
  it("names regular iambic and trochaic lines", () => {
    expect(
      languageScansion({ kind: "scansion", source: "x", syllables: syllables("x/x/x/x/x/") }),
    ).toMatchObject({
      syllables: 10,
      beats: 5,
      foot: "iamb",
      feet: 5,
      metre: "iambic pentameter",
      ending: "masculine",
    });
    expect(
      languageScansion({ kind: "scansion", source: "x", syllables: syllables("/x/x/x/x") }),
    ).toMatchObject({
      foot: "trochee",
      metre: "trochaic tetrameter",
    });
  });
  it("recognises a feminine ending and one substituted foot", () => {
    expect(
      languageScansion({ kind: "scansion", source: "x", syllables: syllables("x/x/x/x/x/x") }),
    ).toMatchObject({
      syllables: 11,
      metre: "iambic pentameter",
      ending: "feminine",
    });
    expect(
      languageScansion({ kind: "scansion", source: "x", syllables: syllables("/xx/x/x/x/") }),
    ).toMatchObject({
      metre: "iambic pentameter",
      substitutions: 1,
    });
    expect(
      languageScansion({ kind: "scansion", source: "x", syllables: syllables("//xx//xx") }).metre,
    ).toBe("irregular");
  });
});

describe("sonnets and arcs", () => {
  const lines = (sounds: string) => [...sounds].map((c) => ({ text: "line", sound: c + "x" }));
  it("derives rhyme letters, distinct sounds and form from end sounds", () => {
    const shakespeare = languageSonnet({
      kind: "sonnet",
      source: "s",
      turn: 13,
      lines: lines("ababcdcdefefgg"),
    });
    expect(shakespeare).toMatchObject({
      scheme: "ABABCDCDEFEFGG",
      sounds: 7,
      form: "Shakespearean",
    });
    const petrarch = languageSonnet({
      kind: "sonnet",
      source: "s",
      turn: 9,
      lines: lines("abbaabbacdecde"),
    });
    expect(petrarch).toMatchObject({ sounds: 5, form: "Petrarchan", groups: [8, 6] });
    // A rhyme sound reused across quatrains keeps the Shakespearean shape.
    const reused = languageSonnet({
      kind: "sonnet",
      source: "s",
      turn: 9,
      lines: lines("ababcdcdebebff"),
    });
    expect(reused).toMatchObject({ form: "Shakespearean", sounds: 6 });
    expect(
      languageMeasures({ kind: "sonnet", source: "s", turn: 9, lines: lines("abbaabbacdecde") })[0]!
        .value,
    ).toBe("ABBAABBA CDECDE");
  });
  it("finds the first highest scene, the turns and Freytag's phases", () => {
    const a = languageArc({
      kind: "arc",
      title: "t",
      scenes: [
        { label: "a", rise: 2, opens: "-", closes: "+" },
        { label: "b", rise: 6, opens: "+", closes: "+" },
        { label: "c", rise: 9, opens: "+", closes: "-" },
        { label: "d", rise: 9, opens: "-", closes: "-" },
        { label: "e", rise: 1, opens: "-", closes: "+" },
      ],
    });
    expect(a).toMatchObject({ climax: 2, climaxScene: 3, turns: [0, 2, 4], turnCount: 3 });
    expect(a.phases).toEqual([
      "exposition",
      "rising action",
      "climax",
      "falling action",
      "catastrophe",
    ]);
  });
});

describe("contracts and givens", () => {
  it("keeps derived results out of the given statement", () => {
    const m = {
      kind: "scansion" as const,
      source: "Sonnet 18",
      syllables: syllables("x/x/x/x/x/", [9]),
    };
    expect(languageGivens(m)).not.toMatch(/pentameter|beats|\/|˘/);
    const t = parse({
      kind: "toulmin",
      statements: [
        { text: "Rain fell all night.", role: "grounds" },
        { text: "The roads are wet.", role: "claim" },
      ],
    });
    expect(languageGivens(t)).toBe(
      "Statement 1: Rain fell all night. Statement 2: The roads are wet.",
    );
  });
  it("requires one claim, increasing structure and unique cases", () => {
    expect(
      LanguageModelSchema.safeParse({
        kind: "toulmin",
        statements: [
          { text: "a", role: "grounds" },
          { text: "b", role: "warrant" },
        ],
      }).success,
    ).toBe(false);
    const model = {
      kind: "irony",
      source: "s",
      speaker: "A",
      line: "l",
      said: "s",
      known: "k",
      knower: "audience",
    };
    expect(
      LanguageDiagramSchema.safeParse({
        type: "language_explorer",
        initialCaseId: "x",
        cases: [
          { id: "a", label: "A", model },
          { id: "b", label: "B", model },
        ],
      }).success,
    ).toBe(false);
  });
});

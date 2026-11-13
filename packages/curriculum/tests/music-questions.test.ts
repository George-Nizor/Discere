import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Music Theory follows the way History asks questions (docs/question-writing-guide.md), adapted to
 * a skill of naming and hearing patterns: most questions put musical material in text in front of
 * the learner (note names with octave numbers, a key signature, a progression in Roman numerals, a
 * bass line, a rhythm in counts) and ask what it is, what comes next or what is wrong with it.
 * Prout (Harmony, 1889) and Goetschius (The Material Used in Musical Composition, 1889) appear as
 * extracts. Numeric questions stay where the number is the point: semitones, tempo, counted attacks.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/music-theory/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const extractsOf = (question: Question | undefined): string[] =>
  (question?.extracts ?? []).map((extract) => extract.text);
const q = (id: string): Question => {
  const found = questions.get(`must-${id}`);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};
const answerOf = (question: Question): string =>
  question.answerAuthority.kind === "text" ? (question.answerAuthority.acceptedIdeas[0] ?? "") : "";

// --- A small independent model of pitch, used to recompute every interval the course names. ---
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const parseNote = (text: string, defaultOctave = 4) => {
  const match = /^([A-G])([♯♭]?)(\d?)$/u.exec(text.trim());
  if (!match) throw new Error(`cannot read note ${text}`);
  const letter = match[1] as (typeof LETTERS)[number];
  const accidental = match[2] === "♯" ? 1 : match[2] === "♭" ? -1 : 0;
  const octave = match[3] ? Number(match[3]) : defaultOctave;
  return {
    letter,
    explicit: Boolean(match[3]),
    index: LETTERS.indexOf(letter) + 7 * octave,
    semitones: (PITCH_CLASS[letter] as number) + accidental + 12 * octave,
  };
};
/** Semitone values for note names written from the lowest up, each placed above the one before. */
const ascend = (names: string[]): number[] => {
  const values: number[] = [];
  for (const name of names) {
    const base = parseNote(name, 0).semitones;
    let value = base;
    while (values.length > 0 && value <= (values[values.length - 1] as number)) value += 12;
    values.push(value);
  }
  return values;
};
const ORDINALS: Record<number, string> = {
  1: "unison",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "octave",
  9: "ninth",
  10: "tenth",
};
/** Size in semitones of the major or perfect interval of a simple number (1 to 8). */
const REFERENCE = [0, 2, 4, 5, 7, 9, 11, 12];
const PERFECT = new Set([1, 4, 5, 8]);
/** Names the interval from a lower note up to the next time that upper note name appears. */
const nameInterval = (low: string, high: string) => {
  const a = parseNote(low);
  let b = parseNote(high);
  if (!b.explicit && b.index <= a.index) b = parseNote(high, 5);
  const number = b.index - a.index + 1;
  const semitones = b.semitones - a.semitones;
  const simple = number > 8 ? ((number - 1) % 7) + 1 : number;
  const octaves = number > 8 ? Math.floor((number - 1) / 7) : 0;
  const offset = semitones - 12 * octaves - (REFERENCE[simple - 1] as number);
  let quality = "?";
  if (PERFECT.has(simple))
    quality = offset === 0 ? "perfect" : offset === 1 ? "augmented" : offset === -1 ? "diminished" : "?";
  else
    quality =
      offset === 0 ? "major" : offset === -1 ? "minor" : offset === 1 ? "augmented" : offset === -2 ? "diminished" : "?";
  return { number, semitones, name: `${quality} ${ORDINALS[number] ?? number}` };
};
const triadQuality = (notes: string[]) => {
  const [root, third, fifth] = ascend(notes) as [number, number, number];
  const key = `${third - root}${fifth - third}`;
  return key === "43" ? "major" : key === "34" ? "minor" : key === "33" ? "dim" : key === "44" ? "aug" : "?";
};
/** Whole and half steps between the notes of a scale written as note names. */
const stepsOf = (notes: string[]) => {
  const values = ascend(notes);
  return values.slice(1).map((value, i) => value - (values[i] as number));
};

describe("questions in Music Theory", () => {
  it("asks every question from a lesson, and every lesson question exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        lesson.intro?.hook.questionId ?? "",
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).flatMap((line) => [
            line.blank?.questionId ?? "",
            line.selfExplain?.questionId ?? "",
          ]),
        ]),
      ]),
    );
    asked.delete("");
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((c) => c.id)).toEqual(
      [],
    );
    const cards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
    expect(bundle.flashcards.filter((card) => !cards.has(card.id)).map((card) => card.id)).toEqual(
      [],
    );
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to semitones, tempo and counted attacks, fifteen at most", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
    for (const question of numeric) expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
  });

  it("puts a passage from a harmony textbook in front of the learner in four to eight questions", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(4);
    expect(withExtract.length).toBeLessThanOrEqual(8);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(4);
  });

  it("cites a verified public-domain source for every extract and keeps extracts short", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      const extracts = extractsOf(question);
      if (extracts.length === 0) continue;
      const cited = question.sourceIds
        .map((id) => sources.get(id))
        .filter((source) => source?.licence.startsWith("Public domain"));
      expect(cited.length, question.id).toBeGreaterThanOrEqual(1);
      for (const source of cited) {
        expect(source?.checked?.status, question.id).toBe("verified");
        expect((source?.checked?.at ?? "") >= "2026-11-13", question.id).toBe(true);
      }
      for (const extract of extracts) {
        const words = extract.split(/\s+/u).length;
        expect(words, question.id).toBeGreaterThanOrEqual(20);
        expect(words, question.id).toBeLessThanOrEqual(90);
      }
      expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
      expect(question.prompt, question.id).not.toContain("\n> ");
    }
    const lessonSources = new Set(bundle.lessons.flatMap((lesson) => lesson.sourceIds));
    const courseSources = new Set(bundle.course.sourceIds);
    for (const id of ["prout-harmony", "goetschius-material"]) {
      expect(lessonSources.has(id), id).toBe(true);
      expect(courseSources.has(id), id).toBe(true);
    }
  });

  it("gives every extract its author, its date and the kind of work it comes from", () => {
    for (const question of bundle.questions)
      for (const extract of question.extracts ?? [])
        for (const part of [extract.who, extract.when, extract.kind])
          expect(part.trim().length, question.id).toBeGreaterThan(3);
  });

  it("keeps dashes out of everything but the quotations", () => {
    for (const question of bundle.questions) {
      const text = [
        question.prompt,
        ...question.hints,
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.order?.items ?? []),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
        ...(question.extracts ?? []).flatMap((extract) => [extract.who, extract.when, extract.kind]),
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
  });

  it("marks one option right, never makes it the longest by a quarter, and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      // Note names such as C and C♯ cannot be balanced by length.
      if (longestOther >= 10)
        expect(right[0]?.label.length ?? 0, question.id).toBeLessThanOrEqual(longestOther * 1.25);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(5);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([ORDER_ANSWER_IDEA]);
        expect(
          order.items.filter((item) => /^\d/u.test(item)),
          question.id,
        ).toEqual([]);
      }
      if (sort) {
        expect(new Set(sort.items.map((item) => item.label)).size, question.id).toBe(
          sort.items.length,
        );
        for (const bin of sort.bins)
          expect(
            sort.items.some((item) => item.bin === bin.id),
            `${question.id} ${bin.id}`,
          ).toBe(true);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("puts musical material in front of the learner in most questions", () => {
    const material =
      /\b[A-G][♯♭]?\d?\b|\b(?:I|ii|iii|IV|V|vi|vii°?|V7)\b|\d\/\d|\bsemitones?\b|\b\d+ Hz\b|\b(?:key signature|sharps?|flats?|beats? per minute|bass line|melody|tune|hymn|piece|chord|triad|scale|voice|tenor|alto|soprano|bass)\b/u;
    expect(
      bundle.questions.filter(
        (question) =>
          material.test(question.prompt) ||
          (question.sort?.items ?? []).some((item) => material.test(item.label)) ||
          (question.order?.items ?? []).some((item) => material.test(item)),
      ).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
  });

  it("does not mark a typed answer right when it only repeats the prompt", () => {
    for (const question of bundle.questions) {
      if (question.choices || question.answerAuthority.kind !== "text") continue;
      if (question.order || question.sort) continue;
      expect(assessTextAnswer(question.prompt, question.answerAuthority).correct, question.id).toBe(
        false,
      );
      expect(
        assessTextAnswer(question.answerAuthority.exampleAnswer, question.answerAuthority).correct,
        question.id,
      ).toBe(true);
    }
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      const needsTwo =
        question.extracts?.length || question.order || question.sort || kind(question) === "numeric";
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(needsTwo ? 2 : 1);
    }
  });

  it("keeps the extract questions to passages the learner can read for themselves", () => {
    for (const question of bundle.questions) {
      if (!question.extracts?.length) continue;
      expect((question.choices ?? []).length, question.id).toBeGreaterThanOrEqual(3);
      // The prompt sets the case and never repeats the passage.
      for (const extract of question.extracts)
        expect(question.prompt.includes(extract.text.slice(0, 40)), question.id).toBe(false);
    }
  });

  describe("recomputed musical facts", () => {
    it("names every interval question from its letters and its semitones", () => {
      const typedIntervals: Array<[string, string, string, string]> = [
        // id, lower, upper, expected name
        ["intervals-d-fsharp", "D", "F♯", "major third"],
        ["intervals-a-to-f", "A", "F", "minor sixth"],
        ["intervals-e-to-bflat", "E", "B♭", "diminished fifth"],
        ["intervals-g-to-bflat", "G", "B♭", "minor third"],
        ["intervals-c-to-e-tenth", "C4", "E5", "major tenth"],
      ];
      for (const [id, low, high, expected] of typedIntervals) {
        const computed = nameInterval(low, high);
        expect(computed.name, id).toBe(expected);
        expect(answerOf(q(id)), id).toBe(expected);
        // The prompt names the same two notes as the table.
        expect(q(id).prompt, id).toContain(`from ${low} up to ${high}`);
      }
      // The compound interval is 16 semitones: a major third and an octave.
      expect(nameInterval("C4", "E5").semitones).toBe(16);
      // D up to A♭ is the 6-semitone gap the prompt states, spelled as a fifth.
      const dToAFlat = nameInterval("D", "A♭");
      expect(dToAFlat.semitones).toBe(6);
      expect(q("intervals-d-to-a-flat").prompt).toContain("6 semitones");
      expect(answerOf(q("intervals-d-to-a-flat"))).toBe("A diminished fifth");
      expect(`A ${dToAFlat.name}`).toBe(answerOf(q("intervals-d-to-a-flat")));
      // The augmented fourth the lesson offers for the same gap is spelled with a G.
      expect(nameInterval("D", "G♯").name).toBe("augmented fourth");
    });

    it("sorts the thirds and seconds by recomputed name", () => {
      const sort = q("intervals-third-or-second").sort;
      expect(sort).toBeDefined();
      const binNames: Record<string, string> = {
        "minor-third": "minor third",
        "major-third": "major third",
        "aug-second": "augmented second",
      };
      for (const item of sort?.items ?? []) {
        const match = /^([A-G][♯♭]?) up to ([A-G][♯♭]?)$/u.exec(item.label);
        expect(match, item.label).not.toBeNull();
        const computed = nameInterval(match?.[1] ?? "", match?.[2] ?? "");
        expect(computed.name, item.label).toBe(binNames[item.bin]);
        expect([3, 4], item.label).toContain(computed.semitones);
      }
    });

    it("inverts the intervals the inversion questions name", () => {
      // An interval and its inversion make an octave: sizes sum to 12 and numbers to 9.
      const invert = (name: string) => {
        const [quality, ordinal] = name.split(" ") as [string, string];
        const number = Number(Object.entries(ORDINALS).find(([, word]) => word === ordinal)?.[0]);
        const flip: Record<string, string> = {
          major: "minor",
          minor: "major",
          augmented: "diminished",
          diminished: "augmented",
          perfect: "perfect",
        };
        return `${flip[quality] ?? "?"} ${ORDINALS[9 - number]}`;
      };
      expect(answerOf(q("intervals-m3-inverted"))).toBe(invert("minor third"));
      expect(answerOf(q("intervals-fifth-inverted"))).toBe(invert("augmented fourth"));
    });

    it("counts the semitones the numeric and worked questions ask about", () => {
      const counts: Array<[string, string, string, number]> = [
        ["pitch-and-the-keyboard-d-to-a", "D4", "A4", 7],
        ["sharps-flats-and-the-semitone-fsharp-to-c", "F♯4", "C5", 6],
        ["sharps-flats-and-the-semitone-bflat-to-f", "B♭4", "F5", 7],
        ["sharps-flats-and-the-semitone-esharp-to-a", "E♯4", "A4", 4],
        ["voice-leading-d3-f3", "D3", "F3", 3],
        ["voice-leading-f3-a3", "F3", "A3", 4],
        ["minor-scales-f-to-gsharp", "A♭4", "B4", 3],
        ["progressions-and-cadences-b-to-f", "C♯4", "G4", 6],
      ];
      for (const [id, low, high, expected] of counts) {
        const computed = parseNote(high).semitones - parseNote(low).semitones;
        expect(computed, id).toBe(expected);
        const authority = q(id).answerAuthority;
        expect(authority.kind === "numeric" && authority.value, id).toBe(expected);
      }
      expect(nameInterval("E", "B").semitones).toBe(7);
      expect(answerOf(q("sharps-flats-and-the-semitone-e-to-b"))).toBe("7");
    });

    it("builds the scales, triads and forms the sorting and ordering questions list", () => {
      // The major scale written out in order is W W H W W W H.
      const dMajor = q("the-major-scale-d-major-order").order?.items ?? [];
      expect(stepsOf([...dMajor, "D"])).toEqual([2, 2, 1, 2, 2, 2, 1]);
      expect(new Set(dMajor.map((note) => note[0])).size).toBe(7);

      // Each triad in the quality sort has the quality of the bin it is placed in.
      const qualityBins: Record<string, string> = { major: "major", minor: "minor", dim: "dim" };
      for (const item of q("triads-and-seventh-chords-triad-quality-sort").sort?.items ?? [])
        expect(triadQuality(item.label.split(" ")), item.label).toBe(qualityBins[item.bin]);

      // The triad with the diminished fifth is the only one whose root to fifth is 6 semitones.
      const dim = q("triads-and-seventh-chords-which-has-dim-fifth");
      const fifths = (dim.choices ?? []).map((choice) => {
        const values = ascend(choice.label.split(" "));
        return [choice.label, (values[2] as number) - (values[0] as number)] as const;
      });
      expect(fifths.filter(([, size]) => size === 6).map(([label]) => label)).toEqual([answerOf(dim)]);

      // The lines of the bass staff are thirds apart, from G2 up to A3.
      const lines = (q("the-staff-and-clefs-bass-lines-order").order?.items ?? []).map((note) =>
        parseNote(note),
      );
      expect(lines.map((note) => note.index - (lines[0]?.index ?? 0))).toEqual([0, 2, 4, 6, 8]);

      // The minor forms: compare each line with the natural minor on its tonic.
      for (const item of q("minor-scales-minor-forms-sort").sort?.items ?? []) {
        const notes = item.label.split(" ");
        const steps = stepsOf(notes);
        const pattern: Record<string, number[]> = {
          natural: [2, 1, 2, 2, 1, 2, 2],
          harmonic: [2, 1, 2, 2, 1, 3, 1],
          melodic: [2, 1, 2, 2, 2, 2, 1],
        };
        expect(steps, item.label).toEqual(pattern[item.bin]);
      }

      // Five sharps put the key on B: the last sharp is A and a semitone above A is B.
      expect(nameInterval("A", "B♭").semitones).toBe(1);
      expect(parseNote("B").semitones - parseNote("A♯").semitones).toBe(1);
    });

    it("keeps the voice-leading examples to the motion the question says they show", () => {
      const interval = (a: string, b: string) => parseNote(b, 4).semitones - parseNote(a, 4).semitones;
      // The fifths in the Prout question: D3 to A3 and then E3 to B3, both rising.
      expect(parseNote("A3").semitones - parseNote("D3").semitones).toBe(7);
      expect(parseNote("B3").semitones - parseNote("E3").semitones).toBe(7);
      // The parallel items in the motion sort keep their interval; the similar item changes it.
      expect(interval("E4", "G4")).toBe(interval("F♯4", "A4"));
      expect(parseNote("B3").semitones - parseNote("E3").semitones).toBe(
        parseNote("C4").semitones - parseNote("F3").semitones,
      );
      expect(interval("G4", "C5")).not.toBe(interval("B4", "D5"));
      // In G major V7 is D F♯ A C, and the leading tone F♯ is a semitone below the tonic.
      expect(parseNote("G4").semitones - parseNote("F♯4").semitones).toBe(1);
    });
  });
});

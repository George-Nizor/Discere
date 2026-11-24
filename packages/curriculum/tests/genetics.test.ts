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
 * Genetics: From Genes to Genomes asks for a typed number only where computing is the skill a
 * geneticist uses: cross ratios, recombination, pedigree probabilities, Hardy-Weinberg
 * proportions and the odds ratio of a genome scan. Everywhere else a learner judges. So this file
 * checks which questions take a number, then recomputes every figure the lessons and questions
 * rest on: the codon translations against the NCBI table copied into the fixture, the lac operon
 * crosses, the offspring ratios and sex-linked crosses, the recombination frequencies and map
 * orders, the carrier probabilities, the Hardy-Weinberg frequencies, the chances behind drift,
 * the risk ratios of the genetic testing lesson, the odds ratios and the polygenic score, and
 * the generations an exposure reaches. It checks the shape of the questions (each lesson asked,
 * end checks, option lengths, feedback, hints), that every hover note points at a lesson that
 * teaches its term, and that each quoted extract and each figure taken from the source pack is
 * found in a passage copied from it.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/genetics/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const biology = JSON.parse(
  readFileSync(
    new URL("../../../content/biology-cells-to-ecosystems/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/genetics-passages.json", import.meta.url), "utf8"),
) as {
  files: Record<string, string[]>;
  codeTable: { aas: string; base1: string; base2: string; base3: string };
};
const questions = new Map(bundle.questions.map((item) => [item.id, item]));
const question = (id: string): Question => {
  const found = questions.get(id);
  if (!found) throw new Error(`No question ${id}`);
  return found;
};
const lesson = (id: string) => {
  const found = bundle.lessons.find((item) => item.id === id);
  if (!found) throw new Error(`No lesson ${id}`);
  return found;
};
const kind = (item: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  item.responseType === "numeric" || item.answerAuthority.kind === "numeric"
    ? "numeric"
    : item.responseType === "order" || item.responseType === "sort"
      ? item.responseType
      : item.choices
        ? "choice"
        : "typed";
const stepQuestionIds = (item: CourseBundle["lessons"][number]) =>
  item.steps.flatMap((step) => [
    step.checkQuestionId,
    ...(step.workedSteps ?? []).flatMap((line) => [
      line.blank?.questionId ?? "",
      line.selfExplain?.questionId ?? "",
    ]),
  ]);
const ownIds = (item: CourseBundle["lessons"][number]) =>
  new Set(
    [item.intro?.hook.questionId ?? "", ...item.questionIds, ...stepQuestionIds(item)].filter(
      Boolean,
    ),
  );
const choiceQuestions = bundle.questions.filter(
  (item) =>
    item.choices &&
    item.choices.length >= 3 &&
    item.answerAuthority.kind === "text" &&
    !item.order &&
    !item.sort,
);
const rightIndex = (item: Question) => {
  const authority = item.answerAuthority;
  if (authority.kind !== "text") throw new Error(item.id);
  const found = (item.choices ?? []).flatMap((choice, index) =>
    assessTextAnswer(choice.label, authority).correct ? [index] : [],
  );
  expect(found, item.id).toHaveLength(1);
  return found[0] as number;
};
const labels = (id: string) => (question(id).choices ?? []).map((choice) => choice.label);
const squash = (text: string) =>
  text
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/‑/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
const everything = JSON.stringify({
  lessons: bundle.lessons,
  questions: bundle.questions,
  flashcards: bundle.flashcards,
});
/** The course says this, in a lesson, a question or a card. */
const stated = (fragment: string) => expect(everything, fragment).toContain(fragment);
/** The numbers a numeric question counts as right, and the wrong ones it answers by name. */
const rightValue = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(id);
  return authority;
};
const wrongValues = (id: string) =>
  (question(id).misconceptions ?? []).flatMap((entry) => entry.match.numeric ?? []);
const close = (id: string, exact: number) => {
  const authority = rightValue(id);
  expect(
    Math.abs(authority.value - exact),
    `${id}: ${authority.value} against ${exact}`,
  ).toBeLessThanOrEqual((authority.absoluteTolerance ?? 0) + 1e-9);
};
/** A passage copied from the pack that matches the pattern, so a figure in a lesson is the pack's. */
const inPack = (file: string, pattern: RegExp) =>
  expect(
    (fixture.files[file] ?? []).some((passage) => pattern.test(passage)),
    `${file}: ${pattern}`,
  ).toBe(true);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

// The standard genetic code, read from the NCBI table in the fixture and written with U.
const THREE: Record<string, string> = {
  F: "Phe",
  L: "Leu",
  S: "Ser",
  Y: "Tyr",
  "*": "Stop",
  C: "Cys",
  W: "Trp",
  P: "Pro",
  H: "His",
  Q: "Gln",
  R: "Arg",
  I: "Ile",
  M: "Met",
  T: "Thr",
  N: "Asn",
  K: "Lys",
  V: "Val",
  A: "Ala",
  D: "Asp",
  E: "Glu",
  G: "Gly",
};
const CODE = new Map<string, string>();
for (let at = 0; at < 64; at += 1) {
  const { aas, base1, base2, base3 } = fixture.codeTable;
  CODE.set(
    `${base1[at]}${base2[at]}${base3[at]}`.replace(/T/gu, "U"),
    THREE[aas[at] as string] as string,
  );
}
const aa = (codon: string): string => {
  const found = CODE.get(codon);
  if (!found) throw new Error(`No codon ${codon}`);
  return found;
};
const codonsOf = (rna: string, from = 0) => {
  const out: string[] = [];
  for (let at = from; at + 3 <= rna.length; at += 3) out.push(rna.slice(at, at + 3));
  return out;
};
/** Reads from a position until the first stop codon in the frame. */
const readFrom = (rna: string, from: number) => {
  const chain: string[] = [];
  for (const codon of codonsOf(rna, from)) {
    if (aa(codon) === "Stop")
      return { chain, stop: codon, rest: rna.slice(from + 3 * (chain.length + 1)) };
    chain.push(aa(codon));
  }
  return { chain, stop: null, rest: "" };
};
const fromFirstAug = (rna: string) => ({
  start: rna.indexOf("AUG"),
  ...readFrom(rna, rna.indexOf("AUG")),
});
const names = (rna: string, from = 0) => codonsOf(rna, from).map(aa);
const BASES = ["U", "C", "A", "G"];
/** The amino acid a single-base change gives, or null when the position or base is not a change. */
const changeAt = (codon: string, position: number, base: string) =>
  base === codon[position] ? null : aa(codon.slice(0, position) + base + codon.slice(position + 1));
const classify = (before: string, after: string) => {
  const was = codonsOf(before).map(aa);
  const now = codonsOf(after).map(aa);
  if ((before.length - after.length) % 3 !== 0) return "frameshift";
  const stop = now.indexOf("Stop");
  if (stop >= 0 && was.indexOf("Stop") < 0) return "nonsense";
  return now.join() === was.join() ? "silent" : "missense";
};

describe("questions in Genetics: From Genes to Genomes", () => {
  it("asks every question and every card from a lesson, and every id exists", () => {
    const asked = new Set(bundle.lessons.flatMap((item) => [...ownIds(item)]));
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((item) => !asked.has(item.id)).map((item) => item.id)).toEqual(
      [],
    );
    const cards = bundle.lessons.flatMap((item) => item.flashcardIds);
    expect(new Set(cards).size).toBe(cards.length);
    expect(
      bundle.flashcards.filter((card) => !cards.includes(card.id)).map((card) => card.id),
    ).toEqual([]);
    const ids = [...bundle.questions.map((item) => item.id), ...bundle.flashcards.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all 14 lessons, each with at least eight questions and three or four cards", () => {
    expect(bundle.lessons).toHaveLength(14);
    for (const item of bundle.lessons) {
      expect(ownIds(item).size, item.id).toBeGreaterThanOrEqual(8);
      expect(item.flashcardIds.length, item.id).toBeGreaterThanOrEqual(3);
      expect(item.flashcardIds.length, item.id).toBeLessThanOrEqual(4);
    }
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const item of bundle.lessons) {
      const types = item.questionIds.map((id) => kind(question(id)));
      expect(types, item.id).toHaveLength(3);
      expect(new Set(types).size, item.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("takes a typed number only for cross ratios, recombination, pedigree chances, Hardy-Weinberg proportions and odds ratios", () => {
    const numeric = bundle.questions.filter((item) => kind(item) === "numeric");
    const byLesson = (id: string) =>
      numeric.filter((item) => ownIds(lesson(id)).has(item.id)).map((item) => item.id);
    expect(byLesson("reading-offspring-ratios")).toEqual([
      "gen-reading-offspring-ratios-grey-beetles",
      "gen-reading-offspring-ratios-blank-expected-white",
    ]);
    expect(byLesson("linked-genes")).toHaveLength(3);
    expect(byLesson("reading-pedigrees")).toHaveLength(5);
    expect(byLesson("hardy-weinberg-null-model")).toHaveLength(7);
    expect(byLesson("genome-scans-and-risk-scores")).toHaveLength(2);
    expect(numeric).toHaveLength(19);
    // No other lesson asks for a computed number: the translation, the mutation, the trait, the
    // drift and the test questions are judgements.
    for (const id of [
      "genes-variants-genome",
      "reading-the-genetic-code",
      "switching-genes-on-and-off",
      "what-a-mutation-does",
      "traits-with-many-causes",
      "drift-and-selection",
      "what-a-genetic-test-tells-you",
      "editing-genomes",
      "weighing-epigenetic-claims",
    ])
      expect(byLesson(id), id).toEqual([]);
    for (const card of bundle.flashcards.filter((item) => item.answerAuthority?.kind === "numeric"))
      expect(
        [
          "genes-variants-genome",
          "reading-the-genetic-code",
          "linked-genes",
          "reading-pedigrees",
          "hardy-weinberg-null-model",
          "what-a-genetic-test-tells-you",
          "genome-scans-and-risk-scores",
        ].some((id) => lesson(id).flashcardIds.includes(card.id)),
        card.id,
      ).toBe(true);
    // An answer that is a count is exact, and one that is a computed frequency has a tolerance
    // that a rounded answer passes and a wrong method does not
    for (const item of numeric) {
      const authority = rightValue(item.id);
      const tolerance = authority.absoluteTolerance ?? 0;
      expect(tolerance, item.id).toBeLessThanOrEqual(Math.abs(authority.value) * 0.07 + 1e-9);
      for (const wrong of wrongValues(item.id))
        expect(Math.abs(wrong - authority.value), `${item.id}: ${wrong}`).toBeGreaterThan(
          tolerance,
        );
    }
  });

  it("keeps the right option the longest in at most a third of choice questions, and never far longer", () => {
    let longest = 0;
    let shortest = 0;
    for (const item of choiceQuestions) {
      const right = rightIndex(item);
      const choices = item.choices ?? [];
      const others = choices
        .filter((_, index) => index !== right)
        .map((choice) => choice.label.length);
      const length = (choices[right] as { label: string }).label.length;
      if (length > Math.max(...others)) longest += 1;
      if (length < Math.min(...others)) shortest += 1;
      expect(length, item.id).toBeLessThanOrEqual(Math.max(...others) * 1.15);
    }
    expect(choiceQuestions.length).toBeGreaterThan(100);
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.3);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.4);
  });

  it("puts the right option in different places, across the course and within each lesson", () => {
    const positions = new Map<number, number>();
    for (const item of choiceQuestions) {
      const at = rightIndex(item);
      positions.set(at, (positions.get(at) ?? 0) + 1);
    }
    expect(positions.size).toBeGreaterThanOrEqual(3);
    for (const count of positions.values())
      expect(count / choiceQuestions.length).toBeLessThanOrEqual(0.45);
    for (const item of bundle.lessons) {
      const own = ownIds(item);
      const places = choiceQuestions.filter((entry) => own.has(entry.id)).map(rightIndex);
      expect(new Set(places).size, item.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("explains every wrong option, keeps feedback from naming the right one, and gives two hints", () => {
    for (const item of bundle.questions) {
      for (const hint of item.hints)
        expect(hint, item.id).not.toMatch(/begins with|starts with|first letter/iu);
      expect(item.hints.length, item.id).toBeGreaterThanOrEqual(2);
      if (item.onCorrect)
        expect(item.onCorrect.split(/\s+/u).length, item.id).toBeLessThanOrEqual(45);
      if (!item.choices || item.answerAuthority.kind !== "text") continue;
      const right = item.choices[rightIndex(item)] as { id: string; label: string };
      const explained = new Set(
        (item.misconceptions ?? []).flatMap((entry) => entry.match.choiceIds ?? []),
      );
      for (const choice of item.choices.filter((entry) => entry.id !== right.id))
        expect(explained.has(choice.id), `${item.id} ${choice.id}`).toBe(true);
      for (const entry of item.misconceptions ?? []) {
        expect(entry.feedback.trim().length, item.id).toBeGreaterThan(20);
        expect(squash(entry.feedback).toLowerCase(), item.id).not.toContain(
          squash(right.label).toLowerCase(),
        );
      }
    }
  });

  it("keeps dashes, verdict words and American spellings out of the course text, apart from quoted extracts", () => {
    const withoutExtracts = JSON.stringify({
      course: bundle.course,
      modules: bundle.modules,
      concepts: bundle.concepts,
      lessons: bundle.lessons.map((item) => ({
        ...item,
        steps: item.steps.map(({ diagram: _diagram, ...rest }) => rest),
      })),
      flashcards: bundle.flashcards,
    });
    expect(withoutExtracts).not.toMatch(/[—–]/u);
    expect(withoutExtracts).not.toMatch(
      /\b(hemoglobin|color|behavior|fertiliz\w+|recogniz\w+)\b/iu,
    );
    for (const item of bundle.questions) {
      const { extracts: _extracts, ...rest } = item;
      const text = JSON.stringify(rest);
      expect(text, item.id).not.toMatch(/[—–]/u);
      expect(text, item.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
      expect(text, item.id).not.toMatch(/\b(hemoglobin|color|behavior)\b/iu);
    }
    // The hover notes and every quoted lesson title are real, and no hint points at "the last lesson"
    expect(everything).not.toMatch(/the last lesson|the previous lesson|the earlier lesson/iu);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    let ordered = 0;
    let sorted = 0;
    for (const item of bundle.questions) {
      const { order, sort } = item;
      if (item.answerAuthority.kind !== "text" || !(order || sort)) continue;
      if (order) {
        ordered += 1;
        expect(new Set(order.items).size, item.id).toBe(order.items.length);
        expect(order.items.length, item.id).toBeGreaterThanOrEqual(4);
        expect(item.answerAuthority.acceptedIdeas, item.id).toEqual([ORDER_ANSWER_IDEA]);
      }
      if (sort) {
        sorted += 1;
        expect(new Set(sort.items.map((entry) => entry.label)).size, item.id).toBe(
          sort.items.length,
        );
        for (const bin of sort.bins)
          expect(
            sort.items.some((entry) => entry.bin === bin.id),
            `${item.id} ${bin.id}`,
          ).toBe(true);
        for (const entry of sort.items) expect(entry.explanation, item.id).toBeTruthy();
        expect(item.answerAuthority.acceptedIdeas, item.id).toEqual([SORT_ANSWER_IDEA]);
      }
      expect(item.onCorrect, item.id).toBeTruthy();
    }
    expect(ordered).toBe(3);
    expect(sorted).toBe(11);
  });

  it("declares every figure in a graded step as hidden until the response, and makes none live", () => {
    let figures = 0;
    for (const item of bundle.lessons)
      for (const step of item.steps) {
        if (!step.diagram) continue;
        const graded =
          Boolean(step.checkQuestionId) || (step.workedSteps ?? []).some((line) => line.blank);
        if (graded) {
          figures += 1;
          expect(step.answerVisibility, `${item.id}/${step.id}`).toBe("hidden-until-response");
        }
        expect(step.answerVisibility, `${item.id}/${step.id}`).not.toBe("live");
      }
    expect(figures).toBe(9);
  });

  it("pairs every dollar sign of a prompt, option or feedback line into an equation the app renders", () => {
    // The answer choices go through the same inline renderer as the prose, so $O^c$ in an option
    // is drawn as maths. Every $ must belong to a pair: none may be left over.
    const pattern = /`[^`\n]+`|\$(?=[^\s$])([^$\n]*?[^\s$])\$(?!\d)/gu;
    const strays: string[] = [];
    const visit = (value: unknown, path: string) => {
      if (typeof value === "string") {
        if (value.includes("$") && value.replace(pattern, "").includes("$")) strays.push(path);
      } else if (Array.isArray(value)) {
        for (const [at, entry] of value.entries()) visit(entry, `${path}.${at}`);
      } else if (value && typeof value === "object")
        for (const [key, entry] of Object.entries(value))
          if (key !== "svg") visit(entry, `${path}.${key}`);
    };
    visit(
      { lessons: bundle.lessons, questions: bundle.questions, flashcards: bundle.flashcards },
      "",
    );
    expect(strays).toEqual([]);
  });

  it("finds every quoted extract word for word in a passage copied from the source pack", () => {
    const pool = Object.values(fixture.files).flat().map(squash);
    let checked = 0;
    for (const item of bundle.questions) {
      for (const extract of item.extracts ?? []) {
        checked += 1;
        expect(
          pool.some((passage) => passage.includes(squash(extract.text))),
          item.id,
        ).toBe(true);
      }
    }
    expect(checked).toBe(16);
  });

  it("words the source line of every extract of one source alike", () => {
    const groups = { wikipedia: 0, medlineplus: 0, nci: 0, nhgri: 0, textbook: 0 };
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? []) {
        expect(extract.when, item.id).toBe("accessed 24 November 2026");
        if (extract.who.startsWith("Wikipedia")) {
          groups.wikipedia += 1;
          expect(extract.who).toMatch(/^Wikipedia, article ".+" \(CC BY-SA 4\.0\)$/u);
          expect(extract.kind).toBe("An encyclopedia article written by volunteer editors");
        } else if (extract.who.startsWith("MedlinePlus")) {
          groups.medlineplus += 1;
          expect(extract.who).toMatch(
            /^MedlinePlus Genetics, "[^"]+" \(US National Library of Medicine, public domain\)$/u,
          );
          expect(extract.kind).toBe("A health information page from a US government library");
        } else if (extract.who.startsWith("National Cancer Institute")) {
          groups.nci += 1;
          expect(extract.who).toBe(
            "National Cancer Institute, BRCA fact sheet (US government, public domain)",
          );
          expect(extract.kind).toBe("A fact sheet from a US government cancer institute");
        } else if (extract.who.startsWith("National Human Genome")) {
          groups.nhgri += 1;
          expect(extract.who).toBe(
            "National Human Genome Research Institute, Polygenic Risk Scores (US government, public domain)",
          );
          expect(extract.kind).toBe(
            "A health information page from a US government research institute",
          );
        } else {
          groups.textbook += 1;
          expect(extract.who).toBe(
            "Nickle and Barrette-Ng, Online Open Genetics, section 5.4 (CC BY-SA 3.0)",
          );
          expect(extract.kind).toBe("An open textbook on genetics");
        }
      }
    expect(groups).toEqual({ wikipedia: 8, medlineplus: 4, nci: 2, nhgri: 1, textbook: 1 });
  });

  it("points every hover note at a lesson that teaches the term, or at an earlier screen of its own lesson", () => {
    const titles = new Map(bundle.lessons.map((item) => [item.title, item]));
    const taught: Record<string, string> = {
      "punnett square": "What could the offspring inherit? in Biology: Cells to Ecosystems",
      heterozygous: "What could the offspring inherit? in Biology: Cells to Ecosystems",
      snps: "Genes, variants and the rest of the genome",
      "exome sequencing": "this lesson",
      "variants of uncertain significance": "this lesson",
      "variant of uncertain significance": "this lesson",
      "manhattan plot": "this lesson",
      mosaicism: "this lesson",
    };
    let hovers = 0;
    for (const item of bundle.lessons) {
      const text = JSON.stringify({ steps: item.steps, recap: item.recap });
      for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]*)\]\]/gu)) {
        hovers += 1;
        const term = match[1] as string;
        const note = match[2] as string;
        expect(taught[term.toLowerCase()], `${item.id}: ${term}`).toBeTruthy();
        if (note.endsWith("Met earlier in this lesson.")) {
          expect(taught[term.toLowerCase()], term).toBe("this lesson");
          // the lesson's steps teach the term, in a bold definition or an introduced term
          const teaching = JSON.stringify(
            item.steps.map((step) => [step.lead, step.afterFigure, step.introducesTerms]),
          );
          expect(
            teaching.toLowerCase().includes(term.toLowerCase().replace(/^variants/u, "variant")),
            `${item.id} teaches ${term}`,
          ).toBe(true);
          continue;
        }
        const inBiology = /Met in '([^']+)' in Biology: Cells to Ecosystems\.$/u.exec(note);
        if (inBiology) {
          const target = biology.lessons.find((entry) => entry.title === inBiology[1]);
          expect(target, `${item.id}: ${term} points at ${inBiology[1]}`).toBeTruthy();
          expect(taught[term.toLowerCase()], term).toBe(
            `${inBiology[1]} in Biology: Cells to Ecosystems`,
          );
          expect(JSON.stringify(target).toLowerCase(), `Biology teaches ${term}`).toContain(
            term.toLowerCase(),
          );
          continue;
        }
        const where = /Met in '([^']+)'\.$/u.exec(note)?.[1];
        expect(where, `${item.id}: ${term}`).toBeTruthy();
        const target = titles.get(where as string);
        expect(target, `${item.id}: ${term} points at ${where}`).toBeTruthy();
        expect(where, term).toBe(taught[term.toLowerCase()]);
        expect(
          bundle.lessons.indexOf(target as (typeof bundle.lessons)[number]),
          `${item.id}: ${term}`,
        ).toBeLessThan(bundle.lessons.indexOf(item));
        expect(JSON.stringify(target).toLowerCase(), `${where} teaches ${term}`).toContain(
          term.toLowerCase().replace(/s$/u, ""),
        );
      }
    }
    expect(hovers).toBe(8);
    // The one lesson the text names outside a hover note is a real one, and the note says which
    expect(titles.has("Reading the genetic code")).toBe(true);
    stated("using the codon table from 'Reading the genetic code'");
  });

  it("gives the invented genes, families and cases of different lessons different names", () => {
    const only = (name: string, lessonId: string) => {
      const found = bundle.lessons
        .filter((item) => {
          const own = [...ownIds(item)].map((id) => JSON.stringify(question(id)));
          return JSON.stringify([item.intro, item.steps, item.recap, own]).includes(name);
        })
        .map((item) => item.id);
      expect(found, name).toEqual([lessonId]);
    };
    only("GRN1", "genes-variants-genome");
    only("HEX2", "switching-genes-on-and-off");
    only("Pedigree A", "reading-pedigrees");
    only("Pedigree G", "reading-pedigrees");
    only("trait X", "traits-with-many-causes");
    only("invented beetle species", "reading-offspring-ratios");
    only("invented rodent species", "reading-offspring-ratios");
    only("invented imprinted gene", "weighing-epigenetic-claims");
    only("invented mouse study", "weighing-epigenetic-claims");
    only("invented patient", "editing-genomes");
  });
});

describe("the genetic code and what a change does to a protein", () => {
  it("reads the standard code from the NCBI table", () => {
    expect(CODE.size).toBe(64);
    const stops = [...CODE].filter(([, name]) => name === "Stop").map(([codon]) => codon);
    expect(stops.sort()).toEqual(["UAA", "UAG", "UGA"]);
    expect(CODE.size - stops.length).toBe(61);
    expect(aa("AUG")).toBe("Met");
    expect(new Set([...CODE.values()]).size).toBe(21);
    stated("61 codons that name amino acids but only 20 amino acids");
    stated("Of the 64 codons, 61 name an amino acid and 3 are stop codons: UAA, UAG and UGA.");
    // No codon names two amino acids, and GAA and GAG both name glutamic acid
    expect([aa("GAA"), aa("GAG")]).toEqual(["Glu", "Glu"]);
    expect(
      labels("gen-reading-the-genetic-code-hook").find((label) =>
        label.startsWith("Several amino"),
      ),
    ).toBeTruthy();
  });

  it("counts how the position of a change decides whether it is silent", () => {
    const sense = [...CODE].filter(([, name]) => name !== "Stop").map(([codon]) => codon);
    const silent = [0, 1, 2].map((position) => {
      let same = 0;
      let total = 0;
      for (const codon of sense)
        for (const base of BASES) {
          const name = changeAt(codon, position, base);
          if (name === null) continue;
          total += 1;
          if (name === aa(codon)) same += 1;
        }
      return { same, total };
    });
    expect(silent[2]?.same).toBe(126);
    expect((silent[2]?.same ?? 0) / (silent[2]?.total ?? 1)).toBeCloseTo(0.69, 2);
    expect(silent[0]?.same).toBe(8);
    expect(silent[1]?.same).toBe(0);
    stated("about 7 in 10 changes at the third base leave the amino acid as it was");
    // In eight of the sixteen boxes all four codons name one amino acid
    const boxes = new Set(sense.map((codon) => codon.slice(0, 2)));
    const whole = [...boxes].filter(
      (box) => new Set(BASES.map((base) => aa(box + base))).size === 1,
    );
    expect(whole).toHaveLength(8);
    expect(whole.map((box) => aa(`${box}U`)).sort()).toEqual(
      ["Ala", "Arg", "Gly", "Leu", "Pro", "Ser", "Thr", "Val"].sort(),
    );
    stated("In eight of the sixteen boxes of the table");
  });

  it("translates the worked mRNA, the faded one and the one read a base later", () => {
    const worked = "AUGCGUGCCAAUUGACAG";
    expect(codonsOf(worked)).toEqual(["AUG", "CGU", "GCC", "AAU", "UGA", "CAG"]);
    expect(readFrom(worked, 0)).toEqual({
      chain: ["Met", "Arg", "Ala", "Asn"],
      stop: "UGA",
      rest: "CAG",
    });
    stated("which is 4 amino acids long");
    const faded = "CGAUGCCUUGGAGUAAUCGAUAG";
    const result = fromFirstAug(faded);
    expect(result.start).toBe(2);
    expect(result.chain).toEqual(["Met", "Pro", "Trp", "Ser", "Asn", "Arg"]);
    expect(result.stop).toBe("UAG");
    stated("The chain is 6 amino acids long");
    // The wrong options of the blank: from the first base, and from the second base
    expect(names(faded, 0).slice(0, 7)).toEqual(["Arg", "Cys", "Leu", "Gly", "Val", "Ile", "Asp"]);
    expect(readFrom(faded, 1)).toMatchObject({
      chain: ["Asp", "Ala", "Leu", "Glu"],
      stop: "UAA",
    });
    expect(labels("gen-reading-the-genetic-code-blank-chain")).toEqual([
      "Arg-Cys-Leu-Gly-Val-Ile-Asp, read from the first base",
      "Asp-Ala-Leu-Glu, ending at UAA, read from the second base",
      "Met-Pro-Trp-Ser-Asn-Arg, ending before the stop codon",
      "Met-Pro-Trp-Ser-Asn-Arg-Stop, with the stop as the last item",
    ]);
    // UAA appears in the sequence but straddles two codons of the frame, and so does UGA at the
    // end of the next codon pair
    expect(codonsOf(faded, 2)).not.toContain("UAA");
    expect(faded.includes("UAA")).toBe(true);
    // Read a base later
    const short = "AUGGCUAACUGGUAG";
    expect(readFrom(short, 0)).toMatchObject({ chain: ["Met", "Ala", "Asn", "Trp"], stop: "UAG" });
    expect(names(short, 1)).toEqual(["Trp", "Leu", "Thr", "Gly"]);
    expect(names(short, 2).slice(0, 2)).toEqual(["Gly", "Stop"]);
    expect(labels("gen-reading-the-genetic-code-one-base-later")).toEqual([
      "Trp-Leu-Thr-Gly",
      "Ala-Asn-Trp-Stop",
      "Met-Ala-Asn-Trp",
      "Gly-Stop",
    ]);
  });

  it("finds the start of a sequence whose first base is not the start", () => {
    const rna = "UAAGCAUGGGCUACUGAC";
    expect(aa(rna.slice(0, 3))).toBe("Stop");
    const result = fromFirstAug(rna);
    expect(result.start).toBe(5);
    expect(result.chain).toEqual(["Met", "Gly", "Tyr"]);
    expect(result.stop).toBe("UGA");
    // Starting at the second base gives AAG, as the third option says
    expect(rna.slice(1, 4)).toBe("AAG");
  });

  it("translates the invented mRNA of the end check and the three frames of the figure", () => {
    const rna = "GCAUGAAUGACUUCCAAGGUUAGCAUGCC";
    const result = fromFirstAug(rna);
    expect(result.start).toBe(2);
    expect(result.chain).toEqual(["Met", "Asn", "Asp", "Phe", "Gln", "Gly"]);
    expect(result.stop).toBe("UAG");
    expect(names(result.rest.padEnd(6, "N").slice(0, 6).replace(/N/gu, "")).join("-")).toBe(
      "His-Ala",
    );
    // The distractors: from the first base the second codon is UGA, and a UGA straddles the AUG
    expect(names(rna, 0).slice(0, 2)).toEqual(["Ala", "Stop"]);
    expect(rna.indexOf("UGA")).toBe(3);
    expect(codonsOf(rna, 2)).not.toContain("UGA");
    const right = labels("gen-reading-the-genetic-code-end-chain").find((label) =>
      label.startsWith("Met-Asn-Asp-Phe-Gln-Gly,"),
    );
    expect(right).toBeTruthy();
    expect(question("gen-reading-the-genetic-code-end-chain").answerAuthority).toMatchObject({
      acceptedIdeas: [right],
    });
    // The figure's three frames
    const frames = "AUGAAAUGGCAUUAAGGG";
    expect(names(frames, 0)).toEqual(["Met", "Lys", "Trp", "His", "Stop", "Gly"]);
    expect(names(frames, 1)).toEqual(["Stop", "Asn", "Gly", "Ile", "Lys"]);
    expect(names(frames, 2)).toEqual(["Glu", "Met", "Ala", "Leu", "Arg"]);
    const figure = lesson("reading-the-genetic-code").steps.find(
      (step) => step.id === "start-stop-and-frame",
    )?.diagram as { alt: string };
    expect(figure.alt).toContain("the codons give Met, Lys, Trp, His and then a stop");
    expect(figure.alt).toContain("the codons give Glu, Met, Ala, Leu and Arg");
    // CAU is His: the lookup of the lesson
    expect(aa("CAU")).toBe("His");
    stated("which gives His");
  });

  it("recomputes the single-base questions of the code lesson", () => {
    // GGU is glycine: only a change at the third base to A, C or G keeps it
    const silentGlycine = BASES.flatMap((base) =>
      [0, 1, 2].filter((at) => changeAt("GGU", at, base) === "Gly").map((at) => `${at}${base}`),
    );
    expect(silentGlycine.sort()).toEqual(["2A", "2C", "2G"]);
    expect([aa("GAU"), aa("AGU"), aa("UGU"), aa("GGA")]).toEqual(["Asp", "Ser", "Cys", "Gly"]);
    // AUU, AUC, AUA are Ile and AUG is Met; CAU, CAC are His and CAA, CAG are Gln
    expect(["AUU", "AUC", "AUA"].map(aa)).toEqual(["Ile", "Ile", "Ile"]);
    expect(aa("AUG")).toBe("Met");
    expect(["CAU", "CAC"].map(aa)).toEqual(["His", "His"]);
    expect(["CAA", "CAG"].map(aa)).toEqual(["Gln", "Gln"]);
  });

  it("classifies the substitutions, deletions and insertions of the mutation lesson", () => {
    const original = "AUGGCUAAGCUU";
    expect(names(original)).toEqual(["Met", "Ala", "Lys", "Leu"]);
    expect(classify(original, "AUGGCUAAGCUC")).toBe("silent");
    expect(names("AUGGCUGAGCUU")).toEqual(["Met", "Ala", "Glu", "Leu"]);
    expect(classify(original, "AUGGCUGAGCUU")).toBe("missense");
    expect(names("AUGGCUUAGCUU")).toEqual(["Met", "Ala", "Stop", "Leu"]);
    expect(classify(original, "AUGGCUUAGCUU")).toBe("nonsense");
    // One base deleted at position 4, one C inserted after AUG, one codon deleted
    expect(names("AUGCUAAGCUU".slice(0, 9))).toEqual(["Met", "Leu", "Ser"]);
    expect(names("AUGCGCUAAGCUU".slice(0, 12))).toEqual(["Met", "Arg", "Stop", "Ala"]);
    expect(names("AUGAAGCUU")).toEqual(["Met", "Lys", "Leu"]);
    // The six changes of the sort question
    const mrna = "AUGGAGGUGCAC";
    expect(names(mrna)).toEqual(["Met", "Glu", "Val", "His"]);
    const changes: Record<string, string> = {
      "GAG changes to GAA": "AUGGAAGUGCAC",
      "GAG changes to GAC": "AUGGACGUGCAC",
      "GAG changes to UAG": "AUGUAGGUGCAC",
      "The fourth base, the first G of GAG, is deleted": "AUGAGGUGCAC",
      "Two bases, CC, are inserted after AUG": "AUGCCGAGGUGCAC",
      "CAC changes to CAU": "AUGGAGGUGCAU",
    };
    const sort = question("gen-what-a-mutation-does-sort-six-changes").sort;
    for (const item of sort?.items ?? [])
      expect(classify(mrna, changes[item.label] as string), item.label).toBe(
        item.bin === "frameshift" ? "frameshift" : item.bin,
      );
    expect(names("AUGAGGUGCAC".slice(0, 9))).toEqual(["Met", "Arg", "Cys"]);
    expect(names("AUGCCGAGGUGCAC".slice(0, 12))).toEqual(["Met", "Pro", "Arg", "Cys"]);
    // Sickle cell: Glu6Val by a change of the middle base, and haemoglobin C: Glu6Lys by one change
    for (const codon of ["GAA", "GAG"]) expect(changeAt(codon, 1, "U")).toBe("Val");
    expect(
      [0, 1, 2].flatMap((at) => BASES.filter((base) => changeAt("GAA", at, base) === "Lys")),
    ).toEqual(["A"]);
    expect(changeAt("GAA", 0, "A")).toBe("Lys");
    expect(changeAt("GAA", 2, "G")).toBe("Glu");
    expect(changeAt("GAA", 1, "U")).toBe("Val");
    expect(aa("UAA")).toBe("Stop");
    // A deletion keeps the frame when its length is a multiple of three
    expect([12 % 3, 14 % 3]).toEqual([0, 2]);
  });

  it("works out the share of normal dimers and the effect of a null allele", () => {
    // Half the subunits are mutant and pair at random: a dimer is normal only if both are normal
    expect(0.5 * 0.5).toBe(0.25);
    // A null allele makes no subunits, so half the normal output remains
    expect(0.5).toBeGreaterThan(0.25);
    expect(
      question("gen-what-a-mutation-does-poisoned-dimers").choices?.[
        rightIndex(question("gen-what-a-mutation-does-poisoned-dimers"))
      ]?.label,
    ).toMatch(/^Fewer than half/u);
    stated("Only a quarter of the dimers work");
    stated("only one dimer in four stays normal in a heterozygote");
  });
});

describe("the lac operon", () => {
  type Copy = { i: "+" | "-" | "s"; o: "+" | "c"; z: "+" | "-" };
  const parse = (text: string): Copy[] =>
    [...text.matchAll(/\$I\^([+\-s]) O\^([+c]) Z\^([+-])\$/gu)].map((match) => ({
      i: match[1] as Copy["i"],
      o: match[2] as Copy["o"],
      z: match[3] as Copy["z"],
    }));
  /** The repressor the cell makes decides every operator in it, because it diffuses. */
  const makesEnzyme = (copies: Copy[], lactose: boolean) => {
    const repressor = copies.some((copy) => copy.i === "s")
      ? "locked"
      : copies.some((copy) => copy.i === "+")
        ? "working"
        : "none";
    const free = (copy: Copy) =>
      copy.o === "c" || repressor === "none" || (repressor === "working" && lactose);
    return copies.some((copy) => copy.z === "+" && free(copy));
  };
  const level = (lactose: boolean, glucose: boolean) =>
    !lactose ? "off" : glucose ? "moderate" : "high";

  it("sets the level of expression for each pair of sugars", () => {
    expect([
      level(true, true),
      level(true, false),
      level(false, true),
      level(false, false),
    ]).toEqual(["moderate", "high", "off", "off"]);
    expect(question("gen-switching-genes-on-and-off-neither-sugar").answerAuthority).toMatchObject({
      acceptedIdeas: ["Off, because without lactose the repressor stays on the operator"],
    });
  });

  it("reads each partial diploid of the lesson copy by copy", () => {
    // The worked example: I+ O^c Z- with I+ O+ Z+, no lactose
    const worked = parse(question("gen-switching-genes-on-and-off-why-oc-stays-in-cis").prompt);
    expect(worked).toEqual([
      { i: "+", o: "c", z: "-" },
      { i: "+", o: "+", z: "+" },
    ]);
    expect(makesEnzyme(worked, false)).toBe(false);
    // The faded example: I- O+ Z+ with I+ O+ Z-, no lactose, and with lactose
    const faded = parse(question("gen-switching-genes-on-and-off-blank-enzyme").prompt);
    expect(faded).toEqual([
      { i: "-", o: "+", z: "+" },
      { i: "+", o: "+", z: "-" },
    ]);
    expect(makesEnzyme(faded, false)).toBe(false);
    expect(makesEnzyme(faded, true)).toBe(true);
    // I- is recessive to I+ because the working repressor reaches both operators
    expect(makesEnzyme([{ i: "-", o: "+", z: "+" }], false)).toBe(true);
    // The end check: O^c in front of Z+ on one copy and a defective Z on the other
    const end = parse(question("gen-switching-genes-on-and-off-end-oc-with-z-plus").prompt);
    expect(end).toEqual([
      { i: "+", o: "c", z: "+" },
      { i: "+", o: "+", z: "-" },
    ]);
    expect(makesEnzyme(end, false)).toBe(true);
    expect(
      question("gen-switching-genes-on-and-off-end-oc-with-z-plus").answerAuthority,
    ).toMatchObject({
      acceptedIdeas: [expect.stringMatching(/^Yes, because the \$O\^c\$ operator/u)],
    });
    // A strain that is never switched on has a repressor that cannot bind lactose, and the
    // operator and no-repressor mutants are constitutive
    expect(makesEnzyme([{ i: "s", o: "+", z: "+" }], true)).toBe(false);
    expect(makesEnzyme([{ i: "-", o: "+", z: "+" }], false)).toBe(true);
    expect(makesEnzyme([{ i: "+", o: "c", z: "+" }], false)).toBe(true);
    // I^s over I+ over I-
    expect(
      makesEnzyme(
        [
          { i: "s", o: "+", z: "+" },
          { i: "+", o: "+", z: "+" },
        ],
        true,
      ),
    ).toBe(false);
    expect(
      makesEnzyme(
        [
          { i: "-", o: "+", z: "+" },
          { i: "+", o: "+", z: "+" },
        ],
        false,
      ),
    ).toBe(false);
  });

  it("sorts the cis and trans changes by what the part is", () => {
    const sort = question("gen-switching-genes-on-and-off-end-cis-or-trans").sort;
    const sites = /CAP-binding site|promoter|enhancers? of a gene/u;
    for (const item of sort?.items ?? [])
      expect(item.bin, item.label).toBe(
        sites.test(item.label) && !/gene for|CAP gene|lacI/u.test(item.label) ? "cis" : "trans",
      );
  });
});

describe("offspring counts and ratios", () => {
  const expected = (total: number, parts: number[]) =>
    parts.map((part) => (total * part) / sum(parts));
  const gaps = (observed: number[], wanted: number[]) =>
    observed.map((count, at) => Math.abs(count - (wanted[at] as number)));

  it("derives the 9:3:3:1 ratio and the modified ratios from it", () => {
    const classes = [(3 / 4) * (3 / 4), (3 / 4) * (1 / 4), (1 / 4) * (3 / 4), (1 / 4) * (1 / 4)];
    expect(classes.map((value) => value * 16)).toEqual([9, 3, 3, 1]);
    // Each modified ratio is a sum of classes of 9:3:3:1
    expect([9, 3 + 3 + 1]).toEqual([9, 7]);
    expect([9 + 3 + 3, 1]).toEqual([15, 1]);
    expect([9 + 3, 3, 1]).toEqual([12, 3, 1]);
    expect([9, 3, 3 + 1]).toEqual([9, 3, 4]);
    inPack(
      "oog-crosses-and-ratios.txt",
      /differs from 9:3:3:1, such as 9:3:4, 12:3:1, 9:7, or 15:1/u,
    );
  });

  it("reads the test cross of the opening and the incomplete dominance of the beetles", () => {
    // 22 purple and 28 white of 50 against 25 and 25 for Aa by aa; AA by aa would give no white
    expect(22 + 28).toBe(50);
    expect(expected(50, [1, 1])).toEqual([25, 25]);
    // Two heterozygotes give 1:2:1, and half of 400 beetles are grey
    close("gen-reading-offspring-ratios-grey-beetles", expected(400, [1, 2, 1])[1] as number);
    expect(wrongValues("gen-reading-offspring-ratios-grey-beetles")).toEqual([
      (400 * 3) / 4,
      400 / 4,
    ]);
  });

  it("works out the Labrador, squash and plant cases", () => {
    // Labrador pups: 9:3:4 for 160, against 88, 33 and 39
    const lab = expected(160, [9, 3, 4]);
    expect(lab).toEqual([90, 30, 40]);
    expect(gaps([88, 33, 39], lab)).toEqual([2, 3, 1]);
    expect(88 + 33 + 39).toBe(160);
    // Squash: 12:3:1 for 160, against 121, 29 and 10; 9:3:4 would be far off
    const squash = expected(160, [12, 3, 1]);
    expect(squash).toEqual([120, 30, 10]);
    expect(gaps([121, 29, 10], squash)).toEqual([1, 1, 0]);
    expect(121 + 29 + 10).toBe(160);
    expect(Math.abs(121 - (lab[0] as number))).toBeGreaterThan(30);
    close("gen-reading-offspring-ratios-blank-expected-white", squash[0] as number);
    expect(wrongValues("gen-reading-offspring-ratios-blank-expected-white")).toEqual([lab[0], 160]);
    // The end check: 640 plants, a flower purple only with a dominant allele at both loci
    expect(358 + 282).toBe(640);
    const fits = {
      "9:7": expected(640, [9, 7]),
      "15:1": expected(640, [15, 1]),
      "3:1": expected(640, [3, 1]),
    };
    expect(fits["9:7"]).toEqual([360, 280]);
    expect(fits["15:1"]).toEqual([600, 40]);
    expect(fits["3:1"]).toEqual([480, 160]);
    expect(gaps([358, 282], fits["9:7"])).toEqual([2, 2]);
    expect(expected(640, [9, 3, 4])).toEqual([360, 120, 160]);
    expect(labels("gen-reading-offspring-ratios-end-new-plant-counts")[1]).toMatch(/^9:7/u);
    // The four classes of the transfer question
    const four = expected(320, [9, 3, 3, 1]);
    expect(four).toEqual([180, 60, 60, 20]);
    expect(183 + 58 + 62 + 17).toBe(320);
    expect(gaps([183, 58, 62, 17], four)).toEqual([3, 2, 2, 3]);
  });

  /** One gene on a sex chromosome: the parent with two copies passes one, the other passes a copy or the Y or W. */
  const sexLinked = (
    system: "XY" | "ZW",
    twoCopies: [string, string],
    oneCopy: string,
    dominant: string,
  ) => {
    const out: { sex: "son" | "daughter"; trait: string }[] = [];
    for (const given of twoCopies) {
      // From the parent's sex chromosome that carries the gene, the child has two copies
      const both = [given, oneCopy];
      const sexOfBoth = system === "XY" ? "daughter" : "son";
      out.push({ sex: sexOfBoth, trait: both.includes(dominant) ? dominant : oneCopy });
      // From the other sex chromosome, the child has one copy and is hemizygous
      out.push({ sex: sexOfBoth === "son" ? "daughter" : "son", trait: given });
    }
    return out;
  };
  const summary = (list: { sex: string; trait: string }[]) =>
    ["son", "daughter"].map((sex) => [
      ...new Set(list.filter((item) => item.sex === sex).map((item) => item.trait)),
    ]);

  it("separates a sex-linked gene from an autosomal one by reciprocal crosses", () => {
    // Fruit fly eyes: w+ is red and dominant. Red female by white male, then white female by red male
    const first = sexLinked("XY", ["w+", "w+"], "w-", "w+");
    const second = sexLinked("XY", ["w-", "w-"], "w+", "w+");
    expect(summary(first)).toEqual([["w+"], ["w+"]]);
    expect(summary(second)).toEqual([["w-"], ["w+"]]);
    stated("In the first cross every offspring has red eyes.");
    // The rodent: both crosses give only long tails in both sexes, which an X-linked gene would not do
    const longFemale = summary(sexLinked("XY", ["L", "L"], "s", "L"));
    const shortFemale = summary(sexLinked("XY", ["s", "s"], "L", "L"));
    expect(longFemale).toEqual([["L"], ["L"]]);
    expect(shortFemale).not.toEqual(longFemale);
    // Turkeys, ZW females and ZZ males: bronze E is dominant over brown e
    const brownMale = summary(sexLinked("ZW", ["e", "e"], "E", "E"));
    const bronzeMale = summary(sexLinked("ZW", ["E", "E"], "e", "E"));
    expect(brownMale).toEqual([["E"], ["e"]]);
    expect(bronzeMale).toEqual([["E"], ["E"]]);
    expect(labels("gen-reading-offspring-ratios-end-turkeys")[1]).toMatch(
      /^The gene lies on the Z chromosome/u,
    );
    inPack(
      "oog-crosses-and-ratios.txt",
      /The E allele makes the feathers bronze and the e allele makes the feathers brown/u,
    );
  });

  it("gives type O to two heterozygous parents of types A and B", () => {
    const gametes = (genotype: string[]) => genotype;
    const children = gametes(["IA", "i"]).flatMap((mother) =>
      gametes(["IB", "i"]).map((father) => [mother, father].sort().join("")),
    );
    expect(children.sort()).toEqual(["IAIB", "IAi", "IBi", "ii"].sort());
    expect(children).toContain("ii");
  });
});

describe("recombination and the map", () => {
  const frequency = (recombinants: number[], total: number) => (100 * sum(recombinants)) / total;

  it("works out the mouse cross and the worked, faded and end-check test crosses", () => {
    // Mice: aaBB by AAbb gives a dihybrid carrying aB and Ab; the parental classes are 48 and 42
    expect(48 + 42 + 13 + 17).toBe(120);
    expect(frequency([13, 17], 120)).toBe(25);
    inPack(
      "oog-linkage.txt",
      /short \| brown \| 48 .{0,40}long \| white \| 42 .{0,40}short \| white \| 13 .{0,40}long \| brown \| 17/u,
    );
    // The hook asks what independent assortment predicts, 30 of each in 120
    expect(120 / 4).toBe(30);
    // The worked cross, in coupling: AaBb and aabb are parental
    expect(38 + 44 + 9 + 9).toBe(100);
    expect(frequency([9, 9], 100)).toBe(18);
    // The faded cross, in repulsion: Aabb and aaBb are parental, so AaBb and aabb are recombinant
    expect(87 + 83 + 16 + 14).toBe(200);
    expect(frequency([16, 14], 200)).toBe(15);
    close("gen-linked-genes-faded-rf", 15);
    expect(wrongValues("gen-linked-genes-faded-rf")).toEqual([100 - 15, 30]);
    // The end check: TTrr by ttRR gives Tr and tR, so tall red and short white are recombinant
    expect(247 + 213 + 22 + 18).toBe(500);
    expect(frequency([22, 18], 500)).toBe(8);
    close("gen-linked-genes-check-rf", 8);
    expect(wrongValues("gen-linked-genes-check-rf")).toEqual([(100 * 460) / 500, (100 * 22) / 500]);
    // Independent assortment of 200 offspring over four classes
    close("gen-linked-genes-hook", 200 / 4);
    expect(wrongValues("gen-linked-genes-hook")).toEqual([200 / 2, 25]);
    expect(
      lesson("linked-genes")
        .flashcardIds.map((id) => bundle.flashcards.find((card) => card.id === id))
        .find((card) => card?.id === "gen-linked-genes-card-calc")?.answerAuthority,
    ).toMatchObject({ value: 14 });
    expect((100 * 84) / 600).toBe(14);
  });

  it("finds the arrangement that makes a result impossible", () => {
    // AaBb 412, aabb 388, Aabb 98, aaBb 102 in a test cross
    const counts = { AaBb: 412, aabb: 388, Aabb: 98, aaBb: 102 };
    expect(sum(Object.values(counts))).toBe(1000);
    // A dihybrid that carried AB and ab: the recombinants are Aabb and aaBb
    expect(frequency([counts.Aabb, counts.aaBb], 1000)).toBe(20);
    // One that carried Ab and aB: the recombinants are AaBb and aabb, and 80 percent is above the ceiling
    expect(frequency([counts.AaBb, counts.aabb], 1000)).toBe(80);
    expect(80).toBeGreaterThan(50);
    expect(labels("gen-linked-genes-arrangement-trap")[2]).toMatch(/^80 percent/u);
    // 249 of 500 recombinant is nearly 50 percent
    expect(frequency([249], 500)).toBeCloseTo(49.8, 5);
  });

  it("orders the genes of a map from the distances between them", () => {
    // P, Q and R: the longest distance is the sum of the other two
    const pqr = { "P-Q": 6, "Q-R": 9, "P-R": 15 };
    expect(pqr["P-Q"] + pqr["Q-R"]).toBe(pqr["P-R"]);
    // X, Y and Z: Z lies between because 5 + 4 = 9
    const xyz = { "X-Y": 9, "X-Z": 5, "Z-Y": 4 };
    expect(xyz["X-Z"] + xyz["Z-Y"]).toBe(xyz["X-Y"]);
    expect(Math.max(...Object.values(xyz))).toBe(xyz["X-Y"]);
    // The end check: positions 0, 8, 13 and 22 reproduce all six distances
    const place: Record<string, number> = { W: 0, X: 8, Y: 13, Z: 22 };
    const distance = (a: string, b: string) =>
      Math.abs((place[a] as number) - (place[b] as number));
    expect([
      distance("W", "X"),
      distance("X", "Y"),
      distance("W", "Y"),
      distance("Y", "Z"),
      distance("X", "Z"),
      distance("W", "Z"),
    ]).toEqual([8, 5, 13, 9, 14, 22]);
    expect(8 + 5 + 9).toBe(22);
    expect(question("gen-linked-genes-check-order").order?.items).toEqual(["W", "X", "Y", "Z"]);
    // Two short distances add to more than the long one measured directly
    expect(12 + 14).toBe(26);
    expect(24).toBeLessThan(26);
    inPack(
      "oog-linkage.txt",
      /1\.0 cM corresponds to approximately 150,000bp and contains approximately 50 genes/u,
    );
    inPack(
      "oog-linkage.txt",
      /Some chromosomes are >100 cM long but loci at the tips only have an RF of 50%/u,
    );
  });
});

describe("pedigrees and carrier chances", () => {
  // The four equally likely boxes of two carriers
  const boxes = ["AA", "Aa", "Aa", "aa"];
  const carrierGivenUnaffected =
    boxes.filter((box) => box !== "aa").filter((box) => box === "Aa").length / 3;

  it("works out the chance for one child, for an unaffected child and for two siblings", () => {
    expect(boxes.filter((box) => box === "aa").length / 4).toBe(0.25);
    expect(carrierGivenUnaffected).toBeCloseTo(2 / 3, 10);
    close("gen-reading-pedigrees-hook", 0.25);
    expect(wrongValues("gen-reading-pedigrees-hook")).toEqual([0.5, 0.75]);
    close("gen-reading-pedigrees-both-carriers", (2 / 3) * (2 / 3));
    expect((2 / 3) * (2 / 3)).toBeCloseTo(4 / 9, 10);
    close("gen-reading-pedigrees-faded-carrier", 2 / 3);
    close("gen-reading-pedigrees-faded-daughter", (2 / 3) * (1 / 2));
    expect(wrongValues("gen-reading-pedigrees-faded-daughter")).toEqual([0.5, 2 / 3]);
    expect(
      bundle.flashcards.find((card) => card.id === "gen-reading-pedigrees-card-two-thirds")
        ?.answerAuthority,
    ).toMatchObject({ value: 2 / 3 });
  });

  it("chains the chances through the cystic fibrosis family and the invented one", () => {
    // II-3: 2/3, her partner 1/25, then 1/4: one in 150, against 1 in 2,500 for the population
    const chain = (2 / 3) * (1 / 25) * (1 / 4);
    expect(1 / chain).toBeCloseTo(150, 8);
    expect(2500 / 150).toBeCloseTo(16.67, 2);
    stated("so a sibling with the condition raises it about seventeen-fold");
    inPack(
      "oog-mutation-and-regulation.txt",
      /Cystic fibrosis is the most common \(1\/2,500\).{0,160}1 in 25 people being carriers/u,
    );
    // The end check: 2/3, 1/40 and 1/4 give 1 in 240; leaving out a chance gives the wrong values
    const answer = 1 / ((2 / 3) * (1 / 40) * (1 / 4));
    expect(answer).toBeCloseTo(240, 8);
    close("gen-reading-pedigrees-check-chain", answer);
    expect(wrongValues("gen-reading-pedigrees-check-chain")).toEqual([
      1 / ((1 / 40) * (1 / 4)),
      1 / ((2 / 3) * (1 / 40)),
      1 / ((1 / 2) * (1 / 40) * (1 / 4)),
    ]);
    // The next pregnancy has the chance of the first, and two in a row is 1 in 16
    expect(1 / 4).toBe(0.25);
    expect(1 / 4 / 4).toBe(1 / 16);
  });

  it("rules modes of inheritance in and out from the features each leaves", () => {
    type Mode = "AD" | "AR" | "XLD" | "XLR";
    // Pedigree A: two unaffected parents with an affected daughter
    const ruledOut = (
      affectedParents: number,
      affectedChildSex: "F" | "M",
      fatherAffected: boolean,
    ) => {
      const out: Mode[] = [];
      if (affectedParents === 0) out.push("AD", "XLD");
      if (affectedChildSex === "F" && !fatherAffected) out.push("XLR");
      return out;
    };
    expect(ruledOut(0, "F", false).sort()).toEqual(["AD", "XLD", "XLR"]);
    // A father with an affected son rules out X-linked dominant, and in the invented family
    // every affected person has an affected parent
    expect(question("gen-reading-pedigrees-check-mode").answerAuthority).toMatchObject({
      acceptedIdeas: ["Autosomal dominant, since each affected person has an affected parent"],
    });
    // The man with an X-linked recessive condition: every daughter is a carrier, no son is affected
    const daughters = ["X*", "X*"].every((allele) => allele === "X*");
    expect(daughters).toBe(true);
    // A carrier woman and an unaffected man: half the sons, none of the daughters
    const children = ["X*", "X"].flatMap((mother) => [`${mother}X`, `${mother}Y`]);
    const sons = children.filter((child) => child.endsWith("Y"));
    const girls = children.filter((child) => child.endsWith("X"));
    expect(sons.filter((child) => child.startsWith("X*")).length / sons.length).toBe(0.5);
    expect(girls.filter((child) => child.startsWith("X*X*")).length).toBe(0);
    // An affected dominant parent: both children escape with chance 1/2 times 1/2
    expect((1 / 2) * (1 / 2)).toBe(0.25);
    stated("both do with probability 1/2 × 1/2 = 1/4");
    inPack(
      "oog-pedigrees-and-populations.txt",
      /approximately 5-10% of cases are inherited in an AD pattern/u,
    );
  });
});

describe("penetrance and heritability", () => {
  it("counts the carriers who show the trait", () => {
    expect(5 / 8).toBe(0.625);
    expect(8 - 5).toBe(3);
    expect(labels("gen-traits-with-many-causes-hook")[2]).toMatch(
      /five of the eight do and three do not/u,
    );
    stated("penetrance of 5 out of 8");
    // The sort cases: 9 of 12 and 3 of 10 are shares of carriers, and 0.6 is a heritability
    expect([9 / 12, 3 / 10]).toEqual([0.75, 0.3]);
    // The shift of the dot strip is the same for everyone, so the spread does not change
    const values = [10, 20, 30, 40, 50];
    const shifted = values.map((value) => value + 20);
    const spread = (list: number[]) => Math.max(...list) - Math.min(...list);
    expect(spread(shifted)).toBe(spread(values));
    expect(sum(shifted) / shifted.length - sum(values) / values.length).toBe(20);
  });
});

describe("Hardy-Weinberg proportions", () => {
  const p2 = (q: number) => (1 - q) * (1 - q);
  const het = (q: number) => 2 * (1 - q) * q;

  it("counts alleles from genotypes", () => {
    // 320 AA, 160 Aa and 20 aa among 500 people
    expect(320 + 160 + 20).toBe(500);
    expect((2 * 320 + 160) / 1000).toBe(0.8);
    expect((2 * 20 + 160) / 1000).toBe(0.2);
    inPack("oog-pedigrees-and-populations.txt", /AA \| 320 .{0,30}Aa \| 160 .{0,30}aa \| 20/u);
    // The proportions for p = 0.8 give back the counts exactly
    expect(
      [p2(0.2), het(0.2), 0.2 * 0.2].map((share) => Math.round(share * 500 * 1e9) / 1e9),
    ).toEqual([320, 160, 20]);
    // The new sample: 200 AA, 80 Aa, 40 aa
    const copiesOfA = 2 * 200 + 80;
    close("gen-hardy-weinberg-null-model-count-p", copiesOfA / (2 * 320));
    expect(wrongValues("gen-hardy-weinberg-null-model-count-p")).toEqual([200 / 320, 280 / 320]);
    // Expected counts of that sample for p = 0.75: 180, 120 and 20, and the heterozygotes are 40 short
    const wanted = [p2(0.25) * 320, het(0.25) * 320, 0.25 * 0.25 * 320];
    expect(wanted.map((count) => Math.round(count))).toEqual([180, 120, 20]);
    expect(120 - 80).toBe(40);
    // The card: 100 AA, 60 Aa, 40 aa
    expect((2 * 100 + 60) / 400).toBe(0.65);
    expect(
      bundle.flashcards.find((card) => card.id === "gen-hardy-weinberg-null-model-card-count")
        ?.answerAuthority,
    ).toMatchObject({ value: 0.65 });
    // Half the copies are A: the child is Aa in 2 of the 4 pairings
    close("gen-hardy-weinberg-null-model-hook", 2 * 0.5 * 0.5);
  });

  it("shows the dominant trait in p squared plus 2pq, which is 1 minus q squared", () => {
    expect(p2(0.3) + het(0.3)).toBeCloseTo(0.91, 10);
    expect(1 - 0.3 * 0.3).toBeCloseTo(0.91, 10);
    close("gen-hardy-weinberg-null-model-dominant-share", 0.91);
    expect(wrongValues("gen-hardy-weinberg-null-model-dominant-share")).toEqual([0.49, 0.7, 0.42]);
    expect(p2(0.3)).toBeCloseTo(0.49, 10);
    expect(het(0.3)).toBeCloseTo(0.42, 10);
  });

  it("works from the incidence of a recessive condition to the carriers", () => {
    // Cystic fibrosis, 1 in 2,500: q = 0.02, 2pq = 0.0392, about 1 in 25.5
    const q = Math.sqrt(1 / 2500);
    expect(q).toBeCloseTo(0.02, 10);
    expect(het(q)).toBeCloseTo(0.0392, 10);
    expect(1 / het(q)).toBeCloseTo(25.5, 1);
    // The figure for q = 0.02 out of 10,000 people: 9,604, 392 and 4
    expect([p2(0.02), het(0.02), 0.02 * 0.02].map((share) => Math.round(share * 10000))).toEqual([
      9604, 392, 4,
    ]);
    // Carriers outnumber the affected by about a hundred to one
    expect(het(q) / (1 / 2500)).toBeCloseTo(98, 0);
    inPack(
      "wp-population-genetics.txt",
      /one in 25 persons of European descent is a carrier of the disease, and one in 2500 to 3000 children born is affected/u,
    );
    // 1 in 10,000: q = 0.01, carriers 1 in 50.5
    const faded = Math.sqrt(1 / 10000);
    close("gen-hardy-weinberg-null-model-faded-q", faded);
    close("gen-hardy-weinberg-null-model-faded-carriers", 1 / het(faded));
    expect(1 / het(faded)).toBeCloseTo(50.5, 1);
    expect(wrongValues("gen-hardy-weinberg-null-model-faded-q")).toEqual([1 / 10000, 0.001]);
    expect(wrongValues("gen-hardy-weinberg-null-model-faded-carriers")).toEqual([1 / faded, 10000]);
    // 1 in 40,000: q = 0.005 and carriers 1 in 100.5
    const end = Math.sqrt(1 / 40000);
    expect(end).toBeCloseTo(0.005, 10);
    close("gen-hardy-weinberg-null-model-check-carriers", 1 / het(end));
    expect(wrongValues("gen-hardy-weinberg-null-model-check-carriers")).toEqual([1 / end, 40000]);
  });

  it("reads the X chromosome and the pooled villages", () => {
    // Red-green colour blindness: 1 in 12 men gives q = 0.083 and q squared = 0.007, 1 in 200 observed
    expect(1 / 12).toBeCloseTo(0.083, 3);
    expect((1 / 12) ** 2).toBeCloseTo(0.007, 3);
    expect(1 / 200).toBe(0.005);
    inPack(
      "wp-population-genetics.txt",
      /about 1 in 12, \(q = 0\.083\) whereas it affects about 1 in 200 females \(0\.005, compared to q2 = 0\.007\)/u,
    );
    // 1 in 20 men: women at 1 in 400
    close("gen-hardy-weinberg-null-model-x-linked-women", 1 / (1 / 20) ** 2);
    expect(wrongValues("gen-hardy-weinberg-null-model-x-linked-women")).toEqual([20, 40]);
    // Two villages in equilibrium, pooled in equal numbers
    const village = (p: number) => [p * p, 2 * p * (1 - p), (1 - p) * (1 - p)];
    const pooled = village(0.9).map((share, at) => (share + (village(0.5)[at] as number)) / 2);
    expect(pooled.map((share) => Math.round(share * 100) / 100)).toEqual([0.53, 0.34, 0.13]);
    const pooledP = (pooled[0] as number) + (pooled[1] as number) / 2;
    expect(pooledP).toBeCloseTo(0.7, 10);
    expect(village(pooledP).map((share) => Math.round(share * 100) / 100)).toEqual([
      0.49, 0.42, 0.09,
    ]);
    expect(0.42 - 0.34).toBeCloseTo(0.08, 10);
    // The deficit question: 126 AA, 96 Aa, 78 aa
    expect(126 + 96 + 78).toBe(300);
    const p = (2 * 126 + 96) / 600;
    expect(p).toBeCloseTo(0.58, 10);
    expect(
      [p * p, 2 * p * (1 - p), (1 - p) * (1 - p)].map((share) => Math.round(share * 300)),
    ).toEqual([101, 146, 53]);
    expect(96).toBeLessThan(146);
  });
});

describe("chance, bottlenecks and founders", () => {
  /** All sequences of n survivors that each carry A or B */
  const combinations = (n: number) =>
    Array.from({ length: 2 ** n }, (_, at) =>
      at.toString(2).padStart(n, "0").replace(/0/gu, "A").replace(/1/gu, "B"),
    );
  const countA = (text: string) => [...text].filter((letter) => letter === "A").length;

  it("counts the combinations of four survivors", () => {
    const four = combinations(4);
    expect(four).toHaveLength(16);
    const byA = [0, 1, 2, 3, 4].map(
      (count) => four.filter((item) => countA(item) === count).length,
    );
    expect(byA).toEqual([1, 4, 6, 4, 1]);
    expect(6 / 16).toBe(0.375);
    expect(10 / 16).toBe(0.625);
    expect(four.filter((item) => new Set(item).size === 1)).toHaveLength(2);
    // The coin tossed four times has the same count, and exactly two heads is not the likeliest outcome overall
    expect(6 / 16).toBeLessThan(10 / 16);
    inPack("wp-population-genetics.txt", /16 possible combinations for the A and B alleles/u);
    expect(
      bundle.flashcards.find((card) => card.id === "gen-drift-and-selection-card-four")?.back,
    ).toContain("Six of the 16 equally likely combinations split 2 to 2 and ten do not");
  });

  it("shows that a group of three loses an allele more often than a group of four, and six less often", () => {
    const loss = (n: number) =>
      combinations(n).filter((item) => new Set(item).size === 1).length / 2 ** n;
    expect([loss(3), loss(4), loss(6)]).toEqual([0.25, 0.125, 1 / 32]);
    expect(loss(3)).toBeGreaterThan(loss(4));
    expect(loss(6)).toBeLessThan(loss(4));
    expect(labels("gen-drift-and-selection-three-survivors")[2]).toMatch(/^More likely/u);
    // Six survivors: three and three is the likeliest single split but the uneven splits outweigh it
    const six = combinations(6);
    const split = [0, 1, 2, 3, 4, 5, 6].map(
      (count) => six.filter((item) => countA(item) === count).length,
    );
    expect(split).toEqual([1, 6, 15, 20, 15, 6, 1]);
    expect(Math.max(...split)).toBe(20);
    expect(64 - 20).toBeGreaterThan(20);
    expect(20 / 64).toBe(0.3125);
    expect(
      question("gen-drift-and-selection-check-six").choices?.[
        rightIndex(question("gen-drift-and-selection-check-six"))
      ]?.label,
    ).toMatch(/^Three and three is the likeliest split/u);
  });

  it("works out the founder example and the figures taken from the pack", () => {
    // 2 of 100 copies against 2 of 40 copies: 2 percent against 5 percent
    expect((2 / 100) * 100).toBe(2);
    expect((2 / 40) * 100).toBe(5);
    expect(20 * 2).toBe(40);
    inPack(
      "wp-population-genetics.txt",
      /about 100 million birds in 1900 to about 50 birds in the 1990s/u,
    );
    inPack("wp-population-genetics.txt", /Amish migration to Pennsylvania in 1744/u);
    inPack("wp-population-genetics.txt", /Approximately one in 10 African Americans is a carrier/u);
  });
});

describe("what a genetic test tells you", () => {
  it("states the BRCA risks as a ratio and as a count", () => {
    inPack(
      "genetic-testing.txt",
      /About 39%–58% of women who inherit a harmful change in BRCA1 and 13%–29% of women who inherit a harmful change in BRCA2 will develop ovarian cancer.{0,120}about 1\.1% of women in the general population/u,
    );
    // Ovarian cancer: 39 to 58 against 1.1, and 13 to 29 for BRCA2
    expect([39 / 1.1, 58 / 1.1].map((ratio) => Math.round(ratio))).toEqual([35, 53]);
    stated("roughly 35 to 53 times as high");
    expect([100 - 58, 100 - 39]).toEqual([42, 61]);
    stated("leave 42 to 61 of every 100 BRCA1 carriers");
    // The figure draws 100 women: 13 dark and 16 light for BRCA2, 39 dark and 19 light for BRCA1
    expect([13 + 16, 39 + 19]).toEqual([29, 58]);
    const figure = lesson("what-a-genetic-test-tells-you").steps.find(
      (step) => step.id === "absolute-and-relative",
    )?.diagram as { alt: string };
    expect(figure.alt).toContain("13 dots are filled darkly and 16 more are lightly filled");
    expect(figure.alt).toContain("39 are filled darkly and 19 more lightly");
    // Pancreatic cancer: 5% to 10% against 1.7%
    inPack(
      "genetic-testing.txt",
      /5%–10% of those with harmful changes in BRCA2 will develop pancreatic cancer.{0,120}about 1\.7% of people in the general population/u,
    );
    const ratios = [5 / 1.7, 10 / 1.7];
    expect(ratios.map((ratio) => Math.round(ratio))).toEqual([3, 6]);
    expect(ratios[0]).toBeGreaterThan(2.5);
    expect(labels("gen-what-a-genetic-test-tells-you-faded-ratio")).toEqual([
      "Roughly 3 to 6 times",
      "About 30 to 60 times",
      "About 1.5 to 3 times",
    ]);
    expect([100 - 10, 100 - 5]).toEqual([90, 95]);
    expect(labels("gen-what-a-genetic-test-tells-you-faded-not-developing")).toEqual([
      "About 5 to 10",
      "About 90 to 95",
      "About 98 to 99",
    ]);
    expect(100 - 1.7).toBeCloseTo(98.3, 10);
    // Men: 0.1 percent in the general population against 1.8 to 7.1 percent of BRCA2 carriers by age 70
    inPack(
      "genetic-testing.txt",
      /1\.8%–7\.1% with an inherited harmful change in BRCA2 will develop breast cancer by age 70.{0,60}about 0\.1% of men in the general population/u,
    );
    expect([1.8 / 0.1, 7.1 / 0.1].map((ratio) => Math.round(ratio))).toEqual([18, 71]);
    expect(7.1).toBeLessThan(10);
    stated("roughly 18 to 71 times the general figure");
  });

  it("takes the other figures of the lesson from the pack", () => {
    inPack("genetic-testing.txt", /a list of 73 genes/u);
    inPack(
      "genetic-testing.txt",
      /can choose to "opt out" of analysis of the 73 secondary finding genes/u,
    );
    inPack("genetic-testing.txt", /exons, are thought to make up 1 percent of a person's genome/u);
    inPack(
      "genetic-testing.txt",
      /Whole exome or whole genome sequencing is often more cost- and time-effective/u,
    );
    inPack(
      "genetic-testing.txt",
      /a negative test result is clear: it means the tested person did not inherit the harmful change that is present in the family and cannot pass it to their children\. A negative test result does not mean that a person will not get cancer They still have the same cancer risks as those in the general population/u,
    );
    inPack(
      "genetic-testing.txt",
      /a positive test result cannot tell whether or when the tested individual will develop cancer\. Some people who inherit a harmful change in BRCA1 or BRCA2 never develop cancer/u,
    );
    // The claim about the test the second woman has taken says only that it had no particular change to look for
    expect(JSON.stringify(lesson("what-a-genetic-test-tells-you").intro)).not.toContain(
      "only for changes already known to be harmful",
    );
  });
});

describe("genome scans and risk scores", () => {
  const oddsRatio = (a: number, b: number, x: number, y: number) => a / b / (x / y);

  it("computes the odds ratios of the lesson, the faded example, the end check and the card", () => {
    expect(oddsRatio(600, 500, 400, 500)).toBeCloseTo(1.5, 10);
    expect(600 / 500).toBeCloseTo(1.2, 10);
    expect(400 / 500).toBeCloseTo(0.8, 10);
    close("gen-genome-scans-and-risk-scores-faded-odds-ratio", oddsRatio(450, 300, 550, 700));
    expect(oddsRatio(450, 300, 550, 700)).toBeCloseTo(1.91, 2);
    expect(wrongValues("gen-genome-scans-and-risk-scores-faded-odds-ratio")).toEqual([1.5, 0.5]);
    close("gen-genome-scans-and-risk-scores-check-odds-ratio", oddsRatio(360, 240, 640, 760));
    expect(oddsRatio(360, 240, 640, 760)).toBeCloseTo(1.78, 2);
    expect(wrongValues("gen-genome-scans-and-risk-scores-check-odds-ratio")).toEqual([
      1.5,
      Math.round((1 / oddsRatio(360, 240, 640, 760)) * 100) / 100,
    ]);
    expect(
      bundle.flashcards.find(
        (card) => card.id === "gen-genome-scans-and-risk-scores-card-odds-ratio",
      )?.answerAuthority,
    ).toMatchObject({ value: 2.25 });
    expect(oddsRatio(300, 200, 200, 300)).toBeCloseTo(2.25, 10);
    // 1.91 is above the median odds ratio of the pack, and 1.5 of the lesson example is above it too
    inPack(
      "gwas-polygenic-scores-and-sequencing.txt",
      /The median odds ratio is 1\.33 per risk-SNP, with only a few showing odds ratios above 3\.0/u,
    );
    expect(1.91).toBeGreaterThan(1.33);
    expect(1.5).toBeGreaterThan(1.33);
    inPack(
      "gwas-polygenic-scores-and-sequencing.txt",
      /odds ratio for allele T is A:B \(meaning 'A to B', in standard odds terminology\) divided by X:Y/u,
    );
  });

  it("works out how many results a threshold lets through by chance", () => {
    expect(0.05 * 1_000_000).toBe(50_000);
    expect(5e-8 * 1_000_000).toBeCloseTo(0.05, 12);
    expect(2e-6 * 1_000_000).toBeCloseTo(2, 10);
    expect(-Math.log10(5e-8)).toBeCloseTo(7.3, 1);
    expect(1 / 20).toBe(0.05);
    // A skyline with the line at 7.3: stacks at 12.6 and 9.4 clear it, and 7.0 does not
    const line = -Math.log10(5e-8);
    expect([12.6, 7.0, 9.4].filter((height) => height > line)).toEqual([12.6, 9.4]);
    inPack(
      "gwas-polygenic-scores-and-sequencing.txt",
      /lower than 5×10.8 to consider a variant significant/u,
    );
    inPack(
      "gwas-polygenic-scores-and-sequencing.txt",
      /compared 96 patients with age-related macular degeneration \(ARMD\) with 50 healthy controls/u,
    );
  });

  it("turns a relative risk of two into an absolute risk for two conditions", () => {
    expect([2 * 10, 2 * 0.5]).toEqual([20, 1]);
    expect([20 - 10, 1 - 0.5]).toEqual([10, 0.5]);
    expect(labels("gen-genome-scans-and-risk-scores-faded-p")[0]).toBe("About 20 in 100 people");
    expect(labels("gen-genome-scans-and-risk-scores-faded-q")[2]).toBe("About 1 in 100 people");
    inPack(
      "gwas-polygenic-scores-and-sequencing.txt",
      /In 2018, AUC ≈ 0\.64 for coronary disease using ~120,000 British individuals/u,
    );
    inPack("gwas-polygenic-scores-and-sequencing.txt", /In 2019, AUC ≈ 0\.71 for hypothyroidism/u);
    inPack(
      "gwas-polygenic-scores-and-sequencing.txt",
      /AUCs of ~ 0\.80 and ~0\.78, respectively, when also including age and sex/u,
    );
    inPack(
      "gwas-polygenic-scores-and-sequencing.txt",
      /\(top 1%\) had a lifetime cardiovascular risk >10%/u,
    );
  });
});

describe("editing a genome", () => {
  it("counts the PAM sites, the edits of the sequence figure and the mosaic embryo", () => {
    // NGG occurs about every 8 to 12 base pairs in 3 billion bases: a few hundred million sites
    expect([3e9 / 12, 3e9 / 8]).toEqual([250_000_000, 375_000_000]);
    inPack("crispr-gene-editing.txt", /occurs roughly every 8 to 12 base pairs/u);
    inPack("crispr-gene-editing.txt", /The target sequence is 20 bases long/u);
    // The three routes on an invented sequence
    const before = "ATGCTAGGCTTAC";
    expect("ATGCTACTTAC".length).toBe(before.length - 2);
    expect("ATGCTACCAGGCTTAC".length).toBe(before.length + 3);
    expect("ATGCTACCAGGCTTAC".replace("CCA", "")).toBe(before);
    const beforeBase = "ATGCTAGGCTTACC";
    const afterBase = "ATGTTAGGCTTACC";
    const differences = [...beforeBase].filter((base, at) => base !== afterBase[at]);
    expect(differences).toEqual(["C"]);
    // The embryo of eight cells: four carry the intended change, one a different one, three the original
    expect(4 + 1 + 3).toBe(8);
    inPack("crispr-gene-editing.txt", /The base editings can only edit point mutations/u);
    inPack(
      "crispr-gene-editing.txt",
      /In November 2023, the United Kingdom's Medicines and Healthcare products Regulatory Agency \(MHRA\) became the first in the world to approve/u,
    );
    inPack(
      "crispr-gene-editing.txt",
      /In December 2023, the FDA approved the first gene therapy in the US to treat patients with Sickle Cell Disease/u,
    );
    inPack(
      "crispr-gene-editing.txt",
      /In November 2018, Jiankui He announced that he had edited two human embryos/u,
    );
    inPack(
      "crispr-gene-editing.txt",
      /In April 2015, Chinese scientists reported results of an attempt to alter the DNA of non-viable human embryos/u,
    );
    inPack(
      "crispr-gene-editing.txt",
      /successfully changing only some of the intended genes, and had off-target effects on other genes/u,
    );
    inPack(
      "crispr-gene-editing.txt",
      /In December 2015, an International Summit on Human Gene Editing took place/u,
    );
  });

  it("says of the law only what the undated page says, and does not call it current", () => {
    inPack(
      "crispr-gene-editing.txt",
      /germline cell and embryo genome editing are currently illegal in the United States and many other countries/u,
    );
    const text = JSON.stringify([
      lesson("editing-genomes"),
      question("gen-editing-genomes-plan-embryo"),
      bundle.concepts.find((concept) => concept.id === "somatic-germline"),
    ]);
    expect(text).not.toMatch(/currently (against the law|illegal)/u);
    expect(text).toContain(
      "MedlinePlus reports that germline and embryo editing are against the law",
    );
    expect(text).toContain("Its page carries no date");
    expect(question("gen-editing-genomes-two-sources").prompt).toContain(
      "a page with no date on it",
    );
  });
});

describe("epigenetic marks and the generations an exposure reaches", () => {
  /**
   * F0 is exposed. An exposed mother carries a fetus (F1) whose germ cells go on to form F2, so both are
   * exposed. An exposed father's sperm are exposed, so F1 is conceived from them. Returns the first
   * generation that is free of direct exposure.
   */
  const firstFree = (parent: "mother" | "father") => (parent === "mother" ? 3 : 2);
  const exposed = (parent: "mother" | "father", generation: number) =>
    generation < firstFree(parent);

  it("counts the first generation free of exposure for a mother and for a father", () => {
    expect(firstFree("father")).toBe(2);
    expect(firstFree("mother")).toBe(3);
    expect([0, 1, 2, 3].map((generation) => exposed("mother", generation))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect([0, 1, 2, 3].map((generation) => exposed("father", generation))).toEqual([
      true,
      true,
      false,
      false,
    ]);
    inPack("epigenetics.txt", /\(≥F2 for paternal, ≥F3 for maternal\)/u);
    // The Dutch hunger winter: the pregnant women are F0, so F3 is the first free generation
    expect(labels("gen-weighing-epigenetic-claims-faded-first-free")[0]).toMatch(/^F3/u);
    // The Överkalix grandsons are F2 of exposed men, which meets the generation test for paternal exposure
    expect(exposed("father", 2)).toBe(false);
    // The invented mouse study: effects in F1 and F2 and none in F3 for exposed mothers is exposure
    const seen = { F1: true, F2: true, F3: false };
    expect(exposed("mother", 1) && exposed("mother", 2) && !seen.F3).toBe(true);
    expect(labels("gen-weighing-epigenetic-claims-check-mouse-study")[0]).toMatch(
      /^The effect is absent in F3/u,
    );
    stated("which is F2 or later for paternal exposure and F3 or later for maternal exposure");
  });

  it("takes the twin study, the review and the hunger winter from the pack", () => {
    inPack("epigenetics.txt", /sample of 40 monozygotic twin pairs.{0,120}between 3 and 74 years/u);
    inPack(
      "epigenetics.txt",
      /A 2026 review evaluating the potential inheritance of post-traumatic stress disorder/u,
    );
    inPack(
      "epigenetics.txt",
      /offspring exposed to famine conditions during the third trimester of development were smaller than those born the year before the famine/u,
    );
    // Fetal programming is called a known phenomenon by the pack, and the sort says so, not "established"
    const sort = question("gen-weighing-epigenetic-claims-sort-evidence").sort;
    const womb = sort?.items.find((item) => item.label.startsWith("Hunger in the womb"));
    expect(womb?.explanation).toContain("Wikipedia calls this a known phenomenon");
    expect(womb?.bin).toBe("supported");
    expect(40).toBeGreaterThan(0);
  });
});

describe("the genome in numbers", () => {
  it("sets the SNPs of one person against the three billion bases", () => {
    inPack(
      "medlineplus-genes-and-variants.txt",
      /roughly 4 to 5 million SNPs in a person's genome/u,
    );
    inPack(
      "medlineplus-genes-and-variants.txt",
      /more than 600 million SNPs in populations around the world/u,
    );
    inPack(
      "medlineplus-genes-and-variants.txt",
      /Human DNA consists of about 3 billion bases, and more than 99 percent of those bases are the same in all people/u,
    );
    // 4 to 5 million of 3 billion is about 1 or 2 in 1,000 and under 0.2 percent
    expect((4e6 / 3e9) * 1000).toBeCloseTo(1.33, 2);
    expect((5e6 / 3e9) * 1000).toBeCloseTo(1.67, 2);
    expect((5e6 / 3e9) * 100).toBeLessThan(0.2);
    stated("under 0.2 percent of 3 billion positions");
    // The lesson no longer gives the conclusion before the question asks for it
    const first = lesson("genes-variants-genome");
    expect(JSON.stringify(first.intro?.hook)).not.toContain("99 percent of them are shared");
    expect(JSON.stringify(first.steps[0]?.afterFigure)).not.toContain(
      "more than 99 percent of bases are the same",
    );
    // A person with 4.6 million SNPs: a share of the genome far under 1 percent
    expect(4.6e6 / 3e9).toBeLessThan(0.01);
  });
});
